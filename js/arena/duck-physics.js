// =====================================================================
// Arena forward-only race physics
// ---------------------------------------------------------------------
// Inspired by the simple feel of novelty character races: racers continuously
// move forward, their pace wanders, and whoever physically reaches 1.0 first
// wins. The finish line has ZERO influence on movement.
//
// Same seed => same recording. Slow devices only drop display frames; they do
// not change the result because the whole sample track is deterministic.
// =====================================================================

export const DUCK_TICK_MS = 40;

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

/**
 * Forward-only race.
 *
 * `ticks` is the approximate duration for an average racer, not a deadline.
 * Racers keep moving until every one physically crosses progress 1.0.
 */
export function simulateForwardRace(racers, ticks, seed) {
  const n = racers.length;
  if (!n) return { samples: [], order: [], ticks, frames: 0, finishTick: 0 };

  const rand = rng(Number(seed) || 1);
  const base = 1 / Math.max(1, ticks);
  const maxTicks = Math.ceil(ticks * 2.75);

  const progress = new Float64Array(n);
  const speed = new Float64Array(n);
  const target = new Float64Array(n);
  const retargetAt = new Int32Array(n);
  const finishTick = new Float64Array(n).fill(-1);
  const samples = Array.from({ length: n }, () => new Float32Array(maxTicks + 1));

  // Small stable personality difference, but nobody is assigned a winner.
  const personality = Array.from({ length: n }, () => 0.94 + rand() * 0.12);

  for (let i = 0; i < n; i++) {
    const initial = base * personality[i] * (0.86 + rand() * 0.28);
    speed[i] = initial;
    target[i] = initial;
    retargetAt[i] = 3 + Math.floor(rand() * 8);
  }

  let done = 0;
  let lastWritten = 0;

  for (let t = 0; t <= maxTicks && done < n; t++) {
    lastWritten = t;

    for (let i = 0; i < n; i++) {
      if (finishTick[i] >= 0) {
        samples[i][t] = 1;
        continue;
      }

      const homeStretch = progress[i] >= 0.82;

      // Pace changes every ~120-520ms. This is the whole drama: no arcs,
      // rubber-banding, drafting, comeback scripts or finish-line logic.
      if (t >= retargetAt[i]) {
        const wander = 0.62 + rand() * 0.86; // broad enough for real passes
        const nextTarget = base * personality[i] * wander;

        /*
          RUN THROUGH THE STRIPE.

          Novelty races read cleanly because nobody gets a fresh braking event
          in the final few feet. Once a racer is genuinely coming home, their
          pace may hold or improve but it never decays. The finish line itself
          still has no input here; this is simply a no-brakes closing stretch.
        */
        target[i] = homeStretch
          ? Math.max(target[i], speed[i], nextTarget, base * 1.02)
          : nextTarget;
        retargetAt[i] = t + 3 + Math.floor(rand() * 11);
      }

      // Momentum keeps the random pace changes looking like running rather
      // than teleporting between velocities.
      const beforeSpeed = speed[i];
      speed[i] += (target[i] - speed[i]) * 0.22;
      if (homeStretch && speed[i] < beforeSpeed) speed[i] = beforeSpeed;

      // Always moving. The finish line cannot slow, stop, hold or reverse one.
      const floor = homeStretch ? base * 1.02 : base * 0.44;
      const ceiling = base * 1.62;
      if (speed[i] < floor) speed[i] = floor;
      if (speed[i] > ceiling) speed[i] = ceiling;

      const before = progress[i];
      progress[i] += speed[i];

      if (progress[i] >= 1) {
        // Exact sub-tick crossing. What reaches the line on screen is what gets
        // timed; there is no separate appointment with an official finish.
        const fraction = speed[i] > 0 ? (1 - before) / speed[i] : 1;
        finishTick[i] = (t - 1) + Math.max(0, Math.min(1, fraction));
        progress[i] = 1;
        done++;
      }

      samples[i][t] = progress[i];
    }
  }

  // Emergency only. With the positive floor, ordinary races finish far before
  // this; if a pathological input gets here, continue mathematically rather
  // than visually parking somebody near the stripe.
  for (let i = 0; i < n; i++) {
    if (finishTick[i] < 0) {
      const remaining = Math.max(0, 1 - progress[i]);
      finishTick[i] = lastWritten + remaining / Math.max(speed[i], base * 0.44);
    }
    const held = samples[i][lastWritten] || Math.min(1, progress[i]);
    for (let t = lastWritten + 1; t <= maxTicks; t++) samples[i][t] = held;
  }

  const order = racers
    .map((r, index) => ({ racer: r, index, finishMs: Math.round(finishTick[index] * DUCK_TICK_MS) }))
    .sort((a, b) => a.finishMs - b.finishMs || a.index - b.index)
    .map((row, i) => ({ ...row, place: i + 1 }));

  return {
    samples,
    order,
    ticks,
    frames: maxTicks,
    finishTick: Math.max(...finishTick),
  };
}
