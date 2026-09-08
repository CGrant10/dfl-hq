import { addChatMessage, CHAT_MEMORY_MS, freshChatMessages } from "./chat-memory.js";
import { verifiedPin } from "./member-lock.js";
import { currentMember } from "./members.js";
import { currentRoute } from "./router.js";
import { edge } from "./supabase.js";
import { esc } from "./ui.js";

let mounted = false, open = false, busy = false, pin = "", memberId = "";
let messages = [], sources = [], lastActivity = 0, timer = null;

const clip = `<svg viewBox="0 0 64 78" aria-hidden="true"><path d="M43 18v36c0 12-7 19-17 19S9 66 9 55V20C9 9 16 3 25 3s16 6 16 17v32c0 8-4 13-11 13s-11-5-11-13V23c0-5 3-8 7-8s7 3 7 8v27"/><circle cx="20" cy="28" r="3"/><circle cx="31" cy="28" r="3"/><path class="clip-mouth" d="M20 38c3 3 7 3 10 0"/></svg>`;

function contextNow() {
  const view = document.getElementById("view");
  const clone = view?.cloneNode(true);
  clone?.querySelectorAll("script,style,input,textarea,select,[aria-hidden=true],[hidden]").forEach(node => node.remove());
  const text = String(clone?.innerText || clone?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 5000);
  const route = currentRoute();
  const title = view?.querySelector("h1,h2")?.textContent?.trim() || route;
  return { route, title, text };
}

function sourceLink(source, index) {
  try {
    const url = new URL(source.url);
    if (!/^https?:$/.test(url.protocol)) return "";
    return `<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${index + 1} · ${esc(source.title || url.hostname)}</a>`;
  } catch { return ""; }
}

async function callChat(body, member, secret = pin) {
  const { data, error } = await edge().functions.invoke("dfl-chat", {
    body,
    headers: { "x-member-id": String(member.id), ...(secret ? { "x-profile-pin": secret } : {}) },
  });
  if (error) {
    let detail = data?.error || error.message;
    try { detail = (await error.context?.json())?.error || detail; } catch { /* no response JSON */ }
    throw new Error(detail || "Ask DFL is unavailable");
  }
  if (data?.error) throw new Error(data.error);
  return data || {};
}

function expire(root) {
  clearTimeout(timer);
  if (!lastActivity) return;
  timer = setTimeout(() => {
    messages = []; sources = []; pin = ""; lastActivity = 0;
    paint(root);
  }, Math.max(0, lastActivity + CHAT_MEMORY_MS - Date.now()));
}

function conversation() {
  messages = freshChatMessages(messages);
  if (!messages.length) return `<div class="clip-empty"><b>What do you want to know?</b><span>I can read this page.</span></div>`;
  return messages.map(message => `<div class="clip-msg is-${message.role}"><small>${message.role === "assistant" ? "DFL" : "YOU"}</small><p>${esc(message.text).replace(/\n/g,"<br>")}</p></div>`).join("");
}

function panel(member) {
  const route = esc(contextNow().title);
  if (!pin) return `<section class="clip-panel" aria-label="Ask DFL"><header><span>${clip}</span><div><strong>Ask DFL</strong><small>${route}</small></div><button data-clip-close aria-label="Close">×</button></header><form class="clip-unlock" data-clip-unlock autocomplete="off"><label for="clip-pin">${esc(member.display_name)} · Profile PIN</label><div><input id="clip-pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" required><button class="btn" type="submit">Open</button></div></form></section>`;
  return `<section class="clip-panel" aria-label="Ask DFL"><header><span>${clip}</span><div><strong>Ask DFL</strong><small>${route}</small></div><button data-clip-close aria-label="Close">×</button></header><div class="clip-stream" data-clip-stream>${conversation()}</div><div class="clip-sources">${sources.map(sourceLink).join("")}</div><form class="clip-compose" data-clip-form><textarea rows="1" maxlength="1000" placeholder="Ask about this page…" aria-label="Ask DFL" required></textarea><button type="submit" aria-label="Send">↑</button></form></section>`;
}

function bind(root, member) {
  root.querySelector("[data-clip-close]")?.addEventListener("click", () => { open = false; paint(root); });
  const unlock = root.querySelector("[data-clip-unlock]");
  unlock?.addEventListener("submit", async event => {
    event.preventDefault(); const input = unlock.querySelector("input"), button = unlock.querySelector("button"); button.disabled = true;
    try { await callChat({ action: "unlock" }, member, input.value); pin = input.value; lastActivity = Date.now(); paint(root); }
    catch (error) { root.dataset.error = error.message; button.disabled = false; paint(root); }
  });
  const form = root.querySelector("[data-clip-form]");
  form?.addEventListener("submit", async event => {
    event.preventDefault(); if (busy) return;
    const input = form.querySelector("textarea"), text = input.value.trim(); if (!text) return;
    busy = true; messages = addChatMessage(messages, "user", text); sources = []; lastActivity = Date.now(); input.value = ""; paint(root);
    try {
      const result = await callChat({ messages: freshChatMessages(messages).map(({role,text:content}) => ({role,content})), pageContext: contextNow() }, member);
      messages = addChatMessage(messages, "assistant", result.text || "I came up empty."); sources = Array.isArray(result.sources) ? result.sources.slice(0,5) : []; lastActivity = Date.now();
    } catch (error) { messages = messages.slice(0,-1); root.dataset.error = error.message; }
    finally { busy = false; paint(root); }
  });
}

function paint(root) {
  const member = currentMember();
  if (memberId && member && memberId !== String(member.id)) { pin=""; messages=[]; sources=[]; lastActivity=0; }
  memberId = member ? String(member.id) : "";
  pin ||= member ? verifiedPin(member.id) || "" : "";
  root.innerHTML = `<button class="clip-fab${open?" is-open":""}" data-clip-open aria-label="Ask DFL" aria-expanded="${open}">${clip}<span>Ask DFL</span></button>${open ? (member ? panel(member) : `<section class="clip-panel clip-no-member"><button data-clip-close aria-label="Close">×</button><b>Pick your member first.</b></section>`) : ""}${root.dataset.error ? `<div class="clip-error" role="status">${esc(root.dataset.error)}</div>` : ""}`;
  root.querySelector("[data-clip-open]")?.addEventListener("click",()=>{open=!open;root.dataset.error="";paint(root)});
  if (open && member) bind(root, member); else root.querySelector("[data-clip-close]")?.addEventListener("click",()=>{open=false;paint(root)});
  root.querySelector("[data-clip-stream]")?.scrollTo?.(0,99999);
  if (busy) { const stream=root.querySelector("[data-clip-stream]"); if(stream)stream.insertAdjacentHTML("beforeend",'<div class="clip-thinking">Thinking…</div>'); }
  expire(root);
}

export function mountChatWidget() {
  if (mounted) return; mounted = true;
  const root = document.createElement("aside"); root.id = "dfl-chat-widget"; document.body.appendChild(root); paint(root);
  window.addEventListener("hashchange",()=>paint(root));
}
