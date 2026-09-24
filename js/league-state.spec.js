import { describe, expect, it, vi } from "vitest";
vi.mock("./supabase.js", () => ({ db: vi.fn() }));
vi.mock("./sleeper.js", () => ({ loadNflState: vi.fn() }));
import { deriveLeagueState } from "./league-state.js";

describe("shared league state", () => {
  it("keeps rankings on the last completed week", () => {
    const state = deriveLeagueState({ nfl: { season: 2026, week: 3 }, now: new Date("2026-09-17T12:00:00") });
    expect(state.currentWeek).toBe(3);
    expect(state.rankingsWeek).toBe(2);
  });

  it("shows Tuesday's completed report while previews move forward", () => {
    const state = deriveLeagueState({ nfl: { season: 2026, week: 4 }, now: new Date("2026-09-22T09:00:00") });
    expect(state.phase).toBe("preview");
    expect(state.reportWeek).toBe(3);
    expect(state.currentWeek).toBe(4);
  });

  it("marks an old sync as stale", () => {
    const state = deriveLeagueState({
      nfl: { season: 2026, week: 4 },
      config: { last_synced_at: "2026-09-20T00:00:00Z" },
      now: new Date("2026-09-22T09:00:00Z"),
    });
    expect(state.syncFresh).toBe(false);
  });
});
