import { describe, expect, it, vi } from "vitest";
vi.mock("./supabase.js", () => ({ db: vi.fn(), edge: vi.fn(), privilegedFunctionHeaders: vi.fn() }));
vi.mock("./team-analyzer-data.js", () => ({ loadAnalyzerData: vi.fn() }));
import { loadAnalyzerData } from "./team-analyzer-data.js";
import {
  TRADE_ALERT_MODEL_VERSION,
  applyCompletedTrade,
  buildTradeAlertSnapshot,
  captureCompletedTradeAlerts,
  classifyCompletedTrade,
  preTradeRosterState,
  tradeAlertViewModel,
  tradeAlertNotification,
  tradeBreakingHeadline,
  tradeOutcomeReason,
  tradeOutcomeSummary,
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
    expect(alert.result).not.toBeNull();
    expect(alert.limitations.join(" ")).toMatch(/Draft picks.*FAAB/);
  });

  it("withholds a complete grade when an added team sends and receives no players", () => {
    const classification = classifyCompletedTrade(completed({ roster_ids: [1, 2, 3] }));
    expect(classification.analysisStatus).toBe("review");
    expect(classification.limitations[0]).toMatch(/Each team/);
  });

  it("writes a concise notification without claiming a winner for partial grades", () => {
    const partial = tradeAlertNotification({ analysis_status: "partial", teams: [{ team_name: "Alpha" }, { team_name: "Bravo" }] });
    expect(partial).toMatchObject({ title: "DFL TRADE ALERT" });
    expect(partial.body).toContain("player estimate only");
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
    expect(view.depthDeltas).toHaveLength(2);
    expect(view.breakingActive).toBe(true);
  });

  it("writes bold breaking copy without contradicting roster impact", () => {
    expect(tradeBreakingHeadline({
      verdict: { who: "a", winner_team_name: "Alpha" },
      result: { fairness: 48, weeklyDeltaA: 2, rosterImpactA: 2.4 },
    })).toBe("Alpha JUST COMMITTED HIGHWAY ROBBERY");
    expect(tradeBreakingHeadline({
      verdict: { who: "a", winner_team_name: "Alpha" },
      result: { fairness: 82, weeklyDeltaA: -2, rosterImpactA: -1.2 },
    })).toBe("Alpha WON VALUE, NOT THEIR LINEUP");
  });

  it("grades Home trade outcomes with value plus roster usefulness", () => {
    const close = tradeOutcomeSummary({
      analysis_status: "graded",
      teams: [{ team_name: "Alpha" }, { team_name: "Bravo" }],
      result: { valueToA: 105, valueToB: 100, fairness: 95, rosterImpactA: .3, rosterImpactB: .1,
        weeklyDeltaA: .2, weeklyDeltaB: .1, depthDeltaA: .2, depthDeltaB: 0 },
    });
    expect(close).toMatchObject({ grade: "Fair deal", tone: "fair", winner: null });

    const robbery = tradeOutcomeSummary({
      analysis_status: "graded",
      teams: [{ team_name: "Alpha" }, { team_name: "Bravo" }],
      result: { valueToA: 180, valueToB: 75, fairness: 42, rosterImpactA: 3, rosterImpactB: -2,
        weeklyDeltaA: 2.5, weeklyDeltaB: -2, depthDeltaA: 1, depthDeltaB: -1 },
    });
    expect(robbery).toMatchObject({ grade: "Robbery", winner: "Alpha", loser: "Bravo" });
  });

  it.each(["dflyzer-trade-v3-player-value","dflyzer-trade-v4-one-qb","dflyzer-trade-v5-expert-evidence",TRADE_ALERT_MODEL_VERSION])("preserves asset-winner semantics on %s receipts",modelVersion=>{
    const alert={analysis_status:'graded',model_version:modelVersion,teams:[{team_name:'Alpha'},{team_name:'Bravo'}],result:{valueToA:65,valueToB:100,fairness:65,rosterImpactA:10,rosterImpactB:-1,weeklyDeltaA:10,weeklyDeltaB:-1}};
    expect(tradeOutcomeSummary(alert)).toMatchObject({winner:'Bravo',loser:'Alpha',grade:'Clear win'});
    expect(tradeOutcomeSummary({...alert,result:{...alert.result,projectionEvidence:{stale:['player']}}})).toMatchObject({winner:null,grade:'Review'});
  });
  it("uses a league-wide outcome line instead of team A's private negotiation roast", () => {
    const outcome = { grade: "Fair deal", winner: null, detail: "94% balanced" };
    expect(tradeOutcomeReason(outcome).title).toBe("Fair deal. Nobody got robbed.");
    const view = tradeAlertViewModel({
      id: 12,
      sleeper_transaction_id: "tx-balanced",
      analysis_status: "graded",
      teams: [{ roster_id: 1, team_name: "Alpha" }, { roster_id: 2, team_name: "Bravo" }],
      packages: [],
      result: { valueToA: 100, valueToB: 98, fairness: 98, rosterImpactA: 0, rosterImpactB: 0 },
      verdict: { winner_team_name: null },
      reasons: [{ tone: "bad", title: "This deal is dogshit. Stop negotiating." }],
    });
    expect(view).toMatchObject({ balanced: true, winner: null });
    expect(view.reason.title).toBe("Fair deal. Nobody got robbed.");
  });

  it("backfills an older completed trade without relaunching breaking news", async () => {
    const transaction = completed();
    const currentRosters = [
      { roster_id: 1, players: beforeA.filter(id => id !== "star").concat("filler") },
      { roster_id: 2, players: beforeB.filter(id => id !== "filler").concat("star") },
    ];
    loadAnalyzerData.mockResolvedValue({ state: "ready", teams, pool });
    const inserted = [];
    const database = {
      from(table) {
        expect(table).toBe("trade_alerts");
        return {
          select(columns) {
            if (columns === "sleeper_transaction_id") return { in: async () => ({ data: [], error: null }) };
            return { in: () => ({ eq: () => ({ is: async () => ({ data: [], error: null }) }) }) };
          },
          insert(row) {
            inserted.push(row);
            return { select: () => ({ single: async () => ({ data: { id: 1, ...row }, error: null }) }) };
          },
        };
      },
    };
    const result = await captureCompletedTradeAlerts({
      transactions: [transaction],
      priorTransactions: [{ sleeper_transaction_id: "tx-1", status: "complete" }],
      currentRosters,
      season: 2026,
      week: 4,
      database,
    });
    expect(result).toMatchObject({ created: 1, backfilled: 1, notified: 0 });
    expect(inserted[0]).toMatchObject({
      sleeper_transaction_id: "tx-1",
      breaking_active: false,
    });
    expect(inserted[0].breaking_ended_at).toBeTruthy();
  });
});

describe('saved receipt balance and model uncertainty',()=>{
  const base={sleeper_transaction_id:'receipt',analysis_status:'graded',model_version:TRADE_ALERT_MODEL_VERSION,
    teams:[{roster_id:1,team_name:'Alpha'},{roster_id:2,team_name:'Bravo'}],
    packages:[{roster_id:1,sends:[{id:'a',name:'A',trade_value:4}]},{roster_id:2,sends:[{id:'b',name:'B',trade_value:5}]}],
    result:{fairness:80,valueToA:5,valueToB:4,projectionEvidence:{injuries:['Injured player'],missing:[],stale:[],fallback:[]}},verdict:{who:null,headline:'Review needed'}};
  it('keeps the latest trade’s saved balance while explaining availability flags',()=>{
    const view=tradeAlertViewModel(base);
    expect(view).toMatchObject({fairness:80,winner:null,balanced:false,verdict:'Injury flags',caution:{label:'Injury flags'}});
    expect(view.caution.detail).toContain('Injured player');expect(view.caution.detail).not.toContain('commissioner');
    expect(view.receivedPackages[0].players[0].name).toBe('B');expect(view.receivedPackages[1].players[0].name).toBe('A');
  });
  it('does not call a stale-expert estimate balanced just because no winner was named',()=>{
    const alert={...base,result:{...base.result,projectionEvidence:{expert:{required:true,status:'Stale'},injuries:[],missing:[]}}};
    expect(tradeOutcomeSummary(alert)).toMatchObject({grade:'Review',winner:null});
    expect(tradeAlertViewModel(alert)).toMatchObject({fairness:80,balanced:false,verdict:'Estimate only'});
    expect(tradeAlertNotification(alert).body).toContain('80% balance');expect(tradeAlertNotification(alert).body).not.toContain('Balanced deal');
  });
  it('does not replace missing balance or impact with a fabricated zero',()=>{
    const view=tradeAlertViewModel({...base,analysis_status:'review',result:null});
    expect(view.fairness).toBeNull();expect(view.lineupDeltas[0].weekly).toBeNull();expect(view.verdict).toBe('Not rated');
    expect(tradeAlertViewModel({...base,result:{...base.result,fairness:0}}).fairness).toBe(0);
  });
  it('keeps a close call distinct from an incomplete model review',()=>{
    const alert={...base,result:{fairness:80,valueToA:80,valueToB:100,incomingEvidence:{low:75,high:100},outgoingEvidence:{low:80,high:110}}};
    expect(tradeAlertViewModel(alert)).toMatchObject({fairness:80,verdict:'Close call',outcome:{grade:'Close call'}});
  });
});
