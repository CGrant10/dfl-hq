import { describe, expect, it, vi } from "vitest";
vi.mock("./supabase.js", () => ({ db: vi.fn(), edge: vi.fn(), privilegedFunctionHeaders: vi.fn() }));
vi.mock("./team-analyzer-data.js", () => ({ loadAnalyzerData: vi.fn() }));
import {
  TRADE_ALERT_MODEL_VERSION,
  applyCompletedTrade,
  buildTradeAlertSnapshot,
  classifyCompletedTrade,
  preTradeRosterState,
  tradeAlertViewModel,
  tradeAlertNotification,
} from "./trade-alerts.js";

const player = (id, name, position, value, points) => [id, {
  id, name, position, nflTeam: "DFL", tradeValue: value, expectedPoints: points,
}];
const pool = new Map([
  player("star", "Sunday Monster", "WR", 94, 330),
  player("solid", "Solid Runner", "RB", 58, 245),
  player("filler", "Bench Filler", "WR", 8, 70),
  player("qb1", "A Quarterback", "QB", 50, 290),
  player("qb2", "B Quarterback", "QB", 50, 285),
  player("rb1", "A Runner", "RB", 45, 210),
  player("rb2", "B Runner", "RB", 45, 205),
  player("wr1", "A Receiver", "WR", 45, 215),
  player("wr2", "B Receiver", "WR", 45, 210),
  player("te1", "A Tight End", "TE", 40, 180),
  player("te2", "B Tight End", "TE", 40, 175),
]);
const beforeA = ["star", "qb1", "rb1", "solid", "wr1", "te1"];
const beforeB = ["filler", "qb2", "rb2", "wr2", "te2"];
const completed = (over = {}) => ({
  transaction_id: "tx-1", type: "trade", status: "complete", roster_ids: [1, 2],
  adds: { star: 2, filler: 1 }, drops: { star: 1, filler: 2 },
  draft_picks: [], waiver_budget: [], created: 1_750_000_000_000, leg: 4, ...over,
});
const teams = [
  { id: "1", roster_id: 1, team_name: "Alpha", playerIds: beforeA },
  { id: "2", roster_id: 2, team_name: "Bravo", playerIds: beforeB },
];

describe("completed trade alerts", () => {
  it("ignores anything that is not a completed Sleeper trade", () => {
    expect(classifyCompletedTrade(completed({ status: "pending" }))).toBeNull();
    expect(classifyCompletedTrade(completed({ type: "waiver" }))).toBeNull();
  });

  it("reconstructs pre-trade ownership from current rosters on a first sync", () => {
    const transaction = completed();
    const current = [
      { roster_id: 1, players: beforeA.filter(id => id !== "star").concat("filler") },
      { roster_id: 2, players: beforeB.filter(id => id !== "filler").concat("star") },
    ];
    const state = preTradeRosterState({ currentRosters: current, transactions: [transaction] });
    expect([...state.get("1")]).toEqual(expect.arrayContaining(beforeA));
    expect(state.get("1").has("filler")).toBe(false);
    expect(state.get("2").has("star")).toBe(false);
    applyCompletedTrade(state, transaction);
    expect(state.get("1").has("star")).toBe(false);
    expect(state.get("1").has("filler")).toBe(true);
  });

  it("grades against the pre-trade roster and freezes an explainable receipt", () => {
    const rosterState = new Map([["1", new Set(beforeA)], ["2", new Set(beforeB)]]);
    const alert = buildTradeAlertSnapshot({ transaction: completed(), season: 2026, week: 4, rosterState, teams, pool });
    expect(alert).toMatchObject({
      sleeper_transaction_id: "tx-1",
      analysis_status: "graded",
      model_version: TRADE_ALERT_MODEL_VERSION,
      verdict: { winner_roster_id: 2, winner_team_name: "Bravo" },
    });
    expect(alert.result.fairness).toBeLessThan(55);
    expect(alert.packages[0].sends[0].name).toBe("Sunday Monster");
    expect(alert.pre_trade_rosters[0].player_ids).toContain("star");
    expect(alert.reasons.length).toBeGreaterThan(0);
  });

  it("labels picks and FAAB partial instead of inventing a winner", () => {
    const rosterState = new Map([["1", new Set(beforeA)], ["2", new Set(beforeB)]]);
    const alert = buildTradeAlertSnapshot({
      transaction: completed({ draft_picks: [{ season: "2027", round: 1 }], waiver_budget: [{ sender: 1, receiver: 2, amount: 10 }] }),
      season: 2026, rosterState, teams, pool,
    });
    expect(alert.analysis_status).toBe("partial");
    expect(alert.verdict).toBeNull();
    expect(alert.result).toBeNull();
    expect(alert.limitations.join(" ")).toMatch(/Draft picks.*FAAB/);
  });

  it("holds multi-team trades for review", () => {
    const classification = classifyCompletedTrade(completed({ roster_ids: [1, 2, 3] }));
    expect(classification.analysisStatus).toBe("review");
    expect(classification.limitations[0]).toMatch(/Multi-team/);
  });

  it("writes a concise notification without claiming a winner for partial grades", () => {
    const partial = tradeAlertNotification({ analysis_status: "partial", teams: [{ team_name: "Alpha" }, { team_name: "Bravo" }] });
    expect(partial).toMatchObject({ title: "DFL TRADE ALERT" });
    expect(partial.body).toContain("need review");
    expect(partial.body).not.toMatch(/wins|fleece/i);
  });

  it("exposes a compact Home-ready view model", () => {
    const rosterState = new Map([["1", new Set(beforeA)], ["2", new Set(beforeB)]]);
    const alert = buildTradeAlertSnapshot({ transaction: completed(), season: 2026, week: 4, rosterState, teams, pool });
    const view = tradeAlertViewModel({ id: 9, created_at: "2026-09-17T12:00:00Z", ...alert });
    expect(view).toMatchObject({
      id: 9, transactionId: "tx-1", winner: "Bravo", balanced: false,
      fairness: alert.result.fairness, href: "#/trade?tx=tx-1",
    });
    expect(view.packages[0]).toMatchObject({ teamName: "Alpha", players: [{ name: "Sunday Monster" }] });
    expect(view.lineupDeltas).toHaveLength(2);
  });
});
