import { describe, expect, it } from "vitest";
import { completedTrades, rankTradeFleeces, tradeSides } from "./trade-fleeces.js";

const scoring = new Map([[2023, { rec: 1 }], [2024, { rec: 1 }]]);
const stats = new Map([
  [2023, { star: { rec: 100 }, bench: { rec: 20 } }],
  [2024, { star: { rec: 80 }, bench: { rec: 10 } }],
]);
const trade = { season: 2022, week: 6, type: "trade", status: "complete", details: {
  status: "complete", roster_ids: [1, 2], adds: { star: 1, bench: 2 }, drops: { star: 2, bench: 1 },
} };

describe("historical trade fleeces", () => {
  it("keeps only explicitly completed trade transactions", () => {
    expect(completedTrades([trade, { ...trade, status: "pending" }, { ...trade, type: "waiver" }])).toEqual([trade]);
  });

  it("groups acquired players by their destination roster", () => {
    expect(tradeSides(trade)).toEqual([
      { rosterId: "1", playerIds: ["star"] },
      { rosterId: "2", playerIds: ["bench"] },
    ]);
  });

  it("ranks the production gap over the next completed seasons", () => {
    const [result] = rankTradeFleeces({ trades: [trade], latestSeason: 2024, statsBySeason: stats, scoringBySeason: scoring });
    expect(result.winner.rosterId).toBe("1");
    expect(result.winner.outcome).toBe(90);
    expect(result.loser.outcome).toBe(15);
    expect(result.gap).toBe(75);
  });

  it("keeps the two known prank reversals out of the fleece ranking", () => {
    const prank = id => ({ ...trade, details: { ...trade.details, transaction_id: id } });
    const results = rankTradeFleeces({
      trades: [prank("907844411101487104"), prank("907840843644805120"), trade],
      latestSeason: 2024,
      statsBySeason: stats,
      scoringBySeason: scoring,
    });
    expect(results).toHaveLength(1);
    expect(results[0].trade).toBe(trade);
  });
});
