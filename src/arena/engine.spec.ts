import { describe, expect, it } from "vitest";
import type { RaceRacer } from "./contracts";
import { simulate } from "./engine";

const racers: RaceRacer[] = Array.from({ length: 12 }, (_, index) => ({
  id: `r${index + 1}`,
  name: `Racer ${index + 1}`,
  number: index + 1,
  color: "#ffffff",
  pet: null,
}));

const legacyFixtures = [
  {
    seed: 1,
    ticks: 300,
    order: ["r2", "r1", "r4", "r8", "r11", "r12", "r9", "r10", "r5", "r3", "r7", "r6"],
    finishMs: [10303, 10307, 10404, 11324, 11376, 11638, 11662, 11753, 11890, 12203, 12445, 13085],
    checkpoints: [0.003374270861968398, 0.08452656865119934, 0.3303821384906769],
  },
  {
    seed: 8675309,
    ticks: 550,
    order: ["r9", "r8", "r3", "r5", "r6", "r4", "r1", "r11", "r12", "r2", "r7", "r10"],
    finishMs: [19207, 19823, 19863, 19926, 20054, 20437, 20612, 20999, 21363, 21763, 23058, 23312],
    checkpoints: [0.0018325245473533869, 0.04799583926796913, 0.2034650593996048],
  },
  {
    seed: 2147483647,
    ticks: 900,
    order: ["r11", "r3", "r10", "r8", "r5", "r9", "r6", "r2", "r7", "r12", "r1", "r4"],
    finishMs: [31011, 32207, 32711, 33151, 33668, 33865, 34590, 35022, 35238, 35247, 35664, 35755],
    checkpoints: [0.0011188192293047905, 0.02848602645099163, 0.11135232448577881],
  },
] as const;

describe("typed race engine legacy parity", () => {
  for (const fixture of legacyFixtures) {
    it(`matches seed ${fixture.seed} at ${fixture.ticks} ticks`, () => {
      const result = simulate(racers, fixture.ticks, fixture.seed);
      expect(result.order.map((row) => row.racer.id)).toEqual(fixture.order);
      expect(result.order.map((row) => row.finishMs)).toEqual(fixture.finishMs);
      expect([result.samples[0]![0], result.samples[0]![25], result.samples[0]![100]])
        .toEqual(fixture.checkpoints);
    });
  }
});
