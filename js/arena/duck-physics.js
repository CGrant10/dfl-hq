// =====================================================================
// DFL Arena — equal-racer novelty race backbone
// ---------------------------------------------------------------------
// Every racer still enters equal. The seed chooses a fresh race personality:
// most lanes run broad independent pace phases, while 2–4 randomly selected
// lanes get temporary STORY ARCS (breakaway, comeback, fade, yo-yo). Nobody
// owns a permanent trait and no role is tied to a member. A new seed reshuffles
// all of it.
//
// Before P1: make the race readable, volatile and surprising — especially on
// a phone. After P1: drama is over; the existing run-home gets everybody across
// the frozen finish scene quickly.
// =====================================================================

export const DUCK_TICK_MS = 40;

export const HOME_STRETCH_START = 0.90;
export const HOME_STRETCH_MIN_MULTIPLIER = 1.75;
export const POST_WIN_MIN_MULTIPLIER = 8.0;
export const POST_WIN_MAX_MULTIPLIER = 9.0;

export function homeStretchFloor(base, currentSpeed) {
  return Math.max(Number(currentSpeed) || 0, Math.max(0, Number(base) || 0) * HOME_STRETCH_MIN_MULTIPLIER);
}

/*
  SEEDED, ALWAYS.

  Broadcast and Arena both simulate locally from the same seed. Using crypto
  here made that contract false: two viewers could receive the same seed and
  draw different races. A race can be unpredictable to people without being
  nondeterministic to the app.
*/
function randomSource(seed) {
  let a = (Number(seed) || 1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Normal lanes are still plenty unruly. These broad bands keep the whole pack
   alive while the story racers create the giant, phone-readable swings. */
function randomPace(base, rand) {
  const roll = rand();
  if (roll < 0.24) return base * (0.08 + rand() * 0.34);  // collapse
  if (roll > 0.76) return base * (2.00 + rand() * 1.55);  // surge
  return base * (0.42 + rand() * 1.42);                   // broad normal
}

const STORY_TYPES = ["breakaway", "comeback", "fade", "yoyo"];

function pickStoryRacers(n, rand) {
  if (n < 2) return new Map();
  const ids = Array.from({ length: n }, (_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const min = Math.min(n, n >= 8 ? 2 : 1);
  const max = Math.min(n, n >= 10 ? 4 : 3);
  const count = min + Math.floor(rand() * (max - min + 1));
  const stories = new Map();
  for (let k = 0; k < count; k++) {
    const type = STORY_TYPES[Math.floor(rand() * STORY_TYPES.length)];
    stories.set(ids[k], makeStory(type, rand));
  }
  return stories;
}

/*
  A story is a TEMPORARY race shape, not a winner script.

  segment.end is fraction of the expected race duration, not progress. That is
  deliberate: a comeback racer can genuinely be far behind when its recovery
  begins, and a breakaway can build a visible lead before the field reacts.
  Multipliers are randomized inside each archetype so two "comeback" races do
  not look like copies of each other.
*/
function makeStory(type, rand) {
  const jitter = (lo, hi) => lo + rand() * (hi - lo);
  if (type === "breakaway") {
    const keepIt = rand() < 0.42;
    return {
      type,
      segments: [
        { end: jitter(0.18, 0.25), mult: jitter(3.15, 3.65) },
        { end: jitter(0.42, 0.55), mult: keepIt ? jitter(2.05, 2.70) : jitter(0.45, 0.78) },
        { end: 0.82, mult: keepIt ? jitter(1.55, 2.20) : jitter(0.82, 1.30) },
      ],
    };
  }
  if (type === "comeback") {
    return {
      type,
      segments: [
        { end: jitter(0.20, 0.30), mult: jitter(0.08, 0.28) },
        { end: jitter(0.42, 0.53), mult: jitter(0.55, 1.05) },
        { end: jitter(0.67, 0.78), mult: jitter(3.05, 3.65) },
        { end: 0.90, mult: jitter(1.25, 2.15) },
      ],
    };
  }
  if (type === "fade") {
    return {
      type,
      segments: [
        { end: jitter(0.22, 0.32), mult: jitter(2.45, 3.25) },
        { end: jitter(0.45, 0.58), mult: jitter(1.65, 2.25) },
        { end: jitter(0.67, 0.76), mult: jitter(0.12, 0.38) },
        { end: 0.90, mult: jitter(0.68, 1.18) },
      ],
    };
  }
  return {
    type: "yoyo",
    segments: [
      { end: jitter(0.15, 0.22), mult: jitter(2.55, 3.55) },
      { end: jitter(0.30, 0.38), mult: jitter(0.10, 0.34) },
      { end: jitter(0.47, 0.58), mult: jitter(2.75, 3.65) },
      { end: jitter(0.63, 0.72), mult: jitter(0.16, 0.46) },
      { end: 0.90, mult: jitter(1.70, 2.80) },
    ],
  };
}

function storyPace(story, raceFraction, base, rand) {
  if (!story) return null;
  const segment = story.segments.find((s) => raceFraction <= s.end);
  if (!segment) return null;
  /* Tiny texture keeps an arc alive instead of making it look like a robot at
     one exact speed, without erasing the shape of the arc. */
  return base * segment.mult * (0.94 + rand() * 0.12);
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
  const stories = pickStoryRacers(n, rand);

  for (let i = 0; i < n; i++) {
    const scripted = storyPace(stories.get(i), 0, base, rand);
    const initial = scripted ?? randomPace(base, rand);
    speed[i] = initial;
    target[i] = initial;
    retargetAt[i] = 7 + Math.floor(rand() * 23); // 0.28–1.16s
  }

  let done = 0;
  let winnerTick = -1;
  let lastWritten = 0;
  for (let t = 0; t <= maxTicks && done < n; t++) {
    lastWritten = t;
    const raceFraction = t / Math.max(1, Number(ticks) || 1);

    for (let i = 0; i < n; i++) {
      if (finishTick[i] >= 0) { samples[i][t] = 1; continue; }

      const winnerIsHome = winnerTick >= 0;
      const story = stories.get(i);

      if (!winnerIsHome && t >= retargetAt[i]) {
        const scripted = storyPace(story, raceFraction, base, rand);
        target[i] = scripted ?? randomPace(base, rand);
        /* Story racers refresh a little faster so their collapse/recovery
           transitions look decisive. Normal lanes breathe slightly longer. */
        retargetAt[i] = t + (story ? 6 + Math.floor(rand() * 14) : 8 + Math.floor(rand() * 24));
      }

      if (progress[i] >= HOME_STRETCH_START && homeSpeed[i] === 0) {
        homeSpeed[i] = homeStretchFloor(base, speed[i]);
      }
      if (homeSpeed[i] > 0 && target[i] < homeSpeed[i]) target[i] = homeSpeed[i];

      /* Winner decided: kill the drama and clear the field. */
      if (winnerIsHome) {
        const runHome = Math.max(base * POST_WIN_MIN_MULTIPLIER, speed[i]);
        if (target[i] < runHome) target[i] = runHome;
      }

      speed[i] += (target[i] - speed[i]) * (winnerIsHome ? 0.72 : story ? 0.42 : 0.31);
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
