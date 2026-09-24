// Anonymous real-user performance tracking. Loaded only after the first route.
import { APP_VERSION } from "./config.js";
import { db } from "./supabase.js";

const SAMPLE_RATE = 0.25;
const SESSION_KEY = "dfl.performance.sampled";
const MAX_EVENTS = 25;
const pending = new Map();
let flushTimer = 0;
let disabled = false;

function sampled() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored !== null) return stored === "1";
    const selected = Math.random() < SAMPLE_RATE;
    sessionStorage.setItem(SESSION_KEY, selected ? "1" : "0");
    return selected;
  } catch {
    return Math.random() < SAMPLE_RATE;
  }
}

function deviceClass() {
  const width = Math.min(screen.width || innerWidth, screen.height || innerHeight);
  if (width <= 600) return "phone";
  if (width <= 1024) return "tablet";
  return "desktop";
}

function networkClass() {
  const type = navigator.connection?.effectiveType;
  return ["slow-2g", "2g", "3g", "4g"].includes(type) ? type : "wifi-or-unknown";
}

function safeRoute(route) {
  const value = String(route || "app").toLowerCase();
  return /^[a-z0-9-]{1,32}$/.test(value) ? value : "app";
}

function scheduleFlush() {
  clearTimeout(flushTimer);
  flushTimer = window.setTimeout(flush, 8000);
}

function record(metric, value, unit = "ms", route = "app") {
  if (disabled || !Number.isFinite(value) || value < 0) return;
  const item = {
    metric,
    value: Number(value.toFixed(unit === "score" ? 4 : 1)),
    unit,
    route: safeRoute(route),
    version: APP_VERSION,
    device: deviceClass(),
    network: networkClass(),
  };
  pending.set(`${item.metric}:${item.route}`, item);
  if (pending.size >= MAX_EVENTS) void flush();
  else scheduleFlush();
}

async function flush() {
  clearTimeout(flushTimer);
  flushTimer = 0;
  if (disabled || !pending.size) return;
  const batch = [...pending.values()].slice(0, MAX_EVENTS);
  batch.forEach(item => pending.delete(`${item.metric}:${item.route}`));
  try {
    const { error } = await db().rpc("record_app_performance", { p_events: batch });
    if (error) {
      if (/record_app_performance|schema cache|does not exist/i.test(error.message || "")) disabled = true;
      else batch.forEach(item => pending.set(`${item.metric}:${item.route}`, item));
    }
  } catch {
    batch.forEach(item => pending.set(`${item.metric}:${item.route}`, item));
  }
}

function observe(type, handler, options = {}) {
  if (!globalThis.PerformanceObserver?.supportedEntryTypes?.includes(type)) return;
  try {
    const observer = new PerformanceObserver(list => handler(list.getEntries()));
    observer.observe({ type, buffered: true, ...options });
  } catch { /* older engines simply omit that metric */ }
}

export function startPerformanceTracking({ readyAt = performance.now(), route = "home" } = {}) {
  if (!sampled()) return;
  const nav = performance.getEntriesByType("navigation")[0];
  const origin = nav?.startTime || 0;
  record("app_ready", Math.max(0, readyAt - origin), "ms", safeRoute(route));

  let lcp = 0;
  observe("largest-contentful-paint", entries => {
    const last = entries.at(-1);
    lcp = Math.max(lcp, last?.renderTime || last?.loadTime || last?.startTime || 0);
    if (lcp) record("largest_contentful_paint", lcp, "ms", safeRoute(route));
  });

  let cls = 0;
  observe("layout-shift", entries => {
    for (const entry of entries) if (!entry.hadRecentInput) cls += entry.value || 0;
    record("cumulative_layout_shift", cls, "score", safeRoute(route));
  });

  let interaction = 0;
  observe("event", entries => {
    for (const entry of entries) interaction = Math.max(interaction, entry.duration || 0);
    if (interaction) record("interaction_latency", interaction, "ms", safeRoute(route));
  }, { durationThreshold: 40 });

  window.addEventListener("dfl:route-performance", event => {
    const detail = event.detail || {};
    record("route_render", Number(detail.duration) || 0, "ms", detail.route);
    record("route_module", Number(detail.moduleDuration) || 0, "ms", detail.route);
    record("route_content", Number(detail.renderDuration) || 0, "ms", detail.route);
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) void flush(); });
  window.addEventListener("pagehide", () => { void flush(); }, { once: true });
}
