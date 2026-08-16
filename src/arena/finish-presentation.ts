import type { FinishCamera, FinishPresentation, PhotoFinishPresentation, RaceRacer } from "./contracts";

export const FINAL_STRETCH_START = 0.86;
export const FINISH_CAMERA_FULL = 0.94;
export const FINISH_LINE_RATIO = 0.76;
export const FINISH_APPROACH_RATIO = 0.16;
export const POST_FINISH_MS = 360;
export const POST_FINISH_DISTANCE = 0.2;
export const WINNER_REVEAL_DELAY_MS = 320;
export const PHOTO_FINISH_THRESHOLD_MS = 180;
export const PHOTO_HIT_STOP_MS = 90;

interface FinishOrderRow {
  index: number;
  finishMs: number;
}

interface FinishPresentationInput {
  elapsedMs: number;
  leaderProgress: number;
  order: readonly FinishOrderRow[];
  racers: readonly RaceRacer[];
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};

export function cameraForLeader(leaderProgress: number): FinishCamera {
  const mix = smoothstep((leaderProgress - FINAL_STRETCH_START) / (FINISH_CAMERA_FULL - FINAL_STRETCH_START));
  return {
    state: mix <= 0 ? "normal" : mix < 0.98 ? "finalStretch" : "finish",
    mix,
    finishRatio: FINISH_LINE_RATIO,
  };
}

export function postFinishProgress(progress: number, elapsedMs: number, finishMs?: number): number {
  const authoritative = clamp01(progress);
  if (finishMs == null || elapsedMs < finishMs) return authoritative;
  const travel = smoothstep((elapsedMs - finishMs) / POST_FINISH_MS);
  return 1 + travel * POST_FINISH_DISTANCE;
}

/** Ratio within the track used by both DOM fallback and Pixi. */
export function presentationScreenRatio(progress: number, camera: FinishCamera): number {
  const normal = 0.03 + clamp01(progress) * 0.88;
  // At track level the camera sees a long approach, not a progress bar ending
  // at the stripe. Expand the authoritative final 14% across most of the shot
  // while keeping the projection monotonic and the official crossing at 1.0.
  const finish = progress <= FINAL_STRETCH_START
    ? FINISH_APPROACH_RATIO * clamp01(progress / FINAL_STRETCH_START)
    : camera.finishRatio + (progress - 1) *
      ((camera.finishRatio - FINISH_APPROACH_RATIO) / (1 - FINAL_STRETCH_START));
  return normal + (finish - normal) * camera.mix;
}

function visualElapsedForPhoto(elapsedMs: number, decisiveMs: number): number {
  const age = elapsedMs - decisiveMs;
  if (age < 0) return elapsedMs;
  if (age < PHOTO_HIT_STOP_MS) return decisiveMs;
  if (age < 390) return decisiveMs + (age - PHOTO_HIT_STOP_MS) * 1.3;
  return elapsedMs;
}

function photoFinish(input: FinishPresentationInput, celebrationActive: boolean): PhotoFinishPresentation | undefined {
  const first = input.order[0];
  const second = input.order[1];
  if (!first || !second) return undefined;
  const gapMs = second.finishMs - first.finishMs;
  if (gapMs < 0 || gapMs > PHOTO_FINISH_THRESHOLD_MS || celebrationActive) return undefined;
  const age = input.elapsedMs - second.finishMs;
  const phase = input.elapsedMs >= first.finishMs - 700 && input.elapsedMs < second.finishMs ? "approach"
    : age >= 0 && age < 120 ? "flash"
    : age >= 120 && age < 1_350 ? "result"
    : "none";
  if (phase === "none") return undefined;
  return {
    phase,
    firstId: input.racers[first.index]?.id ?? first.index,
    secondId: input.racers[second.index]?.id ?? second.index,
    firstName: input.racers[first.index]?.name || "Racer 1",
    secondName: input.racers[second.index]?.name || "Racer 2",
    firstMs: first.finishMs,
    secondMs: second.finishMs,
    gapMs,
  };
}

/** Pure, seekable finish choreography driven only by authoritative results. */
export function createFinishPresentation(input: FinishPresentationInput): FinishPresentation {
  const lastFinishMs = input.order.at(-1)?.finishMs ?? Infinity;
  const secondFinishMs = input.order[1]?.finishMs;
  const actualGap = secondFinishMs == null || !input.order[0]
    ? Infinity : secondFinishMs - input.order[0].finishMs;
  const isPhotoFinish = actualGap >= 0 && actualGap <= PHOTO_FINISH_THRESHOLD_MS;
  const celebrationActive = input.elapsedMs >= lastFinishMs + WINNER_REVEAL_DELAY_MS;
  const visualElapsedMs = isPhotoFinish && secondFinishMs != null
    ? visualElapsedForPhoto(input.elapsedMs, secondFinishMs)
    : input.elapsedMs;
  const photo = photoFinish(input, celebrationActive);
  return {
    camera: cameraForLeader(input.leaderProgress),
    visualElapsedMs,
    celebrationActive,
    celebrationStartedMs: lastFinishMs + WINNER_REVEAL_DELAY_MS,
    allExited: input.elapsedMs >= lastFinishMs + POST_FINISH_MS,
    ...(photo ? { photoFinish: photo } : {}),
  };
}
