import { describe, expect, it } from "vitest";
import { simulate, TICK_MS } from "./engine";
import type { RaceRacer } from "./contracts";
import {
  MAX_DROP,
  allowance,
  openEase,
  arcShape,
  closingEase,
  dramatize,
  launchEase,
  settleOffset,
  SETTLE_MIN,
  coastProgress,
  finishTrajectories,
  presentFinish,
} from "./theatre";
import { MAX_SETTLE, TRACK_START, presentationScreenRatio } from "./finish-presentation";

const racers: RaceRacer[] = Array.from({ length: 12 }, (_, i) => ({
  id: `r${i + 1}`, name: `Racer ${i + 1}`, number: i + 1, color: "#ffffff", pet: null,
}));

const SEEDS = [1, 7919, 90210, 424242, 8675309, 2147483647];
const runs = SEEDS.map((seed) => {
  const sim = simulate(racers, 300, seed);
  return { seed, sim, drama: dramatize(sim, seed) };
});

describe("theatre - what the simulation still owns", () => {
  it("never draws a racer across the line before they finish", () => {
    for (const { sim, drama } of runs) {
      for (let i = 0; i < sim.samples.length; i++) {
        for (let t = 0; t <= sim.frames; t++) {
          if ((sim.samples[i]![t] ?? 0) < 1) {
            expect(drama.shown[i]![t]!).toBeLessThan(1);
          }
        }
      }
    }
  });

  it("is byte-identical on replay, so a saved race is the same race", () => {
    for (const { seed, sim, drama } of runs) {
      const again = dramatize(simulate(racers, 300, seed), seed);
      for (let i = 0; i < sim.samples.length; i++) {
        expect(Array.from(again.shown[i]!)).toEqual(Array.from(drama.shown[i]!));
      }
      expect(again.events).toEqual(drama.events);
    }
  });

  it("reaches exactly the line the moment the truth does", () => {
    for (const { sim, drama } of runs) {
      for (let i = 0; i < sim.samples.length; i++) {
        for (let t = 0; t <= sim.frames; t++) {
          if ((sim.samples[i]![t] ?? 0) >= 1) expect(drama.shown[i]![t]!).toBe(1);
        }
      }
    }
  });
});

describe("theatre - backwards movement is a feature, but a bounded one", () => {
  it("lets racers visibly fall back through the field", () => {
    // The old model forbade this outright. If no racer ever loses ground
    // across six seeds, the drama has been tuned back out by accident.
    let reversingRacers = 0;
    let deepest = 0;
    for (const { sim, drama } of runs) {
      for (let i = 0; i < sim.samples.length; i++) {
        let worst = 0;
        for (let t = 1; t <= sim.frames; t++) {
          const drop = drama.shown[i]![t - 1]! - drama.shown[i]![t]!;
          if (drop > worst) worst = drop;
        }
        if (worst > 0.002) reversingRacers++;
        if (worst > deepest) deepest = worst;
      }
    }
    expect(reversingRacers).toBeGreaterThan(6);
    expect(deepest).toBeGreaterThan(0.004);
  });

  it("never slides behind the start line or off the track", () => {
    for (const { sim, drama } of runs) {
      for (let i = 0; i < sim.samples.length; i++) {
        for (let t = 0; t <= sim.frames; t++) {
          const p = drama.shown[i]![t]!;
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("bounds the backslide by the ground actually covered", () => {
    // You cannot lose ground you have not gained: early in the race the
    // drop allowance is small, which is what keeps racers off the start line.
    expect(allowance(0).behind).toBe(0);
    expect(allowance(0.1).behind).toBeCloseTo(0.09, 2);
    expect(allowance(1).behind).toBeLessThanOrEqual(MAX_DROP);
    expect(allowance(1).behind).toBeGreaterThan(0.35);
    // never above the covered ground, at any point
    for (let x = 0; x <= 1; x += 0.01) {
      expect(allowance(x).behind).toBeLessThanOrEqual(x * 0.9 + 1e-9);
      expect(allowance(x).ahead).toBeLessThanOrEqual((1 - x) * 0.85 + 1e-9);
    }
    for (const { sim, drama } of runs) {
      for (let i = 0; i < sim.samples.length; i++) {
        for (let t = 0; t <= sim.frames; t++) {
          const truth = sim.samples[i]![t] ?? 0;
          /* The launch is a separate mechanism from the drop allowance -
             off the line the drawn base is truth*launch, not truth - so the
             floor has to be stated against the same base the code uses. */
          const base = truth * launchEase(truth);
          expect(drama.shown[i]![t]!).toBeGreaterThanOrEqual(base - allowance(truth).behind - 1e-6);
        }
      }
    }
  });

  it("falls back as a sustained arc, never as jitter", () => {
    // A reversal has to last long enough to read as a collapse. Any run of
    // backward motion shorter than a few ticks is a flicker, not a story.
    for (const { sim, drama } of runs) {
      for (let i = 0; i < sim.samples.length; i++) {
        let run = 0;
        let depth = 0;
        const close = () => {
          /*
            Only a reversal big enough to SEE has to be sustained. A single
            tick of 1e-5 is float noise on the way through a turning point,
            not a twitch: 0.0015 of the track is about a pixel on a phone.
          */
          if (run > 0 && depth > 0.0015) expect(run).toBeGreaterThan(2);
          run = 0; depth = 0;
        };
        for (let t = 1; t <= sim.frames; t++) {
          const drop = drama.shown[i]![t - 1]! - drama.shown[i]![t]!;
          if (drop > 1e-7) { run++; depth += drop; } else close();
        }
        close();
      }
    }
  });

  it("bounds speed, and bounds the CHANGE in speed more tightly still", () => {
    /*
      The property that matters is acceleration, not velocity. A racer
      travelling fast is a surge; a racer changing speed instantly is a
      lurch, and only the second one looks broken. So the speed bound is
      generous and the jerk bound is the strict one - it is what actually
      guarantees the curve interpolates smoothly between ticks.
    */
    let maxStep = 0;
    let maxJerk = 0;
    for (const { sim, drama } of runs) {
      for (let i = 0; i < sim.samples.length; i++) {
        for (let t = 1; t <= sim.frames; t++) {
          const step = Math.abs(drama.shown[i]![t]! - drama.shown[i]![t - 1]!);
          if (step > maxStep) maxStep = step;
          if (t < 2) continue;
          /*
            WHILE RACING ONLY. At the finishing tick the SIMULATION clamps
            progress to 1 and holds it, so the truth's own velocity drops to
            zero there - and `shown` follows the truth at the line by
            design. That step is real, inherited, and never drawn: playback
            hands over to the coast at finishMs, which carries the racer
            through at speed. Measuring it here was measuring the engine,
            not the theatre; the value did not move across two unrelated
            changes to this file, which is what gave it away.
          */
          if ((sim.samples[i]![t] ?? 0) >= 1) continue;
          const v1 = drama.shown[i]![t]! - drama.shown[i]![t - 1]!;
          const v0 = drama.shown[i]![t - 1]! - drama.shown[i]![t - 2]!;
          if (Math.abs(v1 - v0) > maxJerk) maxJerk = Math.abs(v1 - v0);
        }
      }
    }
    /*
      Both bounds are EMPIRICAL ceilings sitting just above what this seed
      set actually produces (0.026 and 0.0050), not values derived from
      first principles. Their job is to fail if a future change makes the
      motion coarser than it is today.
    */
    expect(maxStep).toBeLessThan(0.028);            // no teleporting
    expect(maxJerk).toBeLessThan(0.0055);           // no lurching
  });
});

describe("theatre - convergence and shape", () => {
  it("closes the theatre smoothly onto the truth before the line", () => {
    // Keyed on each racer's own remaining time, not a shared progress mark.
    expect(closingEase(5000)).toBe(1);
    expect(closingEase(0)).toBe(0);
    expect(closingEase(450)).toBeLessThan(1);
    expect(closingEase(450)).toBeGreaterThan(0);
    // and the deviation itself has to be gone by the finish
    for (const { sim, drama } of runs) {
      for (let i = 0; i < sim.samples.length; i++) {
        for (let t = 0; t <= sim.frames; t++) {
          const truth = sim.samples[i]![t] ?? 0;
          if (truth > 0.985 && truth < 1) {
            expect(Math.abs(drama.shown[i]![t]! - truth)).toBeLessThan
              ? expect(Math.abs(drama.shown[i]![t]! - truth)).toBeLessThan(0.02)
              : undefined;
          }
        }
      }
    }
  });

  it("leaves the start line from a standstill", () => {
    expect(launchEase(0)).toBe(0);
    expect(launchEase(1)).toBe(1);
    for (const { drama } of runs) {
      for (const lane of drama.shown) expect(lane[0]!).toBeLessThan(0.01);
    }
  });

  it("holds the bottom of a collapse instead of bouncing straight out", () => {
    expect(arcShape(0, 0.4)).toBe(0);
    expect(arcShape(1, 0.4)).toBe(0);
    expect(arcShape(0.5, 0.4)).toBe(1);
    expect(arcShape(0.4, 0.4)).toBe(1);       // still on the plateau
    expect(arcShape(0.15, 0.4)).toBeGreaterThan(0);
    expect(arcShape(0.15, 0.4)).toBeLessThan(1);
  });

  it("produces real collapse-and-comeback stories", () => {
    // At least one racer somewhere should lose a lot of ground and get it
    // back. This is the whole point of the pass; if tuning kills it, fail.
    let stories = 0;
    for (const { sim, drama } of runs) {
      for (let i = 0; i < sim.samples.length; i++) {
        let maxDeficit = 0;
        for (let t = 0; t <= sim.frames; t++) {
          const deficit = (sim.samples[i]![t] ?? 0) - drama.shown[i]![t]!;
          if (deficit > maxDeficit) maxDeficit = deficit;
        }
        // fell a long way behind their own true position, and still arrived
        if (maxDeficit > 0.12 && drama.shown[i]![sim.frames]! >= 0.99) stories++;
      }
    }
    expect(stories).toBeGreaterThan(0);
  });
});

describe("theatre - the event queue", () => {
  it("stamps every arc once, in playback order", () => {
    for (const { drama } of runs) {
      const seen = new Set<string>();
      let last = -1;
      for (const e of drama.events) {
        expect(e.ms).toBeGreaterThanOrEqual(last);
        last = e.ms;
        const key = `${e.racer}:${e.kind}:${e.ms}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        expect(e.durMs).toBeGreaterThan(0);
        expect(Number.isFinite(e.ms / TICK_MS)).toBe(true);
      }
    }
  });

  /* ===================== the run-out has to fan ===================== */

  it("fans the field across the WHOLE run-off, whatever size the field is", () => {
    /*
      THE HUDDLE, AS ARITHMETIC. The step used to be a flat 0.022 per place,
      which spreads twelve racers over 0.242 of progress no matter how much
      run-off exists - so widening MAX_SETTLE slid the pack further down the
      track without spreading it at all. Same pile, further right.

      The step is derived from the run-off and the field now, so first place
      parks at MAX_SETTLE, last place at SETTLE_MIN, and every field size
      uses all the room there is.
    */
    for (const count of [4, 8, 12]) {
      expect(settleOffset(1, count)).toBeCloseTo(MAX_SETTLE);
      expect(settleOffset(count, count)).toBeCloseTo(SETTLE_MIN);
    }
  });

  it("gives every place its own parking spot, monotonically", () => {
    const count = 12;
    const spots = Array.from({ length: count }, (_, i) => settleOffset(i + 1, count));
    expect(new Set(spots.map((v) => v.toFixed(6))).size).toBe(count);
    for (let i = 1; i < spots.length; i += 1) {
      expect(spots[i]!).toBeLessThan(spots[i - 1]!);
    }
  });

  it("separates finishers by a readable share of a racer width", () => {
    /*
      A drawn racer is 10% of the frame wide, so twelve of them standing clear
      of each other would need 120% of the frame and is not on offer. What IS
      on offer is a stagger big enough to read as placings rather than as a
      pile: about a third of a racer width per place.

      At the old numbers this was 1.2% of the frame - an eighth of a racer -
      which is what "the racers huddle up to it" was describing.
    */
    const count = 12;
    const screenAt = (place: number) =>
      presentationScreenRatio(1 + settleOffset(place, count));
    const first = screenAt(1), last = screenAt(count);
    expect(first - last).toBeGreaterThan(0.28);
    const perPlace = (first - last) / (count - 1);
    expect(perPlace).toBeGreaterThan(0.025);
    // Everybody parks past the line, and nobody parks off the frame.
    expect(last).toBeGreaterThan(presentationScreenRatio(1));
    expect(first).toBeLessThan(0.95);
    expect(last).toBeGreaterThan(TRACK_START);
  });


  /* ============== through the line, not into a wind-down ============== */

  const traj = (crossSpeed: number, settle: number, finishMs = 10_000) =>
    ({ finishMs, place: 1, crossSpeed, settle, tau: settle / crossSpeed,
       coastMs: settle / crossSpeed });

  it("keeps EXACTLY the crossing pace after the line", () => {
    /*
      THE SLOW-MOTION BUG. This was an exponential wind-down,
      1 + S(1 - e^(-age/tau)), whose velocity starts at v0 and decays to
      nothing - so a racer crossed the line and immediately began gliding to a
      halt. Velocity-continuous, and still wrong: a runner crosses a finish
      line and keeps running.
    */
    const t = traj(0.0002, 0.65);
    const step = 50;
    const speeds: number[] = [];
    for (let age = 0; age + step <= t.coastMs - step; age += step) {
      const a = coastProgress(1, t.finishMs + age, t);
      const b = coastProgress(1, t.finishMs + age + step, t);
      speeds.push((b - a) / step);
    }
    expect(speeds.length).toBeGreaterThan(4);
    for (const v of speeds) expect(v).toBeCloseTo(t.crossSpeed, 9);
    // No decay whatsoever: last stride is the same as the first.
    expect(speeds.at(-1)!).toBeCloseTo(speeds[0]!, 9);
  });

  it("is continuous at the line and never goes backwards", () => {
    const t = traj(0.00018, 0.5);
    expect(coastProgress(1, t.finishMs, t)).toBeCloseTo(1);
    let prev = -Infinity;
    for (let age = 0; age <= t.coastMs * 2; age += 16) {
      const x = coastProgress(1, t.finishMs + age, t);
      expect(x).toBeGreaterThanOrEqual(prev - 1e-12);
      expect(x).toBeGreaterThanOrEqual(1);
      prev = x;
    }
  });

  it("holds at the run-out limit rather than running off the map", () => {
    const t = traj(0.0002, 0.65);
    const held = coastProgress(1, t.finishMs + t.coastMs * 4, t);
    expect(held).toBeCloseTo(1 + t.settle);
    expect(coastProgress(1, t.finishMs + t.coastMs * 40, t)).toBeCloseTo(1 + t.settle);
  });

  it("does not wind the legs down either", () => {
    // The renderer speed decayed on the same exponential, so the run
    // animation slowed to a walk while the racer was still visibly moving.
    const t = traj(0.0002, 0.65);
    const early = { progress: 1 } as { progress: number; speed?: number; phase?: string };
    const late = { progress: 1 } as { progress: number; speed?: number; phase?: string };
    presentFinish(early, t.finishMs + 20, t, false);
    presentFinish(late, t.finishMs + t.coastMs * 0.9, t, false);
    expect(early.speed).toBeGreaterThan(0);
    expect(late.speed).toBeCloseTo(early.speed!, 9);
  });

  it("hands the renderer a finisher speed in the same units as a racer's", () => {
    /*
      THE 40x BUG. crossingSpeeds() is progress per MILLISECOND;
      presentationRacerFrame() builds its speed from progress per TICK. This
      line used the per-ms number in the per-tick formula, so a racer's legs
      dropped to a fortieth of their rate the instant they crossed - slow
      motion coming from the animation rather than from the geometry.

      A mid-race racer covering the course over a few hundred ticks sits
      around 0.7, so a finisher at the same ground speed has to be in that
      neighbourhood and nowhere near 0.02.
    */
    const sim = simulate(racers, 320, 90210);
    const all = finishTrajectories(sim);
    const winner = all[sim.order[0]!.index]!;
    const frame = { progress: 1 } as { progress: number; speed?: number; phase?: string };
    presentFinish(frame, winner.finishMs + 40, winner, false);
    expect(frame.speed).toBeGreaterThan(0.2);
    expect(frame.speed).toBeLessThanOrEqual(1);
  });

  it("still fans the field across the run-off with the pace unchanged", () => {
    // The run-through must not have cost the anti-huddle fix: the per-place
    // settle DISTANCE is what spreads them, not the deceleration curve.
    const sim = simulate(racers, 320, 90210);
    const all = finishTrajectories(sim);
    const settled = sim.order.map((row) => {
      const t = all[row.index]!;
      return coastProgress(1, row.finishMs + t.coastMs * 2, t);
    });
    expect(new Set(settled.map((v) => v.toFixed(6))).size).toBe(12);
    expect(Math.max(...settled) - Math.min(...settled)).toBeGreaterThan(0.4);
    for (const v of settled) expect(v).toBeGreaterThan(1);
  });

});
