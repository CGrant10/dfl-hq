/* =====================================================================
   share.js - get something out of the app and into a group chat
   ---------------------------------------------------------------------
   There is no way to post into a Facebook Messenger group chat from code.
   Messenger's API only lets a Page reply to somebody who messaged it
   first; the old group thread APIs are long gone, and no automation
   service has a way round it. So this does the thing that actually works:
   hands the result to the phone's own share sheet, where Messenger is one
   of the targets, along with everything else on the device.

   THE GESTURE RULE, which shapes this whole file.
   Safari will refuse navigator.share() if it is not called in the same
   task as the tap that started it - and "same task" does not survive an
   await. So nothing here is allowed to be async before the share call:

     - the crest is preloaded at import time, so drawing is synchronous
     - the PNG comes out of toDataURL(), which returns a string, NOT
       toBlob(), which hands it back in a callback a task later
     - base64 -> Blob is done by hand, synchronously

   That is why this looks more roundabout than it needs to. It is the
   difference between a share button that works on an iPhone and one that
   throws NotAllowedError.

   FALLBACKS, in order: the share sheet, then saving the image, then the
   clipboard. Desktop browsers mostly cannot share files, so on a laptop
   this quietly becomes "the PNG is in your downloads".
   ===================================================================== */

export const FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';

/* The crest, fetched once now so that drawing it later needs no await. */
const crest = new Image();
let crestReady = false;
crest.onload = () => { crestReady = true; };
crest.src = new URL("../icons/crest-512.png", import.meta.url).href;
export const crestImage = () => (crestReady ? crest : null);

/** A rounded rectangle path, since canvas has no such primitive everywhere. */
export function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Draw text, shrinking the font until it fits the width it is given. */
export function fitText(ctx, text, x, y, maxWidth, size, weight = 900, align = "center") {
  let px = size;
  ctx.textAlign = align;
  do {
    ctx.font = `${weight} ${px}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth || px <= 12) break;
    px -= 2;
  } while (px > 12);
  ctx.fillText(text, x, y);
  return px;
}

/*
  A data URL to a File, by hand and without a fetch, because fetch() would
  put an await between the tap and the share.
*/
function dataUrlToFile(dataUrl, filename) {
  const [head, b64] = dataUrl.split(",");
  const type = /:(.*?);/.exec(head)?.[1] || "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], filename, { type });
}

function saveFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.rel = "noopener";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Share a canvas as a PNG. Call this DIRECTLY inside a click handler.
 * @returns {"shared"|"cancelled"|"saved"} what actually happened
 */
export function shareCanvas(canvas, filename, { title, text } = {}) {
  const file = dataUrlToFile(canvas.toDataURL("image/png"), filename);

  if (navigator.canShare?.({ files: [file] })) {
    /* Deliberately not awaited: the promise is left to settle on its own so
       that this function stays synchronous for the caller and the gesture is
       never spent. A cancelled share is a normal outcome, not an error. */
    navigator.share({ files: [file], title, text }).catch((err) => {
      if (err?.name !== "AbortError") saveFile(file);
    });
    return "shared";
  }
  saveFile(file);
  return "saved";
}

/**
 * Share plain text and a link - the cheap version, and the desktop fallback.
 * @returns {"shared"|"copied"|"failed"}
 */
export function shareText({ title, text, url }) {
  const body = url ? `${text}\n${url}` : text;
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
    return "shared";
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(body).catch(() => {});
    return "copied";
  }
  return "failed";
}
