import { currentMember } from "../members.js";
import { esc, toast } from "../ui.js";
import { DEFAULT_NOTIFICATION_CATEGORIES, NOTIFICATION_CATEGORIES, NOTIFICATION_PRESETS, timeAgo } from "../notification-core.js";
import { clearInbox, disablePush, dismissNotifications, enablePush, inbox, markRead, pushCapability, pushPreferences, saveSubscription, testNotification } from "../notifications.js";
import { ensureStylesheet } from "../lazy-css.js";

const labelFor = id => NOTIFICATION_CATEGORIES.find(([key]) => key === id)?.[1] || "League";

function settingsMarkup(state) {
  const capability = pushCapability();
  const active = state?.enabled && !!state?.subscription;
  const selected = new Set(state?.categories || DEFAULT_NOTIFICATION_CATEGORIES);
  const delivery = active ? state.failureCount > 0
    ? `<p class="notify-delivery is-warn"><b>Needs attention</b><span>The last push failed. Send a test to refresh this phone's connection.</span></p>`
    : state.lastSuccessAt
      ? `<p class="notify-delivery is-good"><b>Delivery confirmed</b><span>${esc(timeAgo(state.lastSuccessAt))} · ${esc(state.deviceLabel || "this device")}</span></p>`
      : `<p class="notify-delivery"><b>Ready on this device</b><span>${esc(state.deviceLabel || "This phone")} · waiting for its first delivered alert</span></p>` : "";
  return `<section class="notify-setup">
    <div class="notify-setup-copy">
      <small>THIS DEVICE</small>
      <h2>${active ? "Notifications are on" : "Never miss league business"}</h2>
      <p>${active ? "This phone can receive alerts even when DFL HQ is closed." : esc(capability.reason || "Enable lock-screen alerts for this device. Other phones keep their own setting.")}</p>
    </div>
    ${delivery}
    ${capability.installRequired ? `<div class="notify-install"><strong>Install first</strong><span>Share <b>→</b> Add to Home Screen, then open DFL HQ from its icon.</span></div>` : ""}
    ${capability.supported ? `<div class="notify-actions">
      <button class="btn ${active ? "ghost" : ""}" type="button" data-push-toggle="${active ? "off" : "on"}">${active ? "Turn off on this device" : "Enable notifications"}</button>
      ${active ? `<button class="btn ghost" type="button" data-push-test>Send a test</button>` : ""}
    </div>
    ${active ? `<p class="muted tiny notify-test-hint">A test arrives after five seconds. Lock the phone or switch to another app before it does &mdash; Android will not interrupt you with a banner for the app you are already looking at.</p>` : ""}` : ""}
    ${active ? `<fieldset class="notify-categories"><legend>What should reach this phone?</legend>
      <div class="notify-presets"><button type="button" data-notify-preset="essential">Essential</button><button type="button" data-notify-preset="gameday">Game day</button><button type="button" data-notify-preset="all">Everything</button></div>
      ${NOTIFICATION_CATEGORIES.map(([id, label, description]) => `<label><input type="checkbox" value="${id}" ${selected.has(id) ? "checked" : ""}><span><strong>${esc(label)}</strong><small>${esc(description || "")}</small></span></label>`).join("")}
    </fieldset>` : ""}
  </section>`;
}

function inboxMarkup(rows) {
  if (!rows.length) return `<div class="notify-empty"><strong>You’re all caught up.</strong><span>Commissioner notes, trades, polls and reminders will collect here.</span></div>`;
  return `<div class="notification-list">${rows.map(row => `
    <div class="notification-item">
      <a class="notification-row ${row.is_read ? "" : "is-unread"}" href="${esc(row.target_url || "#/home")}" data-notification-id="${row.id}">
        <span class="notification-dot" aria-hidden="true"></span>
        <span class="notification-copy"><small>${esc(labelFor(row.category))} · ${esc(timeAgo(row.created_at))}</small><strong>${esc(row.title)}</strong><span>${esc(row.body)}</span></span>
        <span class="notification-arrow" aria-hidden="true">›</span>
      </a>
      <button type="button" class="notification-delete" data-delete-notification="${row.id}" aria-label="Delete ${esc(row.title)}">&times;</button>
    </div>`).join("")}</div>`;
}

export async function render(view) {
  await ensureStylesheet("css/notifications.css");
  const member = currentMember();
  if (!member) {
    view.innerHTML = `<h1>Notifications</h1><div class="card"><div class="card-body">Pick your member identity first.</div></div>`;
    return;
  }
  let rows = [], preferences = null, deviceError = "";
  try {
    /* Preferences may repair an older device enrollment. A device setup
       failure should not hide the member's existing inbox. */
    try { preferences = await pushPreferences(); }
    catch { deviceError = "Device notification settings are unavailable. Your inbox is still here; check your connection and try again."; }
    rows = await inbox();
  } catch (err) {
    view.innerHTML = `<h1>Notifications</h1><div class="card"><div class="card-body"><p>We could not load your inbox. Check your connection and try again.</p><button class="btn" type="button" data-retry-inbox>Retry</button></div></div>`;
    view.querySelector("[data-retry-inbox]")?.addEventListener("click", () => render(view));
    return;
  }
  view.innerHTML = `<header class="notification-head"><div><small>DFL HQ</small><h1>Notifications</h1><p>${esc(member.display_name)} · your league inbox</p></div><div class="notification-head-actions">${rows.some(r => !r.is_read) ? `<button class="btn ghost small" type="button" data-read-all>Mark all read</button>` : ""}${rows.length ? `<button class="btn ghost small" type="button" data-clear-all>Clear all</button>` : ""}</div></header>${deviceError ? `<p class="card-body" role="status">${esc(deviceError)}</p>` : ""}${settingsMarkup(preferences)}<section class="notification-inbox"><div class="notification-section-title"><h2>Inbox</h2><span>${rows.length} recent</span></div>${inboxMarkup(rows)}</section>`;

  view.querySelector("[data-push-toggle]")?.addEventListener("click", async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      if (btn.dataset.pushToggle === "off") await disablePush();
      else await enablePush();
      toast(btn.dataset.pushToggle === "off" ? "Notifications turned off on this device" : "Notifications enabled on this device");
      render(view);
    } catch (err) { toast(err.message || "Could not change notifications", true); btn.disabled = false; }
  });

  view.querySelector("[data-push-test]")?.addEventListener("click", async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    let left = 5;
    btn.textContent = `Sending in ${left}…`;
    const tick = setInterval(() => { left -= 1; if (left > 0) btn.textContent = `Sending in ${left}…`; }, 1000);
    try {
      await testNotification(5000);
      toast("Test sent to this device");
    } catch (err) { toast(err.message || "Could not send a test", true); }
    finally { clearInterval(tick); btn.textContent = "Send a test"; btn.disabled = false; }
  });

  view.querySelector(".notify-categories")?.addEventListener("change", async e => {
    const box = e.target.closest('input[type="checkbox"]');
    if (!box || !preferences?.subscription) return;
    const categories = [...view.querySelectorAll('.notify-categories input:checked')].map(input => input.value);
    try { await saveSubscription(preferences.subscription, categories); toast("Notification preferences saved"); }
    catch (err) { toast(err.message || "Could not save preferences", true); }
  });
  view.querySelectorAll("[data-notify-preset]").forEach(button => button.addEventListener("click", async () => {
    if (!preferences?.subscription) return;
    const categories = NOTIFICATION_PRESETS[button.dataset.notifyPreset] || DEFAULT_NOTIFICATION_CATEGORIES;
    view.querySelectorAll('.notify-categories input[type="checkbox"]').forEach(input => { input.checked = categories.includes(input.value); });
    button.disabled = true;
    try { await saveSubscription(preferences.subscription, categories); toast(`${button.textContent} notifications selected`); }
    catch (err) { toast(err.message || "Could not save preferences", true); }
    finally { button.disabled = false; }
  }));

  view.querySelector("[data-read-all]")?.addEventListener("click", async e => {
    e.currentTarget.disabled = true;
    try { await markRead(rows.filter(r => !r.is_read).map(r => r.id)); render(view); }
    catch (err) { toast(err.message || "Could not mark notifications read", true); e.currentTarget.disabled = false; }
  });

  view.querySelector("[data-clear-all]")?.addEventListener("click", async e => {
    if (!confirm(`Clear all ${rows.length} notification${rows.length === 1 ? "" : "s"} from your inbox? This only clears your copy.`)) return;
    e.currentTarget.disabled = true;
    try { await clearInbox(); render(view); }
    catch (err) { toast(err.message || "Could not clear your inbox", true); e.currentTarget.disabled = false; }
  });

  view.querySelectorAll("[data-delete-notification]").forEach(button => button.addEventListener("click", async e => {
    e.preventDefault();
    e.stopPropagation();
    button.disabled = true;
    try { await dismissNotifications([Number(button.dataset.deleteNotification)]); render(view); }
    catch (err) { toast(err.message || "Could not delete that notification", true); button.disabled = false; }
  }));

  view.querySelectorAll("[data-notification-id]").forEach(link => link.addEventListener("click", () => {
    void markRead([Number(link.dataset.notificationId)]).catch(() => {});
  }));
}
