// =====================================================================
// draft-order.js - where every team picks from, this year
// ---------------------------------------------------------------------
// The app already knew what round a player went in. It did not know the
// question everybody actually asks in August: WHERE DO I PICK.
//
// Those are different facts living in different places. A pick's draft_slot
// only exists once the pick has been made, so a draft still in pre_draft
// has nothing to read. The order lives on the draft OBJECT -
// /draft/<id> -> draft_order ({sleeper_user_id: slot}) and slot_to_roster_id
// - which is why js/sleeper.js gained draft() alongside draftPicks().
//
// THREE STATES, ALL OF THEM TOLD HONESTLY
//   order set        the board, with your slot called out
//   order not set    the commissioner has not shuffled it yet. Sleeper
//                    returns draft_order: null, and null is the truth here,
//                    not a sync failure. The card says so.
//   no draft at all  no card. Nothing is invented.
//
// THIS FILE IS PURE, and draft-order.spec.js covers all of it. The database
// read lives next door in draft-order-data.js for the same reason
// bottomline-routes.js exists: supabase.js pulls the Supabase client off a
// CDN over https, which the test runner's ESM loader cannot follow, so a
// module a spec imports must not reach it.
// =====================================================================

import { esc } from "./ui.js";

const DAY_MS = 24 * 60 * 60 * 1000;
/* How long a finished draft stays on the front page. The board is worth
   looking at the week after it happens; a month later it is history, and
   history has its own pages. */
const COMPLETE_GRACE_MS = 7 * DAY_MS;

export function ordinal(n) {
  /* Number(null) is 0, which would print "0th" for an absent slot. Nothing
     is an empty string here, not a rank. */
  if (n === null || n === undefined || n === "") return "";
  const num = Number(n);
  if (!Number.isFinite(num)) return "";
  const r = num % 100;
  if (r >= 11 && r <= 13) return `${num}th`;
  return num + (["th", "st", "nd", "rd"][num % 10] || "th");
}

// ---------------------------------------------------------------------
// Reading the order out of Sleeper
// ---------------------------------------------------------------------

/**
 * Slots from the draft object's own order.
 * `draft_order` is {sleeper_user_id: slot} and `slot_to_roster_id` is
 * {slot: roster_id}. Either can be null on a draft nobody has ordered.
 * @param {object} draft  a Sleeper draft object
 * @returns {{draft_slot:number, roster_id:number|null, sleeper_user_id:string|null}[]}
 */
export function slotsFromOrder(draft) {
  const order = draft?.draft_order || null;
  const toRoster = draft?.slot_to_roster_id || null;
  if (!order && !toRoster) return [];

  const bySlot = new Map();
  for (const [slot, rosterId] of Object.entries(toRoster || {})) {
    const n = Number(slot);
    if (!Number.isFinite(n)) continue;
    bySlot.set(n, { draft_slot: n, roster_id: Number(rosterId) || null, sleeper_user_id: null });
  }
  for (const [userId, slot] of Object.entries(order || {})) {
    const n = Number(slot);
    if (!Number.isFinite(n)) continue;
    const row = bySlot.get(n) || { draft_slot: n, roster_id: null, sleeper_user_id: null };
    row.sleeper_user_id = String(userId);
    bySlot.set(n, row);
  }
  return [...bySlot.values()].sort((a, b) => a.draft_slot - b.draft_slot);
}

/**
 * Slots recovered from a draft that has already happened.
 *
 * Round one IS the order: the round-one pick at draft_slot 1 belongs to the
 * team picking first, and so on. This is what fills in 2020-2025, whose
 * drafts finished long before the app stored an order, and it costs no extra
 * request because sync.js already has the picks in hand.
 * @param {object[]} picks  rows from /draft/<id>/picks
 */
export function slotsFromPicks(picks) {
  const first = (picks || []).filter((p) => Number(p?.round) === 1 && p?.draft_slot != null);
  const bySlot = new Map();
  for (const p of first) {
    const n = Number(p.draft_slot);
    if (!Number.isFinite(n) || bySlot.has(n)) continue;
    bySlot.set(n, {
      draft_slot: n,
      roster_id: p.roster_id ?? null,
      sleeper_user_id: p.picked_by || null,
    });
  }
  return [...bySlot.values()].sort((a, b) => a.draft_slot - b.draft_slot);
}

// ---------------------------------------------------------------------
// The card's model
// ---------------------------------------------------------------------

const STATUS_TEXT = {
  pre_draft: "Not started",
  drafting: "On the clock",
  complete: "Complete",
  paused: "Paused",
};

const TYPE_TEXT = { snake: "Snake", linear: "Linear", auction: "Auction" };

/** Is this draft still worth the front page? */
export function stillCurrent(draft, now = Date.now()) {
  if (!draft) return false;
  if (draft.status !== "complete") return true;
  const started = Number(draft.start_time_ms);
  if (!Number.isFinite(started) || started <= 0) return false;
  return now - started < COMPLETE_GRACE_MS;
}

/**
 * Fold the two tables and the member list into what the card draws.
 * @returns {null|object} null when there is nothing worth showing.
 */
export function draftView({ draft = null, slots = [], members = [], meSleeperId = null, now = Date.now() } = {}) {
  if (!stillCurrent(draft, now)) return null;

  const nameOf = (uid) => {
    if (!uid) return "";
    const m = members.find((x) => String(x.sleeper_user_id) === String(uid));
    return m?.team_name || m?.display_name || "";
  };

  const board = [...slots]
    .filter((s) => Number.isFinite(Number(s?.draft_slot)))
    .sort((a, b) => Number(a.draft_slot) - Number(b.draft_slot))
    .map((s) => ({
      slot: Number(s.draft_slot),
      /* An unnamed slot is a real thing: a roster whose Sleeper account was
         deleted, or an order set before the app knew the member. It gets a
         dash rather than being dropped, because dropping it would silently
         renumber the board. */
      name: nameOf(s.sleeper_user_id) || "—",
      mine: !!meSleeperId && String(s.sleeper_user_id) === String(meSleeperId),
    }));

  const mine = board.find((r) => r.mine) || null;
  const startMs = Number(draft.start_time_ms);

  return {
    season: Number(draft.season) || null,
    status: draft.status || "",
    statusText: STATUS_TEXT[draft.status] || "",
    typeText: TYPE_TEXT[draft.draft_type] || "",
    rounds: Number(draft.rounds) || null,
    startAt: Number.isFinite(startMs) && startMs > 0 ? new Date(startMs) : null,
    orderKnown: board.length > 0,
    teams: board.length,
    board,
    mySlot: mine ? mine.slot : null,
  };
}

/** "Snake - 15 rounds - Thu, Aug 27, 7:00 PM": only the parts we know. */
export function metaLine(view) {
  if (!view) return "";
  const bits = [];
  if (view.typeText) bits.push(view.typeText);
  if (view.rounds) bits.push(`${view.rounds} rounds`);
  if (view.startAt) {
    bits.push(view.startAt.toLocaleString([], {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    }));
  } else if (view.statusText) {
    bits.push(view.statusText);
  }
  return bits.join(" · ");
}

// ---------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------

export function draftCard(view) {
  if (!view) return "";

  const season = view.season ? ` <span class="do-season">${esc(String(view.season))}</span>` : "";
  const head = `<h2 class="section-title">The Draft${season}<a class="section-link" href="#/keepers">Keepers &rarr;</a></h2>`;
  const meta = metaLine(view);

  if (!view.orderKnown) {
    return `<section class="block draft-order">${head}
      <div class="card"><div class="card-body">
        <div class="state"><span class="state-title">Order not set</span>
        <span>Sleeper has the draft${meta ? ` &mdash; ${esc(meta)}` : ""}, but the order has not been set yet.</span></div>
      </div></div></section>`;
  }

  const hero = view.mySlot
    ? `<div class="do-hero"><b>${esc(ordinal(view.mySlot))}</b><small>your pick, of ${view.teams}</small></div>`
    : `<div class="do-hero"><b>${view.teams}</b><small>teams on the board</small></div>`;

  const rows = view.board.map((r) => `<li class="do-row${r.mine ? " is-me" : ""}">
    <span class="do-slot">${r.slot}</span>
    <span class="do-team">${esc(r.name)}</span>
  </li>`).join("");

  return `<section class="block draft-order">${head}
    <div class="card"><div class="card-body">
      ${hero}
      ${meta ? `<p class="do-meta">${esc(meta)}</p>` : ""}
      <ol class="do-board">${rows}</ol>
    </div></div></section>`;
}
