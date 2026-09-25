import { db, edge, privilegedFunctionHeaders } from "./supabase.js";
import { currentMember } from "./members.js";

const missingSchema = error => ["42P01", "PGRST204", "PGRST205"].includes(error?.code)
  || /custom_breaking_alerts|end_custom_breaking_alert/i.test(error?.message || "")
    && /does not exist|schema cache|relation/i.test(error?.message || "");

const clean = (value, max) => String(value || "").trim().slice(0, max);
const safeTarget = value => /^#\/[a-z0-9?=&_/%.-]*$/i.test(String(value || "")) ? String(value) : "#/home";

export function customAlertViewModel(row) {
  if (!row?.id) return null;
  return {
    id: `custom-${row.id}`,
    rawId: Number(row.id),
    kind: "custom",
    label: clean(row.label || "BREAKING", 28).toUpperCase(),
    title: clean(row.title, 120),
    message: clean(row.message, 240),
    href: safeTarget(row.target_url),
    breakingActive: row.active !== false,
    breakingStartedAt: row.created_at || null,
    createdAt: row.created_at || null,
    notificationSent: Boolean(row.notification_message_id),
  };
}

export async function loadCustomAlerts({ limit = 20, activeOnly = false } = {}) {
  let query = db().from("custom_breaking_alerts").select("*")
    .order("created_at", { ascending: false }).limit(Math.min(Math.max(Number(limit) || 20, 1), 100));
  if (activeOnly) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) {
    if (missingSchema(error)) return [];
    throw error;
  }
  return (data || []).map(customAlertViewModel).filter(Boolean);
}

export async function loadActiveCustomAlert() {
  const rows = await loadCustomAlerts({ limit: 1, activeOnly: true });
  return rows[0] || null;
}

export async function createCustomBreakingAlert({ label = "BREAKING", title, message = "", targetUrl = "#/home", sendPhone = true } = {}) {
  const payload = {
    label: clean(label, 28) || "BREAKING",
    title: clean(title, 120),
    message: clean(message, 240),
    target_url: safeTarget(targetUrl),
    created_by: Number(currentMember()?.id) || null,
  };
  if (!payload.title) throw new Error("Add an alert headline first");
  const { data, error } = await db().from("custom_breaking_alerts").insert(payload).select("*").single();
  if (error) {
    if (missingSchema(error)) throw new Error("Run custom_breaking_alerts_schema.sql to enable custom alerts");
    throw error;
  }
  let notificationError = null;
  if (sendPhone) {
    try {
      const response = await edge().functions.invoke("send-notification", {
        headers: privilegedFunctionHeaders(),
        body: {
          action: "send", title: payload.label.toUpperCase(), body: [payload.title, payload.message].filter(Boolean).join(" — "),
          category: "announcements", audience: "all", targetUrl: payload.target_url,
          sourceKey: `custom-alert:${data.id}`,
        },
      });
      if (response.error || !response.data?.ok) throw new Error(response.data?.error || response.error?.message || "Phone alert failed");
      const linked = await db().from("custom_breaking_alerts").update({
        notification_message_id: response.data.messageId,
        notified_at: new Date().toISOString(),
      }).eq("id", data.id);
      if (linked.error) throw linked.error;
    } catch (error) { notificationError = error; }
  }
  window.dispatchEvent(new CustomEvent("dfl:trade-coverage-changed"));
  return { alert: customAlertViewModel(data), notificationError };
}

export async function endCustomBreakingAlert(alertId) {
  const id = Number(alertId);
  if (!Number.isFinite(id) || id <= 0) throw new Error("That custom alert could not be identified");
  const { data, error } = await db().rpc("end_custom_breaking_alert", { alert_id: id });
  if (error) {
    if (missingSchema(error)) throw new Error("Run custom_breaking_alerts_schema.sql to manage custom alerts");
    throw error;
  }
  window.dispatchEvent(new CustomEvent("dfl:trade-coverage-changed"));
  return data === true;
}

