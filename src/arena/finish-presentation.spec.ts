import { describe, expect, it } from "vitest";
import {
  FINISH_LINE_RATIO,
  MAX_CAMERA_MIX,
  MAX_SETTLE,
  RUN_OFF_RATIO,
  TRACK_START,
  finishPassProgress,
  PRE_FINISH_SWEEP_MS,
  FINAL_STRETCH_START,
  PHOTO_FINISH_THRESHOLD_MS,
  cameraForLeader,
  createFinishPresentation,
  presentationScreenRatio,
} from "./finish-presentation";

const racers = [
  { id: "a", name: "Alpha", number: 1, color: "#fff", pet: null },
  { id: "b", name: "Bravo", number: 2, color: "#fff", pet: null },
  { id: "c", name: "Charlie", number: 3, color: "#fff", pet: null },
];
const order = [
  { index: 0, finishMs: 10_000 },
  { index: 1, finishMs: 10_120 },
  { index: 2, finishMs: 11_000 },
];

describe("Arena finish presentation", () => {
  it("maps the track with one straight line the camera cannot bend", () => {
    // The whole point of the rewrite: geometry is independent of the camera,
    // so "a bit of finish emphasis" can never slide a racer sideways.
    for (const leader of [0, 0.5, 0.85, 0.94, 1]) {
      const camera = cameraForLeader(leader);
      expect(presentationScreenRatio(0, camera)).toBeCloseTo(TRACK_START);
      expect(presentationScreenRatio(1, camera)).toBeCloseTo(FINISH_LINE_RATIO);
      expect(presentationScreenRatio(0.5, camera)).toBeCloseTo(
        TRACK_START + 0.5 * (FINISH_LINE_RATIO - TRACK_START));
    }
  });

  it("keeps the gradient continuous where a racer crosses", () => {
    // A change of scale at the stripe is exactly what reads as a stutter.
    const camera = cameraForLeader(1);
    const h = 1e-4;
    const before = (presentationScreenRatio(1, camera) - presentationScreenRatio(1 - h, camera)) / h;
    const after = (presentationScreenRatio(1 + h, camera) - presentationScreenRatio(1, camera)) / h;
    expect(after / before).toBeGreaterThan(0.85);
    expect(after / before).toBeLessThan(1.2);
  });

  it("gives finishers a run-off strip and never leaves the frame", () => {
    const camera = cameraForLeader(1);
    expect(presentationScreenRatio(1 + MAX_SETTLE, camera))
      .toBeCloseTo(FINISH_LINE_RATIO + RUN_OFF_RATIO);
    expect(presentationScreenRatio(1 + MAX_SETTLE, camera)).toBeLessThan(1);
    expect(presentationScreenRatio(99, camera)).toBeLessThan(1);
    const samples = [0.5, 0.9, 1, 1.05, 1.1, 1.16]
      .map((progress) => presentationScreenRatio(progress, camera));
    expect(samples.every((value, index) => index === 0 || value > samples[index - 1]!)).toBe(true);
  });

  it("reserves a real run-out: stripe near the middle, open space past it", () => {
    // The huddle was geometric: twelve parking spots inside 12% of the
    // frame, hard against a stripe at 78%. The stripe is at 58% now and the
    // run-out is the rest.
    expect(FINISH_LINE_RATIO).toBeGreaterThan(0.5);
    expect(FINISH_LINE_RATIO).toBeLessThan(0.62);
    const runOut = presentationScreenRatio(1 + MAX_SETTLE) - presentationScreenRatio(1);
    expect(runOut).toBeGreaterThan(0.15);
    expect(presentationScreenRatio(1 + MAX_SETTLE)).toBeLessThan(0.97);
  });

  it("passes through once, monotonically, and never reverses", () => {
    /*
      THE BOOMERANG REGRESSION. The old reveal was a function of drawn
      leader progress, which is non-monotonic because collapses are a
      feature - measured, the stripe reversed in 8 of 25 seeded races.
      This is a clamped ramp on a clock, so it cannot.
    */
    const first = 11_099;
    const last = 12_447;
    let prev = -1;
    for (let ms = 0; ms <= last + 4000; ms += 16) {
      const p = finishPassProgress(ms, first, last);
      expect(p).toBeGreaterThanOrEqual(prev);       // never goes backwards
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      prev = p;
    }
  });

  it("is hidden for almost the whole race and enters only at the end", () => {
    const first = 11_099;
    const last = 12_447;
    expect(finishPassProgress(0, first, last)).toBe(0);
    expect(finishPassProgress(first - PRE_FINISH_SWEEP_MS, first, last)).toBe(0);
    expect(finishPassProgress(first * 0.5, first, last)).toBe(0);
    expect(finishPassProgress(first, first, last)).toBeGreaterThan(0);
    expect(finishPassProgress(first, first, last)).toBeLessThan(1);
    // and it is gone once everyone is home
    expect(finishPassProgress(last + 2000, first, last)).toBe(1);
  });

  it("cannot be dragged backwards by a racer falling back", () => {
    /*
      Seed 32676 reversed the old implementation. The input here is elapsed
      time, so a backslide in `shown` is structurally incapable of moving
      the scenery - this asserts the signature carries no progress at all.
    */
    const a = finishPassProgress(11_000, 11_099, 12_447);
    const b = finishPassProgress(11_000, 11_099, 12_447);
    expect(a).toBe(b);
    expect(finishPassProgress(11_050, 11_099, 12_447)).toBeGreaterThan(a);
  });

  it("derives identically for live and shared from the same inputs", () => {
    // Stateless and pure: two callers with the same clock agree by
    // construction, so the two views cannot drift.
    for (const ms of [0, 9000, 10_500, 11_099, 12_000, 13_500]) {
      expect(finishPassProgress(ms, 11_099, 12_447))
        .toBe(finishPassProgress(ms, 11_099, 12_447));
    }
  });

  it("keeps the camera to an emphasis signal, not a move", () => {
    expect(cameraForLeader(0.5).mix).toBe(0);
    expect(cameraForLeader(1).mix).toBeCloseTo(MAX_CAMERA_MIX);
    expect(MAX_CAMERA_MIX).toBeLessThan(0.4);
  });

  it("uses the real P1/P2 gap for photo finish and a brief hit-stop", () => {
    const atStripe = createFinishPresentation({ elapsedMs: 10_120, leaderProgress: 1, order, racers });
    expect(atStripe.photoFinish?.gapMs).toBe(120);
    expect(atStripe.photoFinish?.phase).toBe("flash");
    expect(atStripe.visualElapsedMs).toBe(10_120);
    const outside = createFinishPresentation({
      elapsedMs: 10_250, leaderProgress: 1,
      order: [{ index: 0, finishMs: 10_000 }, { index: 1, finishMs: 10_000 + PHOTO_FINISH_THRESHOLD_MS + 1 }],
      racers,
    });
    expect(outside.photoFinish).toBeUndefined();
  });

  it("waits until every official finish before celebrating", () => {
    expect(createFinishPresentation({ elapsedMs: 11_200, leaderProgress: 1, order, racers }).celebrationActive).toBe(false);
    expect(createFinishPresentation({ elapsedMs: 11_400, leaderProgress: 1, order, racers }).celebrationActive).toBe(true);
  });
});
