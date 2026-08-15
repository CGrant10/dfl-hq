import { describe, expect, it } from "vitest";
import { backgroundMotion } from "./background-motion";

describe("isolated Arena background motion", () => {
  it("is absent outside active racing", () => {
    for (const state of ["idle", "paused", "finished"] as const) expect(backgroundMotion(state, 1).blurX).toBe(0);
  });

  it("grows horizontally with heat and eases near finish", () => {
    expect(backgroundMotion("running", 1).blurX).toBeGreaterThan(backgroundMotion("running", 0.2).blurX);
    expect(backgroundMotion("running", 1).blurX).toBeGreaterThanOrEqual(15);
    expect(backgroundMotion("running", 1, true).blurX).toBeLessThan(backgroundMotion("running", 1).blurX);
    expect(backgroundMotion("running", 1).blurY).toBeLessThan(backgroundMotion("running", 1).blurX / 20);
    expect(backgroundMotion("running", 1).intensity).toBe(1);
  });
});
