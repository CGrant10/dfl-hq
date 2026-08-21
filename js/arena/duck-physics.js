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

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function makeBoomerangStory(rand, strength = 1) {
  const segments = [];
  const segmentCount = 7 + Math.floor(rand() * 3);
  let end = 0;
  let high = rand() < 0.5;

  for (let i = 0; i < segmentCount; i++) {
    const remaining = 0.91 - end;
    const slotsLeft = segmentCount - i;
    const span = i === segmentCount - 1
      ? remaining
      : clamp(remaining / slotsLeft * (0.72 + rand() * 0.56), 0.055, 0.16);
    end = Math.min(0.91, end + span);

    const raw = high ? 1.65 + rand() * 1.95 : 0.10 + rand() * 0.58;
    const mult = 1 + (raw - 1) * strength;
    segments.push({ end, mult });
    high = !high;
  }
  return { type: "boomerang", segments };
}

function pickStories(n, rand) {
  const ids = Array.from({ length: n }, (_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const headlineCount = Math.min(n, n >= 10 ? 4 : n >= 6 ? 3 : 2);
  const stories = new Map();
  ids.forEach((id, pos) => {
    const strength = pos < headlineCount ? 1 : 0.68 + rand() * 0.16;
    stories.set(id, makeBoomerangStory(rand, strength));
  });
  return stories;
}

function storyPace(story, raceFraction, base, rand) {
  const segment = story?.segments?.find((s) => raceFraction <= s.end);
  if (!segment) return base * (0.88 + rand() * 0.28);
  return base * segment.mult * (0.95 + rand() * 0.10);
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
  const clearSpeed = new Float64Array(n);
  const finishTick = new Float64Array(n).fill(-1);
  const samples = Array.from({ length: n }, () => new Float32Array(maxTicks + 1));
  const stories = pickStories(n, rand);

  for (let i = 0; i < n; i++) {
    const initial = storyPace(stories.get(i), 0, base, rand);
    speed[i] = initial;
    target[i] = initial;
    retargetAt[i] = 6 + Math.floor(rand() * 12);
  }

  let done = 0;
  let winnerTick = -1;
  let clearLocked = false;
  let lastWritten = 0;

  for (let t = 0; t <= maxTicks && done < n; t++) {
    lastWritten = t;
    const raceFraction = t / Math.max(1, Number(ticks) || 1);

    // Freeze the field shape when P1 crosses. Every unfinished racer receives
    // the same ABSOLUTE clear speed, so their spacing cannot accordion closed
    // and nobody can pass after the winner is home.
    if (winnerTick >= 0 && !clearLocked) {
      const unfinished = Array.from({ length: n }, (_, i) => i)
        .filter((i) => finishTick[i] < 0);
      const farthestRemaining = unfinished.reduce(
        (max, i) => Math.max(max, Math.max(0, 1 - progress[i])), 0);
      const clearTicks = Math.max(1, Math.round(1800 / DUCK_TICK_MS));
      const commonSpeed = Math.max(base * 0.8, farthestRemaining / clearTicks);
      unfinished.forEach((i) => { clearSpeed[i] = commonSpeed; });
      clearLocked = true;
    }

    for (let i = 0; i < n; i++) {
      if (finishTick[i] >= 0) { samples[i][t] = 1; continue; }
      const winnerIsHome = winnerTick >= 0;

      if (winnerIsHome && clearSpeed[i] > 0) {
        speed[i] = clearSpeed[i];
        target[i] = clearSpeed[i];
      } else {
        if (t >= retargetAt[i]) {
          target[i] = storyPace(stories.get(i), raceFraction, base, rand);
          retargetAt[i] = t + 4 + Math.floor(rand() * 8);
        }

        speed[i] += (target[i] - speed[i]) * 0.46;
        speed[i] = clamp(speed[i], base * 0.035, base * 3.75);
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
