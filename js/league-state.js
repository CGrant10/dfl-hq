import { db } from "./supabase.js";
import { loadNflState } from "./sleeper.js";

const TTL = 2 * 60 * 1000;
let cached = null;
let pending = null;

export function deriveLeagueState({ nfl = {}, config = {}, now = new Date() } = {}) {
  const season = Number(nfl.season) || now.getFullYear();
  const currentWeek = Math.max(1, Math.min(18, Number(nfl.week) || 1));
  const day = now.getDay();
  const completedWeek = Math.max(0, currentWeek - 1);
  /* The report is a receipt, not a one-day special. Once Sleeper advances,
     keep the last completed week on Home until the next one replaces it. */
  const reportWeek = Math.max(1, completedWeek);
  const phase = day === 2 || day === 3 ? "preview" : day === 4 ? "opening" : day === 0 || day === 1 ? "live" : "preview";
  const syncedAt = config.last_synced_at || null;
  const syncAgeMs = syncedAt ? Math.max(0, now.getTime() - Date.parse(syncedAt)) : Infinity;
  return {
    season,
    currentWeek,
    completedWeek,
    rankingsWeek: completedWeek,
    reportWeek,
    phase,
    syncedAt,
    syncNote: config.last_sync_note || "",
    syncFresh: syncAgeMs <= 6 * 60 * 60 * 1000,
    syncAgeMs,
    source: "Sleeper",
  };
}

export async function loadLeagueState({ force = false, now = new Date() } = {}) {
  if (!force && cached && Date.now() - cached.fetchedAt < TTL) return cached.value;
  if (!force && pending) return pending;
  pending = Promise.all([
    loadNflState().catch(() => ({ data: null, fetchedAt: 0, stale: true })),
    Promise.resolve(db().from("sleeper_config")
      .select("last_synced_at,last_sync_note,last_auto_checked_at,last_auto_error")
      .eq("id", 1).maybeSingle()).catch(() => ({ data: null })),
  ]).then(([nfl, config]) => {
    const value = deriveLeagueState({ nfl: nfl?.data || {}, config: config?.data || {}, now });
    cached = { value, fetchedAt: Date.now() };
    return value;
  }).finally(() => { pending = null; });
  return pending;
}

export function clearLeagueStateCache() {
  cached = null;
  pending = null;
}

globalThis.addEventListener?.("dfl:quick-sync-complete", clearLeagueStateCache);
