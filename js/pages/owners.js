// =====================================================================
// Owners - career profiles.
//
// Combines two sources:
//   Sleeper  -> record, points, finishes, playoff appearances, titles
//   By hand  -> nickname, team name, league notes (owner_profiles)
//
// All the maths happens here in the browser from the stored season rows,
// so nothing needs recalculating in the database when a season is added.
// =====================================================================

import { db } from "../supabase.js";
import { esc, empty, errorBox, groupBy } from "../ui.js";

let openOwner = null;   // sleeper_user_id of the expanded card

export async function render(view) {
  const [usersRes, standingsRes, leaguesRes, profilesRes] = await Promise.all([
    db().from("sleeper_users").select("*"),
    db().from("sleeper_standings").select("*"),
    db().from("sleeper_leagues").select("*"),
    db().from("owner_profiles").select("*"),
  ]);

  const firstError = usersRes.error || standingsRes.error || leaguesRes.error || profilesRes.error;
  if (firstError) {
    view.innerHTML = `<h1>Owners</h1>` + errorBox(firstError) +
      `<div class="card"><div class="card-body muted">If a table is missing, run
       <strong>sleeper_schema.sql</strong> in Supabase.</div></div>`;
    return;
  }

  // Filtered here rather than in the query, so this still works if
  // members_schema.sql (which adds the column) has not been run yet.
  const users = (usersRes.data || []).filter((u) => u.hidden !== true);

  if (!users.length) {
    view.innerHTML = `<h1>Owners</h1>${empty(
      "No Sleeper data yet. An admin can pull it in from Admin → Sleeper.")}`;
    return;
  }

  const owners = buildOwners(users, standingsRes.data || [], leaguesRes.data || [], profilesRes.data || []);

  // Best career first: win rate, then rings, then total points.
  owners.sort((a, b) =>
    b.winPct - a.winPct || b.titles - a.titles || b.pointsFor - a.pointsFor);

  view.innerHTML = `
    <h1>Owners</h1>
    <p class="muted" style="margin-top:-8px">
      Career numbers across ${new Set((standingsRes.data || []).map((s) => s.season)).size} season(s) of Sleeper history.
    </p>
    <div id="owner-list">${owners.map(card).join("")}</div>
  `;

  view.querySelector("#owner-list").addEventListener("click", (e) => {
    const head = e.target.closest("[data-owner]");
    if (!head) return;
    openOwner = openOwner === head.dataset.owner ? null : head.dataset.owner;
    render(view);
  });
}

// ---------------------------------------------------------------------
// Number crunching
// ---------------------------------------------------------------------

function buildOwners(users, standings, leagues, profiles) {
  const byUser        = groupBy(standings, "sleeper_user_id");
  const profileByUser = new Map(profiles.map((p) => [p.sleeper_user_id, p]));

  // How many titles / runner up finishes each user has.
  const titles    = countBy(leagues, "champion_user_id");
  const runnerUps = countBy(leagues, "runner_up_user_id");

  return users.map((u) => {
    const seasons = (byUser.get(u.sleeper_user_id) || [])
      .slice()
      .sort((a, b) => b.season - a.season);

    const wins   = sum(seasons, "wins");
    const losses = sum(seasons, "losses");
    const ties   = sum(seasons, "ties");
    const games  = wins + losses + ties;
    const ranked = seasons.filter((s) => s.rank != null);
    const profile = profileByUser.get(u.sleeper_user_id);

    return {
      id:        u.sleeper_user_id,
      name:      profile?.nickname || u.display_name || u.username,
      teamName:  profile?.team_name || u.team_name || "",
      notes:     profile?.notes || "",
      wins, losses, ties,
      winPct:        games ? (wins + ties / 2) / games : 0,
      pointsFor:     sum(seasons, "points_for"),
      pointsAgainst: sum(seasons, "points_against"),
      avgFinish:     ranked.length ? avg(ranked.map((s) => s.rank)) : null,
      playoffs:      seasons.filter((s) => s.made_playoffs).length,
      titles:        titles.get(u.sleeper_user_id) || 0,
      runnerUps:     runnerUps.get(u.sleeper_user_id) || 0,
      seasons,
    };
  });
}

function sum(rows, key)  { return rows.reduce((t, r) => t + Number(r[key] || 0), 0); }
function avg(numbers)    { return numbers.reduce((a, b) => a + b, 0) / numbers.length; }

function countBy(rows, key) {
  const map = new Map();
  for (const r of rows) {
    const v = r[key];
    if (v) map.set(v, (map.get(v) || 0) + 1);
  }
  return map;
}

// ---------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------

function card(o) {
  const open = openOwner === o.id;

  return `
    <div class="card ${o.titles ? "accent" : ""}">
      <div data-owner="${esc(o.id)}" style="cursor:pointer">
        <div class="card-title">
          ${esc(o.name)}
          ${o.titles ? `<span class="pill green">${o.titles}× champ</span>` : ""}
        </div>
        ${o.teamName ? `<div class="card-meta" style="margin:0 0 8px">${esc(o.teamName)}</div>` : ""}

        <div class="statgrid">
          ${stat("Record", `${o.wins}-${o.losses}${o.ties ? "-" + o.ties : ""}`)}
          ${stat("Win %", (o.winPct * 100).toFixed(1) + "%")}
          ${stat("Points for", Math.round(o.pointsFor).toLocaleString())}
          ${stat("Avg finish", o.avgFinish ? o.avgFinish.toFixed(1) : "—")}
          ${stat("Playoffs", o.playoffs)}
          ${stat("Titles", o.titles)}
        </div>
        <div class="card-meta">${open ? "Tap to collapse" : "Tap for season by season"}</div>
      </div>

      ${open ? seasonTable(o) : ""}
    </div>`;
}

function stat(label, value) {
  return `<div class="stat"><span class="stat-v">${esc(value)}</span><span class="stat-l">${esc(label)}</span></div>`;
}

function seasonTable(o) {
  if (!o.seasons.length) return `<div class="muted tiny">No seasons recorded.</div>`;

  return `
    ${o.notes ? `<div class="card-body" style="margin:12px 0 4px">${esc(o.notes)}</div>` : ""}
    <table class="tbl" style="margin-top:10px">
      <thead>
        <tr><th>Season</th><th>Record</th><th>PF</th><th>Finish</th></tr>
      </thead>
      <tbody>
        ${o.seasons.map((s) => `
          <tr>
            <td>${esc(s.season)}</td>
            <td>${s.wins}-${s.losses}${s.ties ? "-" + s.ties : ""}</td>
            <td>${Math.round(s.points_for).toLocaleString()}</td>
            <td>
              ${s.rank ?? "—"}
              ${s.made_playoffs ? `<span class="pill green tiny">playoffs</span>` : ""}
            </td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}
