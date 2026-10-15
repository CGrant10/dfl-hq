import { ACCESS_EVENT, hasPermission } from "./supabase.js";
import { endBreakingTradeCoverage, loadActiveTradeAlert } from "./trade-alerts.js";
import { endCustomBreakingAlert, loadActiveCustomAlert } from "./custom-alerts.js";
import { esc, toast } from "./ui.js";
import { mountTradeAlertDock } from './trade-alert-dock.js';

let host = null;
let timer = 0;
let currentId = null;
let currentAlert = null;
let announcedId = null;
let loading = false;
let scrollDock = null;
let generation=0;
const listeners=[];
const listen=(target,name,callback)=>{target.addEventListener(name,callback);listeners.push(()=>target.removeEventListener(name,callback))};
const excludedRoute = () => !/^#\/home(?:\?|$)/.test(location.hash || "");
const dismissed = alert => {
  try { return localStorage.getItem("dfl.alert.dismissed") === String(alert?.id); }
  catch { return false; }
};

const names = alert => (alert?.teams || []).map(team => team.teamName).filter(Boolean);

function headline(alert) {
  if (alert?.kind === "custom") return alert.title || "League alert";
  if (alert?.headline) return alert.headline;
  const clubs = names(alert);
  if (clubs.length > 1) return `${clubs[0]} ↔ ${clubs[1]}`;
  return clubs[0] || "A deal just hit the wire";
}

function verdict(alert) {
  if (alert?.kind === "custom") return alert.message || "Tap to open";
  if (alert?.balanced) return "DFLyzer calls it balanced";
  if (alert?.winner) return `${alert.winner} has the early edge`;
  return alert.fairness==null?"Trade receipt ready":`${alert.fairness}% ${(alert.balanceLabel||'Value balance').toLowerCase()}`;
}

function markup(alert) {
  const commissioner = hasPermission("sleeper");
  const custom = alert?.kind === "custom";
  return `<div class="breaking-trade-beacon" aria-hidden="true"><i></i><i></i></div>
    <a class="breaking-trade-copy" href="${esc(alert.href || "#/trade")}">
      <small><b>BREAKING</b><span>${custom ? esc(alert.label || "LEAGUE ALERT") : `TRADE ALERT${alert.week ? ` · WEEK ${esc(alert.week)}` : ""}`}</span></small>
      <strong>${esc(headline(alert))}</strong>
      <em>${esc(verdict(alert))}${custom ? "" : " · Tap for the full receipt"}</em>
    </a>
    <button type="button" class="breaking-trade-dismiss" data-dismiss-alert aria-label="Dismiss this alert">×</button>
    ${commissioner ? `<button type="button" data-end-trade-coverage="${esc(alert.id)}" data-alert-kind="${custom ? "custom" : "trade"}" data-alert-raw-id="${esc(alert.rawId || alert.id)}">End alert</button>` : ""}`;
}

function compactMarkup(alert){
 const title=alert.kind==='custom'?headline(alert):names(alert).join(' ↔ ')||headline(alert);
 return `<a class="breaking-trade-dock-copy" href="${esc(alert.href||'#/trade')}" aria-label="${esc(`${title}. ${verdict(alert)}. Open ${alert.kind==='custom'?'alert':'trade receipt'}`)}"><span class="breaking-trade-dock-dot" aria-hidden="true"></span><span><small>${alert.kind==='custom'?'LEAGUE ALERT':'TRADE'}${alert.week?` · WEEK ${esc(alert.week)}`:''}</small><strong>${esc(title)}</strong></span>${alert.kind!=='custom'&&alert.fairness!=null?`<b>${esc(alert.fairness)}%</b>`:''}</a><button type="button" data-dismiss-alert aria-label="Dismiss this alert">×</button>`;
}

function hide() {
  if (!host) return;
  host.hidden = true;
  host.replaceChildren();
  scrollDock?.update('');
  document.body.classList.remove("has-breaking-trade");
  currentId = null;
  currentAlert = null;
}

async function refresh({ force = false } = {}) {
  if (!host) return;
  if (excludedRoute()) return hide();
  if (loading || document.hidden) return;
  const mine=generation;
  loading = true;
  try {
    const candidates = await Promise.all([
      loadActiveTradeAlert({ hours: 24 * 30 }).catch(() => null),
      loadActiveCustomAlert().catch(() => null),
    ]);
    if(mine!==generation||!host)return;
    const alert = candidates.filter(Boolean).sort((a, b) => Date.parse(b.breakingStartedAt || b.occurredAt || 0)
      - Date.parse(a.breakingStartedAt || a.occurredAt || 0))[0] || null;
    if (excludedRoute() || !alert?.breakingActive || dismissed(alert)) return hide();
    if (!force && String(alert.id) === String(currentId) && !host.hidden) return;
    currentId = alert.id;
    currentAlert = alert;
    host.innerHTML = markup(alert);
    scrollDock?.update(compactMarkup(alert));
    host.hidden = false;
    document.body.classList.add("has-breaking-trade");
    if (String(announcedId) !== String(alert.id)) {
      announcedId = alert.id;
      window.dispatchEvent(new CustomEvent("dfl:moment", { detail: { kind: "alert", source: alert.kind === "custom" ? "custom-alert" : "trade" } }));
    }
  } catch (error) {
    console.warn("breaking trade coverage unavailable", error);
  } finally {
    if(mine===generation)loading = false;
  }
}

export function mountBreakingTradeCoverage() {
  if (host) return;
  generation++;
  host = document.createElement("aside");
  host.className = "breaking-trade";
  host.setAttribute("aria-label", "Breaking trade coverage");
  host.hidden = true;
  const topbar = document.querySelector(".topbar");
  topbar?.insertAdjacentElement("afterend", host);

  const handleClick = async event => {
    if (event.target.closest("[data-dismiss-alert]")) {
      try { localStorage.setItem("dfl.alert.dismissed", String(currentId)); } catch {}
      hide();
      return;
    }
    const button = event.target.closest("[data-end-trade-coverage]");
    if (!button) return;
    /* The banner can survive while the commissioner/member transition is in
       flight. Re-check the live gate at the action boundary so a stale node
       never behaves like commissioner UI. Postgres enforces this again. */
    if (!hasPermission("sleeper")) {
      toast("Only a commissioner can end a breaking alert", true);
      void refresh({ force: true });
      return;
    }
    button.disabled = true;
    button.textContent = "Ending…";
    try {
      if (button.dataset.alertKind === "custom") await endCustomBreakingAlert(button.dataset.alertRawId);
      else await endBreakingTradeCoverage(button.dataset.alertRawId);
      hide();
      toast(button.dataset.alertKind === "custom" ? "Custom alert ended" : "Breaking trade coverage ended · receipt archived");
    } catch (error) {
      button.disabled = false;
      button.textContent = "End alert";
      toast(error.message || "Could not end breaking coverage", true);
    }
  };
  host.addEventListener('click',handleClick);
  scrollDock=mountTradeAlertDock(host,{onClick:handleClick});

  listen(window,"dfl:quick-sync-complete", () => refresh({ force: true }));
  listen(window,"dfl:trade-coverage-changed", () => refresh({ force: true }));
  /* Member Preview changes the permission gates without navigating. Redraw the
     existing alert immediately so its commissioner-only action follows the
     top-bar switch in both directions. */
  listen(window,ACCESS_EVENT, () => {
    /* The switch commits while the glitch is covering the page. Repaint from
       the alert already in memory so the button changes inside that same
       frame; a network round-trip here made the banner update after the
       transition had visibly finished. */
    if (currentAlert && !host.hidden) host.innerHTML = markup(currentAlert);
    else void refresh({ force: true });
  });
  listen(window,"hashchange", () => refresh({ force: true }));
  listen(document,"visibilitychange", () => { if (!document.hidden) void refresh({ force: true }); });
  void refresh({ force: true });
  timer = window.setInterval(() => void refresh(), 60_000);
}

export function stopBreakingTradeCoverage() {
  generation++;loading=false;
  for(const stop of listeners.splice(0))stop();
  clearInterval(timer);
  timer = 0;
  hide();
  host?.remove();
  scrollDock?.stop();scrollDock=null;
  host = null;
}
