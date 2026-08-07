// =====================================================================
// arena/sprites.js - what a racer looks like.
// ---------------------------------------------------------------------
// THEMES is the whole extension point. A new theme is one entry here plus
// a folder of images; the race engine never learns about it.
//
// ON ASSETS
// There are no sprite files in this repo. Pokemon, and most of the good
// dinosaur and car art on the internet, is somebody else's copyright, and
// shipping it inside a league app would be borrowing trouble for no
// reason. So every slot is asset-AGNOSTIC:
//
//   1. if assets/arena/sprites/<theme>/<key>.png exists, it is used
//   2. if it does not, a drawn SVG silhouette stands in
//
// The fallbacks are real vector shapes tinted with the racer's colour, not
// emoji - the track looks finished out of the box, and dropping a PNG into
// the folder silently upgrades it. Nothing breaks either way, so you can
// add art one file at a time.
//
// Slot keys are deliberately generic ("fire", "water", "raptor") rather
// than trademarked names, so the folder can hold whatever you legally
// have. Rename the labels if you want; the keys are what the database
// stores.
// =====================================================================

export const SPRITE_ROOT = "assets/arena/sprites";

export const THEMES = {
  pokemon: {
    label: "Pokémon",
    slots: [
      { key: "fire",     label: "Fire"     },
      { key: "water",    label: "Water"    },
      { key: "grass",    label: "Grass"    },
      { key: "electric", label: "Electric" },
      { key: "psychic",  label: "Psychic"  },
      { key: "rock",     label: "Rock"     },
      { key: "flying",   label: "Flying"   },
      { key: "dark",     label: "Dark"     },
      { key: "ice",      label: "Ice"      },
      { key: "dragon",   label: "Dragon"   },
      { key: "ghost",    label: "Ghost"    },
      { key: "steel",    label: "Steel"    },
    ],
  },
  dinosaurs: {
    label: "Dinosaurs",
    slots: [
      { key: "trex",      label: "T-Rex"       },
      { key: "raptor",    label: "Raptor"      },
      { key: "tricera",   label: "Triceratops" },
      { key: "stego",     label: "Stegosaurus" },
      { key: "brachio",   label: "Brachiosaurus" },
      { key: "ankylo",    label: "Ankylosaurus" },
      { key: "ptero",     label: "Pterodactyl" },
      { key: "spino",     label: "Spinosaurus" },
      { key: "dilo",      label: "Dilophosaurus" },
      { key: "para",      label: "Parasaurolophus" },
      { key: "allo",      label: "Allosaurus"  },
      { key: "carno",     label: "Carnotaurus" },
    ],
  },
  ducks: {
    label: "Ducks",
    slots: [
      { key: "mallard",  label: "Mallard"   },
      { key: "rubber",   label: "Rubber"    },
      { key: "wood",     label: "Wood duck" },
      { key: "teal",     label: "Teal"      },
      { key: "pintail",  label: "Pintail"   },
      { key: "eider",    label: "Eider"     },
      { key: "merganser",label: "Merganser" },
      { key: "goldeneye",label: "Goldeneye" },
      { key: "widgeon",  label: "Widgeon"   },
      { key: "scaup",    label: "Scaup"     },
      { key: "gadwall",  label: "Gadwall"   },
      { key: "shoveler", label: "Shoveler"  },
    ],
  },
  cars: {
    label: "Cars",
    slots: [
      { key: "stock",    label: "Stock car" },
      { key: "f1",       label: "Formula"   },
      { key: "muscle",   label: "Muscle"    },
      { key: "rally",    label: "Rally"     },
      { key: "truck",    label: "Truck"     },
      { key: "kart",     label: "Kart"      },
      { key: "lemans",   label: "Le Mans"   },
      { key: "sprint",   label: "Sprint"    },
      { key: "drag",     label: "Dragster"  },
      { key: "buggy",    label: "Buggy"     },
      { key: "midget",   label: "Midget"    },
      { key: "modified", label: "Modified"  },
    ],
  },
};

export function themeKeys() {
  return Object.keys(THEMES);
}

export function themeLabel(key) {
  return THEMES[key]?.label || key;
}

export function slotsFor(theme) {
  return THEMES[theme]?.slots || [];
}

/** Where a real image for this slot would live, if you add one. */
export function spriteUrl(theme, key) {
  return `${SPRITE_ROOT}/${theme}/${key}.png`;
}

/**
 * Give every racer a different sprite.
 *
 * Walks the theme's slots in order from a random offset, so a re-roll
 * genuinely reshuffles rather than handing out the same first N every time.
 * With more racers than slots it wraps - a duplicate is better than an
 * empty lane.
 */
export function assignSprites(theme, count) {
  const slots = slotsFor(theme);
  if (!slots.length) return Array(count).fill("");

  const order = [...slots.keys()];
  for (let i = order.length - 1; i > 0; i--) {          // Fisher-Yates
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return Array.from({ length: count }, (_, i) => slots[order[i % order.length]].key);
}

// ----------------------------- fallbacks ------------------------------

/*
  Drawn stand-ins, one silhouette per theme, all on a 64x40 viewBox facing
  right so they sit on the track the same way an image would. `c` is the
  racer's colour and `d` a darker shade for detail, so twelve racers in the
  same theme are still telling apart at a glance.
*/
const SHAPES = {
  ducks: (c, d) => `
    <ellipse cx="30" cy="26" rx="18" ry="11" fill="${c}"/>
    <path d="M44 12a7 7 0 1 1 6 11l-6 2z" fill="${c}"/>
    <path d="M50 17h9l-2 4h-7z" fill="${d}"/>
    <circle cx="47" cy="15" r="1.6" fill="#0c1016"/>
    <path d="M22 22c6 3 12 3 18 0-3 7-15 7-18 0z" fill="${d}" opacity=".85"/>
    <path d="M14 30c-4 2-6 4-8 3 3 3 8 3 12 1z" fill="${d}"/>`,

  pokemon: (c, d) => `
    <path d="M18 34c-6-2-9-8-7-14s9-9 15-7l10-4c7-2 14 2 16 8s-1 13-8 15l-9 3z" fill="${c}"/>
    <path d="M40 9l7-5 1 8z" fill="${d}"/>
    <path d="M30 10l4-6 3 7z" fill="${d}"/>
    <circle cx="44" cy="20" r="2" fill="#0c1016"/>
    <path d="M14 28c-5 4-8 4-11 2 2 5 8 6 12 4z" fill="${d}"/>
    <path d="M26 33l3 6M36 33l3 6" stroke="${d}" stroke-width="3" stroke-linecap="round"/>`,

  dinosaurs: (c, d) => `
    <path d="M8 30c6-1 9-5 11-10 3-8 11-13 19-11 7 2 11 8 10 15l6 3-7 2-2 5-6-4-9 2-4 5-3-6-9 3z" fill="${c}"/>
    <path d="M26 9l4-5 2 6 5-5 1 6" fill="none" stroke="${d}" stroke-width="2.4" stroke-linejoin="round"/>
    <circle cx="45" cy="17" r="1.8" fill="#0c1016"/>
    <path d="M40 24l8 1-8 2z" fill="#0c1016" opacity=".6"/>
    <path d="M22 32l2 7M32 33l2 7" stroke="${d}" stroke-width="3.4" stroke-linecap="round"/>`,

  cars: (c, d) => `
    <path d="M6 28h52l-4-8-12-3-8-6H24l-4 9-14 2z" fill="${c}"/>
    <path d="M26 13h10l6 5H24z" fill="${d}"/>
    <rect x="4" y="26" width="56" height="4" rx="2" fill="${d}"/>
    <circle cx="18" cy="32" r="6" fill="#11161f"/>
    <circle cx="18" cy="32" r="2.4" fill="${d}"/>
    <circle cx="46" cy="32" r="6" fill="#11161f"/>
    <circle cx="46" cy="32" r="2.4" fill="${d}"/>`,
};

/** A darker version of a hex colour, for detail strokes. */
function darken(hex, amount = 0.45) {
  const m = /^#?([\da-f]{6})$/i.exec(String(hex || ""));
  if (!m) return "#0c1016";
  const n = parseInt(m[1], 16);
  const f = (shift) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `rgb(${f(16)},${f(8)},${f(0)})`;
}

/**
 * The markup for one racer.
 *
 * An <img> is attempted first; its onerror swaps in the drawn shape, so a
 * theme folder can be half full and the track still looks deliberate. The
 * fallback is inline SVG rather than a second request, so it costs nothing
 * when it is the common case.
 */
export function spriteMarkup(theme, key, color) {
  const c = color || "#2fbf5f";
  const shape = (SHAPES[theme] || SHAPES.ducks)(c, darken(c));
  const svg = `<svg class="racer-art" viewBox="0 0 64 40" aria-hidden="true">${shape}</svg>`;

  if (!key) return svg;

  // The image hides itself and reveals the sibling SVG if it cannot load.
  return `
    <img class="racer-img" src="${spriteUrl(theme, key)}" alt=""
         onerror="this.remove();this.parentNode.querySelector('.racer-art').classList.remove('hidden')">
    ${svg.replace('class="racer-art"', 'class="racer-art hidden"')}`;
}
