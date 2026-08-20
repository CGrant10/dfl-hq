// =====================================================================
// DFL HQ - one crest, three palettes
// ---------------------------------------------------------------------
// TEAM PALETTES ARE BACK, AND THIS TIME THEY WORK. The first attempt fed
// NFL team ids into MODES, which only held theme ids, so every choice
// collapsed to the default - the reason this header used to say the idea
// was gone for good. The fix was not a bigger map: js/team-theme.js
// GENERATES a palette from the club's two colours, so there is no lookup
// to fall out of sync. A raw team colour is never used as text (nine clubs
// have a primary that is effectively black); it is lifted along its own
// hue until it clears the contrast bar below.
//
// So the picker has four fixed entries - three real palettes and one that
// is the absence of a choice - plus a club. See MODES, PICKABLE,
// modeOptions() and teamOptions() below; those are generated, so if they
// disagree with this comment, they are right and this is stale.
//
//   medicine (default)  Medicine Wheel. A dark palette, and what a device
//                       that has never touched the picker gets.
//   system              follow the OS, and keep following it if it changes
//   dark                force dark
//   light               force light
//
// This header used to say "one palette, two modes" and that Medicine Wheel
// was gone. It came back as the default; nobody updated the comment.
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

import { teamPalette, MEDICINE_GROUND } from "./team-theme.js";
import { team as nflTeam, nflTeams, teamCode } from "./nfl-teams.js";

const MODE_KEY = "dfl.mode";  // "system" | "dark" | "light" | "medicine" | "team:KC"

/*
  A TEAM MODE IS "team:KC" - ONE KEY, NOT TWO.

  Storing the club separately from the mode would give two sources of truth
  that can disagree: a stored club with the mode set to dark, or a team mode
  with no club. Carrying the code inside the value makes those states
  unrepresentable, and validation is just "is this a real club".
*/
const TEAM_PREFIX = "team:";
export const isTeamMode = (v) => String(v || "").startsWith(TEAM_PREFIX);
export const teamModeFor = (code) => {
  const hit = nflTeam(code);
  return hit ? TEAM_PREFIX + hit.code : null;
};
const codeOfMode = (v) => isTeamMode(v) ? teamCode(String(v).slice(TEAM_PREFIX.length)) : "";
/** The club a team mode refers to, or null. */
export const modeTeam = (v) => isTeamMode(v) ? nflTeam(codeOfMode(v)) : null;
const LEGACY_THEME_KEY = "dfl.theme";  // removed; cleared on sight

/* The crest itself, sampled from the artwork. Mode-independent: a fill does
   not care what the background is doing. */
export const CREST = { red: "#E5011B", blue: "#003396", black: "#0A0A0A", white: "#FFFFFF" };

/*
  WHERE A NEW PALETTE GOES.

  One more entry in MODES, the same id added to PICKABLE and to
  modeOptions(), and every surface in the app follows it: style.css expresses
  everything below in these variables and apply() sets them at runtime. The
  Medicine Wheel entry below IS that shape - it was added with no new
  plumbing, which is the evidence that the mechanism works.

  The only rule the app enforces is the contrast one stated above: a colour
  used for TEXT has to clear 6:1 on the background it sits on, or it goes in
  the fill pair instead.

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
  /*
    THE SURFACES COME FROM team-theme.js, WHICH OWNS THEM NOW.

    A team palette is this palette with different accents, so the ground was
    being maintained in two files. It is defined once, there, and this entry
    is the wheel's own accents on top. The notes explaining why warn is an
    amber and danger is pinker moved with the values they describe.
  */
  medicine: {
    ...MEDICINE_GROUND,
    /* text pair: the red lifted to clear 6:1, the yellow already there */
    accent: "#F08279", accent2: "#EFC94C",
    /* fill pair: the wheel's own red and yellow */
    fill: "#C8102E", fill2: "#EFC94C",
    onAccent: "#FFFFFF",
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
  /* A club that no longer exists - a relocation, or a hand-edited value -
     falls through to the default rather than painting an empty palette. */
  if (isTeamMode(v)) return teamModeFor(codeOfMode(v)) || DEFAULT_MODE;
  return DEFAULT_MODE;                 // no preference recorded at all
}

/** The mode that is actually painting right now - never "system". */
export function activeMode() {
  const want = savedMode();
  if (want !== "system") return want;
  return media().matches ? "dark" : "light";
}

/*
  THE PALETTE FOR A MODE NAME, whether it is one of the three written out
  above or generated from a club. Everything downstream of here is identical
  either way, which is why adding 32 palettes needed no new plumbing.
*/
function paletteFor(name) {
  if (isTeamMode(name)) {
    const t = modeTeam(name);
    const built = t ? teamPalette(t) : null;
    /* A club whose colours will not build is a bug, not a user error, so it
       falls back to the default palette rather than to nothing. */
    if (built) return built;
    return MODES[DEFAULT_MODE];
  }
  return MODES[name] || MODES[DEFAULT_MODE];
}

/** A human name for any mode id, including a club. */
export function modeLabel(id) {
  const t = modeTeam(id);
  if (t) return t.name;
  return modeOptions().find((o) => o.id === id)?.name || id;
}

function apply() {
  const name = activeMode();
  const m = paletteFor(name);
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
  /*
    THE LONG-LINE GRADIENT, as one token.

    A team palette sets both a primary and a secondary, but the stylesheet
    reached for --accent 118 times and --accent-2 exactly ZERO, so every club
    came out looking like one colour. The rule now: anything long and linear -
    a meter fill, a dwell timer, a rule across a hero, the tab indicator -
    runs primary to secondary, and it reads that from here rather than
    open-coding the same two-stop gradient in six stylesheets that could
    drift apart.
  */
  s.setProperty("--accent-sweep", `linear-gradient(90deg, ${fill}, ${fill2})`);
  /* The same pair on a diagonal, for a block rather than a line. */
  s.setProperty("--accent-sweep-135", `linear-gradient(135deg, ${fill}, ${fill2})`);
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

  /*
    data-mode CARRIES "team", NOT "team:KC".

    Every [data-mode="..."] rule in the CSS tests for "light". Writing the
    club into the same attribute would be a token no rule matches - which
    is correct today but only by luck, and it would quietly break the first
    rule anybody writes for `dark`. The mode stays a plain token and the
    club goes in its own attribute, where a rule can reach it if it ever
    needs to.
  */
  const token = isTeamMode(name) ? "team" : name;
  document.documentElement.setAttribute("data-mode", token);
  document.body?.setAttribute("data-mode", token);
  const club = codeOfMode(name);
  for (const el of [document.documentElement, document.body]) {
    if (!el) continue;
    if (club) el.setAttribute("data-team", club);
    else el.removeAttribute("data-team");
  }
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
  const team = isTeamMode(value) ? teamModeFor(codeOfMode(value)) : null;
  if (team) localStorage.setItem(MODE_KEY, team);
  else if (PICKABLE.includes(value) || value === "system") localStorage.setItem(MODE_KEY, value);
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

/**
 * The 32 clubs as mode options, for a picker that shows their logos.
 *
 * Kept out of modeOptions() on purpose: that list is a row of four buttons
 * and a 36th entry would wreck it. These are a grid.
 */
export function teamOptions() {
  return nflTeams().map((t) => ({
    id: TEAM_PREFIX + t.code,
    code: t.code,
    name: t.name,
    short: t.short,
    primary: t.primary,
    secondary: t.secondary,
  }));
}

/* ---------------------------------------------------------------------
   Kept only so nothing that still imports them breaks. Palette choice goes
   through savedMode()/saveMode() now, so these answer for the crest and
   ignore what they are asked. They are not the mode picker.
   --------------------------------------------------------------------- */
export function applyTheme() { apply(); }
export function savedTheme() { return "dfl"; }
export function saveTheme() { apply(); }
export function teamColors() { return { name: "DFL Crest", primary: CREST.red, secondary: CREST.blue }; }
