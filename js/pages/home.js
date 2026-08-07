// =====================================================================
// Home - the league's front door.
//
// Reads as a landing page: crest, league identity, a few live numbers,
// then the things that actually need attention (events, news, polls).
// =====================================================================

import { db, configured } from "../supabase.js";
import { esc, empty, fmtDate, relDate, fmtShort, errorBox, toast } from "../ui.js";
import { APP_VERSION, LEAGUE_FOUNDED } from "../config.js";
import { checkForUpdate } from "../update.js";
import { promptInstall, isInstalled } from "../install.js";
import { currentMember } from "../members.js";
import { addControl, editControls, wireInline } from "../inline.js";

/** Where the install option lives when we cannot trigger it ourselves. */
function installHelp() {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "In Safari: Share, then Add to Home Screen";
  if (/android/i.test(ua))          return "Chrome menu (⋮), then Install app";
  return "Chrome menu (⋮) → Cast, save and share → Install page as app";
}

export async function render(view) {
  if (!configured) { view.innerHTML = setupNotice(); return; }

  const today = new Date().toISOString().slice(0, 10);

  const [events, announcements, polls, leagues, members] = await Promise.all([
    db().from("events").select("*").gte("event_date", today)
        .order("event_date", { ascending: true }).limit(3),
    db().from("announcements").select("*")
        .order("created_at", { ascending: false }).limit(3),
    db().from("polls").select("*").eq("active", true)
        .order("created_at", { ascending: false }).limit(3),
    db().from("sleeper_leagues").select("season, champion_user_id")
        .order("season", { ascending: false }),
    db().from("members").select("id, display_name, team_name, sleeper_user_id"),
  ]);

  const firstError = events.error || announcements.error || polls.error;
  if (firstError) { view.innerHTML = errorBox(firstError); return; }

  view.innerHTML = `
    <div id="home-wrap">
      ${hero(leagues.data || [], members.data || [])}
      ${quickNav()}

      <section class="block">
        <h2 class="section-title">Upcoming<a class="section-link" href="#/calendar">Calendar →</a></h2>
        ${eventList(events.data)}
        ${adminRow(addControl("events", "Add event"))}
      </section>

      <section class="block">
        <h2 class="section-title">Announcements</h2>
        ${announcementList(announcements.data)}
        ${adminRow(addControl("announcements", "Add announcement"))}
      </section>

      <section class="block">
        <h2 class="section-title">Open polls<a class="section-link" href="#/polls">Vote →</a></h2>
        ${pollList(polls.data)}
        ${adminRow(addControl("polls", "Add poll"))}
      </section>

      <p class="version-line">
        DFL HQ v${esc(APP_VERSION)} ·
        <button class="linkbtn" id="check-update">Check for updates</button>
        ${isInstalled() ? "" : ` · <button class="linkbtn" id="install-app">Install app</button>`}
      </p>
    </div>
  `;

  // #home-wrap is new on every render, so the listener never stacks up.
  wireInline(view.querySelector("#home-wrap"), () => render(view));

  view.querySelector("#install-app")?.addEventListener("click", async () => {
    const outcome = await promptInstall();
    if (outcome === "unavailable") {
      // Chrome only offers its dialog once per page load, and iOS has no
      // API at all, so fall back to telling people where the option lives.
      toast(installHelp(), true);
    }
  });

  view.querySelector("#check-update").addEventListener("click", async (e) => {
    const btn = e.target;
    btn.disabled = true;
    btn.textContent = "Checking…";
    try {
      const { stale, latest } = await checkForUpdate(true);
      if (!stale) toast(`Up to date (v${latest})`);
    } catch (err) {
      toast("Could not check for updates", true);
      console.warn(err);
    }
    btn.disabled = false;
    btn.textContent = "Check for updates";
  });
}

// -------------------------------- hero --------------------------------

function hero(leagues, members) {
  const me = currentMember();

  const latestChampLeague = leagues.find((l) => l.champion_user_id);
  const champ = latestChampLeague
    ? members.find((m) => m.sleeper_user_id === latestChampLeague.champion_user_id)
    : null;

  /*
    The season count used to be leagues.length - how many seasons Sleeper
    has, which is not how old the league is. The first two years were played
    elsewhere and left no data, so counting rows understated the DFL by two
    whole seasons. Age comes from the founding year; the stats keep coming
    from the data.
  */
  const year   = new Date().getFullYear();
  const number = year - LEAGUE_FOUNDED + 1;
  const milestone = number > 1 && number % 10 === 0;

  return `
    <section class="hero ${milestone ? "milestone" : ""}">
      ${milestone ? `<p class="hero-anniversary">${esc(ordinal(number))} Anniversary Season</p>` : ""}

      <img class="hero-crest" src="icons/logo-256.png" alt="DFL league crest"
           width="256" height="256">
      <!-- The crest already reads "DFL", so the wordmark would just repeat
           it. Kept as a heading for screen readers and page structure. -->
      <h1 class="sr-only">DFL HQ</h1>

      <p class="hero-creed">
        Forged by sinners.<br>
        Fueled by rivalries.<br>
        Defined by champions.
      </p>
      <p class="hero-mark">Every season leaves a mark.</p>

      ${me ? `<p class="hero-welcome">Welcome back, <strong>${esc(me.display_name)}</strong>.</p>` : ""}

      <div class="hero-stats">
        ${heroStat(ordinal(number), "Season", `Est. ${LEAGUE_FOUNDED}`)}
        ${heroStat(members.length || "—", "Owners")}
        ${champ
          ? heroStat(latestChampLeague.season, "Champion", champ.team_name || champ.display_name)
          : heroStat("—", "Champion")}
      </div>
    </section>`;
}

/** 1st, 2nd, 3rd, 4th… 11th, 12th, 13th. */
function ordinal(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return n + (["th", "st", "nd", "rd"][n % 10] || "th");
}

function heroStat(value, label, sub = "") {
  return `
    <div class="hero-stat">
      <span class="hero-stat-v">${esc(value)}</span>
      <span class="hero-stat-l">${esc(label)}</span>
      ${sub ? `<span class="hero-stat-s">${esc(sub)}</span>` : ""}
    </div>`;
}

// ------------------------------ quick nav ------------------------------

// An icon and a word. The tiles used to carry a tagline each ("League law",
// "Who's kept"), which explained nothing a returning owner did not already
// know and made the grid twice as tall.
const NAV = [
  ["rules", "Rules"],
  ["keepers", "Keepers"],
  ["polls", "Polls"],
  ["calendar", "Calendar"],
  ["history", "History"],
  ["finances", "Finances"],
  ["profile", "Profile"],
  ["admin", "Admin"],
];

function quickNav() {
  return `
    <nav class="quicknav">
      ${NAV.map(([route, label]) => `
        <a href="#/${route}">
          <svg class="ico" aria-hidden="true"><use href="#i-${route}"></use></svg>
          <span class="qn-label">${esc(label)}</span>
        </a>`).join("")}
    </nav>`;
}

// ------------------------------- lists ---------------------------------

/** Wraps an admin control so the row disappears entirely for members. */
function adminRow(control) {
  return control ? `<div class="row-end">${control}</div>` : "";
}

function eventList(rows) {
  if (!rows?.length) return empty("Nothing on the schedule yet.");
  return rows.map((e) => `
    <article class="card event">
      <div class="event-when">
        <span class="event-date">${esc(fmtDate(e.event_date))}</span>
        <span class="pill green">${esc(relDate(e.event_date))}</span>
      </div>
      <h3 class="card-heading">${esc(e.title)}</h3>
      ${e.description ? `<div class="card-body">${esc(e.description)}</div>` : ""}
      ${editControls("events", e)}
    </article>`).join("");
}

function announcementList(rows) {
  if (!rows?.length) return empty("Nothing from the commissioner yet.");
  return rows.map((a) => `
    <article class="card">
      <div class="card-kicker">${esc(fmtShort(a.created_at))}</div>
      <h3 class="card-heading">${esc(a.title)}</h3>
      <div class="card-body">${esc(a.content)}</div>
      ${editControls("announcements", a)}
    </article>`).join("");
}

/**
 * A poll preview is a link to the polls page, so the admin buttons sit
 * outside it - a button nested in an <a> would swallow the tap.
 */
function pollList(rows) {
  if (!rows?.length) return empty("No polls open right now.");
  return rows.map((p) => `
    <a class="card linkcard" href="#/polls">
      <h3 class="card-heading">${esc(p.question)}</h3>
      <span class="card-cta">Cast your vote →</span>
    </a>
    ${editControls("polls", p, { compact: true })}`).join("");
}

function setupNotice() {
  return `
    <header class="page-head"><h1>Almost there</h1></header>
    <div class="card note">
      <h3 class="card-heading">Connect Supabase</h3>
      <div class="card-body">Open <strong>js/config.js</strong> and paste in your Supabase project URL and anon key, then run <strong>schema.sql</strong> in the Supabase SQL editor.

The README walks through both steps.</div>
    </div>`;
}
