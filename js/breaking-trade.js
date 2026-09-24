import { ACCESS_EVENT, hasPermission } from "./supabase.js";
import { endBreakingTradeCoverage, loadActiveTradeAlert } from "./trade-alerts.js";
import { esc, toast } from "./ui.js";

let host = null;
let timer = 0;
let currentId = null;
let currentAlert = null;
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
    ${commissioner ? `<button type="button" data-end-trade-coverage="${esc(alert.id)}">End alert</button>` : ""}`;
}

function hide() {
  if (!host) return;
  host.hidden = true;
  host.replaceChildren();
  document.body.classList.remove("has-breaking-trade");
  currentId = null;
  currentAlert = null;
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
    currentAlert = alert;
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
    /* The banner can survive while the commissioner/member transition is in
       flight. Re-check the live gate at the action boundary so a stale node
       never behaves like commissioner UI. Postgres enforces this again. */
    if (!hasPermission("sleeper")) {
      toast("Only a commissioner can end a trade alert", true);
      void refresh({ force: true });
      return;
    }
    button.disabled = true;
    button.textContent = "Ending…";
    try {
      await endBreakingTradeCoverage(button.dataset.endTradeCoverage);
      hide();
      toast("Breaking trade coverage ended · receipt archived");
    } catch (error) {
      button.disabled = false;
      button.textContent = "End alert";
      toast(error.message || "Could not end breaking coverage", true);
    }
  });

  window.addEventListener("dfl:quick-sync-complete", () => refresh({ force: true }));
  window.addEventListener("dfl:trade-coverage-changed", () => refresh({ force: true }));
  /* Member Preview changes the permission gates without navigating. Redraw the
     existing alert immediately so its commissioner-only action follows the
     top-bar switch in both directions. */
  window.addEventListener(ACCESS_EVENT, () => {
    /* The switch commits while the glitch is covering the page. Repaint from
       the alert already in memory so the button changes inside that same
       frame; a network round-trip here made the banner update after the
       transition had visibly finished. */
    if (currentAlert && !host.hidden) host.innerHTML = markup(currentAlert);
    else void refresh({ force: true });
  });
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
