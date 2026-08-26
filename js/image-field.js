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
/* The allow-lists and the style string are the SAME ones the stage draws with,
   so the control cannot offer a framing the renderer will not honour. That
   module is pure constants with no imports of its own, which is why a generic
   control can borrow from it without dragging the broadcast in. */
import { IMAGE_FITS, IMAGE_X, IMAGE_Y, artworkStyle } from "./broadcast-artwork.js";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/avif";

/* =====================================================================
   FRAMING - "which part of this picture do you want kept?"
   ---------------------------------------------------------------------
   Opt-in, because only a broadcast slide has columns to put it in: pass
   framing:true on the field and the control grows a preview, a fit toggle
   and a 3x3 focus grid whose nine cells ARE the nine object-position values
   the stage allows. Everything else - an avatar, the look-alike picture -
   renders exactly as it did.

   IT IS A PICTURE, NOT A FORM. Cropping is the one decision on a slide that
   cannot be made from a dropdown reading "center / bottom", because the
   answer is "his face, which is up and to the left". So you click the part
   of the photo you want kept and the preview re-crops under your finger.

   The values still land in three ordinary hidden inputs named for their
   columns, so readForm() and setValue() in form.js treat this as three text
   fields and nothing about how a form saves had to change - the same trick
   that made the picture itself a drop-in.
   ===================================================================== */

const FRAME_FALLBACK = { fit: "cover", x: "center", y: "center" };

/* Nine cells, written the way somebody would say them out loud. */
const FOCUS_LABELS = {
  "left top": "Top left",       "center top": "Top",       "right top": "Top right",
  "left center": "Left",        "center center": "Middle", "right center": "Right",
  "left bottom": "Bottom left", "center bottom": "Bottom", "right bottom": "Bottom right",
};

/** Which column each part of the framing is saved into. */
function framingNames(framing) {
  if (!framing) return null;
  const f = framing === true ? {} : framing;
  return {
    fit: f.fit || "image_fit",
    x:   f.x   || "image_position_x",
    y:   f.y   || "image_position_y",
  };
}

function framingHtml(names) {
  const cells = ["top", "center", "bottom"].flatMap((y) =>
    ["left", "center", "right"].map((x) => {
      const key = `${x} ${y}`;
      const on = x === FRAME_FALLBACK.x && y === FRAME_FALLBACK.y;
      return `<button type="button" class="imgf-cell${on ? " is-on" : ""}"
        data-imgf-focus="${esc(key)}" aria-pressed="${on ? "true" : "false"}"
        title="${esc(FOCUS_LABELS[key])}"><span aria-hidden="true"></span>
        <span class="sr-only">${esc(FOCUS_LABELS[key])}</span></button>`;
    })).join("");
  return `
    <div class="imgf-frame" data-imgf-frame hidden>
      <input type="hidden" name="${esc(names.fit)}" value="${FRAME_FALLBACK.fit}" data-imgf-fit>
      <input type="hidden" name="${esc(names.x)}" value="${FRAME_FALLBACK.x}" data-imgf-x>
      <input type="hidden" name="${esc(names.y)}" value="${FRAME_FALLBACK.y}" data-imgf-y>
      <div class="imgf-frame-top">
        <span class="imgf-frame-title">How it sits on the slide</span>
        <span class="imgf-fits">
          <button type="button" class="imgf-fit is-on" data-imgf-set-fit="cover">Fill the slide</button>
          <button type="button" class="imgf-fit" data-imgf-set-fit="contain">Show all of it</button>
        </span>
      </div>
      <div class="imgf-frame-stage">
        <img alt="" decoding="async" draggable="false" data-imgf-frame-img>
        <div class="imgf-grid" data-imgf-grid>${cells}</div>
      </div>
      <div class="muted tiny imgf-frame-hint" data-imgf-frame-hint></div>
    </div>`;
}

/* What the grid is doing changes with the fit, so the line under it does too -
   the same nine cells mean "keep this bit" when the picture is cropped and
   "put it here" when the whole picture is shown inside the frame. */
const FRAME_HINTS = {
  cover: "Tap the part of the picture to keep. The rest is cropped off the edges of the slide.",
  contain: "The whole picture is shown. Tap where it should sit inside the slide.",
};

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
export function imageFieldHtml({ id, name, value = "", preset = "backdrop", attrs = "", framing = null }) {
  const v = String(value || "");
  const p = PRESETS[preset] || PRESETS.backdrop;
  const names = framingNames(framing);
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
      ${names ? framingHtml(names) : ""}
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
  paintFrame(box);
}

// ------------------------------------------------------------- the framing

/** Read the three hidden inputs back, through the same allow-lists the stage uses. */
function frameState(frame) {
  const val = (sel) => frame.querySelector(sel)?.value;
  const fit = val("[data-imgf-fit]"), x = val("[data-imgf-x]"), y = val("[data-imgf-y]");
  return {
    fit: IMAGE_FITS.has(fit) ? fit : FRAME_FALLBACK.fit,
    x: IMAGE_X.has(x) ? x : FRAME_FALLBACK.x,
    y: IMAGE_Y.has(y) ? y : FRAME_FALLBACK.y,
  };
}

/**
 * Redraw the preview and the two sets of buttons from the hidden inputs.
 *
 * One direction only: the inputs are the truth and everything visible is
 * derived from them, which is why a click, a prefill from a saved row and a
 * newly chosen picture all end up here rather than each keeping their own idea
 * of what is selected.
 */
function paintFrame(box) {
  const frame = box?.querySelector?.("[data-imgf-frame]");
  if (!frame) return;
  const value = box.querySelector("[data-imgf-value]")?.value || "";
  /* Nothing to frame until there is a picture, and an empty crop tool reads as
     a broken one. It appears the moment a picture is chosen. */
  frame.hidden = !value;
  const img = frame.querySelector("[data-imgf-frame-img]");
  if (img && value && img.getAttribute("src") !== value) img.setAttribute("src", value);
  if (!value) return;

  const state = frameState(frame);
  if (img) img.style.cssText = artworkStyle({ imageFit: state.fit, imageX: state.x, imageY: state.y });

  frame.querySelectorAll("[data-imgf-set-fit]").forEach((b) => {
    b.classList.toggle("is-on", b.dataset.imgfSetFit === state.fit);
  });
  const chosen = `${state.x} ${state.y}`;
  frame.querySelectorAll("[data-imgf-focus]").forEach((b) => {
    const on = b.dataset.imgfFocus === chosen;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  const hint = frame.querySelector("[data-imgf-frame-hint]");
  if (hint) hint.textContent = FRAME_HINTS[state.fit] || "";
}

/**
 * Write one part of the framing and redraw.
 *
 * The input/change pair is the same one apply() fires, and for the same reason:
 * the inline dialog enables Save by watching for edits, and a crop the user can
 * see but cannot save would be worse than no crop tool at all.
 */
function setFrame(frame, patch) {
  const put = (sel, v) => {
    const el = frame.querySelector(sel);
    if (!el || v === undefined) return;
    el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  put("[data-imgf-fit]", patch.fit);
  put("[data-imgf-x]", patch.x);
  put("[data-imgf-y]", patch.y);
  paintFrame(frame.closest("[data-imgf]"));
}

/**
 * Prefill one framing column from a saved row, by column name.
 *
 * Same contract as setImageValue(): form.js knows the column, this module knows
 * which of the nine cells that lights up.
 */
export function setImageFraming(root, name, value) {
  const input = root?.querySelector?.(`[data-imgf-frame] input[name="${CSS.escape(String(name))}"]`);
  if (!input) return;
  const frame = input.closest("[data-imgf-frame]");
  const allow = input.hasAttribute("data-imgf-fit") ? IMAGE_FITS
              : input.hasAttribute("data-imgf-x")   ? IMAGE_X
              : IMAGE_Y;
  const fallback = input.hasAttribute("data-imgf-fit") ? FRAME_FALLBACK.fit
                 : input.hasAttribute("data-imgf-x")   ? FRAME_FALLBACK.x
                 : FRAME_FALLBACK.y;
  /* A legacy row saved before these columns existed holds null, and an empty
     hidden input would be sent back as "" against a CHECK constraint. */
  input.value = allow.has(value) ? value : fallback;
  paintFrame(frame?.closest("[data-imgf]"));
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

  /* The framing, and both handlers do the same thing: change one hidden input
     and let paintFrame() work out what the control should now look like. */
  document.addEventListener("click", (e) => {
    const fit = e.target.closest?.("[data-imgf-set-fit]");
    if (fit) {
      e.preventDefault();
      setFrame(fit.closest("[data-imgf-frame]"), { fit: fit.dataset.imgfSetFit });
      return;
    }
    const cell = e.target.closest?.("[data-imgf-focus]");
    if (!cell) return;
    e.preventDefault();
    const [x, y] = String(cell.dataset.imgfFocus).split(" ");
    setFrame(cell.closest("[data-imgf-frame]"), { x, y });
  });

  /* The pasted-link path. Applied on input rather than on a button, because a
     link box with its own Apply button is one more thing to forget to press. */
  document.addEventListener("input", (e) => {
    const url = e.target.closest?.("[data-imgf-url]");
    if (!url) return;
    apply(url.closest("[data-imgf]"), url.value.trim());
  });
}
