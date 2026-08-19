// =====================================================================
// inline.js - editing where the content lives.
// =====================================================================

import { isAdmin, isMasterAdmin, hasPermission, insertRow, updateRow, deleteRow, selectOne } from "./supabase.js";
import { specFor } from "./sections.js";
import { field, fieldSet, setValue, readForm, fillOptionsFrom } from "./form.js";
import { hiddenCards, setCardHidden } from "./settings.js";
import { esc, toast } from "./ui.js";

/*
  WHICH PERMISSION GOVERNS WHICH TABLE.

  A table that is NOT in here falls through to isMasterAdmin() below - the
  shared Admin password and nothing else. That default is the right way round
  (deny, not allow) but it is also completely silent, and the Admin screen
  offers TWELVE permission checkboxes without saying that some of them govern
  no table at all.

  That is how "a commissioner cannot edit a race" happened: `arena_events` was
  missing, so canEdit("arena_events") returned isMasterAdmin(), the editor
  refused with "You do not have permission to edit that", and it refused on the
  CLIENT - before any policy was consulted. Adding the database policy changed
  nothing, because the request was never sent.

  STILL UNMAPPED, and therefore still master-admin-only however the checkbox is
  set: golf, sportsbook, fees, sleeper. Those four permissions currently grant
  nothing anywhere. `members` is mapped here but has no matching database
  policy, so it passes this gate and is then refused by RLS - which at least
  now reports itself, see updateRow() in supabase.js.
*/
const TABLE_PERMISSION = {
  announcements: "announcements",
  events: "calendar",
  side_events: "calendar",
  polls: "polls",
  keepers: "keepers",
  rules: "rules",
  rule_categories: "rules",
  history: "history",
  members: "members",
  /* The Arena. arena_commissioner_policy.sql carries the matching policies. */
  arena_events: "broadcast",
  arena_participants: "broadcast",
  arena_results: "broadcast",
  broadcast_items: "broadcast",
};

/** No table means "does this device have any privileged session?". A named
    table means "may this commissioner edit THIS kind of league content?". */
export function canEdit(table = null) {
  if (!table) return isAdmin();
  const permission = TABLE_PERMISSION[table];
  return permission ? hasPermission(permission) : isMasterAdmin();
}

const cardKey = (table, id) => `${table}:${id}`;

export function isHidden(table, id) {
  return hiddenCards().has(cardKey(table, id));
}

export function visible(table, rows) {
  if (canEdit()) return rows || [];
  return (rows || []).filter((r) => r?.id == null || !isHidden(table, r.id));
}

export function hiddenClass(table, row) {
  return row && isHidden(table, row.id) ? "is-hidden" : "";
}

export function editControls(table, row, { compact = false, del = true } = {}) {
  if (!canEdit(table)) return "";
  const spec = specFor(table);
  const name = spec?.label ? spec.label(row) : "";
  const hidden = isHidden(table, row.id);

  return `
    <div class="inline-admin ${compact ? "compact" : ""}">
      ${hidden ? `<span class="hidden-tag">Hidden</span>` : ""}
      <button class="btn ghost small" data-inline-edit="${esc(table)}"
              data-id="${esc(row.id)}">Edit</button>
      ${isMasterAdmin() ? `<button class="btn ghost small" data-inline-hide="${esc(table)}"
              data-id="${esc(row.id)}" data-hide="${hidden ? "0" : "1"}">
        ${hidden ? "Show" : "Hide"}
      </button>` : ""}
      ${del ? `<button class="btn danger small" data-inline-del="${esc(table)}"
              data-id="${esc(row.id)}" data-label="${esc(name)}">Delete</button>` : ""}
    </div>`;
}

export function addControl(table, label, preset = null) {
  if (!canEdit(table)) return "";
  return `
    <button class="btn small inline-add" data-inline-add="${esc(table)}"
            ${preset ? `data-preset="${esc(JSON.stringify(preset))}"` : ""}>
      + ${esc(label || "Add")}
    </button>`;
}

export function wireInline(root, refresh) {
  if (!root || !isAdmin()) return;

  root.addEventListener("click", (e) => {
    const add  = e.target.closest("[data-inline-add]");
    const ed   = e.target.closest("[data-inline-edit]");
    const del  = e.target.closest("[data-inline-del]");
    const hide = e.target.closest("[data-inline-hide]");

    if (add) {
      e.preventDefault();
      openEditor(add.dataset.inlineAdd, null, parsePreset(add.dataset.preset), refresh);
    } else if (ed) {
      e.preventDefault();
      openEditor(ed.dataset.inlineEdit, ed.dataset.id, null, refresh);
    } else if (hide) {
      e.preventDefault();
      toggleHidden(hide.dataset.inlineHide, hide.dataset.id, hide.dataset.hide === "1", refresh);
    } else if (del) {
      e.preventDefault();
      removeRow(del.dataset.inlineDel, del.dataset.id, del.dataset.label, refresh);
    }
  });
}

function saveError(err) {
  const code = err?.code || "";
  const msg = err?.message || "Save failed";

  if (code === "42501" || /row-level security/i.test(msg)) {
    return "Your commissioner account does not have permission for that change";
  }
  if (code === "22007" || /invalid input syntax for type date/i.test(msg)) {
    return "That date is not valid";
  }
  if (code === "23505") return "That already exists";
  if (/schema cache|does not exist/i.test(msg)) {
    return "That table is missing — run its schema SQL in Supabase";
  }
  return msg;
}

function parsePreset(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function toggleHidden(table, id, hide, refresh) {
  if (!isMasterAdmin()) return;
  try {
    await setCardHidden(cardKey(table, id), hide);
    toast(hide ? "Hidden from members" : "Visible again");
    refresh?.();
  } catch (err) {
    toast(/app_settings/.test(err.message || "")
      ? "Run settings_schema.sql in Supabase to hide cards"
      : (err.message || "Could not change that"), true);
  }
}

async function removeRow(table, id, label, refresh) {
  if (!canEdit(table)) return;
  const what = label ? `"${label}"` : "this";
  if (!confirm(`Delete ${what}? This cannot be undone.`)) return;
  try {
    await deleteRow(table, id);
    toast("Deleted");
    refresh?.();
  } catch (err) {
    toast(saveError(err), true);
  }
}

export async function openEditor(table, id, preset, refresh) {
  if (!canEdit(table)) { toast("You do not have permission to edit that", true); return; }
  const spec = specFor(table);
  if (!spec) { toast(`Nothing is set up to edit ${table}`, true); return; }

  let row = null;
  try {
    if (id) row = await selectOne(table, id);
    await fillOptionsFrom(spec.fields);
  } catch (err) {
    toast(err.message || "Could not open the editor", true);
    return;
  }

  const host = document.createElement("div");
  host.className = "overlay";
  host.innerHTML = `
    <div class="overlay-card wide" role="dialog" aria-modal="true">
      <h2>${esc(id ? `Edit ${spec.singular}` : `Add ${spec.singular}`)}</h2>
      <form id="inline-form">
        ${fieldSet(spec.fields, "i_")}
        <div class="row-end">
          <button type="button" class="btn ghost" data-close>Cancel</button>
          <button type="submit" class="btn">Save</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(host);

  const form = host.querySelector("#inline-form");
  spec.fields.forEach((f) => {
    if (row) setValue(form, f, row[f.name]);
    else if (preset?.[f.name] !== undefined) setValue(form, f, preset[f.name]);
    else if (f.default !== undefined) setValue(form, f, f.default);
  });

  const close = () => {
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("hashchange", close);
    host.remove();
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  window.addEventListener("hashchange", close);

  host.querySelector("[data-close]").addEventListener("click", close);
  host.addEventListener("click", (e) => { if (e.target === host) close(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const payload = readForm(form, spec.fields);
      if (id) await updateRow(table, id, payload);
      else await insertRow(table, payload);
      toast(id ? "Saved" : "Added");
      close();
      refresh?.();
    } catch (err) {
      toast(saveError(err), true);
      btn.disabled = false;
    }
  });

  form.querySelector("input, textarea, select")?.focus();
}
