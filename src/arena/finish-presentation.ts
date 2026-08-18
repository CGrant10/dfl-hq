import type { FinishCamera, FinishPresentation, PhotoFinishPresentation, RaceRacer } from "./contracts";

export const FINAL_STRETCH_START = 0.80;
/*
  THE FINISH STRUCTURE ARRIVES, AND THEN THE RACERS CROSS IT.

  Driven by ELAPSED TIME against the authoritative finish times, never by
  drawn leader progress. That distinction is the original fix and it stands:
  leaderProgress is Math.max over `shown`, recomputed every frame with no
  latch, and `shown` is allowed to move backwards because collapses are a
  feature. So the old reveal was a pure function of a non-monotonic input,
  and measured over 25 seeded races the stripe reversed in 8 of them.

  WHAT CHANGED, AND WHY IT WAS A PRESENTATION BUG.

  The previous version was one continuous right-to-left PASS whose midpoint
  - the only moment the stripe is actually over the racers' crossing point -
  was pinned to the middle of the whole finish window, `first - 1500` to
  `last + 900`. The stripe therefore reached the crossing point LONG after
  the winner had already crossed. Measured on the real simulation, at the
  winner's official finish the stripe was still at 108% to 131% of the
  viewport width - entirely offscreen to the RIGHT - and did not arrive over
  the line until 1.6s to 5.0s later:

    seed      spread   stripe x at the winner's crossing   late by
    1000      3896ms   108%                                1648ms
    32676     5623ms   117%                                2512ms
    7         6987ms   123%                                3194ms
    99        9363ms   129%                                4382ms
    90210    10473ms   131%                                4937ms
    2024     10692ms   131%                                5046ms

  So nobody ever SAW the race being decided: the winner crossed empty track,
  the photo-finish result panel appeared (second finish + 120ms, with the
  stripe still offscreen), and the stripe wandered over the line seconds
  later with the race already resolved. That is the whole "it declares the
  winner before the finish has happened" complaint, and it was geometric
  rather than a matter of overlay timings.

  It is now an APPROACH that completes, not a pass that continues. The
  structure travels in from offscreen right and comes to rest ON the shared
  FINISH_LINE_RATIO a beat BEFORE the first official finish, so the sequence
  a viewer sees is:

    final stretch -> the line arrives -> the racers cross it -> result

  It is still a clamped ramp on a clock: monotonic by construction,
  stateless between frames, seekable, replay-safe, and identical in every
  view because they all derive it from the same sim.order. It cannot reverse
  and it cannot re-enter, which are the properties the previous rewrite was
  protecting. It simply stops when it is home, because a finish line that
  keeps travelling past the field is a finish line nobody crosses.
*/
export const PRE_FINISH_SWEEP_MS = 2600;
/*
  Settled THIS long before the first official crossing.

  The truth rule is that the viewer must see the finish happen, which means
  the structure has to be standing there first - a stripe that arrives on
  the same frame as the winner reads as the winner being caught by scenery.
  Small on purpose: long enough to register, short enough that the line has
  not been sitting in shot long enough to give the ending away.
*/
export const FINISH_SETTLED_LEAD_MS = 420;

/**
 * How far the finish structure is through its approach, 0 to 1.
 *
 * 0  offscreen right, before anyone is near the line
 * 1  standing on FINISH_LINE_RATIO, where every racer crosses
 *
 * One continuous right-to-left approach that ends at the line and stays
 * there. It never stops early, never reverses and never re-enters, because
 * it is a clamped ramp on a clock.
 *
 * lastFinishMs is deliberately NOT a parameter. The structure's position has
 * nothing to do with when the back of the field gets home, and making it
 * depend on the spread is precisely what put the stripe offscreen at the
 * moment of the crossing.
 */
export function finishArrival(elapsedMs: number, firstFinishMs: number): number {
  const start = firstFinishMs - PRE_FINISH_SWEEP_MS;
  const settled = firstFinishMs - FINISH_SETTLED_LEAD_MS;
  const ramp = clamp01((elapsedMs - start) / Math.max(1, settled - start));
  /*
    Eased, not linear, and the easing belongs HERE rather than in a CSS
    transition. A transition on top of a per-frame variable smears instead of
    smoothing, and a linear ramp across most of the frame width reads as a
    wipe. Ease-out cubic is monotonic, so every property the linear ramp had -
    no reversal, no re-entry, seekable, identical in every view - survives it:
    the structure sweeps in and decelerates onto the line.
  */
  return 1 - (1 - ramp) ** 3;
}

/** The moment the finish structure is standing on the line, fully drawn. */
export function finishSettledMs(firstFinishMs: number): number {
  return firstFinishMs - FINISH_SETTLED_LEAD_MS;
}

/*
  POST_FINISH_SWEEP_MS WAS DELETED HERE.

  It was the tail of the old right-to-left pass - how long the stripe took to
  travel off the left edge after the last racer was home. There is no exit any
  more: the structure is the finish line, the racers run through it into the
  run-off, and it stays where it is under the winner card.
*/

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
  THE GEOMETRY IS FIXED. THE MARKER IS SCENERY, AND IT DOES MOVE.

  progress 1 maps to 58% of the frame for the whole race and that never
  changes - so a racer's screen position is a function of progress alone.
  What travels is the STRIPE ELEMENT, in CSS, from offscreen right into its
  parked position as the leader comes into the final stretch. See
  finishReveal() below.

  Those are two different things and the distinction is the whole design.
  Moving the MAPPING is impossible: screen position is `progress * scale`,
  so dropping the scale from 0.88 to 0.54 walks every racer LEFT by up to
  30% of the frame. Spreading that over a transition does not remove it, it
  just spreads it - at p=0.95 the leftward drift only falls below the
  racer's own forward speed at about a six second transition, longer than
  the entire finish sequence. Any faster and the whole field visibly
  reverses at the moment the race is decided.

  Moving the MARKER costs nothing, because nothing reads it. It is a `<div>`
  with a transform. presentationScreenRatio() ignores the camera entirely
  and there is a spec asserting racer x is byte-identical before, during and
  after the sweep.

  For most of the race the right-hand 40% is open track ahead of the leader,
  which is what "the track continues ahead" is supposed to look like.
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
/*
  STILL LIVE, AND DELIBERATELY NOT A COAST.

  This is no longer a distance or a duration for post-finish MOVEMENT - the
  per-racer run-out owns that. Two things still read it, both of them
  state gates rather than positions:

    allExited            in createFinishPresentation(), the moment the
                         renderer may stop calling itself "racing"
    RacerFrame.exiting   a default in presentation-frame.ts, which
                         presentFinish() then overwrites for every racer in
                         both views

  Leave it as a gate. If it ever starts influencing where a racer is drawn,
  there are two post-finish models again.
*/
export const POST_FINISH_MS = 360;
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

/*
  finishReveal(), REVEAL_FROM and REVEAL_FULL were deleted here.

  They drove the marker from leaderProgress, which is not monotonic. See
  finishPassProgress() above. Do not reintroduce a progress-driven reveal.
*/

export function cameraForLeader(leaderProgress: number): FinishCamera {
  const ramp = smoothstep((leaderProgress - FINAL_STRETCH_START) / (FINISH_CAMERA_FULL - FINAL_STRETCH_START));
  const mix = ramp * MAX_CAMERA_MIX;
  return {
    state: ramp <= 0 ? "normal" : ramp < 0.98 ? "finalStretch" : "finish",
    mix,
    finishRatio: FINISH_LINE_RATIO,
  };
}

/*
  postFinishProgress() AND POST_FINISH_DISTANCE WERE DELETED HERE.

  They were the ORIGINAL post-finish coast: every finisher moved to
  `1 + smoothstep(age / 360ms) * 0.2`, the same number for all twelve, which
  is where the finish-line traffic jam came from. The real coast is
  finishTrajectories() -> presentFinish() in theatre.ts, which is
  per-racer, velocity-continuous and shared by both views.

  Nothing called the old function any more - presentation-frame.ts had
  already stopped - so it was a second post-finish model sitting in the
  codebase waiting to be picked up by mistake. Do not reintroduce one.
*/

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

/*
  THE RESULT IS NOT ALLOWED TO OUTRUN THE CROSSING.

  A photo finish is resolved by the SECOND racer's line - until they are
  across, first and second are still a question - so that crossing is the
  decisive one, and for every other race it is the winner's own. Nothing that
  resolves the race may be drawn before it, plus one small beat so the
  crossing reads as a crossing rather than as a cut to a graphic.

  finishSettledMs() is folded in as a floor for completeness. It is always
  earlier than any crossing by construction, but the gate then states the
  actual rule - the structure is standing there AND somebody has gone through
  it - instead of relying on two constants staying ordered.
*/
export const RESULT_BEAT_MS = 220;

function decisiveCrossingMs(order: readonly FinishOrderRow[], isPhotoFinish: boolean): number {
  const decisive = (isPhotoFinish ? order[1] : order[0])?.finishMs;
  if (decisive == null) return Infinity;
  return Math.max(decisive, finishSettledMs(order[0]?.finishMs ?? decisive));
}

function photoFinish(
  input: FinishPresentationInput,
  celebrationActive: boolean,
  crossingShownMs: number,
): PhotoFinishPresentation | undefined {
  const first = input.order[0];
  const second = input.order[1];
  if (!first || !second) return undefined;
  const gapMs = second.finishMs - first.finishMs;
  if (gapMs < 0 || gapMs > PHOTO_FINISH_THRESHOLD_MS || celebrationActive) return undefined;
  /*
    APPROACH AND RESULT ARE TWO DIFFERENT THINGS.

    "PHOTO FINISH" over a converging field is tension and it is allowed to
    run before the line - it says the race is close, not who won. The panel
    with the places and the times is the answer, and it waits for the
    decisive crossing to have been shown. Only the beat separates them, so
    the reveal still lands on the crossing rather than trailing it.
  */
  const resultFromMs = crossingShownMs + RESULT_BEAT_MS;
  const phase = input.elapsedMs < crossingShownMs
    ? (input.elapsedMs >= first.finishMs - 700 ? "approach" : "none")
    : input.elapsedMs < resultFromMs ? "flash"
    : input.elapsedMs < resultFromMs + 1_350 ? "result"
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
  const crossingShownMs = decisiveCrossingMs(input.order, isPhotoFinish);
  const crossingShown = input.elapsedMs >= crossingShownMs;
  const celebrationActive = input.elapsedMs >= lastFinishMs + WINNER_REVEAL_DELAY_MS && crossingShown;
  const visualElapsedMs = isPhotoFinish && secondFinishMs != null
    ? visualElapsedForPhoto(input.elapsedMs, secondFinishMs)
    : input.elapsedMs;
  const photo = photoFinish(input, celebrationActive, crossingShownMs);
  return {
    camera: cameraForLeader(input.leaderProgress),
    visualElapsedMs,
    /*
      THE PRESENTATION TRUTH FLAG. Everything that resolves the race for the
      viewer - the winner card, first-place styling, the winner focus and
      convergence, the photo-finish panel - hangs off this rather than off a
      clock offset of its own, so there is one answer to "may the UI say who
      won yet" and it is derived from the choreography.
    */
    crossingShown,
    crossingShownMs,
    celebrationActive,
    celebrationStartedMs: lastFinishMs + WINNER_REVEAL_DELAY_MS,
    allExited: input.elapsedMs >= lastFinishMs + POST_FINISH_MS,
    ...(photo ? { photoFinish: photo } : {}),
  };
}
