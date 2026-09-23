// Commissioner-only current-season sync, reachable from the global More sheet.
// It deliberately calls the same syncSleeper() pipeline as Admin → Sleeper so
// roster writes, trade alerts and analyzer-cache invalidation cannot drift.

import { ACCESS_EVENT, db, hasPermission } from "./supabase.js";
import { syncSleeper } from "./sync.js";
import { esc, toast } from "./ui.js";

let mountedHost = null;
let activeSync = null;
let paintToken = 0;

const timeLabel = value => {
  const at = Date.parse(value || "");
  if (!Number.isFinite(at)) return "Never synced";
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (minutes < 1) return "Synced just now";
  if (minutes < 60) return `Synced ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `Synced ${hours}h ago` : `Last sync ${new Date(at).toLocaleDateString()}`;
};

export async function readQuickSyncConfig(database = db()) {
  const { data, error } = await database.from("sleeper_config")
    .select("sleeper_league_id,last_synced_at,last_sync_note").eq("id", 1).single();
  if (error) throw error;
  return data || {};
}

export async function runQuickSleeperSync({ database = db(), sync = syncSleeper, log = () => {} } = {}) {
  if (!hasPermission("sleeper")) throw new Error("Sleeper Sync permission required");
  const config = await readQuickSyncConfig(database);
  const leagueId = String(config.sleeper_league_id || "").trim();
  if (!leagueId) throw new Error("Set the Sleeper league ID in Admin first");
  return sync(leagueId, log, { includeHistory: false });
}

function markup(config) {
  return `<div class="quick-sleeper-copy"><small>COMMISSIONER QUICK ACTION</small><strong>Sleeper sync</strong><span data-quick-sync-status>${esc(timeLabel(config.last_synced_at))}</span></div>
    <button type="button" data-quick-sleeper-sync><i aria-hidden="true">↻</i><span>Sync now</span></button>`;
}

export async function refreshQuickSleeperSync() {
  const host = mountedHost;
  if (!host) return;
  if (!hasPermission("sleeper")) {
    host.hidden = true;
    host.replaceChildren();
    return;
  }
  host.hidden = false;
  if (activeSync) return;
  const token = ++paintToken;
  try {
    const config = await readQuickSyncConfig();
    if (token !== paintToken || host !== mountedHost) return;
    host.innerHTML = markup(config);
  } catch (error) {
    if (token !== paintToken || host !== mountedHost) return;
    host.innerHTML = markup({});
    const status = host.querySelector("[data-quick-sync-status]");
    if (status) status.textContent = error?.message || "Sync status unavailable";
  }
}

async function start() {
  const host = mountedHost;
  const button = host?.querySelector("[data-quick-sleeper-sync]");
  const status = host?.querySelector("[data-quick-sync-status]");
  if (!host || !button || activeSync) return;
  button.disabled = true;
  button.classList.add("is-syncing");
  button.setAttribute("aria-busy", "true");
  button.querySelector("span").textContent = "Syncing…";
  const log = message => { if (status) status.textContent = message; };
  activeSync = runQuickSleeperSync({ log });
  try {
    const { counts } = await activeSync;
    toast(`Sleeper synced · ${counts.rosters} rosters · ${counts.matchups} matchups`);
    window.dispatchEvent(new CustomEvent("dfl:quick-sync-complete", { detail: { counts } }));
  } catch (error) {
    if (status) status.textContent = error?.message || "Sleeper sync failed";
    toast(error?.message || "Sleeper sync failed", true);
  } finally {
    activeSync = null;
    if (host === mountedHost && host.isConnected) void refreshQuickSleeperSync();
  }
}

export function mountQuickSleeperSync(host = document.getElementById("quick-sleeper-sync")) {
  if (!host) return;
  mountedHost = host;
  if (!host.dataset.quickSyncWired) {
    host.dataset.quickSyncWired = "1";
    host.addEventListener("click", event => {
      if (event.target.closest("[data-quick-sleeper-sync]")) void start();
    });
    window.addEventListener(ACCESS_EVENT, () => { void refreshQuickSleeperSync(); });
  }
  void refreshQuickSleeperSync();
}
