import { describe, expect, it } from "vitest";
import { ANALYZER_UNITS, analyzeLeague, buildPlayerPool, compareTeams, evaluateTrade, isPlausibleTradeSuggestion, optimalLineup, suggestTrades, tradeSuggestionTier } from "./team-analyzer.js";

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
  it("builds the best legal lineup and reports depth separately", () => {
    const lineup = optimalLineup(rosters[0].players, pool);
    expect(lineup.starters.filter(player => player.position === "QB")).toHaveLength(1);
    expect(lineup.starters.filter(player => player.position === "TE")).toHaveLength(1);
    expect(lineup.score).toBe(lineup.starterPoints);
    expect(lineup.depthScore).toBe(0);
    expect(pool.get("r1")).toMatchObject({ positionRank: 1, positionCount: 5 });
    expect(pool.get("r1").expectedPerGame).toBeGreaterThan(0);
  });

  it("ranks every team and explains its strongest and weakest position", () => {
    const teams = analyzeLeague({ rosters, pool });
    expect(teams.map(team => team.rank)).toEqual([1, 2]);
    expect(teams.every(team => team.grade && team.starterGrade && team.depthGrade && team.overallGrade && team.strength)).toBe(true);
    expect(teams[0].positionGrades.QB.leagueRank).toBeGreaterThanOrEqual(1);
    expect(teams[0].positionGrades.QB.leagueSize).toBe(2);
    expect(compareTeams(teams[0], teams[1]).positions).toHaveLength(5);
    expect(teams.every(team => team.positionGrades.FLEX.starters.length === 1)).toBe(true);
    const strongTe = teams.find(team => team.positionGrades.TE.leagueRank === 1);
    expect(strongTe.need).not.toBe("TE");
  });

  it("uses the submitted offensive starters instead of letting a bench player inflate the grade", () => {
    const roster = { roster_id: 3, players: ["q1", "r1", "r2", "r3", "w1", "w2", "w3", "t1"], starters: ["q1", "r2", "r3", "w2", "w3", "t1", "w1"] };
    const lineup = optimalLineup(roster.players, pool, { starterIds: roster.starters });
    expect(lineup.source).toBe("set");
    expect(lineup.starters.map(player => player.id)).toContain("r3");
    expect(lineup.bench.map(player => player.id)).toContain("r1");
    expect(lineup.score).toBe(lineup.starterPoints);
  });

  it("pace-adjusts proven production and gives rookies a new outlook", () => {
    const paced = buildPlayerPool({ rosters, players, projections, scoringSettings: scoring,
      previousStats: { r1: { gp: 17, rush_yd: 3400 }, j1: { gp: 0 } } });
    expect(paced.get("r1")).toMatchObject({ priorPace: 340, trend: "down" });
    expect(paced.get("j1")).toMatchObject({ priorPace: null, trend: "new" });
    expect(paced.get("r1")).not.toHaveProperty("confidence");
  });

  it("lets current-season production progressively update Power Pulse", () => {
    const baseline = buildPlayerPool({ rosters, players, projections, scoringSettings: scoring,
      previousStats: { r1: { gp: 17, rush_yd: 1020 } } });
    const live = buildPlayerPool({ rosters, players, projections, scoringSettings: scoring,
      previousStats: { r1: { gp: 17, rush_yd: 1020 } },
      currentStats: { r1: { gp: 4, rush_yd: 800 } } });
    expect(live.get("r1")).toMatchObject({ currentGames: 4, currentPoints: 80, currentPace: 340 });
    expect(live.get("r1").expectedPoints).toBeGreaterThan(baseline.get("r1").expectedPoints);
  });

  it("uses recent game form without letting a short streak replace the season model", () => {
    const input = { rosters, players, projections, scoringSettings: scoring,
      previousStats: { r1: { gp: 17, rush_yd: 1020 } }, currentStats: { r1: { gp: 4, rec: 100 } } };
    const hot = buildPlayerPool({ ...input, recentStats: [
      [{ player_id: "r1", stats: { gp: 1, rec: 30 } }],
      [{ player_id: "r1", stats: { gp: 1, rec: 30 } }],
    ] });
    const cold = buildPlayerPool({ ...input, recentStats: [
      [{ player_id: "r1", stats: { gp: 1, rec: 5 } }],
      [{ player_id: "r1", stats: { gp: 1, rec: 5 } }],
    ] });
    expect(hot.get("r1")).toMatchObject({ trend: "up", trendBasis: "recent", recentGames: 2, recentAverage: 30 });
    expect(cold.get("r1")).toMatchObject({ trend: "down", trendBasis: "recent", recentGames: 2, recentAverage: 5 });
    expect(hot.get("r1").expectedPoints).toBeGreaterThan(cold.get("r1").expectedPoints);
  });

  it("prices current injury availability into points and trade value", () => {
    const input = { rosters, players, projections, scoringSettings: scoring,
      previousStats: { r1: { gp: 17, rush_yd: 1020 } }, currentStats: { r1: { gp: 4, rec: 80 } } };
    const healthy = buildPlayerPool(input);
    const injured = buildPlayerPool({ ...input, weeklyProjections: [{
      player_id: "r1", injury_status: "Out", player: { position: "RB", injury_status: "Out" }, stats: { gp: 0 },
    }] });
    expect(injured.get("r1")).toMatchObject({ injuryStatus: "Out", isOut: true });
    expect(injured.get("r1").expectedPoints).toBeLessThan(healthy.get("r1").expectedPoints);
    expect(injured.get("r1").tradeValue).toBeLessThan(healthy.get("r1").tradeValue);
  });

  it("derives the starter grade from the five visible unit grades", () => {
    const teams = analyzeLeague({ rosters, pool });
    for (const team of teams) {
      const visibleAverage = ANALYZER_UNITS.reduce((sum, unit) => sum + team.positionGrades[unit].percentile, 0) / ANALYZER_UNITS.length;
      expect(team.starterPercentile).toBeCloseTo(visibleAverage, 10);
      expect(team.positionGrades.FLEX.starters).toHaveLength(1);
    }
  });

  it("does not let one high-scoring unit overpower the visible starter grades", () => {
    const unitPool = new Map();
    const roster = (id, label, points) => {
      const positions = ["QB", "RB", "RB", "WR", "WR", "TE", "WR"];
      const ids = points.map((expectedPoints, index) => {
        const playerId = `${id}-${index}`;
        unitPool.set(playerId, { id: playerId, name: playerId, position: positions[index], expectedPoints, tradeValue: 50 });
        return playerId;
      });
      return { roster_id: id, team_name: label, players: ids, starters: ids };
    };
    const sample = [
      roster("balanced", "Balanced", [300, 200, 200, 230, 230, 180, 200]),
      roster("spike", "RB Spike", [290, 300, 300, 180, 180, 150, 190]),
      roster("baseline", "Baseline", [280, 190, 190, 170, 170, 140, 160]),
    ];
    const teams = analyzeLeague({ rosters: sample, pool: unitPool });
    const balanced = teams.find(team => team.id === "balanced");
    const spike = teams.find(team => team.id === "spike");
    expect(spike.lineup.starterPoints).toBeGreaterThan(balanced.lineup.starterPoints);
    expect(balanced.starterGrade).toBe("A");
    expect(spike.starterGrade).toBe("B");
    expect(balanced.starterPercentile).toBeGreaterThan(spike.starterPercentile);
  });

  it("does not call a weak submitted position a need when the bench already covers it", () => {
    const coveredPool = new Map();
    const make = (id, position, expectedPoints, tradeValue = 50) => {
      coveredPool.set(id, { id, name: id, position, expectedPoints, tradeValue });
      return id;
    };
    const roster = (id, tePoints, benchTe = null) => {
      const starters = [make(`${id}-q`, "QB", 280), make(`${id}-r1`, "RB", 190), make(`${id}-r2`, "RB", 180),
        make(`${id}-w1`, "WR", 210), make(`${id}-w2`, "WR", 200), make(`${id}-te`, "TE", tePoints), make(`${id}-f`, "WR", 175)];
      const players = [...starters];
      if (benchTe) players.push(make(`${id}-bench-te`, "TE", benchTe, 60));
      return { roster_id: id, players, starters };
    };
    const teams = analyzeLeague({ rosters: [roster("covered", 80, 75), roster("b", 180), roster("c", 160), roster("d", 140)], pool: coveredPool });
    const covered = teams.find(team => team.id === "covered");
    expect(covered.positionGrades.TE.grade).toBe("D");
    expect(covered.positionGrades.TE.depth[0].id).toBe("covered-bench-te");
    expect(covered.need).not.toBe("TE");
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
    expect(offers.every(offer => offer.sendA.includes("r1") && offer.other.id === "2")).toBe(true);
    expect(offers.every(offer => tradeSuggestionTier(offer))).toBe(true);
    expect(offers.every(offer => offer.sendA.length + offer.sendB.length <= 4)).toBe(true);
  });

  it("shops a two-player package from either side", () => {
    const teams = analyzeLeague({ rosters, pool });
    const mine = suggestTrades({ teams, teamId: "1", playerIds: ["r1", "w2"], partnerId: "2", pool });
    expect(mine.every(offer => offer.sendA.includes("r1") && offer.sendA.includes("w2") && offer.other.id === "2")).toBe(true);
    const theirs = suggestTrades({ teams, teamId: "1", anchorTeamId: "2", playerIds: ["r2", "w4"], partnerId: "2", pool });
    expect(theirs.every(offer => offer.sendB.includes("r2") && offer.sendB.includes("w4") && offer.other.id === "2")).toBe(true);
  });

  it("shops an outgoing package across every matching opponent", () => {
    const analyzed = analyzeLeague({ rosters, pool });
    const third = { ...analyzed[1], id: "3", roster_id: "3", team_name: "C Team" };
    const offers = suggestTrades({ teams: [...analyzed, third], teamId: "1", sendAnchorIds: ["r1"], pool, limit: 60 });
    expect(new Set(offers.map(offer => String(offer.other.id)))).toEqual(new Set(["2", "3"]));
    expect(offers.every(offer => offer.sendA.includes("r1"))).toBe(true);
  });

  it("uses value direction and lineup impact to label the negotiating range honestly", () => {
    expect(tradeSuggestionTier({ fairness: 94, valueToA: 94, valueToB: 100, weeklyDeltaA: .2, weeklyDeltaB: .1 })).toBe("fair");
    expect(tradeSuggestionTier({ fairness: 78, valueToA: 78, valueToB: 100, weeklyDeltaA: .8, weeklyDeltaB: .3 })).toBe("aggressive");
    expect(tradeSuggestionTier({ fairness: 78, valueToA: 100, valueToB: 78, weeklyDeltaA: .8, weeklyDeltaB: -.3 })).toBe("steal");
    expect(tradeSuggestionTier({ fairness: 92, valueToA: 100, valueToB: 92, weeklyDeltaA: 2, weeklyDeltaB: -.2 })).toBe("steal");
    expect(isPlausibleTradeSuggestion({ fairness: 25, weeklyDeltaA: 4, weeklyDeltaB: -4 })).toBe(false);
    expect(isPlausibleTradeSuggestion({ fairness: 82, weeklyDeltaA: 1.2, weeklyDeltaB: -.8 })).toBe(true);
  });

  it("builds varied package shapes around a selected target without forcing implausible shapes", () => {
    const teams = analyzeLeague({ rosters, pool });
    const offers = suggestTrades({ teams, teamId: "1", anchorTeamId: "2", partnerId: "2", playerId: "w1", pool, limit: 100 });
    const shapes = new Set(offers.map(offer => offer.shape));
    expect(shapes).toEqual(new Set(["1-1", "1-2", "2-1", "2-2", "3-1"]));
    expect(shapes.size).toBeGreaterThan(3);
    expect(offers.every(offer => offer.sendB.includes("w1"))).toBe(true);
  });

  it("builds anchored uneven packages beneath an eight-player ceiling", () => {
    const teams = analyzeLeague({ rosters, pool });
    const offers = suggestTrades({ teams, teamId: "1", partnerId: "2", pool, limit: 30,
      sendAnchorIds: ["r1", "w2"], receiveAnchorIds: ["w1"], maxPlayers: 8, shapes: ["3-2"] });
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every(offer => offer.shape === "3-2")).toBe(true);
    expect(offers.every(offer => offer.sendA.includes("r1") && offer.sendA.includes("w2"))).toBe(true);
    expect(offers.every(offer => offer.sendB.includes("w1"))).toBe(true);
  });

  it("keeps visible tier batches diverse instead of filling them with 2-for-2s", () => {
    const teams = analyzeLeague({ rosters, pool });
    const offers = suggestTrades({ teams, teamId: "1", partnerId: "2", pool, limit: 96, maxPlayers: 4 });
    for (const tier of ["fair", "aggressive", "steal"]) {
      const group = offers.filter(offer => offer.tier === tier);
      if (group.length < 2) continue;
      expect(new Set(group.slice(0, 4).map(offer => offer.shape)).size).toBeGreaterThan(1);
    }
    expect(offers.every(isPlausibleTradeSuggestion)).toBe(true);
  });
});
