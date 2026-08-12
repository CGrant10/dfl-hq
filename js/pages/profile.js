// =====================================================================
// Profile - one member, everything the app knows about them.
//
// Pulls together the hand-written profile, league history, keepers,
// finances and Sleeper career numbers. Read only for members; an admin
// gets an Edit button on the profile card itself.
//
// #/profile          -> the member using this device
// #/profile?id=12    -> anybody else
// =====================================================================

import { db } from "../supabase.js";
import { esc, empty, money, errorBox, groupBy } from "../ui.js";
import { currentMember, loadMembers, refreshMember } from "../members.js";
import { editControls, wireInline } from "../inline.js";
import { findTeam, teamOptions } from "../teams.js";
import { saveMode, savedMode, activeMode, modeOptions } from "../theme.js";
import { toast } from "../ui.js";

export async function render(view) {
  const wanted = new URLSearchParams((location.hash.split("?")[1] || "")).get("id");

  let members;
  try {
    members = await loadMembers();
  } catch (err) {
    view.innerHTML = `<h1>Profile</h1>` + errorBox(err) +
      `<div class="card"><div class="card-body muted">If the members table is missing, run
       <strong>members_schema.sql</strong> in Supabase.</div></div>`;
    return;
  }

  const me = currentMember();
  const member = wanted
    ? members.find((m) => String(m.id) === String(wanted))
    : me;

  if (!member) {
    view.innerHTML = `<h1>Profile</h1>${empty(
      "No profile selected. Tap your name in the top right to choose one.")}`;
    return;
  }

  const isMe = me && String(me.id) === String(member.id);

  // Everything else about this person, in parallel.
  const [standings, leagues, keepers, payments, sleeperUser] = await Promise.all([
    member.sleeper_user_id
      ? db().from("sleeper_standings").select("*").eq("sleeper_user_id", member.sleeper_user_id)
      : { data: [] },
    db().from("sleeper_leagues").select("season, champion_user_id, runner_up_user_id"),
    db().from("keepers").select("*"),
    db().from("finance_payments").select("*"),
    member.sleeper_user_id
      ? db().from("sleeper_users").select("*").eq("sleeper_user_id", member.sleeper_user_id).maybeSingle()
      : { data: null },
  ]);

  // The name to show at the top is the CURRENT one: whatever the member
  // profile says, otherwise the latest name Sleeper has. Historic names
  // live in the season table further down and are never used up here.
  const currentTeam = member.team_name || sleeperUser?.data?.team_name || "";

  const seasons = (standings.data || []).sort((a, b) => b.season - a.season);
  const career  = careerTotals(seasons, leagues.data || [], member.sleeper_user_id);

  const myKeepers = (keepers.data || []).filter((k) =>
    sameName(k.team, member.team_name) || sameName(k.team, member.display_name));

  const myDues = (payments.data || []).filter((p) =>
    sameName(p.owner_name, member.display_name) || sameName(p.team_name, member.team_name))
    .sort((a, b) => b.season - a.season);

  /* Their actual favourite team. It used to be read through savedTheme() so
     the app could recolour itself around it; that is gone - there is one
     palette now - so this is simply the profile field it always was. */
  const team = findTeam(member.favorite_team);

  view.innerHTML = `
    <div id="profile-wrap">
      ${header(member, team, isMe, currentTeam, sleeperUser?.data?.current_season)}
      ${careerCard(career, seasons.length)}
      ${awardsCard(member)}
      ${historyCard(seasons, leagues.data || [], member.sleeper_user_id)}
      ${keepersCard(myKeepers)}
      ${duesCard(myDues)}
      ${isMe ? appearanceCard() + favouriteTeamCard(member) : ""}
      ${othersCard(members, member)}
    </div>
  `;

  if (isMe) wireThemePicker(view, member);

  // An edit changes the member row the picker and the header chip read from,
  // so the cache has to go before the page is drawn again.
  wireInline(view.querySelector("#profile-wrap"), async () => {
    await refreshMember();
    render(view);
  });

  view.querySelector("#switch-member")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("dfl:pick-member"));
  });
}

// ------------------------------- header -------------------------------

function header(m, team, isMe, currentTeam, currentSeason) {
  // Both team colours drive the card: a two-stop stripe across the top and
  // a matching ring around the avatar.
  //
  // Their team's REAL colours, straight from teams.js. This used to go through
  // the theme map, which only held theme ids - so an NFL team fell through to
  // the default and every profile header wore the same ring. findTeam has
  // carried primary/secondary all along.
  const c = findTeam(m.favorite_team);
  const style = c
    ? `style="--t1:${c.primary};--t2:${c.secondary}"`
    : "";

  return `
    <div class="card profile-head ${c ? "has-team" : "accent"}" ${style}>
      <div class="profile-top">
        ${m.profile_image
          ? `<img class="avatar" src="${esc(m.profile_image)}" alt="">`
          : `<div class="avatar avatar-fallback">${esc(initials(m.display_name))}</div>`}
        <div style="flex:1;min-width:0">
          <h1 class="profile-name">${esc(currentTeam || m.display_name)}</h1>
          <div class="muted">
            ${esc(m.display_name)}${isMe ? " · this is you" : ""}
            ${currentTeam && currentSeason
              ? `<span class="muted tiny"> · ${esc(currentSeason)} team</span>` : ""}
          </div>
          <div class="row" style="margin-top:8px">
            ${m.championships > 0 ? `<span class="pill green">${m.championships}× champion</span>` : ""}
            ${m.joined_year ? `<span class="pill">Since ${esc(m.joined_year)}</span>` : ""}
            ${c ? `<span class="pill teampill">
                     <i class="sw sw1"></i><i class="sw sw2"></i>${esc(c.name)}
                   </span>` : ""}
          </div>
          <div class="row" style="margin-top:10px">
            ${isMe
              ? `<button class="btn ghost small" id="switch-member">Not you? Switch</button>`
              : `<a class="btn ghost small" href="#/profile">Back to my profile</a>`}
            ${editControls("members", m, { compact: true, del: false })}
          </div>
        </div>
      </div>
    </div>
    ${m.notes ? `<div class="card">
                   <h3 class="card-heading">About</h3>
                   <div class="card-body">${esc(m.notes)}</div>
                 </div>` : ""}`;
}

function initials(name) {
  return String(name || "?").trim().slice(0, 2).toUpperCase();
}

// ------------------------------- career -------------------------------

/*
  Seasons this member actually won.

  The guard on userId is the whole point. A member with no Sleeper account
  linked has sleeper_user_id null, and a season nobody has won yet - 2019 was
  never recorded, and the current season is not over - has champion_user_id
  null. `null === null` is true, so the plain comparison this replaced handed
  every unlinked member a championship for every unwon season. It is exactly
  how a name typed in to get somebody onto a golf card ended up holding the
  2019 title.
*/
function seasonsWon(leagues, field, userId) {
  if (userId == null) return [];
  return leagues.filter((l) => l[field] != null && l[field] === userId);
}

function careerTotals(seasons, leagues, userId) {
  const wins   = sum(seasons, "wins");
  const losses = sum(seasons, "losses");
  const ties   = sum(seasons, "ties");
  const games  = wins + losses + ties;
  const ranked = seasons.filter((s) => s.rank != null);

  return {
    wins, losses, ties,
    winPct:    games ? (wins + ties / 2) / games : 0,
    pointsFor: sum(seasons, "points_for"),
    avgFinish: ranked.length ? ranked.reduce((t, s) => t + s.rank, 0) / ranked.length : null,
    playoffs:  seasons.filter((s) => s.made_playoffs).length,
    titles:    seasonsWon(leagues, "champion_user_id", userId).length,
    runnerUps: seasonsWon(leagues, "runner_up_user_id", userId).length,
  };
}

function careerCard(c, seasonCount) {
  if (!seasonCount) {
    return `<div class="card"><div class="card-title">Career</div>${empty(
      "No Sleeper history linked. An admin can connect this profile to a Sleeper account.")}</div>`;
  }
  return `
    <div class="card">
      <div class="card-title">Career</div>
      <div class="statgrid">
        ${stat("Record", `${c.wins}-${c.losses}${c.ties ? "-" + c.ties : ""}`)}
        ${stat("Win %", (c.winPct * 100).toFixed(1) + "%")}
        ${stat("Points", Math.round(c.pointsFor).toLocaleString())}
        ${stat("Avg finish", c.avgFinish ? c.avgFinish.toFixed(1) : "—")}
        ${stat("Playoffs", c.playoffs)}
        ${stat("Titles", c.titles)}
      </div>
      <div class="card-meta">${seasonCount} season${seasonCount === 1 ? "" : "s"} on record.</div>
    </div>`;
}

// ------------------------------- awards -------------------------------

function awardsCard(m) {
  const lines = (m.awards || "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return "";
  return `
    <div class="card">
      <div class="card-title">Awards</div>
      <ul class="tidy">${lines.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
    </div>`;
}

// ------------------------------ history -------------------------------

function historyCard(seasons, leagues, userId) {
  if (!seasons.length) return "";
  const champYears  = new Set(seasonsWon(leagues, "champion_user_id", userId).map((l) => l.season));
  const runnerYears = new Set(seasonsWon(leagues, "runner_up_user_id", userId).map((l) => l.season));

  return `
    <div class="card">
      <div class="card-title">League history</div>
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr>
            <th>Season</th><th>Team that year</th><th>Record</th>
            <th class="num">Points</th><th>Finish</th>
          </tr></thead>
          <tbody>
            ${seasons.map((s) => `
              <tr>
                <td>${esc(s.season)}</td>
                <td class="muted">${esc(s.team_name || "—")}</td>
                <td>${s.wins}-${s.losses}${s.ties ? "-" + s.ties : ""}</td>
                <td class="num">${Math.round(s.points_for).toLocaleString()}</td>
                <td>
                  ${s.rank ?? "—"}
                  ${champYears.has(s.season)  ? `<span class="pill green">champion</span>` : ""}
                  ${runnerYears.has(s.season) ? `<span class="pill">runner up</span>` : ""}
                  ${!champYears.has(s.season) && s.made_playoffs ? `<span class="pill grey">playoffs</span>` : ""}
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ------------------------------ keepers -------------------------------

function keepersCard(rows) {
  if (!rows.length) return "";
  const byYear = [...groupBy(rows, "year").entries()].sort((a, b) => b[0] - a[0]);
  return `
    <div class="card">
      <div class="card-title">Keepers</div>
      ${byYear.map(([year, list]) => `
        <div class="subcard">
          <strong>${esc(year)}</strong>
          <ul class="tidy">
            ${list.map((k) => `<li>${esc(k.player)}${k.round_cost != null
              ? ` <span class="muted">— round ${esc(k.round_cost)}</span>` : ""}</li>`).join("")}
          </ul>
        </div>`).join("")}
    </div>`;
}

// ------------------------------- dues ---------------------------------

function duesCard(rows) {
  if (!rows.length) return "";
  return `
    <div class="card">
      <div class="card-title">Financial status</div>
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Season</th><th class="num">Due</th><th class="num">Paid</th><th>Status</th></tr></thead>
          <tbody>
            ${rows.map((p) => {
              const due = Number(p.amount_due || 0), paid = Number(p.amount_paid || 0);
              const s = paid >= due && due > 0 ? ["Paid", "green"]
                      : paid > 0              ? ["Partial", "warn"]
                      : ["Unpaid", "red"];
              return `
                <tr>
                  <td>${esc(p.season)}</td>
                  <td class="num">${money(due)}</td>
                  <td class="num">${money(paid)}</td>
                  <td><span class="pill ${s[1]}">${s[0]}</span></td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ---------------------------- appearance -----------------------------

/*
  Light or dark, and by default neither - it follows the phone.

  This replaced a "Team colours" card that could not work: it fed NFL team ids
  into a map that only ever held theme ids, so every pick collapsed to the
  default theme and the swatch lied about it. There is one palette now, the
  crest, so the only thing left worth choosing is the mode.

  "Match my phone" is a real option rather than a starting value: pick it and
  the app keeps following the OS, including when it flips at sunset.
*/
function appearanceCard() {
  const want = savedMode();
  const now = activeMode();
  return `
    <div class="card">
      <h3 class="card-heading">Appearance</h3>
      <div class="modebar" id="mode-pick">
        ${modeOptions().map((o) => `
          <button type="button" class="mode-opt ${o.id === want ? "is-on" : ""}"
                  data-mode-pick="${o.id}" aria-pressed="${o.id === want}">${esc(o.name)}</button>`).join("")}
      </div>
      <p class="muted tiny" id="mode-note">${want === "system"
        ? `Following your phone, which is ${now} right now.`
        : `Always ${want} on this device.`}</p>
    </div>`;
}

/* The favourite team is a profile field and nothing more now - it names the
   team on your profile header. It no longer recolours the app. */
function favouriteTeamCard(m) {
  const value = m.favorite_team || "";
  return `
    <div class="card">
      <h3 class="card-heading">Favourite team</h3>
      <label for="team-pick" class="muted tiny">Shown on your profile.</label>
      <select id="team-pick">
        ${teamOptions().map((o) =>
          `<option value="${esc(o.value)}" ${o.value === value ? "selected" : ""}>${esc(o.label)}</option>`).join("")}
      </select>
      <div class="row-end">
        <button class="btn ghost small" id="team-save">Save to my profile</button>
      </div>
    </div>`;
}

function wireThemePicker(view, member) {
  const bar = view.querySelector("#mode-pick");
  if (bar) bar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode-pick]");
    if (!btn) return;
    saveMode(btn.dataset.modePick);
    // Repaint the bar and its note in place - re-rendering the whole profile
    // to move one highlight would throw the page back to the top.
    bar.querySelectorAll("[data-mode-pick]").forEach((b) => {
      const on = b === btn;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    const note = view.querySelector("#mode-note");
    if (note) note.textContent = savedMode() === "system"
      ? `Following your phone, which is ${activeMode()} right now.`
      : `Always ${savedMode()} on this device.`;
  });

  const select = view.querySelector("#team-pick");
  if (!select) return;
  view.querySelector("#team-save")?.addEventListener("click", async () => {
    const { error } = await db().from("members")
      .update({ favorite_team: select.value || null }).eq("id", member.id);
    // Members are admin-write, so a normal member just keeps the local choice.
    toast(error ? "Could not save to your profile" : "Saved to your profile", !!error);
  });
}

// ------------------------------ others --------------------------------

function othersCard(members, current) {
  const others = members.filter((m) => m.id !== current.id);
  if (!others.length) return "";
  return `
    <div class="card">
      <div class="card-title">Other members</div>
      <div class="chiprow">
        ${others.map((m) =>
          `<a class="chip" href="#/profile?id=${m.id}">${esc(m.display_name)}</a>`).join("")}
      </div>
    </div>`;
}

// ------------------------------- bits ---------------------------------

function stat(label, value) {
  return `<div class="stat"><span class="stat-v">${esc(value)}</span><span class="stat-l">${esc(label)}</span></div>`;
}

function sum(rows, key) {
  return rows.reduce((t, r) => t + Number(r[key] || 0), 0);
}

function sameName(a, b) {
  return !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}
