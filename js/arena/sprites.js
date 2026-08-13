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
    HOENN. The third generation, as twelve racers.

    THE ART IS OURS AND THE NAMES ARE NOT, and that split is deliberate.
    Every silhouette below is the app's own drawing - the same inline SVG
    set every other theme uses - picked so the field reads as twelve
    different shapes from across the track. Nothing from anybody's game
    ships in this repo, which is a public one.

    If you want the real sprites, they are yours to supply: drop them in
    assets/arena/sprites/gen3/<key>.png and add "gen3/<key>" to SPRITE_FILES
    at the top of this file. spriteMarkup() prefers a registered file over
    the drawing, so a half-finished set mixes cleanly and each racer
    upgrades the moment its file lands.
  */
  gen3: {
    label: "Hoenn (Gen 3)",
    slots: [
      { key: "treecko",  label: "Treecko",   art: "leafy"    },
      { key: "torchic",  label: "Torchic",   art: "biped"    },
      { key: "mudkip",   label: "Mudkip",    art: "finned"   },
      { key: "sceptile", label: "Sceptile",  art: "leafy"    },
      { key: "blaziken", label: "Blaziken",  art: "biped"    },
      { key: "swampert", label: "Swampert",  art: "theropod" },
      { key: "rayquaza", label: "Rayquaza",  art: "longneck" },
      { key: "groudon",  label: "Groudon",   art: "theropod" },
      { key: "kyogre",   label: "Kyogre",    art: "finned"   },
      { key: "metagross",label: "Metagross", art: "plated"   },
      { key: "salamence",label: "Salamence", art: "raptor"   },
      { key: "absol",    label: "Absol",     art: "horned"   },
    ],
  },
  pokemon: {
    label: "Types",
    slots: [
      { key: "fire",     label: "Fire",     art: "biped"  },
      { key: "water",    label: "Water",    art: "finned" },
      { key: "grass",    label: "Grass",    art: "leafy"  },
      { key: "electric", label: "Electric", art: "spiky"  },
      { key: "psychic",  label: "Psychic",  art: "leafy"  },
      { key: "rock",     label: "Rock",     art: "biped"  },
      { key: "flying",   label: "Flying",   art: "finned" },
      { key: "dark",     label: "Dark",     art: "spiky"  },
      { key: "ice",      label: "Ice",      art: "finned" },
      { key: "dragon",   label: "Dragon",   art: "biped"  },
      { key: "ghost",    label: "Ghost",    art: "leafy"  },
      { key: "steel",    label: "Steel",    art: "spiky"  },
    ],
  },
  dinosaurs: {
    label: "Dinosaurs",
    slots: [
      { key: "trex",    label: "T-Rex",          art: "theropod" },
      { key: "raptor",  label: "Raptor",         art: "raptor"   },
      { key: "tricera", label: "Triceratops",    art: "horned"   },
      { key: "stego",   label: "Stegosaurus",    art: "plated"   },
      { key: "brachio", label: "Brachiosaurus",  art: "longneck" },
      { key: "ankylo",  label: "Ankylosaurus",   art: "plated"   },
      { key: "ptero",   label: "Pterodactyl",    art: "raptor"   },
      { key: "spino",   label: "Spinosaurus",    art: "plated"   },
      { key: "dilo",    label: "Dilophosaurus",  art: "raptor"   },
      { key: "para",    label: "Parasaurolophus",art: "longneck" },
      { key: "allo",    label: "Allosaurus",     art: "theropod" },
      { key: "carno",   label: "Carnotaurus",    art: "horned"   },
    ],
  },
  ducks: {
    label: "Ducks",
    slots: [
      { key: "mallard",   label: "Mallard",   art: "duck"    },
      { key: "rubber",    label: "Rubber",    art: "rubber"  },
      { key: "wood",      label: "Wood duck", art: "crested" },
      { key: "teal",      label: "Teal",      art: "duck"    },
      { key: "pintail",   label: "Pintail",   art: "pintail" },
      { key: "eider",     label: "Eider",     art: "crested" },
      { key: "merganser", label: "Merganser", art: "crested" },
      { key: "goldeneye", label: "Goldeneye", art: "duck"    },
      { key: "widgeon",   label: "Widgeon",   art: "pintail" },
      { key: "scaup",     label: "Scaup",     art: "rubber"  },
      { key: "gadwall",   label: "Gadwall",   art: "pintail" },
      { key: "shoveler",  label: "Shoveler",  art: "duck"    },
    ],
  },
  cars: {
    label: "Cars",
    slots: [
      { key: "stock",    label: "Stock car", art: "stock"  },
      { key: "f1",       label: "Formula",   art: "open"   },
      { key: "muscle",   label: "Muscle",    art: "muscle" },
      { key: "rally",    label: "Rally",     art: "stock"  },
      { key: "truck",    label: "Truck",     art: "truck"  },
      { key: "kart",     label: "Kart",      art: "open"   },
      { key: "lemans",   label: "Le Mans",   art: "muscle" },
      { key: "sprint",   label: "Sprint",    art: "open"   },
      { key: "drag",     label: "Dragster",  art: "muscle" },
      { key: "buggy",    label: "Buggy",     art: "truck"  },
      { key: "midget",   label: "Midget",    art: "open"   },
      { key: "modified", label: "Modified",  art: "stock"  },
    ],
  },
};

export function themeKeys() { return Object.keys(THEMES); }
export function themeLabel(key) { return THEMES[key]?.label || key; }
export function slotsFor(theme) { return THEMES[theme]?.slots || []; }

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
const ART = {
  // ---- ducks ----
  duck: (c, d) => `
    <ellipse cx="29" cy="27" rx="18" ry="10.5" fill="${c}"/>
    <path d="M43 13a7 7 0 1 1 6 11l-6 2z" fill="${c}"/>
    <path d="M49 18h9l-2 4h-7z" fill="${d}"/>
    <circle cx="46" cy="16" r="1.5" fill="#0c1016"/>
    <path d="M21 23c6 3 12 3 18 0-3 7-15 7-18 0z" fill="${d}" opacity=".85"/>
    <path d="M13 31c-4 2-6 4-8 3 3 3 8 3 12 1z" fill="${d}"/>`,

  rubber: (c, d) => `
    <ellipse cx="30" cy="28" rx="17" ry="9.5" fill="${c}"/>
    <circle cx="44" cy="17" r="8.5" fill="${c}"/>
    <path d="M51 15h8l-2 4h-6z" fill="${d}"/>
    <circle cx="46" cy="14" r="1.6" fill="#0c1016"/>
    <path d="M16 26c5 2 10 2 15 0-2 6-12 6-15 0z" fill="${d}" opacity=".7"/>`,

  crested: (c, d) => `
    <ellipse cx="29" cy="27" rx="17.5" ry="10" fill="${c}"/>
    <path d="M43 13a7 7 0 1 1 6 11l-6 2z" fill="${c}"/>
    <path d="M40 8l5 5-8 1z" fill="${d}"/>
    <path d="M49 18h9l-2 4h-7z" fill="${d}"/>
    <circle cx="46" cy="16" r="1.5" fill="#0c1016"/>
    <path d="M14 30c-4 2-7 4-9 3 3 3 9 3 13 1z" fill="${d}"/>`,

  pintail: (c, d) => `
    <ellipse cx="30" cy="27" rx="16" ry="9" fill="${c}"/>
    <path d="M43 12a6.5 6.5 0 1 1 6 11l-6 2z" fill="${c}"/>
    <path d="M49 17h9l-2 4h-7z" fill="${d}"/>
    <circle cx="46" cy="15" r="1.5" fill="#0c1016"/>
    <path d="M15 27l-11-6 3 9-3 6z" fill="${d}"/>`,

  // ---- creatures ----
  biped: (c, d) => `
    <path d="M19 33c-6-2-9-8-7-14s9-9 15-7l10-4c7-2 14 2 16 8s-1 13-8 15l-9 3z" fill="${c}"/>
    <path d="M40 9l7-5 1 8z" fill="${d}"/>
    <path d="M30 10l4-6 3 7z" fill="${d}"/>
    <circle cx="44" cy="20" r="2" fill="#0c1016"/>
    <path d="M15 28c-5 4-8 4-11 2 2 5 8 6 12 4z" fill="${d}"/>
    <path d="M26 33l3 6M36 33l3 6" stroke="${d}" stroke-width="3" stroke-linecap="round"/>`,

  finned: (c, d) => `
    <path d="M12 22c8-9 22-11 32-6 6 3 9 8 8 12-1 5-7 8-15 8-11 0-21-6-25-14z" fill="${c}"/>
    <path d="M30 10l3 7-9-1z" fill="${d}"/>
    <path d="M12 22l-8-5 2 9-4 5z" fill="${d}"/>
    <circle cx="45" cy="23" r="1.9" fill="#0c1016"/>
    <path d="M24 28c6 3 13 3 19 0" stroke="${d}" stroke-width="2.2" fill="none"/>`,

  leafy: (c, d) => `
    <ellipse cx="32" cy="25" rx="19" ry="12" fill="${c}"/>
    <path d="M30 8c6-3 11 0 12 5-6 2-11 0-12-5z" fill="${d}"/>
    <circle cx="45" cy="22" r="2" fill="#0c1016"/>
    <path d="M16 32l4 6M28 34l3 6M40 33l3 6" stroke="${d}" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M13 24c-5 0-8 2-10 5 4 2 9 1 12-2z" fill="${d}"/>`,

  spiky: (c, d) => `
    <path d="M17 32c-6-3-8-10-4-15s12-7 17-3l12-3c6-1 11 4 11 9s-4 10-10 11l-11 2z" fill="${c}"/>
    <path d="M24 11l2-8 5 7 4-7 2 8z" fill="${d}"/>
    <circle cx="46" cy="22" r="1.9" fill="#0c1016"/>
    <path d="M14 27l-9-3 4 6-3 5z" fill="${d}"/>
    <path d="M27 34l2 6M37 33l2 6" stroke="${d}" stroke-width="3" stroke-linecap="round"/>`,

  // ---- dinosaurs ----
  theropod: (c, d) => `
    <path d="M8 30c6-1 9-5 11-10 3-8 11-13 19-11 7 2 11 8 10 15l6 3-7 2-2 5-6-4-9 2-4 5-3-6-9 3z" fill="${c}"/>
    <circle cx="45" cy="17" r="1.8" fill="#0c1016"/>
    <path d="M40 24l8 1-8 2z" fill="#0c1016" opacity=".6"/>
    <path d="M22 32l2 7M32 33l2 7" stroke="${d}" stroke-width="3.4" stroke-linecap="round"/>`,

  raptor: (c, d) => `
    <path d="M6 26c7 1 11-2 14-7 4-6 11-9 17-6 5 3 6 9 3 13l5 2-6 2-3 4-5-3-8 3-3 5-3-6-11 1z" fill="${c}"/>
    <path d="M35 8l6-4-1 7z" fill="${d}"/>
    <circle cx="42" cy="14" r="1.6" fill="#0c1016"/>
    <path d="M20 30l3 8M30 31l3 8" stroke="${d}" stroke-width="3" stroke-linecap="round"/>`,

  horned: (c, d) => `
    <path d="M9 29c7 0 11-4 13-9 3-7 11-11 18-9 7 2 11 7 10 13l4 2-6 2-2 4-6-3-9 2-4 5-3-6-11 2z" fill="${c}"/>
    <path d="M44 12l8-4-4 8z" fill="${d}"/>
    <path d="M36 11l3-7 3 7z" fill="${d}"/>
    <circle cx="44" cy="19" r="1.7" fill="#0c1016"/>
    <path d="M23 31l2 7M33 32l2 7" stroke="${d}" stroke-width="3.2" stroke-linecap="round"/>`,

  plated: (c, d) => `
    <path d="M7 28c8 1 12-3 15-8 4-6 11-9 18-7 6 2 10 7 9 12l5 2-7 2-2 4-6-3-9 2-4 5-3-6-12 1z" fill="${c}"/>
    <path d="M18 17l3-7 3 7zM26 14l3-7 3 7zM34 13l3-7 3 7z" fill="${d}"/>
    <circle cx="45" cy="20" r="1.7" fill="#0c1016"/>
    <path d="M24 31l2 7M34 32l2 7" stroke="${d}" stroke-width="3.2" stroke-linecap="round"/>`,

  longneck: (c, d) => `
    <ellipse cx="24" cy="27" rx="17" ry="10" fill="${c}"/>
    <path d="M36 24c2-8 4-13 8-16 4-3 8-1 8 3s-4 5-6 8-3 7-3 10z" fill="${c}"/>
    <circle cx="49" cy="11" r="1.6" fill="#0c1016"/>
    <path d="M7 27c-4 1-6 3-7 6 4 1 8-1 10-4z" fill="${d}"/>
    <path d="M18 34l2 6M29 34l2 6" stroke="${d}" stroke-width="3.2" stroke-linecap="round"/>`,

  // ---- cars ----
  stock: (c, d) => `
    <path d="M6 27h52l-4-8-12-3-8-6H24l-4 9-14 2z" fill="${c}"/>
    <path d="M26 12h10l6 5H24z" fill="${d}"/>
    <rect x="4" y="25" width="56" height="4" rx="2" fill="${d}"/>
    <circle cx="18" cy="31" r="6" fill="#11161f"/><circle cx="18" cy="31" r="2.4" fill="${d}"/>
    <circle cx="46" cy="31" r="6" fill="#11161f"/><circle cx="46" cy="31" r="2.4" fill="${d}"/>`,

  open: (c, d) => `
    <path d="M4 27h56l-6-6H36l-4-5h-8l-2 5H10z" fill="${c}"/>
    <rect x="30" y="12" width="9" height="5" rx="2" fill="${d}"/>
    <path d="M50 15h10v4H50z" fill="${d}"/>
    <circle cx="16" cy="30" r="7" fill="#11161f"/><circle cx="16" cy="30" r="2.6" fill="${d}"/>
    <circle cx="48" cy="30" r="7" fill="#11161f"/><circle cx="48" cy="30" r="2.6" fill="${d}"/>`,

  muscle: (c, d) => `
    <path d="M4 28h56l-3-10-14-4-9-5H22l-5 10-13 3z" fill="${c}"/>
    <path d="M24 11h11l7 6H22z" fill="${d}"/>
    <path d="M8 20h8v4H8z" fill="${d}"/>
    <circle cx="19" cy="32" r="6.5" fill="#11161f"/><circle cx="19" cy="32" r="2.5" fill="${d}"/>
    <circle cx="47" cy="32" r="6.5" fill="#11161f"/><circle cx="47" cy="32" r="2.5" fill="${d}"/>`,

  truck: (c, d) => `
    <path d="M4 26h20V12h16l8 14h10v5H4z" fill="${c}"/>
    <path d="M26 14h11l6 10H26z" fill="${d}"/>
    <circle cx="16" cy="32" r="7" fill="#11161f"/><circle cx="16" cy="32" r="2.7" fill="${d}"/>
    <circle cx="46" cy="32" r="7" fill="#11161f"/><circle cx="46" cy="32" r="2.7" fill="${d}"/>`,
};

/** A darker version of a hex colour, for detail strokes. */
function darken(hex, amount = 0.45) {
  const m = /^#?([\da-f]{6})$/i.exec(String(hex || ""));
  if (!m) return "#0c1016";
  const n = parseInt(m[1], 16);
  const f = (shift) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `rgb(${f(16)},${f(8)},${f(0)})`;
}

/** The first slot's art style, used when a racer has no sprite assigned. */
function defaultArt(theme) {
  return slotsFor(theme)[0]?.art || "duck";
}

/** Which drawing this theme/key uses. */
function artFor(theme, key) {
  const slot = slotsFor(theme).find((s) => s.key === key);
  return ART[slot?.art] ? slot.art : defaultArt(theme);
}

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

  const draw = ART[artFor(theme, key)] || ART.duck;
  return `<svg class="racer-art" viewBox="0 0 64 40" aria-hidden="true">${draw(c, darken(c))}</svg>`;
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
