import { describe, expect, it } from "vitest";
import { buildLeagueStakes, stakeLine } from "./league-stakes.js";

const teams = Array.from({ length: 4 }, (_, i) => ({ id: `t${i + 1}`, sleeper_user_id: `u${i + 1}`, team_name: `Team ${i + 1}` }));
const standing = (id, wins, losses, rank) => ({ season: 2026, sleeper_user_id: id, wins, losses, ties: 0, rank, points_for: wins * 100 });

describe("league stakes", () => {
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
  });
});
