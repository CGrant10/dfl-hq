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
    talent.push(0.93 + rand() * 0.14);   // 0.93 - 1.07
    clutch.push(0.90 + rand() * 0.26);   // who shows up at the end
    jitter.push(0.55 + rand() * 0.9);    // how erratic they are
  }

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
      let want = BASE * talent[i];

      // drifting noise, scaled by how erratic they are
      want *= 1 + (rand() - 0.5) * 0.22 * jitter[i];

      if (burst[i] > 0)   want *= 1.35;
      if (stumble[i] > 0) want *= 0.72;

      // Drafting: behind the pack pulls you forward, out front holds you
      // back. Small, but it is what keeps the field racing each other.
      want *= 1 + (packMean - frac) * 0.55;

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
   THE THEATRE LAYER
   ---------------------------------------------------------------------
   simulate() decides the race. This does not, and must not.

   WHY IT IS A SEPARATE PASS. The Arena is a decider - a race settles the
   draft order, and saveResults() stores the finishing order together with
   its seed so a completed event can be replayed and watched again. That
   makes the physics in simulate() effectively historical data: change a
   constant up there and every event ever run replays with a different
   winner than the one recorded in arena_results. So the drama is added
   AFTERWARDS, to the drawing only.

   WHAT IT GUARANTEES, and these are the whole contract:

     1. sim.order is untouched. Who wins, and by how much, is exactly what
        simulate() decided.
     2. The wobble is scaled by (1 - progress), so it is at its largest at
        the start and mathematically zero at the line. The last stretch is
        the true race, which is why the finish still matches the result.
     3. A racer never moves backwards. Being passed is somebody else
        moving faster, never you sliding back - that reads as a glitch.
        The shown position is monotonic, so a wobble that wants to pull a
        racer back becomes a STALL instead, which is what a real one looks
        like anyway.
     4. Nobody visually crosses the line before they actually finish.

   Seeded from the race's own seed, so a replay is the same performance as
   well as the same result.
   ===================================================================== */

/** How far ahead of or behind the truth a racer may be drawn, at the start. */
const THEATRE = 0.085;

/**
 * Visual positions for playback.
 *
 * @param {object} sim  the return value of simulate()
 * @param {number} seed the same seed the race was run with
 * @returns {Float32Array[]} shown[i][t], safe to draw instead of samples
 */
export function dramatize(sim, seed) {
  const n = sim.samples.length;
  if (!n) return sim.samples;
  const rand = rng(((seed >>> 0) ^ 0x9e3779b9) >>> 0);
  const frames = sim.frames;

  /* Each racer gets a character: two slow waves at different rates, so the
     combined motion never looks like a metronome, plus a personal share of
     the amplitude. Drawn once, from the seed. */
  const wave = [];
  for (let i = 0; i < n; i++) {
    wave.push({
      a1: 0.55 + rand() * 0.75, f1: 0.9 + rand() * 1.8, p1: rand() * Math.PI * 2,
      a2: 0.30 + rand() * 0.55, f2: 2.3 + rand() * 3.4, p2: rand() * Math.PI * 2,
      amp: 0.65 + rand() * 0.7,
      /* One scripted late push each, somewhere in the middle third - the
         "here he comes" beat. It is theatre: it cannot change the result,
         because the wobble is zero by the time it matters. */
      pushAt: 0.34 + rand() * 0.3,
      pushAmp: rand() < 0.6 ? 0.5 + rand() * 0.9 : 0,
    });
  }

  const shown = Array.from({ length: n }, () => new Float32Array(frames + 1));

  for (let i = 0; i < n; i++) {
    const w = wave[i];
    const src = sim.samples[i];
    let prev = 0;
    for (let t = 0; t <= frames; t++) {
      const truth = src[t];

      /* Zero at the line. (1-p)^1.35 keeps the wobble alive through the
         middle of the race and then folds it away quickly over the last
         quarter, so the run-in is real racing rather than a sudden snap. */
      const fade = truth >= 1 ? 0 : Math.pow(1 - truth, 1.35);

      const phase = truth * Math.PI * 2;
      let wob = Math.sin(phase * w.f1 + w.p1) * w.a1
              + Math.sin(phase * w.f2 + w.p2) * w.a2;

      // The late push: a bump centred on this racer's own moment.
      if (w.pushAmp) {
        const d = (truth - w.pushAt) / 0.16;
        wob += w.pushAmp * Math.exp(-d * d);
      }

      let p = truth + wob * w.amp * THEATRE * fade;

      // Never backwards, never early over the line.
      if (p < prev) p = prev;
      if (truth < 1 && p > 0.985) p = 0.985;
      if (p < 0) p = 0;
      if (truth >= 1) p = 1;

      shown[i][t] = p;
      prev = p;
    }
  }
  return shown;
}

/**
 * Moments worth calling out, read off the DRAWN race.
 *
 * Only three kinds, and every one is a fact about this race rather than a
 * generated phrase: a change of leader, and how close the finish was.
 * There is no points data in an Arena event - it is a race, not a
 * scoreboard - so there is nothing here about swings or margins in points,
 * because inventing those would be inventing statistics.
 *
 * @returns {Array<{ms:number,text:string}>} sorted, sparse
 */
export function callouts(sim, shown, racers) {
  const n = shown.length;
  if (n < 2) return [];
  const out = [];
  const nameOf = (i) => racers[i]?.name || `Racer ${i + 1}`;

  let leader = -1;
  let lastCallMs = -4000;
  for (let t = 0; t <= sim.frames; t++) {
    let top = 0;
    for (let i = 1; i < n; i++) if (shown[i][t] > shown[top][t]) top = i;
    if (top !== leader) {
      const ms = t * TICK_MS;
      /* The opening leader is not a lead CHANGE, and two calls on top of
         each other is noise rather than commentary - four seconds apart at
         the least, and never in the last beat where the finish speaks for
         itself. */
      if (leader >= 0 && ms - lastCallMs > 4000 && shown[top][t] < 0.94) {
        out.push({ ms, text: `${nameOf(top)} takes the lead` });
        lastCallMs = ms;
      }
      leader = top;
    }
  }

  /* The finish, from the REAL result rather than from the drawing. */
  const first = sim.order[0], second = sim.order[1];
  if (first && second) {
    const gap = (second.finishMs - first.finishMs) / 1000;
    if (gap <= 0.25) out.push({ ms: first.finishMs, text: `Photo finish — ${gap.toFixed(2)}s` });
    else if (gap <= 1) out.push({ ms: first.finishMs, text: `${gap.toFixed(2)}s in it` });
  }
  return out.sort((a, b) => a.ms - b.ms);
}
