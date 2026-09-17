import { describe, expect, it } from "vitest";
import { buildNextMove, nextMoveCard, nextMovePanel } from "./next-move.js";

const player = (id, name, position, expectedPerGame, tradeValue) => ({ id, name, position, expectedPerGame, tradeValue });
const mine = {
  id: "1", sleeper_user_id: "u1", team_name: "Mine", playerIds: ["my-rb"],
  positionGrades: {
    QB: { percentile: .8, grade: "A", leagueRank: 2 }, RB: { percentile: .2, grade: "C", leagueRank: 9 },
    WR: { percentile: .7, grade: "A−", leagueRank: 3 }, TE: { percentile: .6, grade: "B+", leagueRank: 4 },
  }, lineup: { bench: [player("my-rb", "My Reserve", "RB", 6, 30)] },
};
const partner = {
  id: "2", sleeper_user_id: "u2", team_name: "Trade Partner", playerIds: ["target"],
  lineup: { bench: [player("target", "Bench Target", "RB", 10, 55)] },
};
const analysis = { state: "ready", teams: [mine, partner] };
const weekly = { season: 2026, week: 2, teams: [
  { sleeper_user_id: "u1", projection: 105 }, { sleeper_user_id: "u2", projection: 120 },
], pool: new Map([
  ["target", { id: "target", name: "Bench Target", position: "RB", points: 13, hasGame: true, isOut: false }],
  ["free", { id: "free", name: "Waiver Rocket", position: "RB", points: 14, hasGame: true, isOut: false }],
]) };

describe("dashboard next move", () => {
  it("separates another roster's depth from a truly unrostered waiver", () => {
    const view = buildNextMove({ analysis, weekly, meSleeperId: "u1", trending: { adds: new Map([["free", 1234]]) } });
    expect(view.need).toMatchObject({ position: "RB", urgent: true });
    expect(view.trade.player.name).toBe("Bench Target");
    expect(view.waiver.player.name).toBe("Waiver Rocket");
    expect(nextMoveCard(view)).toContain("1.2k adds today");
    expect(nextMovePanel(view)).toContain("hd-next-move");
  });

  it("does not call a solid lowest-ranked unit an urgent need", () => {
    const solid = { ...mine, positionGrades: Object.fromEntries(Object.entries(mine.positionGrades)
      .map(([position, grade]) => [position, { ...grade, percentile: Math.max(.55, grade.percentile) }])) };
    const view = buildNextMove({ analysis: { state: "ready", teams: [solid, partner] }, weekly, meSleeperId: "u1" });
    expect(view.need.urgent).toBe(false);
    expect(nextMoveCard(view)).toContain("No starting unit grades as an urgent need");
  });
});
