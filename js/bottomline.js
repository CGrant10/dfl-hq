// =====================================================================
// bottomline.js - THE DFL BOTTOMLINE
// ---------------------------------------------------------------------
// The strip above the bottom nav that says what is going on in the league.
// The shape is ESPN's BottomLine; the content is emphatically not.
//
// IT ONLY EVER REPORTS THINGS DFL HQ ALREADY KNOWS
//
//   next event        the soonest future row in `events`
//   golf              the soonest upcoming outing, or the last final one
//   open poll         a poll still taking votes
//   announcement      the newest one
//   champion          last season's winner, from sleeper_leagues
//
// NO NFL NEWS, no scores from other leagues, no headlines from anywhere.
// Everything below is a fact from this league's own tables with a route
// attached, and an item with nothing to say is simply absent.
//
// AND NO MANUFACTURED URGENCY. There is no "BREAKING", no red flashing and
// no countdown on something three months away. The tone is a scoreboard
// ribbon: label, fact, done.
//
// WHERE IT DOES NOT GO
//
// suppressedOn() is the list, and it is short: Broadcast (the stage IS the
// screen), Arena (a live race), and any focused Golf surface - a scorecard or
// a match control screen, where a moving strip above the nav is competing with
// the thing somebody is trying to tap between holes. Admin is included because
// it is a work screen.
//
// MOTION IS OPT-IN BY THE READER'S OWN SETTING
//
// prefers-reduced-motion gets NO marquee at all - not a slower one. It gets a
// static list that advances one item at a time on a timer, which is a
// different thing and an honest one. The CSS animation is the only thing that
// moves, so nothing here runs a rAF loop.
// =====================================================================

import { db } from "./supabase.js";
import { esc } from "./ui.js";
import { suppressedOn } from "./bottomline-routes.js";

export { suppressedOn };

/* ------------------------------- items ------------------------------- */

const DAY = 86400000;

function whenText(value, timeValue) {
  if (!value) return "";
  const d = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
  if (isNaN(d)) return "";
  const days = Math.round((d.setHours(12, 0, 0, 0) - new Date().setHours(12, 0, 0, 0)) / DAY);
  const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
  const label = days === 0 ? "today"
    : days === 1 ? "tomorrow"
    : days > 1 && days <= 6 ? date.toLocaleDateString(undefined, { weekday: "long" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  /* The time only earns its place when the date is close enough for it to
     matter. "Aug 29 at 7:00 AM" three months out is noise. */
  const at = timeValue && days >= 0 && days <= 6 ? ` · ${shortTime(timeValue)}` : "";
  return `${label}${at}`;
}

function shortTime(value) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value));
  if (!m) return "";
  const h = Number(m[1]), min = m[2];
  const ampm = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}${min === "00" ? "" : `:${min}`}${ampm}`;
}

/**
 * Read the league and build the strip's items.
 *
 * Five small reads, in parallel, every one of them allowed to fail: a missing
 * table or a table this database has not migrated yet means one fewer item,
 * never a broken strip. That is why each is unwrapped with `?.error ? [] : …`
 * rather than awaited as a unit.
 *
 * @returns {Promise<Array<{label:string, text:string, route?:string, tone?:string}>>}
 */
export async function bottomlineItems() {
  const today = new Date().toISOString().slice(0, 10);

  const [eventsRes, golfRes, pollsRes, annRes, leagueRes] = await Promise.all([
    db().from("events").select("title, event_date, event_time")
      .gte("event_date", today).order("event_date", { ascending: true }).limit(1)
      .then((r) => r, () => ({ error: true })),
    db().from("golf_outings").select("name, event_date, status")
      .order("event_date", { ascending: false }).limit(6)
      .then((r) => r, () => ({ error: true })),
    /* `active` is the only openness a poll has - there is no closing date in
       the schema, and asking for one 42703s the whole select. */
    db().from("polls").select("question, active").eq("active", true)
      .order("created_at", { ascending: false }).limit(1)
      .then((r) => r, () => ({ error: true })),
    db().from("announcements").select("title, content, created_at")
      .order("created_at", { ascending: false }).limit(1)
      .then((r) => r, () => ({ error: true })),
    db().from("sleeper_leagues").select("season, champion_user_id, status")
      .order("season", { ascending: false }).limit(4)
      .then((r) => r, () => ({ error: true })),
  ]);

  const items = [];

  // ---- next event ----
  const event = (eventsRes.error ? [] : eventsRes.data || [])[0];
  if (event?.title) {
    const when = whenText(event.event_date, event.event_time);
    items.push({ label: "Next up", text: `${event.title}${when ? ` · ${when}` : ""}`,
                 route: "calendar" });
  }

  // ---- golf: the next one, else the last result ----
  const outings = golfRes.error ? [] : (golfRes.data || []);
  const upcoming = outings.filter((o) => o.status !== "final" && o.event_date >= today)
    .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)))[0];
  const lastFinal = outings.filter((o) => o.status === "final")[0];
  if (upcoming) {
    const when = whenText(upcoming.event_date);
    items.push({ label: "Golf", text: `${upcoming.name || "Golf day"}${when ? ` · ${when}` : ""}`,
                 route: "golf" });
  } else if (lastFinal) {
    items.push({ label: "Golf", text: `${lastFinal.name || "Golf day"} · final`, route: "golf" });
  }

  // ---- an open poll ----
  const polls = pollsRes.error ? [] : (pollsRes.data || []);
  const open = polls[0];
  if (open?.question) {
    items.push({ label: "Poll open", text: open.question, route: "polls" });
  }

  // ---- the newest announcement ----
  const ann = (annRes.error ? [] : annRes.data || [])[0];
  if (ann?.title || ann?.content) {
    items.push({ label: "Notice", text: ann.title || ann.content, route: "home" });
  }

  // ---- the reigning champion ----
  const leagues = leagueRes.error ? [] : (leagueRes.data || []);
  const done = leagues.find((l) => l.status === "complete" && l.champion_user_id);
  if (done) {
    items.push({ label: `${done.season} champion`, text: await championName(done.champion_user_id),
                 route: "history" });
  }

  return items.filter((i) => i.text);
}

/* The champion by name, from the Sleeper user row - never from a team string.
   A deleted Sleeper account has no row, and then the item is dropped rather
   than reading "champion: undefined". */
async function championName(userId) {
  const res = await db().from("sleeper_users")
    .select("display_name, team_name").eq("sleeper_user_id", userId).limit(1)
    .then((r) => r, () => ({ error: true }));
  const row = (res.error ? [] : res.data || [])[0];
  return row?.team_name || row?.display_name || "";
}

/* ------------------------------- the strip ------------------------------- */

let host = null;
let rotate = null;
let items = [];

function markup(list, reduced) {
  const cell = (i) => `
    ${i.route ? `<a class="bl-item" href="#/${esc(i.route)}">` : `<span class="bl-item">`}
      <span class="bl-label">${esc(i.label)}</span>
      <span class="bl-text">${esc(i.text)}</span>
    ${i.route ? `</a>` : `</span>`}`;

  if (reduced) {
    /* One item at a time, swapped on a timer. Not a slow marquee - a reader
       who has asked for less motion should get none of it. */
    return `<div class="bl-static">${list.map((i, n) =>
      `<div class="bl-slot ${n === 0 ? "on" : ""}">${cell(i)}</div>`).join("")}</div>`;
  }
  /* The tape is printed TWICE and the animation moves it exactly one copy's
     width, so the loop has no gap and no jump. */
  const tape = list.map(cell).join(`<span class="bl-dot" aria-hidden="true"></span>`);
  return `<div class="bl-tape"><div class="bl-run">${tape}</div><div class="bl-run" aria-hidden="true">${tape}</div></div>`;
}

/** Take the strip down and release everything it owns. */
export function hideBottomline() {
  if (rotate) { clearInterval(rotate); rotate = null; }
  host?.remove();
  host = null;
  document.body.classList.remove("has-bottomline");
}

/**
 * Draw (or redraw) the strip for a route.
 *
 * Cheap to call on every navigation: the items are fetched once per page load
 * and reused, so changing route re-renders from memory.
 */
export function paintBottomline(route, hash = location.hash) {
  if (suppressedOn(route, hash)) { hideBottomline(); return; }
  if (!items.length) { hideBottomline(); return; }

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  if (!host) {
    host = document.createElement("div");
    host.className = "bottomline";
    host.setAttribute("aria-label", "League bottom line");
    /* Not a live region. It repeats the same handful of facts on a loop, and
       announcing them again every cycle would be hostile. */
    document.body.appendChild(host);
  }
  host.classList.toggle("is-static", reduced);
  host.innerHTML = markup(items, reduced);
  document.body.classList.add("has-bottomline");

  /* The tape's duration is proportional to its length, so two items do not
     crawl and eight do not sprint. */
  const run = host.querySelector(".bl-run");
  if (run && !reduced) {
    const seconds = Math.max(18, Math.round(run.scrollWidth / 42));
    host.style.setProperty("--bl-duration", `${seconds}s`);
  }

  if (rotate) { clearInterval(rotate); rotate = null; }
  if (reduced) {
    const slots = [...host.querySelectorAll(".bl-slot")];
    if (slots.length > 1) {
      let at = 0;
      rotate = setInterval(() => {
        slots[at].classList.remove("on");
        at = (at + 1) % slots.length;
        slots[at].classList.add("on");
      }, 6000);
    }
  }
}

/**
 * Start the strip. Called once from app.js after the router is up.
 *
 * The reads happen here, off the critical path - the first paint of the app
 * does not wait for a ticker. A failure means no strip, which is a perfectly
 * good outcome for a decoration.
 */
export async function startBottomline(routeOf) {
  try {
    items = await bottomlineItems();
  } catch {
    items = [];
  }
  if (!items.length) return;
  paintBottomline(routeOf(), location.hash);
}
