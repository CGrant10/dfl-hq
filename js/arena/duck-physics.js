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

// The field is deliberately re-dealt over and over. These are not gentle
// endurance curves; they are visible race moments. A racer can suddenly get
// hot, lose the motor, recover, or steal the lead late. Shorter phases plus
// hard speed changes keep the order vulnerable all the way to the stripe.
function pickStories(n, rand) {
  const stories = new Map(Array.from({ length: n }, (_, i) => [i, { type: "battle", segments: [] }]));
  const ids = Array.from({ length: n }, (_, i) => i);
  const phaseCount = 21 + Math.floor(rand() * 4); // 21-24 abrupt battle phases
  const storyEnd = 0.995;
  let end = 0;

  for (let phase = 0; phase < phaseCount; phase++) {
    const remaining = storyEnd - end;
    const slotsLeft = phaseCount - phase;
    const span = phase === phaseCount - 1
      ? remaining
      : clamp(remaining / slotsLeft * (0.86 + rand() * 0.28), 0.024, 0.055);
    end = Math.min(storyEnd, end + span);

    const order = shuffle(ids, rand);
    const late = end > 0.68;
    const veryLate = end > 0.86;

    // Three or four racers attack while a different three or four fade. This
    // makes each phase a visible exchange of momentum instead of everybody
    // changing together and preserving the same order.
    const attackCount = Math.min(n, n >= 10 ? (rand() < 0.5 ? 3 : 4) : 3);
    const fadeCount = Math.min(Math.max(0, n - attackCount), n >= 10 ? 4 : 3);
    const attackers = new Set(order.slice(0, attackCount));
    const faders = new Set(order.slice(attackCount, attackCount + fadeCount));

    for (const id of ids) {
      let mult;
      if (attackers.has(id)) {
        mult = (late ? 3.35 : 2.95) + rand() * (veryLate ? 1.75 : 1.45);
      } else if (faders.has(id)) {
        mult = (veryLate ? 0.008 : 0.025) + rand() * (late ? 0.16 : 0.24);
      } else {
        const softAttack = ((phase + id) & 1) === 0;
        mult = softAttack
          ? 1.55 + rand() * 0.95
          : 0.28 + rand() * 0.44;
      }
      stories.get(id).segments.push({ end, mult });
    }
  }

  return stories;
}

function storyPace(story, raceFraction, base, rand) {
  const segment = story?.segments?.find((s) => raceFraction <= s.end);
  if (!segment) return base * (0.70 + rand() * 0.60);
  return base * segment.mult * (0.985 + rand() * 0.03);
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
    retargetAt[i] = 1 + Math.floor(rand() * 3);
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
          retargetAt[i] = t + 1 + Math.floor(rand() * 3);

          // This is the feel change: hit the new phase NOW. Taking 94% of the
          // target delta on the retarget frame turns a fade into a visible
          // stumble and a surge into a visible launch instead of a slow glide.
          speed[i] += (target[i] - speed[i]) * 0.94;
        } else {
          // Finish the transition almost immediately, but leave a hair of
          // inertia so the sprite still reads as running rather than teleporting.
          speed[i] += (target[i] - speed[i]) * 0.84;
        }
        speed[i] = clamp(speed[i], base * 0.005, base * 5.2);
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
