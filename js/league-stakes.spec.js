import { describe, expect, it } from "vitest";
import { buildLeagueStakes, scenarioLine, stakeLine, playoffChance } from "./league-stakes.js";

const teams = Array.from({ length: 4 }, (_, i) => ({ id: `t${i + 1}`, sleeper_user_id: `u${i + 1}`, team_name: `Team ${i + 1}` }));
const standing = (id, wins, losses, rank) => ({ season: 2026, sleeper_user_id: id, wins, losses, ties: 0, rank, points_for: wins * 100 });

describe("league stakes", () => {
  it("keeps bracket positions unique when simulated finishes round to the same value", () => {
    const projections = new Map(teams.map((team, i) => [team.id, { playoffOdds: .9 - i * .1, seed: 2.2 + i * .1 }]));
    const stakes = buildLeagueStakes({ teams, projections, season: 2026, playoffTeams: 2 });
    expect(stakes.projected.map(row => row.projectedSeed)).toEqual([1, 2, 3, 4]);
    expect(stakes.projected[0].expectedFinish).toBe(2.2);
    expect(stakes.cutline.id).toBe(stakes.projected[1].id);
  });

  it("distinguishes rounded simulated odds from mathematically certain outcomes", () => {
    expect(playoffChance({status:"alive",playoffOdds:.9999})).toBe(">99%");
    expect(playoffChance({status:"alive",playoffOdds:0})).toBe("<1%");
    expect(playoffChance({status:"clinched",playoffOdds:.7})).toBe("100%");
    expect(playoffChance({status:"eliminated",playoffOdds:.3})).toBe("0%");
    expect(playoffChance({status:"alive",playoffOdds:null})).toBe("—");
    expect(playoffChance({status:"alive",playoffOdds:.46})).toBe("46%");
  });
  it("only calls a team clinched or eliminated when the record makes it certain", () => {
    const standings = [standing("u1", 12, 0, 1), standing("u2", 8, 4, 2), standing("u3", 2, 10, 3), standing("u4", 1, 11, 4)];
    const stakes = buildLeagueStakes({ teams, standings, season: 2026, playoffTeams: 2, week: 13 });
    expect(stakes.rows.find(row => row.id === "t1").status).toBe("clinched");
    expect(stakes.rows.find(row => row.id === "t4").status).toBe("eliminated");
  });

  it("labels a live bubble team from its simulated odds", () => {
    const projections = new Map([["t1", { playoffOdds: .46, seed: 2.8 }]]);
    const stakes = buildLeagueStakes({ teams, projections, standings: teams.map((_, i) => standing(`u${i + 1}`, 3, 3, i + 1)), season: 2026, playoffTeams: 2 });
    expect(stakeLine(stakes.rows[0])).toBe("ON THE PLAYOFF BUBBLE");
    expect(scenarioLine(stakes.rows[0], 2)).toContain("46% playoff chance");
  });

  it("adds projected seed and a compact win target", () => {
    const projections = new Map(teams.map((team, i) => [team.id, { playoffOdds: .9 - i * .2, seed: i + 1 }]));
    const stakes = buildLeagueStakes({ teams, projections, standings: teams.map((_, i) => standing(`u${i + 1}`, 4 - i, 2 + i, i + 1)), season: 2026, playoffTeams: 2, week: 7 });
    expect(stakes.projected[0]).toMatchObject({ projectedSeed: 1, playoffOdds: .9 });
    expect(stakes.cutline.id).toBe("t2");
    expect(stakes.rows.find(row => row.id === "t3").winsNeeded).toBeGreaterThan(0);
  });
});
