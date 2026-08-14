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
    controlLine: "#616F80", controlBg: "rgba(20,27,38,.72)",
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
    controlLine: "#7C8695", controlBg: "rgba(255,255,255,.82)",
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

  /*
    MEDICINE WHEEL.

    Built on the four directional colours - black, red, yellow, white - with
    black as the ground, which is also what makes it hold together as an app:
    this is a dark palette, so every surface, divider and status below is the
    same shape as the dark one and only the hues move.

    The fills and the text colours are SEPARATE here, same as the crest pair
    everywhere else in this file. A saturated red is a good fill and a poor
    letter: #C8102E is 4.4:1 on this ground, under the 6:1 this file holds
    itself to, so the text red is the same hue lifted until it clears. Yellow
    needs no help at all - it is 11:1 on black - so the text yellow and the
    fill yellow are nearly the same colour.

    Statuses stay semantic. There is no green in the four, but "paid" and
    "unpaid" have to be told apart at a glance on the fees screen, so ok/warn/
    danger keep their jobs and are only warmed to sit with the rest.
  */
  medicine: {
    bg: "#0b0b0c", bg2: "#141416", bg3: "#1d1d20",
    line: "#2f2f34", lineSoft: "#212125",
    text: "#f4f2ee", muted: "#a8a096", chalk: "#ffffff",
    bodyText: "#ddd8d0",
    hover: "#1d1d20", hoverSoft: "rgba(255,255,255,.03)",
    controlLine: "#736b60", controlBg: "rgba(24,24,27,.74)",
    /* text pair: the red lifted to clear 6:1, the yellow already there */
    accent: "#F08279", accent2: "#EFC94C",
    /* fill pair: the wheel's own red and yellow */
    fill: "#C8102E", fill2: "#EFC94C",
    onAccent: "#FFFFFF",
    ok: "#8fd6a4", okBg: "rgba(96,176,123,.13)", okLine: "#3f7a52",
    /* An amber, NOT the wheel's yellow. The first cut used #EFC94C for both
       this and milestone, which made an OPEN badge and a CHAMPION badge the
       same colour - and gold is the occasion colour, so warn is the one that
       had to move. */
    warnInk: "#E8A33D", warnBg: "rgba(232,163,61,.12)", warnLine: "#7a5a20",
    /* Lighter and pinker than `accent` for the same reason: UNPAID and a
       plain accent link were coming out identical. */
    dangerInk: "#F5A39B", dangerBg: "rgba(200,16,46,.14)", dangerLine: "#7d2029",
    scUnder: "#7fd39a", scOver: "#f0897e", scBad: "#d93b3b",
    topbarA: "#101012", topbarB: "#0b0b0c",
    heroA: "#17171a", heroWash: "rgba(255,255,255,.05)",
    toastBg: "#232327", onToast: "#f4f2ee",
    milestone: "#EFC94C",
    shadow: "0 1px 3px rgba(0,0,0,.42)",
  },
};

/* The modes somebody can actually choose. "system" is not one of them - it
   is the absence of a choice - and anything else in storage is ignored. */
const PICKABLE = ["dark", "light", "medicine"];

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

/** "system" or one of PICKABLE - what the member asked for. */
/*
  MEDICINE WHEEL IS THE DEFAULT, AND "DEFAULT" IS NOT "FORCED".

  Three states, and telling the last two apart is the whole job:

    a picked theme     dark / light / medicine  -> honoured, always
    "Match my phone"   an explicit choice       -> follow the OS
    nothing at all     never touched the picker -> Medicine Wheel

  The second and third used to be the SAME state, because choosing "Match
  my phone" deleted the key. That made an explicit preference
  indistinguishable from never having expressed one - so making Medicine
  Wheel the default would have quietly overridden the people who had
  deliberately asked to follow their phone. "system" is now stored as
  itself, and only a genuinely empty slot falls through to the default.
*/
const DEFAULT_MODE = "medicine";

export function savedMode() {
  const v = localStorage.getItem(MODE_KEY);
  if (PICKABLE.includes(v)) return v;
  if (v === "system") return "system";
  return DEFAULT_MODE;                 // no preference recorded at all
}

/** The mode that is actually painting right now - never "system". */
export function activeMode() {
  const want = savedMode();
  if (want !== "system") return want;
  return media().matches ? "dark" : "light";
}

function apply() {
  const name = activeMode();
  const m = MODES[name];
  const s = document.documentElement.style;

  /*
    COLOR-SCHEME, AND THIS IS THE ONE THAT WAS ACTUALLY BROKEN.

    Everything else in this function paints things WE draw. color-scheme
    is the only way to tell the browser about the things IT draws: the
    popup list of a <select>, the calendar of an <input type="date">, the
    clock of a <input type="time">, scrollbars, autofill.

    It was never declared, so those followed the OPERATING SYSTEM instead
    of the app. A member with a dark phone running DFL HQ in light mode
    got a white page with black dropdowns and a black date picker - which
    is exactly the "popups become completely black" report, and it got
    worse when the event and tee time fields added native pickers.

    medicine is a dark palette, so it declares dark. This is a hint, not a
    repaint: it costs nothing and no other rule can achieve it.
  */
  s.setProperty("color-scheme", name === "light" ? "light" : "dark");

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
  /* A mode may bring its own fill pair. Without this the crest red and blue
     were set unconditionally, so a themed palette would have had its buttons,
     bars and gradients still painted in the crest's colours. */
  const fill = m.fill || CREST.red, fill2 = m.fill2 || CREST.blue;
  s.setProperty("--accent-fill", fill);
  s.setProperty("--accent-2-fill", fill2);
  s.setProperty("--on-accent", m.onAccent);
  /* --accent-dim was the darker partner of the old green and is still used
     for a few borders; the crest blue is the right thing there now. */
  s.setProperty("--accent-dim", fill2);

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
  /* The plate behind a floating control - the broadcast's pause and
     arrows, the admin running-order row. It was referenced by four rules
     and defined by none, so those buttons were drawing as a bare ring with
     nothing behind them and whatever was underneath showing through. */
  s.setProperty("--control-bg", m.controlBg);
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
  s.setProperty("--theme-primary", fill);
  s.setProperty("--theme-secondary", fill2);

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
  /* "system" is WRITTEN rather than cleared - see savedMode(). Removing the
     key would make an explicit "follow my phone" look like no preference,
     and the next person to change the default would silently overrule it. */
  if (PICKABLE.includes(value) || value === "system") localStorage.setItem(MODE_KEY, value);
  else localStorage.removeItem(MODE_KEY);
  apply();
}

export function modeOptions() {
  return [
    { id: "system", name: "Match my phone" },
    { id: "dark", name: "Dark" },
    { id: "light", name: "Light" },
    { id: "medicine", name: "Medicine Wheel" },
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
