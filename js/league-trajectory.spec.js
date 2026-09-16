import { describe, expect, it } from "vitest";
import { buildLeagueTrajectory, leagueTrajectoryChart } from "./league-trajectory.js";

const teams = [
  { id: "1", roster_id: 1, sleeper_user_id: "u1", team_name: "Alpha", rank: 1, lineup: { weeklyPoints: 130 } },
  { id: "2", roster_id: 2, sleeper_user_id: "u2", team_name: "Beta", rank: 2, lineup: { weeklyPoints: 120 } },
  { id: "3", roster_id: 3, sleeper_user_id: "u3", team_name: "Gamma", rank: 3, lineup: { weeklyPoints: 110 } },
  { id: "4", roster_id: 4, sleeper_user_id: "u4", team_name: "Delta", rank: 4, lineup: { weeklyPoints: 100 } },
];

describe("league trajectory", () => {
  it("turns completed scores into weekly ranks and projects only future weeks", () => {
    const result = buildLeagueTrajectory({ teams, matchups: [
      { week: 1, user1: "u1", score1: 80, user2: "u4", score2: 150 },
      { week: 1, user1: "u2", score1: 120, user2: "u3", score2: 110 },
    ] });
    expect(result.latestWeek).toBe(1);
    expect(result.series.every(team => team.points.some(point => point.week === 1 && !point.projected))).toBe(true);
    expect(result.series.every(team => team.points.some(point => point.week === 14 && point.projected))).toBe(true);
    expect(result.series.find(team => team.id === "4").currentRank).toBeLessThan(4);
  });

  it("keeps earned wins in the finish forecast", () => {
    const games = Array.from({ length: 10 }, (_, index) => ({
      week: index + 1, user1: "u4", score1: 140, user2: "u1", score2: 90,
    }));
    const result = buildLeagueTrajectory({ teams, matchups: games });
    expect(result.series.find(team => team.id === "4").projectedRank).toBe(1);
  });

  it("renders an honest solid/dashed chart and escapes names", () => {
    const changed = [{ ...teams[0], team_name: "<Alpha>" }, ...teams.slice(1)];
    const result = buildLeagueTrajectory({ teams: changed, matchups: [
      { week: 1, roster1: 1, score1: 130, roster2: 2, score2: 110 },
      { week: 1, roster1: 3, score1: 100, roster2: 4, score2: 90 },
    ] });
    const html = leagueTrajectoryChart(result, "1");
    expect(html).toContain("LEAGUE TRAJECTORY");
    expect(html).toContain("is-projected");
    expect(html).toContain("&lt;Alpha&gt;");
    expect(html).not.toContain("<Alpha>");
  });
});
