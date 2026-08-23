import { describe, expect, it } from "vitest";
import { betaCaptainChoices, betaFormatStatus, betaMatchCount, betaRoundName, betaSeatsPerSide } from "./golf-tournament-beta-format.js";

const side = (team, players) => ({ team_id: team, players: Array.from({ length: players }, (_, id) => ({ id })) });
const battle = (players) => ({ sides: [side(1, players), side(2, players)] });

describe("Tournament Beta team format", () => {
  it("requires two teams of six, three 2v2s and six singles matches", () => {
    const teams = [{ id: 1, captain_member_id: 101 }, { id: 2, captain_member_id: 107 }];
    const participants = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, member_id: 101 + index, team_id: index < 6 ? 1 : 2 }));
    const rounds = [
      { round: { format: "pairs" }, battles: Array.from({ length: 3 }, () => battle(2)) },
      { round: { format: "singles" }, battles: Array.from({ length: 6 }, () => battle(1)) },
    ];
    expect(betaFormatStatus({ teams, participants, rounds })).toMatchObject({ teamsReady: true, captainsReady: true, pairsReady: true, singlesReady: true, ready: true });
  });

  it("reports an incomplete lineup or matchup field", () => {
    const result = betaFormatStatus({ teams: [{ id: 1 }, { id: 2 }], participants: [{ team_id: 1 }], rounds: [] });
    expect(result).toMatchObject({ counts: [1, 0], teamsReady: false, pairsReady: false, singlesReady: false, ready: false });
  });

  it("defines the canonical two-round schedule", () => {
    expect(betaRoundName("pairs")).toBe("Round 1 · 2v2");
    expect(betaRoundName("singles")).toBe("Round 2 · Singles");
    expect(betaMatchCount("pairs")).toBe(3);
    expect(betaMatchCount("singles")).toBe(6);
    expect(betaSeatsPerSide("pairs")).toBe(2);
  });

  it("offers only rostered league members as captains", () => {
    const team = { id: 1 };
    const participants = [
      { id: 1, member_id: 101, team_id: 1 },
      { id: 2, member_id: null, team_id: 1 },
      { id: 3, member_id: 202, team_id: 2 },
    ];
    expect(betaCaptainChoices(team, participants)).toEqual([participants[0]]);
  });
});
