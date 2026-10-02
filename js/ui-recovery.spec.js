import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorBox } from "./ui.js";
beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("connection failure recovery", () => {
  it("explains offline data failures and supplies a retry action", () => {
    vi.stubGlobal("navigator", { onLine: false });
    const markup = errorBox({ message: "TypeError: Failed to fetch" });
    expect(markup).toContain("You’re offline");
    expect(markup).toContain("data-retry-page");
    expect(markup).not.toContain("TypeError");
  });
  it("hides implementation URLs on online module-fetch failures", () => {
    vi.stubGlobal("navigator", { onLine: true });
    const markup = errorBox(new Error("Failed to fetch dynamically imported module: https://example.test/private-path.js"));
    expect(markup).toContain("Connection interrupted");
    expect(markup).toContain("data-retry-page");
    expect(markup).not.toContain("private-path.js");
  });
});
