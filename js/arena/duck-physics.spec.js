import { describe, expect, it } from "vitest";
import {
  DUCK_TICK_MS,
  HOME_STRETCH_MIN_MULTIPLIER,
  HOME_STRETCH_START,
  homeStretchFloor,
  simulateForwardRace,
} from "./duck-physics.js";

describe("Arena forward finish", () => {
  it("does not preserve a crawl as the home-stretch floor", () => {
    const base = 1 / 1500;
    expect(homeStretchFloor(base, base * 0.1)).toBeCloseTo(base * HOME_STRETCH_MIN_MULTIPLIER, 12);
    expect(homeStretchFloor(base, base * 3)).toBeCloseTo(base * 3, 12);
  });

  it("gets every racer through the last 14% promptly on a one-minute race", () => {
    const racers = Array.from({ length: 12 }, (_, i) => ({ id: i + 1 }));
    const sim = simulateForwardRace(racers, 1500, 90210);

    for (const row of sim.order) {
      const samples = sim.samples[row.index];
      let homeTick = 0;
      while (homeTick < samples.length && samples[homeTick] < HOME_STRETCH_START) homeTick++;
      expect(homeTick).toBeLessThan(samples.length);
      const homeMs = homeTick * DUCK_TICK_MS;
      expect(row.finishMs - homeMs).toBeLessThanOrEqual(4000);
    }
  });
});
