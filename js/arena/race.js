// =====================================================================
// arena/race.js - the simulation. No DOM in this file.
// ---------------------------------------------------------------------
// The race is simulated to completion BEFORE anything animates, and the
// renderer then plays back the recording. That split buys three things:
//
//   * the finish order is known and fair, decided by the model rather than
//     by frame timing on whatever phone is watching
//   * a slow device drops frames instead of changing who wins
//   * the same seed replays the same race, so a saved event can be watched
//     again and it is the real one, not a re-roll
//
// HOW IT LOOKS LIKE A RACE
// Constant speeds are a progress bar, and pure per-frame randomness is
// teleportation. What reads as a race is momentum: each racer eases toward
// a target speed that itself drifts, so movement is smooth but never
// uniform. On top of that:
//
//   talent        a small fixed edge, so form is not pure noise
//   bursts        short accelerations that visibly pass people
//   stumbles      brief slowdowns, the same thing in reverse
//   drafting      a gentle pull toward the pack, which keeps the field
//                 together, manufactures lead changes, and is what makes
//                 photo finishes happen instead of a runaway
//   clutch        a final-stretch surge, per racer, so the last 20% of the
//                 track actually decides something
// =====================================================================

/** Deterministic RNG (mulberry32). Same seed, same race, every time. */
function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSeed() {
  return Math.floor(Math.random() * 2147483647) + 1;
}

/** Tick length. 40ms = 25 simulated steps a second, plenty for smooth playback. */
export const TICK_MS = 40;

export const LENGTHS = {
  short:  { label: "Short",  ticks: 300 },   // ~12s
  medium: { label: "Medium", ticks: 550 },   // ~22s
  long:   { label: "Long",   ticks: 900 },   // ~36s
};

export function ticksFor(lengthKey, customTicks) {
  if (lengthKey === "custom") {
    const n = Number(customTicks);
    return Number.isFinite(n) && n > 60 ? Math.min(n, 3000) : LENGTHS.medium.ticks;
  }
  return (LENGTHS[lengthKey] || LENGTHS.medium).ticks;
}

/** Seconds a race of this length will take to watch. */
export function raceSeconds(lengthKey, customTicks) {
  return Math.round((ticksFor(lengthKey, customTicks) * TICK_MS) / 1000);
}

/**
 * Run the whole race.
 *
 * @param {Array} racers  objects with an `id` (used only to label output)
 * @param {number} ticks  race length
 * @param {number} seed
 * @returns {{samples: Float32Array[], order: Array, ticks: number, finishTick: number}}
 *   samples[i][t] is racer i's progress (0..1) at tick t.
 */
export function simulate(racers, ticks, seed) {
  const n = racers.length;
  const rand = rng(seed);
  if (!n) return { samples: [], order: [], ticks, finishTick: 0 };

  // A racer's fixed character, drawn once so it is stable for this seed.
  const talent = [], clutch = [], jitter = [];
  for (let i = 0; i < n; i++) {
    talent.push(0.98 + rand() * 0.04);   // 0.98 - 1.02, tight: grade below sets the field
    clutch.push(0.90 + rand() * 0.26);   // who shows up at the end
    jitter.push(0.55 + rand() * 0.9);    // how erratic they are
  }

  /*
    THE FRONT PACK, AND THE BREAK BEHIND IT.

    The old model gave every racer the same job and then rubber-banded them
    together, so a twelve-runner field finished inside 1.6-3.9 seconds and
    the last eight arrived in a wall. That is not a close race, it is no
    race: there was nothing to see once the leader was decided.

    So the day now has a SHAPE, drawn from the seed like everything else:

      packSize   2-4 racers who genuinely contest the finish
      brk        how far the rest start behind them, as a speed handicap
      tail       how much further back each one after that sits

    grade[] is a per-racer speed multiplier and nothing else. It does not
    decide who wins - talent, bursts, stumbles and the run-in still do, and a
    graded racer on a burst can and does break into the pack. It decides how
    far apart the field ARRIVES, which is the thing that was broken.

    6.5-10.5% off the pace over a twenty-second race is the 1-2 seconds the
    break is meant to be; the tail spreads the rest behind that naturally.
  */
  const packSize = Math.min(n, 2 + Math.floor(rand() * 3));
  const seeding = Array.from({ length: n }, () => rand())
    .map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  const brk  = 0.065 + rand() * 0.040;
  const tail = 0.012 + rand() * 0.020;
  const grade = new Float64Array(n).fill(1);
  seeding.forEach((idx, pos) => {
    if (pos >= packSize) grade[idx] = 1 - brk - tail * (pos - packSize);
  });

  // Distance is abstract: everybody covers 1.0, and the speed scale is set
  // so an average racer arrives near the final tick.
  const BASE = 1 / ticks;

  const progress = new Float64Array(n);
  const speed    = new Float64Array(n).fill(BASE);
  const target   = new Float64Array(n).fill(BASE);
  const burst    = new Int16Array(n);        // ticks of burst remaining
  const stumble  = new Int16Array(n);

  /*
    The clock is a target, not a wall.

    `ticks` is where an AVERAGE racer arrives, so a slow one is still short
    of the line when it runs out - and a racer frozen at 99% who never
    crosses looks like a bug rather than a last place. So the simulation is
    allowed to run on until everybody is home, with a hard cap so a
    pathological seed cannot loop forever.
  */
  const maxTicks = Math.ceil(ticks * 1.6);
  const samples = Array.from({ length: n }, () => new Float32Array(maxTicks + 1));
  const finishTick = new Float64Array(n).fill(-1);

  let done = 0;
  let t = 0;

  for (; t <= maxTicks && done < n; t++) {
    // The pack, for drafting. Only racers still running count.
    let sum = 0, live = 0;
    for (let i = 0; i < n; i++) {
      if (finishTick[i] < 0) { sum += progress[i]; live++; }
    }
    const packMean = live ? sum / live : 0;

    for (let i = 0; i < n; i++) {
      if (finishTick[i] >= 0) { samples[i][t] = 1; continue; }

      // --- events ---
      if (burst[i] === 0 && stumble[i] === 0) {
        const roll = rand();
        if (roll < 0.012)      burst[i]   = 12 + Math.floor(rand() * 26);
        else if (roll < 0.024) stumble[i] = 10 + Math.floor(rand() * 22);
      }
      if (burst[i] > 0)   burst[i]--;
      if (stumble[i] > 0) stumble[i]--;

      // --- the speed this racer is currently aiming for ---
      const frac = progress[i];
      let want = BASE * talent[i] * grade[i];

      // drifting noise, scaled by how erratic they are
      want *= 1 + (rand() - 0.5) * 0.22 * jitter[i];

      if (burst[i] > 0)   want *= 1.35;
      if (stumble[i] > 0) want *= 0.72;

      /*
        Drafting FADES OUT over the run. It is what keeps the field racing
        each other early, and it was also what pulled everybody back together
        at the line: a restoring force toward the pack mean, applied every
        tick right up to the finish, erases exactly the gaps the race just
        spent twenty seconds earning. Past 80% it is gone and the order they
        have earned is the order that arrives.
      */
      want *= 1 + (packMean - frac) * 0.55 * Math.max(0, 1 - frac / 0.8);

      // Final stretch, last 20%.
      if (frac > 0.8) want *= 1 + (frac - 0.8) * 1.6 * clutch[i];

      // --- momentum: ease toward the target rather than snapping ---
      target[i] = want;
      speed[i] += (target[i] - speed[i]) * 0.16;
      if (speed[i] < BASE * 0.35) speed[i] = BASE * 0.35;   // nobody stops dead

      progress[i] += speed[i];

      if (progress[i] >= 1) {
        // Interpolate within the tick so two racers on the same tick still
        // separate - this is where a 0.04 second finish comes from.
        const over = (progress[i] - 1) / speed[i];
        finishTick[i] = t - over;
        progress[i] = 1;
        done++;
      }
      samples[i][t] = progress[i];
    }
  }

  // t has already been incremented past the last tick the loop wrote, so the
  // last WRITTEN index is t-1. Padding from t would copy a tick that was
  // never filled, leaving the tail of every lane at zero.
  const lastWritten = Math.max(0, Math.min(t - 1, maxTicks));

  // Anyone still going at the cap is placed by distance covered, and their
  // lane is held at wherever they got to rather than left at zero.
  for (let i = 0; i < n; i++) {
    if (finishTick[i] < 0) finishTick[i] = maxTicks + (1 - progress[i]) * ticks;
    const held = samples[i][lastWritten];
    for (let k = lastWritten + 1; k <= maxTicks; k++) samples[i][k] = held;
  }

  const order = racers
    .map((r, i) => ({ racer: r, index: i, finishMs: Math.round(finishTick[i] * TICK_MS) }))
    .sort((a, b) => a.finishMs - b.finishMs)
    .map((row, idx) => ({ ...row, place: idx + 1 }));

  // `frames` is the highest index the renderer may read. It is NOT `ticks`:
  // the race can legitimately have run past that.
  return { samples, order, ticks, frames: maxTicks, finishTick: Math.max(...finishTick) };
}

/* =====================================================================
   THE THEATRE LAYER HAS MOVED.
   ---------------------------------------------------------------------
   dramatize() and everything that shaped it - the launch, the arcs, the
   waves, the closing convergence, the allowances - now live in
   src/arena/theatre.ts, typed and covered by src/arena/theatre.spec.ts.

   It moved because it was the most consequential code in the Arena and the
   least protected: a thousand lines of untyped JavaScript with no unit
   test, where every bug found in it was caught by a browser probe that did
   not persist. The invariants are specs now - no early crossing, bounded
   backslide, deterministic replay, smooth motion - so the next change to
   it either keeps them or fails.

   It is re-exported from here so callers do not care where it lives.
   ===================================================================== */
export { dramatize, crossingSpeeds } from "./pixi-runtime.js";

const VERB = {
  surge:     (n) => `🔥 ${n} surges`,
  stumble:   (n) => `😬 ${n} stalls`,
  breakaway: (n) => `🚀 ${n} breaks away`,
  comeback:  (n) => `👀 ${n} is closing`,
  push:      (n) => `💨 ${n} makes a move`,
};

/**
 * The commentary. Real events and real positions only.
 *
 * There is no points data in an Arena event - it is a race, not a
 * scoreboard - so nothing here talks about swings or margins in points.
 * The gap at the line is in seconds, because seconds is what was measured.
 */
export function callouts(sim, shown, racers, events = []) {
  const n = shown.length;
  if (n < 2) return [];
  const out = [];
  const nameOf = (i) => racers[i]?.name || `Racer ${i + 1}`;

  for (const e of events) {
    const say = VERB[e.kind];
    if (say) out.push({ ms: e.ms, text: say(nameOf(e.racer)) });
  }

  // Lead changes, read off the drawing - what the viewer actually sees.
  let leader = -1;
  for (let t = 0; t <= sim.frames; t++) {
    let top = 0;
    for (let i = 1; i < n; i++) if (shown[i][t] > shown[top][t]) top = i;
    if (top !== leader) {
      if (leader >= 0 && shown[top][t] < 0.95) {
        out.push({ ms: t * TICK_MS, text: `⚔️ ${nameOf(top)} takes the lead`, strong: true });
      }
      leader = top;
    }
  }

  const first = sim.order[0], second = sim.order[1];
  if (first && second) {
    const gap = (second.finishMs - first.finishMs) / 1000;
    out.push({ ms: Math.max(0, first.finishMs - 1500), text: "🏁 Final push" });
    out.push({ ms: first.finishMs, strong: true,
      text: gap <= 0.25 ? `🏆 Photo finish — ${gap.toFixed(2)}s` : `🏆 ${nameOf(first.index)} wins` });
  }

  /*
    THINNED, NOT SPAMMED. Every line above is a real moment, but six of
    them inside four seconds is a wall of text rather than commentary. A
    lead change and the result always survive; anything else needs 2.5
    seconds of clear air.
  */
  out.sort((a, b) => a.ms - b.ms);
  const kept = [];
  let lastMs = -9999;
  for (const c of out) {
    if (c.strong || c.ms - lastMs >= 2500) { kept.push(c); lastMs = c.ms; }
  }
  return kept;
}

/* =====================================================================
   VISUAL EVENTS - computed ONCE, before a single frame is drawn.
   ---------------------------------------------------------------------
   The brief worried about per-frame pairwise comparison across twelve
   racers. It is not needed: `shown` is a finished recording by the time
   playback starts, so the entire race can be scanned in one pass here and
   the render loop only has to walk a sorted queue.

   That is the difference between O(n^2) sixty times a second forever and
   O(n^2) once over a few hundred ticks - and it means every effect has a
   known start, duration and intensity before anything animates.

   FOUR KINDS, all derived from real movement:

     jump   a racer gained 2+ places in a short window
     swap   the same pair traded places repeatedly - escalating
     near   two racers came within a whisker of each other
     (final-stretch intensity is not an event; it is a curve the renderer
      reads off progress, because it applies to everything at once)

   NOTHING HERE CAN CHANGE THE RACE. It only reads `shown`, which is
   already only the drawing, and returns a list of things to animate.
   ===================================================================== */

/** Ranking at one tick, from the drawn positions. */
function placesAt(shown, t) {
  const n = shown.length;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => shown[b][t] - shown[a][t]);
  const place = new Array(n);
  for (let p = 0; p < n; p++) place[idx[p]] = p;
  return place;
}

/** How close the nearest rival is, used for the near-miss sparks. */
const NEAR = 0.012;          // ~1% of the track
const JUMP_WINDOW = 25;      // ticks (~1s) over which a "jump" is measured

/**
 * Everything worth animating, in playback order.
 *
 * @returns {Array<{ms,kind,racer,other,places,intensity,durMs,text}>}
 */
export function visualEvents(sim, shown, racers) {
  const n = shown.length;
  if (n < 2) return [];
  const frames = sim.frames;
  const nameOf = (i) => racers[i]?.name || `Racer ${i + 1}`;
  const out = [];

  /* Sampled rather than every tick: a place cannot meaningfully change in
     40ms, and this keeps the whole scan to a few hundred iterations. */
  const STEP = 5;
  let prev = placesAt(shown, 0);
  const history = [{ t: 0, place: prev }];

  /* Pair bookkeeping for swap escalation and near-miss throttling. Keyed
     by the pair, so one close duel cannot spawn hundreds of effects. */
  const swaps = new Map();     // "a:b" -> { count, lastMs }
  const lastJump = new Array(n).fill(-9999);   // per racer
  /*
    GLOBAL COOLDOWNS, AND THEY ARE THE DIFFERENCE BETWEEN DRAMA AND NOISE.

    Twelve racers is 66 pairs. Throttling per pair looked reasonable and
    produced 556 events a race with 66 landing in a single second - every
    racer flashing constantly, which reads as a broken screen rather than
    a close race. The budget is now global: at most one near-miss and one
    duel beat in play at a time, and the CLOSEST pair wins the slot.
  */
  let lastNearMs = -9999, lastSwapMs = -9999;

  for (let t = STEP; t <= frames; t += STEP) {
    const place = placesAt(shown, t);
    const ms = t * TICK_MS;

    // ---- multi-position jumps ------------------------------------------
    const back = history.find((h) => t - h.t <= JUMP_WINDOW) || history[history.length - 1];
    for (let i = 0; i < n; i++) {
      const gained = back.place[i] - place[i];
      /* 2+ places, and only once the racer has settled there - measured
         against the window rather than the previous sample, so a single
         wobble across a boundary is not a "jump". */
      /*
        NOT OFF THE LINE. Everybody starts level, so the first couple of
        seconds are the field sorting itself out from a dead heat - which
        generated a burst of "+2" callouts at 0.2s that meant nothing.
        A jump has to happen in an established race to be a jump.
      */
      if (gained >= 2 && shown[i][t] > 0.12 && shown[i][t] < 0.97) {
        /* Per RACER, not "the last event pushed" - the first cut compared
           against whatever was most recently added, so two racers jumping
           in turn each cleared the other's cooldown. */
        if (ms - lastJump[i] > 3500) {
          lastJump[i] = ms;
          out.push({
            ms, kind: "jump", racer: i, places: gained,
            intensity: Math.min(1, gained / 4),
            durMs: 1200,
            text: place[i] === 0 ? `⚔️ ${nameOf(i)} takes the lead`
                                 : `⬆️ ${nameOf(i)} +${gained}`,
          });
        }
      }
    }

    // ---- rapid swaps, and the proximity that goes with them -------------
    let closest = { gap: Infinity, a: -1, b: -1 };
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const key = `${a}:${b}`;
        const swapped = (prev[a] < prev[b]) !== (place[a] < place[b]);
        if (swapped) {
          const rec = swaps.get(key) || { count: 0, lastMs: -9999 };
          /* Only count it as part of a RUN if it happened soon after the
             last one; otherwise the pair starts fresh. That is what makes
             a genuine back-and-forth escalate and two unrelated passes
             twenty seconds apart stay calm. */
          rec.count = ms - rec.lastMs < 4000 ? rec.count + 1 : 1;
          rec.lastMs = ms;
          swaps.set(key, rec);
          if (rec.count >= 2 && ms - lastSwapMs > 1500) {
            lastSwapMs = ms;
            out.push({
              ms, kind: "swap", racer: a, other: b,
              intensity: Math.min(1, rec.count / 4),
              durMs: 900,
            });
          }
        }

        // The closest pair at this sample, for the one near-miss slot.
        const gap = Math.abs(shown[a][t] - shown[b][t]);
        if (gap < NEAR && shown[a][t] < 0.97 && gap < closest.gap) closest = { gap, a, b };
      }
    }

    /* One spark at a time, for whichever pair is actually tightest. */
    if (closest.a >= 0 && ms - lastNearMs > 1200) {
      lastNearMs = ms;
      out.push({ ms, kind: "near", racer: closest.a, other: closest.b, intensity: 0.4, durMs: 600 });
    }

    prev = place;
    history.push({ t, place });
    if (history.length > 12) history.shift();
  }

  out.sort((a, b) => a.ms - b.ms);
  return out;
}

/**
 * How intense the presentation should be at a given moment, 0 to 1.
 *
 * A CURVE, NOT A SWITCH. The brief asked for the final stretch to ramp
 * rather than flip at a threshold, so this is a smooth rise across the
 * last 30% of the leader's progress. The renderer multiplies its effects
 * by it; nothing about the race changes, and the racers are not moving
 * any faster - it only looks like more is at stake, which by then it is.
 */
export function intensityAt(shown, t) {
  let lead = 0;
  for (let i = 0; i < shown.length; i++) if (shown[i][t] > lead) lead = shown[i][t];
  if (lead <= 0.7) return 0;
  const x = Math.min(1, (lead - 0.7) / 0.3);
  return x * x;                     // slow start, strong finish
}


/* The finish trajectory lives in src/arena/theatre.ts with the rest of the
   theatre, precomputed once per race and covered by theatre.spec.ts. */
export { finishTrajectories, presentFinish, coastProgress, settleOffset } from "./pixi-runtime.js";

/* =====================================================================
   THE SHOT. A 2D camera, chosen once per frame.
   ---------------------------------------------------------------------
   The Arena is a flat 2D race and stays one. This picks WHICH framing the
   wrapper should be wearing; the CSS does the rest with a transform on the
   track, so no racer's progress is touched by any of it.

   Deliberately few states, and each one has to earn its place: a camera
   that changes every second is not dramatic, it is unwatchable.
   ===================================================================== */
/*
  THREE STATES, DOWN FROM FIVE.

  The launch push and the ground-level hold on a lead change are gone. A
  camera that moves whenever anything happens competes with the racers for
  the eye, and the racers are the thing worth watching. What is left is a
  stable shot for four fifths of the race, a barely-there tightening as the
  leader reaches the last stretch, and a small push for the arrivals.
*/
export function raceShot({ leaderProgress, celebrating }) {
  if (celebrating) return "finish";
  if (leaderProgress >= 0.80) return "final";
  return "wide";
}

/* =====================================================================
   THE LEADERBOARD, WORKED OUT IN ONE PLACE.
   ---------------------------------------------------------------------
   Both views used to sort their own board inline, with the same rules
   written twice - which is exactly how two screens end up disagreeing
   about who is third. There is one implementation now and both call it.

   THE RULE, and the second half is the part that matters:

     still running   ranked by the DRAWN position, so the board agrees
                     with what is on screen
     finished        pinned by OFFICIAL finishMs, because once a pack is
                     all sitting at 1.0 the drawn positions are level and
                     would sort arbitrarily - the board could contradict
                     the result in its final seconds

   Nothing here computes a time. finishMs comes from simulate(); this only
   decides the order to show them in and does the subtraction for the gap.
   ===================================================================== */
export function boardState(sim, shown, elapsedMs) {
  const src = shown || sim.samples;
  const n = src.length;
  const tick = Math.max(0, Math.min(sim.frames, Math.round(elapsedMs / TICK_MS)));
  const finish = new Array(n);
  for (const o of sim.order) finish[o.index] = o.finishMs;
  const winnerMs = sim.order[0]?.finishMs ?? 0;

  const rows = Array.from({ length: n }, (_, i) => ({
    index: i,
    finishMs: finish[i],
    done: elapsedMs >= finish[i],
    progress: src[i][tick],
  }));

  rows.sort((a, b) => {
    if (a.done && b.done) return a.finishMs - b.finishMs;
    if (a.done) return -1;
    if (b.done) return 1;
    return (b.progress - a.progress) || (a.index - b.index);
  });

  return rows.map((r, place) => {
    /*
      gap is a LOCAL, not a sibling property. Reading r.gapMs inside the
      same object literal that defines gapMs reads the ORIGINAL row, which
      has no such field - so every label came out "+NaN" while the numbers
      beside it were perfectly correct.
    */
    const gap = r.finishMs - winnerMs;
    return {
      ...r,
      place,
      gapMs: gap,
      /* The winner shows a time, everybody else the gap to them. */
      label: !r.done ? ""
        : gap === 0 ? `${(r.finishMs / 1000).toFixed(2)}s`
        : `+${(gap / 1000).toFixed(2)}`,
    };
  });
}
