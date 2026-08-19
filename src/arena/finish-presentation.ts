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
/*
  LONG ON PURPOSE, AND THAT IS THE WHOLE POINT.

  It was 1100ms. Over a travel of nearly half the frame that is a velocity
  roughly ELEVEN TIMES the leader's own screen speed, and a thing that crosses
  the ground eleven times faster than the runners on it is not standing on
  that ground - it is a graphic flying over the top of it. Which is exactly
  what it looked like: a stripe that flew into the middle of the shot and
  parked.

  A finish line is scenery. Scenery moves at ground speed or it is not
  scenery. Racers cover TRACK_SCALE (0.54 of the frame) over a whole race and
  accelerate through the final stretch, which measures about 1e-4 of the frame
  per millisecond at the sharp end. Rolling FINISH_ENTRY_RATIO -> 
  FINISH_LINE_RATIO at that speed takes:

    (1.02 - 0.58) * 1.0989 / 1e-4  ~=  4835ms

  which was the first value here. It is 3500 now, and the reason is that the
  brief changed: the structure should come into shot with about three to four
  seconds of race left, and the crossing should feel as quick as the racers
  are. 3500 puts it at the right edge 3.5s before the winner and moves it at
  about 1.6x their speed - still reading as ground rather than as a graphic
  (the spec caps that ratio at 3x), but arriving with the urgency of the
  finish rather than drifting in ahead of it.

  What this does NOT change is how long the line stands still before the
  winner: that is FINISH_SETTLED_LEAD_MS, still 420ms. The extra time is
  spent ROLLING, in shot, which is the effect being asked for. The exit is
  CSS: data-race-state="finished" fades it out once the last racer is home.
*/
export const FINISH_ROLL_MS = 3500;
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
export const ROLL_LINEAR_UNTIL = 0.82;
/*
  Slope continuity, solved rather than tuned. A linear run at k for the first
  `a` of the ramp, then a decelerating tail that reaches 1 with zero slope:

    e(r <= a) = k*r
    e(r >  a) = k*a + (1 - k*a) * (1 - ((1-r)/(1-a))^2)

  Matching the two slopes at r = a gives k(1+a) = 2, so k = 2/(1+a) and there
  is nothing left to choose. At a = 0.82 that is k = 1.0989: NINETY PERCENT of
  the travel happens at one constant velocity and the last tenth bleeds off
  over the final 18% of the time. That is a heavy object rolling to a stop.

  An ease-out cubic across the WHOLE distance - which is what this was - has
  its maximum speed on the first frame and decelerates for the entire travel.
  Nothing on the ground moves like that. It is the signature of a panel
  animating into place, and it is why the old line read as UI.
*/
export const ROLL_SLOPE = 2 / (1 + ROLL_LINEAR_UNTIL);

export function finishArrival(elapsedMs: number, firstFinishMs: number): number {
  const start = firstFinishMs - FINISH_ROLL_MS;
  const settled = firstFinishMs - FINISH_SETTLED_LEAD_MS;
  const ramp = clamp01((elapsedMs - start) / Math.max(1, settled - start));
  const a = ROLL_LINEAR_UNTIL;
  if (ramp <= a) return ROLL_SLOPE * ramp;
  const atA = ROLL_SLOPE * a;
  const tail = (1 - ramp) / (1 - a);
  return atA + (1 - atA) * (1 - tail * tail);
}

/*
  THE FINISH LINE'S POSITION IN THE RACERS' OWN COORDINATE SYSTEM.

  This is the part that makes it scenery rather than an overlay. It returns a
  ratio of the frame - the same units presentationScreenRatio() returns for a
  racer - so the structure and the field are placed by one coordinate system
  and the structure can be drawn into the course layer BEHIND the actors,
  where the ground is.

  It ends at exactly presentationScreenRatio(1), because that is where every
  racer's progress 1.0 lands and a finish line anywhere else is a finish line
  nobody crosses. Do not give this its own resting place.
*/
export const FINISH_ENTRY_RATIO = 1.02;

export function finishGroundRatio(elapsedMs: number, firstFinishMs: number): number {
  const arrival = finishArrival(elapsedMs, firstFinishMs);
  return FINISH_ENTRY_RATIO + (FINISH_LINE_RATIO - FINISH_ENTRY_RATIO) * arrival;
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
  THE GEOMETRY IS FIXED. THE STRUCTURE IS SCENERY, AND IT ROLLS TO REST HERE.

  progress 1 maps to 58% of the frame for the whole race and that never
  changes - so a racer's screen position is a function of progress alone.
  What travels is the STRUCTURE, from FINISH_ENTRY_RATIO to this number, at
  ground speed, drawn in the course layer under the actors. See
  finishGroundRatio().

  Those are two different things and the distinction is the whole design.
  Moving the MAPPING is impossible: screen position is `progress * scale`,
  so dropping the scale from 0.88 to 0.54 walks every racer LEFT by up to
  30% of the frame. Spreading that over a transition does not remove it, it
  just spreads it - at p=0.95 the leftward drift only falls below the
  racer's own forward speed at about a six second transition, longer than
  the entire finish sequence. Any faster and the whole field visibly
  reverses at the moment the race is decided.

  Moving the STRUCTURE costs nothing, because nothing reads its position to
  place a racer. presentationScreenRatio() ignores the camera entirely and
  there is a spec asserting racer x is byte-identical before, during and
  after the roll.

  For most of the race the right-hand 40% is open track ahead of the leader,
  which is what "the track continues ahead" is supposed to look like.
*/
export const FINISH_LINE_RATIO = 0.58;
/*
  HOW FAR PAST THE LINE THE CAMERA FOLLOWS A RACER - AND IT IS OFF THE FRAME.

  This has now been three different ideas, and the first two were both trying
  to solve a problem that should not have existed:

    0.34   twelve finishers parked across 18% of the frame, about 1.2% each
           against a drawn racer 10% wide, so they overlapped almost entirely.
           The pile-up.
    0.65   the same twelve fanned across 35% instead, roughly a third of a
           racer width per place. Better, and still a car park: everybody came
           to a dead stop a short way past the line.

  Nobody parks now. A racer crosses the line, keeps their pace, and leaves the
  shot - which is what a runner does, and it dissolves the huddle completely
  rather than arranging it more neatly. 1.15 of progress past the line maps to
  120% of the frame, so a racer is fully clear of a 10vw-wide body before the
  geometry holds them, and `.bc-track` has overflow:hidden so they are clipped
  rather than piling against the edge.

  The hold at the end is a numeric backstop, not a deceleration: it stops
  positions growing without bound in a long-running tab. Nothing visible ever
  reaches it.
*/
export const MAX_SETTLE = 1.15;
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

/*
  THE LINE TIMES THEM AS THEY TOUCH IT.

  STAMP_HOLD_MS is how long one racer's time stays legible at the structure
  before it hands off to the board, and it is deliberately longer than the
  tightest gap the sim produces. When crossings arrive closer together than
  that, the LATEST one wins the slot outright rather than the two overlapping
  into an unreadable smear - a finish line shows the racer who is on it.

  Pure and seekable like everything else here: it is a scan of the order
  against the clock, holds no state between frames, and a rewound clock
  reconstructs exactly the same stamp.
*/
export const STAMP_HOLD_MS = 1_400;

export interface FinishStamp {
  index: number;
  place: number;
  finishMs: number;
  /** 1 at the moment of the touch, falling to 0 as the stamp lets go. */
  fade: number;
}

export function finishStamp(order: readonly FinishOrderRow[], elapsedMs: number): FinishStamp | undefined {
  let latest: FinishOrderRow | undefined;
  let place = 0;
  for (let i = 0; i < order.length; i += 1) {
    const row = order[i];
    if (!row || row.finishMs > elapsedMs) break;
    latest = row;
    place = i + 1;
  }
  if (!latest) return undefined;
  const age = elapsedMs - latest.finishMs;
  if (age >= STAMP_HOLD_MS) return undefined;
  return {
    index: latest.index,
    place,
    finishMs: latest.finishMs,
    fade: 1 - smoothstep(age / STAMP_HOLD_MS),
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
  const firstFinishMs = input.order[0]?.finishMs ?? Infinity;
  const stamp = finishStamp(input.order, input.elapsedMs);
  return {
    camera: cameraForLeader(input.leaderProgress),
    /*
      The structure's own position, carried on the presentation object so that
      every renderer - Pixi course layer, DOM fallback, OBS - places it from
      one number derived from one clock. Two views cannot disagree about where
      the finish line is.
    */
    groundRatio: Number.isFinite(firstFinishMs)
      ? finishGroundRatio(input.elapsedMs, firstFinishMs)
      : FINISH_ENTRY_RATIO,
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
    ...(stamp ? { stamp } : {}),
    ...(photo ? { photoFinish: photo } : {}),
  };
}
