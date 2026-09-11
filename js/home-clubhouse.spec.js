import { describe, expect, it, vi } from "vitest";
import { buildClubhouseWeekly, clubhouseCard, clubhouseView } from "./home-clubhouse.js";

const player = (name, expectedPoints) => ({ name, expectedPoints });
const analysis = {
  state: "ready", projectionSeason: 2026,
  teams: [
    { id: "1", rank: 1, sleeper_user_id: "u1", team_name: "Alpha", lineup: { source: "set", weeklyPoints: 112, starters: [player("Steady", 100)], bench: [player("Bench Heat", 130)] } },
    { id: "2", rank: 2, sleeper_user_id: "u2", team_name: "Beta", lineup: { source: "set", weeklyPoints: 101, starters: [player("Starter", 120)], bench: [player("Reserve", 80)] } },
    { id: "3", rank: 3, sleeper_user_id: "u3", team_name: "Gamma", lineup: { source: "set", weeklyPoints: 90, starters: [player("Other", 100)], bench: [] } },
  ],
};
const members = [
  { sleeper_user_id: "u1", team_name: "Alpha" },
  { sleeper_user_id: "u2", team_name: "Beta" },
  { sleeper_user_id: "u3", team_name: "Gamma" },
];
const lore = { matchups: [
  { season: 2025, week: 4, user1: "u1", score1: 99, user2: "u2", score2: 100, winner_roster_id: 2 },
  { season: 2025, week: 8, user1: "u1", score1: 121, user2: "u2", score2: 110, winner_roster_id: 1 },
] };

describe("Home clubhouse", () => {
  it("builds truthful matchup, hot-seat, temperature, and rivalry takes", () => {
    vi.spyOn(Date, "now").mockReturnValue(1);
    const view = clubhouseView({ analysis, lore, members, meSleeperId: "u1", now: new Date("2026-09-09T12:00:00Z") });
    expect(view.stories.some(story => story.key === "matchup" && story.detail.includes("11"))).toBe(true);
    expect(view.stories.some(story => story.key === "hot-seat" && story.detail.includes("30"))).toBe(true);
    expect(view.stories.some(story => story.key === "temperature")).toBe(true);
    expect(view.stories.some(story => story.key === "rivalry" && story.detail.includes("1-1"))).toBe(true);
    expect(view.stories.some(story => /receipt/i.test(story.label))).toBe(false);
    vi.restoreAllMocks();
  });

  it("only calls a team a fraud when standings outrun the model", () => {
    const view = clubhouseView({ analysis, lore, members, meSleeperId: "u1", standings: [
      { season: 2026, sleeper_user_id: "u3", rank: 1, wins: 2 },
      { season: 2026, sleeper_user_id: "u1", rank: 2, wins: 1 },
    ], now: new Date("2026-09-09T12:00:00Z") });
    const fraud = view.stories.find(story => story.label.includes("FRAUD"));
    expect(fraud.headline).toContain("Gamma");
    expect(fraud.detail).toContain("#1 in the standings, #3 in the roster model");
  });

  it("escapes league-controlled names in the rendered cold open", () => {
    const changed = { ...analysis, teams: analysis.teams.map((team, index) => index ? team : { ...team, team_name: "<script>" }) };
    const view = clubhouseView({ analysis: changed, lore, members, meSleeperId: "u1", now: new Date("2026-09-09T12:00:00Z") });
    const html = view.stories.map((_, index) => clubhouseCard(view, index)).join("");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("switches the opener into game-day mode on Sunday", () => {
    const view = clubhouseView({ analysis, lore, members, meSleeperId: "u1", now: new Date("2026-09-13T12:00:00") });
    expect(view.gameDay).toBe(true);
    expect(clubhouseCard(view)).toContain("SUNDAY · GAME DAY");
  });

  it("uses current Sleeper weekly projections to rank the league", () => {
    const weeklyAnalysis = {
      ...analysis, league: { scoring_settings: { pass_yd: .04 } },
      teams: analysis.teams.map((team, index) => ({
        ...team, playerIds: [`p${index + 1}`], starters: [`p${index + 1}`],
      })),
    };
    const weekly = buildClubhouseWeekly({
      analysis: weeklyAnalysis, season: 2026, week: 1,
      rows: [
        { player_id: "p1", player: { position: "QB", first_name: "One" }, opponent: "A", stats: { gp: 1, pass_yd: 200 } },
        { player_id: "p2", player: { position: "QB", first_name: "Two" }, opponent: "B", stats: { gp: 1, pass_yd: 300 } },
        { player_id: "p3", player: { position: "QB", first_name: "Three" }, opponent: "C", stats: { gp: 1, pass_yd: 250 } },
      ],
    });
    const view = clubhouseView({ analysis: weeklyAnalysis, lore, members, meSleeperId: "u1", weekly, now: new Date("2026-09-09T12:00:00Z") });
    const hot = view.stories.find(story => story.label === "LEAGUE TEMPERATURE · HOT");
    expect(hot.headline).toContain("Beta");
    expect(hot.detail).toContain("highest current Sleeper projection for Week 1");
  });

  it("never calls an in-progress current-week score a loss", () => {
    const liveLore = {
      leagues: [{ season: 2026, status: "in_season" }],
      matchups: [{ season: 2026, week: 1, user1: "u1", score1: 7, user2: "u2", score2: 14, winner_roster_id: 2 }],
    };
    const weekly = { season: 2026, week: 1, teams: [
      { sleeper_user_id: "u1", projection: 108 }, { sleeper_user_id: "u2", projection: 111 },
    ] };
    const view = clubhouseView({ analysis, lore: liveLore, members, meSleeperId: "u1", weekly, now: new Date("2026-09-09T12:00:00Z") });
    const matchup = view.stories.find(story => story.key === "matchup");
    expect(matchup.label).toContain("LIVE");
    expect(matchup.headline).toContain("week is still alive");
    expect(matchup.detail).toContain("Sleeper projects 108-111");
    expect(`${matchup.headline} ${matchup.detail}`).not.toMatch(/you lost/i);
  });

  it("matches Sleeper's live projection by replacing a played projection with actual points", () => {
    const liveAnalysis = {
      state: "ready", projectionSeason: 2026, league: { scoring_settings: { rec: 1 } },
      teams: [{
        id: "7", rank: 1, sleeper_user_id: "u2", team_name: "Jack-HAMMER",
        playerIds: ["qb", "k", "SEA"], starters: ["qb", "k", "SEA"],
        lineup: { source: "set", weeklyPoints: 100, starters: [], bench: [] },
      }],
    };
    const rows = [
      { player_id: "qb", player: { position: "QB" }, opponent: "A", stats: { gp: 1, rec: 110 } },
      { player_id: "k", player: { position: "K" }, opponent: "B", stats: { gp: 1, rec: 7 } },
      { player_id: "SEA", player: { position: "DEF" }, opponent: "C", stats: { gp: 1, rec: 8.5 } },
    ];
    const actualRows = [
      { player_id: "SEA", player: { position: "DEF" }, stats: { gp: 1, rec: 13 } },
    ];
    const weekly = buildClubhouseWeekly({ analysis: liveAnalysis, rows, actualRows, season: 2026, week: 1 });
    expect(weekly.teams[0].projection).toBe(130);
  });

  it("never renders an undefined team name in a weekly Hot Seat take", () => {
    const weekly = { season: 2026, week: 1, teams: [{
      id: "1", sleeper_user_id: "u1", team_name: "Alpha", projection: 120,
      lineupIsSet: true, pointsOnBench: 9.4,
      swap: { in: "Bench Heat", out: "Cold Starter", gain: 9.4 },
    }] };
    const view = clubhouseView({ analysis, lore, members, meSleeperId: "u1", weekly, now: new Date("2026-09-09T12:00:00Z") });
    const hotSeat = view.stories.find(story => story.key === "hot-seat");
    expect(hotSeat.headline).toContain("Alpha has Bench Heat");
    expect(view.stories.map((_, index) => clubhouseCard(view, index)).join(" ")).not.toContain("undefined");
  });
});
