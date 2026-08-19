// =====================================================================
// activity.js - what changed in the league, on the front page.
// ---------------------------------------------------------------------
// The database records the writes (activity_log_schema.sql, one trigger per
// watched table). This file only turns rows into sentences.
//
// IT SHOWS WHO AND WHAT, NEVER THE VALUE. The log deliberately stores no column
// values, so there is nothing here to leak - "Grant changed a keeper" rather
// than "Grant changed his keeper to Bijan Robinson at R1". A front-page feed
// that quoted every edit would turn a keeper decision into an announcement.
// =====================================================================

import { esc } from "./ui.js";

/*
  NO DATABASE IMPORT IN THIS FILE, ON PURPOSE.

  supabase.js pulls its client from a CDN over https, which the ESM test loader
  refuses - so any module that imports it, however indirectly, cannot be spec'd.
  That is why keeper-rules.js and keeper-advisor.js are pure and the pages are
  not, and it is worth keeping to: everything below is a function of its
  arguments and covered by activity.spec.js.

  The one read this feature needs is a single RPC, and it lives with the other
  reads on the page. `null` from that read means "migration absent" and
  activityCard() draws nothing at all for it.
*/

/** Name of the RPC the page calls, kept here so the two cannot drift. */
export const ACTIVITY_RPC = "activity_feed";
export const ACTIVITY_MISSING = /activity_feed|activity_log|schema cache|does not exist/i;

/*
  RELATIVE TIME, AND ONLY AS COARSE AS IT IS HONEST.

  "3 minutes ago" is worth saying. "2 months ago" is worth saying. "9 weeks ago"
  is a unit nobody thinks in, so it becomes a date and stops pretending.
*/
export function whenText(iso, now = Date.now()) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const secs = Math.max(0, Math.round((now - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  return new Date(then).toLocaleDateString([], { month: "short", day: "numeric" });
}

const VERB = { insert: "added", update: "changed", delete: "removed" };

/**
 * One line of the feed.
 *
 * The label comes from the trigger, so a table this file has never heard of
 * still reads as a sentence instead of printing a table name at somebody.
 */
export function activityLine(row, { now = Date.now() } = {}) {
  const who = row.display_name || "Somebody";
  const verb = VERB[row.action] || "touched";
  const thing = row.label || String(row.entity || "something").replace(/_/g, " ");
  const many = Number(row.row_count) || 1;
  /* Plural by count, because a batch is one event to a reader: "changed 12
     keepers", not twelve identical lines. */
  const what = many > 1 ? `${many} ${thing}${thing.endsWith("s") ? "" : "s"}` : `a ${thing}`;
  return {
    who,
    text: `${verb} ${what}`,
    when: whenText(row.last_at, now),
    commissioner: row.as_commissioner === true,
    memberId: row.member_id || null,
  };
}

/**
 * The Home section.
 *
 * Returns "" for a missing migration so the front page is unchanged on a league
 * that has not run it, and a plain empty state when the log exists but is quiet.
 */
export function activityCard(rows) {
  if (rows == null) return "";

  const lines = rows.map((r) => activityLine(r));
  return `<section class="block">
    <h2 class="section-title">Activity</h2>
    <div class="card"><div class="card-body">
      ${lines.length ? `<ul class="act-list">${lines.map((l) => `
        <li class="act-row">
          <span class="act-who">${l.memberId
            ? `<a class="plainlink" href="#/profile?id=${esc(l.memberId)}">${esc(l.who)}</a>`
            : esc(l.who)}${l.commissioner ? `<span class="act-badge" title="Acting as commissioner">C</span>` : ""}</span>
          <span class="act-what">${esc(l.text)}</span>
          <span class="act-when">${esc(l.when)}</span>
        </li>`).join("")}</ul>`
        : `<span class="muted">Nothing yet.</span>`}
    </div></div>
  </section>`;
}
