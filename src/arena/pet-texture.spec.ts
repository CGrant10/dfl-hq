import { describe, expect, it } from "vitest";
import { normalizePet, petMotion, petSvg, petTextureUri } from "./pet-texture";

describe("Pixi pet textures", () => {
  it("preserves every stored cosmetic field", () => {
    const pet = normalizePet({ species: "sparkpup", color: "#C8102E", accent: "#ffd84a", trail: "spark",
      name: "Bolt", accessory: "visor", expression: "happy" } as never);
    expect(pet).toMatchObject({ species: "sparkpup", color: "#C8102E", accent: "#ffd84a", trail: "spark",
      name: "Bolt", accessory: "visor", expression: "happy" });
  });
  it("sanitizes unsafe stored values", () => {
    const pet = normalizePet({ species: '<script>', color: "red", accent: "url(x)", trail: "fire" } as never);
    expect(pet.species).toBe("script");
    expect(pet.color).toBe("#38bdf8");
    expect(pet.accent).toBe("#ffffff");
    expect(pet.trail).toBe("none");
  });
  it("creates a self-contained crisp pixel texture", () => {
    expect(petSvg(null)).toContain('shape-rendering="crispEdges"');
    expect(petTextureUri(null)).toMatch(/^data:image\/svg\+xml,/);
  });
  it("maps race reactions to animation states", () => {
    expect(petMotion("surge", false, "running")).toBe("surge");
    expect(petMotion(undefined, true, "finished")).toBe("win");
    expect(petMotion(undefined, false, "paused")).toBe("idle");
  });
});
