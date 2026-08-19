// =====================================================================
// Profile gate - optional member PIN before the real Profile route loads.
// ---------------------------------------------------------------------
// The original profile page stays untouched. This wrapper checks whether the
// target member opted into a PIN, keeps a successful unlock for this browser
// session, then delegates to profile.js. If the migration has not been run,
// Profile keeps working and simply shows a setup note to the member.
// =====================================================================
import { db } from "../supabase.js";
import { currentMember, loadMembers } from "../members.js";
import { esc, toast } from "../ui.js";
import * as profile from "./profile.js";

const key = (id) => `dfl.profile.unlocked.${id}`;
const unlocked = (id) => { try { return sessionStorage.getItem(key(id)) === "1"; } catch { return false; } };
const markUnlocked = (id) => { try { sessionStorage.setItem(key(id), "1"); } catch {} };
const clearUnlocked = (id) => { try { sessionStorage.removeItem(key(id)); } catch {} };

async function targetMember() {
  const wanted = new URLSearchParams((location.hash.split("?")[1] || "")).get("id");
  const members = await loadMembers();
  const me = currentMember();
  return wanted ? members.find((m) => String(m.id) === String(wanted)) : me;
}

async function lockStatus(id) {
  const { data, error } = await db().rpc("profile_lock_status", { target_member_id: Number(id) });
  if (error) throw error;
  return !!data;
}

function gate(view, member) {
  view.innerHTML = `<div id="profile-lock-gate">
    <header class="page-head"><div><h1>Profile locked</h1><p class="muted">${esc(member.display_name)} keeps this one behind a PIN.</p></div></header>
    <form class="card" id="profile-unlock-form">
      <label for="profile-unlock-pin">Profile PIN</label>
      <input id="profile-unlock-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" minlength="4" autocomplete="off" required autofocus>
      <div class="row-end"><a class="btn ghost" href="#/home">Back</a><button class="btn" type="submit">Unlock profile</button></div>
    </form>
    <p class="muted tiny" style="text-align:center">Forgot it? A DFL Owner can reset the lock, but nobody can read the PIN.</p>
  </div>`;
  const form = view.querySelector("#profile-unlock-form");
  const input = view.querySelector("#profile-unlock-pin");
  input?.addEventListener("input", () => { input.value = input.value.replace(/\D/g, "").slice(0, 6); });
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const { data, error } = await db().rpc("profile_verify_pin", {
        target_member_id: Number(member.id), attempted_pin: input.value,
      });
      if (error) throw error;
      if (data !== true) throw new Error("Wrong profile PIN");
      markUnlocked(member.id);
      toast("Profile unlocked");
      render(view);
    } catch (err) {
      toast(err.message || "Could not unlock profile", true);
      btn.disabled = false;
      input.select();
    }
  });
}

function settingsCard(member, locked, migrationReady) {
  if (!migrationReady) return `<div class="card note"><div class="card-title">Profile lock</div><div class="card-body muted">Profile PIN setup is ready in the app. Run <strong>profile_lock_schema.sql</strong> in Supabase to turn it on.</div></div>`;
  return `<div class="card" data-profile-lock-settings>
    <div class="card-title">Profile lock</div>
    <p class="muted tiny">Optional 4–6 digit PIN for opening your Profile. Once unlocked, it stays open for this app session.</p>
    <form id="profile-lock-form">
      ${locked ? `<label for="profile-current-pin">Current PIN</label><input id="profile-current-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" minlength="4" autocomplete="off" required>` : ""}
      <label for="profile-new-pin">${locked ? "New PIN" : "Choose a PIN"}</label>
      <input id="profile-new-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" minlength="4" autocomplete="new-password" required>
      <div class="row-end">
        ${locked ? `<button type="button" class="btn danger ghost" id="profile-disable-lock">Turn lock off</button>` : ""}
        <button type="submit" class="btn">${locked ? "Change PIN" : "Turn lock on"}</button>
      </div>
    </form>
  </div>`;
}

function wireSettings(view, member, locked) {
  const root = view.querySelector("[data-profile-lock-settings]");
  if (!root) return;
  root.querySelectorAll('input[inputmode="numeric"]').forEach((input) => input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 6);
  }));
  const form = root.querySelector("#profile-lock-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const current = root.querySelector("#profile-current-pin")?.value || null;
    const next = root.querySelector("#profile-new-pin")?.value || "";
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const { error } = await db().rpc("profile_set_pin", { new_pin: next, current_pin: current });
      if (error) throw error;
      markUnlocked(member.id);
      toast(locked ? "Profile PIN changed" : "Profile lock turned on");
      render(view);
    } catch (err) { toast(err.message || "Could not save profile PIN", true); btn.disabled = false; }
  });
  root.querySelector("#profile-disable-lock")?.addEventListener("click", async () => {
    const current = root.querySelector("#profile-current-pin")?.value || "";
    if (!current) { toast("Enter your current PIN first", true); return; }
    if (!confirm("Turn off your Profile PIN?")) return;
    try {
      const { error } = await db().rpc("profile_disable_pin", { current_pin: current });
      if (error) throw error;
      clearUnlocked(member.id);
      toast("Profile lock turned off");
      render(view);
    } catch (err) { toast(err.message || "Could not turn off profile lock", true); }
  });
}

export async function render(view) {
  let member;
  try { member = await targetMember(); }
  catch (err) { view.innerHTML = `<h1>Profile</h1><div class="card"><div class="card-body">${esc(err.message || "Could not load member")}</div></div>`; return; }
  if (!member) return profile.render(view);

  let locked = false, migrationReady = true;
  try { locked = await lockStatus(member.id); }
  catch { migrationReady = false; locked = false; }

  if (locked && !unlocked(member.id)) { gate(view, member); return; }

  await profile.render(view);
  const me = currentMember();
  const isMe = me && String(me.id) === String(member.id);
  if (!isMe) return;

  const wrap = view.querySelector("#profile-wrap");
  if (!wrap) return;
  const section = document.createElement("section");
  section.innerHTML = `<h2 class="section-title">Privacy</h2>${settingsCard(member, locked, migrationReady)}`;
  wrap.appendChild(section);
  if (migrationReady) wireSettings(view, member, locked);
}
