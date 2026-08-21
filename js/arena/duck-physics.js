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

function shuffle(values, rand) {
  const out = values.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The old engine gave every racer an independent alternating story. That
// created separation, but those stories averaged out and the field often
// settled into a stable order halfway through the race. This schedule is
// coordinated instead: every phase deliberately assigns attackers, faders
// and chasers across the whole field so the LEAD itself keeps changing hands.
function pickStories(n, rand) {
  const stories = new Map(Array.from({ length: n }, (_, i) => [i, { type: "battle", segments: [] }]));
  const ids = Array.from({ length: n }, (_, i) => i);
  const phaseCount = 18 + Math.floor(rand() * 4); // 18-21 contested phases
  const storyEnd = 0.992;
  let end = 0;

  for (let phase = 0; phase < phaseCount; phase++) {
    const remaining = storyEnd - end;
    const slotsLeft = phaseCount - phase;
    const span = phase === phaseCount - 1
      ? remaining
      : clamp(remaining / slotsLeft * (0.82 + rand() * 0.36), 0.034, 0.072);
    end = Math.min(storyEnd, end + span);

    const order = shuffle(ids, rand);
    const late = end > 0.72;
    const veryLate = end > 0.88;

    // Four attackers means there is always more than one racer capable of
    // eating a big gap in the same phase. Deep in the race the boosts get
    // stronger so a backmarker can still mount a real comeback.
    const attackers = new Set(order.slice(0, Math.min(4, n)));
    const faders = new Set(order.slice(Math.min(4, n), Math.min(8, n)));

    for (const id of ids) {
      let mult;
      if (attackers.has(id)) {
        mult = (late ? 3.15 : 2.75) + rand() * (veryLate ? 1.65 : 1.35);
      } else if (faders.has(id)) {
        mult = (veryLate ? 0.015 : 0.035) + rand() * (late ? 0.20 : 0.28);
      } else {
        // The middle pack still moves. Alternate between soft attack and soft
        // fade so nobody can just cruise at one pace for half the race.
        const softAttack = ((phase + id) & 1) === 0;
        mult = softAttack
          ? 1.45 + rand() * 0.85
          : 0.38 + rand() * 0.42;
      }
      stories.get(id).segments.push({ end, mult });
    }
  }

  return stories;
}

function storyPace(story, raceFraction, base, rand) {
  const segment = story?.segments?.find((s) => raceFraction <= s.end);
  if (!segment) return base * (0.72 + rand() * 0.56);
  return base * segment.mult * (0.98 + rand() * 0.04);
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
    retargetAt[i] = 2 + Math.floor(rand() * 5);
  }

  let done = 0;
  let winnerTick = -1;
  let clearLocked = false;
  let lastWritten = 0;

  for (let t = 0; t <= maxTicks && done < n; t++) {
    lastWritten = t;
    const raceFraction = t / Math.max(1, Number(ticks) || 1);

    // P1 is home. Freeze the exact field shape. Every unfinished racer gets
    // the same absolute speed, so their current gaps and order are carried
    // through the stripe instead of collapsing into a manufactured pack.
    if (winnerTick >= 0 && !clearLocked) {
      const unfinished = Array.from({ length: n }, (_, i) => i)
        .filter((i) => finishTick[i] < 0);
      const farthestRemaining = unfinished.reduce(
        (max, i) => Math.max(max, Math.max(0, 1 - progress[i])), 0);
      const clearTicks = Math.max(1, Math.round(3000 / DUCK_TICK_MS));
      const commonSpeed = Math.max(base * 0.45, farthestRemaining / clearTicks);
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
          retargetAt[i] = t + 2 + Math.floor(rand() * 4);
        }

        // React quickly enough that a new battle phase visibly changes who is
        // gaining and losing ground instead of averaging into cruising speed.
        speed[i] += (target[i] - speed[i]) * 0.74;
        speed[i] = clamp(speed[i], base * 0.008, base * 4.9);
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
