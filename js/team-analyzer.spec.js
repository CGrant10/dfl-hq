import { describe, expect, it } from "vitest";
import { analyzeLeague, buildPlayerPool, compareTeams, evaluateTrade, optimalLineup, suggestTrades } from "./team-analyzer.js";

const scoring = { pass_yd: .04, pass_td: 4, rush_yd: .1, rush_td: 6, rec: 1, rec_yd: .1, rec_td: 6 };
const players = {
  q1: { n: "Alpha QB", p: "QB", t: "KC" }, q2: { n: "Beta QB", p: "QB", t: "BUF" },
  r1: { n: "Star RB", p: "RB", t: "DET" }, r2: { n: "Good RB", p: "RB", t: "GB" },
  r3: { n: "Bench RB", p: "RB", t: "NYJ" }, r4: { n: "Other RB", p: "RB", t: "MIA" },
  w1: { n: "Star WR", p: "WR", t: "MIN" }, w2: { n: "Good WR", p: "WR", t: "LAR" },
  w3: { n: "Bench WR", p: "WR", t: "CHI" }, w4: { n: "Other WR", p: "WR", t: "DAL" },
  t1: { n: "Alpha TE", p: "TE", t: "SF" }, t2: { n: "Beta TE", p: "TE", t: "BAL" },
  j1: { n: "Junk One", p: "WR", t: "FA" }, j2: { n: "Junk Two", p: "RB", t: "FA" },
};
const projection = (player_id, adp, stats) => ({ player_id, player: { position: players[player_id].p }, stats: { adp_ppr: adp, ...stats } });
const projections = [
  projection("q1", 18, { pass_yd: 4400, pass_td: 34 }), projection("q2", 28, { pass_yd: 4100, pass_td: 29 }),
  projection("r1", 4, { rush_yd: 1350, rush_td: 13, rec: 55, rec_yd: 420 }),
  projection("r2", 30, { rush_yd: 900, rush_td: 8, rec: 38, rec_yd: 280 }),
  projection("r3", 96, { rush_yd: 450, rush_td: 3, rec: 20, rec_yd: 130 }),
  projection("r4", 42, { rush_yd: 780, rush_td: 7, rec: 32, rec_yd: 240 }),
  projection("w1", 7, { rec: 105, rec_yd: 1450, rec_td: 10 }),
  projection("w2", 34, { rec: 78, rec_yd: 980, rec_td: 7 }),
  projection("w3", 110, { rec: 45, rec_yd: 520, rec_td: 3 }),
  projection("w4", 46, { rec: 69, rec_yd: 850, rec_td: 6 }),
  projection("t1", 48, { rec: 70, rec_yd: 790, rec_td: 7 }), projection("t2", 72, { rec: 55, rec_yd: 610, rec_td: 5 }),
  projection("j1", 250, { rec: 8, rec_yd: 70 }), projection("j2", 240, { rush_yd: 80 }),
];
const rosters = [
  { roster_id: 1, team_name: "A Team", players: ["q1", "r1", "r3", "w2", "w3", "t2", "j1"] },
  { roster_id: 2, team_name: "B Team", players: ["q2", "r2", "r4", "w1", "w4", "t1", "j2"] },
];
const pool = buildPlayerPool({ rosters, players, projections, scoringSettings: scoring });

describe("team analyzer", () => {
  it("builds the best legal lineup and includes depth at a discount", () => {
    const lineup = optimalLineup(rosters[0].players, pool);
    expect(lineup.starters.filter(player => player.position === "QB")).toHaveLength(1);
    expect(lineup.starters.filter(player => player.position === "TE")).toHaveLength(1);
    expect(lineup.score).toBeGreaterThanOrEqual(lineup.starterPoints);
    expect(lineup.depthPoints).toBeLessThan(pool.get("r3").expectedPoints);
  });

  it("ranks every team and explains its strongest and weakest position", () => {
    const teams = analyzeLeague({ rosters, pool });
    expect(teams.map(team => team.rank)).toEqual([1, 2]);
    expect(teams.every(team => team.grade && team.strength && team.weakness)).toBe(true);
    expect(compareTeams(teams[0], teams[1]).positions).toHaveLength(4);
  });

  it("values a trade by the lineup it changes", () => {
    const teams = analyzeLeague({ rosters, pool });
    const result = evaluateTrade({ teamA: teams.find(team => team.id === "1"), teamB: teams.find(team => team.id === "2"), sendA: ["r1"], sendB: ["w1"], pool });
    expect(result).toMatchObject({ sendA: ["r1"], sendB: ["w1"] });
    expect(result.fairness).toBeGreaterThan(0);
    expect(Number.isFinite(result.deltaA)).toBe(true);
  });

  it("does not let extra worthless players inflate a package", () => {
    const teams = analyzeLeague({ rosters, pool });
    const a = teams.find(team => team.id === "1"), b = teams.find(team => team.id === "2");
    const one = evaluateTrade({ teamA: a, teamB: b, sendA: ["r1"], sendB: ["w1"], pool });
    const junk = evaluateTrade({ teamA: a, teamB: b, sendA: ["r1"], sendB: ["w1", "j2"], pool });
    expect(junk.valueToA).toBeLessThanOrEqual(one.valueToA + 5);
  });

  it("shops a selected player only in legal, roster-aware offers", () => {
    const teams = analyzeLeague({ rosters, pool });
    const offers = suggestTrades({ teams, teamId: "1", playerId: "r1", pool });
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every(offer => offer.sendA.includes("r1") && offer.other.id === "2")).toBe(true);
    expect(offers.every(offer => offer.fairness >= 66)).toBe(true);
  });
});
