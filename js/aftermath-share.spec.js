import { describe, expect, it } from "vitest";
import { aftermathText, buildAftermath } from "./aftermath-share.js";

const members = [
  { sleeper_user_id: "u1", team_name: "Alpha" },
  { sleeper_user_id: "u2", team_name: "Beta" },
  { sleeper_user_id: "u3", team_name: "Gamma" },
  { sleeper_user_id: "u4", team_name: "Delta" },
];
const weekly = { season: 2026, week: 1, teams: [
  { sleeper_user_id: "u1", team_name: "Alpha", projection: 164.82, actual: 120, complete: true, pointsOnBench: 4 },
  { sleeper_user_id: "u2", team_name: "Beta", projection: 122.66, actual: 99, complete: true, pointsOnBench: 8 },
  { sleeper_user_id: "u3", team_name: "Gamma", projection: 148.22, actual: 140, complete: true, pointsOnBench: 31.4 },
  { sleeper_user_id: "u4", team_name: "Delta", projection: 150.1, actual: 142, complete: true, pointsOnBench: 2 },
] };
const lore = { matchups: [
  { season: 2026, week: 1, user1: "u1", user2: "u2", score1: 120, score2: 99 },
  { season: 2026, week: 1, user1: "u3", user2: "u4", score1: 140, score2: 142 },
  { season: 2025, week: 1, user1: "u1", user2: "u4", score1: 80, score2: 90 },
] };

describe("weekly aftermath", () => {
  it("builds Tuesday's shareable recap from every final matchup", () => {
    const card = buildAftermath({ lore, members, weekly, now: new Date("2026-09-15T08:00:00") });
    expect(card.label).toBe("WEEK RECAP");
    expect(card.title).toBe("WEEK 1 RECAP");
    expect(card.status).toBe("FINAL");
    expect(card.king).toEqual({ name: "Delta", value: 142 });
    expect(card.blowout).toEqual({ winner: "Alpha", loser: "Beta", margin: 21 });
    expect(card.games).toHaveLength(2);
    expect(card.games[0]).toMatchObject({
      winner: { name: "Alpha", value: 120 }, loser: { name: "Beta", value: 99 },
      winnerLabels: ["ASS KICKING"], loserLabels: ["BODY BAG", "SEE ME AFTER CLASS"],
    });
    expect(card.games[1]).toMatchObject({
      winner: { name: "Delta", value: 142 }, loser: { name: "Gamma", value: 140 },
      winnerLabels: ["HONOR ROLL"], loserLabels: ["ROBBED", "BENCH CRIMINAL"],
    });
    expect(card.games.every(game => game.roast.length > 20)).toBe(true);
    expect(aftermathText(card)).toContain("Alpha 120.00 beat Beta 99.00");
    expect(aftermathText(card)).toContain("Delta 142.00 beat Gamma 140.00");
  });

  it("only offers the completed recap on Tuesday", () => {
    expect(buildAftermath({ lore, members, weekly, now: new Date("2026-09-14T08:00:00") })).toBeNull();
    expect(buildAftermath({ lore, members, weekly, now: new Date("2026-09-16T08:00:00") })).toBeNull();
    expect(buildAftermath({ lore, members, weekly, now: new Date("2026-09-13T20:00:00") })).toBeNull();
  });
});
