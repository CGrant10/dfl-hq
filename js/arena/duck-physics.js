// =====================================================================
// DFL Arena — equal-racer novelty race backbone
// =====================================================================
export const DUCK_TICK_MS = 40;
export const HOME_STRETCH_START = 0.90;
export const HOME_STRETCH_MIN_MULTIPLIER = 1.75;
export const POST_WIN_MIN_MULTIPLIER = 8.0;
export const POST_WIN_MAX_MULTIPLIER = 9.0;

export function homeStretchFloor(base, currentSpeed) {
  return Math.max(Number(currentSpeed) || 0, Math.max(0, Number(base) || 0) * HOME_STRETCH_MIN_MULTIPLIER);
}

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

function randomPace(base, rand) {
  const roll = rand();
  if (roll < 0.24) return base * (0.08 + rand() * 0.34);
  if (roll > 0.76) return base * (2.00 + rand() * 1.55);
  return base * (0.42 + rand() * 1.42);
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

function makeStory(type, rand) {
  const jitter = (lo, hi) => lo + rand() * (hi - lo);
  if (type === "breakaway") {
    const keepIt = rand() < 0.42;
    return { type, segments: [
      { end: jitter(0.18, 0.25), mult: jitter(3.15, 3.65) },
      { end: jitter(0.42, 0.55), mult: keepIt ? jitter(2.05, 2.70) : jitter(0.45, 0.78) },
      { end: 0.82, mult: keepIt ? jitter(1.55, 2.20) : jitter(0.82, 1.30) },
    ]};
  }
  if (type === "comeback") return { type, segments: [
    { end: jitter(0.20, 0.30), mult: jitter(0.08, 0.28) },
    { end: jitter(0.42, 0.53), mult: jitter(0.55, 1.05) },
    { end: jitter(0.67, 0.78), mult: jitter(3.05, 3.65) },
    { end: 0.90, mult: jitter(1.25, 2.15) },
  ]};
  if (type === "fade") return { type, segments: [
    { end: jitter(0.22, 0.32), mult: jitter(2.45, 3.25) },
    { end: jitter(0.45, 0.58), mult: jitter(1.65, 2.25) },
    { end: jitter(0.67, 0.76), mult: jitter(0.12, 0.38) },
    { end: 0.90, mult: jitter(0.68, 1.18) },
  ]};
  return { type: "yoyo", segments: [
    { end: jitter(0.15, 0.22), mult: jitter(2.55, 3.55) },
    { end: jitter(0.30, 0.38), mult: jitter(0.10, 0.34) },
    { end: jitter(0.47, 0.58), mult: jitter(2.75, 3.65) },
    { end: jitter(0.63, 0.72), mult: jitter(0.16, 0.46) },
    { end: 0.90, mult: jitter(1.70, 2.80) },
  ]};
}

function storyPace(story, raceFraction, base, rand) {
  if (!story) return null;
  const segment = story.segments.find((s) => raceFraction <= s.end);
  if (!segment) return null;
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
  const clearSpeed = new Float64Array(n);
  const finishTick = new Float64Array(n).fill(-1);
  const samples = Array.from({ length: n }, () => new Float32Array(maxTicks + 1));
  const stories = pickStoryRacers(n, rand);

  for (let i = 0; i < n; i++) {
    const scripted = storyPace(stories.get(i), 0, base, rand);
    const initial = scripted ?? randomPace(base, rand);
    speed[i] = initial;
    target[i] = initial;
    retargetAt[i] = 7 + Math.floor(rand() * 23);
  }

  let done = 0;
  let winnerTick = -1;
  let clearLocked = false;
  let lastWritten = 0;

  for (let t = 0; t <= maxTicks && done < n; t++) {
    lastWritten = t;
    const raceFraction = t / Math.max(1, Number(ticks) || 1);

    // P1 is home: the race story is OVER. Freeze the standings as they are and
    // give every unfinished racer a direct crossing velocity. Closest racers
    // clear first, but even last place is gone in roughly 1.7 seconds.
    if (winnerTick >= 0 && !clearLocked) {
      const unfinished = Array.from({ length: n }, (_, i) => i)
        .filter((i) => finishTick[i] < 0)
        .sort((a, b) => progress[b] - progress[a] || a - b);
      unfinished.forEach((i, rank) => {
        const clearTicks = 20 + rank * 2;
        clearSpeed[i] = Math.max(base * POST_WIN_MIN_MULTIPLIER, (1 - progress[i]) / clearTicks);
      });
      clearLocked = true;
    }

    for (let i = 0; i < n; i++) {
      if (finishTick[i] >= 0) { samples[i][t] = 1; continue; }
      const winnerIsHome = winnerTick >= 0;
      const story = stories.get(i);

      if (winnerIsHome && clearSpeed[i] > 0) {
        speed[i] = clearSpeed[i];
        target[i] = clearSpeed[i];
      } else {
        if (t >= retargetAt[i]) {
          const scripted = storyPace(story, raceFraction, base, rand);
          target[i] = scripted ?? randomPace(base, rand);
          retargetAt[i] = t + (story ? 6 + Math.floor(rand() * 14) : 8 + Math.floor(rand() * 24));
        }

        if (progress[i] >= HOME_STRETCH_START && homeSpeed[i] === 0) {
          homeSpeed[i] = homeStretchFloor(base, speed[i]);
        }
        if (homeSpeed[i] > 0 && target[i] < homeSpeed[i]) target[i] = homeSpeed[i];

        speed[i] += (target[i] - speed[i]) * (story ? 0.42 : 0.31);
        speed[i] = Math.max(base * 0.04, Math.min(base * 3.65, speed[i]));
      }

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
