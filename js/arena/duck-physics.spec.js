import { describe, expect, it } from "vitest";
import { DUCK_TICK_MS, simulateForwardRace } from "./duck-physics.js";

describe("Arena forward race", () => {
  it("gives the full field visible separation throughout P1's run", () => {
    const racers = Array.from({ length: 12 }, (_, i) => ({ id: i + 1 }));
    const sim = simulateForwardRace(racers, 1500, 90210);
    const winnerTick = Math.max(1, Math.round(sim.order[0].finishMs / DUCK_TICK_MS));
    const checkpoints = [0.2, 0.4, 0.6, 0.8];

    for (const frac of checkpoints) {
      const tick = Math.min(sim.frames, Math.round(winnerTick * frac));
      const positions = sim.samples.map((lane) => lane[tick]);
      const spread = Math.max(...positions) - Math.min(...positions);
      expect(spread).toBeGreaterThan(0.03);
    }
  });

  it("clears the field quickly only after P1 crosses, preserving race order", () => {
    const racers = Array.from({ length: 12 }, (_, i) => ({ id: i + 1 }));
    const sim = simulateForwardRace(racers, 1500, 424242);
    const winnerMs = sim.order[0].finishMs;
    const lastMs = sim.order.at(-1).finishMs;

    expect(lastMs - winnerMs).toBeLessThanOrEqual(1800);
    for (let i = 1; i < sim.order.length; i++) {
      expect(sim.order[i].finishMs).toBeGreaterThanOrEqual(sim.order[i - 1].finishMs);
    }
    expect(winnerMs).toBeGreaterThan(0);
    expect(DUCK_TICK_MS).toBe(40);
  });
});
