import { describe, expect, it } from "vitest";
import {
  FINISH_LINE_RATIO,
  MAX_CAMERA_MIX,
  MAX_SETTLE,
  RUN_OFF_RATIO,
  TRACK_START,
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
