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
import { saveMode, savedMode, activeMode, modeOptions } from "../theme.js";
import { toast } from "../ui.js";
import { FIRST_SYNCED_SEASON } from "../config.js";
import { wireDflPage } from "./profile-dfl.js";
/* The same derivation the history page reads, so a career and the record
   book can never disagree about the same game. */
import { loadLore, namer, career, headToHead, spanLabel } from "../lore.js";

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
    view.innerHTML = `<h1>Profile</h1>${empty("No profile selected.")}`;
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

  /* The career, the cabinet and the head-to-head all come from one shared
     load that the history page has usually already paid for. An unlinked
     member has no Sleeper history to derive anything from, so nothing is
     fetched and none of those cards are drawn. */
  const lore = member.sleeper_user_id ? await loadLore().catch(() => null) : null;
  const dfl  = lore && !lore.error ? career(lore, member.sleeper_user_id) : null;
  const foes = lore && !lore.error ? headToHead(lore, member.sleeper_user_id) : [];
  const loreName = lore && !lore.error ? namer(lore) : null;

  // The name to show at the top is the CURRENT one: whatever the member
  // profile says, otherwise the latest name Sleeper has. Historic names
  // live in the season table further down and are never used up here.
  const currentTeam = member.team_name || sleeperUser?.data?.team_name || "";

  const seasons = (standings.data || []).sort((a, b) => b.season - a.season);
  const careerStats = careerTotals(seasons, leagues.data || [], member.sleeper_user_id);

  const myKeepers = (keepers.data || []).filter((k) =>
    sameName(k.team, member.team_name) || sameName(k.team, member.display_name));

  const myDues = (payments.data || []).filter((p) =>
    sameName(p.owner_name, member.display_name) || sameName(p.team_name, member.team_name))
    .sort((a, b) => b.season - a.season);

  /*
    TWO HALVES, AND THE PAGE SAYS WHICH IS WHICH.

    Everything on this page is worth having and none of it has been removed.
    The problem was that it had all arrived as one more card on the end, so a
    championship, a dues table and a colour-mode picker carried identical
    weight and the answer to "who is this person?" was somewhere in the middle
    of eleven identical rectangles.

    WHO THIS IS - open, no fold control, in this order:
      the header, the trophy cabinet, the career figures, the career extremes,
      and the DFL character. The character moved UP from below the dues table:
      it is the one part of this page the member chose themselves, which makes
      it identity rather than reference.

    RECORD & REFERENCE - folded by default, one tap away:
      league history, head to head, keepers, dues, and a long awards list.
      These are things you go looking for, not things you need on arrival.
      Each fold row carries a count, so a shut card still tells you how much
      is in it.

    SETTINGS - your own profile only, and last, because a golf name and a
    colour mode are neither identity nor record.

    Folding is js/collapse.js, the app's only collapse implementation: a real
    <button> with aria-expanded and an aria-label, keyboard operable, and the
    reader's choice remembered per device. Every "folded" below is only a
    DEFAULT - one tap and that card stays open for good.
  */
  const reference = [
    awardsCard(member),
    historyCard(seasons, leagues.data || [], member.sleeper_user_id),
    loreName ? rivalryCard(foes, loreName, members) : "",
    keepersCard(myKeepers),
    duesCard(myDues),
  ].filter(Boolean);

  view.innerHTML = `
    <div id="profile-wrap">
      ${header(member, isMe, currentTeam, sleeperUser?.data?.current_season)}
      ${dfl ? cabinetCard(dfl) : ""}
      ${careerCard(careerStats, seasons.length)}
      ${dfl && loreName ? extremesCard(dfl, loreName) : ""}
      <div data-dfl-host></div>
      ${reference.length ? `<h2 class="section-title">Record &amp; reference</h2>` : ""}
      ${reference.join("")}
      ${isMe ? `<h2 class="section-title">Settings</h2>${golfNameCard(member)}${appearanceCard()}` : ""}
      ${othersCard(members, member)}
    </div>
  `;

  wireDflPage(view, member, isMe, () => render(view));
  if (isMe) { wireThemePicker(view); wireGolfName(view, member); }

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

function header(m, isMe, currentTeam, currentSeason) {
  /* ONE PALETTE. The header used to wear a member's favourite NFL team as a
     two-stop stripe and a ring on the avatar, from a 32-team colour table.
     That table is gone: the league has its own colours and borrowing
     somebody else's for a profile card was the only place in the app still
     doing it. The crest pair does the job now, which is what .accent
     already meant. */
  return `
    <div class="card profile-head accent">
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

/*
  THE CAREER CARD.

  Three changes from the first version, all of them subtraction:

  1. SIX CELLS IN A DELIBERATE GRID. .statgrid is auto-fit at minmax(84px,1fr),
     which on a 375px phone fits four - so six stats wrapped 4 + 2 and left a
     half-empty row under the numbers that are the point of the card. `.statgrid
     is-3up` pins it to three columns, so it reads 3 + 3 on a phone and six
     across on a desktop. Nothing is ragged at any width.

  2. WIN % IS GONE. It sat immediately beside Record, from which it is exactly
     derivable, and it was the sixth number competing for the same glance. The
     record is the fact; the percentage was a restatement of it.

  3. "N seasons on record" WAS A SENTENCE UNDER A GRID OF NUMBERS. It is a
     number, so it is a cell - and the card loses its footer entirely.
*/
function careerCard(c, seasonCount) {
  if (!seasonCount) {
    return `<div class="card"><div class="card-title">Career</div>${empty(
      "No Sleeper history linked.")}</div>`;
  }
  return `
    <div class="card">
      <div class="card-title">Career</div>
      <div class="statgrid is-3up">
        ${stat("Seasons", seasonCount)}
        ${stat("Record", `${c.wins}-${c.losses}${c.ties ? "-" + c.ties : ""}`)}
        ${stat("Points", Math.round(c.pointsFor).toLocaleString())}
        ${stat("Avg finish", c.avgFinish ? c.avgFinish.toFixed(1) : "—")}
        ${stat("Playoffs", c.playoffs)}
        ${stat("Titles", c.titles)}
      </div>
    </div>`;
}

// ------------------------------- awards -------------------------------

/*
  Folded only when it is long enough to be in the way. Two or three awards
  are a nice thing to see on arrival; fourteen are a list you scroll past.
  The threshold is the whole reason collapse.js reads its default on every
  draw rather than once.
*/
const AWARDS_FOLD_FROM = 5;

function awardsCard(m) {
  const lines = (m.awards || "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return "";
  const long = lines.length >= AWARDS_FOLD_FROM;
  return `
    <div class="card" data-collapse="profile-awards" data-collapse-title="Awards"
         data-collapse-badge="${lines.length}"${long ? ` data-collapse-default="folded"` : ""}>
      <ul class="tidy">${lines.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
    </div>`;
}

// ------------------------------ history -------------------------------

function historyCard(seasons, leagues, userId) {
  if (!seasons.length) return "";
  const champYears  = new Set(seasonsWon(leagues, "champion_user_id", userId).map((l) => l.season));
  const runnerYears = new Set(seasonsWon(leagues, "runner_up_user_id", userId).map((l) => l.season));

  return `
    <div class="card" data-collapse="profile-history" data-collapse-default="folded"
         data-collapse-title="League history"
         data-collapse-badge="${seasons.length} season${seasons.length === 1 ? "" : "s"}">
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
    <div class="card" data-collapse="profile-keepers" data-collapse-default="folded"
         data-collapse-title="Keepers" data-collapse-badge="${rows.length}">
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
  const owing = rows.filter((p) =>
    Number(p.amount_paid || 0) < Number(p.amount_due || 0)).length;
  return `
    <div class="card" data-collapse="profile-dues" data-collapse-default="folded"
         data-collapse-title="Financial status"
         data-collapse-badge="${owing ? `${owing} due` : "Settled"}">
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
/*
  YOUR GOLF NAME.

  Half the league is in here under a Sleeper username from 2019 - azhee28,
  Martin77 - because that is what they signed up as. That name is load
  bearing on the fantasy side: the keepers, the record book and ten years of
  history key off it, so it cannot be "fixed". Golf is a different room and
  the people on the tee know each other by their actual names.

  So this sets ONE column that only the golf screens read. It cannot reach
  display_name, team_name, Sleeper, or any fantasy data - the write is an
  RPC that can touch nothing else. The card says so, because somebody
  editing a name wants to know what else they are about to change.
*/
function golfNameCard(m) {
  const current = String(m.golf_name || "").trim();
  return `
    <div class="card">
      <div class="card-title">Your golf name</div>
      <p class="muted tiny">What the scorecards, the leaderboard and the shared
        cards call you. Your DFL name, your Sleeper account and all of your
        fantasy history are untouched.</p>
      <form class="golfname-form" data-golfname>
        <label for="golf-name-input">Golf name</label>
        <div class="golfname-row">
          <input id="golf-name-input" name="golfname" type="text" maxlength="40"
                 autocomplete="off" placeholder="${esc(m.display_name)}" value="${esc(current)}">
          <button class="btn small" type="submit">Save</button>
        </div>
        <p class="muted tiny">Leave it blank to go back to <strong>${esc(m.display_name)}</strong>.</p>
      </form>
    </div>`;
}

function wireGolfName(view, member) {
  const form = view.querySelector("[data-golfname]");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = form.golfname.value.trim();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const { data, error } = await db().rpc("dfl_set_golf_name", { p_name: value });
      if (error) throw error;
      /* 0 rows is the honest failure. The RPC returns a count rather than
         throwing, so without this the form would claim a save that the
         database declined to make. */
      if (!data) throw new Error("Pick your name in the top right first.");
      await refreshMember().catch(() => {});
      toast(value ? `Golf calls you ${value}` : "Back to your DFL name");
      render(view);
    } catch (err) {
      toast(/function|does not exist/i.test(err.message || "")
        ? "Run golf_identity_schema.sql in Supabase"
        : (err.message || "Could not save that name"), true);
      btn.disabled = false;
    }
  });
}

/* The note names the mode the way the BUTTON does. Printing the raw id gave
   "Always medicine on this device." the moment a mode arrived whose id was
   not already an English word. */
const modeName = (id) => modeOptions().find((o) => o.id === id)?.name || id;

function modeNote() {
  const want = savedMode();
  return want === "system"
    ? `Following your phone, which is ${modeName(activeMode())} right now.`
    : `Always ${modeName(want)} on this device.`;
}

function appearanceCard() {
  const want = savedMode();
  return `
    <div class="card">
      <h3 class="card-heading">Appearance</h3>
      <div class="modebar" id="mode-pick">
        ${modeOptions().map((o) => `
          <button type="button" class="mode-opt ${o.id === want ? "is-on" : ""}"
                  data-mode-pick="${o.id}" aria-pressed="${o.id === want}">${esc(o.name)}</button>`).join("")}
      </div>
      <p class="muted tiny" id="mode-note">${esc(modeNote())}</p>
    </div>`;
}

function wireThemePicker(view) {
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
    if (note) note.textContent = modeNote();
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

// ========================== THE DFL CAREER ============================
//
// Sleeper tells somebody what happened this season. These three cards are
// what they have DONE in this league, and every figure comes out of lore.js
// so a rivalry printed here matches the moment printed on the history page.
//
// Only drawn for a profile linked to a Sleeper account. An unlinked member
// gets nothing rather than a set of zeroes pretending to be a career.

/*
  THE TROPHY CABINET.

  Titles first, at size, because that is the one line of a DFL career that
  settles an argument. It is not drawn at all for somebody who has not won
  anything - an empty cabinet with "0" in it is a worse thing to show a
  person than no cabinet, and it is the sort of pointless scoreboard the
  brief specifically rules out.
*/
function cabinetCard(c) {
  if (!c.titles.length && !c.seconds.length) return "";
  return `
    <section class="cabinet">
      ${c.titles.length ? `
        <div class="cab-row">
          <svg class="ico-sm" aria-hidden="true"><use href="#i-trophy"></use></svg>
          <b class="cab-n">${c.titles.length}</b>
          <span class="cab-l">${c.titles.length === 1 ? "Championship" : "Championships"}</span>
          <span class="cab-years">${c.titles.map((y) => `<span class="cab-year">${esc(y)}</span>`).join("")}</span>
        </div>` : ""}
      ${c.seconds.length ? `
        <div class="cab-row is-second">
          <svg class="ico-sm" aria-hidden="true"><use href="#i-medal"></use></svg>
          <b class="cab-n">${c.seconds.length}</b>
          <span class="cab-l">Runner-up</span>
          <span class="cab-years">${c.seconds.map((y) => `<span class="cab-year">${esc(y)}</span>`).join("")}</span>
        </div>` : ""}
    </section>`;
}

/*
  THE CAREER EXTREMES. Best and worst season by FINISH, not by points -
  finishing position is what an owner actually argues about, and a team that
  scored the most points and missed the playoffs is a different story that
  the season table below already tells.
*/
function extremesCard(c, name) {
  const rows = [];
  /*
    ONLY THE NAME USED THAT YEAR, or none.

    The first cut of this fell back to the owner's CURRENT team name when a
    season had no snapshot, which put "🏆DaGrapeApes🏆" against a 2020 row -
    a name that did not exist in 2020. A season either kept its name or it
    did not; where it did not, the year and the record say enough. Reaching
    for today's value because it is easier to get is how a record book stops
    being one.
  */
  const seasonLabel = (s) => String(s.team_name || "").trim();

  if (c.bestSeason) {
    rows.push(recLine("Best season", ordinalPlace(c.bestSeason.rank),
      seasonLabel(c.bestSeason),
      `${c.bestSeason.season} · ${c.bestSeason.wins}-${c.bestSeason.losses}${c.bestSeason.ties ? "-" + c.bestSeason.ties : ""}`));
  }
  // Only worth printing when it is a DIFFERENT season from the best one.
  if (c.worstSeason && c.bestSeason && c.worstSeason.season !== c.bestSeason.season) {
    rows.push(recLine("Worst season", ordinalPlace(c.worstSeason.rank),
      seasonLabel(c.worstSeason),
      `${c.worstSeason.season} · ${c.worstSeason.wins}-${c.worstSeason.losses}${c.worstSeason.ties ? "-" + c.worstSeason.ties : ""}`));
  }
  if (c.highWeek) {
    rows.push(recLine("Highest week", c.highWeek.score.toFixed(2), "",
      `${c.highWeek.season} · Week ${c.highWeek.week}`));
  }
  if (c.lowWeek && c.lowWeek !== c.highWeek) {
    rows.push(recLine("Lowest week", c.lowWeek.score.toFixed(2), "",
      `${c.lowWeek.season} · Week ${c.lowWeek.week}`));
  }
  if (c.streak.win && c.streak.win.run >= 3) {
    rows.push(recLine("Longest win streak", `${c.streak.win.run} weeks`, "",
      spanLabel(c.streak.win.from, c.streak.win.to)));
  }
  if (c.streak.loss && c.streak.loss.run >= 3) {
    rows.push(recLine("Longest slide", `${c.streak.loss.run} weeks`, "",
      spanLabel(c.streak.loss.from, c.streak.loss.to)));
  }

  if (!rows.length) return "";
  return `
    <h2 class="section-title">The career</h2>
    <div class="card recbook">${rows.join("")}</div>`;
}

/* Same shape as the record book's row, so a career reads like the league's
   record book rather than like a different app. */
function recLine(label, value, holder, when) {
  /* No "—" placeholder for the holder. On the league record book that column
     answers "who?", which is a real question; on somebody's own page the
     answer is the person whose page it is, so an em-dash there is a blank
     where no question was asked. */
  return `
    <div class="rec">
      <span class="rec-label">${esc(label)}</span>
      ${holder || when ? `<span class="rec-who">
        ${esc(holder || "")}
        ${when ? `<span class="rec-when">${esc(when)}</span>` : ""}
      </span>` : ""}
      <span class="rec-val">${esc(value)}</span>
    </div>`;
}

function ordinalPlace(n) {
  if (n == null) return "—";
  const r = n % 100;
  if (r >= 11 && r <= 13) return `${n}th`;
  return n + (["th", "st", "nd", "rd"][n % 10] || "th");
}

/*
  RIVALRIES.

  Every owner this person has ever played, most-played first, with the
  series record. This is the thing Sleeper genuinely cannot tell you: it
  knows this season's matchups, not that you are 3-9 against one man across
  seven years.

  A "rivalry" is not declared by the app. The table shows the record and
  lets the league decide what to call it - the only editorial line is the
  tag on a series that is DEAD LEVEL after enough meetings to mean it, and
  that is a threshold, not an opinion.
*/
function rivalryCard(rows, name, members) {
  if (!rows.length) return "";
  const memberByUser = new Map(members.map((m) => [m.sleeper_user_id, m]));

  /* The section title moved into the fold row rather than sitting above it,
     so a shut card is one line instead of a heading over a heading. */
  return `
    <div class="card" data-collapse="profile-h2h" data-collapse-default="folded"
         data-collapse-title="Head to head"
         data-collapse-badge="${rows.length} opponent${rows.length === 1 ? "" : "s"}">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr>
            <th>Opponent</th><th>Record</th><th class="num">Met</th><th>Last</th>
          </tr></thead>
          <tbody>
            ${rows.map((r) => {
              const who = name(r.user);
              const mem = memberByUser.get(r.user);
              const level = r.meetings >= 8 && r.wins === r.losses;
              const owned = r.meetings >= 5 && r.wins === 0;
              return `
                <tr>
                  <td>
                    ${mem ? `<a href="#/profile?id=${mem.id}">${esc(who.label)}</a>` : esc(who.label)}
                    ${level ? `<span class="pill warn tiny">dead level</span>` : ""}
                    ${owned ? `<span class="pill red tiny">never beaten them</span>` : ""}
                  </td>
                  <td>${r.wins}-${r.losses}${r.ties ? "-" + r.ties : ""}</td>
                  <td class="num">${r.meetings}</td>
                  <td class="muted tiny">${r.last
                    ? `${r.last.season} Wk ${r.last.week} · ${r.last.won ? "won" : "lost"} ${r.last.mine.toFixed(1)}–${r.last.theirs.toFixed(1)}`
                    : "—"}</td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
      <div class="card-meta">Every meeting on record, ${esc(FIRST_SYNCED_SEASON)} onward.</div>
    </div>`;
}
