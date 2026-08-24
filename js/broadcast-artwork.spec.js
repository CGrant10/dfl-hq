import { describe, expect, it } from "vitest";
import { artworkSettings, artworkStyle } from "./broadcast-artwork.js";

describe("broadcast artwork framing", () => {
  it("keeps existing slides on the historic cover/center framing", () => {
    expect(artworkSettings({})).toEqual({ imageFit: "cover", imageX: "center", imageY: "center" });
  });

  it("can show the complete image and move its focal point", () => {
    expect(artworkStyle({ imageFit: "contain", imageX: "left", imageY: "top" }))
      .toBe("object-fit:contain;object-position:left top");
  });

  it("rejects arbitrary stored CSS values", () => {
    expect(artworkStyle({ imageFit: "url(bad)", imageX: "10%;color:red", imageY: "bottom" }))
      .toBe("object-fit:cover;object-position:center bottom");
  });
});
