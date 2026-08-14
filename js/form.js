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
    case "datetime":
      input = `<input id="${id}" name="${f.name}" type="datetime-local" ${req}>`;
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
  else if (f.type === "datetime") el.value = toLocalInput(value);
  else                         el.value = value ?? "";
}

/*
  TIMEZONES, AND WHY THIS IS NOT A slice(0, 16).

  <input type="datetime-local"> has no timezone. Its value is whatever the
  clock on the wall says. The columns behind it are timestamptz, which the
  API hands back as UTC.

  So slicing the ISO string into the box would show a Central user 01:00 for
  something scheduled at 19:00 the evening before, and typing 19:00 would
  store 19:00 UTC - a broadcast item that appears six hours early and
  disappears six hours early. Both directions are converted explicitly.
*/
const pad = (n) => String(n).padStart(2, "0");

/** UTC out of the database -> what this device's clock calls that moment. */
export function toLocalInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** What the user typed on their clock -> the UTC instant it names. */
export function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(value);            // no Z: parsed as local, which is right
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
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
    } else if (f.type === "date") {
      /*
        An empty date is null, NOT "".

        Postgres rejects an empty string for a date column outright
        (22007 invalid input syntax), so leaving an optional date blank
        failed the whole insert - which is what stopped Arena events being
        created at all, and would equally have hit "date paid" on a dues row
        and the date on an expense.
      */
      out[f.name] = el.value || null;
    } else if (f.type === "datetime") {
      // Same empty-string-is-not-null rule as date, plus the UTC conversion.
      out[f.name] = fromLocalInput(el.value);
    } else {
      out[f.name] = el.value.trim();
    }

    /*
      A CLEARED NUMBER IS THE DEFAULT, NOT NULL.

      Both editors prefill f.default when adding, so this only bites when
      somebody selects a number and deletes it - but the columns it lands in
      (weight, sort_order, championships) are NOT NULL with a default, and
      Postgres rejects an explicit null against those. The user sees a
      constraint violation for having emptied a box.

      Only applies where the spec actually declares a default: an optional
      date with no default stays null, which is what null means there.
    */
    if (out[f.name] === null && f.default !== undefined) out[f.name] = f.default;
  }
  return out;
}
