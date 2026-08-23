import { describe, expect, it } from "vitest";
import { capHoleDistance, holeZoom, isOutsideHole } from "./golf-gps-distance.js";

describe("hole GPS distance handling", () => {
  it("never displays more than the selected hole's maximum yardage", () => {
    expect(capHoleDistance(3000, 352)).toBe(352);
    expect(capHoleDistance(146, 352)).toBe(146);
  });

  it("keeps a missing GPS fix missing instead of converting it to zero", () => {
    expect(capHoleDistance(null, 352)).toBeNull();
    expect(isOutsideHole(null, 352)).toBe(false);
  });

  it("recognizes fixes well outside the hole corridor", () => {
    expect(isOutsideHole(500, 352)).toBe(true);
    expect(isOutsideHole(410, 352)).toBe(false);
  });

  it("zooms progressively as the player approaches the green", () => {
    expect(holeZoom(350)).toBe(17);
    expect(holeZoom(200)).toBe(18);
    expect(holeZoom(100)).toBe(19);
    expect(holeZoom(40)).toBe(20);
  });
});
