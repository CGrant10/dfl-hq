import { describe, expect, it } from "vitest";
import { buildWeeklyBriefing } from "./weekly-briefing.js";

describe("weekly briefing", () => {
  it("turns Tuesday into a personal four-part read", () => {
    const briefing = buildWeeklyBriefing({
      now: new Date("2026-09-29T09:00:00"), meSleeperId: "u1",
      outlook: { week: 4, predictions: [{ isMine: true, winner: { name: "Mine", projection: 121 }, loser: { name: "Them", projection: 114 }, margin: 7 }], startSit: { lineupIsSet: true, swaps: [] } },
      stakes: { berths: 2, week: 4, rows: [{ sleeperUserId: "u1", status: "alive", projectedSeed: 2, playoffOdds: .67, remaining: 10, winsNeeded: 2 }] },
      move: { headline: "Hold your waiver priority" },
    });
    expect(briefing.title).toBe("Tuesday Briefing");
    expect(briefing.headline).toContain("favored by 7.0");
    expect(briefing.playoffDetail).toContain("67% playoff chance");
    expect(briefing.action).toBe("Hold your waiver priority");
  });
});
