import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSleeperAnalysisCache, loadSeasonStats } from "./sleeper.js";

describe("Sleeper analyzer cache", () => {
  const original = globalThis.caches;
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.caches = original; globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

  it("invalidates season production and market values after a manual sync", async () => {
    const remove = vi.fn().mockResolvedValue(true);
    globalThis.caches = { delete: remove };
    await clearSleeperAnalysisCache();
    expect(remove).toHaveBeenCalledWith("sleeper-stats-v1");
    expect(remove).toHaveBeenCalledWith("sleeper-market-v1");
  });

  it("shares an identical in-flight Sleeper payload", async () => {
    const cache = { match: vi.fn().mockResolvedValue(null), put: vi.fn().mockResolvedValue(undefined) };
    globalThis.caches = { open: vi.fn().mockResolvedValue(cache) };
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ "1": { pts_ppr: 10 } }), { status: 200 }));

    const [first, second] = await Promise.all([loadSeasonStats(2099), loadSeasonStats(2099)]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(first.data).toEqual(second.data);
  });
});
