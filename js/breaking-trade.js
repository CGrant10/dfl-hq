import { hasPermission } from "./supabase.js";
import { endBreakingTradeCoverage, loadActiveTradeAlert } from "./trade-alerts.js";
import { esc, toast } from "./ui.js";

let host = null;
let timer = 0;
let currentId = null;
let loading = false;
const excludedRoute = () => /^#\/(golf|broadcast|arena(?:-|\?|$))/.test(location.hash || "");

const names = alert => (alert?.teams || []).map(team => team.teamName).filter(Boolean);

function headline(alert) {
  if (alert?.headline) return alert.headline;
  const clubs = names(alert);
  if (clubs.length > 1) return `${clubs[0]} ↔ ${clubs[1]}`;
  return clubs[0] || "A deal just hit the wire";
}

function verdict(alert) {
  if (alert?.balanced) return "DFLyzer calls it balanced";
  if (alert?.winner) return `${alert.winner} has the early edge`;
  return "DFLyzer review in progress";
}

function markup(alert) {
  const commissioner = hasPermission("sleeper");
  return `<div class="breaking-trade-beacon" aria-hidden="true"><i></i><i></i></div>
    <a class="breaking-trade-copy" href="${esc(alert.href || "#/trade")}">
      <small><b>BREAKING</b><span>TRADE ALERT${alert.week ? ` · WEEK ${esc(alert.week)}` : ""}</span></small>
      <strong>${esc(headline(alert))}</strong>
      <em>${esc(verdict(alert))} · Tap for the full receipt</em>
    </a>
    ${commissioner ? `<button type="button" data-end-trade-coverage="${esc(alert.id)}">End coverage</button>` : ""}`;
}

function hide() {
  if (!host) return;
  host.hidden = true;
  host.replaceChildren();
  document.body.classList.remove("has-breaking-trade");
  currentId = null;
}

async function refresh({ force = false } = {}) {
  if (!host || loading || document.hidden) return;
  if (excludedRoute()) return hide();
  loading = true;
  try {
    const alert = await loadActiveTradeAlert({ hours: 24 * 30 });
    if (!alert?.breakingActive) return hide();
    if (!force && String(alert.id) === String(currentId) && !host.hidden) return;
    currentId = alert.id;
    host.innerHTML = markup(alert);
    host.hidden = false;
    document.body.classList.add("has-breaking-trade");
  } catch (error) {
    console.warn("breaking trade coverage unavailable", error);
  } finally {
    loading = false;
  }
}

export function mountBreakingTradeCoverage() {
  if (host) return;
  host = document.createElement("aside");
  host.className = "breaking-trade";
  host.setAttribute("aria-label", "Breaking trade coverage");
  host.hidden = true;
  const topbar = document.querySelector(".topbar");
  topbar?.insertAdjacentElement("afterend", host);

  host.addEventListener("click", async event => {
    const button = event.target.closest("[data-end-trade-coverage]");
    if (!button) return;
    button.disabled = true;
    button.textContent = "Ending…";
    try {
      await endBreakingTradeCoverage(button.dataset.endTradeCoverage);
      hide();
      toast("Breaking trade coverage ended · receipt archived");
    } catch (error) {
      button.disabled = false;
      button.textContent = "End coverage";
      toast(error.message || "Could not end breaking coverage", true);
    }
  });

  window.addEventListener("dfl:quick-sync-complete", () => refresh({ force: true }));
  window.addEventListener("dfl:trade-coverage-changed", () => refresh({ force: true }));
  window.addEventListener("hashchange", () => refresh({ force: true }));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) void refresh({ force: true }); });
  void refresh({ force: true });
  timer = window.setInterval(() => void refresh(), 60_000);
}

export function stopBreakingTradeCoverage() {
  clearInterval(timer);
  timer = 0;
  hide();
  host?.remove();
  host = null;
}
