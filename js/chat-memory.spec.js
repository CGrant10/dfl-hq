import { describe, expect, it } from "vitest";
import { addChatMessage, CHAT_MEMORY_MS, freshChatMessages } from "./chat-memory.js";

describe("Ask DFL short memory", () => {
  it("forgets messages after three minutes", () => {
    const now = 1_000_000;
    expect(freshChatMessages([
      { role: "user", text: "old", at: now - CHAT_MEMORY_MS - 1 },
      { role: "assistant", text: "fresh", at: now - CHAT_MEMORY_MS },
    ], now).map(message => message.text)).toEqual(["fresh"]);
  });

  it("keeps only the latest eight messages", () => {
    let messages = [];
    for (let index = 0; index < 10; index++) messages = addChatMessage(messages, "user", String(index), index);
    expect(messages).toHaveLength(8);
    expect(messages[0].text).toBe("2");
    expect(messages.at(-1).text).toBe("9");
  });
});

