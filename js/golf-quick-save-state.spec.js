import { describe, expect, it } from "vitest";
import { mergeQuickGolfSave } from "./golf-quick-save-core.js";
const memory = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)) }; };
describe("quick golf save queue", () => {
  it("coalesces repeated edits to one player and hole", () => {
    const storage = memory();
    expect(mergeQuickGolfSave({ playerId: 4, hole: 7, strokes: 5 }, storage)).toBe(1);
    expect(mergeQuickGolfSave({ playerId: 4, hole: 7, strokes: 4, patch: { putts: 2 } }, storage)).toBe(1);
    const saved = JSON.parse(storage.getItem("dfl.golf.quick.pending.v1"));
    expect(saved["4:7"]).toMatchObject({ strokes: 4, patch: { putts: 2 } });
  });

  it("clears stale detail fields when a score is removed", () => {
    const storage = memory();
    mergeQuickGolfSave({ playerId: 4, hole: 7, strokes: 4, patch: { putts: 2 } }, storage);
    mergeQuickGolfSave({ playerId: 4, hole: 7, strokes: null }, storage);
    const saved = JSON.parse(storage.getItem("dfl.golf.quick.pending.v1"));
    expect(saved["4:7"]).toMatchObject({ strokes: null, patch: {} });
  });
});
