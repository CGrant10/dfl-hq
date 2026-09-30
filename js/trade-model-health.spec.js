import { describe, expect, it } from "vitest";
import { recommendationOutcomes, recordTradeRecommendation, tradeModelHealth } from "./trade-model-health.js";
describe("trade model health", () => {
  it("reports projection, current form and injury coverage", () => {
    const pool = new Map([["1", { id: "1", name: "A", position: "WR", expectedPerGame: 14, currentGames: 3, recentGames: 3, recentAverage: 18 }], ["2", { id: "2", name: "B", position: "TE", expectedPerGame: 8, currentGames: 0, recentGames: 0, injuryStatus: "Questionable" }]]);
    const health = tradeModelHealth(pool);
    expect(health.projectionCoverage).toBe(100);
    expect(health.liveSamples).toBe(1);
    expect(health.injured).toBe(1);
    expect(health.disagreements[0].name).toBe("A");
  });
  it("grades a saved recommendation after players log new production", () => {
    const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
    const pool = new Map([["a", { currentPoints: 10, currentGames: 1 }], ["b", { currentPoints: 10, currentGames: 1 }]]);
    recordTradeRecommendation({ teamId: 1, partnerId: 2, sendA: ["a"], sendB: ["b"], weeklyDelta: 3 }, pool, storage);
    pool.get("a").currentPoints = 15; pool.get("a").currentGames = 2; pool.get("b").currentPoints = 20; pool.get("b").currentGames = 2;
    expect(recommendationOutcomes(pool, storage)).toEqual({ tracked: 1, graded: 1, hitRate: 100 });
  });
});
