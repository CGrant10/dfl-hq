import { describe, expect, it } from "vitest";
import {
  FINISH_LINE_RATIO,
  MAX_CAMERA_MIX,
  MAX_SETTLE,
  REVEAL_FROM,
  REVEAL_FULL,
  RUN_OFF_RATIO,
  TRACK_START,
  finishReveal,
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

  it("sweeps the stripe in late, and parks it before anyone crosses", () => {
    expect(finishReveal(0.5)).toBe(0);
    expect(finishReveal(REVEAL_FROM)).toBe(0);
    expect(finishReveal(0.89)).toBeGreaterThan(0);
    expect(finishReveal(0.89)).toBeLessThan(1);
    /* Fully parked while the leader still has ground to cover - the sweep
       must never still be moving when the first finisher arrives. */
    expect(finishReveal(REVEAL_FULL)).toBe(1);
    expect(REVEAL_FULL).toBeLessThan(0.94);   // real margin, not a photo finish
    expect(finishReveal(1)).toBe(1);
  });

  it("moves the stripe without moving a single racer", () => {
    /*
      The sweep is scenery: it is a CSS transform on the marker element and
      nothing in the geometry reads it. Racer x for a given progress must be
      identical at every point of the sweep.
    */
    for (const p of [0.5, 0.88, 0.94, 1, 1.2]) {
      const atStart = presentationScreenRatio(p, cameraForLeader(REVEAL_FROM));
      const midSweep = presentationScreenRatio(p, cameraForLeader(0.89));
      const parked = presentationScreenRatio(p, cameraForLeader(1));
      expect(midSweep).toBe(atStart);
      expect(parked).toBe(atStart);
    }
  });

  it("keeps the reveal out of the geometry so it cannot move a racer", () => {
    /*
      The brief asked for the stripe to slide left on reveal with the
      mapping interpolated. That is not possible: screen position is
      progress * scale, so shrinking the scale walks every racer left, and
      at p=0.95 the drift only drops below the racer's own forward speed at
      about a six second transition. The reveal is opacity, and this test
      is what stops anyone reintroducing it.
    */
    for (const p of [0.5, 0.9, 1, 1.2]) {
      const before = presentationScreenRatio(p, cameraForLeader(0.5));
      const after = presentationScreenRatio(p, cameraForLeader(1));
      expect(after).toBe(before);
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
