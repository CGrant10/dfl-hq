import { DEFAULT_NOTIFICATION_CATEGORIES } from "./notification-core.js";

const desiredKey = memberId => `dfl.notification.desired.${memberId}`;
const momentsDefaultKey = memberId => `dfl.notification.momentsDefault.${memberId}`;
const categoriesKey = memberId => `dfl.notification.categories.${memberId}`;

export function rememberNotificationIntent(memberId, enabled, storage = localStorage) {
  if (memberId == null) return;
  storage.setItem(desiredKey(memberId), enabled ? "on" : "off");
}
export function notificationIntent(memberId, storage = localStorage) {
  if (memberId == null) return null;
  const value = storage.getItem(desiredKey(memberId));
  return value === "on" ? true : value === "off" ? false : null;
}
export function rememberNotificationCategories(memberId, categories, storage = localStorage) {
  if (memberId == null) return;
  storage.setItem(categoriesKey(memberId), JSON.stringify(Array.isArray(categories) ? categories : DEFAULT_NOTIFICATION_CATEGORIES));
  storage.setItem(momentsDefaultKey(memberId), "applied");
}
export function rememberedNotificationCategories(memberId, storage = localStorage) {
  if (memberId == null) return DEFAULT_NOTIFICATION_CATEGORIES;
  try {
    const value = JSON.parse(storage.getItem(categoriesKey(memberId)) || "null");
    if (!Array.isArray(value)) return DEFAULT_NOTIFICATION_CATEGORIES;
    // Upgrade old local caches once so a repaired endpoint retains the new
    // default. Saving any current choice marks the migration as handled,
    // including an explicit opt-out or an empty category list.
    if (storage.getItem(momentsDefaultKey(memberId)) !== "applied") {
      const upgraded = [...new Set([...value, "matchup_moments"])];
      rememberNotificationCategories(memberId, upgraded, storage);
      return upgraded;
    }
    return value;
  } catch { return DEFAULT_NOTIFICATION_CATEGORIES; }
}
export function shouldRepairMissingSubscription({ permission, desired, hasDeviceToken }) {
  return permission === "granted" && (desired === true || (desired == null && hasDeviceToken));
}
