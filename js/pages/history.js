// =====================================================================
// History - everything backward-looking, in one place.
//
//   Hall of Fame  champions, runners up, and the hand-written entries
//   Seasons       final standings for any season
//   All-time      career records for every owner
//   Records       the record book, computed from every week ever played
//
// This absorbed what used to be a separate Owners page. Per-person detail
// lives on the profile pages; this is the league-wide view.
// =====================================================================

import { db } from "../supabase.js";
import { LEAGUE_FOUNDED, FIRST_SYNCED_SEASON } from "../config.js";
import { esc, empty, errorBox, groupBy } from "../ui.js";
import { addControl, editControls, wireInline, canEdit, visible, hiddenClass } from "../inline.js";

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
      <button data-tab="records" class="${tab === "records" ? "on" : ""}">Records</button>
    </div>
    <div id="hist-body"></div>
  `;

  const body = view.querySelector("#hist-body");
  const paint = () => {
    if (tab === "records") return recordsView(body, data);
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

  const byYear = [...groupBy(visible("history", data.manual), "year").entries()]
    .sort((a, b) => b[0] - a[0]);

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
          <div class="card schedule">${sortRows(list).map(entry).join("")}</div>`).join("")
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

/**
 * One line per entry inside the year's card, rather than a card each. A
 * season with four awards used to be four bordered boxes saying two words.
 */
function entry(r) {
  return `
    <div class="evrow ${hiddenClass("history", r)}">
      <div class="evicon" aria-hidden="true">${icon(r.category)}</div>
      <div class="evbody">
        <div class="evtop">
          <span class="evtitle">${esc(r.winner || r.category)}</span>
          <span class="pill">${esc(r.category)}</span>
        </div>
        ${r.notes ? `<div class="evnote">${esc(r.notes)}</div>` : ""}
        ${editControls("history", r, { compact: true })}
      </div>
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

// ============================ record book =============================
//
// Everything here is computed from data that is already synced: every week
// ever played (sleeper_matchups), the season totals (sleeper_standings) and
// the trades (sleeper_transactions). No new API, no new tables.
//
// Loaded only when the tab is opened, and then kept for the rest of the
// session - it is a few hundred rows, but there is no reason to fetch them
// for somebody who only wanted the champions list.

let recordData = null;

async function loadRecordData() {
  if (recordData) return recordData;

  const [matchups, trades] = await Promise.all([
    db().from("sleeper_matchups")
        .select("season, week, roster1, user1, score1, roster2, user2, score2, winner_roster_id")
        .order("season", { ascending: true }).order("week", { ascending: true }),
    // Only trades: the free agent rows are the bulk of the table and are not
    // needed here, and pulling all 4,000+ payloads onto a phone would be rude.
    db().from("sleeper_transactions")
        .select("season, week, type, status, details").eq("type", "trade"),
  ]);

  recordData = {
    matchups: matchups.data || [],
    trades:   trades.data || [],
    error:    matchups.error || trades.error || null,
  };
  return recordData;
}

async function recordsView(body, data) {
  body.innerHTML = `<div class="empty">Reading every week ever played…</div>`;

  const rec = await loadRecordData();
  if (rec.error) { body.innerHTML = errorBox(rec.error); return; }

  const name = namer(data);
  const sides = toSides(rec.matchups);

  if (!sides.length) {
    body.innerHTML = empty("No weekly scores synced yet. Run a Sleeper sync from the Admin page.");
    return;
  }

  const played  = sides.filter((s) => s.score > 0);
  const games   = rec.matchups.filter((m) => Number(m.score1) > 0 || Number(m.score2) > 0);
  const streaks = streakRecords(sides);
  const seasons = seasonRecords(data.standings);

  const high = best(played, (s) => s.score);
  const low  = best(played, (s) => -s.score);
  const blow = best(games, (m) => margin(m));
  const near = best(games.filter((m) => margin(m) > 0), (m) => -margin(m));
  const shoot = best(games, (m) => Number(m.score1) + Number(m.score2));

  const who = (s) => name(s.user, s.season, s.roster);

  body.innerHTML = `
    ${/* The season count here is how many seasons of DATA exist, not how old
          the league is. Saying "7 seasons" unqualified next to a 10th
          anniversary badge on the home page would read as a contradiction,
          so the gap is stated rather than glossed over. */ ""}
    <p class="page-sub" style="margin-bottom:14px">
      ${games.length} games · ${esc(FIRST_SYNCED_SEASON)} onward
      <span class="muted">· ${esc(FIRST_SYNCED_SEASON - LEAGUE_FOUNDED)} earlier seasons predate the records</span>
    </p>

    <h2 class="section-title">Single week</h2>
    <div class="card recbook">
      ${recRow("Highest score", high && high.score.toFixed(2),
               high && who(high).label, high && `${high.season} · Week ${high.week}`)}
      ${recRow("Lowest score", low && low.score.toFixed(2),
               low && who(low).label, low && `${low.season} · Week ${low.week}`)}
      ${recRow("Biggest blowout", blow && margin(blow).toFixed(2) + " pts",
               blow && winnerName(blow, name).label,
               blow && `beat ${loserName(blow, name).label} · ${blow.season} Wk ${blow.week}`)}
      ${recRow("Closest finish", near && margin(near).toFixed(2) + " pts",
               near && winnerName(near, name).label,
               near && `over ${loserName(near, name).label} · ${near.season} Wk ${near.week}`)}
      ${recRow("Highest combined", shoot && (Number(shoot.score1) + Number(shoot.score2)).toFixed(2),
               shoot && `${winnerName(shoot, name).label} v ${loserName(shoot, name).label}`,
               shoot && `${shoot.season} · Week ${shoot.week}`)}
    </div>

    <h2 class="section-title">Seasons and streaks</h2>
    <div class="card recbook">
      ${recRow("Most points, season", seasons.points && seasons.points.points_for.toFixed(2),
               seasons.points && name(seasons.points.sleeper_user_id, seasons.points.season,
                                      seasons.points.roster_id).label,
               seasons.points && String(seasons.points.season))}
      ${recRow("Best record, season", seasons.record &&
                 `${seasons.record.wins}-${seasons.record.losses}${seasons.record.ties ? "-" + seasons.record.ties : ""}`,
               seasons.record && name(seasons.record.sleeper_user_id, seasons.record.season,
                                      seasons.record.roster_id).label,
               seasons.record && String(seasons.record.season))}
      ${recRow("Longest win streak", streaks.win && streaks.win.run + " weeks",
               streaks.win && name(streaks.win.user).label,
               streaks.win && streaks.win.span)}
      ${recRow("Longest losing streak", streaks.loss && streaks.loss.run + " weeks",
               streaks.loss && name(streaks.loss.user).label,
               streaks.loss && streaks.loss.span)}
    </div>

    ${tradeBoard(rec.trades, data)}
  `;
}

/** One record: what it is, the number, who holds it, and when. */
function recRow(label, value, holder, when) {
  if (!value) return "";
  return `
    <div class="rec">
      <span class="rec-label">${esc(label)}</span>
      <span class="rec-who">
        ${esc(holder || "—")}
        ${when ? `<span class="rec-when">${esc(when)}</span>` : ""}
      </span>
      <span class="rec-val">${esc(value)}</span>
    </div>`;
}

/**
 * A matchup row holds two teams. Most records are about ONE team's week, so
 * flatten every game into two one-sided entries first.
 */
function toSides(matchups) {
  const out = [];
  for (const m of matchups) {
    // winner_roster_id is null on a tie, which is neither a win nor a loss.
    const tie = m.winner_roster_id == null;
    if (m.user1 || m.roster1 != null) {
      out.push({ season: m.season, week: m.week, user: m.user1, roster: m.roster1,
                 score: Number(m.score1) || 0, tie, won: m.winner_roster_id === m.roster1 });
    }
    if (m.user2 || m.roster2 != null) {
      out.push({ season: m.season, week: m.week, user: m.user2, roster: m.roster2,
                 score: Number(m.score2) || 0, tie, won: m.winner_roster_id === m.roster2 });
    }
  }
  return out;
}

const margin = (m) => Math.abs(Number(m.score1) - Number(m.score2));

/** The row scoring highest on `score`. One pass, no sorting a big array. */
function best(rows, score) {
  let top = null, topScore = -Infinity;
  for (const r of rows) {
    const s = score(r);
    if (s > topScore) { topScore = s; top = r; }
  }
  return top;
}

function winnerName(m, name) {
  const winnerIsOne = m.winner_roster_id === m.roster1;
  return winnerIsOne ? name(m.user1, m.season, m.roster1) : name(m.user2, m.season, m.roster2);
}
function loserName(m, name) {
  const winnerIsOne = m.winner_roster_id === m.roster1;
  return winnerIsOne ? name(m.user2, m.season, m.roster2) : name(m.user1, m.season, m.roster1);
}

function seasonRecords(standings) {
  const played = (standings || []).filter((s) => s.wins + s.losses + s.ties > 0);
  return {
    points: best(played, (s) => Number(s.points_for) || 0),
    record: best(played, (s) => {
      const games = s.wins + s.losses + s.ties;
      // Win rate, with games played as the tie-break, so a 3-0 partial season
      // does not outrank a 13-1 full one.
      return games ? (s.wins + s.ties / 2) / games + games / 1000 : 0;
    }),
  };
}

/**
 * Longest run of wins and of losses, per owner, across every season in
 * order. Streaks deliberately carry across a season boundary - the league
 * remembers, and "he lost eleven straight" is a better story for it.
 * A tie has no winner, so it ends both runs.
 */
function streakRecords(sides) {
  const byUser = new Map();
  for (const s of sides) {
    if (!s.user || s.score <= 0) continue;
    if (!byUser.has(s.user)) byUser.set(s.user, []);
    byUser.get(s.user).push(s);
  }

  let win = null, loss = null;
  for (const [user, weeks] of byUser) {
    weeks.sort((a, b) => a.season - b.season || a.week - b.week);

    let runW = 0, runL = 0, startW = null, startL = null;
    for (const w of weeks) {
      if (w.tie) { runW = 0; runL = 0; startW = null; startL = null; continue; }

      if (w.won) {
        runL = 0; startL = null;
        if (!runW) startW = w;
        runW++;
        if (!win || runW > win.run) win = { user, run: runW, span: span(startW, w) };
      } else {
        runW = 0; startW = null;
        if (!runL) startL = w;
        runL++;
        if (!loss || runL > loss.run) loss = { user, run: runL, span: span(startL, w) };
      }
    }
  }
  return { win, loss };
}

function span(from, to) {
  if (!from) return "";
  return from.season === to.season
    ? `${from.season} · Wk ${from.week}–${to.week}`
    : `${from.season} Wk ${from.week} – ${to.season} Wk ${to.week}`;
}

/** Who trades. Counted per roster, since a trade names rosters, not users. */
function tradeBoard(allTrades, data) {
  // Every trade currently synced is "complete", but a vetoed or failed one
  // must never pad somebody's count. An empty status is treated as complete,
  // since that is what older synced rows look like.
  const trades = allTrades.filter((t) => !t.status || t.status === "complete");
  if (!trades.length) return "";

  const perRoster = new Map();      // "season:rosterId" -> count
  for (const t of trades) {
    for (const rid of t.details?.roster_ids || []) {
      const key = `${t.season}:${rid}`;
      perRoster.set(key, (perRoster.get(key) || 0) + 1);
    }
  }

  // Roll the season-and-roster counts up to the owner behind them.
  const owner = new Map(data.standings.map((s) => [`${s.season}:${s.roster_id}`, s.sleeper_user_id]));
  const perUser = new Map();
  for (const [key, n] of perRoster) {
    const uid = owner.get(key);
    if (!uid) continue;
    perUser.set(uid, (perUser.get(uid) || 0) + n);
  }

  const name = namer(data);
  const rows = [...perUser.entries()]
    .map(([uid, n]) => ({ who: name(uid), n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  if (!rows.length) return "";

  return `
    <h2 class="section-title">Trades<span class="count">${trades.length}</span></h2>
    <div class="card recbook">
      ${rows.map((r, i) => `
        <div class="rec">
          <span class="rec-label">${i === 0 ? "Most trades" : ""}</span>
          <span class="rec-who">${esc(r.who.label)}</span>
          <span class="rec-val">${r.n}</span>
        </div>`).join("")}
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
