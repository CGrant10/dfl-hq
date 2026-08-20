// =====================================================================
// DFL Arena — equal-racer novelty race backbone
// ---------------------------------------------------------------------
// Every racer starts equal. Independent random pace PHASES create the race:
// somebody can open a huge gap, get reeled in, or fly through the field.
// There are no traits, handicaps, drafting, rubber-banding, comeback scripts,
// or finish-order shaping before first place is decided. The visible crossing
// is truth. Once P1 crosses, the remaining field gets a simple run-home boost
// so the result completes promptly instead of turning into slow-mo theatre.
// =====================================================================

export const DUCK_TICK_MS = 40;

/*
  THE HOME STRETCH IS NOT ALLOWED TO PRESERVE A CRAWL.

  A pace phase can legitimately fall to 10% of normal. That is funny in the
  middle of the race, but the old home-run rule captured whatever speed a racer
  happened to have at 86% and made it their FLOOR through the line. If they
  entered the last 14% during a crawl, the crawl became permanent.

  Keep the pre-winner race natural. Once somebody actually wins, however, the
  race has already answered its main question. At that point every unfinished
  racer gets a strong minimum target and stops rerolling pace phases. They still
  cross from their real current positions, in their real order as the run-home
  unfolds; they just do not spend ages crawling toward a line P1 already hit.
*/
export const HOME_STRETCH_START = 0.86;
export const HOME_STRETCH_MIN_MULTIPLIER = 2.4;
export const POST_WIN_MIN_MULTIPLIER = 3.35;

export function homeStretchFloor(base, currentSpeed) {
  return Math.max(Number(currentSpeed) || 0, Math.max(0, Number(base) || 0) * HOME_STRETCH_MIN_MULTIPLIER);
}

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
  let winnerTick = -1;
  let lastWritten = 0;
  for (let t = 0; t <= maxTicks && done < n; t++) {
    lastWritten = t;
    for (let i = 0; i < n; i++) {
      if (finishTick[i] >= 0) { samples[i][t] = 1; continue; }

      const winnerIsHome = winnerTick >= 0;

      /* Long pace phases are what make the field visibly stretch. Tiny rerolls
         average back toward a straight wall; these last 0.4–1.8 seconds. Once
         P1 is home, stop inventing new drama and get the field through. */
      if (!winnerIsHome && t >= retargetAt[i]) {
        target[i] = randomPace(base, rand);
        retargetAt[i] = t + 10 + Math.floor(rand() * 36);
      }

      if (progress[i] >= HOME_STRETCH_START && homeSpeed[i] === 0) {
        homeSpeed[i] = homeStretchFloor(base, speed[i]);
      }
      if (homeSpeed[i] > 0 && target[i] < homeSpeed[i]) target[i] = homeSpeed[i];

      /* P1 owns the dramatic finish. Everybody else gets the hell home.
         This is a target floor, not a teleport: position stays continuous and
         the normal momentum step visibly accelerates trailing racers. */
      if (winnerIsHome) {
        const runHome = Math.max(base * POST_WIN_MIN_MULTIPLIER, speed[i]);
        if (target[i] < runHome) target[i] = runHome;
      }

      speed[i] += (target[i] - speed[i]) * (winnerIsHome ? 0.38 : 0.22);
      speed[i] = Math.max(base * 0.08, Math.min(base * 3.65, speed[i]));

      const before = progress[i];
      progress[i] += speed[i];

      if (progress[i] >= 1) {
        const fraction = speed[i] > 0 ? (1 - before) / speed[i] : 1;
        finishTick[i] = (t - 1) + Math.max(0, Math.min(1, fraction));
        progress[i] = 1;
        done++;
        if (winnerTick < 0) winnerTick = finishTick[i];
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
