// =====================================================================
// inline.js - editing where the content lives.
// ---------------------------------------------------------------------
// A normal member sees the normal app. An admin sees the same app with
// small Add / Edit / Delete buttons sitting beside the thing they edit.
// There is no separate screen to walk to for routine content.
//
// A page opts in with three calls:
//
//   addControl("events", "Add event")   -> in the section heading
//   editControls("events", row)         -> on each card
//   wireInline(wrapper, () => render(view))
//
// All three are no-ops for anybody who is not signed in as admin, and the
// database refuses the writes regardless - see the "admin write" policies
// in schema.sql. Hiding the buttons is convenience, not security.
// =====================================================================

import { isAdmin, insertRow, updateRow, deleteRow, selectOne } from "./supabase.js";
import { specFor } from "./sections.js";
import { field, setValue, readForm, fillOptionsFrom } from "./form.js";
import { esc, toast } from "./ui.js";

/** True when this device may edit league content. */
export function canEdit() {
  return isAdmin();
}

/**
 * Edit + Delete for one row. Returns "" for non-admins, so pages can drop
 * this into their markup unconditionally.
 *
 * `del: false` leaves the Delete button off, for rows where removal is not
 * a page-level action - a member profile being the case in point, since
 * deleting the person whose page you are reading takes their votes, dues
 * and history references with them.
 */
export function editControls(table, row, { compact = false, del = true } = {}) {
  if (!canEdit()) return "";
  const spec = specFor(table);
  const name = spec?.label ? spec.label(row) : "";

  return `
    <div class="inline-admin ${compact ? "compact" : ""}">
      <button class="btn ghost small" data-inline-edit="${esc(table)}"
              data-id="${esc(row.id)}">Edit</button>
      ${del ? `<button class="btn danger small" data-inline-del="${esc(table)}"
              data-id="${esc(row.id)}" data-label="${esc(name)}">Delete</button>` : ""}
    </div>`;
}

/**
 * An Add button for a section.
 *
 * `preset` pre-fills fields the surrounding page already knows, so adding a
 * rule from the Trades tab lands in Trades rather than making the admin
 * pick the section they are already looking at.
 */
export function addControl(table, label, preset = null) {
  if (!canEdit()) return "";
  return `
    <button class="btn small inline-add" data-inline-add="${esc(table)}"
            ${preset ? `data-preset="${esc(JSON.stringify(preset))}"` : ""}>
      + ${esc(label || "Add")}
    </button>`;
}

/**
 * Listen for those buttons inside `root` and refresh the page after a save.
 *
 * `root` must be an element that is rebuilt on every render (a wrapper the
 * page just created), never #view - #view survives re-renders, so a
 * listener bound to it stacks up one copy per visit.
 */
export function wireInline(root, refresh) {
  if (!root || !canEdit()) return;

  root.addEventListener("click", (e) => {
    const add = e.target.closest("[data-inline-add]");
    const ed  = e.target.closest("[data-inline-edit]");
    const del = e.target.closest("[data-inline-del]");

    if (add) {
      e.preventDefault();
      openEditor(add.dataset.inlineAdd, null, parsePreset(add.dataset.preset), refresh);
    } else if (ed) {
      e.preventDefault();
      openEditor(ed.dataset.inlineEdit, ed.dataset.id, null, refresh);
    } else if (del) {
      e.preventDefault();
      removeRow(del.dataset.inlineDel, del.dataset.id, del.dataset.label, refresh);
    }
  });
}

function parsePreset(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ------------------------------- delete -------------------------------

async function removeRow(table, id, label, refresh) {
  const what = label ? `"${label}"` : "this";
  if (!confirm(`Delete ${what}? This cannot be undone.`)) return;
  try {
    await deleteRow(table, id);
    toast("Deleted");
    refresh?.();
  } catch (err) {
    toast(err.message || "Delete failed", true);
  }
}

// -------------------------------- dialog ------------------------------

/**
 * The Add / Edit sheet. Built fresh each time and removed on close, so
 * there is never a stale form hanging around in the DOM.
 */
export async function openEditor(table, id, preset, refresh) {
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
        ${spec.fields.map((f) => field(f, "i_")).join("")}
        <div class="row-end">
          <button type="button" class="btn ghost" data-close>Cancel</button>
          <button type="submit" class="btn">Save</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(host);

  const form = host.querySelector("#inline-form");

  // Existing values, then the page's presets, then plain defaults.
  spec.fields.forEach((f) => {
    if (row)                            setValue(form, f, row[f.name]);
    else if (preset?.[f.name] !== undefined) setValue(form, f, preset[f.name]);
    else if (f.default !== undefined)   setValue(form, f, f.default);
  });

  const close = () => {
    document.removeEventListener("keydown", onKey);
    host.remove();
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);

  host.querySelector("[data-close]").addEventListener("click", close);
  // Backdrop only - a click that started inside the card must not close it.
  host.addEventListener("click", (e) => { if (e.target === host) close(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const payload = readForm(form, spec.fields);
      if (id) await updateRow(table, id, payload);
      else    await insertRow(table, payload);
      toast(id ? "Saved" : "Added");
      close();
      refresh?.();
    } catch (err) {
      toast(err.message || "Save failed", true);
      btn.disabled = false;
    }
  });

  form.querySelector("input, textarea, select")?.focus();
}
