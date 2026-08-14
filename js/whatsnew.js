/* =====================================================================
   whatsnew.js - "here is what changed since you last looked"
   ---------------------------------------------------------------------
   DERIVED, NEVER RECORDED. There is no activity table, no event log and
   no per-item seen-set. This reads the timestamps the app already writes
   for its own reasons - created_at on the content tables, last_synced_at
   on the Sleeper config - and compares them against ONE watermark in
   localStorage.

   WHY THAT MATTERS. An event log would need a row written on every edit
   from every screen, a migration, and a policy - and it would drift the
   first time something was changed by a path that forgot to log. Reading
   created_at cannot drift, because it is the same column the content
   itself is ordered by. If a row exists, its timestamp is true.

   WHAT IT COSTS: this can only report things that HAVE a timestamp, and
   it can only say "3 new announcements", not "Dave edited the rules".
   That is the honest trade and it is why the strip says what it says.

   THE WATERMARK IS ONE VALUE, NOT A SET.

     dfl.seenAt        the last time this device dismissed the strip
     dfl.seenVersion   the app version it was on when it did

   A set of seen ids would grow forever, would need pruning, and would
   still be wrong on a second device. A single timestamp is self-pruning:
   everything older than it is, by definition, seen.

   THE 14-DAY CEILING. Somebody returning after three months does not
   want a changelog of their absence, they want to know what is current.
   The window never opens wider than a fortnight.

   FIRST RUN SHOWS NOTHING. A new device has no watermark, and treating
   that as "everything is new" would greet a first-time user with a list
   of things they have never seen the old version of. It sets the mark
   and stays quiet.
   ===================================================================== */

import { APP_VERSION } from "./config.js";
import { relDate, esc } from "./ui.js";

const DAY = 86400000;
const CEILING = 14 * DAY;

const KEY_AT  = "dfl.seenAt";
const KEY_VER = "dfl.seenVersion";

function read(key) {
  try { return localStorage.getItem(key) || ""; } catch { return ""; }
}
function write(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode; strip just reappears */ }
}

/** Mark everything up to now as seen. Called when the strip is dismissed. */
export function markSeen(now = new Date()) {
  write(KEY_AT, now.toISOString());
  write(KEY_VER, APP_VERSION);
}

/**
 * The window to report on, or null when there is nothing to report against.
 *
 * Returns { since, firstRun }. On a first run it sets the watermark as a
 * side effect and reports firstRun, so the caller shows nothing.
 */
export function window_(now = new Date()) {
  const raw = read(KEY_AT);
  if (!raw) { markSeen(now); return { since: null, firstRun: true }; }
  const seen = new Date(raw).getTime();
  if (Number.isNaN(seen)) { markSeen(now); return { since: null, firstRun: true }; }
  return { since: new Date(Math.max(seen, now.getTime() - CEILING)), firstRun: false };
}

const after = (ts, since) => {
  if (!ts) return false;
  const t = new Date(ts).getTime();
  return !Number.isNaN(t) && t > since.getTime();
};

/*
  KINDS COLLAPSE. Three announcements are one line saying "3 new
  announcements", not three lines. The strip is a signpost - it exists to
  get you to the page where the actual things are - so listing them here
  would be the page, twice.
*/
function kind(id, count, one, many, href) {
  return { id, count, href, label: count === 1 ? one : many.replace("{n}", count) };
}

/**
 * What changed.
 *
 * @param {object} data  the rows home.js already has
 * @param {Date}   since the watermark
 * @returns {Array} zero or more collapsed lines
 */
export function changesSince(data, since) {
  const out = [];
  const { announcements = [], events = [], polls = [], syncedAt = null } = data || {};

  const news = announcements.filter((r) => after(r.created_at, since)).length;
  if (news) out.push(kind("news", news, "A new announcement", "{n} new announcements", "#/calendar"));

  const ev = events.filter((r) => after(r.created_at, since)).length;
  if (ev) out.push(kind("events", ev, "A new event on the calendar", "{n} new events on the calendar", "#/calendar"));

  const pl = polls.filter((r) => after(r.created_at, since)).length;
  if (pl) out.push(kind("polls", pl, "A new poll to vote on", "{n} new polls to vote on", "#/polls"));

  /* A sync is not content, but it IS the answer to "why did the standings
     change" - and it is the only line here that can be a single event
     rather than a count. */
  if (after(syncedAt, since)) {
    out.push({ id: "sync", count: 1, href: "#/history", label: "Fantasy results were updated" });
  }

  /*
    THE APP ITSELF. Compared against the version this device last saw,
    not against a timestamp, because "the app updated" is a fact about the
    build and not about the clock. It is last in the list on purpose: it
    matters least to somebody opening the league's front page.
  */
  const seenVer = read(KEY_VER);
  if (seenVer && seenVer !== APP_VERSION) {
    out.push({ id: "app", count: 1, href: null, label: `DFL HQ updated to v${APP_VERSION}` });
  }

  return out;
}

/** "since Tuesday" / "since 3 days ago" - whatever relDate already says. */
export function sinceLabel(since) {
  try { return relDate(since.toISOString().slice(0, 10)); } catch { return "recently"; }
}

// ----------------------------------------------------------------- markup

/**
 * The strip. Returns "" when there is nothing to say, which is most days -
 * and a strip that appears every single visit is one nobody reads.
 *
 * It is NOT aria-live. This is present when the page draws rather than
 * something that arrives while you are reading, so announcing it would
 * interrupt for no reason. It is a <section> with a heading instead, which
 * puts it in the landmark list where a screen reader user can find it on
 * purpose.
 */
export function whatsNewStrip(changes, since) {
  if (!changes?.length) return "";
  return `
    <section class="wn" data-wn aria-labelledby="wn-title">
      <div class="wn-head">
        <svg class="ico-sm" aria-hidden="true"><use href="#i-moment"></use></svg>
        <strong id="wn-title" class="wn-title">New since ${esc(sinceLabel(since))}</strong>
        <button type="button" class="wn-x" data-wn-dismiss aria-label="Dismiss what's new">
          <svg class="ico-sm" aria-hidden="true"><use href="#i-close"></use></svg>
        </button>
      </div>
      <ul class="wn-list">
        ${changes.map((c) => `<li>${c.href
          ? `<a href="${esc(c.href)}">${esc(c.label)}</a>`
          : `<span>${esc(c.label)}</span>`}</li>`).join("")}
      </ul>
    </section>`;
}

/**
 * Wire the dismiss button.
 *
 * Dismissing sets the watermark to NOW, not to the newest item shown -
 * otherwise something posted between the page loading and the button being
 * pressed would be marked seen without ever having been on screen.
 */
export function wireWhatsNew(root) {
  const strip = root?.querySelector("[data-wn]");
  if (!strip) return;
  strip.querySelector("[data-wn-dismiss]")?.addEventListener("click", () => {
    markSeen();
    strip.remove();
  });
}
