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
    order: ["r11", "r9", "r2", "r6", "r4", "r5", "r10", "r12", "r1", "r7", "r3", "r8"],
    finishMs: [10961, 11846, 12228, 12909, 12960, 13232, 13477, 13838, 14251, 14810, 14990, 15214],
    checkpoints: [0.0032215036917477846, 0.0654439926147461, 0.23603704571723938],
  },
  {
    seed: 8675309,
    ticks: 550,
    order: ["r2", "r7", "r10", "r8", "r1", "r3", "r4", "r5", "r11", "r9", "r6", "r12"],
    finishMs: [21363, 21799, 21948, 23113, 23202, 23512, 23689, 23796, 24671, 25606, 26056, 28902],
    checkpoints: [0.0018030678620561957, 0.043282847851514816, 0.17318102717399597],
  },
  {
    seed: 2147483647,
    ticks: 900,
    order: ["r3", "r10", "r8", "r2", "r11", "r1", "r5", "r4", "r6", "r12", "r9", "r7"],
    finishMs: [32628, 33502, 35721, 37011, 37711, 37928, 39110, 40511, 41039, 42797, 43193, 43771],
    checkpoints: [0.0010784240439534187, 0.03163321688771248, 0.10701527446508408],
  },
] as const;

/*
  These fixtures are a PARITY LOCK between src/arena/engine.ts and the
  js/arena/race.js copy the app actually runs, not a promise that the physics
  never change. They were regenerated when the finish-spread model landed; the
  cross-check below is the part that must never be relaxed, because two copies
  of a simulation drifting apart is the one failure nothing else would catch.
*/
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

/*
  The two implementations, on the same seeds, must agree exactly. race.js is
  what pages/broadcast.js plays and engine.ts is what everything typed reads,
  so a change made to one and not the other would silently give the Race View
  and the saved result two different races.
*/
describe("engine.ts matches the js copy it was ported from", () => {
  for (const fixture of legacyFixtures) {
    it(`agrees with race.js on seed ${fixture.seed}`, async () => {
      /* race-sim.js is untyped by design - it is the copy the browser loads
         directly - so the shape is asserted here rather than inferred.

         Imported from race-sim.js rather than race.js on purpose. race.js
         re-exports finish helpers from pixi-runtime-finish.js, which does
         `export * from pixi-runtime.js`, so importing it pulled the whole
         PixiJS runtime in front of a 2ms arithmetic check - 3.5s of it under
         full-suite load, against a 5s timeout. That is what made this spec
         fail on the first seed and pass on the rest. */
      const legacy = (await import("../../js/arena/race-sim.js")) as unknown as {
        simulate: (r: readonly RaceRacer[], t: number, s: number) =>
          { order: { racer: RaceRacer; finishMs: number }[] };
      };
      const typed = simulate(racers, fixture.ticks, fixture.seed);
      const plain = legacy.simulate(racers, fixture.ticks, fixture.seed);
      expect(typed.order.map((r) => r.racer.id)).toEqual(plain.order.map((r) => r.racer.id));
      expect(typed.order.map((r) => r.finishMs)).toEqual(plain.order.map((r) => r.finishMs));
    });
  }
});
