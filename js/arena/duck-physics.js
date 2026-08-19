// =====================================================================
// DFL Arena — equal-racer novelty race backbone
// ---------------------------------------------------------------------
// Deliberately simple: every racer starts equal, receives independent random
// pace changes, and continuously moves forward. There are no racer traits,
// handicaps, drafting, rubber-banding, comeback scripts, finish convergence,
// or finish-aware movement. The visible crossing IS the result.
// =====================================================================

export const DUCK_TICK_MS = 40;

function seededFallback(seed) {
  let a = (Number(seed) || 1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Use browser crypto when available. The seed exists only as a deterministic
// fallback for environments/tests without Web Crypto; it does not assign a
// winner or give any racer a persistent advantage.
function randomSource(seed) {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const word = new Uint32Array(1);
    return () => {
      cryptoObj.getRandomValues(word);
      return word[0] / 4294967296;
    };
  }
  return seededFallback(seed);
}

export function simulateForwardRace(racers, ticks, seed) {
  const n = racers.length;
  if (!n) return { samples: [], order: [], ticks, frames: 0, finishTick: 0 };

  const rand = randomSource(seed);
  const base = 1 / Math.max(1, Number(ticks) || 1);
  const maxTicks = Math.ceil(Math.max(1, ticks) * 3);

  const progress = new Float64Array(n);
  const speed = new Float64Array(n);
  const target = new Float64Array(n);
  const retargetAt = new Int32Array(n);
  const finishTick = new Float64Array(n).fill(-1);
  const samples = Array.from({ length: n }, () => new Float32Array(maxTicks + 1));

  // Everyone is born equal. Only independent random pace changes separate them.
  for (let i = 0; i < n; i++) {
    const initial = base * (0.72 + rand() * 0.56);
    speed[i] = initial;
    target[i] = initial;
    retargetAt[i] = 2 + Math.floor(rand() * 8);
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

      // Frequent independent pace changes create the passing and bunching.
      // This rule is identical at 5%, 50%, and 99% of the course.
      if (t >= retargetAt[i]) {
        target[i] = base * (0.50 + rand() * 1.10);
        retargetAt[i] = t + 2 + Math.floor(rand() * 10);
      }

      // Smooth the random changes enough to look like motion, not teleporting.
      speed[i] += (target[i] - speed[i]) * 0.28;
      speed[i] = Math.max(base * 0.42, Math.min(base * 1.68, speed[i]));

      const before = progress[i];
      progress[i] += speed[i];

      if (progress[i] >= 1) {
        const fraction = speed[i] > 0 ? (1 - before) / speed[i] : 1;
        finishTick[i] = (t - 1) + Math.max(0, Math.min(1, fraction));
        progress[i] = 1;
        done++;
      }

      samples[i][t] = progress[i];
    }
  }

  // Positive minimum speed means this should only cover pathological inputs.
  for (let i = 0; i < n; i++) {
    if (finishTick[i] < 0) {
      const remaining = Math.max(0, 1 - progress[i]);
      finishTick[i] = lastWritten + remaining / Math.max(speed[i], base * 0.42);
    }
    for (let t = lastWritten + 1; t <= maxTicks; t++) samples[i][t] = 1;
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
