export const CHAT_MEMORY_MS = 3 * 60 * 1000;
export const CHAT_MESSAGE_LIMIT = 8;

export function freshChatMessages(messages, now = Date.now()) {
  const cutoff = now - CHAT_MEMORY_MS;
  return (Array.isArray(messages) ? messages : [])
    .filter(message => Number(message?.at) >= cutoff && ["user", "assistant"].includes(message?.role))
    .slice(-CHAT_MESSAGE_LIMIT);
}

export function addChatMessage(messages, role, text, now = Date.now()) {
  return freshChatMessages([
    ...freshChatMessages(messages, now),
    { role, text: String(text || "").trim().slice(0, 1200), at: now },
  ], now);
}

