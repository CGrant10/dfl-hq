import { describe, expect, it } from "vitest";
import { arenaViewport, laneY, screenX } from "./viewport";

describe("Arena responsive viewport", () => {
  const devices = [[320, 568], [390, 844], [844, 390], [1280, 720], [1920, 1080]] as const;
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
      expect(view.actorScale * 58).toBeLessThan(view.laneHeight / 6);
    });
  }
  it("clamps invalid lane and progress values", () => {
    const view = arenaViewport(1280, 720);
    expect(laneY(view, -4, 12)).toBe(laneY(view, 0, 12));
    expect(laneY(view, 99, 12)).toBe(laneY(view, 11, 12));
    expect(screenX(view, -1)).toBe(screenX(view, 0));
    expect(screenX(view, 2)).toBe(screenX(view, 1));
  });
});

