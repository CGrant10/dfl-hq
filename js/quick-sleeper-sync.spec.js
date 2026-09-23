import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasPermission: vi.fn(() => true),
  sync: vi.fn(async () => ({ counts: { rosters: 12, matchups: 6 } })),
}));

vi.mock("./supabase.js", () => ({
  ACCESS_EVENT: "dfl:access-change",
  db: vi.fn(),
  hasPermission: mocks.hasPermission,
}));
vi.mock("./sync.js", () => ({ syncSleeper: mocks.sync }));
vi.mock("./ui.js", () => ({ esc: value => String(value), toast: vi.fn() }));

import { readQuickSyncConfig, runQuickSleeperSync } from "./quick-sleeper-sync.js";

function database(data = { sleeper_league_id: "league-1", last_synced_at: null }, error = null) {
  const single = vi.fn(async () => ({ data, error }));
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from }, from, select, eq, single };
}

describe("commissioner quick Sleeper sync", () => {
  beforeEach(() => {
    mocks.hasPermission.mockReset().mockReturnValue(true);
    mocks.sync.mockReset().mockResolvedValue({ counts: { rosters: 12, matchups: 6 } });
  });

  it("reads the shared Sleeper configuration", async () => {
    const store = database();
    await expect(readQuickSyncConfig(store.client)).resolves.toMatchObject({ sleeper_league_id: "league-1" });
    expect(store.from).toHaveBeenCalledWith("sleeper_config");
    expect(store.select).toHaveBeenCalledWith("sleeper_league_id,last_synced_at,last_sync_note");
    expect(store.eq).toHaveBeenCalledWith("id", 1);
  });

  it("runs the existing current-season sync pipeline", async () => {
    const store = database();
    const log = vi.fn();
    await runQuickSleeperSync({ database: store.client, sync: mocks.sync, log });
    expect(mocks.sync).toHaveBeenCalledWith("league-1", log, { includeHistory: false });
  });

  it("blocks users without Sleeper permission before reading or writing", async () => {
    mocks.hasPermission.mockReturnValue(false);
    const store = database();
    await expect(runQuickSleeperSync({ database: store.client, sync: mocks.sync })).rejects.toThrow("permission required");
    expect(store.from).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it("points commissioners to Admin when no league is configured", async () => {
    const store = database({ sleeper_league_id: "" });
    await expect(runQuickSleeperSync({ database: store.client, sync: mocks.sync })).rejects.toThrow("Set the Sleeper league ID");
    expect(mocks.sync).not.toHaveBeenCalled();
  });
});
