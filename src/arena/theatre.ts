/* =====================================================================
   arena/theatre.ts - the spectacle, typed.
   ---------------------------------------------------------------------
   SIMULATION = TRUTH.  DRAMATIZATION = SPECTACLE.  RENDERING = SHARED.

   This is the middle one. simulate() decides who wins and when; nothing
   in this file may change that, and the specs beside it enforce so.

   WHY IT MOVED HERE. This logic used to live in js/arena/race.js as plain
   untyped, untested JavaScript - about a thousand lines carrying the whole
   look of the race, with no typechecking (tsconfig sets checkJs:false) and
   not one unit test. Every bug found in it during the last pass was caught
   by a throwaway browser probe: a clamp-precedence ratchet that produced
   692 early crossings, a launch that accelerated racers into a wall. Those
   probes do not persist, so nothing would catch the same mistake tomorrow.
   The invariants are specs now.

   THE BIG CHANGE: RACERS MAY FALL BACKWARDS.

   The old model forbade it outright with a monotonic floor. That floor is
   gone. A racer who is coming apart can now visibly drift back through the
   field, lose a lot of ground, sit there looking cooked, and then come
   back - which is the difference between a race and a progress bar.

   Backwards motion is bounded, not free:

     forward   bounded by the distance REMAINING, so the drawing can never
               reach the line before the racer actually does
     backward  bounded by the distance COVERED, so nobody slides behind the
               start line or off the track
     both      driven by smooth curves with zero slope at their ends, so a
               backslide is an arc and never a jitter or a teleport
     late      scaled to zero as the finish approaches, so every racer
               converges onto the truth before it matters
   ===================================================================== */

import { TICK_MS } from "./engine";
import { MAX_SETTLE } from "./finish-presentation";
import type { RaceSimulation } from "./engine";

/** How far off the truth a racer may be DRAWN, ahead. */
export const MAX_LEAD = 0.46;
/** And behind. A collapse is allowed to be genuinely ruinous. */
export const MAX_DROP = 0.38;
/** The theatre is shut on the line and opens over this much of the race. */
export const LAUNCH_ZONE = 0.07;
/** How long the field takes to fan out. */
export const OPEN_ZONE = 0.26;
/*
  HOW LONG BEFORE A RACER'S OWN FINISH THEY CONVERGE ONTO THE TRUTH.

  This used to be CLOSE_FROM = 0.88 in PROGRESS space, shared by everybody,
  and that is what caused the finish huddle. Every racer hits 0.88 at
  roughly the same moment, so the whole field was dragged onto the truth
  together: drawn spread collapsed from 0.546 mid-race to 0.129 at the first
  crossing, which is TIGHTER than the truth spread of 0.183. The theatre was
  squeezing the field harder than the simulation.

  Keyed on each racer's own remaining time instead. A racer three seconds
  from home keeps their whole arc while the leader converges, so the field
  stays spread deep into the final stretch and only tightens one racer at a
  time, as each of them actually arrives.

  The no-early-crossing guarantee does not depend on this - that is the
  `ahead` allowance, which shrinks to zero as truth approaches 1 regardless.
*/
export const CLOSE_MS = 900;
/** Jitter on top of the arcs. The arcs carry the story. */
export const THEATRE = 0.175;

const smoothstep = (x: number): number => {
  const t = x <= 0 ? 0 : x >= 1 ? 1 : x;
  return t * t * (3 - 2 * t);
};

/** 0 on the start line, 1 once the field is away. */
export function launchEase(truth: number): number {
  return truth >= LAUNCH_ZONE ? 1 : smoothstep(truth / LAUNCH_ZONE);
}

/**
 * 1 while a racer is still racing, easing to 0 as their OWN finish arrives.
 *
 * @param msToFinish  milliseconds until this racer's authoritative finishMs
 */
export function closingEase(msToFinish: number): number {
  if (msToFinish <= 0) return 0;
  if (msToFinish >= CLOSE_MS) return 1;
  return smoothstep(msToFinish / CLOSE_MS);
}

/** How much of the theatre is open. The field fans out gradually. */
export function openEase(truth: number): number {
  return truth >= OPEN_ZONE ? 1 : smoothstep(truth / OPEN_ZONE);
}

/**
 * How far the drawing may sit from the truth, in each direction.
 *
 * ASYMMETRIC, AND BOTH SIDES ARE LOAD-BEARING.
 *
 * `ahead` shrinks to nothing as the truth approaches 1, which is the whole
 * guarantee that nobody is drawn across the line early - continuously,
 * rather than by the fixed 0.985 shelf that used to freeze every racer for
 * four ticks before the finish.
 *
 * `behind` shrinks to nothing as the truth approaches 0, which is what
 * stops a collapsing racer sliding back past the start line. You cannot
 * lose ground you have not covered.
 */
export function allowance(truth: number): { ahead: number; behind: number } {
  /*
    A SOFT MINIMUM, BECAUSE Math.min HAS A CORNER.

    Both allowances are the lesser of a constant and a line, and the point
    where those cross is a kink in the derivative. The deviation is pushed
    through tanh against this limit every tick, so the kink came out as a
    break in velocity - the worst jerk in the whole race sat exactly there.
    `L * tanh(x / L)` is the same bound without the corner: it is never
    above L and never above x, and it is smooth everywhere.
  */
  const soft = (limit: number, linear: number): number =>
    limit * Math.tanh(Math.max(0, linear) / limit);
  return {
    ahead: soft(MAX_LEAD, (1 - truth) * 0.85),
    behind: soft(MAX_DROP, truth * 0.9),
  };
}

/** Deterministic RNG (mulberry32), identical to the engine's. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ArcKind = "breakaway" | "collapse" | "comeback" | "latecharge";

export interface TheatreArc {
  kind: ArcKind;
  racer: number;
  /** In truth space, so a short race and a long race get the same shape. */
  start: number;
  width: number;
  power: number;
  /** Fraction of the window spent at full deviation - the "cooked" plateau. */
  hold: number;
}

export interface DramaEvent {
  kind: string;
  racer: number;
  ms: number;
  durMs: number;
}

/**
 * A bump with a plateau in the middle, and zero slope at both ends.
 *
 * A plain raised cosine goes down and straight back up, which reads as a
 * wobble rather than a collapse. Holding the bottom is what makes a racer
 * look genuinely cooked before the recovery starts - the deficit has to
 * persist long enough for somebody to notice it and write the racer off.
 */
export function arcShape(x: number, hold = 0): number {
  if (x <= 0 || x >= 1) return 0;
  const h = Math.max(0, Math.min(0.8, hold));
  const ramp = (1 - h) / 2;
  if (x < ramp) return smoothstep(x / ramp);
  if (x > 1 - ramp) return smoothstep((1 - x) / ramp);
  return 1;
}

/** The deterministic script of long-form arcs for one race. */
export function planArcs(sim: RaceSimulation, seed: number, racerCount: number): TheatreArc[][] {
  const rand = rng(((seed >>> 0) ^ 0x51ed2701) >>> 0);
  const arcs: TheatreArc[][] = Array.from({ length: racerCount }, () => []);
  const first = sim.samples[0];
  if (!first) return arcs;

  const standingAt = (progress: number): number[] => {
    let tick = 0;
    while (tick < sim.frames && (first[tick] ?? 0) < progress) tick++;
    return Array.from({ length: racerCount }, (_, i) => i)
      .sort((a, b) => (sim.samples[b]?.[tick] ?? 0) - (sim.samples[a]?.[tick] ?? 0));
  };

  const overlaps = (racer: number, start: number, width: number): boolean =>
    arcs[racer]!.some((a) => start < a.start + a.width && a.start < start + width);

  const planned = racerCount <= 4 ? racerCount : Math.round(racerCount * 1.7);
  for (let k = 0; k < planned; k++) {
    const kind = (["breakaway", "collapse", "comeback", "latecharge"] as const)[
      Math.floor(rand() * 4)
    ]!;
    /*
      A COLLAPSE NEEDS A LONGER WINDOW THAN A SURGE.

      The ramp either side of the plateau is width*(1-hold)/2, so a deep
      collapse in a short window is a cliff: at 0.18 wide with a 0.55 hold
      the ramp is 0.04 of the race carrying 0.36 of deviation, which
      measured as a 3.2% jump in a single 40ms tick - a lurch, not a fade.
      Collapses get a wide window so the ground is lost gradually.
    */
    const collapseKind = kind === "collapse";
    const width = collapseKind ? 0.28 + rand() * 0.2 : 0.18 + rand() * 0.22;
    const start = kind === "latecharge" ? 0.56 + rand() * 0.16 : 0.08 + rand() * 0.5;
    const standing = standingAt(start);

    let racer: number;
    if (kind === "breakaway") racer = standing[Math.floor(rand() * Math.min(3, racerCount))]!;
    else if (kind === "collapse") racer = standing[Math.floor(rand() * Math.min(4, racerCount))]!;
    else racer = standing[racerCount - 1 - Math.floor(rand() * Math.min(4, racerCount))]!;

    if (overlaps(racer, start, width)) continue;

    /* A collapse is deeper than a surge and holds its bottom, because
       "they are gone" needs time on screen to land. */
    const collapse = collapseKind;
    const power = (collapse ? -1 : 1) * (collapse ? 0.20 + rand() * 0.16 : 0.13 + rand() * 0.13);
    arcs[racer]!.push({ kind, racer, start, width, power, hold: collapse ? 0.28 + rand() * 0.17 : 0.1 });

    /*
      THE PAIRING. A collapse that simply returns to the truth is already a
      recovery, but a heroic one needs the racer to keep going once they are
      level again. So a deep collapse is usually followed by a charge that
      starts as the collapse releases and runs on past it.
    */
    if (collapse && rand() < 0.72) {
      /*
        THE COMEBACK STARTS AS THE COLLAPSE RELEASES, NOT DURING IT.

        Overlapping the two at 0.78 stacked their ramps: the collapse
        climbing back toward the truth plus the comeback pulling ahead of
        it summed to 3.8% of the track in a single 40ms tick - about one
        track-length per second, which reads as a slingshot rather than a
        charge. Starting at the collapse's tail and running wider keeps the
        recovery long and hard instead of fast and silly.
      */
      const backStart = start + width * 0.96;
      const backWidth = Math.min(0.36, Math.max(0.26, width));
      if (backStart + backWidth < 0.99 && !overlaps(racer, backStart, backWidth)) {
        arcs[racer]!.push({
          kind: "comeback", racer, start: backStart, width: backWidth,
          power: 0.14 + rand() * 0.14, hold: 0.12,
        });
      }
    }
  }
  return arcs;
}

/**
 * Each racer's speed at the instant they cross, in progress per millisecond.
 *
 * Read off the authoritative samples either side of the finishing tick, so
 * it is the racer's REAL closing speed. The post-finish coast starts from
 * exactly this, which is what makes the crossing velocity-continuous
 * instead of a fresh animation from a standstill.
 */
export function crossingSpeeds(sim: RaceSimulation): number[] {
  const finishOf = new Map(sim.order.map((o) => [o.index, o.finishMs]));
  return sim.samples.map((s, i) => {
    const finishMs = finishOf.get(i) ?? 0;
    const tick = Math.max(1, Math.min(sim.frames, Math.round(finishMs / TICK_MS)));
    /* Step back to the last pair of ticks that were still moving: at and
       after the line the samples are pinned to 1 and would read as zero. */
    let a = tick;
    let b = tick - 1;
    while (a > 1 && (s[a] ?? 0) - (s[b] ?? 0) <= 0) { a--; b--; }
    const perTick = Math.max(1e-5, (s[a] ?? 0) - (s[b] ?? 0));
    return perTick / TICK_MS;
  });
}

export interface DramatizeResult {
  shown: Float32Array[];
  events: DramaEvent[];
  arcs: TheatreArc[][];
}

/**
 * Visual positions for playback, and the moments that produced them.
 *
 * `shown` is the DRAWING. sim.order is the RESULT. They agree at the line
 * and are free to disagree - loudly - everywhere else.
 */
export function dramatize(sim: RaceSimulation, seed: number): DramatizeResult {
  const n = sim.samples.length;
  const frames = sim.frames;
  if (!n) return { shown: [], events: [], arcs: [] };

  const rand = rng(((seed >>> 0) ^ 0x9e3779b9) >>> 0);
  /*
    THE WAVE IS JITTER. THE ARCS ARE THE STORY.

    Its frequencies used to run to 3.5 and 6.6 cycles per race, and once
    the per-racer amplitude was widened to 1.95 the second harmonic alone
    moved a racer 3.8% of the track in a single 40ms tick - measured at
    seed 8675309, racer 3, tick 77, nowhere near any arc. That is a
    twitch, and it was drowning the long arcs it is supposed to sit on top
    of. Slower now: the same amount of movement, spread over enough time
    to read as a racer finding and losing rhythm.
  */
  const wave = Array.from({ length: n }, () => ({
    a1: 0.60 + rand() * 0.55, f1: 1.3 + rand() * 1.6, p1: rand() * Math.PI * 2,
    a2: 0.22 + rand() * 0.30, f2: 2.2 + rand() * 2.0, p2: rand() * Math.PI * 2,
    amp: 0.45 + rand() * 1.5,
  }));

  const arcs = planArcs(sim, seed, n);
  const shown = Array.from({ length: n }, () => new Float32Array(frames + 1));
  const events: DramaEvent[] = [];
  const stamped = new Set<string>();

  /* Each racer's own finish, so convergence is individual rather than a
     field-wide snap at one shared progress threshold. */
  const finishOf = new Map(sim.order.map((o) => [o.index, o.finishMs]));

  for (let i = 0; i < n; i++) {
    const w = wave[i]!;
    const src = sim.samples[i]!;
    const mine = arcs[i]!;
    const finishMs = finishOf.get(i) ?? Infinity;

    for (let t = 0; t <= frames; t++) {
      const truth = src[t] ?? 0;
      const fade = truth >= 1 ? 0 : Math.pow(1 - truth, 1.35);
      const phase = truth * Math.PI * 2;

      const wob = Math.sin(phase * w.f1 + w.p1) * w.a1
                + Math.sin(phase * w.f2 + w.p2) * w.a2;

      let arc = 0;
      for (const a of mine) {
        arc += a.power * arcShape((truth - a.start) / a.width, a.hold);
        const key = `${i}:${a.kind}:${a.start}`;
        if (!stamped.has(key) && truth >= a.start + a.width * 0.28) {
          stamped.add(key);
          events.push({
            kind: a.kind === "collapse" ? "stumble" : a.kind,
            racer: i, ms: t * TICK_MS, durMs: 1800,
          });
        }
      }

      const gate = launchEase(truth) * closingEase(finishMs - t * TICK_MS) * openEase(truth);
      const raw = (wob * w.amp * THEATRE * fade + arc) * gate;

      /*
        SATURATED PER DIRECTION, NOT CLAMPED.

        A clamp is a wall and a racer accelerating into one stops in a
        single tick. tanh approaches its limit asymptotically, so a racer
        eases into the allowance instead - and because tanh is strictly
        less than 1, the bound is as absolute as a clamp was.
      */
      const { ahead, behind } = allowance(truth);
      const limit = raw >= 0 ? ahead : behind;
      const dev = limit > 1e-6 ? limit * Math.tanh(raw / limit) : 0;

      let p = truth * launchEase(truth) + dev;
      if (p < 0) p = 0;
      if (truth < 1 && p > truth + ahead) p = truth + ahead;
      if (truth >= 1) p = 1;
      shown[i]![t] = p;
    }
  }

  events.sort((a, b) => a.ms - b.ms);
  return { shown, events, arcs };
}


/* =====================================================================
   THE FINISH, AFTER THE FINISH.
   ---------------------------------------------------------------------
   Crossing is decided by simulate(). What a racer does in the seconds
   AFTER crossing is decided here, and it is drawing only.

   PRECOMPUTED, ONCE. Every racer's whole run-out - crossing speed, settle
   distance, time constant, how long the wind-down lasts - is derived
   before the first frame. The animation loop then evaluates a closed-form
   curve per racer per frame and branches on nothing.
   ===================================================================== */

export interface FinishTrajectory {
  finishMs: number;
  place: number;
  /** Progress per ms at the line - the coast starts at exactly this. */
  crossSpeed: number;
  /** Total run-out distance in progress units. */
  settle: number;
  /** Exponential time constant, settle / crossSpeed. */
  tau: number;
  /** When the wind-down has become imperceptible. */
  coastMs: number;
}

/**
 * How far past the line each place parks, in progress units.
 *
 * First runs furthest on and every place behind settles shorter, so the
 * field fans out across the run-out instead of stacking on the stripe.
 */
export function settleOffset(place: number): number {
  const rank = Math.max(1, place || 1);
  return Math.max(0.09, MAX_SETTLE - (rank - 1) * 0.022);
}

/** Every racer's run-out, worked out before playback starts. */
export function finishTrajectories(sim: RaceSimulation): FinishTrajectory[] {
  const speeds = crossingSpeeds(sim);
  const byIndex: FinishTrajectory[] = [];
  for (const row of sim.order) {
    const crossSpeed = Math.max(1e-6, speeds[row.index] ?? 1e-4);
    const settle = settleOffset(row.place);
    const tau = settle / crossSpeed;
    byIndex[row.index] = {
      finishMs: row.finishMs, place: row.place, crossSpeed, settle, tau,
      coastMs: Math.min(6000, tau * 3),
    };
  }
  return byIndex;
}

/**
 * Where a finished racer is DRAWN.
 *
 * CONTINUOUS IN POSITION AND VELOCITY. An exponential whose initial
 * velocity IS the racer's measured crossing speed and whose total travel is
 * the per-place run-out distance:
 *
 *   x(age) = 1 + S * (1 - e^(-age / tau)),  tau = S / v0
 *   x'(0)  = S / tau = v0          <- matches the approach exactly
 *
 * There is no clamp at the stripe and no second animation: the racer
 * carries their momentum through and bleeds it off afterwards.
 */
export function coastProgress(progress: number, elapsedMs: number, trajectory?: FinishTrajectory): number {
  if (!trajectory || elapsedMs < trajectory.finishMs) return progress;
  const age = elapsedMs - trajectory.finishMs;
  return 1 + trajectory.settle * (1 - Math.exp(-age / trajectory.tau));
}

/** RACING -> CROSSING -> COASTING -> SETTLED -> CELEBRATING. */
export function finishPhase(elapsedMs: number, trajectory: FinishTrajectory | undefined, celebrating: boolean): string {
  if (!trajectory || elapsedMs < trajectory.finishMs) return "racing";
  if (celebrating) return "celebrating";
  const age = elapsedMs - trajectory.finishMs;
  if (age < 160) return "crossing";
  if (age < trajectory.coastMs) return "coasting";
  return "settled";
}

/**
 * Apply the whole finish presentation to one renderer frame, in place.
 *
 * ONE IMPLEMENTATION, TWO VIEWS - the Arena stage and the shared viewer
 * both call this, so a change to how a finisher flies through lands in
 * both or in neither.
 */
export function presentFinish(
  frame: { progress: number; displayProgress?: number; exiting?: boolean; speed?: number; phase?: string },
  elapsedMs: number,
  trajectory: FinishTrajectory | undefined,
  celebrating: boolean,
): typeof frame {
  const phase = finishPhase(elapsedMs, trajectory, celebrating);
  frame.phase = phase;
  frame.displayProgress = coastProgress(frame.progress, elapsedMs, trajectory);
  frame.exiting = phase === "crossing" || phase === "coasting";
  if (frame.exiting && trajectory) {
    /* Winding down on the same curve as the position, so the legs slow
       exactly as the racer slows. */
    const age = elapsedMs - trajectory.finishMs;
    frame.speed = Math.max(0, Math.min(1, trajectory.crossSpeed * Math.exp(-age / trajectory.tau) * 180));
  }
  return frame;
}
