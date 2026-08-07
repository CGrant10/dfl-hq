// =====================================================================
// DFL Broadcast - the OBS Browser Source view.
//
//   #/broadcast?id=12
//
// Point OBS at that URL at 1920x1080 and it fills the frame. There is no
// Twitch integration here and there should not be: OBS does the streaming,
// this just has to look like a broadcast and never blink.
//
// It is a VIEWER. It starts nothing and saves nothing - the commissioner
// drives from the Arena page on their phone. All this does is read one row
// and draw the consequences, which is why it can be left open on a scene
// for an hour without touching the database.
//
// The sync is free: an Arena race is a deterministic simulation, so given
// the seed and the start time this page computes the same race the phone is
// computing, frame for frame, with no position data crossing the wire.
// See the comment at the top of arena_broadcast_schema.sql.
// =====================================================================

import { db } from "../supabase.js";
import { esc, errorBox } from "../ui.js";
import { loadMembers } from "../members.js";
import { spriteMarkup, themeLabel } from "../arena/sprites.js";
import { simulate, ticksFor, TICK_MS } from "../arena/race.js";

const LANE_COLORS = [
  "#2fbf5f", "#4aa3ff", "#f0a742", "#e0574a", "#b07cf0", "#3ecfcf",
  "#f2e05a", "#ff7fb0", "#8fd14f", "#ff9a4a", "#7f8cff", "#d6b254",
];

// Everything this view owns, so teardown is one call. Leaving a stray rAF
// loop or a live channel behind would keep drawing over the next scene.
let live = null;

export async function render(view) {
  teardown();

  const id = new URLSearchParams(location.hash.split("?")[1] || "").get("id");
  if (!id) {
    view.innerHTML = `<h1>DFL Broadcast</h1>
      <div class="card"><div class="card-body">
        Open this from an Arena event's <strong>Broadcast</strong> button, or add
        an event id to the address: <code>#/broadcast?id=12</code>
      </div></div>`;
    return;
  }

  const [eventRes, partsRes, members] = await Promise.all([
    db().from("arena_events").select("*").eq("id", id).maybeSingle(),
    db().from("arena_participants").select("*").eq("event_id", id).order("sort_order"),
    loadMembers().catch(() => []),
  ]);

  if (eventRes.error || !eventRes.data) {
    view.innerHTML = errorBox(eventRes.error || new Error("Event not found")) +
      `<div class="card"><div class="card-body muted">If the broadcast columns are
       missing, run <strong>arena_broadcast_schema.sql</strong>.</div></div>`;
    return;
  }

  const byId  = new Map(members.map((m) => [String(m.id), m]));
  const parts = partsRes.data || [];

  const racers = parts.map((p, i) => ({
    id: p.member_id,
    name: byId.get(String(p.member_id))?.display_name || "Unknown",
    sprite: p.sprite,
    color: p.color || LANE_COLORS[i % LANE_COLORS.length],
    number: p.number ?? i + 1,
  }));

  document.body.classList.add("broadcasting");
  paint(view, eventRes.data, racers);
  watch(view, id, racers);
}

/** Called by the router when leaving the page. */
export function leave() {
  teardown();
  document.body.classList.remove("broadcasting");
}

function teardown() {
  if (!live) return;
  cancelAnimationFrame(live.raf);
  clearInterval(live.poll);
  live.channel?.unsubscribe?.();
  live = null;
}

// ------------------------------- the stage ----------------------------

function paint(view, event, racers) {
  view.innerHTML = `
    <div class="bc-stage" id="bc-stage">
      <header class="bc-head">
        <div class="bc-brand">
          <span class="bc-brand-mark">DFL <span>HQ</span></span>
          <span class="bc-brand-sub">Arena</span>
        </div>
        <div class="bc-title">
          <h1 class="bc-event">${esc(event.name)}</h1>
          <p class="bc-sub">${esc(event.description || themeLabel(event.theme) + " race")}</p>
        </div>
        <div class="bc-clock" id="bc-clock">0.0</div>
      </header>

      <div class="bc-body">
        <div class="bc-track" id="bc-track">
          <div class="bc-finish"></div>
          ${racers.map((r, i) => `
            <div class="bc-lane">
              <span class="bc-lane-name" style="--racer:${esc(r.color)}">
                <b>${r.number}</b>${esc(r.name)}
              </span>
              <div class="bc-runner" id="bc-runner-${i}" style="--racer:${esc(r.color)}">
                ${spriteMarkup(event.theme, r.sprite, r.color)}
              </div>
            </div>`).join("")}
        </div>

        <aside class="bc-board" id="bc-board">
          <div class="bc-board-head">Standings</div>
          <ol class="bc-board-list" id="bc-board-list">
            ${racers.map((r) => `
              <li><span class="bc-pos"></span><span class="bc-who">${esc(r.name)}</span></li>`).join("")}
          </ol>
        </aside>
      </div>

      <div class="bc-overlay hidden" id="bc-overlay">
        <div class="bc-count" id="bc-count">3</div>
      </div>

      <div class="bc-winner hidden" id="bc-winner">
        <div class="bc-winner-inner">
          <span class="bc-winner-kicker">Winner</span>
          <span class="bc-winner-name" id="bc-winner-name"></span>
          <span class="bc-winner-event">${esc(event.name)}</span>
        </div>
      </div>

      <footer class="bc-foot">
        <span class="bc-foot-left">${esc(themeLabel(event.theme))} · ${racers.length} racers</span>
        <span class="bc-foot-right" id="bc-status">Standing by</span>
      </footer>
    </div>
  `;
}

// ------------------------------ the loop ------------------------------

/**
 * Subscribe to the event row, then draw whatever it says.
 *
 * The simulation is rebuilt only when the seed or the length changes, not on
 * every state change - pausing must not re-roll the race.
 */
function watch(view, id, racers) {
  live = { raf: 0, poll: 0, channel: null, sim: null, simKey: "", state: null };

  const els = {
    runners: racers.map((_, i) => view.querySelector(`#bc-runner-${i}`)),
    clock:   view.querySelector("#bc-clock"),
    status:  view.querySelector("#bc-status"),
    board:   view.querySelector("#bc-board"),
    body:    view.querySelector(".bc-body"),
    list:    view.querySelector("#bc-board-list"),
    overlay: view.querySelector("#bc-overlay"),
    count:   view.querySelector("#bc-count"),
    winner:  view.querySelector("#bc-winner"),
    winName: view.querySelector("#bc-winner-name"),
  };

  const apply = (row) => {
    if (!row) return;
    live.state = row;

    const ticks = ticksFor(row.race_length, row.length_ticks);
    const key = `${row.seed}:${ticks}:${racers.length}`;
    if (key !== live.simKey) {
      live.sim = simulate(racers, ticks, Number(row.seed) || 1);
      live.simKey = key;
    }

    const hideBoard = row.bc_show_board === false;
    els.board.classList.toggle("hidden", hideBoard);
    // The track takes the freed column rather than leaving a gap.
    els.body.classList.toggle("no-board", hideBoard);
    els.clock.classList.toggle("hidden", row.bc_show_timer === false);
  };

  // Initial read, then realtime, with polling as the safety net.
  const fetchRow = async () => {
    const { data } = await db().from("arena_events").select("*").eq("id", id).maybeSingle();
    if (data) apply(data);
  };
  fetchRow();

  try {
    live.channel = db()
      .channel(`arena-bc-${id}`)
      .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "arena_events", filter: `id=eq.${id}` },
          (payload) => apply(payload.new))
      .subscribe();
  } catch {
    /* realtime unavailable - the poll below covers it */
  }

  // Cheap, and it means a missed realtime message costs at most a second.
  live.poll = setInterval(fetchRow, 1000);

  // ---- draw ----
  let lastBoard = 0;

  const frame = () => {
    const row = live.state;
    if (row && live.sim) {
      const sim = live.sim;
      const elapsed = elapsedMs(row);
      const state = row.bc_state;

      /*
        The countdown is not a state, it is a negative clock. The
        commissioner sets bc_started_at a few seconds into the future and
        every viewer counts down to it independently - so ONE write starts
        the race and nothing has to flip a flag when the countdown ends.
      */
      if (elapsed < 0 && state !== "idle") {
        const left = Math.ceil(-elapsed / 1000);
        els.overlay.classList.remove("hidden");
        els.count.textContent = left > 0 ? String(left) : "GO!";
        els.count.classList.toggle("go", left <= 0);
        els.status.textContent = left > 0 ? "Set" : "Away!";
      } else if (state === "running" && elapsed >= 0 && elapsed < 650) {
        els.overlay.classList.remove("hidden");
        els.count.textContent = "GO!";
        els.count.classList.add("go");
      } else {
        els.overlay.classList.add("hidden");
      }

      const t = Math.max(0, Math.min(sim.frames, elapsed / TICK_MS));
      const lo = Math.floor(t), hi = Math.min(sim.frames, lo + 1), mix = t - lo;

      for (let i = 0; i < els.runners.length; i++) {
        const s = sim.samples[i];
        const p = elapsed <= 0 ? 0 : s[lo] + (s[hi] - s[lo]) * mix;
        els.runners[i].style.transform = `translate3d(${trackX(p)},0,0)`;
      }

      if (row.bc_show_timer !== false) {
        els.clock.textContent = (Math.max(0, elapsed) / 1000).toFixed(1);
      }

      // The board is text: 6 updates a second is plenty and keeps the main
      // thread free for the lanes.
      const now = performance.now();
      if (now - lastBoard > 160) {
        lastBoard = now;
        drawBoard(els.list, racers, sim, t);
      }

      const finishMs = sim.order.at(-1)?.finishMs ?? 0;
      const done = state === "finished" || (state === "running" && elapsed >= finishMs);

      if (done) {
        const win = sim.order[0];
        els.winName.textContent = win?.racer.name || "";
        els.winner.classList.remove("hidden");
        els.status.textContent = "Final";
      } else {
        els.winner.classList.add("hidden");
        if (state === "running") {
          els.status.textContent = elapsed > finishMs * 0.82 ? "Final stretch" : "Racing";
        } else if (state === "paused")  els.status.textContent = "Paused";
        else if (state === "idle")      els.status.textContent = "Standing by";
      }
    }
    live.raf = requestAnimationFrame(frame);
  };
  live.raf = requestAnimationFrame(frame);
}

/*
  Elapsed race time from the row alone, so a refresh on either machine lands
  in exactly the same place.

  A negative value is the countdown: the commissioner sets bc_started_at a
  few seconds into the future, and every viewer counts down to it together
  without a single message being exchanged.
*/
function elapsedMs(row) {
  if (!row.bc_started_at) return 0;
  if (row.bc_state === "idle") return 0;
  const started = Date.parse(row.bc_started_at);
  if (Number.isNaN(started)) return 0;

  // While paused, bc_offset_ms already holds the frozen elapsed time.
  if (row.bc_state === "paused") return row.bc_offset_ms || 0;
  return Date.now() - started - 0 + (row.bc_offset_ms || 0);
}

const trackX = (p) => `calc(${(p * 100).toFixed(3)}% - ${(p * 92).toFixed(1)}px)`;

/** Live standings, ordered by distance covered. */
function drawBoard(list, racers, sim, t) {
  const idx = Math.max(0, Math.min(sim.frames, Math.round(t)));
  const rows = racers
    .map((r, i) => ({ r, p: sim.samples[i][idx] }))
    .sort((a, b) => b.p - a.p);

  const items = list.children;
  for (let i = 0; i < items.length; i++) {
    const li = items[i];
    const row = rows[i];
    if (!row) continue;
    // Only write when the text actually changes - this runs six times a
    // second and the DOM should not be touched for nothing.
    const pos = String(i + 1);
    if (li.firstElementChild.textContent !== pos) li.firstElementChild.textContent = pos;
    const name = row.r.name;
    if (li.lastElementChild.textContent !== name) {
      li.lastElementChild.textContent = name;
      li.classList.remove("bc-move");
      void li.offsetWidth;
      li.classList.add("bc-move");
    }
    li.style.setProperty("--racer", row.r.color);
    li.classList.toggle("leader", i === 0);
  }
}
