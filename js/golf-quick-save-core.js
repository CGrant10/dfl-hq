const KEY = "dfl.golf.quick.pending.v1";
const read = storage => { try { const value = JSON.parse(storage.getItem(KEY) || "{}"); return value && typeof value === "object" ? value : {}; } catch { return {}; } };
const write = (value, storage) => storage.setItem(KEY, JSON.stringify(value));

export function mergeQuickGolfSave(entry, storage = localStorage) {
  const rows = read(storage), id = `${entry.playerId}:${entry.hole}`, old = rows[id] || {};
  const clearsScore = Object.prototype.hasOwnProperty.call(entry, "strokes") && entry.strokes == null;
  rows[id] = { ...old, ...entry, revision: `${Date.now()}-${Math.random()}`, patch: clearsScore ? {} : { ...(old.patch || {}), ...(entry.patch || {}) } };
  write(rows, storage);
  return Object.keys(rows).length;
}

export { KEY as QUICK_GOLF_SAVE_KEY, read as readQuickGolfSaves, write as writeQuickGolfSaves };
