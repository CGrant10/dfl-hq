// =====================================================================
// Admin - password gate, then a manager for every table.
//
// The password is checked by Postgres (see is_admin() in schema.sql), not
// by this file. Hiding these buttons is only a convenience; the database
// is what actually refuses writes from non-admins.
// =====================================================================

import { adminLogin, adminLogout, isAdmin, changeAdminPassword, configured } from "../supabase.js";
import { renderManager } from "../crud.js";
import { renderSleeperPanel } from "./admin_sleeper.js";
import { renderFinancePanel } from "./admin_finance.js";
import { esc, toast } from "../ui.js";
import { CATEGORIES } from "./rules.js";
import { teamOptions } from "../teams.js";

const THIS_YEAR = new Date().getFullYear();

// ------------------------------------------------- section definitions

const SECTIONS = [
  {
    id: "announcements", tab: "News",
    table: "announcements", singular: "announcement", plural: "announcements",
    label: (r) => r.title,
    sub:   (r) => (r.content || "").slice(0, 90),
    fields: [
      { name: "title",   label: "Title",   type: "text",     required: true, placeholder: "Draft is set" },
      { name: "content", label: "Message", type: "textarea", placeholder: "Details for the league…" },
    ],
  },
  {
    id: "polls", tab: "Polls",
    table: "polls", singular: "poll", plural: "polls",
    label: (r) => r.question,
    sub:   (r) => (r.active ? "Open" : "Closed"),
    fields: [
      { name: "question", label: "Question", type: "text", required: true,
        placeholder: "Should we run a March Madness bracket?" },
      { name: "options",  label: "Options (one per line)", type: "list", required: true,
        placeholder: "Yes\nNo\nMaybe" },
      { name: "active",   label: "Poll is open for voting", type: "checkbox", default: true },
    ],
  },
  {
    id: "rules", tab: "Rules",
    table: "rules", singular: "rule", plural: "rules",
    order: "sort_order", asc: true,
    label: (r) => `${r.title || "(untitled)"}`,
    sub:   (r) => `${r.category} · #${r.sort_order}`,
    fields: [
      { name: "category",   label: "Section", type: "select", required: true,
        options: CATEGORIES.map((c) => ({ value: c.key, label: c.label })) },
      { name: "title",      label: "Heading", type: "text", placeholder: "Trade deadline" },
      { name: "content",    label: "Text",    type: "textarea", required: true },
      { name: "sort_order", label: "Order within the section", type: "number", default: 1 },
    ],
  },
  {
    id: "keepers", tab: "Keepers",
    table: "keepers", singular: "keeper", plural: "keepers",
    order: "year", asc: false,
    label: (r) => `${r.player} — ${r.team}`,
    sub:   (r) => `${r.year} · ${r.round_cost != null ? "Round " + r.round_cost : "no cost set"}`,
    fields: [
      { name: "team",       label: "Team",        type: "text",   required: true, placeholder: "Slaw Squad" },
      { name: "player",     label: "Player",      type: "text",   required: true, placeholder: "Christian McCaffrey" },
      { name: "round_cost", label: "Round cost",  type: "number", placeholder: "2" },
      { name: "year",       label: "Season",      type: "number", required: true, default: THIS_YEAR },
      { name: "notes",      label: "Notes",       type: "textarea" },
    ],
  },
  {
    id: "events", tab: "Events",
    table: "events", singular: "event", plural: "events",
    order: "event_date", asc: true,
    label: (r) => r.title,
    sub:   (r) => r.event_date,
    fields: [
      { name: "title",       label: "Title", type: "text", required: true, placeholder: "Draft night" },
      { name: "event_date",  label: "Date",  type: "date", required: true },
      { name: "description", label: "Details", type: "textarea" },
    ],
  },
  {
    id: "history", tab: "History",
    table: "history", singular: "history entry", plural: "history entries",
    order: "year", asc: false,
    label: (r) => `${r.year} ${r.category}: ${r.winner}`,
    sub:   (r) => (r.notes || "").slice(0, 90),
    fields: [
      { name: "year",     label: "Year",     type: "number", required: true, default: THIS_YEAR - 1 },
      { name: "category", label: "Category", type: "select", required: true,
        options: ["Champion", "Runner Up", "Award", "Record", "Moment"] },
      { name: "winner",   label: "Who / what", type: "text", required: true, placeholder: "Slaw Squad" },
      { name: "notes",    label: "Notes",      type: "textarea" },
    ],
  },
  {
    id: "side_events", tab: "Side Events",
    table: "side_events", singular: "side event", plural: "side events",
    label: (r) => r.title,
    sub:   (r) => `${r.kind} · ${r.status}`,
    fields: [
      { name: "title",       label: "Title", type: "text", required: true, placeholder: "March Madness bracket" },
      { name: "kind",        label: "Type",  type: "select",
        options: ["Bracket", "Pick'em", "Survivor", "Other"] },
      { name: "status",      label: "Status", type: "select",
        options: ["Open", "Closed", "Finished"] },
      { name: "description", label: "Details", type: "textarea" },
      { name: "link",        label: "Link (optional)", type: "text", placeholder: "https://…" },
    ],
  },
  {
    id: "members", tab: "Members",
    table: "members", singular: "member", plural: "members",
    order: "display_name", asc: true,
    label: (r) => `${r.display_name}${r.team_name ? " — " + r.team_name : ""}`,
    sub:   (r) => `${r.active ? "active" : "inactive"}${r.championships ? ` · ${r.championships}× champ` : ""}`,
    fields: [
      { name: "display_name",  label: "Name shown in the picker", type: "text", required: true },
      { name: "team_name",     label: "Fantasy team name", type: "text" },
      { name: "sleeper_user_id", label: "Sleeper account (links career stats)", type: "select",
        optionsFrom: { table: "sleeper_users", value: "sleeper_user_id",
                       label: "display_name", order: "display_name" } },
      { name: "joined_year",   label: "Joined the league in", type: "number" },
      { name: "championships", label: "Championships", type: "number", default: 0 },
      { name: "awards",        label: "Awards (one per line)", type: "textarea",
        placeholder: "Highest scorer 2025\nBest trade 2024" },
      { name: "favorite_team", label: "Favourite team (app colour)", type: "select",
        options: teamOptions() },
      { name: "profile_image", label: "Profile image URL (optional)", type: "text" },
      { name: "notes",         label: "Notes", type: "textarea" },
      { name: "active",        label: "Show in the member picker", type: "checkbox", default: true },
      { name: "sort_order",    label: "Order in the list", type: "number", default: 0 },
    ],
  },
];

// Custom panels rather than single-table editors, so they live outside
// SECTIONS and get their own render function.
const PANELS = [
  { id: "finances", tab: "Finances", render: renderFinancePanel },
  { id: "sleeper",  tab: "Sleeper",  render: renderSleeperPanel },
];

let activeSection = "announcements";

// -------------------------------------------------------- password box

/**
 * A password input with an eye button that reveals what you typed.
 * Phone keyboards make blind password entry genuinely annoying.
 */
function passwordField(id, placeholder, autocomplete) {
  return `
    <div class="pwwrap">
      <input id="${id}" type="password" autocomplete="${autocomplete}"
             ${placeholder ? `placeholder="${esc(placeholder)}"` : ""} required>
      <button type="button" class="pweye" data-eye="${id}" aria-label="Show password">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path class="eye-open" d="M1.8 12S5.4 5.4 12 5.4 22.2 12 22.2 12 18.6 18.6 12 18.6 1.8 12 1.8 12z"
                fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          <circle class="eye-open" cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" stroke-width="1.7"/>
          <path class="eye-slash hidden" d="M3.5 3.5l17 17"
                fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
      </button>
    </div>`;
}

/** Wire every eye button inside a container. */
function wireEyes(root) {
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-eye]");
    if (!btn) return;
    const input = root.querySelector("#" + btn.dataset.eye);
    if (!input) return;

    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    btn.classList.toggle("on", !showing);
    btn.querySelector(".eye-slash").classList.toggle("hidden", showing);
    btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    input.focus();
  });
}

// ---------------------------------------------------------------- page

export async function render(view) {
  if (!configured) {
    view.innerHTML = `<h1>Admin</h1>
      <div class="card"><div class="card-body">Add your Supabase keys in js/config.js first.</div></div>`;
    return;
  }

  if (!isAdmin()) { renderLogin(view); return; }

  view.innerHTML = `
    <div class="section-head" style="margin-top:0">
      <h1 style="margin:0">Admin</h1>
      <button class="btn ghost small" id="logout">Sign out</button>
    </div>

    <div class="tabs" id="admin-tabs">
      ${[...SECTIONS, ...PANELS].map((s) => `
        <button data-section="${s.id}" class="${s.id === activeSection ? "on" : ""}">${esc(s.tab)}</button>
      `).join("")}
    </div>

    <div id="admin-body"></div>

    <div class="section-head"><h2>Password</h2></div>
    <form class="card" id="pw-form">
      <label for="new-pw">New admin password</label>
      ${passwordField("new-pw", "at least 6 characters", "new-password")}
      <div class="row-end"><button class="btn ghost" type="submit">Change password</button></div>
      <p class="muted tiny">Everyone signed in as admin on another device will need the new password.</p>
    </form>
  `;

  const body = view.querySelector("#admin-body");
  const paint = () => {
    const panel = PANELS.find((p) => p.id === activeSection);
    if (panel) return panel.render(body);
    return renderManager(body, SECTIONS.find((s) => s.id === activeSection));
  };

  view.querySelector("#admin-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-section]");
    if (!btn) return;
    activeSection = btn.dataset.section;
    view.querySelectorAll("#admin-tabs button")
        .forEach((b) => b.classList.toggle("on", b.dataset.section === activeSection));
    paint();
  });

  view.querySelector("#logout").addEventListener("click", () => {
    adminLogout();
    toast("Signed out of admin");
    render(view);
  });

  wireEyes(view);

  view.querySelector("#pw-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = view.querySelector("#new-pw");
    try {
      await changeAdminPassword(input.value);
      input.value = "";
      toast("Password changed");
    } catch (err) {
      toast(err.message || "Could not change password", true);
    }
  });

  paint();
}

function renderLogin(view) {
  view.innerHTML = `
    <h1>Admin</h1>
    <form class="card" id="login-form">
      <div class="card-title">Commissioner sign in</div>
      <label for="pw">Admin password</label>
      ${passwordField("pw", "", "current-password")}
      <div class="row-end"><button class="btn" type="submit">Sign in</button></div>
      <p class="muted tiny">The password is checked by the database, and stays valid on this device until you sign out.</p>
    </form>
    <div class="card">
      <div class="card-body muted">Everyone can read rules, keepers, history and events. Only an admin can change them.</div>
    </div>
  `;

  wireEyes(view);

  view.querySelector("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    try {
      const ok = await adminLogin(view.querySelector("#pw").value);
      if (ok) { toast("Welcome, commissioner"); render(view); }
      else    { toast("Wrong password", true); btn.disabled = false; }
    } catch (err) {
      toast(err.message || "Sign in failed", true);
      btn.disabled = false;
    }
  });
}
