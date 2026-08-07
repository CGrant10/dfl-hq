// =====================================================================
// form.js - turning a field spec into a form, and back again.
// ---------------------------------------------------------------------
// Lifted out of crud.js so the same field definitions drive two things:
//
//   crud.js    the full "manage a table" screen on the Admin page
//   inline.js  the little Edit dialog that opens on the page itself
//
// Field shape:
//   { name, label, type, options?, optionsFrom?, required?, placeholder?, default? }
// Types: text | textarea | number | date | select | checkbox | list
//   list  -> one item per line in a textarea, saved as a JSON array
//
// A select can take its choices from another table instead of a fixed
// list, which is how owner profiles pick a synced Sleeper user:
//   optionsFrom: { table: "sleeper_users", value: "sleeper_user_id",
//                  label: "display_name", order: "display_name" }
// =====================================================================

import { selectAll } from "./supabase.js";
import { esc, toArray } from "./ui.js";

/** Turn any optionsFrom fields into a plain options list before drawing. */
export async function fillOptionsFrom(fields) {
  for (const f of fields) {
    if (!f.optionsFrom) continue;
    const { table, value, label, order } = f.optionsFrom;

    let rows = [];
    try {
      rows = await selectAll(table, { order: order || label, asc: true });
    } catch {
      // A missing table should not take the whole form down - the rest of
      // the fields still work, and the placeholder says what to do.
      f.options = [{ value: "", label: `— ${table} not set up yet —` }];
      continue;
    }

    f.options = rows.map((r) => ({ value: r[value], label: r[label] || r[value] }));
    if (!f.options.length) f.options = [{ value: "", label: "— nothing to choose yet —" }];
  }
}

/**
 * One labelled input.
 *
 * `prefix` keeps the element ids unique per form. The Admin page can have a
 * manager form and an inline dialog open at the same time, and two inputs
 * sharing an id makes the <label for> point at whichever came first.
 */
export function field(f, prefix = "f_") {
  const id  = `${prefix}${f.name}`;
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

export function setValue(form, f, value) {
  const el = form.elements[f.name];
  if (!el) return;
  if (f.type === "checkbox")   el.checked = value === undefined ? true : !!value;
  else if (f.type === "list")  el.value = toArray(value).join("\n");
  else if (f.type === "date")  el.value = value ? String(value).slice(0, 10) : "";
  else                         el.value = value ?? "";
}

export function readForm(form, fields) {
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
