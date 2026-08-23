import { describe, expect, it } from "vitest";
import { betaRouteForMember, canScoreBetaCard } from "./golf-tournament-beta-rules.js";

const participants = [
  { id: 10, member_id: 101, team_id: 1 },
  { id: 20, member_id: 202, team_id: 2 },
  { id: 30, member_id: null, team_id: 1 },
];

describe("Tournament Beta permissions", () => {
  it("sends members away from setup and classic controls", () => {
    expect(betaRouteForMember({ setup: true })).toBe("match");
    expect(betaRouteForMember({ classic: true })).toBe("match");
    expect(betaRouteForMember({ organizer: true, setup: true })).toBe("setup");
  });

  it("lets a member score only their team card", () => {
    const base = { memberId: 101, participants };
    expect(canScoreBetaCard({ ...base, cardId: 1 })).toBe(true);
    expect(canScoreBetaCard({ ...base, cardId: 2 })).toBe(false);
  });

  it("lets a member score only their individual side", () => {
    const base = {
      individual: true, memberId: 101, participants,
      sides: [{ id: 5 }, { id: 6 }],
      matchPlayers: [{ side_id: 5, participant_id: 10 }, { side_id: 6, participant_id: 20 }],
    };
    expect(canScoreBetaCard({ ...base, cardId: 5 })).toBe(true);
    expect(canScoreBetaCard({ ...base, cardId: 6 })).toBe(false);
  });

  it("lets commissioners score every card", () => {
    expect(canScoreBetaCard({ organizer: true, cardId: 99 })).toBe(true);
  });
});
