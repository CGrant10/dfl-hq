import { describe, expect, it } from "vitest";
import { assemblyProgress } from "./scroll-assembly.js";

const rect = (top, height = 50) => ({ top, height });

describe("how far from assembled a part is", () => {
  const viewH = 1000;   // settle line at 620

  it("is fully scattered at the bottom edge of the screen", () => {
    /* middle sitting on the bottom edge */
    expect(assemblyProgress(rect(975), viewH)).toBeCloseTo(1, 2);
  });

  it("is assembled once it has risen past the settle line", () => {
    expect(assemblyProgress(rect(595), viewH)).toBe(0);   // middle at 620
    expect(assemblyProgress(rect(200), viewH)).toBe(0);
  });

  it("moves continuously in between, which is what lets it reverse", () => {
    const low = assemblyProgress(rect(900), viewH);
    const mid = assemblyProgress(rect(800), viewH);
    const high = assemblyProgress(rect(700), viewH);
    expect(low).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(high);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it("never leaves a part part-way past the ends", () => {
    expect(assemblyProgress(rect(4000), viewH)).toBe(1);
    expect(assemblyProgress(rect(-500), viewH)).toBe(0);
  });

  /* A viewport with no height means the page is not laid out. Dividing
     against it would pin everything to "scattered", which reads as a broken
     page rather than an un-scrolled one. */
  it("assembles rather than scatters when there is no viewport to measure", () => {
    expect(assemblyProgress(rect(500), 0)).toBe(0);
    expect(assemblyProgress(rect(500), -1)).toBe(0);
    expect(assemblyProgress(null, 1000)).toBe(0);
  });

  it("scales with the viewport rather than assuming a size", () => {
    /* the same fraction down two different screens gives the same progress */
    expect(assemblyProgress(rect(880, 40), 1000)).toBeCloseTo(assemblyProgress(rect(440, 20), 500), 2);
  });
});
