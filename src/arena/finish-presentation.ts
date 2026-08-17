import type { FinishCamera, FinishPresentation, PhotoFinishPresentation, RaceRacer } from "./contracts";

export const FINAL_STRETCH_START = 0.80;
/*
  THE SWEEP WINDOW.

  The finish structure travels in from offscreen right between these two
  leader positions, and it MUST be parked before anybody crosses.

  These are deliberately well short of the line. The first attempt ended the
  sweep at 0.945 and measured on a real race it parked about 40ms AFTER the
  winner had already crossed - because leaderProgress is the DRAWN position,
  which is held below the truth near the line by the shrinking lead
  allowance, so it arrives later than the raw progress suggests. Ending at
  0.92 leaves about 1.6 seconds of margin on a twelve second race.

  The window itself is tuned for the TRAVEL, not the margin, and it is very
  non-linear in time because the leader is accelerating through the final
  stretch: 0.855-0.92 measured 1.4s of sweep, 0.885-0.92 measured 300ms.
  0.868 sits between them, and the margin is unaffected either way because
  only the START moved.
*/
export const REVEAL_FROM = 0.868;
export const REVEAL_FULL = 0.92;
export const FINISH_CAMERA_FULL = 0.95;
/*
  THE TRACK, AS ONE LINEAR MAP.

  progress 0   -> TRACK_START
  progress 1   -> FINISH_LINE_RATIO      (the stripe)
  progress 1+S -> out into the run-off, at the same scale

  The old geometry had no run-off at all: the line sat at 91% of the frame
  and `normal` clamped progress at 1, so a finisher had nowhere to go. The
  finish camera existed partly to manufacture somewhere - it expanded the
  last 14% of the track across most of the screen, which moved every racer
  non-linearly the moment it engaged. Reserving a real strip after the
  stripe means the coast has room without the camera having to distort
  anything, and the mapping stays a straight line for the whole race.
*/
export const TRACK_START = 0.04;
/*
  THE STRIPE SITS AT 58% FOR THE WHOLE RACE, AND NEVER MOVES.

  The brief asked for it to start at ~90% and slide to ~58% when revealed,
  with the mapping interpolated so nobody jumps. That cannot be done. A
  racer's screen position is `progress * scale`, so dropping the scale from
  0.88 to 0.54 walks every racer LEFT by up to 30% of the frame. Spreading
  that over a transition does not remove it, it just spreads it: at p=0.95
  the leftward drift only falls below the racer's own forward speed at
  about a six second transition - longer than the entire finish sequence.
  Any faster and the whole field visibly reverses at the exact moment the
  race is decided.

  So the geometry is fixed and the REVEAL IS OPACITY ONLY. Nothing moves
  when the stripe appears, because nothing can. For most of the race the
  right-hand 40% is simply open track ahead of the leader, which is what
  "the track continues ahead" is supposed to look like anyway.
*/
export const FINISH_LINE_RATIO = 0.58;
/*
  And the run-out is now genuinely large: 0.58 -> ~0.95 of the frame. The
  old 0.16 settle across a 12% strip is why twelve finishers parked in a
  column against the stripe.
*/
export const MAX_SETTLE = 0.34;
/*
  DERIVED, NOT CHOSEN - and the first version of this got it wrong.

  Picking a run-off width independently made the strip a different scale
  from the track: 1.19 of a frame per unit of progress after the line
  against 0.74 before it. The position was continuous but the GRADIENT
  jumped 60% at the stripe, which is a velocity discontinuity at exactly
  the moment this rewrite exists to smooth. The run-off is the same scale
  as the track, so the map is one straight line through the crossing.
*/
export const TRACK_SCALE = FINISH_LINE_RATIO - TRACK_START;
export const RUN_OFF_RATIO = MAX_SETTLE * TRACK_SCALE;
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

/*
  The camera no longer moves anybody.

  `mix` used to drive the projection above AND the lane compression AND the
  actor scale, so "a bit of finish emphasis" meant every racer sliding to a
  new x and the lanes squeezing together. It is now a pure emphasis signal
  with a hard ceiling: scale and glow read it, geometry does not.
*/
export const MAX_CAMERA_MIX = 0.34;

/**
 * How visible the finish stripe is, 0 to 1.
 *
 * Hidden for most of the race, then a quick fade as the leader comes into
 * the last tenth. It is a pure opacity signal: no geometry reads it, so a
 * reveal can never move a racer.
 */
export function finishReveal(leaderProgress: number): number {
  return smoothstep((leaderProgress - REVEAL_FROM) / (REVEAL_FULL - REVEAL_FROM));
}

export function cameraForLeader(leaderProgress: number): FinishCamera {
  const ramp = smoothstep((leaderProgress - FINAL_STRETCH_START) / (FINISH_CAMERA_FULL - FINAL_STRETCH_START));
  const mix = ramp * MAX_CAMERA_MIX;
  return {
    state: ramp <= 0 ? "normal" : ramp < 0.98 ? "finalStretch" : "finish",
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

/**
 * Ratio within the frame, used by both the DOM fallback and Pixi.
 *
 * ONE STRAIGHT LINE, and deliberately independent of the camera. Progress
 * below the line maps across the track; progress past it continues into the
 * run-off at exactly the same scale, so there is no change of gradient where
 * a racer crosses - which is what a continuous crossing requires. Anything
 * beyond the parking distance is held, so a bad input cannot leave the frame.
 */
export function presentationScreenRatio(progress: number, _camera?: FinishCamera): number {
  const capped = Math.max(0, Math.min(progress, 1 + MAX_SETTLE));
  return TRACK_START + capped * TRACK_SCALE;
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
