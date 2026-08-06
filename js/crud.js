// =====================================================================
// crud.js - one reusable "manage a table" widget for the Admin page.
//
// Every admin section (announcements, polls, rules, ...) is just a list of
// field definitions handed to renderManager(). Add a field here and it
// shows up in the form, the list, and the save automatically.
//
// Field shape:
//   { name, label, type, options?, required?, placeholder?, default? }
// Types: text | textarea | number | date | select | checkbox | list
//   list  -> one item per line in a textarea, saved as a JSON array
// =====================================================================

import { selectAll, insertRow, updateRow, deleteRow } from "./supabase.js";
import { esc, empty, toArray, toast, errorBox, loading } from "./ui.js";

export async function renderManager(host, spec) {
  host.innerHTML = loading();

  let rows;
  try {
    rows = await selectAll(spec.table, { order: spec.order || "created_at", asc: !!spec.asc });
  } catch (err) {
    host.innerHTML = errorBox(err);
    return;
  }

  let editingId = null;

  host.innerHTML = `
    <form class="card" id="crud-form">
      <div class="card-title" id="crud-heading">Add ${esc(spec.singular)}</div>
      ${spec.fields.map(field).join("")}
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

// ---------------------------------------------------------------- form

function field(f) {
  const id  = `f_${f.name}`;
  const req = f.required ? "required" : "";
  const ph  = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : "";
  let input;

  switch (f.type) {
    case "textarea":
      input = `<textarea id="${id}" name="${f.name}" ${ph} ${req}></textarea>`;
      break;
    case "list":
      input = `<textarea id="${id}" name="${f.name}" ${ph} ${req}></textarea>`;
      break;
    case "number":
      input = `<input id="${id}" name="${f.name}" type="number" ${ph} ${req}>`;
      break;
    case "date":
      input = `<input id="${id}" name="${f.name}" type="date" ${req}>`;
      break;
    case "checkbox":
      return `<label style="display:flex;align-items:center;gap:8px;margin-top:12px">
                <input id="${id}" name="${f.name}" type="checkbox" style="width:auto">
                <span>${esc(f.label)}</span>
              </label>`;
    case "select":
      input = `<select id="${id}" name="${f.name}" ${req}>
                 ${f.options.map((o) => `<option value="${esc(o.value ?? o)}">${esc(o.label ?? o)}</option>`).join("")}
               </select>`;
      break;
    default:
      input = `<input id="${id}" name="${f.name}" type="text" ${ph} ${req}>`;
  }

  return `<label for="${id}">${esc(f.label)}</label>${input}`;
}

function setValue(form, f, value) {
  const el = form.elements[f.name];
  if (!el) return;
  if (f.type === "checkbox")   el.checked = value === undefined ? true : !!value;
  else if (f.type === "list")  el.value = toArray(value).join("\n");
  else if (f.type === "date")  el.value = value ? String(value).slice(0, 10) : "";
  else                         el.value = value ?? "";
}

function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    const el = form.elements[f.name];
    if (!el) continue;

    if (f.type === "checkbox") {
      out[f.name] = el.checked;
    } else if (f.type === "list") {
      out[f.name] = el.value.split("\n").map((s) => s.trim()).filter(Boolean);
    } else if (f.type === "number") {
      out[f.name] = el.value === "" ? null : Number(el.value);
    } else {
      out[f.name] = el.value.trim();
    }
  }
  return out;
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
