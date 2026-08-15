import { describe, expect, it } from "vitest";
import { effectDensity, effectSample } from "./effects";

describe("Arena deterministic presentation effects", () => {
  it("returns the same sample for the same frame bucket", () => {
    expect(effectSample(42, 7, 2)).toEqual(effectSample(42, 7, 2));
    expect(effectSample(42, 7, 2)).not.toEqual(effectSample(43, 7, 2));
  });

  it("disables effects for reduced motion and lowers compact density", () => {
    expect(effectDensity(3, false, true)).toBe(0);
    expect(effectDensity(0, false, false)).toBe(0);
    expect(effectDensity(3, true, false)).toBeLessThan(effectDensity(3, false, false));
  });
});
