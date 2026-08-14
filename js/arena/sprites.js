// =====================================================================
// arena/sprites.js - what a racer looks like.
// ---------------------------------------------------------------------
// Every racer is DRAWN, as inline SVG. No image files ship with this app
// and none are needed: each theme has several distinct silhouettes, and a
// slot maps to one of them, so twelve racers in one theme are twelve
// different shapes rather than one shape in twelve colours.
//
// WHY NOT <img> BY DEFAULT
// The first version always emitted an <img> pointing at
// assets/arena/sprites/<theme>/<key>.png and fell back to a hidden SVG via
// an onerror handler. Two things were wrong with that. The handler called
// this.remove() BEFORE reading this.parentNode, so the parent was already
// null and the unhide threw - which made every racer disappear the moment a
// sprite key was assigned. And with no files present it fired twelve 404s
// per race to reach a fallback that was always going to be used.
//
// So an image is only attempted when it has been explicitly registered in
// SPRITE_FILES below. Nothing is registered, so nothing 404s. Add a PNG and
// register it and that one racer starts using it.
// =====================================================================

import { CHARACTERS, dflSpriteMarkup } from "./dfl-sprites.js";

export const SPRITE_ROOT = "assets/arena/sprites";

/**
 * Theme/slot pairs that have a real image file, as "theme/key".
 *
 * Deliberately empty. Drop a file in assets/arena/sprites/<theme>/<key>.png
 * and add "<theme>/<key>" here to use it. Anything not listed stays drawn,
 * so the two can be mixed while a set is half finished.
 */
export const SPRITE_FILES = new Set([
  // "gen3/treecko",
  // "gen3/mudkip",
  // "dinosaurs/trex",
]);

export const THEMES = {
  /*
    THE DFL. Twelve original characters, drawn as pixels and defined in
    dfl-sprites.js - which is also where a thirteenth would go.

    THIS REPLACED TWO THEMES. There was a "pokemon" one whose slots were
    elemental types, and a "gen3" one that used real Hoenn names. The art was
    always this app's own, but a theme named after somebody else's game is a
    theme that invites their sprite sheets into the repo. Nothing in here
    belongs to anybody but the league now.

    The slots are READ from the roster rather than typed out a second time,
    so adding a character is one edit in one file.
  */
  dfl: {
    label: "DFL Originals",
    slots: CHARACTERS.map((c) => ({ key: c.id, label: c.label, art: "pixel", blurb: c.blurb })),
  },
};

/* Events created before the rename still hold these in arena_events.theme,
   and participants still hold their old slot keys. Mapping the theme keeps
   those rows drawing something deliberate instead of falling back to a duck. */
const LEGACY_THEMES = {
  pokemon: "dfl", gen3: "dfl", ducks: "dfl", dinosaurs: "dfl", cars: "dfl",
};
export const resolveTheme = (t) => (THEMES[t] ? t : (LEGACY_THEMES[t] || t));

export function themeKeys() { return Object.keys(THEMES); }
export function themeLabel(key) { return THEMES[resolveTheme(key)]?.label || key; }
export function slotsFor(theme) { return THEMES[resolveTheme(theme)]?.slots || []; }

/** Where a real image for this slot would live, if you add one. */
export function spriteUrl(theme, key) {
  return `${SPRITE_ROOT}/${theme}/${key}.png`;
}

/**
 * Give every racer a different sprite.
 *
 * Walks the theme's slots from a shuffled order, so a re-roll genuinely
 * reshuffles. With more racers than slots it wraps.
 */
export function assignSprites(theme, count) {
  const slots = slotsFor(theme);
  if (!slots.length) return Array(count).fill("");

  const order = [...slots.keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return Array.from({ length: count }, (_, i) => slots[order[i % order.length]].key);
}

// ------------------------------ the art -------------------------------

/*
  All shapes are drawn on a 64x40 box facing right, so any of them can drop
  into a lane and sit the same way. `c` is the racer's colour and `d` a
  darker shade for detail, which is what keeps twelve racers legible even
  when two of them share a silhouette.
*/
/**
 * The markup for one racer.
 *
 * Order of preference:
 *   1. `image` - a PNG the commissioner uploaded for this racer, held on the
 *      participant row as a data: URI
 *   2. a file registered in SPRITE_FILES for this theme/key
 *   3. the built-in drawing for the slot
 *
 * There is no onerror fallback and deliberately so: the previous version
 * relied on one, got the order of operations wrong, and blanked every racer.
 * A data: URI cannot 404, and (2) is opt-in, so nothing here can silently
 * render nothing.
 */
export function spriteMarkup(theme, key, color, image) {
  const c = color || "#2fbf5f";

  if (image) {
    // Escape only what would break out of the attribute. A data: URI is
    // base64 so it contains none of it, but the value comes from the
    // database and is treated as untrusted all the same.
    const safe = String(image).replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return `<img class="racer-img" src="${safe}" alt="">`;
  }

  if (key && SPRITE_FILES.has(`${theme}/${key}`)) {
    return `<img class="racer-img" src="${spriteUrl(theme, key)}" alt="">`;
  }

  /* One theme, one renderer. Every racer is a DFL character now, so an
     unrecognised theme key still lands here rather than on a duck. */
  return dflSpriteMarkup(key, c);
}

// --------------------------- uploaded images --------------------------

/** The box an uploaded racer is redrawn into: the same 8:5 as the drawings. */
export const SPRITE_PX = { w: 128, h: 80 };

/** How large an uploaded file may be before it is even decoded. */
export const MAX_SPRITE_UPLOAD = 12 * 1024 * 1024;

/**
 * Redraw a picked file as a small transparent PNG, returned as a data: URI.
 *
 * CONTAIN, not crop: a duck photographed wide should end up a small wide
 * duck, not a duck with its head cut off. The spare space stays transparent,
 * so the sprite still sits on the track properly whatever shape it came in.
 *
 * 128x80 is twice the size it is drawn at in the app and a little over what
 * the broadcast uses, so it stays sharp on a stream without carrying a phone
 * photo's worth of bytes in every page load.
 */
export async function toSpritePng(file, { w = SPRITE_PX.w, h = SPRITE_PX.h } = {}) {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const scale = Math.min(w / bitmap.width, h / bitmap.height);
    const dw = Math.round(bitmap.width * scale);
    const dh = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, Math.round((w - dw) / 2), Math.round((h - dh) / 2), dw, dh);

    return canvas.toDataURL("image/png");
  } finally {
    bitmap.close?.();
  }
}
