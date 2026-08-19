// =====================================================================
// DFL Arena — equal-racer novelty race backbone
// ---------------------------------------------------------------------
// Every racer starts equal. Independent random pace PHASES create the race:
// somebody can open a huge gap, get reeled in, or fly through the field.
// There are no traits, handicaps, drafting, rubber-banding, comeback scripts,
// or finish-order shaping. The visible crossing is truth.
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

function randomPace(base, rand) {
  const roll = rand();
  // Not subtle on purpose. These phases must read on a phone-sized track.
  if (roll < 0.22) return base * (0.10 + rand() * 0.30);   // crawl / collapse
  if (roll > 0.80) return base * (2.00 + rand() * 1.50);   // rocket / breakaway
  return base * (0.48 + rand() * 1.22);                    // normal race pace
}

export function simulateForwardRace(racers, ticks, seed) {
  const n = racers.length;
  if (!n) return { samples: [], order: [], ticks, frames: 0, finishTick: 0 };

  const rand = randomSource(seed);
  const base = 1 / Math.max(1, Number(ticks) || 1);
  const maxTicks = Math.ceil(Math.max(1, ticks) * 5);
  const progress = new Float64Array(n);
  const speed = new Float64Array(n);
  const target = new Float64Array(n);
  const retargetAt = new Int32Array(n);
  const homeSpeed = new Float64Array(n);
  const finishTick = new Float64Array(n).fill(-1);
  const samples = Array.from({ length: n }, () => new Float32Array(maxTicks + 1));

  for (let i = 0; i < n; i++) {
    const initial = randomPace(base, rand);
    speed[i] = initial;
    target[i] = initial;
    retargetAt[i] = 10 + Math.floor(rand() * 27);
  }

  let done = 0;
  let lastWritten = 0;
  for (let t = 0; t <= maxTicks && done < n; t++) {
    lastWritten = t;
    for (let i = 0; i < n; i++) {
      if (finishTick[i] >= 0) { samples[i][t] = 1; continue; }

      /* Long pace phases are what make the field visibly stretch. Tiny rerolls
         average back toward a straight wall; these last 0.4–1.8 seconds. */
      if (t >= retargetAt[i]) {
        target[i] = randomPace(base, rand);
        retargetAt[i] = t + 10 + Math.floor(rand() * 36);
      }

      /* Once somebody is genuinely on the home run, the stripe is not allowed
         to look like a brake pedal. Whatever speed they carry into the final
         14% is their FLOOR through the line; they may still accelerate. */
      if (progress[i] >= 0.86 && homeSpeed[i] === 0) homeSpeed[i] = speed[i];
      if (homeSpeed[i] > 0 && target[i] < homeSpeed[i]) target[i] = homeSpeed[i];

      speed[i] += (target[i] - speed[i]) * 0.22;
      speed[i] = Math.max(base * 0.08, Math.min(base * 3.65, speed[i]));
      if (homeSpeed[i] > 0 && speed[i] < homeSpeed[i]) speed[i] = homeSpeed[i];

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

  for (let i = 0; i < n; i++) {
    if (finishTick[i] < 0) {
      const remaining = Math.max(0, 1 - progress[i]);
      finishTick[i] = lastWritten + remaining / Math.max(speed[i], base * 0.08);
    }
    for (let t = lastWritten + 1; t <= maxTicks; t++) samples[i][t] = 1;
  }

  const order = racers
    .map((r, index) => ({ racer: r, index, finishMs: Math.round(finishTick[index] * DUCK_TICK_MS) }))
    .sort((a, b) => a.finishMs - b.finishMs || a.index - b.index)
    .map((row, i) => ({ ...row, place: i + 1 }));
  return { samples, order, ticks, frames: maxTicks, finishTick: Math.max(...finishTick) };
}
