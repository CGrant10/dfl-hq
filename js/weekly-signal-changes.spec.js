import { describe, expect, it } from "vitest";
import { weeklySignalChanges } from "./weekly-signal-changes.js";
const memory = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)) }; };
describe("weekly signal changes", () => {
  it("reports material projection and injury changes after the first snapshot", () => {
    const storage = memory(), player = { name: "Receiver", points: 10, hasGame: true, injuryStatus: null };
    const weekly = { season: 2026, week: 4, pool: new Map([["1", player]]) };
    expect(weeklySignalChanges(weekly, storage)).toEqual([]);
    player.points = 13; expect(weeklySignalChanges(weekly, storage)[0].detail).toContain("+3.0");
    player.injuryStatus = "Questionable"; expect(weeklySignalChanges(weekly, storage)[0]).toMatchObject({ type: "injury", impact: "down" });
  });
});
