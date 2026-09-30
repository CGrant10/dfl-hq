import { db } from "./supabase.js";
import { mergeQuickGolfSave, readQuickGolfSaves as read, writeQuickGolfSaves as write } from "./golf-quick-save-core.js";
let flushing = null;
const announce = (state, count) => window.dispatchEvent(new CustomEvent("dfl:golf-quick-save", { detail: { state, count } }));
export async function flushQuickGolfSaves(storage = localStorage) {
  if (flushing) return flushing;
  flushing = (async () => {
    const rows = read(storage), entries = Object.entries(rows);
    if (!entries.length) { announce("saved", 0); return { sent: 0, left: 0 }; }
    if (!navigator.onLine) { announce("offline", entries.length); return { sent: 0, left: entries.length }; }
    announce("saving", entries.length); let sent = 0;
    for (const [id, entry] of entries) {
      const query = entry.strokes == null && !Object.keys(entry.patch || {}).length
        ? db().from("golf_quick_scores").delete().eq("player_id", entry.playerId).eq("hole", entry.hole)
        : db().from("golf_quick_scores").upsert({ player_id: Number(entry.playerId), hole: Number(entry.hole), strokes: Number(entry.strokes), ...(entry.patch || {}), updated_at: new Date().toISOString() }, { onConflict: "player_id,hole" });
      const { error } = await query;
      if (error) { announce(navigator.onLine ? "error" : "offline", Object.keys(read(storage)).length); return { sent, left: Object.keys(read(storage)).length, error }; }
      const fresh = read(storage);
      if (fresh[id]?.revision === entry.revision) delete fresh[id];
      write(fresh, storage); sent += 1;
    }
    announce("saved", 0); return { sent, left: 0 };
  })().finally(() => { flushing = null; });
  return flushing;
}
export function queueQuickGolfSave(entry, storage = localStorage) { const count = mergeQuickGolfSave(entry, storage); announce(navigator.onLine ? "saving" : "offline", count); return flushQuickGolfSaves(storage); }
export { mergeQuickGolfSave } from "./golf-quick-save-core.js";
if (typeof window !== "undefined") window.addEventListener("online", () => { void flushQuickGolfSaves(); });
