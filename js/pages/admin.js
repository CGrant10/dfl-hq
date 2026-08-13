// =====================================================================
// Admin - password gate, then only the things that genuinely need a
// central screen.
//
// Routine content editing does NOT live here any more. Announcements,
// polls, rules, keepers, events, history and side events are edited where
// they appear, with the buttons in inline.js. What is left is the work
// that has no natural home on a page:
//
//   Members     adding a person to the league, ordering the picker
//   Rule tabs   the sections rules are filed under
//   Finances    dues and payouts across every owner at once
//   Sleeper     syncing league history
//   Password    the admin password itself
//
// The password is checked by Postgres (see is_admin() in schema.sql), not
// by this file. Hiding these controls is only a convenience; the database
// is what actually refuses writes from non-admins.
// =====================================================================

import { adminLogin, adminLogout, isAdmin, changeAdminPassword, configured } from "../supabase.js";
import { renderManager } from "../crud.js";
import { specFor } from "../sections.js";
import { renderSleeperPanel } from "./admin_sleeper.js";
import { renderFinancePanel } from "./admin_finance.js";
import { esc, toast } from "../ui.js";

// The two structural lists that are still easier to manage as a table.
const TABLES = [
  { id: "members",         tab: "Members",   table: "members" },
  { id: "rule_categories", tab: "Rule tabs", table: "rule_categories" },
];

// Custom panels rather than single-table editors.
const PANELS = [
  { id: "finances", tab: "Fees", render: renderFinancePanel },
  { id: "sleeper",  tab: "Sleeper",  render: renderSleeperPanel },
];

let activeSection = "members";

// -------------------------------------------------------- password box

/*
  WHY THIS IS NOT AN <input type="password">

  There is one shared commissioner password for the whole league. A browser
  password manager treats any type="password" field as a personal login: it
  offers to save it, offers to fill it, and puts a "this password is weak"
  warning on it. None of that applies here, and all of it gets in the way.

  So the field is a normal text input that CSS masks instead. Chrome sees
  no credential, so it has nothing to save, fill or grade - while the
  characters are still hidden on screen. The data-*-ignore attributes cover
  the third-party managers, which go by their own markers rather than by the
  input type.

  Firefox has only supported -webkit-text-security recently, so when it is
  missing we fall back to a real password field. Masking the value matters
  more than silencing the prompt.
*/
const CAN_MASK = typeof CSS !== "undefined"
  && typeof CSS.supports === "function"
  && CSS.supports("-webkit-text-security", "disc");

/**
 * The admin password input, with an eye button that reveals what you typed.
 * Phone keyboards make blind password entry genuinely annoying.
 */
function passwordField(id, placeholder) {
  const shared = `id="${id}" required
    ${placeholder ? `placeholder="${esc(placeholder)}"` : ""}
    autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
    data-form-type="other" data-lpignore="true" data-1p-ignore data-bwignore
    data-protonpass-ignore="true"`;

  return `
    <div class="pwwrap">
      ${CAN_MASK
        ? `<input type="text" class="masked" name="dfl-admin-key" ${shared}>`
        : `<input type="password" name="dfl-admin-key" ${shared}>`}
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

/**
 * Wire every eye button inside a container.
 *
 * Bound to each button rather than delegated from `root`, because `root`
 * is #view, which survives re-renders - render() runs again on sign-in and
 * sign-out, so a delegated listener stacked up and fired twice per click,
 * flipping the field hidden -> shown -> hidden and appearing to do nothing.
 * The buttons themselves are rebuilt every render, so they cannot double up.
 */
function wireEyes(root) {
  root.querySelectorAll("button[data-eye]").forEach((btn) => {
    const input = root.querySelector("#" + btn.dataset.eye);
    if (!input) return;

    btn.addEventListener("click", () => {
      // Masked fields drop a class; the fallback still swaps the type.
      const show = CAN_MASK ? input.classList.contains("masked")
                            : input.type === "password";
      if (CAN_MASK) input.classList.toggle("masked", !show);
      else          input.type = show ? "text" : "password";

      btn.classList.toggle("on", show);
      btn.querySelector(".eye-slash").classList.toggle("hidden", !show);
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      input.focus();
    });
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
      ${[...TABLES, ...PANELS].map((s) => `
        <button data-section="${s.id}" class="${s.id === activeSection ? "on" : ""}">${esc(s.tab)}</button>
      `).join("")}
    </div>

    <div id="admin-body"></div>

    <div class="section-head"><h2>Password</h2></div>
    <form class="card" id="pw-form">
      <label for="new-pw">New admin password</label>
      ${passwordField("new-pw", "at least 6 characters")}
      <div class="row-end"><button class="btn ghost" type="submit">Change password</button></div>
    </form>
  `;

  const body = view.querySelector("#admin-body");
  const paint = () => {
    const panel = PANELS.find((p) => p.id === activeSection);
    if (panel) return panel.render(body);

    const entry = TABLES.find((t) => t.id === activeSection);
    const spec  = entry && specFor(entry.table);
    if (!spec) { body.innerHTML = ""; return; }
    return renderManager(body, spec);
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
      ${passwordField("pw", "")}
      <div class="row-end"><button class="btn" type="submit">Sign in</button></div>
    </form>
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
