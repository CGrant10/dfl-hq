// =====================================================================
// Keepers - who is keeping whom, and what round it costs.
//
// Three columns, one row per keeper, one card for the whole league. The
// team name is printed once and left blank on a team's later rows, the way
// a printed table of contents does it - so the eye runs straight down the
// player column without a header or a box interrupting it every line.
//
// This replaced a block per team, which spent a header and a border on
// teams that mostly have a single keeper.
// =====================================================================

import { db, selectAll } from "../supabase.js";
import { esc, empty, groupBy } from "../ui.js";
import { addControl, editControls, wireInline, canEdit, visible, hiddenClass } from "../inline.js";
import { currentMember } from "../members.js";
import { loadPlayers } from "../sleeper.js";
import { advise, badgesFor, reasonFor, CLASS, NO_MARKET } from "../keeper-advisor.js";

let year = null;   // remembered while the app stays open

export async function render(view) {
  const rows = await selectAll("keepers", { order: "team", asc: true });

  if (!rows.length) {
    view.innerHTML = `
      <header class="page-head"><h1>Keepers</h1></header>
      <div data-advisor-host></div>
      <div id="keeper-body">
        ${empty("No keepers recorded yet.")}
        ${canEdit() ? `<div class="row-end">${addControl("keepers", "Add keeper")}</div>` : ""}
      </div>`;
    wireInline(view.querySelector("#keeper-body"), () => render(view));
    mountAdvisor(view);
    return;
  }

  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a);
  if (!years.includes(year)) year = years[0];

  view.innerHTML = `
    <header class="page-head">
      <h1>Keepers</h1>
      <p class="page-sub" id="keeper-count"></p>
    </header>

    <div data-advisor-host></div>

    <h2 class="section-title">League keepers</h2>
    <div class="tabs" id="year-tabs">
      ${years.map((y) => `<button data-year="${y}" class="${y === year ? "on" : ""}">${y}</button>`).join("")}
    </div>
    <div id="keeper-body"></div>
  `;

  const body  = view.querySelector("#keeper-body");
  const count = view.querySelector("#keeper-count");

  const paint = () => {
    const mine = rows.filter((r) => r.year === year);
    const teams = groupBy(mine, "team").size;

    count.textContent = mine.length
      ? `${year} · ${mine.length} keeper${mine.length === 1 ? "" : "s"} across ${teams} team${teams === 1 ? "" : "s"}`
      : `${year} · nothing recorded`;

    body.innerHTML = teamList(mine)
      + (canEdit() ? `<div class="row-end">${addControl("keepers", "Add keeper", { year })}</div>` : "");
  };

  view.querySelector("#year-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-year]");
    if (!btn) return;
    year = Number(btn.dataset.year);
    view.querySelectorAll("#year-tabs button")
        .forEach((b) => b.classList.toggle("on", Number(b.dataset.year) === year));
    paint();
  });

  wireInline(body, () => render(view));

  paint();
  mountAdvisor(view);
}

// ========================== KEEPER ADVISOR ============================
/*
  ABOVE the league table, never instead of it. The year view below is the
  league's shared reference and this pass does not touch a line of it.

  MOUNTED AFTER THE PAGE HAS DRAWN, on purpose. The advisor needs the Sleeper
  player map, which is a multi-megabyte download the app caches for a week -
  the first visit of the week would otherwise hold the whole page hostage
  behind it. The historical table paints first; the advisor fills in.

  IDENTITY IS THE MEMBER, and only ever the member: currentMember() ->
  sleeper_user_id -> the newest sleeper_rosters row for that id. The roster is
  never located by team name, which is exactly the mistake that would put
  somebody else's players on your card - and the keepers table below is proof
  of why, because its own `team` column holds first names.
*/
async function mountAdvisor(view) {
  const host = view.querySelector("[data-advisor-host]");
  if (!host) return;

  const member = currentMember();
  if (!member) { host.innerHTML = advisorShell(advisorBody({ state: "no-member" })); return; }
  if (!member.sleeper_user_id) {
    host.innerHTML = advisorShell(advisorBody({ state: "no-sleeper-id", member }), member);
    return;
  }

  host.innerHTML = advisorShell(
    `<p class="muted tiny">Reading your roster and the draft boards…</p>`, member);

  let data;
  try {
    data = await advisorData(member);
  } catch (err) {
    host.innerHTML = advisorShell(
      `<p class="muted tiny">Could not read your roster. ${esc(err.message || "")}</p>`, member);
    return;
  }

  host.innerHTML = advisorShell(advisorBody(data), member);
}

/*
  Four reads and the player map, in parallel.

  The picks query is scoped to the ids ON THIS ROSTER rather than pulling
  every pick the league has ever made - a roster is about twenty players and
  the board is over a thousand picks.
*/
async function advisorData(member) {
  const uid = member.sleeper_user_id;

  const [rosterRes, leagueRes, rulesRes] = await Promise.all([
    /*
      THE NEWEST ROSTER THAT ACTUALLY HAS PLAYERS, which is not always the
      newest row. A season in pre_draft has a roster for everybody and nobody
      on it - verified live: 2026 rows exist with `players: []` while 2025
      holds sixteen. Taking `limit(1)` told the whole league their roster was
      empty. Keepers are chosen off the squad you finished last season with, so
      the newest populated roster is both the available answer and the right
      one, and the card names the season it read.
    */
    db().from("sleeper_rosters")
      .select("season, players, team_name, synced_at")
      .eq("sleeper_user_id", uid)
      .order("season", { ascending: false }).limit(4),
    db().from("sleeper_leagues")
      .select("season, max_keepers, status")
      .order("season", { ascending: false }).limit(1),
    db().from("rules").select("title, content").eq("category", "keeper").order("sort_order"),
  ]);

  const rosterRows = rosterRes.data || [];
  const roster = rosterRows.find((r) => (r.players || []).length) || rosterRows[0] || null;
  const league = (leagueRes.data || [])[0] || null;
  /* max_keepers arrives with sleeper_draft_schema.sql. Before that migration
     the column is missing and the whole select fails - which is not worth
     losing the advisor over, so an error here just means "not stated". */
  const maxKeepers = leagueRes.error ? null : (league?.max_keepers ?? null);
  const keeperRules = rulesRes.error ? [] : (rulesRes.data || []);

  const ids = Array.isArray(roster?.players) ? roster.players.map(String) : [];
  const [players, picksRes] = await Promise.all([
    ids.length ? loadPlayers().catch(() => ({})) : Promise.resolve({}),
    ids.length
      ? db().from("sleeper_draft_picks")
          .select("season, player_id, round, pick_no, sleeper_user_id")
          .in("player_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    ...advise({
      member, sleeperUserId: uid, roster, players,
      /* A missing sleeper_draft_picks table is the un-migrated state. No
         rounds means every candidate classifies as never-drafted, which the
         card then explains rather than hiding. */
      draftPicks: picksRes.error ? [] : (picksRes.data || []),
      keeperRules, maxKeepers, market: NO_MARKET,
    }),
    needsDraftSync: !!picksRes.error,
    leagueSeason: league?.season ?? null,
    rosterSeason: roster?.season ?? null,
  };
}

function advisorShell(inner, member) {
  return `
    <section class="card keeper-advisor" data-collapse="keeper-advisor"
             data-collapse-title="Keeper advisor"${member ? ` data-collapse-badge="${esc(member.display_name)}"` : ""}>
      ${inner}
    </section>`;
}

/*
  THE COPY IS DELIBERATELY HUMBLE.

  "Your strongest options" and never "keep this player". Every line under a
  name is a fact with its source in the wording, and where a fact is missing
  the card says which one and where it would come from. See the header of
  js/keeper-advisor.js for why value language is absent.
*/
function advisorBody(data) {
  if (data.state === "no-member") {
    return `<p class="muted">Pick your name in the top right and this will show your
      own keeper options.</p>`;
  }
  if (data.state === "no-sleeper-id") {
    return `<p class="muted">${esc(data.member.display_name)} is not linked to a Sleeper
      account yet, so there is no roster to read. An admin can link it on the
      Admin page.</p>`;
  }
  if (data.state === "no-roster") {
    return `<p class="muted">No roster has been synced for you yet. An admin can run
      <strong>Sync Sleeper</strong> on the Admin page.</p>`;
  }
  if (data.state === "no-players") {
    return `<p class="muted">No synced season has any players on your roster yet. An
      admin can run <strong>Sync Sleeper</strong> on the Admin page.</p>`;
  }

  const { candidates, counts, costRule, maxKeepers, shortlist } = data;
  const top = candidates.slice(0, shortlist);
  const rest = candidates.slice(shortlist);

  const allowance = maxKeepers != null
    ? `Sleeper has this league at <strong>${maxKeepers} keeper${maxKeepers === 1 ? "" : "s"}</strong>.`
    : "";
  /* Name the roster being read. If it is not the current league season, say
     so plainly - it is last season's squad, which is what keepers come from,
     but the reader should not have to infer that. */
  const from = data.rosterSeason != null
    ? `From your <strong>${esc(data.rosterSeason)}</strong> roster${
        data.leagueSeason != null && data.leagueSeason !== data.rosterSeason
          ? ` — the last one played` : ""}.`
    : "";

  /* The honest statement of what is missing, and where it would come from.
     This is the whole difference between an advisor and a fortune teller. */
  const gaps = [];
  if (!costRule) {
    gaps.push(`No keeper <strong>cost</strong> rule is recorded, so no round cost is
      shown. An admin can write it in <a href="#/rules">Rules → Keepers</a> and
      these become priced.`);
  }
  if (data.needsDraftSync) {
    gaps.push(`Draft rounds are missing. Run <strong>sleeper_draft_schema.sql</strong>,
      then <strong>Sync Sleeper</strong>.`);
  } else if (!counts.draftRoundKnown) {
    gaps.push(`None of these players has a draft pick on record in this league.`);
  }
  gaps.push(`There is no player market ranking in DFL HQ, so nothing here calls
    anybody the best player or the best value.`);

  return `
    <p class="ka-lead">Your strongest <strong>options</strong> — not a
      recommendation. ${from} ${allowance}</p>

    <ol class="ka-list">
      ${top.map((c, i) => candidateRow(c, i + 1, candidates, costRule)).join("")}
    </ol>

    ${rest.length ? `
      <div class="ka-more" data-collapse="keeper-compare" data-collapse-default="folded"
           data-collapse-title="Compare all players"
           data-collapse-badge="${rest.length} more">
        <ol class="ka-list" start="${shortlist + 1}">
          ${rest.map((c, i) => candidateRow(c, shortlist + i + 1, candidates, costRule)).join("")}
        </ol>
      </div>` : ""}

    <ul class="ka-gaps">${gaps.map((g) => `<li>${g}</li>`).join("")}</ul>
    ${costRule ? `<p class="muted tiny">Cost rule: “${esc(costRule.citation)}”</p>` : ""}
    <p class="muted tiny">${counts.total} players on your
      ${esc(data.rosterSeason ?? "")} roster${counts.unknownPlayer
        ? ` · ${counts.unknownPlayer} not in the Sleeper player list` : ""}.</p>`;
}

function candidateRow(c, n, all, costRule) {
  const badges = badgesFor(c, all);
  const who = c.name || `Player ${c.playerId}`;
  const where = [c.position, c.nflTeam].filter(Boolean).join(" · ");
  const cost = c.keeperCost != null
    ? `<span class="ka-cost">R${c.keeperCost}</span>`
    : `<span class="ka-cost none" title="No keeper cost rule is recorded">—</span>`;

  return `
    <li class="ka-row ${c.class === CLASS.UNKNOWN ? "is-unknown" : ""}">
      <span class="ka-n" aria-hidden="true">${n}</span>
      <span class="ka-main">
        <span class="ka-name">${esc(who)}</span>
        ${where ? `<span class="ka-where">${esc(where)}</span>` : ""}
        <span class="ka-why">${esc(reasonFor(c, { costRule }))}</span>
        ${badges.length ? `<span class="ka-badges">${badges
          .map((b) => `<span class="pill tiny">${esc(b)}</span>`).join("")}</span>` : ""}
      </span>
      ${cost}
    </li>`;
}

/**
 * The whole year as one three-column list, sorted by team.
 *
 * A row only draws its top hairline when it starts a new team, so the
 * grouping is legible without a header per team. The cost column is fixed
 * width with tabular digits, so the rounds line up as a column you can
 * scan on its own.
 */
function teamList(allRows) {
  const rows = visible("keepers", allRows);
  if (!rows.length) return empty("No keepers for this year.");

  const byTeam = [...groupBy(rows, "team").entries()]
    .sort((a, b) => a[0].localeCompare(b[0]));

  return `
    <div class="card keepcard">
      <div class="kp-head" aria-hidden="true">
        <span>Team</span><span>Keeper</span><span class="kp-r">Round</span>
      </div>
      ${byTeam.map(([team, list]) => list.map((k, i) => `
        <div class="kp-row ${i === 0 ? "kp-new" : ""} ${hiddenClass("keepers", k)}">
          <span class="kp-team">${i === 0 ? esc(team) : ""}</span>
          <span class="kp-player">
            ${esc(k.player)}
            ${k.notes ? `<span class="kp-note">${esc(k.notes)}</span>` : ""}
          </span>
          <span class="kp-cost ${k.round_cost == null ? "none" : ""}">${
            k.round_cost != null ? `${esc(k.round_cost)}` : "—"}</span>
          ${editControls("keepers", k, { compact: true })}
        </div>`).join("")).join("")}
    </div>`;
}
