// =====================================================================
// DFL HQ - one palette, two modes
// ---------------------------------------------------------------------
// There is exactly ONE theme now: the crest. Medicine Wheel and Blue /
// Green are gone, and so is the "favourite team recolours the app" idea -
// it never worked (the picker fed NFL team ids into a map that only held
// theme ids, so every choice collapsed to the default).
//
// What a member chooses instead is LIGHT or DARK, and the default is
// whatever their phone is already set to.
//
//   system (default)  follow the OS, and keep following it if it changes
//   dark              force dark
//   light             force light
//
// ---------------------------------------------------------------------
// THE COLOUR RULE, which is the whole point of this file
//
//   --accent        / --accent-2        TEXT. Always legible on the
//                                       current mode's background.
//   --accent-fill   / --accent-2-fill   The crest's true #E5011B and
//                                       #003396, for fills, borders and
//                                       gradients - things whose job is
//                                       to be seen, not read.
//
// This is deliberately the way round it is. There are ~60 places in the
// CSS that say `color: var(--accent)` and ~30 that fill with it. Making
// --accent the readable one means every one of those 60 is correct in both
// modes without being touched, and only fills had to be renamed.
//
// The crest red is a beautiful fill and a poor letter: #E5011B measures
// 3.9:1 on the dark page and 4.4:1 on the light one. The text reds below
// are the same hue pushed until they clear 6:1 on their own background.
// =====================================================================

const MODE_KEY = "dfl.mode";           // "system" | "dark" | "light"
const LEGACY_THEME_KEY = "dfl.theme";  // removed; cleared on sight

/* The crest itself, sampled from the artwork. Mode-independent: a fill does
   not care what the background is doing. */
export const CREST = { red: "#E5011B", blue: "#003396", black: "#0A0A0A", white: "#FFFFFF" };

/*
  WHERE A NEW PALETTE GOES.

  The favourite-NFL-team colouring is gone - one league, one palette - but
  the mechanism that made it possible is still here and is the right place
  for a DFL palette of our own. A third entry in MODES, listed in
  modeOptions(), and every surface in the app follows it: style.css expresses
  everything below in these variables and apply() sets them at runtime.

  A Medicine Wheel palette would be exactly that shape - one more entry, no
  new plumbing. The only rule the app enforces is the contrast one stated
  above: a colour used for TEXT has to clear 6:1 on the background it sits
  on, or it goes in the fill pair instead.

  Per-mode values. Only two things actually differ: the surfaces, and which
  end of each hue is readable against them.

  dark  : text reds/blues lightened  - #E67582 is 6.5:1 on #0d1117
  light : text reds/blues darkened   - #B8001B is 6.4:1 on #ffffff
          (the crest red itself is only 4.4:1 there, and it is the colour
           Grant called hard to read, so light mode does not use it for text)
*/
const MODES = {
  dark: {
    bg: "#0d1117", bg2: "#131a24", bg3: "#1b2432",
    line: "#222b3a", lineSoft: "#1a222e",
    text: "#e8edf5", muted: "#8b98ab", chalk: "#f5f7fa",
    bodyText: "#cdd6e2",
    hover: "#1b2432", hoverSoft: "rgba(255,255,255,.025)",
    controlLine: "#616F80",
    accent: "#E67582", accent2: "#7098E6",
    onAccent: "#FFFFFF",
    // Marks and statuses. Light on dark.
    ok: "#86e6a8", okBg: "rgba(47,191,95,.12)", okLine: "#1d7a3d",
    warnInk: "#f3c887", warnBg: "rgba(240,167,66,.12)", warnLine: "#7a5a1d",
    dangerInk: "#f0a79b", dangerBg: "rgba(224,87,74,.12)", dangerLine: "#7a2f27",
    scUnder: "#35d06f", scOver: "#ff766d", scBad: "#e33d35",
    topbarA: "#101823", topbarB: "#0d1117",
    heroA: "#141c27", heroWash: "rgba(255,255,255,.05)",
    toastBg: "#1f2937", onToast: "#e8edf5",
    milestone: "#d6b254",
    shadow: "0 1px 3px rgba(0,0,0,.28)",
  },
  light: {
    /* Not white-on-white: the page is a shade cooler than the cards so a card
       still reads as a card without needing a heavier border. */
    bg: "#eef1f6", bg2: "#ffffff", bg3: "#e6eaf1",
    line: "#ccd4e0", lineSoft: "#e3e8f0",
    text: "#11161d", muted: "#5a6575", chalk: "#11161d",
    bodyText: "#2a323d",
    hover: "#e0e6ef", hoverSoft: "rgba(16,24,40,.035)",
    controlLine: "#7C8695",
    /* The crest red is 4.4:1 on white - the colour Grant called hard to read.
       #B8001B is the same hue at 6.4:1. The blue needs no help: 11.6:1. */
    accent: "#B8001B", accent2: "#003396",
    onAccent: "#FFFFFF",
    // Same statuses, darkened until they read on white.
    ok: "#0f7a3d", okBg: "rgba(15,122,61,.10)", okLine: "#9fd3b4",
    warnInk: "#8a5200", warnBg: "rgba(196,124,0,.12)", warnLine: "#e0bd7e",
    dangerInk: "#a3121a", dangerBg: "rgba(163,18,26,.09)", dangerLine: "#e2a9a5",
    scUnder: "#0f7a3d", scOver: "#c2371f", scBad: "#a3121a",
    /* The bar keeps the crest's black banner in both modes - it is the one
       piece of chrome the logo actually dictates. */
    topbarA: "#101823", topbarB: "#0d1117",
    heroA: "#ffffff", heroWash: "rgba(16,24,40,.04)",
    toastBg: "#11161d", onToast: "#f5f7fa",
    milestone: "#8a6410",
    shadow: "0 1px 3px rgba(16,24,40,.10)",
  },
};

/*
  ONE MediaQueryList, held at module scope for the life of the page.

  This is not tidiness. A MediaQueryList that nothing references can be
  garbage collected along with its listener, and then the app stops following
  the OS - silently, and only sometimes, which is the worst kind of bug. The
  first version of this made a fresh one inside initTheme() and lost the
  subscription: the phone went light at sunset and the app stayed dark.
*/
const WATCH = window.matchMedia("(prefers-color-scheme: dark)");
const media = () => WATCH;

/** "system" | "dark" | "light" - what the member asked for. */
export function savedMode() {
  const v = localStorage.getItem(MODE_KEY);
  return v === "dark" || v === "light" ? v : "system";
}

/** "dark" | "light" - what that actually resolves to right now. */
export function activeMode() {
  const want = savedMode();
  if (want !== "system") return want;
  return media().matches ? "dark" : "light";
}

function apply() {
  const name = activeMode();
  const m = MODES[name];
  const s = document.documentElement.style;

  s.setProperty("--bg", m.bg);
  s.setProperty("--bg-2", m.bg2);
  s.setProperty("--bg-3", m.bg3);
  s.setProperty("--line", m.line);
  s.setProperty("--line-soft", m.lineSoft);
  s.setProperty("--text", m.text);
  s.setProperty("--muted", m.muted);
  s.setProperty("--chalk", m.chalk);
  s.setProperty("--shadow", m.shadow);

  // Text pair, then the crest pair for everything that is not text.
  s.setProperty("--accent", m.accent);
  s.setProperty("--accent-2", m.accent2);
  s.setProperty("--accent-fill", CREST.red);
  s.setProperty("--accent-2-fill", CREST.blue);
  s.setProperty("--on-accent", m.onAccent);
  /* --accent-dim was the darker partner of the old green and is still used
     for a few borders; the crest blue is the right thing there now. */
  s.setProperty("--accent-dim", CREST.blue);

  // Scorecard marks: under par, over par, and well over.
  s.setProperty("--sc-under", m.scUnder);
  s.setProperty("--sc-over", m.scOver);
  s.setProperty("--sc-bad", m.scBad);

  // Surfaces and statuses that used to be hardcoded for dark only.
  s.setProperty("--body-text", m.bodyText);
  s.setProperty("--hover", m.hover);
  s.setProperty("--hover-soft", m.hoverSoft);
  /* A control you have to find and tap needs a visible edge: --line is a
     divider (~1.5:1) and too quiet for that job in either mode. */
  s.setProperty("--control-line", m.controlLine);
  s.setProperty("--ok", m.ok);
  s.setProperty("--ok-bg", m.okBg);
  s.setProperty("--ok-line", m.okLine);
  s.setProperty("--warn-ink", m.warnInk);
  s.setProperty("--warn-bg", m.warnBg);
  s.setProperty("--warn-line", m.warnLine);
  s.setProperty("--danger-ink", m.dangerInk);
  s.setProperty("--danger-bg", m.dangerBg);
  s.setProperty("--danger-line", m.dangerLine);
  s.setProperty("--topbar-a", m.topbarA);
  s.setProperty("--topbar-b", m.topbarB);
  s.setProperty("--hero-a", m.heroA);
  s.setProperty("--hero-wash", m.heroWash);
  s.setProperty("--toast-bg", m.toastBg);
  s.setProperty("--on-toast", m.onToast);
  s.setProperty("--milestone", m.milestone);
  /* The old --theme-* names are still referenced by the profile header, the
     swatch bar and the scorecard card. Point them at the crest so those rules
     keep working instead of silently dropping. */
  s.setProperty("--theme-primary", CREST.red);
  s.setProperty("--theme-secondary", CREST.blue);

  document.documentElement.setAttribute("data-mode", name);
  document.body?.setAttribute("data-mode", name);
  /* The browser chrome follows the page, not the crest: a red address bar
     over a light app looks like a different app. */
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", m.bg);
}

/** Called once at start-up. */
let watching = false;

export function initTheme() {
  localStorage.removeItem(LEGACY_THEME_KEY);   // the old theme ids are dead
  apply();
  // Following the OS means following it when it changes, not just at boot.
  if (watching) return;
  watching = true;
  const onChange = () => { if (savedMode() === "system") apply(); };
  if (WATCH.addEventListener) WATCH.addEventListener("change", onChange);
  else if (WATCH.addListener) WATCH.addListener(onChange);   // older iOS Safari
}

/** Set and remember the member's choice. */
export function saveMode(value) {
  if (value === "system") localStorage.removeItem(MODE_KEY);
  else localStorage.setItem(MODE_KEY, value === "light" ? "light" : "dark");
  apply();
}

export function modeOptions() {
  return [
    { id: "system", name: "Match my phone" },
    { id: "dark", name: "Dark" },
    { id: "light", name: "Light" },
  ];
}

/* ---------------------------------------------------------------------
   Kept only so nothing that still imports them breaks. There is one
   theme now, so they answer for the crest and ignore what they are asked.
   --------------------------------------------------------------------- */
export function applyTheme() { apply(); }
export function savedTheme() { return "dfl"; }
export function saveTheme() { apply(); }
export function teamColors() { return { name: "DFL Crest", primary: CREST.red, secondary: CREST.blue }; }
