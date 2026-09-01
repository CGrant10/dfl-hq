import { describe, expect, it } from "vitest";
import { verdictFor } from "./trade-desk.js";
import { buildPlayerPool, evaluateTrade } from "./team-analyzer.js";

/* Full PPR, the league's own setting - see scoring_settings on sleeper_leagues.
   Points are expressed as receptions so the fixtures stay readable. */
const PPR = { rec: 1, rec_yd: 0.1, rec_td: 6 };

const player = (id, position, points) => ({ id, position, points });

function poolOf(spec) {
  const players = {};
  const previousStats = {};
  const rosters = [];
  for (const [team, list] of Object.entries(spec)) {
    rosters.push({ roster_id: team, players: list.map(p => p.id) });
    for (const p of list) {
      players[p.id] = { n: `Player ${p.id}`, p: p.position, t: "AAA" };
      previousStats[p.id] = { rec: p.points, gp: 17 };
    }
  }
  return { rosters, pool: buildPlayerPool({ rosters, players, previousStats, scoringSettings: PPR }) };
}

const team = (rosters, pool, id) => {
  const row = rosters.find(r => String(r.roster_id) === String(id));
  return { ...row, id: String(row.roster_id), playerIds: row.players.map(String) };
};

describe("verdictFor", () => {
  it("calls a near-even split balanced, with no winner", () => {
    const v = verdictFor({ fairness: 94, valueToA: 50, valueToB: 52 });
    expect(v.headline).toBe("Balanced");
    expect(v.who).toBeNull();
  });

  it("names the side that received more as the winner", () => {
    /* valueToA is what A receives, so A ahead means the deal favours A. */
    expect(verdictFor({ fairness: 60, valueToA: 90, valueToB: 40 }).who).toBe("a");
    expect(verdictFor({ fairness: 60, valueToA: 40, valueToB: 90 }).who).toBe("b");
  });

  it("escalates the language as the gap widens", () => {
    expect(verdictFor({ fairness: 80, valueToA: 60, valueToB: 45 }).headline).toBe("Slight edge");
    expect(verdictFor({ fairness: 60, valueToA: 90, valueToB: 40 }).headline).toBe("Clear winner");
    expect(verdictFor({ fairness: 20, valueToA: 99, valueToB: 10 }).headline).toBe("Lopsided");
  });

  it("has no verdict without a trade", () => {
    expect(verdictFor(null)).toBeNull();
  });
});

describe("evaluating a hand-built trade", () => {
  /*
    A REALISTIC LEAGUE, not a handful of players.

    tradeValue is percentile-based, so in a twelve-player pool the gap between
    first and second at a position is most of the scale - a 300-point RB and a
    295-point RB came out 33 points apart and the evaluator called an even swap
    a clear win. That was the fixture being unrepresentative, not the maths, so
    the fixture is now twelve rosters deep enough to make percentiles mean
    something.
  */
  const POSITIONS = [["QB", 2], ["RB", 5], ["WR", 5], ["TE", 2]];
  const spec = {};
  for (let t = 1; t <= 12; t += 1) {
    spec[String(t)] = [];
    for (const [position, count] of POSITIONS) {
      for (let i = 0; i < count; i += 1) {
        /* A smooth spread across the league so no two neighbours are a cliff. */
        const points = 340 - (t - 1) * 4 - i * 26;
        spec[String(t)].push(player(`${position}${t}_${i}`, position, points));
      }
    }
  }
  const { rosters, pool } = poolOf(spec);
  const teamA = team(rosters, pool, "1");
  const teamB = team(rosters, pool, "2");
  /* Team 1's best RB and team 2's best RB are four points apart. */
  const aBestRb = "RB1_0", bBestRb = "RB2_0", aWorstRb = "RB1_4", bWorstRb = "RB2_4";

  it("rates a swap of near-identical players as close to even", () => {
    const result = evaluateTrade({ teamA, teamB, sendA: [aBestRb], sendB: [bBestRb], pool });
    expect(result).not.toBeNull();
    expect(result.fairness).toBeGreaterThan(80);
    expect(verdictFor(result).headline).toBe("Balanced");
  });

  it("says the side receiving the better player wins", () => {
    const result = evaluateTrade({ teamA, teamB, sendA: [aWorstRb], sendB: [bBestRb], pool });
    expect(result.valueToA).toBeGreaterThan(result.valueToB);
    expect(verdictFor(result).who).toBe("a");
  });

  it("reports each side's weekly lineup change independently of value", () => {
    const result = evaluateTrade({ teamA, teamB, sendA: [aWorstRb], sendB: [bBestRb], pool });
    expect(typeof result.weeklyDeltaA).toBe("number");
    expect(typeof result.weeklyDeltaB).toBe("number");
    expect(result.weeklyDeltaA).toBeGreaterThanOrEqual(0);
  });

  it("refuses a trade that is empty on either side", () => {
    expect(evaluateTrade({ teamA, teamB, sendA: [], sendB: [bBestRb], pool })).toBeNull();
    expect(evaluateTrade({ teamA, teamB, sendA: [aBestRb], sendB: [], pool })).toBeNull();
  });

  it("refuses a player the sending team does not own", () => {
    expect(evaluateTrade({ teamA, teamB, sendA: [bBestRb], sendB: [aBestRb], pool })).toBeNull();
  });

  it("does not let throw-ins inflate a package", () => {
    const one = evaluateTrade({ teamA, teamB, sendA: [aBestRb], sendB: [bBestRb], pool });
    const padded = evaluateTrade({ teamA, teamB, sendA: [aBestRb], sendB: [bBestRb, bWorstRb], pool });
    expect(padded.valueToA - one.valueToA).toBeLessThan(one.valueToA);
  });
});
