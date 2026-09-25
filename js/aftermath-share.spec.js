import { describe, expect, it } from "vitest";
import { aftermathText, buildAftermath } from "./aftermath-share.js";

const members = [
  { sleeper_user_id: "u1", team_name: "Alpha" },
  { sleeper_user_id: "u2", team_name: "Beta" },
  { sleeper_user_id: "u3", team_name: "Gamma" },
  { sleeper_user_id: "u4", team_name: "Delta" },
];
const weekly = { season: 2026, week: 1, teams: [
  { sleeper_user_id: "u1", team_name: "Alpha", projection: 164.82, actual: 120, complete: true, pointsOnBench: 4,
    starterScores: [{ name: "Alpha Ace", position: "WR", nflTeam: "MIN", owner: "Alpha", points: 28 }],
    benchScores: [{ name: "Wrong Choice", position: "RB", nflTeam: "BUF", owner: "Alpha", points: 12 }] },
  { sleeper_user_id: "u2", team_name: "Beta", projection: 122.66, actual: 99, complete: true, pointsOnBench: 8,
    starterScores: [{ name: "Beta Back", position: "RB", nflTeam: "GB", owner: "Beta", points: 21 }],
    benchScores: [{ name: "Bench Dust", position: "WR", nflTeam: "NYJ", owner: "Beta", points: 3 }] },
  { sleeper_user_id: "u3", team_name: "Gamma", projection: 148.22, actual: 140, complete: true, pointsOnBench: 31.4,
    starterScores: [{ name: "Gamma Gun", position: "QB", nflTeam: "DET", owner: "Gamma", points: 29 }],
    benchScores: [{ name: "Pain Machine", position: "WR", nflTeam: "DAL", owner: "Gamma", points: 18 }] },
  { sleeper_user_id: "u4", team_name: "Delta", projection: 150.1, actual: 142, complete: true, pointsOnBench: 2,
    starterScores: [{ name: "Delta Dawg", position: "TE", nflTeam: "KC", owner: "Delta", points: 32 }],
    benchScores: [{ name: "Free Points", position: "QB", nflTeam: "LAR", owner: "Delta", points: 9 }] },
] };
const lore = { matchups: [
  { season: 2026, week: 1, user1: "u1", user2: "u2", score1: 120, score2: 99 },
  { season: 2026, week: 1, user1: "u3", user2: "u4", score1: 140, score2: 142 },
  { season: 2025, week: 1, user1: "u1", user2: "u4", score1: 80, score2: 90 },
] };

describe("weekly aftermath", () => {
  it("turns Tuesday's completed slate into a story and four strong highlights", () => {
    const card = buildAftermath({ lore, members, weekly, now: new Date("2026-09-15T08:00:00") });
    expect(card.label).toBe("WEEK RECAP");
    expect(card.title).toBe("WEEK 1 RECAP");
    expect(card.status).toBe("FINAL");
    expect(card.king).toEqual({ name: "Delta", value: 142 });
    expect(card.blowout).toEqual({ winner: "Alpha", loser: "Beta", margin: 21 });
    expect(card.closest).toEqual({ winner: "Delta", loser: "Gamma", margin: 2 });
    expect(card.games).toHaveLength(2);
    expect(card.highlights).toEqual([
      { label: "WEEK'S FINAL BOSS", title: "Delta", detail: "142.00 PTS · EAT SHIT, LEAGUE", tone: "gold" },
      { label: "PUBLIC EXECUTION", title: "Alpha", detail: "21.00-PT ASS-WHIPPING · Beta", tone: "red" },
      { label: "FUCKING BRUTAL", title: "Gamma", detail: "LOST BY 2.00 · Delta", tone: "ink" },
      { label: "BENCH DUMBASS", title: "Gamma", detail: "18.00 PTS WASTED · DUMBASS TAX", tone: "red" },
    ]);
    expect(card.players.starters.map(player => player.name)).toEqual(["Delta Dawg", "Gamma Gun", "Alpha Ace"]);
    expect(card.players.bench.map(player => player.name)).toEqual(["Pain Machine", "Wrong Choice", "Free Points"]);
    expect(card.story).toContain("DELTA");
    expect(card.story).toContain("ALPHA");
    expect(card.story).toContain("GAMMA");
    expect(card.story).toMatch(/ass|bitch|bullshit|damn|dogshit|dumbass|hell|shit/i);
    expect(aftermathText(card)).toContain(card.story);
    expect(aftermathText(card)).not.toContain("Alpha 120.00 beat Beta 99.00");
  });

  it("uses fresh completed totals when the synced matchup score is stale", () => {
    const dreamMembers = [
      { sleeper_user_id: "dream", team_name: "Dream Enders" },
      { sleeper_user_id: "opp", team_name: "Sunday Scaries" },
    ];
    const freshWeekly = { season: 2026, week: 1, teams: [
      { sleeper_user_id: "dream", team_name: "Dream Enders", actual: 117.06, complete: true, pointsOnBench: 5 },
      { sleeper_user_id: "opp", team_name: "Sunday Scaries", actual: 117.20, complete: true, pointsOnBench: 2 },
    ] };
    const staleLore = { matchups: [
      { season: 2026, week: 1, user1: "dream", user2: "opp", score1: 117.06, score2: 113.60 },
    ] };
    const card = buildAftermath({ lore: staleLore, members: dreamMembers, weekly: freshWeekly,
      now: new Date("2026-09-15T08:00:00") });
    expect(card.closest).toEqual({ winner: "Sunday Scaries", loser: "Dream Enders", margin: 0.14 });
    expect(card.highlights.find(item => item.label === "FUCKING BRUTAL")).toMatchObject({
      title: "Dream Enders", detail: "LOST BY 0.14 · Sunday Scaries",
    });
    expect(card.story).toContain("DREAM ENDERS");
  });

  it("keeps a completed recap available throughout the week", () => {
    expect(buildAftermath({ lore, members, weekly, now: new Date("2026-09-14T08:00:00") })).toMatchObject({ week: 1, final: true });
    expect(buildAftermath({ lore, members, weekly, now: new Date("2026-09-16T08:00:00") })).toMatchObject({ week: 1, final: true });
    expect(buildAftermath({ lore, members, weekly, now: new Date("2026-09-18T20:00:00") })).toMatchObject({ week: 1, final: true });
    expect(buildAftermath({ lore, members, weekly: { ...weekly, teams: weekly.teams.map(team => ({ ...team, complete: false })) }, now: new Date("2026-09-15T08:00:00") })).toBeNull();
  });
});
