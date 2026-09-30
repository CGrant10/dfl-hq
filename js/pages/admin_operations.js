import { db } from "../supabase.js";
import { endBreakingTradeCoverage, loadTradeAlerts, tradeAlertViewModel } from "../trade-alerts.js";
import { createCustomBreakingAlert, endCustomBreakingAlert, loadCustomAlerts } from "../custom-alerts.js";
import { esc, fmtWhen, toast } from "../ui.js";
import { runQuickSleeperSync } from "../quick-sleeper-sync.js";
import { nextSleeperSync } from "../sleeper-sync-schedule.js";
import { performanceFindings } from "../performance-findings.js";

const settled = promise => promise.then(value => ({ value }), error => ({ error }));
const countOf = result => Number(result?.value?.count) || 0;

function syncHealth(config) {
  const when = Date.parse(config?.last_synced_at || "");
  if (!when) return { tone: "bad", label: "Never synced", detail: "Run the current-season sync." };
  const age = Date.now() - when;
  if (age > 6 * 60 * 60 * 1000) return { tone: "warn", label: "Sync is stale", detail: fmtWhen(config.last_synced_at) };
  return { tone: "good", label: "Sleeper current", detail: fmtWhen(config.last_synced_at) };
}

function tradeRow(alert) {
  const teams = alert.teams.map(team => team.teamName).join(" ↔ ") || "Completed trade";
  const call = alert.balanced ? "Balanced" : alert.winner ? `${alert.winner} edge` : "Review needed";
  return `<article class="ops-trade-row">
    <a href="${esc(alert.href)}"><small>${alert.week ? `WEEK ${esc(alert.week)}` : "TRADE"}</small><strong>${esc(teams)}</strong><span>${esc(call)}</span></a>
    ${alert.breakingActive ? `<button class="btn ghost small" data-ops-end-trade="${esc(alert.id)}">End alert</button>` : `<em>Archived</em>`}
  </article>`;
}

function customRow(alert) {
  return `<article class="ops-trade-row">
    <a href="${esc(alert.href)}"><small>${esc(alert.label)}</small><strong>${esc(alert.title)}</strong><span>${esc(alert.message || "No supporting text")}</span></a>
    ${alert.breakingActive ? `<button class="btn ghost small" data-ops-end-custom="${esc(alert.rawId)}">End alert</button>` : `<em>Archived</em>`}
  </article>`;
}

export async function renderOperationsPanel(host) {
  host.innerHTML = `<div class="card"><div class="card-body muted">Checking league operations…</div></div>`;
  const [configResult, marketResult, operationsResult, scheduleResult, performanceResult, alertResult, customResult] = await Promise.all([
    settled(db().from("sleeper_config").select("last_synced_at,last_sync_note,last_auto_checked_at,last_auto_error,auto_sync_enabled").eq("id", 1).maybeSingle()),
    settled(db().from("sportsbook_markets").select("id", { count: "exact", head: true }).in("status", ["open", "locked"])),
    settled(db().rpc("commissioner_operations_health")),
    settled(db().rpc("sleeper_get_sync_schedule")),
    settled(db().rpc("app_performance_summary", { days_back: 14 })),
    settled(loadTradeAlerts({ limit: 20 })),
    settled(loadCustomAlerts({ limit: 10 })),
  ]);
  const config = configResult.value?.data || {};
  const health = syncHealth(config);
  const alerts = (alertResult.value || []).map(tradeAlertViewModel).filter(Boolean);
  const active = alerts.filter(alert => alert.breakingActive);
  const customAlerts = customResult.value || [];
  const activeCount = active.length + customAlerts.filter(alert => alert.breakingActive).length;
  const operations = operationsResult.value?.data || {};
  const pushDevices = Number(operations.push_devices) || 0;
  const pushFailures = Number(operations.push_failures) || 0;
  const memberReview = Number(operations.member_review) || 0;
  const unsettledTickets = Number(operations.unsettled_tickets) || 0;
  const schedule = scheduleResult.value?.data || {};
  const nextSync = schedule.enabled ? nextSleeperSync(schedule.slots || []) : null;
  const hotspots = performanceFindings(performanceResult.value?.data || []);

  host.innerHTML = `<div class="section-head ops-head"><div><h2>League operations</h2><p class="muted">Sync, alerts, notifications and open weekly jobs in one place.</p></div><a class="btn ghost small" href="#/notifications">Notification inbox</a></div>
    <div class="ops-command-bar"><button class="btn" type="button" data-ops-sync-now>↻ Sync Sleeper now</button><span>${nextSync ? `Next auto sync ${esc(nextSync.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }))}` : "No automatic sync scheduled"}</span></div>
    <div class="ops-status-grid">
      <a class="ops-status is-${health.tone}" href="#/admin"><small>LEAGUE DATA</small><strong>${esc(health.label)}</strong><span>${esc(health.detail)}</span></a>
      <a class="ops-status ${config.last_auto_error ? "is-bad" : "is-good"}" href="#/admin"><small>AUTO SYNC</small><strong>${config.auto_sync_enabled ? "Enabled" : "Paused"}</strong><span>${esc(config.last_auto_error || (config.last_auto_checked_at ? `Checked ${fmtWhen(config.last_auto_checked_at)}` : "No check recorded"))}</span></a>
      <a class="ops-status ${pushFailures ? "is-warn" : "is-good"}" href="#/notifications"><small>PUSH HEALTH</small><strong>${pushDevices}</strong><span>${pushFailures ? `${pushFailures} delivery failures recorded` : "Enabled devices healthy"}</span></a>
      <a class="ops-status ${unsettledTickets ? "is-warn" : "is-good"}" href="#/sportsbook"><small>SPORTSBOOK</small><strong>${unsettledTickets}</strong><span>Unsettled tickets · ${countOf(marketResult)} active markets</span></a>
      <a class="ops-status ${memberReview ? "is-warn" : "is-good"}" href="#/admin"><small>MEMBER REVIEW</small><strong>${memberReview}</strong><span>Inactive or unlinked profiles</span></a>
      <a class="ops-status ${hotspots.length ? "is-warn" : "is-good"}" href="#/admin" data-open-performance><small>PERFORMANCE</small><strong>${hotspots.length}</strong><span>${hotspots.length ? "Real-user hotspots" : "Within current targets"}</span></a>
    </div>
    <div class="section-head"><div><h2>Custom breaking alert</h2><p class="muted">Launch your own league-wide banner using the same breaking treatment.</p></div><span class="pill ${activeCount ? "red" : "grey"}">${activeCount} active</span></div>
    <form class="ops-alert-compose" data-ops-alert-form>
      <div><label for="ops-alert-label">Label</label><input id="ops-alert-label" maxlength="28" value="LEAGUE ALERT" placeholder="BREAKING"></div>
      <div class="ops-alert-wide"><label for="ops-alert-title">Headline</label><input id="ops-alert-title" maxlength="120" required placeholder="Your headline"></div>
      <div class="ops-alert-wide"><label for="ops-alert-message">Supporting text</label><textarea id="ops-alert-message" maxlength="240" rows="2" placeholder="Add the detail everyone should see"></textarea></div>
      <div><label for="ops-alert-target">Opens</label><select id="ops-alert-target"><option value="#/home">Home</option><option value="#/trade">Trade Analyzer</option><option value="#/facts">Facts</option><option value="#/fees">Fees</option><option value="#/polls">Polls</option><option value="#/notifications">Notifications</option></select></div>
      <label class="checkrow ops-alert-phone"><input type="checkbox" data-ops-alert-phone checked><span><strong>Send phone notification</strong><br><small class="muted">Uses each member's announcement preference.</small></span></label>
      <div class="row-end ops-alert-action"><button class="btn" type="submit">Launch alert</button></div>
    </form>
    ${customAlerts.length ? `<div class="ops-trade-list">${customAlerts.map(customRow).join("")}</div>` : ""}
    <div class="section-head"><div><h2>Breaking trade desk</h2><p class="muted">Completed trade coverage stays live until a commissioner ends it.</p></div></div>
    <div class="ops-trade-list">${alerts.length ? alerts.map(tradeRow).join("") : `<div class="empty">No completed trade receipts yet.</div>`}</div>
    <div class="section-head"><div><h2>Release health</h2><p class="muted">Real-user speed data remains under Performance; this desk is the fast operational check.</p></div><a class="btn ghost small" href="#/admin" data-open-performance>View performance</a></div>`;

  host.querySelectorAll("[data-ops-end-trade]").forEach(button => button.addEventListener("click", async () => {
    if (!confirm("End the breaking banner for this trade? The receipt will remain in Trade Analyzer.")) return;
    button.disabled = true;
    try {
      await endBreakingTradeCoverage(button.dataset.opsEndTrade);
      toast("Breaking coverage ended");
      await renderOperationsPanel(host);
    } catch (error) {
      button.disabled = false;
      toast(error.message || "Could not end coverage", true);
    }
  }));
  host.querySelector("[data-ops-sync-now]")?.addEventListener("click", async event => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Syncing…";
    try {
      const { counts } = await runQuickSleeperSync();
      toast(`Sleeper synced · ${counts.rosters} rosters`);
      window.dispatchEvent(new CustomEvent("dfl:quick-sync-complete", { detail: { counts } }));
      await renderOperationsPanel(host);
    } catch (error) {
      button.disabled = false;
      button.textContent = "↻ Sync Sleeper now";
      toast(error.message || "Sync failed", true);
    }
  });
  host.querySelectorAll("[data-ops-end-custom]").forEach(button => button.addEventListener("click", async () => {
    if (!confirm("End this custom breaking alert?")) return;
    button.disabled = true;
    try {
      await endCustomBreakingAlert(button.dataset.opsEndCustom);
      toast("Custom alert ended");
      await renderOperationsPanel(host);
    } catch (error) {
      button.disabled = false;
      toast(error.message || "Could not end custom alert", true);
    }
  }));
  host.querySelector("[data-ops-alert-form]")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Launching…";
    try {
      const result = await createCustomBreakingAlert({
        label: form.querySelector("#ops-alert-label").value,
        title: form.querySelector("#ops-alert-title").value,
        message: form.querySelector("#ops-alert-message").value,
        targetUrl: form.querySelector("#ops-alert-target").value,
        sendPhone: form.querySelector("[data-ops-alert-phone]").checked,
      });
      toast(result.notificationError ? "Banner launched · phone notification failed" : "Breaking alert launched", Boolean(result.notificationError));
      await renderOperationsPanel(host);
    } catch (error) {
      button.disabled = false;
      button.textContent = "Launch alert";
      toast(error.message || "Could not launch custom alert", true);
    }
  });
  host.querySelector("[data-open-performance]")?.addEventListener("click", event => {
    event.preventDefault();
    document.querySelector('#admin-tabs [data-section="performance"]')?.click();
  });
}
