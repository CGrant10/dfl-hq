import { describe, expect, it, vi } from "vitest";
import { clubhouseCard, clubhouseView } from "./home-clubhouse.js";

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
});
