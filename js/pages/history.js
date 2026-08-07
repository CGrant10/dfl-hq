// =====================================================================
// History - everything backward-looking, in one place.
//
//   Hall of Fame  champions, runners up, and the hand-written entries
//   Seasons       final standings for any season
//   All-time      career records for every owner
//
// This absorbed what used to be a separate Owners page. Per-person detail
// lives on the profile pages; this is the league-wide view.
// =====================================================================

import { db } from "../supabase.js";
import { esc, empty, errorBox, groupBy } from "../ui.js";
import { addControl, editControls, wireInline, canEdit } from "../inline.js";

const ICON = {
  "Champion":  "i-history",
  "Runner Up": "i-medal",
  "Award":     "i-award",
  "Record":    "i-record",
  "Moment":    "i-moment",
};

function icon(category) {
  return `<svg class="ico-sm" aria-hidden="true"><use href="#${ICON[category] || "i-award"}"></use></svg>`;
}

let tab = "fame";
let season = null;

export async function render(view) {
  const [manualRes, leaguesRes, standingsRes, usersRes, membersRes] = await Promise.all([
    db().from("history").select("*").order("year", { ascending: false }),
    db().from("sleeper_leagues").select("*").order("season", { ascending: false }),
    db().from("sleeper_standings").select("*"),
    db().from("sleeper_users").select("*"),
    db().from("members").select("*"),
  ]);

  const err = manualRes.error || leaguesRes.error || standingsRes.error;
  if (err) { view.innerHTML = `<h1>History</h1>` + errorBox(err); return; }

  const data = {
    manual:    manualRes.data || [],
    leagues:   leaguesRes.data || [],
    standings: standingsRes.data || [],
    // people who a sync found but an admin has hidden never show up here
    users:     (usersRes.data || []).filter((u) => u.hidden !== true),
    members:   membersRes.data || [],
  };

  if (!data.manual.length && !data.leagues.length) {
    view.innerHTML = `<h1>History</h1>
      <div id="hist-body">
        ${empty("No league history yet.")}
        ${canEdit() ? `<div class="row-end">${addControl("history", "Add entry")}</div>` : ""}
      </div>`;
    wireInline(view.querySelector("#hist-body"), () => render(view));
    return;
  }

  view.innerHTML = `
    <h1>History</h1>
    <div class="tabs" id="hist-tabs">
      <button data-tab="fame"    class="${tab === "fame" ? "on" : ""}">Hall of Fame</button>
      <button data-tab="seasons" class="${tab === "seasons" ? "on" : ""}">Seasons</button>
      <button data-tab="alltime" class="${tab === "alltime" ? "on" : ""}">All-time</button>
    </div>
    <div id="hist-body"></div>
  `;

  const body = view.querySelector("#hist-body");
  const paint = () => {
    body.innerHTML = tab === "fame"    ? fameView(data)
                   : tab === "seasons" ? seasonsView(data)
                   : allTimeView(data);
  };

  view.querySelector("#hist-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    tab = btn.dataset.tab;
    view.querySelectorAll("#hist-tabs button")
        .forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    paint();
  });

  body.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-season]");
    if (!btn) return;
    season = Number(btn.dataset.season);
    paint();
  });

  // #hist-body is new on every render, so this cannot stack up.
  wireInline(body, () => render(view));

  paint();
}

// --------------------------- naming people ----------------------------

/**
 * Names for history rows.
 *
 * Owners are matched on Sleeper user id only - never on a name, because
 * names are exactly what change from year to year.
 *
 * `season` picks the name that was in use THAT year, taken from the
 * standings snapshot. Without a season it falls back to the person's
 * current identity. `rosterId` is the last resort: it names a team whose
 * owner account no longer exists, which is how the 2019 champion is still
 * identifiable.
 */
function namer(data) {
  const byMember  = new Map(data.members.map((m) => [m.sleeper_user_id, m]));
  const bySleeper = new Map(data.users.map((u) => [u.sleeper_user_id, u]));

  const snapshot = new Map();          // "season:userId"   -> team name
  const byRoster = new Map();          // "season:rosterId" -> team name
  for (const s of data.standings) {
    if (s.sleeper_user_id) snapshot.set(`${s.season}:${s.sleeper_user_id}`, s.team_name || "");
    byRoster.set(`${s.season}:${s.roster_id}`, s.team_name || "");
  }

  return (userId, season = null, rosterId = null) => {
    const member = byMember.get(userId);
    const user   = bySleeper.get(userId);
    const person = member?.display_name || user?.display_name || null;

    // the name used that season, if we have it
    const historic = season != null ? snapshot.get(`${season}:${userId}`) : null;

    if (person) {
      const label = historic || member?.team_name || user?.team_name || person;
      return { label, sub: person, memberId: member?.id ?? null };
    }

    // No owner: the Sleeper account was deleted. Use that season's team
    // name if we captured one, otherwise at least identify the roster, so
    // the season still appears in the record book instead of vanishing.
    const orphan = season != null && rosterId != null
      ? byRoster.get(`${season}:${rosterId}`) : null;
    if (orphan) return { label: orphan, sub: "account deleted", memberId: null };
    if (rosterId != null) {
      return { label: `Roster ${rosterId}`, sub: "account deleted", memberId: null };
    }
    return { label: "Unknown", sub: "", memberId: null };
  };
}

function nameCell(who) {
  const inner = `${esc(who.label)}${who.sub && who.sub !== who.label
    ? `<div class="muted tiny">${esc(who.sub)}</div>` : ""}`;
  return who.memberId
    ? `<a href="#/profile?id=${who.memberId}" class="plainlink">${inner}</a>`
    : inner;
}

// ----------------------------- hall of fame ---------------------------

function fameView(data) {
  const name = namer(data);
  // Every completed season, not just those with a known owner. A season
  // whose winner deleted their account still belongs in the record book.
  const titled = data.leagues
    .filter((l) => l.champion_user_id || l.champion_roster_id)
    .sort((a, b) => b.season - a.season);

  const byYear = [...groupBy(data.manual, "year").entries()].sort((a, b) => b[0] - a[0]);

  return `
    ${titled.length ? `
      <div class="card accent">
        <div class="card-title">${icon("Champion")} Champions</div>
        <div class="tblwrap">
          <table class="tbl">
            <thead><tr><th>Season</th><th>Champion</th><th>Runner up</th></tr></thead>
            <tbody>
              ${titled.map((l) => `
                <tr>
                  <td>${esc(l.season)}</td>
                  <td>${nameCell(name(l.champion_user_id, l.season, l.champion_roster_id))}</td>
                  <td class="muted">${l.runner_up_user_id || l.runner_up_roster_id
                    ? nameCell(name(l.runner_up_user_id, l.season, l.runner_up_roster_id))
                    : "—"}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="card-meta">Taken from the Sleeper playoff brackets.</div>
      </div>` : ""}

    ${byYear.length
      ? byYear.map(([year, list]) => `
          <div class="section-head">
            <h2>${esc(year)}</h2>
            ${addControl("history", "Add entry", { year })}
          </div>
          ${sortRows(list).map(entry).join("")}`).join("")
      : `<div class="card"><div class="card-body muted">
           Awards, records and the moments nobody is allowed to forget go here.
           ${canEdit() ? "" : "An admin can add them."}</div>
           ${canEdit() ? `<div class="row-end">${addControl("history", "Add entry")}</div>` : ""}
         </div>`}
  `;
}

const ORDER = ["Champion", "Runner Up", "Award", "Record", "Moment"];

function sortRows(list) {
  const rank = (c) => { const i = ORDER.indexOf(c); return i === -1 ? 99 : i; };
  return [...list].sort((a, b) => rank(a.category) - rank(b.category));
}

function entry(r) {
  return `
    <div class="card">
      <div class="card-title">${icon(r.category)} ${esc(r.winner || r.category)}</div>
      <div class="card-meta" style="margin:0"><span class="pill">${esc(r.category)}</span></div>
      ${r.notes ? `<div class="card-body" style="margin-top:8px">${esc(r.notes)}</div>` : ""}
      ${editControls("history", r)}
    </div>`;
}

// ------------------------------- seasons ------------------------------

function seasonsView(data) {
  const years = [...new Set(data.standings.map((s) => s.season))].sort((a, b) => b - a);
  if (!years.length) return empty("No season standings yet. Sync Sleeper from the Admin page.");

  const hasGames = (y) => data.standings
    .some((s) => s.season === y && (s.wins + s.losses + s.ties) > 0);

  // Open on the newest season that has actually been played, not on a
  // pre-draft season where every row is 0-0.
  if (!years.includes(season)) season = years.find(hasGames) ?? years[0];

  const name = namer(data);
  const league = data.leagues.find((l) => l.season === season);
  const played = hasGames(season);
  const rows = data.standings
    .filter((s) => s.season === season)
    .sort((a, b) => played
      ? (a.rank ?? 99) - (b.rank ?? 99)
      : name(a.sleeper_user_id, season, a.roster_id).label
          .localeCompare(name(b.sleeper_user_id, season, b.roster_id).label));

  return `
    <div class="tabs">
      ${years.map((y) =>
        `<button data-season="${y}" class="${y === season ? "on" : ""}">${y}</button>`).join("")}
    </div>

    <div class="card">
      <div class="card-title">
        ${esc(season)} ${played ? "final standings" : "teams"}
        ${league?.champion_user_id || league?.champion_roster_id
          ? `<span class="pill green">${esc(
              name(league.champion_user_id, season, league.champion_roster_id).label)}</span>` : ""}
        ${played ? "" : `<span class="pill warn">not started</span>`}
      </div>
      <div class="tblwrap">
        <table class="tbl">
          <thead>
            <tr><th>#</th><th>Team</th><th>Record</th><th class="num">PF</th><th class="num">PA</th></tr>
          </thead>
          <tbody>
            ${rows.map((s) => `
              <tr>
                <td>
                  ${played ? (s.rank ?? "—") : "—"}
                  ${played && s.made_playoffs ? `<span class="pill green tiny">P</span>` : ""}
                </td>
                <td>${nameCell(name(s.sleeper_user_id, season, s.roster_id))}</td>
                <td>${s.wins}-${s.losses}${s.ties ? "-" + s.ties : ""}</td>
                <td class="num">${Math.round(s.points_for).toLocaleString()}</td>
                <td class="num">${Math.round(s.points_against).toLocaleString()}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="card-meta">
        ${played ? "P marks a playoff berth." : "This season has not been played yet."}
      </div>
    </div>`;
}

// ------------------------------ all time ------------------------------

function allTimeView(data) {
  if (!data.standings.length) return empty("No career records yet. Sync Sleeper from the Admin page.");

  const name = namer(data);
  const titles = countBy(data.leagues, "champion_user_id");
  const byUser = groupBy(data.standings, "sleeper_user_id");

  const careers = [...byUser.entries()]
    // hidden Sleeper accounts are excluded from the league record books
    .filter(([userId]) => data.users.some((u) => u.sleeper_user_id === userId))
    .map(([userId, seasons]) => {
      const wins   = sum(seasons, "wins");
      const losses = sum(seasons, "losses");
      const ties   = sum(seasons, "ties");
      const games  = wins + losses + ties;
      const ranked = seasons.filter((s) => s.rank != null);
      return {
        who: name(userId),
        wins, losses, ties,
        winPct:    games ? (wins + ties / 2) / games : 0,
        pointsFor: sum(seasons, "points_for"),
        avgFinish: ranked.length ? ranked.reduce((t, s) => t + s.rank, 0) / ranked.length : null,
        playoffs:  seasons.filter((s) => s.made_playoffs).length,
        titles:    titles.get(userId) || 0,
        seasons:   seasons.length,
      };
    })
    .sort((a, b) => b.winPct - a.winPct || b.titles - a.titles || b.pointsFor - a.pointsFor);

  const seasonCount = new Set(data.standings.map((s) => s.season)).size;

  return `
    <div class="card">
      <div class="card-title">All-time records</div>
      <div class="tblwrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Owner</th><th>Record</th><th class="num">Win %</th>
              <th class="num">Titles</th><th class="num">Playoffs</th>
              <th class="num">Avg finish</th><th class="num">Points</th>
            </tr>
          </thead>
          <tbody>
            ${careers.map((c) => `
              <tr>
                <td>${nameCell(c.who)}</td>
                <td>${c.wins}-${c.losses}${c.ties ? "-" + c.ties : ""}</td>
                <td class="num">${(c.winPct * 100).toFixed(1)}%</td>
                <td class="num">${c.titles || "—"}</td>
                <td class="num">${c.playoffs}</td>
                <td class="num">${c.avgFinish ? c.avgFinish.toFixed(1) : "—"}</td>
                <td class="num">${Math.round(c.pointsFor).toLocaleString()}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="card-meta">
        ${seasonCount} season${seasonCount === 1 ? "" : "s"} of history. Tap an owner for their profile.
      </div>
    </div>`;
}

// -------------------------------- bits --------------------------------

function sum(rows, key) {
  return rows.reduce((t, r) => t + Number(r[key] || 0), 0);
}

function countBy(rows, key) {
  const map = new Map();
  for (const r of rows) {
    const v = r[key];
    if (v) map.set(v, (map.get(v) || 0) + 1);
  }
  return map;
}
