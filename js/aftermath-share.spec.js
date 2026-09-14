import { describe, expect, it } from "vitest";
import { aftermathText, buildAftermath } from "./aftermath-share.js";

const members = [
  { sleeper_user_id: "u1", team_name: "Alpha" },
  { sleeper_user_id: "u2", team_name: "Beta" },
  { sleeper_user_id: "u3", team_name: "Gamma" },
  { sleeper_user_id: "u4", team_name: "Delta" },
];
const weekly = { season: 2026, week: 1, teams: [
  { sleeper_user_id: "u1", team_name: "Alpha", projection: 164.82, pointsOnBench: 4 },
  { sleeper_user_id: "u2", team_name: "Beta", projection: 122.66, pointsOnBench: 8 },
  { sleeper_user_id: "u3", team_name: "Gamma", projection: 148.22, pointsOnBench: 31.4 },
  { sleeper_user_id: "u4", team_name: "Delta", projection: 150.1, pointsOnBench: 2 },
] };
const lore = { matchups: [
  { season: 2026, week: 1, user1: "u1", user2: "u2", score1: 120, score2: 99 },
  { season: 2026, week: 1, user1: "u3", user2: "u4", score1: 140, score2: 142 },
  { season: 2025, week: 1, user1: "u1", user2: "u4", score1: 80, score2: 90 },
] };

describe("weekly aftermath", () => {
  it("builds a Sunday live card from current projections", () => {
    const card = buildAftermath({ lore, members, weekly, now: new Date("2026-09-13T20:00:00") });
    expect(card.label).toBe("SUNDAY AFTERMATH");
    expect(card.status).toBe("SUNDAY SLATE · LIVE");
    expect(card.king).toEqual({ name: "Alpha", value: 164.82 });
    expect(card.blowout).toEqual({ winner: "Alpha", loser: "Beta", margin: 42.2 });
    expect(card.pain).toEqual({ name: "Gamma", value: 148.22 });
    expect(card.bench).toEqual({ name: "Gamma", value: 31.4 });
  });

  it("labels Monday as pre-MNF instead of falsely calling it final", () => {
    const card = buildAftermath({ lore, members, weekly, now: new Date("2026-09-14T08:00:00") });
    expect(card.label).toBe("MONDAY AFTERMATH");
    expect(card.status).toBe("PRE-MNF · LIVE");
    expect(aftermathText(card)).toContain("PRE-MNF · LIVE");
  });

  it("stays out of the clubhouse on other days", () => {
    expect(buildAftermath({ lore, members, weekly, now: new Date("2026-09-15T08:00:00") })).toBeNull();
  });
});
