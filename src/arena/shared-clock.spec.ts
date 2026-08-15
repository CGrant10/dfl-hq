import { describe, expect, it } from "vitest";
import type { SharedRaceEvent } from "./contracts";
import { sharedClock } from "./shared-clock";

const base: SharedRaceEvent = { id: 1, seed: 42, race_length: "medium", length_ticks: 550,
  bc_state: "idle", bc_started_at: null, bc_offset_ms: 0, bc_show_board: true, bc_show_timer: true };

describe("shared race clock", () => {
  it("opens without starting", () => expect(sharedClock(base, 10_000).state).toBe("open"));
  it("counts down without advancing racers", () => {
    const clock = sharedClock({ ...base, bc_state: "running", bc_started_at: new Date(10_000).toISOString() }, 11_250);
    expect(clock).toEqual({ state: "countdown", elapsedMs: 0, countdownMs: 1750 });
  });
  it("reconnects to the shared elapsed time", () => {
    const event = { ...base, bc_state: "running" as const, bc_started_at: new Date(10_000).toISOString(), bc_offset_ms: 2200 };
    expect(sharedClock(event, 18_000).elapsedMs).toBe(7200);
  });
  it("freezes exactly at the saved pause offset", () => {
    expect(sharedClock({ ...base, bc_state: "paused", bc_offset_ms: 4321 }, 99_999).elapsedMs).toBe(4321);
  });
  it("keeps the final frame stable", () => {
    expect(sharedClock({ ...base, bc_state: "finished", bc_offset_ms: 22000 }, 99_999))
      .toEqual({ state: "finished", elapsedMs: 22000, countdownMs: 0 });
  });
});
