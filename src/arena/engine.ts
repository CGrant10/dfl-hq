import type { RaceRacer } from "./contracts";

export const TICK_MS = 40;

export const LENGTHS = {
  short: { label: "Short", ticks: 300 },
  medium: { label: "Medium", ticks: 550 },
  long: { label: "Long", ticks: 900 },
} as const;

export type RaceLengthKey = keyof typeof LENGTHS | "custom";

export interface FinishRow {
  racer: RaceRacer;
  index: number;
  finishMs: number;
  place: number;
}

export interface RaceSimulation {
  samples: Float32Array[];
  order: FinishRow[];
  ticks: number;
  frames: number;
  finishTick: number;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ticksFor(lengthKey: string, customTicks?: number | string | null): number {
  if (lengthKey === "custom") {
    const n = Number(customTicks);
    return Number.isFinite(n) && n > 60 ? Math.min(n, 3000) : LENGTHS.medium.ticks;
  }
  return LENGTHS[lengthKey as keyof typeof LENGTHS]?.ticks ?? LENGTHS.medium.ticks;
}

export function raceSeconds(lengthKey: string, customTicks?: number | string | null): number {
  return Math.round((ticksFor(lengthKey, customTicks) * TICK_MS) / 1000);
}

/** Exact typed port of js/arena/race.js simulate(). Keep parity fixtures green. */
export function simulate(racers: readonly RaceRacer[], ticks: number, seed: number): RaceSimulation {
  const n = racers.length;
  const rand = rng(seed);
  if (!n) return { samples: [], order: [], ticks, frames: 0, finishTick: 0 };

  const talent: number[] = [];
  const clutch: number[] = [];
  const jitter: number[] = [];
  for (let i = 0; i < n; i++) {
    talent.push(0.93 + rand() * 0.14);
    clutch.push(0.90 + rand() * 0.26);
    jitter.push(0.55 + rand() * 0.9);
  }

  const base = 1 / ticks;
  const progress = new Float64Array(n);
  const speed = new Float64Array(n).fill(base);
  const target = new Float64Array(n).fill(base);
  const burst = new Int16Array(n);
  const stumble = new Int16Array(n);
  const maxTicks = Math.ceil(ticks * 1.6);
  const samples = Array.from({ length: n }, () => new Float32Array(maxTicks + 1));
  const finishAt = new Float64Array(n).fill(-1);

  let done = 0;
  let t = 0;
  for (; t <= maxTicks && done < n; t++) {
    let sum = 0;
    let live = 0;
    for (let i = 0; i < n; i++) {
      if (finishAt[i]! < 0) {
        sum += progress[i]!;
        live++;
      }
    }
    const packMean = live ? sum / live : 0;

    for (let i = 0; i < n; i++) {
      if (finishAt[i]! >= 0) {
        samples[i]![t] = 1;
        continue;
      }

      if (burst[i] === 0 && stumble[i] === 0) {
        const roll = rand();
        if (roll < 0.012) burst[i] = 12 + Math.floor(rand() * 26);
        else if (roll < 0.024) stumble[i] = 10 + Math.floor(rand() * 22);
      }
      if (burst[i]! > 0) burst[i]!--;
      if (stumble[i]! > 0) stumble[i]!--;

      const frac = progress[i]!;
      let want = base * talent[i]!;
      want *= 1 + (rand() - 0.5) * 0.22 * jitter[i]!;
      if (burst[i]! > 0) want *= 1.35;
      if (stumble[i]! > 0) want *= 0.72;
      want *= 1 + (packMean - frac) * 0.55;
      if (frac > 0.8) want *= 1 + (frac - 0.8) * 1.6 * clutch[i]!;

      target[i] = want;
      speed[i] = speed[i]! + (target[i]! - speed[i]!) * 0.16;
      if (speed[i]! < base * 0.35) speed[i] = base * 0.35;
      progress[i] = progress[i]! + speed[i]!;

      if (progress[i]! >= 1) {
        const over = (progress[i]! - 1) / speed[i]!;
        finishAt[i] = t - over;
        progress[i] = 1;
        done++;
      }
      samples[i]![t] = progress[i]!;
    }
  }

  const lastWritten = Math.max(0, Math.min(t - 1, maxTicks));
  for (let i = 0; i < n; i++) {
    if (finishAt[i]! < 0) finishAt[i] = maxTicks + (1 - progress[i]!) * ticks;
    const held = samples[i]![lastWritten]!;
    for (let k = lastWritten + 1; k <= maxTicks; k++) samples[i]![k] = held;
  }

  const order = racers
    .map((racer, index) => ({ racer, index, finishMs: Math.round(finishAt[index]! * TICK_MS) }))
    .sort((a, b) => a.finishMs - b.finishMs)
    .map((row, index) => ({ ...row, place: index + 1 }));

  return { samples, order, ticks, frames: maxTicks, finishTick: Math.max(...finishAt) };
}
