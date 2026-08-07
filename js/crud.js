// =====================================================================
// crud.js - one reusable "manage a whole table" screen.
//
// Routine content editing now happens inline on the pages themselves (see
// inline.js). This is what remains for the two structural lists that are
// genuinely easier to work with as a table: members and rule tabs. Both
// are about adding people and ordering things, not about writing content.
//
// The field definitions live in sections.js and are shared with the
// inline editor, so a field added there appears in both.
// =====================================================================

import { insertRow, updateRow, deleteRow, selectAll } from "./supabase.js";
import { field, setValue, readForm, fillOptionsFrom } from "./form.js";
import { esc, empty, toast, errorBox, loading } from "./ui.js";

export async function renderManager(host, spec) {
  host.innerHTML = loading();

  let rows;
  try {
    rows = await selectAll(spec.table, { order: spec.order || "created_at", asc: !!spec.asc });
    await fillOptionsFrom(spec.fields);
  } catch (err) {
    host.innerHTML = errorBox(err);
    return;
  }

  let editingId = null;

  host.innerHTML = `
    <form class="card" id="crud-form">
      <div class="card-title" id="crud-heading">Add ${esc(spec.singular)}</div>
      ${spec.fields.map((f) => field(f, "f_")).join("")}
      <div class="row-end">
        <button type="button" class="btn ghost hidden" id="crud-cancel">Cancel</button>
        <button type="submit" class="btn" id="crud-save">Save</button>
      </div>
    </form>
    <div id="crud-list">${list(rows, spec)}</div>
  `;

  const form    = host.querySelector("#crud-form");
  const heading = host.querySelector("#crud-heading");
  const cancel  = host.querySelector("#crud-cancel");

  function resetForm() {
    editingId = null;
    form.reset();
    spec.fields.forEach((f) => {
      if (f.default !== undefined) setValue(form, f, f.default);
    });
    heading.textContent = `Add ${spec.singular}`;
    cancel.classList.add("hidden");
  }

  resetForm();

  // ---- save (add or update) ----
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = host.querySelector("#crud-save");
    btn.disabled = true;
    try {
      const payload = readForm(form, spec.fields);
      if (editingId) await updateRow(spec.table, editingId, payload);
      else           await insertRow(spec.table, payload);
      toast(editingId ? "Saved" : "Added");
      renderManager(host, spec);
    } catch (err) {
      toast(err.message || "Save failed", true);
      btn.disabled = false;
    }
  });

  cancel.addEventListener("click", resetForm);

  // ---- edit / delete ----
  host.querySelector("#crud-list").addEventListener("click", async (e) => {
    const editBtn = e.target.closest("button[data-edit]");
    const delBtn  = e.target.closest("button[data-del]");

    if (editBtn) {
      const row = rows.find((r) => String(r.id) === editBtn.dataset.edit);
      if (!row) return;
      editingId = row.id;
      spec.fields.forEach((f) => setValue(form, f, row[f.name]));
      heading.textContent = `Edit ${spec.singular}`;
      cancel.classList.remove("hidden");
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (delBtn) {
      const row = rows.find((r) => String(r.id) === delBtn.dataset.del);
      if (!row) return;
      if (!confirm(`Delete "${spec.label(row)}"? This cannot be undone.`)) return;
      try {
        await deleteRow(spec.table, row.id);
        toast("Deleted");
        renderManager(host, spec);
      } catch (err) {
        toast(err.message || "Delete failed", true);
      }
    }
  });
}

// ---------------------------------------------------------------- list

function list(rows, spec) {
  if (!rows.length) return empty(`No ${spec.plural} yet.`);
  return rows.map((row) => `
    <div class="card">
      <div class="card-title">${esc(spec.label(row))}</div>
      ${spec.sub ? `<div class="card-meta" style="margin:0">${esc(spec.sub(row))}</div>` : ""}
      <div class="row-end">
        <button class="btn ghost small" data-edit="${row.id}">Edit</button>
        <button class="btn danger small" data-del="${row.id}">Delete</button>
      </div>
    </div>`).join("");
}
