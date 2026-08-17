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

import { db, updateRow, isAdmin } from "../supabase.js";
import { esc, errorBox, toast } from "../ui.js";
import { petOf } from "./profile-dfl.js";
import { backgroundMotion, createArenaRenderer, createFinishPresentation, createReactionTimeline, finishPassProgress, presentationRacerFrame, presentationScreenRatio } from "../arena/pixi-runtime.js";
import { getReduceRaceMotion, onReduceRaceMotionChange, setReduceRaceMotion } from "../store.js";
import { loadMembers } from "../members.js";
import { spriteMarkup, themeLabel } from "../arena/sprites.js";
/* The same emitter the Arena stage uses. */
import { racerLanes } from "../arena/racer-view.js";
import { simulate, dramatize, visualEvents, intensityAt, boardState, newSeed, ticksFor, TICK_MS,
         finishTrajectories, presentFinish, raceShot } from "../arena/race.js";
import { claimFinish, persistResult, finalOffsetMs } from "../arena/results.js";

const LANE_COLORS = [
  "#2fbf5f", "#4aa3ff", "#f0a742", "#e0574a", "#b07cf0", "#3ecfcf",
  "#f2e05a", "#ff7fb0", "#8fd14f", "#ff9a4a", "#7f8cff", "#d6b254",
];

const raceMotionClass = () => getReduceRaceMotion() ? "race-motion-reduced" : "race-motion-full";
const applyRaceMotionClass = (element, reduced = getReduceRaceMotion()) => {
  element?.classList.toggle("race-motion-reduced", reduced);
  element?.classList.toggle("race-motion-full", !reduced);
};

// Everything this view owns, so teardown is one call. Leaving a stray rAF
// loop or a live channel behind would keep drawing over the next scene.
let live = null;

export async function render(view) {
  teardown();

  const id = new URLSearchParams(location.hash.split("?")[1] || "").get("id");
  if (!id) {
    view.innerHTML = `<h1>DFL Broadcast</h1>
      <div class="card"><div class="card-body">
        This is the clean OBS and shared-viewer route. Copy its URL from an
        Arena event's <strong>OBS setup</strong>, or add an event id to the
        address: <code>#/broadcast?id=12</code>
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

  const racers = parts.map((p, i) => {
    /*
      THE DFL PET IS THE RACER, when the member has made one. Presentation
      only: the sprite key and the lane colour are all that change, and
      simulate() never sees either - so the winner, the finish times and
      the order are byte for byte what they were.
    */
    const pet = petOf(byId.get(String(p.member_id)));
    return {
      id: p.member_id,
      name: byId.get(String(p.member_id))?.display_name || "Unknown",
      sprite: pet?.species || p.sprite,
      image: pet ? null : p.sprite_image,
      color: pet?.color || p.color || LANE_COLORS[i % LANE_COLORS.length],
      pet,
      number: p.number ?? i + 1,
    };
  });

  document.body.classList.add("broadcasting");
  paint(view, eventRes.data, racers);
  watch(view, id, racers);
  wireBar(view, id, racers);
}

/*
  The control bar.

  The broadcast was built as a pure viewer on the assumption the
  commissioner would drive it from their phone. That was wrong in the one
  case that matters: somebody opens this on the machine running OBS, in
  fullscreen, and there is then no way to start the race and no way back
  out of a page that has deliberately hidden the header and the tab bar.

  It behaves like a video player - visible on pointer movement, gone after a
  few idle seconds. OBS never moves a pointer, so the capture never sees it.
  It writes the same state the Arena panel writes, so either can drive.
*/
const COUNTDOWN_MS = 2700;
const BAR_IDLE_MS = 2600;

function wireBar(view, id, racers) {
  const bar = view.querySelector("#bc-bar");
  if (!bar) return;

  /*
    Members lose the RACE controls, not the bar.

    Removing the whole thing would take Exit with it, and this page hides the
    header and the tab bar - so a member who opened the broadcast would have
    no way back into the app at all. Getting out is not an admin privilege.
  */
  const memberSafe = !isAdmin();
  if (memberSafe) {
    bar.querySelectorAll("#bc-go, #bc-hold, #bc-end, #bc-zero, .bc-bar-hint")
       .forEach((el) => el.remove());
  }

  const stage = view.querySelector("#bc-stage");
  let hideTimer = 0;
  const show = () => {
    bar.classList.add("on");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => bar.classList.remove("on"), BAR_IDLE_MS);
  };
  stage.addEventListener("pointermove", show);
  stage.addEventListener("pointerdown", show);
  show();

  const row = () => live?.state;

  const write = async (patch, note) => {
    try {
      await updateRow("arena_events", id, patch);
      if (note) toast(note);
    } catch (err) {
      toast(/bc_state|column/.test(err.message || "")
        ? "Run arena_broadcast_schema.sql in Supabase"
        : (err.message || "Could not change the broadcast"), true);
    }
  };

  bar.addEventListener("click", async (e) => {
    const r = row();
    show();

    if (e.target.closest("#bc-go")) {
      const seed = r?.seed || newSeed();
      return write({
        seed,
        bc_state: "running",
        bc_started_at: new Date(Date.now() + COUNTDOWN_MS).toISOString(),
        bc_offset_ms: 0,
      }, "Countdown");
    }

    if (e.target.closest("#bc-hold")) {
      if (r?.bc_state === "paused") {
        return write({
          bc_state: "running",
          bc_started_at: new Date().toISOString(),
          bc_offset_ms: r.bc_offset_ms || 0,
        }, "Resumed");
      }
      const now = r?.bc_started_at
        ? Date.now() - Date.parse(r.bc_started_at) + (r.bc_offset_ms || 0) : 0;
      return write({ bc_state: "paused", bc_offset_ms: Math.max(0, Math.round(now)) }, "Paused");
    }

    if (e.target.closest("#bc-end")) {
      const sim = simulate(racers, ticksFor(r?.race_length, r?.length_ticks), Number(r?.seed) || 1);
      return write({
        bc_state: "finished",
        bc_started_at: new Date().toISOString(),
        bc_offset_ms: (sim.order.at(-1)?.finishMs ?? 0) + 400,
      }, "Skipped to the finish");
    }

    if (e.target.closest("#bc-zero")) {
      return write({ bc_state: "idle", bc_started_at: null, bc_offset_ms: 0 }, "Reset");
    }

    if (e.target.closest("#bc-full")) {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch { toast("Fullscreen was refused by the browser", true); }
    }
  });

  bar.addEventListener("change", (e) => {
    if (e.target.id !== "bc-motion") return;
    setReduceRaceMotion(e.target.checked);
    applyRaceMotionClass(stage, e.target.checked);
    show();
    toast(e.target.checked ? "Race effects reduced on this device" : "Full race effects restored");
  });
}

/** Called by the router when leaving the page. */
export function leave() {
  teardown();
  document.body.classList.remove("broadcasting");
  // Never strand somebody in fullscreen on a page they have navigated away from.
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

function teardown() {
  if (!live) return;
  cancelAnimationFrame(live.raf);
  clearInterval(live.poll);
  live.stopMotionWatch?.();
  live.resizeObserver?.disconnect?.();
  live.channel?.unsubscribe?.();
  live.pixi?.destroy?.();
  live = null;
}

// ------------------------------- the stage ----------------------------

function paint(view, event, racers) {
  view.innerHTML = `
    <div class="bc-stage cinematic-race ${raceMotionClass()}" id="bc-stage" data-theme="${esc(event.theme || "stadium")}">
      <div class="race-scenery" aria-hidden="true">
        <svg class="arena-effect-defs" width="0" height="0" focusable="false" aria-hidden="true">
          <filter id="arena-motion-blur" x="-12%" y="-4%" width="124%" height="108%" color-interpolation-filters="sRGB">
            <feGaussianBlur data-arena-motion-blur stdDeviation="0 0" edgeMode="duplicate"></feGaussianBlur>
          </filter>
        </svg>
        <div class="race-sky"></div><div class="race-hills far"></div>
        <div class="race-hills near"></div><div class="race-crowd"></div>
      </div>
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
          ${racerLanes(racers, { theme: event.theme, prefix: "bc", idPrefix: "bc-runner-" })}
        </div>

        <aside class="bc-board" id="bc-board">
          <div class="bc-board-head">Standings</div>
          <ol class="bc-board-list" id="bc-board-list">
            ${racers.map((r) => `
              <li><span class="bc-pos"></span><span class="bc-who">${esc(r.name)}</span><span class="bc-time"></span></li>`).join("")}
          </ol>
        </aside>
      </div>

      <div class="bc-overlay hidden" id="bc-overlay">
        <div class="bc-count" id="bc-count">3</div>
      </div>

      <div class="bc-winner hidden" id="bc-winner">
        <div class="bc-winner-inner">
          <span class="bc-winner-kicker">Winner</span>
          <span class="bc-winner-art" id="bc-winner-art" aria-hidden="true"></span>
          <span class="bc-winner-name" id="bc-winner-name"></span>
          <span class="bc-winner-event">${esc(event.name)}</span>
        </div>
      </div>

      <div class="bc-bar" id="bc-bar">
        <a class="bc-btn" href="#/arena?id=${event.id}" title="Leave broadcast">Exit</a>
        <button class="bc-btn" id="bc-go" title="Start / restart">Start</button>
        <button class="bc-btn" id="bc-hold" title="Pause / resume">Pause</button>
        <button class="bc-btn" id="bc-end" title="Skip to finish">Skip</button>
        <button class="bc-btn" id="bc-zero" title="Reset to the start line">Reset</button>
        <button class="bc-btn" id="bc-full" title="Fullscreen">Fullscreen</button>
        <label class="bc-motion-setting" title="Use gentler race effects on this device"><input type="checkbox" id="bc-motion" ${getReduceRaceMotion() ? "checked" : ""}> Reduce race motion/effects</label>
        <span class="bc-bar-hint">Admin only · hides itself while streaming</span>
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
  live = { raf: 0, poll: 0, channel: null, resizeObserver: null, pixi: null,
    trackWidth: 1, sim: null, simKey: "", state: null, sceneryBlurX: 0,
    saveTried: false,
    reduceMotionEffects: getReduceRaceMotion(), stopMotionWatch: null };

  const els = {
    runners: racers.map((_, i) => view.querySelector(`#bc-runner-${i}`)),
    clock:   view.querySelector("#bc-clock"),
    status:  view.querySelector("#bc-status"),
    board:   view.querySelector("#bc-board"),
    body:    view.querySelector(".bc-body"),
    list:    view.querySelector("#bc-board-list"),
    track:   view.querySelector("#bc-track"),
    scenery: view.querySelector(".race-scenery"),
    sceneryBlur: view.querySelector("[data-arena-motion-blur]"),
    stage:   view.querySelector("#bc-stage"),
    overlay: view.querySelector("#bc-overlay"),
    count:   view.querySelector("#bc-count"),
    winner:  view.querySelector("#bc-winner"),
    winName: view.querySelector("#bc-winner-name"),
    winArt:  view.querySelector("#bc-winner-art"),
  };

  const session = live;
  applyRaceMotionClass(els.stage, live.reduceMotionEffects);
  live.stopMotionWatch = onReduceRaceMotionChange((reduced) => {
    if (live !== session) return;
    live.reduceMotionEffects = reduced;
    applyRaceMotionClass(els.stage, reduced);
    const checkbox = view.querySelector("#bc-motion");
    if (checkbox) checkbox.checked = reduced;
  });
  createArenaRenderer(els.track, racers).then((renderer) => {
    if (live !== session) { renderer?.destroy(); return; }
    live.pixi = renderer;
  });
  live.trackWidth = Math.max(1, els.track?.clientWidth || 1);
  if (typeof ResizeObserver === "function" && els.track) {
    live.resizeObserver = new ResizeObserver((entries) => {
      if (!live) return;
      live.trackWidth = Math.max(1, entries[0]?.contentRect?.width || els.track.clientWidth || 1);
    });
    live.resizeObserver.observe(els.track);
  }
  for (const runner of els.runners) {
    runner?.style.setProperty("--race-x", `${(live.trackWidth * .03).toFixed(2)}px`);
    runner?.classList.add("is-positioned");
  }

  const apply = (row) => {
    if (!row) return;
    /* A race that is back at the start line, or has been re-rolled onto a new
       seed, is a race whose result has not been written yet - so the one-shot
       save latch has to come off with it. Without this a "Run race again" in
       the same session would finish and quietly save nothing. */
    if (row.bc_state === "idle" || (live.state && row.seed !== live.state.seed)) live.saveTried = false;
    live.state = row;

    const ticks = ticksFor(row.race_length, row.length_ticks);
    const key = `${row.seed}:${ticks}:${racers.length}`;
    if (key !== live.simKey) {
      live.sim = simulate(racers, ticks, Number(row.seed) || 1);
      /*
        THE SAME THEATRE THE EVENT PAGE USES. This screen was still drawing
        raw sim.samples, which is why the OBS broadcast had none of the
        movement, none of the events and no split times - all of that lived
        in pages/arena.js and stopped at its own door. Same functions, same
        seed, so the two screens show the same race.
      */
      const drama = dramatize(live.sim, Number(row.seed) || 1);
      live.shown = drama.shown;
      live.events = drama.events;
      live.visuals = visualEvents(live.sim, live.shown, racers);
      live.pixiTimeline = createReactionTimeline(live.events, live.visuals, racers.length);
      live.nextVisual = 0;
      live.nextEvent = 0;
      live.expiry = [];
      live.lastElapsed = -1;
      live.official = new Map(live.sim.order.map((o) => [o.index, o.finishMs]));
      /* Finishing place, for the post-finish parking spots. */
      live.placeOf = new Map(live.sim.order.map((o) => [o.index, o.place]));
      live.trajectory = finishTrajectories(live.sim);
      live.leaderLane = null;
      live.lastLeadChangeMs = null;
      live.winnerMs = live.sim.order[0]?.finishMs ?? 0;
      live.homed = new Set();
      live.simKey = key;

      /*
        Finish time per LANE, and the last one of all.

        sim.order is sorted by finish, so it has to be turned back into
        lane order to be useful while drawing. Both are needed to stop the
        board and the clock at the right moment.
      */
      live.finishAt = new Array(racers.length).fill(Infinity);
      for (const o of live.sim.order) live.finishAt[o.index] = o.finishMs;
      live.lastFinish = live.sim.order.at(-1)?.finishMs ?? 0;
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

      const src = live.shown || sim.samples;
      let leaderProgress = 0;
      for (const samples of src) {
        const progress = (samples[lo] ?? 0) + ((samples[hi] ?? samples[lo] ?? 0) - (samples[lo] ?? 0)) * mix;
        leaderProgress = Math.max(leaderProgress, progress);
      }
      const finishPresentation = createFinishPresentation({
        elapsedMs: Math.max(0, elapsed), leaderProgress, order: sim.order, racers,
      });
      const visualT = Math.max(0, Math.min(sim.frames, finishPresentation.visualElapsedMs / TICK_MS));
      const visualLo = Math.floor(visualT);
      const visualHi = Math.min(sim.frames, visualLo + 1);
      const visualMix = visualT - visualLo;
      els.stage.dataset.camera = finishPresentation.camera.state;
      els.stage.style.setProperty("--finish-camera", finishPresentation.camera.mix.toFixed(4));
      const heat = intensityAt(src, lo);
      const band = heat > .66 ? "3" : heat > .33 ? "2" : heat > 0 ? "1" : "0";
      if (els.track && els.track.dataset.heat !== band) els.track.dataset.heat = band;
      const pixiRacers = [];
      for (let i = 0; i < els.runners.length; i++) {
        const s = src[i];
        const pixiRacer = presentationRacerFrame({
          id: racers[i].id, lane: i, samples: s, lo: visualLo, hi: visualHi, mix: visualMix,
          elapsedMs: finishPresentation.visualElapsedMs, officialFinishMs: live.official?.get(i), timeline: live.pixiTimeline,
        });
        const p = pixiRacer.progress;
        /* Same coast the Arena applies - one implementation in race.js, so
           the two cameras cannot disagree about where a finisher parks. */
        presentFinish(pixiRacer, finishPresentation.visualElapsedMs,
                      live.trajectory?.[i], finishPresentation.celebrationActive);
        const phase = pixiRacer.phase;
        const screenRatio = presentationScreenRatio(pixiRacer.displayProgress, finishPresentation.camera);
        els.runners[i].style.setProperty("--race-x", `${(live.trackWidth * screenRatio).toFixed(2)}px`);
        if (els.runners[i].dataset.phase !== phase) els.runners[i].dataset.phase = phase;
        pixiRacers.push(pixiRacer);
      }
      const pixiLeader = pixiRacers.reduce((best, item) => item.progress > best.progress ? item : best, pixiRacers[0]);
      if (pixiLeader) pixiLeader.leading = true;
      /* A genuine change of hands, for the camera. The first leader of the
         race is not a change - nobody held it before them. */
      if (pixiLeader && pixiLeader.lane !== live.leaderLane) {
        if (live.leaderLane != null) live.lastLeadChangeMs = Math.max(0, elapsed);
        live.leaderLane = pixiLeader.lane;
      }
      /* The 2D camera, same states and same rules as the Arena stage. */
      const shot = raceShot({
        leaderProgress,
        celebrating: finishPresentation.celebrationActive,
      });
      if (els.stage.dataset.shot !== shot) els.stage.dataset.shot = shot;
      /*
        THE FINISH PASS. Time-derived, so a racer falling backwards cannot
        drag the scenery back with them - see finishPassProgress().
      */
      const pass = finishPassProgress(Math.max(0, elapsed), live.sim.order[0].finishMs, live.sim.order.at(-1).finishMs);
      if (pass !== live.lastReveal) {
        els.stage.style.setProperty("--finish-pass", pass.toFixed(4));
        live.lastReveal = pass;
      }
      const pixiState = finishPresentation.celebrationActive ? "finished" : state === "paused" ? "paused" : state === "idle" ? "idle" : "running";
      live.pixi?.render({
        elapsedMs: Math.max(0, elapsed),
        state: elapsed < 0 ? "idle" : pixiState,
        heat: Number(band),
        racers: pixiRacers,
        countdownMs: elapsed < 0 ? Math.abs(elapsed) : 0,
        winnerId: sim.order[0]?.racer?.id,
        finish: finishPresentation,
        reduceMotionEffects: live.reduceMotionEffects,
      });
      if (els.scenery) els.scenery.style.setProperty("--race-pan", Math.min(1, leaderProgress).toFixed(4));
      const backdrop = backgroundMotion(elapsed < 0 ? "idle" : pixiState, heat,
        finishPresentation.celebrationActive, live.reduceMotionEffects);
      live.sceneryBlurX += (backdrop.blurX - live.sceneryBlurX) * .16;
      els.sceneryBlur?.setAttribute("stdDeviation", `${live.sceneryBlurX.toFixed(2)} ${backdrop.blurY.toFixed(2)}`);
      els.stage?.style.setProperty("--arena-motion", backdrop.intensity.toFixed(3));

      /*
        EVENTS AND REACTIONS.

        The clock here is shared and seekable - a commissioner can restart
        or the page can be opened mid-race - so the queue index is reset
        whenever the clock goes backwards rather than assuming it only ever
        moves forward like the event page's does.
      */
      if (elapsed < live.lastElapsed) {
        live.nextVisual = 0; live.nextEvent = 0; live.homed.clear();
        for (const [el, cls] of live.expiry) el.classList.remove(cls, "is-hot");
        live.expiry.length = 0;
        for (const el of els.runners) el.classList.remove("is-surge","is-stumble","is-jump","is-duel","is-near","is-hot","is-home","is-finished","is-winner","is-leading");
        /* The camera is seekable too: a rewound clock must not keep
           holding a low shot for a lead change that has not happened yet. */
        live.leaderLane = null;
        live.lastLeadChangeMs = null;
        for (const el of els.runners) delete el.dataset.phase;
      }
      live.lastElapsed = elapsed;

      const track = els.track;
      if (state === "running" && elapsed >= 0 && !finishPresentation.allExited) {
        track?.classList.add("is-running");
        els.stage?.classList.add("is-racing");
      } else {
        track?.classList.remove("is-running");
        els.stage?.classList.remove("is-racing");
      }

      while (live.nextEvent < (live.events?.length || 0) && elapsed >= live.events[live.nextEvent].ms) {
        const ev = live.events[live.nextEvent++];
        const el = els.runners[ev.racer];
        if (el) {
          el.classList.remove("is-surge", "is-stumble");
          el.classList.add(ev.kind === "stumble" ? "is-stumble" : "is-surge");
          live.expiry.push([el, ev.kind === "stumble" ? "is-stumble" : "is-surge", elapsed + ev.durMs]);
        }
      }

      while (live.nextVisual < (live.visuals?.length || 0) && elapsed >= live.visuals[live.nextVisual].ms) {
        const ev = live.visuals[live.nextVisual++];
        const hot = ev.intensity >= 0.6;
        const touch = (i, cls) => {
          const el = els.runners[i];
          if (!el) return;
          el.classList.add(cls);
          if (hot) el.classList.add("is-hot");
          live.expiry.push([el, cls, elapsed + ev.durMs]);
        };
        if (ev.kind === "jump") touch(ev.racer, "is-jump");
        else if (ev.kind === "swap") { touch(ev.racer, "is-duel"); touch(ev.other, "is-duel"); }
        else if (ev.kind === "near") { touch(ev.racer, "is-near"); touch(ev.other, "is-near"); }
      }

      for (let k = live.expiry.length - 1; k >= 0; k--) {
        if (elapsed >= live.expiry[k][2]) {
          live.expiry[k][0].classList.remove(live.expiry[k][1], "is-hot");
          live.expiry.splice(k, 1);
        }
      }

      /* Individual finishes, so the stream shows people arriving one by
         one rather than the field simply stopping. */
      for (let i = 0; i < els.runners.length; i++) {
        const ms = live.official?.get(i);
        if (ms == null || live.homed.has(i) || elapsed < ms) continue;
        live.homed.add(i);
        const el = els.runners[i];
        el?.classList.remove("is-surge", "is-stumble", "is-duel");
        el?.classList.add("is-finished");
      }

      if (finishPresentation.celebrationActive) {
        const winner = els.runners[sim.order[0].index];
        winner?.classList.remove("is-finished");
        winner?.classList.add("is-winner");
      }

      if (row.bc_show_timer !== false) {
        // Frozen at the last finish: a race clock that carries on counting
        // after everybody is home is just a stopwatch nobody stopped.
        const shown = Math.min(Math.max(0, elapsed), live.lastFinish);
        els.clock.textContent = (shown / 1000).toFixed(1);
      }

      // The board is text: 6 updates a second is plenty and keeps the main
      // thread free for the lanes.
      const now = performance.now();
      if (now - lastBoard > 160) {
        lastBoard = now;
        drawBoard(els.list, racers, sim, t, elapsed, live.finishAt, live.shown, live.winnerMs);
      }

      const finishMs = sim.order.at(-1)?.finishMs ?? 0;
      const done = finishPresentation.celebrationActive;

      if (done) {
        /*
          THE RACE IS OVER, SO THE RESULT GETS WRITTEN - here, once.

          This used to be the Arena page's job, because the Arena page ran
          its own copy of the race and knew when its own copy ended. It does
          not run one any more: this view IS the race, for the commissioner
          as much as for everybody else, so the moment the celebration starts
          is the only place that actually knows the race finished.

          claimFinish() is a compare-and-set, not a flag on this page. Two
          admins watching - a phone and the OBS machine - reach this frame
          together, and only the one whose update actually flips bc_state
          goes on to write the rows. See arena/results.js.

          Never awaited into the frame loop and never retried: a failed save
          must not stutter the winner presentation, and the commissioner
          still has "Save result" on the event page.
        */
        if (!live.saveTried && isAdmin()) {
          live.saveTried = true;
          const seed = Number(row.seed) || 1;
          (async () => {
            if (!(await claimFinish(id, finalOffsetMs(sim)))) return;   // somebody else has it
            await persistResult(id, sim, seed);
            toast("Result saved");
          })().catch((err) => toast(err.message || "Could not save the result", true));
        }
        const win = sim.order[0];
        els.winName.textContent = win?.racer.name || "";
        if (win && els.winArt && !els.winArt.dataset.racer) {
          const art = els.runners[win.index]?.querySelector(".bc-runner-art");
          els.winArt.innerHTML = art?.innerHTML || "";
          els.winArt.dataset.racer = String(win.index);
        }
        els.stage?.classList.add("is-finished");
        els.winner.classList.remove("hidden");
        els.status.textContent = "Final";
      } else {
        els.winner.classList.add("hidden");
        els.stage?.classList.remove("is-finished");
        if (els.winArt) { els.winArt.innerHTML = ""; delete els.winArt.dataset.racer; }
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


/**
 * Live standings.
 *
 * A placing is SET when it is earned. Ordering purely by distance looked
 * right until somebody crossed: a finished racer sits at exactly 1.0, so
 * every finisher tied with every other finisher and the tie-break reshuffled
 * them - 1st and 2nd could swap after both were home, and once the whole
 * field was in, the board showed lane order instead of the result.
 *
 * So: anybody home is ranked by WHEN they got home, always ahead of anybody
 * still running, and the still-running are ranked by distance with lane
 * order as the tie-break (which is what stops a standing start flickering).
 */
function drawBoard(list, racers, sim, t, elapsed, finishAt, shown, winnerMs = 0) {
  /* ONE authority - the same boardState() the Arena page calls, with the
     same arguments. The two boards cannot disagree about order, gaps or
     who is home, because there is only one implementation of the rule. */
  const state = boardState(sim, shown, elapsed);
  const done = (i) => state.find((x) => x.index === i)?.done;
  const rows = state.map((x) => ({ r: racers[x.index], i: x.index, label: x.label }));

  const items = list.children;
  for (let i = 0; i < items.length; i++) {
    const li = items[i];
    const row = rows[i];
    if (!row) continue;
    // Only write when the text actually changes - this runs six times a
    // second and the DOM should not be touched for nothing.
    const pos = String(i + 1);
    if (li.firstElementChild.textContent !== pos) li.firstElementChild.textContent = pos;
    /*
      .bc-who BY NAME, NOT lastElementChild.

      The row gained a third span for the split time, which made the TIME
      cell the last child - so this wrote every racer's name into the time
      column and never updated the name column at all. That is the broken
      broadcast leaderboard. Ask for the element that is meant.
    */
    const who = li.querySelector(".bc-who");
    const name = row.r.name;
    if (who && who.textContent !== name) {
      who.textContent = name;
      li.classList.remove("bc-move");
      void li.offsetWidth;
      li.classList.add("bc-move");
    }
    li.style.setProperty("--racer", row.r.color);
    li.classList.toggle("leader", i === 0);

    /*
      THE SPLIT. The winner's own time, then the gap to them - straight off
      the authoritative finishMs, never measured from the animation.
    */
    const time = li.querySelector(".bc-time");
    if (time && time.textContent !== row.label) time.textContent = row.label;
    li.classList.toggle("is-home", done(row.i));
  }
}
