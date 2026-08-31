export const NOTIFICATION_CATEGORIES = Object.freeze([
  ["announcements", "Announcements"],
  ["trades", "Trades"],
  ["polls", "Polls"],
  ["fees", "Fees"],
  ["matchups", "Matchups"],
  ["events", "Events"],
  ["updates", "App updates"],
]);

export const ALL_NOTIFICATION_CATEGORIES = NOTIFICATION_CATEGORIES.map(([id]) => id);

export function safeNotificationUrl(value) {
  const url = String(value || "").trim();
  return /^#\/[a-z0-9-]+(?:\?[^\s]*)?$/i.test(url) ? url : "#/home";
}
export function cleanNotificationDraft(draft = {}) {
  const allowed = new Set(ALL_NOTIFICATION_CATEGORIES);
  const category = allowed.has(draft.category) ? draft.category : "announcements";
  const targets = [...new Set((draft.targetMemberIds || []).map(Number).filter(Number.isSafeInteger))];
  return {
    title: String(draft.title || "").trim().slice(0, 80),
    body: String(draft.body || "").trim().slice(0, 240),
    category,
    targetUrl: safeNotificationUrl(draft.targetUrl),
    audience: draft.audience === "members" && targets.length ? "members" : "all",
    targetMemberIds: draft.audience === "members" ? targets : [],
  };
}

export function timeAgo(value, now = Date.now()) {
  const elapsed = Math.max(0, now - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
