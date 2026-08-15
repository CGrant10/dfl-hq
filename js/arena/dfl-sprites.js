/* =====================================================================
   arena/dfl-sprites.js - the DFL's own little universe
   ---------------------------------------------------------------------
   Twelve original characters, drawn as PIXELS, owned by this league.

   WHAT THIS REPLACES AND WHY

   The Arena shipped a theme keyed "pokemon" whose slots were elemental
   types, and a later one keyed "gen3" that used real Hoenn names. The art
   was always this app's own, but the names were not, and a theme called
   Pokémon is a theme that invites somebody to drop ripped sprite sheets
   into it. So the names are ours now, the characters are ours, and there is
   nothing in here anybody else owns.

   WHY PIXELS AND NOT MORE VECTOR SILHOUETTES

   The existing ART set is smooth curves - fine, but it reads as clip art at
   32px. A pixel grid is the opposite: it is designed FOR small, the edges
   stay crisp at any zoom, and it carries the handheld-RPG feeling the rest
   of the app's typography is already borrowing from sports broadcast.

   WHY NOT PNG FILES

   No build step, no 404s, no cache to bust, no binary in the repo, and it
   scales to a 1080px broadcast stage without a second asset. Each character
   below is about 300 bytes of text.

   HOW A CHARACTER IS DRAWN

   A grid of 24x15 - exactly the 8:5 the Arena's lanes already reserve - and
   one character per pixel:

     .  transparent      D  outline        K  body
     S  shade            W  highlight      E  eye
     A  accent           L  THE LANE COLOUR

   L is the trick that keeps twelve racers apart. Each character has its own
   palette, but one slot is handed the racer's lane colour at draw time, so
   a field is twelve DIFFERENT creatures that are still colour-coded to
   their lane. Identity and legibility, without painting the same shape
   twelve times.

   Rows are run-length merged into one <path> per colour, so a sprite is
   five or six nodes rather than 360 rects. Twelve racers in a live race is
   then about seventy nodes, not four thousand.

   ADDING ONE. Append to CHARACTERS. That is the whole procedure: the
   registry below is the single source of ids, names and art, and the Arena
   reads the roster from it rather than from a list typed out somewhere else.
   ===================================================================== */

export const GRID_W = 24, GRID_H = 15;

/*
  THE ROSTER.

  id        stored in arena_participants.sprite - CHANGING ONE ORPHANS DATA
  label     what the picker and the lane list call them
  blurb     one line of personality, shown on hover/title
  palette   the character's own colours; L is replaced by the lane colour
  px        24 rows... no: 15 rows of 24 characters
*/
export const CHARACTERS = [
  {
    id: "emberrat", label: "Emberrat", blurb: "Small, on fire, unbothered.",
    palette: { D: "#2a1206", K: "#e0572b", S: "#a83415", W: "#ffffff", E: "#2a1206", A: "#ffb02e" },
    px: [
      "........A...A...........",
      ".......AAA.AAA..........",
      "........AAAAA...........",
      "......DDDDDDDD..........",
      ".....DKKKKKKKKD.........",
      ".....DKWWKKWWKD.........",
      ".....DKWEKKWEKD.........",
      ".....DKKKKKKKKD.........",
      "....DDLLLLLLLLDD........",
      "....DLLLLLLLLLLD...AA...",
      "....DLLLLLLLLLLDDAAA....",
      "....DLSSLLLLSSLDAA......",
      "....DDDDDDDDDDDD........",
      ".....DKKD..DKKD.........",
      ".....DDDD..DDDD.........",
    ],
  },
  {
    id: "sparkpup", label: "Sparkpup", blurb: "Chews cables. Regrets nothing.",
    palette: { D: "#0d1a2e", K: "#5ec8f5", S: "#2a7fb8", W: "#ffffff", E: "#0d1a2e", A: "#fff35c" },
    px: [
      ".....A.......A..........",
      "....AA.......AA.........",
      "....DDDDDDDDDDD.........",
      "...DKKKKKKKKKKKD........",
      "...DKKKKKKKKKKKD........",
      "...DKWWKKKKKWWKD........",
      "...DKWEKKKKKWEKD........",
      "...DKKKKAAAKKKKD........",
      "...DDLLLLLLLLLDD........",
      "....DLLLLLLLLLD....AA...",
      "....DLLLLLLLLLDDDDAA....",
      "....DLSSLLLSSLDAAA......",
      "....DDDDDDDDDDD.........",
      ".....DKKD.DKKD..........",
      ".....DDDD.DDDD..........",
    ],
  },
  {
    id: "tinplate", label: "Tin Plate", blurb: "All armour, no plan.",
    palette: { D: "#141a22", K: "#9aa7b4", S: "#5d6a78", W: "#ffffff", E: "#ff5a4a", A: "#e2e8ee" },
    px: [
      "........AAAA............",
      "......DDDDDDDD..........",
      ".....DAAAAAAAAD.........",
      ".....DKKKKKKKKD.........",
      ".....DKEEKKEEKD.........",
      ".....DKKKKKKKKD.........",
      "....DDKKSSSSKKDD........",
      "....DLLLLLLLLLLD........",
      "...DLLLLLLLLLLLLD.......",
      "...DLLSSLLLLSSLLD.......",
      "...DLLLLLLLLLLLLD.......",
      "...DDLLLLLLLLLLDD.......",
      "....DDDDDDDDDDDD........",
      ".....DKKD..DKKD.........",
      ".....DDDD..DDDD.........",
    ],
  },
  {
    id: "boogey", label: "Boogey", blurb: "Not scary. Very committed.",
    palette: { D: "#1b1330", K: "#cdbdf5", S: "#8f79c9", W: "#ffffff", E: "#1b1330", A: "#a88ce0" },
    px: [
      "........................",
      "......DDDDDDDD..........",
      ".....DKKKKKKKKD.........",
      "....DKKKKKKKKKKD........",
      "....DKWWKKKKWWKD........",
      "....DKWEKKKKWEKD........",
      "....DKKKKKKKKKKD........",
      "....DKKKSSSSKKKD........",
      "....DLLLLLLLLLLD........",
      "....DLLLLLLLLLLD........",
      "....DLLLLLLLLLLD........",
      "....DLLLLLLLLLLD........",
      "....DLDDLDDLDDLD........",
      ".....DD.DD.DD.D.........",
      "........................",
    ],
  },
  {
    id: "cobble", label: "Cobble", blurb: "Solid. Slow. Correct.",
    palette: { D: "#1d1710", K: "#9c7f5c", S: "#6b543a", W: "#ffffff", E: "#1d1710", A: "#c9ae88" },
    px: [
      "........................",
      "......DDDDDDDD..........",
      ".....DKAAKKAAKD.........",
      "....DKKKKKKKKKKD........",
      "....DKWWKKKKWWKD........",
      "....DKWEKKKKWEKD........",
      "....DKKKKKKKKKKD........",
      "...DDKKSSKKSSKKDD.......",
      "...DLLLLLLLLLLLLD.......",
      "...DLLLLLLLLLLLLD.......",
      "...DLLSSLLLLSSLLD.......",
      "...DDLLLLLLLLLLDD.......",
      "....DDDDDDDDDDDD........",
      "....DKKKD..DKKKD........",
      "....DDDDD..DDDDD........",
    ],
  },
  {
    id: "gloop", label: "Gloop", blurb: "Was a liquid. Still is, mostly.",
    palette: { D: "#0d2415", K: "#4cc26a", S: "#2b8544", W: "#ffffff", E: "#0d2415", A: "#b6f5c6" },
    px: [
      "........................",
      "........DDDD............",
      "......DDKAAKDD..........",
      ".....DKKKKKKKKD.........",
      "....DKKWWKKWWKKD........",
      "....DKKWEKKWEKKD........",
      "....DKKKKKKKKKKD........",
      "...DKKKKSSSSKKKKD.......",
      "...DLLLLLLLLLLLLD.......",
      "..DLLLLLLLLLLLLLLD......",
      "..DLLLLLLLLLLLLLLD......",
      "..DLSSLLLLLLLLSSLD......",
      "..DDLLLLLLLLLLLLDD......",
      "...DDDDDDDDDDDDDD.......",
      "........................",
    ],
  },
  {
    id: "squawk", label: "Squawk", blurb: "Loud opinions, small brain.",
    palette: { D: "#14202a", K: "#3fb8c4", S: "#22757f", W: "#ffffff", E: "#14202a", A: "#ff9b2e" },
    px: [
      ".......AA...............",
      "......AA................",
      "......DDDDDDD...........",
      ".....DKKKKKKKD..........",
      ".....DKWWKKKKDAA........",
      ".....DKWEKKKKDAAA.......",
      ".....DKKKKKKKDAA........",
      "....DDKKKKKKKDD.........",
      "....DLLLLLLLLLD.........",
      "....DLLLLLLLLLD.........",
      "....DLLLLLLLLLD.........",
      "....DLSSLLLSSLD.........",
      "....DDDDDDDDDDD.........",
      ".....DAAD.DAAD..........",
      ".....DDDD.DDDD..........",
    ],
  },
  {
    id: "wyrmlet", label: "Wyrmlet", blurb: "One day: dragon. Today: this.",
    palette: { D: "#1a1030", K: "#8c5cf0", S: "#5a34a8", W: "#ffffff", E: "#1a1030", A: "#4ce0a8" },
    px: [
      "......A....A............",
      ".....AA....AA...........",
      "......DDDDDD............",
      ".....DKKKKKKD...........",
      "....DKKKKKKKKD..........",
      "....DKWWKKWWKD..........",
      "....DKWEKKWEKD..........",
      "....DKKKKKKKKD..........",
      "...DDLLLLLLLLDD.........",
      "...DLLLLLLLLLLD...AAA...",
      "...DLLLLLLLLLLDDDAAA....",
      "...DLSSLLLLSSLDAAA......",
      "...DDDDDDDDDDDD.........",
      "....DKKD..DKKD..........",
      "....DDDD..DDDD..........",
    ],
  },
  {
    id: "divot", label: "Divot", blurb: "Took a mulligan on being born.",
    palette: { D: "#12220f", K: "#f2f5f0", S: "#b9c2b4", W: "#12220f", E: "#f2f5f0", A: "#3fa055" },
    px: [
      "........................",
      "......DDDDDDDD..........",
      ".....DKSKKKKSKD.........",
      "....DKKKKKKKKKKD........",
      "....DKEWKKKKEWKD........",
      "....DKEWKKKKEWKD........",
      "....DKKSKKKKSKKD........",
      "....DKKKKKKKKKKD........",
      "....DDLLLLLLLLDD........",
      "....DLLLLLLLLLLD........",
      "....DLLLLLLLLLLD........",
      "....DLSSLLLLSSLD........",
      "....DDDDDDDDDDDD........",
      "...AAAAAD..DAAAAA.......",
      "........................",
    ],
  },
  {
    id: "puckhead", label: "Puckhead", blurb: "Dropped the gloves immediately.",
    palette: { D: "#0b0d10", K: "#3a4048", S: "#22262c", W: "#ffffff", E: "#ff5a4a", A: "#d9dee5" },
    px: [
      "........................",
      "....DDDDDDDDDDDD........",
      "...DAAAAAAAAAAAAD.......",
      "...DKKKKKKKKKKKKD.......",
      "...DKEEKKKKKKEEKD.......",
      "...DKKKKKKKKKKKKD.......",
      "...DAAAAAAAAAAAAD.......",
      "....DDDDDDDDDDDD........",
      "....DLLLLLLLLLLD........",
      "....DLLLLLLLLLLD...AA...",
      "....DLSSLLLLSSLDDDAA....",
      "....DDDDDDDDDDDDAA......",
      ".....DKKD..DKKD.........",
      ".....DDDD..DDDD.........",
      "........................",
    ],
  },
  {
    id: "sudsy", label: "Sudsy", blurb: "The reason the draft runs late.",
    palette: { D: "#2b1a05", K: "#e8a838", S: "#a8741c", W: "#ffffff", E: "#2b1a05", A: "#fff3cf" },
    px: [
      "......AAAAAA............",
      ".....AAAAAAAA...........",
      "....DDDDDDDDDD..........",
      "....DKKKKKKKKD..........",
      "....DKWWKKWWKD..........",
      "....DKWEKKWEKD..........",
      "....DKKKKKKKKD..........",
      "....DKKSSSSKKD..........",
      "...DDLLLLLLLLDD.........",
      "...DLLLLLLLLLLD.DDDD....",
      "...DLLLLLLLLLLDDAAAD....",
      "...DLSSLLLLSSLDDAAAD....",
      "...DDDDDDDDDDDD.DDDD....",
      "....DKKD..DKKD..........",
      "....DDDD..DDDD..........",
    ],
  },
  {
    id: "commish", label: "The Commish", blurb: "Makes the rules. Ignores them.",
    palette: { D: "#1a0d10", K: "#f0d5b8", S: "#c2a184", W: "#ffffff", E: "#1a0d10", A: "#e5011b" },
    px: [
      "....DDDDDDDDDD..........",
      "...DAAAAAAAAAAD.........",
      "..DAAAAAAAAAAAAD........",
      "...DDDDDDDDDDDD.........",
      "....DKKKKKKKKD..........",
      "....DKWEKKWEKD..........",
      "....DKKKKKKKKD..........",
      "....DKKSSSSKKD..........",
      "...DDLLLLLLLLDD.........",
      "...DLLLLLLLLLLD.........",
      "...DLLLLLLLLLLD.........",
      "...DLSSLLLLSSLD.........",
      "...DDDDDDDDDDDD.........",
      "....DKKD..DKKD..........",
      "....DDDD..DDDD..........",
    ],
  },

  {
    id: "zaplet", label: "Zaplet", blurb: "Pocket-sized thunder with zero patience.",
    palette: { D: "#10172d", K: "#5b8cff", S: "#3151a4", W: "#ffffff", E: "#10172d", A: "#ffe45b" },
    px: [
      "......A.........A.......",
      ".....AAA.......AAA......",
      "......DDDDDDDDD.........",
      ".....DKKKKKKKKKD........",
      "....DKKWWKKKWWKKD.......",
      "....DKKWEKKKWEKKD.......",
      "....DKKKKAAAKKKKD.......",
      "...DDKKKKKKKKKKKDD......",
      "...DLLLLLLLLLLLLLD......",
      "...DLLSSLLLLLSSLLD......",
      "...DLLLLLLLLLLLLLD..AA..",
      "...DDLLLLLLLLLLLDD.AAA..",
      "....DDDDDDDDDDDDD...A...",
      ".....DKKD...DKKD........",
      ".....DDDD...DDDD........",
    ],
  },
  {
    id: "tuxfool", label: "Tux Fool", blurb: "Dressed for dinner. Prepared for nothing.",
    palette: { D: "#151515", K: "#f2d0aa", S: "#b88d69", W: "#ffffff", E: "#151515", A: "#58b8ff" },
    px: [
      "....DDDDDDDDDD..........",
      "...DKKKKKKKKKKD.........",
      "..DKKKKKKKKKKKKD........",
      "...DDDDDDDDDDDD.........",
      "....DKWWKKWWKD..........",
      "....DKWEKKWEKD..........",
      "....DKKKAAKKKD..........",
      "...DDLLLLLLLLDD.........",
      "...DLLLLAALLLLD.........",
      "...DLLLAAAALLLD.........",
      "...DLLLLAALLLLD.........",
      "...DLSSLLLLSSLD.........",
      "...DDDDDDDDDDDD.........",
      "....DKKD..DKKD..........",
      "....DDDD..DDDD..........",
    ],
  },
  {
    id: "snackstack", label: "Snackstack", blurb: "Soft steps. Emergency crackers.",
    palette: { D: "#20172b", K: "#8759b8", S: "#563574", W: "#ffffff", E: "#20172b", A: "#62d49b" },
    px: [
      "......DDDDDDDD..........",
      ".....DKKKKKKKKKD........",
      "....DKKKKKKKKKKKD.......",
      "....DKKWWKKKKWWKD.......",
      "....DKKWEKKKKWEKD.......",
      "....DKKKKAAAAKKKD.......",
      "...DDKKKKKKKKKKKDD......",
      "..DDLLLLLLLLLLLLLDD.....",
      "..DLLLLLLLLLLLLLLLD.....",
      "..DLLLAAALLLAAALLLD.....",
      "..DLLLLLLLLLLLLLLLD.....",
      "..DDLSSLLLLLLSSLLDD.....",
      "...DDDDDDDDDDDDDD.......",
      "....DKKKD..DKKKD........",
      "....DDDDD..DDDDD........",
    ],
  },
  {
    id: "saffronsage", label: "Saffron Sage", blurb: "Calm mind. Impossibly quick feet.",
    palette: { D: "#26160c", K: "#d88932", S: "#9b591c", W: "#ffffff", E: "#26160c", A: "#f3c44f" },
    px: [
      "......AAAAAAAA..........",
      "....AAAAAAAAAAAA........",
      "...AAAAADDDDAAAAA.......",
      "....DDDDDDDDDDDD........",
      "....DKKKKKKKKKKD........",
      "....DKWEKKKKWEKD........",
      "....DKKKKKKKKKKD........",
      "....DKKSSSSSSKKD........",
      "...DDLLLLLLLLLLDD.......",
      "...DLLLLLLLLLLLLD.......",
      "...DLLLAAALLAAALLD......",
      "...DLSSLLLLLLSSLD.......",
      "...DDDDDDDDDDDDDD.......",
      "....DKKD....DKKD........",
      "....DDDD....DDDD........",
    ],
  },
  {
    id: "smokejack", label: "Smokejack", blurb: "Carries six gadgets. Understands two.",
    palette: { D: "#101317", K: "#454d57", S: "#282e35", W: "#ffffff", E: "#ff6b5f", A: "#b9c4cf" },
    px: [
      "........AA..............",
      ".......AAAA.............",
      "....DDDDDDDDDDDD........",
      "...DKKKKKKKKKKKKD.......",
      "...DKKEEKKKKKKEEKD......",
      "...DKKKKKKKKKKKKD.......",
      "...DAAAAAAAAAAAAD.......",
      "....DDLLLLLLLLDD........",
      "....DLLLLLLLLLLD........",
      "...DDLLSSLLSSLLDD...AA..",
      "...DLLLLLLLLLLLLD..AAAA.",
      "...DDLSSLLLLSSLLDD...AA.",
      "....DDDDDDDDDDDD........",
      ".....DKKD..DKKD.........",
      ".....DDDD..DDDD.........",
    ],
  },
  {
    id: "relampago", label: "El Relámpago", blurb: "Mask on. Cape up. Crowd loud.",
    palette: { D: "#180d22", K: "#e53935", S: "#982326", W: "#ffffff", E: "#180d22", A: "#f4c542" },
    px: [
      ".....A.........A........",
      "....AAA.......AAA.......",
      "....DDDDDDDDDDDDD.......",
      "...DKKKKKKKKKKKKKD......",
      "...DKWWKKKKKKKWWKD......",
      "...DKWEKKAAAKKWEKD......",
      "...DKKKKKAAAKKKKKD......",
      "...DDKKKKKKKKKKKDD......",
      "..DDLLLLLLLLLLLLLDD.....",
      "..DLLLAAALLLAAALLLD.....",
      "..DLLLLLLLLLLLLLLLD.....",
      "..DLSSLLLLLLLLLSSLD.....",
      "..DDDDDDDDDDDDDDDDD.....",
      "....DKKD....DKKD........",
      "....DDDD....DDDD........",
    ],
  },
];

/* id -> character, built once. */
const BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));

/*
  OLD SLOT KEYS STILL IN THE DATABASE.

  arena_participants.sprite holds whatever was assigned when the racer was
  set up, and the live event was built on the themes this replaced - its
  twelve racers are stored as "sceptile", "blaziken", "swampert" and so on.
  Without this they would ALL fall back to the first character and a race
  would be twelve identical creatures.

  Mapped by POSITION rather than by flavour, because the only thing that
  matters here is that twelve different old keys stay twelve different
  racers. Nothing needs migrating in the database: the old key keeps working
  and quietly means a DFL character now.
*/
const LEGACY_SLOTS = {
  // the Hoenn set
  treecko: "emberrat", torchic: "sparkpup", mudkip: "tinplate",
  sceptile: "boogey", blaziken: "cobble", swampert: "gloop",
  rayquaza: "squawk", groudon: "wyrmlet", kyogre: "divot",
  metagross: "puckhead", salamence: "sudsy", absol: "commish",
  // the elemental-type set before it
  fire: "emberrat", water: "sparkpup", grass: "tinplate",
  electric: "boogey", psychic: "cobble", rock: "gloop",
  flying: "squawk", dark: "wyrmlet", ice: "divot",
  dragon: "puckhead", ghost: "sudsy", steel: "commish",
};

/** A character id, following a legacy key through if that is what arrived. */
export function resolveCharacterId(id) {
  if (BY_ID.has(id)) return id;
  const mapped = LEGACY_SLOTS[id];
  return mapped && BY_ID.has(mapped) ? mapped : null;
}

/*
  A character for a key nobody has ever heard of.

  The duck, dinosaur and car themes are gone, and their slot keys are not in
  LEGACY_SLOTS - there are thirty-six of them and none exist in this
  database. But a row somewhere could still hold "modified" or "trex", and
  the wrong answer is for all of them to become the same creature and turn a
  race into twelve identical things.

  So an unknown key is HASHED to a character instead. What that guarantees is
  STABILITY, not uniqueness: the same racer keeps the same creature across
  reloads and re-renders, which is the property that matters. Twelve unknown
  keys land on about eight distinct characters - that is the birthday bound
  with twelve buckets, not a weak hash, and four different hash functions
  were measured before settling for it.

  It is good enough because no row in this database holds one of those keys:
  the live event is on the old Hoenn set, and all twelve of those ARE mapped
  exactly above. If a real event ever needs exact spread for keys that are
  not in LEGACY_SLOTS, add them to it - the table is the precise answer and
  this is the safety net.
*/
function hashedCharacter(id) {
  const s = String(id || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return CHARACTERS[Math.abs(h) % CHARACTERS.length];
}

export function dflCharacter(id) { return BY_ID.get(resolveCharacterId(id)) || null; }
export function dflCharacterIds() { return CHARACTERS.map((c) => c.id); }

/*
  Run-length merge each row into one <path> per colour.

  A 24x15 grid is 360 cells; drawn as rects that is 360 nodes per racer and
  4,320 in a full field, which is a lot of DOM for a thing that never
  changes shape. Merged, a character is five or six paths.
*/
function pixelPaths(px, palette, laneColour) {
  const runs = new Map();
  for (let y = 0; y < px.length; y++) {
    const row = px[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === "." || ch === " ") { x++; continue; }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      if (!runs.has(ch)) runs.set(ch, []);
      runs.get(ch).push(`M${x} ${y}h${w}v1h-${w}z`);
      x += w;
    }
  }
  let out = "";
  for (const [ch, ds] of runs) {
    const fill = ch === "L" ? laneColour : (palette[ch] || laneColour);
    out += `<path fill="${fill}" d="${ds.join("")}"/>`;
  }
  return out;
}

/**
 * One character as inline SVG, sized to the Arena's existing 8:5 lane box.
 *
 * shape-rendering: crispEdges is the whole point - without it the browser
 * antialiases the pixel edges and the sprite turns to mush at the sizes it
 * is actually drawn at.
 */
function cosmeticPaths(pet = {}) {
  const accent = String(pet.accent || "#ffffff").replace(/["<>]/g, "");
  const accessory = {
    bandana: `<path fill="${accent}" d="M6 8h12v2H6zM17 10h3v2h-3z"/>`,
    visor: `<path fill="${accent}" d="M7 4h11v2H7zM17 6h3v1h-3z"/>`,
    crown: `<path fill="${accent}" d="M8 1h2v2h2V1h2v2h2V1h2v5H8z"/>`,
    headphones: `<path fill="${accent}" d="M6 4h2V2h10v2h2v5h-2V5h-2V4h-6v1H8v4H6z"/>`,
    cape: `<path fill="${accent}" d="M4 7h3v6H2v-2h2z"/>`,
  }[pet.accessory] || "";
  const expression = {
    happy: `<path fill="#17191f" d="M10 6h1v1h-1zM15 6h1v1h-1zM12 9h3v1h-3z"/>`,
    fierce: `<path fill="#17191f" d="M9 6h3v1h-2zM14 6h3v1h-2zM12 9h3v1h-3z"/>`,
    sleepy: `<path fill="#17191f" d="M9 7h3v1H9zM14 7h3v1h-3z"/>`,
    focused: "",
  }[pet.expression] || "";
  return accessory + expression;
}

export function dflSpriteMarkup(id, laneColour, pet = null) {
  const c = dflCharacter(id) || hashedCharacter(id);
  /* Cosmetics are an SVG overlay, so every surface still uses one compact
     renderer and old two-argument calls remain valid. */
  return `<svg class="racer-art racer-px" xmlns="http://www.w3.org/2000/svg" ` +
         `viewBox="0 0 ${GRID_W} ${GRID_H}" shape-rendering="crispEdges" aria-hidden="true">` +
         pixelPaths(c.px, c.palette, laneColour || "#2fbf5f") +
         cosmeticPaths(pet || {}) +
         `</svg>`;
}
