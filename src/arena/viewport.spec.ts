import { describe, expect, it } from "vitest";
import { arenaViewport, laneY, screenX } from "./viewport";

describe("Arena responsive viewport", () => {
  const devices = [[320, 568], [390, 844], [667, 375], [844, 390], [1280, 720], [1920, 1080]] as const;
  for (const [width, height] of devices) {
    it(`keeps all 12 lanes visible at ${width}x${height}`, () => {
      const view = arenaViewport(width, height);
      const first = laneY(view, 0, 12);
      const last = laneY(view, 11, 12);
      expect(first).toBeGreaterThan(0);
      expect(last).toBeLessThan(view.height);
      expect(last).toBeGreaterThan(first);
      expect(screenX(view, 0)).toBeGreaterThanOrEqual(0);
      expect(screenX(view, 1)).toBeLessThanOrEqual(view.width);
      expect(first).toBeCloseTo(view.height * (0.1 + 0.8 / 24));
      expect(last).toBeCloseTo(view.height * (0.9 - 0.8 / 24));
      expect(screenX(view, 0)).toBeCloseTo(view.width * 0.03);
      expect(screenX(view, 1)).toBeCloseTo(view.width * 0.91);
    });
  }
  it("matches the legacy responsive racer sizes", () => {
    expect(arenaViewport(1280, 720).actorScale * 72).toBeCloseTo(88);
    expect(arenaViewport(1920, 1080).actorScale * 72).toBeCloseTo(88);
    expect(arenaViewport(390, 844).actorScale * 72).toBeCloseTo(68);
    expect(arenaViewport(667, 375).actorScale * 72).toBeCloseTo(88);
    expect(arenaViewport(844, 390).actorScale * 72).toBeCloseTo(88);
  });
  it("clamps invalid lane and progress values", () => {
    const view = arenaViewport(1280, 720);
    expect(laneY(view, -4, 12)).toBe(laneY(view, 0, 12));
    expect(laneY(view, 99, 12)).toBe(laneY(view, 11, 12));
    expect(screenX(view, -1)).toBe(screenX(view, 0));
    expect(screenX(view, 2)).toBe(screenX(view, 1));
  });

  it("uses the shared finish camera without changing the default geometry", () => {
    const view = arenaViewport(1280, 720);
    const camera = { state: "finish" as const, mix: 1, finishRatio: 0.76 };
    expect(screenX(view, 1, camera)).toBeCloseTo(view.width * 0.76);
    expect(screenX(view, 1.2, camera)).toBeGreaterThan(screenX(view, 1, camera));
    expect(laneY(view, 11, 12, 1)).toBeLessThan(view.height);
  });
});

