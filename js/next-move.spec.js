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

  it("does not manufacture a move when every starting unit is league average", () => {
    const solid = { ...mine, positionGrades: Object.fromEntries(Object.entries(mine.positionGrades)
      .map(([position, grade]) => [position, { ...grade, percentile: Math.max(.55, grade.percentile) }])) };
    const view = buildNextMove({ analysis: { state: "ready", teams: [solid, partner] }, weekly, meSleeperId: "u1" });
    expect(view).toBeNull();
  });

  it("does not shop for a position already covered by a playable bench option", () => {
    const covered = {
      ...mine,
      playerIds: ["herbert", "young"], starters: ["herbert"],
      positionGrades: {
        QB: { percentile: .2, grade: "D", leagueRank: 11,
          starters: [player("herbert", "Justin Herbert", "QB", 7.88, 80)] },
        RB: { percentile: .7, grade: "B+", leagueRank: 4 },
        WR: { percentile: .7, grade: "B+", leagueRank: 4 },
        TE: { percentile: .6, grade: "B", leagueRank: 5 },
      },
      lineup: { bench: [player("young", "Bryce Young", "QB", 24.08, 30)] },
    };
    const qbMarket = { ...partner, playerIds: ["goff"], lineup: { bench: [player("goff", "Jared Goff", "QB", 30.78, 55)] } };
    const live = { ...weekly, pool: new Map([
      ["herbert", { id: "herbert", position: "QB", points: 7.88, hasGame: true, isOut: false }],
      ["young", { id: "young", position: "QB", points: 24.08, hasGame: true, isOut: false }],
      ["goff", { id: "goff", position: "QB", points: 30.78, hasGame: true, isOut: false }],
    ]) };
    expect(buildNextMove({ analysis: { state: "ready", teams: [covered, qbMarket] }, weekly: live, meSleeperId: "u1" })).toBeNull();
  });

  it("skips a position when an active bench player is already comparable to the market", () => {
    const covered = {
      ...mine,
      playerIds: [...mine.playerIds, "bench-te"],
      positionGrades: {
        ...mine.positionGrades,
        RB: { percentile: .7, grade: "A−", leagueRank: 3 },
        TE: { percentile: .2, grade: "C", leagueRank: 9 },
      },
      lineup: { bench: [player("bench-te", "Good Enough TE", "TE", 10, 35)] },
    };
    const tePartner = { ...partner, playerIds: ["market-te"], lineup: { bench: [player("market-te", "Market TE", "TE", 10.5, 40)] } };
    const teWeekly = { ...weekly, pool: new Map([
      ["bench-te", { id: "bench-te", position: "TE", points: 10, hasGame: true, isOut: false }],
      ["market-te", { id: "market-te", position: "TE", points: 10.5, hasGame: true, isOut: false }],
      ["free-te", { id: "free-te", position: "TE", points: 10.2, hasGame: true, isOut: false }],
    ]) };
    expect(buildNextMove({ analysis: { state: "ready", teams: [covered, tePartner] }, weekly: teWeekly, meSleeperId: "u1" })).toBeNull();
  });
});
