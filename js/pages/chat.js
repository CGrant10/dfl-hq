import { addChatMessage, CHAT_MEMORY_MS, freshChatMessages } from "../chat-memory.js";
import { verifiedPin } from "../member-lock.js";
import { currentMember } from "../members.js";
import { edge } from "../supabase.js";
import { esc, toast } from "../ui.js";

let messages = [];
let sources = [];
let pin = "";
let lastActivity = 0;
let activeMemberId = "";
let expiryTimer = null;
let disposed = false;

const messageMarkup = message => `<div class="dfl-chat-message is-${message.role}">
  <span>${message.role === "assistant" ? "DFL" : "YOU"}</span>
  <p>${esc(message.text).replace(/\n/g, "<br>")}</p>
</div>`;

function sourceMarkup(source, index) {
  let url;
  try { url = new URL(source.url); } catch { return ""; }
  if (!/^https?:$/.test(url.protocol)) return "";
  return `<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${index + 1} · ${esc(source.title || url.hostname)}</a>`;
}

function transcript(view) {
  messages = freshChatMessages(messages);
  const stream = view.querySelector("[data-chat-stream]");
  if (!stream) return;
  stream.innerHTML = messages.length
    ? messages.map(messageMarkup).join("")
    : `<div class="dfl-chat-empty"><b>Ask anything.</b><span>Trades, rankings, injuries, matchups, or league chaos.</span></div>`;
  const sourceBox = view.querySelector("[data-chat-sources]");
  if (sourceBox) sourceBox.innerHTML = sources.map(sourceMarkup).join("");
  stream.scrollTop = stream.scrollHeight;
}

function scheduleExpiry(view) {
  clearTimeout(expiryTimer);
  if (!lastActivity) return;
  expiryTimer = setTimeout(() => {
    messages = [];
    sources = [];
    pin = "";
    lastActivity = 0;
    if (!disposed) transcript(view);
  }, Math.max(0, lastActivity + CHAT_MEMORY_MS - Date.now()));
}

async function invoke(body, member, heldPin = pin) {
  const { data, error } = await edge().functions.invoke("dfl-chat", {
    body,
    headers: {
      "x-member-id": String(member.id),
      ...(heldPin ? { "x-profile-pin": heldPin } : {}),
    },
  });
  if (error) {
    let detail = data?.error || error.message;
    try { detail = (await error.context?.json())?.error || detail; } catch { /* response body unavailable */ }
    throw new Error(detail || "Ask DFL is unavailable");
  }
  if (data?.error) throw new Error(data.error);
  return data || {};
}

function unlockMarkup(name) {
  return `<div class="dfl-chat-lock">
    <span class="dfl-chat-monogram">DFL</span>
    <h1>Ask DFL</h1>
    <form data-chat-unlock autocomplete="off">
      <label for="chat-pin">${esc(name)} · Profile PIN</label>
      <div class="dfl-chat-unlock-row"><input id="chat-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" autocomplete="off" required><button class="btn" type="submit">Open</button></div>
    </form>
  </div>`;
}

function chatMarkup(name) {
  return `<section class="dfl-chat" aria-label="Ask DFL chat">
    <header class="dfl-chat-head"><div><small>DFL INTELLIGENCE</small><h1>Ask DFL</h1></div><div><b>${esc(name)}</b><span class="dfl-chat-live">LIVE</span></div></header>
    <div class="dfl-chat-stream" data-chat-stream aria-live="polite"></div>
    <nav class="dfl-chat-sources" data-chat-sources aria-label="Sources"></nav>
    <form class="dfl-chat-compose" data-chat-form>
      <textarea name="message" rows="1" maxlength="1000" placeholder="Ask DFL…" aria-label="Message Ask DFL" required></textarea>
      <button type="submit" aria-label="Send message">↑</button>
    </form>
  </section>`;
}

function mountChat(view, member) {
  view.innerHTML = chatMarkup(member.display_name);
  transcript(view);
  scheduleExpiry(view);
  const form = view.querySelector("[data-chat-form]");
  const input = form.querySelector("textarea");
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const button = form.querySelector("button");
    messages = addChatMessage(messages, "user", text);
    sources = [];
    lastActivity = Date.now();
    input.value = "";
    input.style.height = "auto";
    button.disabled = true;
    transcript(view);
    scheduleExpiry(view);
    const thinking = document.createElement("div");
    thinking.className = "dfl-chat-thinking";
    thinking.textContent = "DFL is thinking";
    view.querySelector("[data-chat-stream]")?.appendChild(thinking);
    try {
      const result = await invoke({
        messages: freshChatMessages(messages).map(({ role, text: content }) => ({ role, content })),
      }, member);
      thinking.remove();
      messages = addChatMessage(messages, "assistant", result.text || "I came up empty. Try that again.");
      sources = Array.isArray(result.sources) ? result.sources.slice(0, 5) : [];
      lastActivity = Date.now();
      transcript(view);
      scheduleExpiry(view);
    } catch (error) {
      thinking.remove();
      messages = messages.filter((_, index) => index !== messages.length - 1);
      transcript(view);
      toast(error.message || "Ask DFL is unavailable", true);
    } finally {
      button.disabled = false;
      input.focus();
    }
  });
  setTimeout(() => input.focus(), 0);
}

export async function render(view) {
  disposed = false;
  const member = currentMember();
  if (!member) {
    view.innerHTML = `<div class="dfl-chat-lock"><span class="dfl-chat-monogram">DFL</span><h1>Pick your member first.</h1><a class="btn" href="#/home">Home</a></div>`;
    return;
  }
  if (activeMemberId && activeMemberId !== String(member.id)) {
    pin = "";
    messages = [];
    sources = [];
    lastActivity = 0;
  }
  activeMemberId = String(member.id);
  pin ||= verifiedPin(member.id) || "";
  if (pin && (!lastActivity || Date.now() - lastActivity < CHAT_MEMORY_MS)) {
    lastActivity ||= Date.now();
    mountChat(view, member);
    return;
  }
  pin = "";
  messages = [];
  sources = [];
  view.innerHTML = unlockMarkup(member.display_name);
  const form = view.querySelector("[data-chat-unlock]");
  const input = form.querySelector("input");
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const candidate = input.value.trim();
      await invoke({ action: "unlock" }, member, candidate);
      pin = candidate;
      lastActivity = Date.now();
      mountChat(view, member);
    } catch (error) {
      toast(error.message || "Profile PIN not accepted", true);
      button.disabled = false;
      input.select();
    }
  });
  setTimeout(() => input.focus(), 0);
}

export function leave() {
  disposed = true;
  clearTimeout(expiryTimer);
}
