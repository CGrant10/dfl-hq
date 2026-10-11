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
    expect(remove).toHaveBeenCalledWith("sleeper-weekly-v1");
    expect(remove).toHaveBeenCalledWith("sleeper-trending-v1");
    expect(remove).toHaveBeenCalledWith("sleeper-players-v3");
  });

  it("shares an identical in-flight Sleeper payload", async () => {
    const cache = { match: vi.fn().mockResolvedValue(null), put: vi.fn().mockResolvedValue(undefined) };
    globalThis.caches = { open: vi.fn().mockResolvedValue(cache) };
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ "1": { pts_ppr: 10 } }), { status: 200 }));

    const [first, second] = await Promise.all([loadSeasonStats(2099), loadSeasonStats(2099)]);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(first.data).toEqual(second.data);
  });
  it('revalidates browser HTTP caches as well as stored stats during an explicit fresh check',async()=>{
    const cached=new Response(JSON.stringify({x:{rec:10}}),{headers:{'x-fetched-at':String(Date.now())}});
    const cache={match:vi.fn().mockResolvedValue(cached),put:vi.fn().mockResolvedValue(undefined)};
    globalThis.caches={open:vi.fn().mockResolvedValue(cache)};
    globalThis.fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({x:{rec:12}})));
    expect((await loadSeasonStats(2098,{maxAgeMs:0})).data.x.rec).toBe(12);
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/regular/2098'),{cache:'no-cache'});
  });
});
