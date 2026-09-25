import { describe, expect, it } from "vitest";
import { buildHomeWeekOutlook, HOME_OUTLOOK_POSITIONS } from "./home-week-outlook.js";

const p = (id, name, position, points, extra = {}) => [id, {
  id, name, position, points, team: "DFL", opponent: "OPP", hasGame: true, isOut: false, ...extra,
}];

describe("Home week outlook", () => {
  it("predicts every matchup, ranks three per position, and uses the shared Start/Sit threshold", () => {
    const pool = new Map([
      p("qb1", "QB One", "QB", 25), p("qb2", "QB Two", "QB", 22), p("qb3", "QB Three", "QB", 20), p("qb4", "QB Four", "QB", 18),
      p("rb1", "Starter Back", "RB", 8), p("rb2", "Bench Back", "RB", 16), p("rb3", "Steady Back", "RB", 14), p("rb4", "Other Back", "RB", 13),
      p("wr1", "Wide One", "WR", 17), p("wr2", "Wide Two", "WR", 15), p("wr3", "Flex Wide", "WR", 11),
      p("te1", "Tight One", "TE", 12), p("k1", "Kicker One", "K", 9), p("d1", "Defense One", "DEF", 8),
    ]);
    const analysis = { state: "ready", teams: [
      { id: "1", roster_id: 1, sleeper_user_id: "me", team_name: "Alpha", playerIds: ["qb1", "rb1", "rb2", "rb3", "wr1", "wr2", "wr3", "te1", "k1", "d1"], starters: ["qb1", "rb1", "rb3", "wr1", "wr2", "wr3", "te1", "k1", "d1"] },
      { id: "2", roster_id: 2, sleeper_user_id: "them", team_name: "Bravo", playerIds: ["qb2", "qb3", "qb4", "rb4"], starters: ["qb2", "rb4"] },
    ] };
    const outlook = buildHomeWeekOutlook({ analysis, weekly: { season: 2026, week: 4, pool }, meSleeperId: "me",
      fixtures: [{ a: { sleeper_user_id: "me", name: "Alpha", projection: 121 }, b: { sleeper_user_id: "them", name: "Bravo", projection: 110 } }] });
    expect(HOME_OUTLOOK_POSITIONS).toEqual(["QB", "RB", "WR", "TE", "K", "DEF"]);
    expect(outlook.predictions[0]).toMatchObject({ winner: { name: "Alpha" }, margin: 11, confidence: "FAVORED", isMine: true });
    expect(outlook.leaders.QB.map(player => player.name)).toEqual(["QB One", "QB Two", "QB Three"]);
    expect(outlook.startSit.swaps[0]).toMatchObject({ start: { name: "Bench Back" }, sit: { name: "Starter Back" }, gain: 8 });
  });

  it("excludes out players from the weekly podium", () => {
    const pool = new Map([p("qb1", "Healthy", "QB", 20), p("qb2", "Out Star", "QB", 30, { isOut: true })]);
    const analysis = { state: "ready", teams: [{ id: "1", sleeper_user_id: "me", team_name: "Alpha", playerIds: ["qb1", "qb2"], starters: ["qb1"] }] };
    const outlook = buildHomeWeekOutlook({ analysis, weekly: { season: 2026, week: 4, pool }, meSleeperId: "me" });
    expect(outlook.leaders.QB.map(player => player.name)).toEqual(["Healthy"]);
  });
});
