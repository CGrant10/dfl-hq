import { describe, expect, it } from "vitest";
import { cyclePose, pixelPoseRows } from "./pixel-poses";

describe("generated pixel stride poses", () => {
  const rows = ["........", "..XXXX..", ".XXXXXX.", "..X..X..", ".XX..XX.", "XX....XX"];

  it("keeps frame dimensions and the exact neutral drawing", () => {
    expect(pixelPoseRows(rows, 0)).toEqual(rows);
    for (const pose of [1, 2, 3] as const) {
      const generated = pixelPoseRows(rows, pose);
      expect(generated).toHaveLength(rows.length);
      expect(generated.every((row, i) => row.length === rows[i]!.length)).toBe(true);
    }
  });

  it("cycles through four distinct cadence phases", () => {
    expect([0, 100, 200, 300].map((time) => cyclePose(time, 400))).toEqual([0, 1, 2, 3]);
  });
});
