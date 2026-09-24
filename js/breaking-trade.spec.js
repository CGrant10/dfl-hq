import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./breaking-trade.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../css/breaking-trade.css", import.meta.url), "utf8");

describe("breaking trade commissioner controls", () => {
  it("shows the action only with live Sleeper permission", () => {
    expect(source).toContain('const commissioner = hasPermission("sleeper")');
    expect(source).toContain('if (!hasPermission("sleeper"))');
    expect(source).toContain("Only a commissioner can end a trade alert");
  });

  it("repaints when commissioner/member mode changes", () => {
    expect(source).toContain("ACCESS_EVENT");
    expect(source).toContain('window.addEventListener(ACCESS_EVENT, () => refresh({ force: true }))');
  });

  it("uses the compact non-wrapping End alert action", () => {
    expect(source).toContain(">End alert</button>");
    expect(source).not.toContain("End coverage");
    expect(css).toContain("white-space: nowrap");
  });
});
