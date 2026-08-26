import { describe, expect, it } from "vitest";
import { artworkSettings, artworkStyle, slideBackground } from "./broadcast-artwork.js";

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

describe("a hand-written slide that has a picture", () => {
  it("shows it, without the commissioner also switching the plate", () => {
    /*
      THE BUG. The picture field and the Background select were two separate
      decisions, fifteen fields apart behind "More options", and choosing only
      the picture produced a slide with no picture on it.
    */
    expect(slideBackground({ image: "data:image/png;base64,xx", background: "default" })).toBe("image");
  });

  it("infers it for a row saved before the column existed", () => {
    expect(slideBackground({ image: "https://example.test/a.jpg" })).toBe("image");
  });

  it("leaves a plate the commissioner actually chose alone", () => {
    expect(slideBackground({ image: "data:image/png;base64,xx", background: "dark" })).toBe("dark");
    expect(slideBackground({ image: "data:image/png;base64,xx", background: "logo" })).toBe("logo");
  });

  it("stays on the house look when there is no picture", () => {
    expect(slideBackground({ background: "default" })).toBe("default");
    expect(slideBackground({})).toBe("default");
  });

  it("degrades an unknown stored plate to the house look", () => {
    expect(slideBackground({ background: "neon" })).toBe("default");
  });
});
