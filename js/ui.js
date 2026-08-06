// =====================================================================
// ui.js - little helpers shared by every page
// =====================================================================

/** Escape text before dropping it into HTML. Always use this on user data. */
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/** "Sat, Aug 30, 2026" */
export function fmtDate(value) {
  if (!value) return "";
  const d = new Date(String(value).length === 10 ? value + "T12:00:00" : value);
  if (isNaN(d)) return String(value);
  return d.toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

/** "3 days away" / "today" / "2 weeks ago" */
export function relDate(value) {
  if (!value) return "";
  const d = new Date(String(value).length === 10 ? value + "T12:00:00" : value);
  if (isNaN(d)) return "";
  const days = Math.round((d - new Date()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return days < 14 ? `in ${days} days` : `in ${Math.round(days / 7)} weeks`;
  const ago = -days;
  return ago < 14 ? `${ago} days ago` : `${Math.round(ago / 7)} weeks ago`;
}

/** Short "Aug 6" style date used on announcement cards. */
export function fmtShort(value) {
  const d = new Date(value);
  if (isNaN(d)) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "$1,200" - drops the cents unless there are any. */
export function money(value) {
  const n = Number(value || 0);
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** A grey box for "nothing here yet". */
export function empty(message) {
  return `<div class="empty">${esc(message)}</div>`;
}

/** Standard loading placeholder. */
export function loading() {
  return `<div class="empty">Loading…</div>`;
}

/** Friendly error box; logs the real error for you. */
export function errorBox(err) {
  console.error(err);
  const msg = err?.message || String(err);
  return `<div class="empty" style="border-color:#6b2b23;color:#f0a79b">
    Could not load data.<br><span class="tiny">${esc(msg)}</span>
  </div>`;
}

let toastTimer = null;
export function toast(message, bad = false) {
  const el = document.getElementById("toast");
  // Never let a missing element break the caller: toast() is routinely the
  // last line of a save, and throwing here would skip the re-render.
  if (!el) { console.log(message); return; }
  el.textContent = message;
  el.classList.toggle("bad", !!bad);
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2600);
}

/** Turn ["a","b"] or a JSON string into a real array. */
export function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try { const p = JSON.parse(value); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

/** Group rows into a Map keyed by the value of `key`. */
export function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const k = typeof key === "function" ? key(row) : row[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
}
