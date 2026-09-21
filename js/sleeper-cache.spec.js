import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSleeperAnalysisCache } from "./sleeper.js";

describe("Sleeper analyzer cache", () => {
  const original = globalThis.caches;
  afterEach(() => { globalThis.caches = original; });

  it("invalidates season production and market values after a manual sync", async () => {
    const remove = vi.fn().mockResolvedValue(true);
    globalThis.caches = { delete: remove };
    await clearSleeperAnalysisCache();
    expect(remove).toHaveBeenCalledWith("sleeper-stats-v1");
    expect(remove).toHaveBeenCalledWith("sleeper-market-v1");
  });
});
