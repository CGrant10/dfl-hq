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

  A pace phase can legitimately fall almost to a stop. That is funny in the
  middle of the race, but it should not turn the final few feet into molasses.
  Keep the floor late and modest so the field can still stretch, collapse and
  trade places deep into the race. Once somebody actually wins, however, the
  race has answered its main question and the separate post-win run-home takes
  over.
*/
export const HOME_STRETCH_START = 0.90;
export const HOME_STRETCH_MIN_MULTIPLIER = 1.75;
/*
  AFTER P1, THIS IS PRESENTATION PACE, NOT RACE DRAMA.

  The winner is already decided. The remaining field should visibly charge
  through a frozen finish scene rather than preserve a many-second simulated
  spread while a stationary line sits in the middle of the shot. This floor is
  intentionally strong and is paired with a higher post-win speed ceiling
  below. Nothing before P1 is touched by these post-win values.
*/
export const POST_WIN_MIN_MULTIPLIER = 8.0;
export const POST_WIN_MAX_MULTIPLIER = 9.0;

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

/*
  PHONE-SIZED DRAMA.

  The earlier bands were intentionally varied, but the middle band still held
  nearly sixty percent of rolls and its range clustered too close to normal.
  On a desktop that separation reads; compressed onto a phone it looks like a
  pack moving together.

  Give collapse and rocket phases equal weight, widen both ends, and leave a
  narrower but still useful normal band between them. The racers remain equal:
  every lane samples the exact same distribution, independently.
*/
function randomPace(base, rand) {
  const roll = rand();
  if (roll < 0.27) return base * (0.05 + rand() * 0.28);   // deep crawl / collapse
  if (roll > 0.73) return base * (2.20 + rand() * 1.45);   // rocket / breakaway
  return base * (0.38 + rand() * 1.42);                    // normal but broad
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
    /* 0.32–1.28s. Long enough to visibly open a gap, short enough that a
       twelve-racer field gets repeated chances to reverse itself. */
    retargetAt[i] = 8 + Math.floor(rand() * 25);
  }

  let done = 0;
  let winnerTick = -1;
  let lastWritten = 0;
  for (let t = 0; t <= maxTicks && done < n; t++) {
    lastWritten = t;
    for (let i = 0; i < n; i++) {
      if (finishTick[i] >= 0) { samples[i][t] = 1; continue; }

      const winnerIsHome = winnerTick >= 0;

      /*
        Pre-P1 phases are deliberately independent and moderately short. A
        collapse should have time to drop somebody through the pack, and a
        rocket should have time to rip back through it, but neither should own
        the race for several seconds. After P1, stop inventing drama entirely.
      */
      if (!winnerIsHome && t >= retargetAt[i]) {
        target[i] = randomPace(base, rand);
        retargetAt[i] = t + 8 + Math.floor(rand() * 25);
      }

      if (progress[i] >= HOME_STRETCH_START && homeSpeed[i] === 0) {
        homeSpeed[i] = homeStretchFloor(base, speed[i]);
      }
      if (homeSpeed[i] > 0 && target[i] < homeSpeed[i]) target[i] = homeSpeed[i];

      /* P1 owns the dramatic finish. Everybody else gets the hell home.
         Position stays continuous and place order still comes from crossing;
         only the already-decided run-home is deliberately compressed. */
      if (winnerIsHome) {
        const runHome = Math.max(base * POST_WIN_MIN_MULTIPLIER, speed[i]);
        if (target[i] < runHome) target[i] = runHome;
      }

      /* Sharper pre-P1 response makes pace changes readable on a narrow phone
         instead of smearing every phase into the previous one. */
      speed[i] += (target[i] - speed[i]) * (winnerIsHome ? 0.72 : 0.30);
      const maxSpeed = base * (winnerIsHome ? POST_WIN_MAX_MULTIPLIER : 3.65);
      speed[i] = Math.max(base * 0.04, Math.min(maxSpeed, speed[i]));

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
      finishTick[i] = lastWritten + remaining / Math.max(speed[i], base * 0.04);
    }
    for (let t = lastWritten + 1; t <= maxTicks; t++) samples[i][t] = 1;
  }

  const order = racers
    .map((r, index) => ({ racer: r, index, finishMs: Math.round(finishTick[index] * DUCK_TICK_MS) }))
    .sort((a, b) => a.finishMs - b.finishMs || a.index - b.index)
    .map((row, i) => ({ ...row, place: i + 1 }));
  return { samples, order, ticks, frames: maxTicks, finishTick: Math.max(...finishTick) };
}
