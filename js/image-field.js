// =====================================================================
// image-field.js - "choose a picture" wherever the app used to say "URL".
// ---------------------------------------------------------------------
// One control, four places: the member's own DFL page, the Members admin
// form (profile / broadcast / look-alike / chaos), and a broadcast slide's
// backdrop. They all ended up asking for a URL, which meant every picture
// in this league lived on somebody else's server and half of them are gone.
//
// WHAT IT IS
//
// A file picker, a preview, and a hidden text input that holds the value the
// form saves. The hidden input is what makes this a drop-in: readForm() and
// setValue() treat it as an ordinary text field, so nothing about how a form
// saves had to change.
//
// A PASTED URL STILL WORKS. Ten years of rows hold http links and they keep
// working: the value is shown, described as external, and left alone unless
// somebody picks a file. Taking that away would have been a migration, and a
// picture that still loads is not a problem to solve.
//
// THE DELEGATED LISTENERS ARE REGISTERED ONCE, on the document, so a form does
// not have to remember to wire anything. crud.js, inline.js and the two
// hand-built panels all draw their markup as strings and hand it to innerHTML;
// anything requiring a per-form wiring call would have been forgotten in one
// of them, which is exactly how the URL field survived this long.
// =====================================================================

import { esc } from "./ui.js";
import {
  MAX_SOURCE_BYTES, PRESETS, QUALITY_LADDER,
  containBox, coverSquare, dataUriBytes, describeValue, fmtBytes,
} from "./image-shrink.js";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/avif";

/**
 * The control, as markup.
 *
 * @param {Object} o
 * @param {string} o.id     the hidden input's id, so a <label for> still works
 * @param {string} o.name   the column name - this is what the form reads
 * @param {string} o.value  current value: a data URI, an external URL, or ""
 * @param {string} o.preset "avatar" | "backdrop"
 * @param {string} o.attrs  extra attributes for the hidden input. The Broadcast
 *                 panel's override editor gathers its values by data-field
 *                 rather than through a <form>, so it needs its own hooks on
 *                 the element that actually holds the value.
 */
export function imageFieldHtml({ id, name, value = "", preset = "backdrop", attrs = "" }) {
  const v = String(value || "");
  const p = PRESETS[preset] || PRESETS.backdrop;
  return `
    <div class="imgf" data-imgf data-preset="${esc(preset)}">
      <input type="hidden" id="${esc(id)}" name="${esc(name)}" value="${esc(v)}" data-imgf-value ${attrs}>
      <div class="imgf-row">
        <span class="imgf-thumb${v ? "" : " is-empty"}" data-imgf-thumb>
          ${v ? `<img src="${esc(v)}" alt="" decoding="async">` : `<span class="imgf-none">No picture</span>`}
        </span>
        <div class="imgf-actions">
          <label class="btn ghost small imgf-pick">
            <input type="file" accept="${ACCEPT}" hidden data-imgf-file>
            ${v ? "Replace" : "Choose"} picture
          </label>
          <button type="button" class="btn ghost small" data-imgf-clear ${v ? "" : "hidden"}>Remove</button>
          <span class="muted tiny" data-imgf-note>${esc(describeValue(v))}</span>
        </div>
      </div>
      <details class="imgf-url">
        <summary class="muted tiny">Or paste a link</summary>
        <input type="text" placeholder="https://…" value="${esc(v.startsWith("data:") ? "" : v)}" data-imgf-url>
      </details>
      <div class="muted tiny imgf-hint">Shrunk to ${p.maxPx}px${p.square ? " square" : ""} on your device before it is saved. Nothing is uploaded until you save.</div>
    </div>`;
}

/**
 * Shrink a picked file to a data URI inside its preset's budget.
 *
 * TWO PASSES, and the second one is the important one. The quality ladder gets
 * a photograph under budget most of the time; when it does not - a busy image,
 * or a phone panorama - dropping quality further would make it ugly, so the
 * second pass halves the PIXELS instead and walks the ladder again. Fewer,
 * better pixels beats more, worse ones at these sizes.
 *
 * WebP with a JPEG fallback: canvas.toDataURL returns a PNG when it does not
 * know the type asked for, which would silently produce the 5x larger file this
 * whole module exists to avoid - so the result is checked, not trusted.
 */
export async function shrinkToDataUri(file, preset = "backdrop") {
  const p = PRESETS[preset] || PRESETS.backdrop;
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error(`That file is ${fmtBytes(file.size)}. The limit is ${fmtBytes(MAX_SOURCE_BYTES)}.`);
  }
  const bitmap = await createImageBitmap(file);
  try {
    let best = "";
    for (const px of [p.maxPx, Math.round(p.maxPx / 2)]) {
      const uri = encodeAt(bitmap, px, p);
      if (uri && (!best || dataUriBytes(uri) < dataUriBytes(best))) best = uri;
      if (best && dataUriBytes(best) <= p.budget) return best;
    }
    if (!best) throw new Error("That image could not be converted");
    return best;
  } finally { bitmap.close?.(); }
}

/** Draw at `px` and walk the quality ladder, returning the first that fits. */
function encodeAt(bitmap, px, p) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (p.square) {
    const { sx, sy, side } = coverSquare(bitmap.width, bitmap.height);
    canvas.width = canvas.height = Math.min(px, side);
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
  } else {
    const box = containBox(bitmap.width, bitmap.height, px);
    canvas.width = box.w; canvas.height = box.h;
    ctx.drawImage(bitmap, 0, 0, box.w, box.h);
  }
  let smallest = "";
  for (const q of QUALITY_LADDER) {
    /* A browser that cannot write WebP hands back a PNG, and a PNG of a
       photograph is the exact thing being avoided - so take JPEG instead,
       which every canvas can write and which is right for a photo. */
    let uri = canvas.toDataURL("image/webp", q);
    if (!uri.startsWith("data:image/webp")) uri = canvas.toDataURL("image/jpeg", q);
    if (!smallest || dataUriBytes(uri) < dataUriBytes(smallest)) smallest = uri;
    if (dataUriBytes(uri) <= p.budget) return uri;
  }
  return smallest;
}

// --------------------------------------------------------------- the wiring

/** Write a value into one control and redraw its preview. */
function apply(box, value) {
  const v = String(value || "");
  const hidden = box.querySelector("[data-imgf-value]");
  const thumb = box.querySelector("[data-imgf-thumb]");
  const note = box.querySelector("[data-imgf-note]");
  const clear = box.querySelector("[data-imgf-clear]");
  const pick = box.querySelector(".imgf-pick");
  if (hidden) {
    hidden.value = v;
    /* Both editors read values back off the form on submit, but the inline
       dialog also watches for changes to enable its Save button - so this has
       to look like a real edit, not a silent assignment. */
    hidden.dispatchEvent(new Event("input", { bubbles: true }));
    hidden.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (thumb) {
    thumb.classList.toggle("is-empty", !v);
    thumb.innerHTML = v
      ? `<img src="${esc(v)}" alt="" decoding="async">`
      : `<span class="imgf-none">No picture</span>`;
  }
  if (note) note.textContent = describeValue(v);
  if (clear) clear.hidden = !v;
  if (pick) {
    /* The label holds the file input, so only the trailing text node is the
       caption - replacing innerHTML here would throw the input away. */
    const caption = [...pick.childNodes].reverse().find((n) => n.nodeType === 3);
    if (caption) caption.textContent = ` ${v ? "Replace" : "Choose"} picture`;
  }
}

/**
 * Prefill one control from a row, by column name.
 *
 * setValue() in form.js cannot just assign to the hidden input: the preview,
 * the caption and the Remove button all have to follow, and only this module
 * knows about them.
 */
export function setImageValue(root, name, value) {
  const hidden = root?.querySelector?.(`[data-imgf-value][name="${CSS.escape(String(name))}"]`);
  const box = hidden?.closest("[data-imgf]");
  if (box) apply(box, value ?? "");
}

let wired = false;

/**
 * Register the document-level handlers. Idempotent, and called from every
 * module that can draw the control, so no page has to remember to.
 */
export function wireImageFields() {
  if (wired || typeof document === "undefined") return;
  wired = true;

  document.addEventListener("change", async (e) => {
    const input = e.target.closest?.("[data-imgf-file]");
    if (!input) return;
    const box = input.closest("[data-imgf]");
    const file = input.files?.[0];
    input.value = "";                      // so re-picking the same file fires again
    if (!box || !file) return;
    const note = box.querySelector("[data-imgf-note]");
    if (note) note.textContent = "Shrinking…";
    try {
      const uri = await shrinkToDataUri(file, box.dataset.preset || "backdrop");
      apply(box, uri);
    } catch (err) {
      if (note) note.textContent = err.message || "That image could not be read";
    }
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.("[data-imgf-clear]");
    if (!btn) return;
    e.preventDefault();
    apply(btn.closest("[data-imgf]"), "");
  });

  /* The pasted-link path. Applied on input rather than on a button, because a
     link box with its own Apply button is one more thing to forget to press. */
  document.addEventListener("input", (e) => {
    const url = e.target.closest?.("[data-imgf-url]");
    if (!url) return;
    apply(url.closest("[data-imgf]"), url.value.trim());
  });
}
