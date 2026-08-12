/* =====================================================================
   DFL Golf - captains and the draft board
   ---------------------------------------------------------------------
   ADMIN RUN, ONE DEVICE. The commissioner sets the captains and the order,
   then taps each pick as it is called. Everybody else opens the same event
   page and watches the board fill in, read-only.

   That is a deliberate choice and it is why this file needs no new database
   permissions: a captain has no more rights than any other member, and being
   on the clock is a fact the board works out, not a grant.

   Nothing derived is stored. Whose pick it is, which round the snake has
   reached and whether the draft is over are all computed from pick_number
   and draft_order every draw. See golf_draft_schema.sql.

   Boots itself off the .golf-draft-page placeholder that pages/golf.js puts
   on the event page, the same way golf-scorecard.js does - and tears its
   polling down the moment that placeholder leaves the DOM.
   ===================================================================== */
import { db, isAdmin } from "./supabase.js";
import { loadMembers } from "./members.js";
import { esc, toast } from "./ui.js";
import { memberNames, playerName } from "./golf-people.js";

/* Watchers are a few seconds behind the taps, which is fine for a draft -
   the pick is announced out loud before it is entered. */
const POLL_MS = 4000;

let timer = null, host = null, busy = false;

function currentOutingId() {
  const q = new URLSearchParams(location.hash.split("?")[1] || "");
  return q.get("team") ? null : q.get("id");
}

// ============================== the data ==============================

async function load(outingId) {
  const [outing, teams, parts, members] = await Promise.all([
    db().from("golf_outings").select("*").eq("id", outingId).maybeSingle(),
    /* Ordered by sort_order, NOT draft_order. Sorting on a column added by a
       migration makes this whole query 400 until that migration is run, and
       order() below sorts by draft_order in JS anyway. */
    db().from("golf_teams").select("*").eq("outing_id", outingId).order("sort_order"),
    db().from("golf_participants").select("*").eq("outing_id", outingId).order("sort_order"),
    loadMembers().catch(() => []),
  ]);
  const error = outing.error || teams.error || parts.error;
  if (error) throw error;
  return {
    outing: outing.data,
    teams: teams.data || [],
    parts: parts.data || [],
    byId: new Map((members || []).map((m) => [String(m.id), m])),
    names: memberNames(members),
  };
}

/* A captain is always a league member, so captains are still looked up by
   member id. */
const nameOf = (d, memberId) => d.byId.get(String(memberId))?.display_name || "Unknown";

/* A PLAYER may be a guest with no member id at all, so anybody drafted is
   named from their participant row instead. Passing a guest through nameOf
   would draft "Unknown". */
const partName = (d, part) => playerName(part, d.names);

/**
 * The snake.
 *
 * Round one runs in draft_order; every round after that reverses, so the
 * captain who picked last picks first next time round. Recomputed from the
 * picks themselves each draw, so an undo rewinds the clock for free.
 */
function order(d) {
  return [...d.teams].sort((a, b) =>
    (a.draft_order - b.draft_order) || (a.sort_order - b.sort_order) || (a.id - b.id));
}

function picks(d) {
  return d.parts
    .filter((p) => p.pick_number != null)
    .sort((a, b) => a.pick_number - b.pick_number);
}

const pool = (d) => d.parts.filter((p) => p.team_id == null);

/** The team on the clock, or null when there is nothing left to pick. */
function onTheClock(d) {
  const seats = order(d);
  if (!seats.length || !pool(d).length) return null;
  const made = picks(d).length;
  const round = Math.floor(made / seats.length);
  const seat = made % seats.length;
  const lane = round % 2 === 0 ? seats : [...seats].reverse();
  return lane[seat];
}

const captainsSet = (d) => d.teams.length > 0 && d.teams.every((t) => t.captain_member_id != null);

// ============================== the draw ==============================

async function draw() {
  const id = currentOutingId();
  if (!host || !id) return;

  const admin = isAdmin();

  /* A member must never be shown a migration. Anything wrong here - the SQL
     not run yet, a query that failed - is silence for the league and a note
     for the commissioner only. */
  const quiet = (adminNote) => { host.innerHTML = admin ? adminNote : ""; };

  let d;
  try {
    d = await load(id);
  } catch (err) {
    quiet(`<div class="card"><div class="card-body muted">Could not load the draft.
      <span class="tiny">${esc(err.message || String(err))}</span></div></div>`);
    return;
  }
  if (!host || !d.outing) return;

  // Nothing to draft and nobody to draft with: stay out of the way entirely.
  if (!d.teams.length || d.parts.length < 2) { host.innerHTML = ""; return; }

  /* The columns arrive with golf_draft_schema.sql. Until then the feature
     simply does not exist as far as the page is concerned. */
  if (!Object.prototype.hasOwnProperty.call(d.teams[0], "captain_member_id")) {
    quiet(`<div class="card"><div class="card-body muted">Captains and the draft board need one migration:
      run <strong>golf_draft_schema.sql</strong> in the Supabase SQL editor.</div></div>`);
    return;
  }

  /* This outing is generating its teams instead. The board would be a second,
     contradictory answer to "who is on whose team", so it stays away entirely
     - for the commissioner too, who has the generator on screen already. */
  if (d.outing.team_mode === "random") { host.innerHTML = ""; return; }
  host.innerHTML = captainsSet(d) ? board(d, admin) : setup(d, admin);
}

/* Redrawing on a poll must not yank the page around under a thumb, and must
   not fight a write that is in flight. */
async function refresh() {
  if (busy) return;
  const y = window.scrollY;
  await draw();
  window.scrollTo(0, y);
}

// ------------------------------ set-up --------------------------------

/*
  Before there is a draft there are captains and an order. Both are the
  commissioner's to set - a member watching this screen sees who has been
  named so far and nothing to press.
*/
function setup(d, admin) {
  const taken = new Set(d.teams.map((t) => String(t.captain_member_id)).filter((v) => v !== "null"));
  const seats = order(d);

  const row = (t, i) => {
    const cap = t.captain_member_id;
    /* Guests are filtered out here and only here: a captain is stored as
       golf_teams.captain_member_id, a members.id, so somebody with no member
       row cannot be one. They can be drafted like anybody else. */
    const choices = d.parts
      .filter((p) => p.member_id != null)
      .filter((p) => !taken.has(String(p.member_id)) || String(p.member_id) === String(cap))
      .map((p) => `<option value="${p.member_id}" ${String(p.member_id) === String(cap) ? "selected" : ""}>
                     ${esc(partName(d, p))}</option>`).join("");
    return `
      <div class="gd-seat" style="--racer:${esc(t.color || "var(--accent)")}">
        <span class="gd-pos">${i + 1}</span>
        <span class="gd-team">${esc(t.name || "Team")}</span>
        ${admin ? `
          <select class="gd-cap" data-captain="${t.id}" aria-label="Captain of ${esc(t.name || "team")}">
            <option value="">— pick a captain —</option>${choices}
          </select>
          <span class="gd-move">
            <button type="button" class="btn ghost small" data-bump="${t.id}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
            <button type="button" class="btn ghost small" data-bump="${t.id}" data-dir="1" ${i === seats.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
          </span>`
        : `<span class="gd-capname">${cap ? esc(nameOf(d, cap)) : "no captain yet"}</span>`}
      </div>`;
  };

  const named = d.teams.filter((t) => t.captain_member_id != null).length;

  return `
    <section class="card gd-card">
      <div class="card-title-row">
        <div>
          <div class="card-title">Captains and draft order</div>
          <p class="muted tiny">${admin
            ? "Name a captain for every team and put them in picking order. The board opens as soon as the last captain is set."
            : `${named} of ${d.teams.length} captains named. The board opens when they all are.`}</p>
        </div>
        ${admin ? `<span class="admin-badge">Admin only</span>` : ""}
      </div>
      <div class="gd-seats">${seats.map(row).join("")}</div>
      ${admin ? `<p class="muted tiny">Order one is the first pick of round one. The draft snakes, so they pick last in round two.</p>` : ""}
    </section>`;
}

// ------------------------------ the board ------------------------------

function board(d, admin) {
  const clock = onTheClock(d);
  const made = picks(d);
  const left = pool(d);
  const seats = order(d);
  const round = seats.length ? Math.floor(made.length / seats.length) + 1 : 1;

  const roster = (t) => {
    const mine = d.parts.filter((p) => String(p.team_id) === String(t.id));
    const cap = mine.find((p) => String(p.member_id) === String(t.captain_member_id));
    const drafted = mine.filter((p) => p !== cap).sort((a, b) => (a.pick_number ?? 0) - (b.pick_number ?? 0));
    return `
      <div class="gd-roster ${clock && String(clock.id) === String(t.id) ? "is-up" : ""}"
           style="--racer:${esc(t.color || "var(--accent)")}">
        <div class="gd-roster-head">
          <span class="gd-team">${esc(t.name || "Team")}</span>
          <span class="gd-count">${mine.length}</span>
        </div>
        <div class="gd-picks">
          <span class="gd-pick is-cap">${esc(nameOf(d, t.captain_member_id))}<small>C</small></span>
          ${drafted.map((p) => `<span class="gd-pick">${esc(partName(d, p))}<small>${p.pick_number}</small></span>`).join("")}
        </div>
      </div>`;
  };

  const done = !clock;

  return `
    <section class="card gd-card">
      <div class="card-title-row">
        <div>
          <div class="card-title">The draft</div>
          <p class="muted tiny">${done
            ? "Every player is on a team."
            : `Round ${round} · ${left.length} player${left.length === 1 ? "" : "s"} left`}</p>
        </div>
        <span class="admin-badge">${done ? "Complete" : "Live"}</span>
      </div>

      ${done ? "" : `
        <div class="gd-clock" style="--racer:${esc(clock.color || "var(--accent)")}">
          <span class="gd-clock-lbl">On the clock</span>
          <span class="gd-clock-team">${esc(clock.name || "Team")}</span>
          <span class="gd-clock-cap">${esc(nameOf(d, clock.captain_member_id))} · pick ${made.length + 1}</span>
        </div>

        ${admin ? `
          <div class="gd-pool">
            ${left.map((p) => `
              <button type="button" class="gd-take" data-take="${p.id}">
                ${esc(partName(d, p))}
              </button>`).join("")}
          </div>
          <p class="muted tiny">Tap the player ${esc(nameOf(d, clock.captain_member_id))} calls.</p>`
        : `<div class="gd-pool is-watching">
            ${left.map((p) => `<span class="gd-take is-flat">${esc(partName(d, p))}</span>`).join("")}
          </div>`}
      `}

      <div class="gd-rosters">${seats.map(roster).join("")}</div>

      ${admin && made.length ? `
        <div class="arena-admin">
          <button type="button" class="btn ghost small" id="gd-undo">Undo pick ${made.length}
            (${esc(partName(d, made[made.length - 1]))})</button>
        </div>` : ""}
    </section>`;
}

// ============================== the writes =============================

/* Every write here is admin-only at the database, so these buttons only ever
   render for the commissioner - and a refused one still surfaces rather than
   reporting a cheerful success, same as the team editor. */
async function mustWrite(query, what) {
  const { data, error } = await query.select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error(`The database refused to ${what}. Sign in as admin and try again.`);
  return data;
}

/*
  Naming a captain also puts them on their own team, with pick_number left
  NULL: they were not drafted, so they must not consume a pick or the snake
  loses count of whose turn it is.
*/
async function setCaptain(d, teamId, memberId) {
  const team = d.teams.find((t) => String(t.id) === String(teamId));
  const outgoing = team?.captain_member_id;

  await mustWrite(db().from("golf_teams").update({ captain_member_id: memberId || null }).eq("id", teamId),
                  "set that captain");

  // The previous captain goes back in the pool rather than silently staying
  // on a team they no longer lead.
  if (outgoing && String(outgoing) !== String(memberId)) {
    const was = d.parts.find((p) => String(p.member_id) === String(outgoing));
    if (was) await db().from("golf_participants")
      .update({ team_id: null, pick_number: null, picked_at: null }).eq("id", was.id);
  }
  if (memberId) {
    const now = d.parts.find((p) => String(p.member_id) === String(memberId));
    if (now) await db().from("golf_participants")
      .update({ team_id: Number(teamId), pick_number: null, picked_at: null }).eq("id", now.id);
  }
}

/* Order is a swap with the neighbour, not a renumber of the whole list: two
   writes instead of N, and it cannot leave gaps. */
async function bump(d, teamId, dir) {
  const seats = order(d);
  const i = seats.findIndex((t) => String(t.id) === String(teamId));
  const j = i + dir;
  if (i < 0 || j < 0 || j >= seats.length) return;
  const a = seats[i], b = seats[j];
  await mustWrite(db().from("golf_teams").update({ draft_order: j }).eq("id", a.id), "reorder the teams");
  await db().from("golf_teams").update({ draft_order: i }).eq("id", b.id);
}

async function take(d, participantId) {
  const clock = onTheClock(d);
  if (!clock) return;
  const next = picks(d).length + 1;
  await mustWrite(
    db().from("golf_participants")
      .update({ team_id: clock.id, pick_number: next, picked_at: new Date().toISOString() })
      .eq("id", participantId)
      .is("team_id", null),                 // two taps on one name cannot double-pick
    "record that pick");
}

async function undo(d) {
  const made = picks(d);
  const last = made[made.length - 1];
  if (!last) return;
  await mustWrite(db().from("golf_participants")
    .update({ team_id: null, pick_number: null, picked_at: null }).eq("id", last.id),
    "undo that pick");
}

// ============================== the wiring =============================

function wire() {
  host.addEventListener("change", async (e) => {
    const cap = e.target.closest("[data-captain]");
    if (!cap) return;
    await run(async (d) => setCaptain(d, cap.dataset.captain, cap.value ? Number(cap.value) : null));
  });

  host.addEventListener("click", async (e) => {
    const move = e.target.closest("[data-bump]");
    const take_ = e.target.closest("[data-take]");
    const undo_ = e.target.closest("#gd-undo");
    if (move) return run(async (d) => bump(d, move.dataset.bump, Number(move.dataset.dir)));
    if (take_) { take_.disabled = true; return run(async (d) => take(d, take_.dataset.take)); }
    if (undo_) { undo_.disabled = true; return run(async (d) => undo(d)); }
  });
}

/*
  Read the board's state fresh, write, redraw. Re-reading first is what keeps
  the commissioner honest against their own stale screen: if a poll has not
  landed yet, the pick still goes to whoever is genuinely on the clock.
*/
async function run(action) {
  const id = currentOutingId();
  if (!id || busy) return;
  busy = true;
  try {
    const d = await load(id);
    await action(d);
  } catch (err) {
    toast(err.message || "That did not save", true);
  } finally {
    busy = false;
    await draw();
  }
}

// ============================== the boot ===============================

function stop() {
  clearInterval(timer);
  timer = null;
  host = null;
}

function boot() {
  const find = () => {
    const el = document.querySelector("#golf-outing .golf-draft-page");

    // The placeholder is gone: the page moved on, so stop polling it.
    if (!el) { if (host) stop(); return; }
    if (el === host) return;

    host = el;
    wire();
    draw();
    clearInterval(timer);
    timer = setInterval(() => {
      if (!document.body.contains(host)) return stop();
      refresh();
    }, POLL_MS);
  };

  new MutationObserver(find).observe(document.body, { childList: true, subtree: true });
  find();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
