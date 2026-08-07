// =====================================================================
// app.js - start-up: theme, "Who are you?", admin restore, router, SW
// =====================================================================

import { APP_VERSION } from "./config.js";
import { getUsername, setUsername } from "./store.js";
import { restoreAdmin, registerUser, configured } from "./supabase.js";
import { loadMembers, restoreMember, selectMember, currentMember, getMemberId } from "./members.js";
import { initTheme, saveTheme, savedTheme } from "./theme.js";
import { startRouter, renderRoute, go } from "./router.js";
import { setupInstall } from "./install.js";
import { setupUpdates } from "./update.js";
import { esc, toast } from "./ui.js";

const welcome     = document.getElementById("welcome");
const welcomeForm = document.getElementById("welcome-form");
const welcomeInput= document.getElementById("welcome-input");
const welcomeCancel = document.getElementById("welcome-cancel");
const memberList  = document.getElementById("member-list");
const whoamiName  = document.getElementById("whoami-name");

function paintName() {
  const m = currentMember();
  whoamiName.textContent = m ? m.display_name : (getUsername() || "Who are you?");
}

// ---------------------------------------------------------------------
// The picker
// ---------------------------------------------------------------------

async function openPicker({ cancellable = false } = {}) {
  welcomeCancel.classList.toggle("hidden", !cancellable);
  welcome.classList.remove("hidden");

  memberList.innerHTML = `<div class="muted tiny">Loading members…</div>`;

  let members = [];
  try {
    members = await loadMembers({ force: true });
  } catch {
    members = [];
  }

  if (!members.length) {
    // No members set up yet - fall back to typing a name so a brand new
    // install is never locked out.
    memberList.innerHTML =
      `<div class="muted tiny">No members yet. An admin can add them in Admin → Members.</div>`;
    welcomeForm.classList.remove("hidden");
    welcomeInput.value = getUsername();
    setTimeout(() => welcomeInput.focus(), 50);
    return;
  }

  welcomeForm.classList.add("hidden");
  const mine = getMemberId();

  memberList.innerHTML = members.map((m) => `
    <button type="button" class="memberbtn ${String(m.id) === mine ? "on" : ""}" data-member="${m.id}">
      <span class="avatar avatar-fallback sm">${esc(initials(m.display_name))}</span>
      <span class="memberbtn-text">
        <strong>${esc(m.display_name)}</strong>
        ${m.team_name ? `<span class="muted tiny">${esc(m.team_name)}</span>` : ""}
      </span>
    </button>`).join("");
}

function initials(name) {
  return String(name || "?").trim().slice(0, 2).toUpperCase();
}

memberList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-member]");
  if (!btn) return;

  const members = await loadMembers();
  const member = members.find((m) => String(m.id) === btn.dataset.member);
  if (!member) return;

  selectMember(member);
  // A member's saved team colour becomes this device's theme, unless the
  // device already has its own choice.
  if (!savedTheme() && member.favorite_team) saveTheme(member.favorite_team);

  paintName();
  welcome.classList.add("hidden");
  await registerUser(member.display_name);
  toast(`Welcome, ${member.display_name}`);
  renderRoute();
});

// Fallback path: no members in the database yet.
welcomeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = welcomeInput.value.trim();
  if (!name) return;
  setUsername(name);
  paintName();
  welcome.classList.add("hidden");
  await registerUser(name);
  renderRoute();
});

welcomeCancel.addEventListener("click", () => welcome.classList.add("hidden"));

// The header chip opens your profile, or the picker if you have not chosen.
document.getElementById("whoami").addEventListener("click", () => {
  if (currentMember()) go("profile");
  else openPicker({ cancellable: !!getUsername() });
});

// Let other pages open the picker (the Switch button on the profile page).
window.addEventListener("dfl:pick-member", () => openPicker({ cancellable: true }));

// ---------------------------------------------------------------------

async function boot() {
  console.log(`DFL HQ v${APP_VERSION}`);
  initTheme();                       // before first paint, so no colour flash

  if (!configured) toast("Add your Supabase keys in js/config.js", true);

  await Promise.all([restoreAdmin(), restoreMember()]);
  paintName();
  startRouter();

  if (!currentMember() && !getUsername()) openPicker();
  else if (getUsername()) registerUser(getUsername());

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    // updateViaCache:"none" keeps sw.js itself out of the HTTP cache. Without
    // it the browser can check for a new worker against a cached copy of the
    // old one and conclude nothing changed.
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(console.warn);
  }

  setupInstall();
  setupUpdates();
}

boot();
