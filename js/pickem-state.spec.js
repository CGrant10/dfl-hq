import { describe, expect, it } from "vitest";
import { pickemState } from "./pickem-state.js";

const board = { locksAt: "2026-10-02T00:15:00Z", games: Array.from({ length: 16 }, () => ({})) };
describe("Pick’em participation and cutoff", () => {
  it("separates a missed cutoff from a submitted card", () => {
    const state = pickemState(board, new Date("2026-10-02T12:00:00Z"));
    expect(state).toMatchObject({ isLocked: true, entered: false, pending: 0 });
  });
  it("keeps a fresh card playable before its cutoff", () => {
    expect(pickemState(board, new Date("2026-10-01T12:00:00Z")))
      .toMatchObject({ isLocked: false, entered: false, total: 16 });
  });
  it("counts pending picks from the member’s card rather than the whole slate", () => {
    expect(pickemState({ ...board, entry: { picks: { a: "A", b: "B", c: "C" }, liveCorrect: 1, liveWrong: 1 } }))
      .toMatchObject({ entered: true, pending: 1 });
  });
  it("does not report negative pending picks when refreshed counts disagree", () => {
    expect(pickemState({ ...board, entry: { picks: { a: "A" }, liveCorrect: 2 } }).pending).toBe(0);
  });
});
