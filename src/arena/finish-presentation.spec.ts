import { describe, expect, it } from "vitest";
import {
  FINISH_LINE_RATIO,
  FINISH_APPROACH_RATIO,
  FINAL_STRETCH_START,
  PHOTO_FINISH_THRESHOLD_MS,
  POST_FINISH_MS,
  cameraForLeader,
  createFinishPresentation,
  postFinishProgress,
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
  it("leaves normal camera geometry untouched before the final stretch", () => {
    const camera = cameraForLeader(0.8);
    expect(camera.state).toBe("normal");
    expect(presentationScreenRatio(1, camera)).toBeCloseTo(0.91);
  });

  it("anchors the stripe and lets racers travel beyond it", () => {
    const camera = cameraForLeader(1);
    expect(camera.state).toBe("finish");
    expect(presentationScreenRatio(1, camera)).toBeCloseTo(FINISH_LINE_RATIO);
    const after = postFinishProgress(1, 10_000 + POST_FINISH_MS, 10_000);
    expect(after).toBeGreaterThan(1);
    expect(presentationScreenRatio(after, camera)).toBeGreaterThan(FINISH_LINE_RATIO);
  });

  it("expands the authoritative final stretch without reversing racers", () => {
    const camera = cameraForLeader(1);
    expect(presentationScreenRatio(FINAL_STRETCH_START, camera)).toBeCloseTo(FINISH_APPROACH_RATIO);
    expect(presentationScreenRatio(0.9, camera)).toBeGreaterThan(0.3);
    expect(presentationScreenRatio(0.95, camera)).toBeGreaterThan(0.5);
    const samples = [0.82, 0.86, 0.9, 0.94, 0.98, 1, 1.1]
      .map((progress) => presentationScreenRatio(progress, camera));
    expect(samples.every((value, index) => index === 0 || value > samples[index - 1]!)).toBe(true);
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
