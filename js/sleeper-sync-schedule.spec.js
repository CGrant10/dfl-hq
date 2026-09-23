import { describe, expect, it } from "vitest";
import {
  normalizeSleeperSchedule,
  sleeperScheduleByDay,
  formatSleeperSyncTime,
} from "./sleeper-sync-schedule.js";

describe("commissioner Sleeper sync schedule", () => {
  it("keeps valid unique slots in weekly order", () => {
    expect(normalizeSleeperSchedule([
      { day: 1, time: "00:00:00" },
      { day: 0, time: "18:00" },
      { day: 0, time: "13:00" },
      { day: 0, time: "13:00" },
      { day: 8, time: "12:00" },
      { day: 2, time: "25:00" },
    ])).toEqual([
      { day: 0, time: "13:00" },
      { day: 0, time: "18:00" },
      { day: 1, time: "00:00" },
    ]);
  });

  it("groups editable times under all seven weekdays", () => {
    const days = sleeperScheduleByDay([{ day: 5, time: "17:30" }]);
    expect(days).toHaveLength(7);
    expect(days[5]).toEqual(["17:30"]);
    expect(days[0]).toEqual([]);
  });

  it("formats Central-time slots for a readable summary", () => {
    expect(formatSleeperSyncTime("00:00")).toBe("12:00 AM");
    expect(formatSleeperSyncTime("15:30")).toBe("3:30 PM");
  });
});
