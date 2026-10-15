// DFL HQ appearance: Medicine Wheel Dark and Light, Fairway, or a club palette.
// Text accents stay readable; saturated fills carry the identity.
// Retired Medicine Wheel ids are read as aliases, never offered twice.

import { teamPalette, MEDICINE_GROUND } from "./team-theme.js";
/* For carrying the choice between a member's devices. Neither of these
   imports theme.js, so there is no cycle. */
import { db } from "./supabase.js";
import { currentMember } from "./members.js";
import { team as nflTeam, teamCode } from "./nfl-teams.js";

const MODE_KEY = "dfl.mode";  // "system" | "dark" | "light" | "fairway" | "team:KC"

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

// Base palettes share the same token shape. Club palettes are generated.
const MODES = {
  dark: {
    // Standard dark and OS dark share the league's Medicine foundation.
    ...MEDICINE_GROUND,
    accent: "#f5d66c", accent2: "#f4f1eb",
    fill: "#C8102E", fill2: "#EFC94C",
    onAccent: "#FFFFFF",
  },
  light: {
    /* Bone page, white cards, a deeper bone for wells and rows. */
    bg: "#F3EDE4", bg2: "#FFFFFF", bg3: "#E9E1D4",
    line: "#D3C6B2", lineSoft: "#E6DDCE",
    /* muted is darker than Light's equivalent on purpose: the accent here is
       a deep red, and the cards that wash 10-12% of it over white - the
       champions rows, a dues header - leave a pink plate that a lighter grey
       cannot hold 4.5:1 against. Measured on that plate, not on the card. */
    text: "#15110D", muted: "#5E5449", chalk: "#15110D",
    bodyText: "#332B22",
    hover: "#EBE3D6", hoverSoft: "rgba(21,17,13,.04)",
    controlLine: "#8B7D6B", controlBg: "rgba(255,255,255,.90)",
    /* text pair: the red deepened, the yellow taken down to a bronze */
    accent: "#A50E26", accent2: "#6E4B00",
    /* fill pair: the wheel's own red, and the yellow as far down as it has
       to go for white to sit on it - the tabs and the hero rule run this
       gradient with --on-accent over the top. */
    fill: "#C8102E", fill2: "#8A5A00",
    onAccent: "#FFFFFF",
    /* Statuses stay semantic, same as the dark wheel: there is no green in
       the four, but PAID and UNPAID have to be tellable apart at a glance. */
    ok: "#0A5527", okBg: "rgba(10,85,39,.10)", okLine: "#A6C9B2",
    /* An amber and not the wheel's yellow, so an OPEN badge and a CHAMPION
       badge are not the same colour - the same split the dark wheel makes. */
    warnInk: "#6B4300", warnBg: "rgba(138,90,0,.13)", warnLine: "#D9BE84",
    dangerInk: "#A3121A", dangerBg: "rgba(163,18,26,.09)", dangerLine: "#E0A9A4",
    scUnder: "#0A5527", scOver: "#8E2610", scBad: "#93101A",
    /* Keep the shell on the same bone paper instead of dropping a dark band
       above an otherwise light Medicine Wheel screen. */
    topbarA: "#FFFFFF", topbarB: "#F3EDE4",
    barInk: "#A50E26", barInk2: "#6E4B00",
    heroA: "#FFFFFF", heroWash: "rgba(21,17,13,.045)",
    /* Toasts and sheets land on black with bone type: a pop-up over a light
       page has to separate from it, and black is the wheel's own answer. */
    toastBg: "#15110D", onToast: "#F7F2EA",
    /* Gold is the occasion colour and stays gold - as far up its hue as it
       can go and still be read on bone. */
    milestone: "#684B06",
    shadow: "0 1px 3px rgba(21,17,13,.12)",
  },

  /*
    FAIRWAY LIGHT.

    A golf-first light palette: bright scorecard surfaces, deep blue
    structure, and green action/status accents. It deliberately keeps the
    same token shape as Light so every screen remains accessible and native
    controls still use their light appearance.
  */
  fairway: {
    bg: "#f4f6f7", bg2: "#ffffff", bg3: "#edf1f3",
    line: "#b9c7cc", lineSoft: "#dce3e6",
    text: "#0b2b40", muted: "#5b707a", chalk: "#0b2b40",
    bodyText: "#294653",
    hover: "#e8eef0", hoverSoft: "rgba(7,80,119,.045)",
    controlLine: "#78909a", controlBg: "rgba(255,255,255,.94)",
    accent: "#056936", accent2: "#075077",
    fill: "#119b57", fill2: "#0873a6",
    onAccent: "#ffffff",
    ok: "#056936", okBg: "rgba(5,105,54,.10)", okLine: "#8bc7a6",
    warnInk: "#805200", warnBg: "rgba(180,119,0,.11)", warnLine: "#ddc483",
    dangerInk: "#a12929", dangerBg: "rgba(161,41,41,.09)", dangerLine: "#e1adad",
    scUnder: "#05723c", scOver: "#bb442f", scBad: "#992727",
    topbarA: "#ffffff", topbarB: "#edf1f3",
    barInk: "#056936", barInk2: "#075077",
    heroA: "#ffffff", heroWash: "rgba(7,80,119,.035)",
    toastBg: "#082c40", onToast: "#f7fffb",
    milestone: "#765c0d",
    shadow: "0 1px 2px rgba(11,43,64,.06)",
  },

};

/* The modes somebody can actually choose. "system" is not one of them - it
   is the absence of a choice - and anything else in storage is ignored. */
const PICKABLE = ["dark", "light", "fairway"];
const MODE_ALIASES = { medicine: "dark", "medicine-light": "light" };

/** One validation path for local, synced and member-switch preferences. */
export function normalizeMode(value) {
  const mode = MODE_ALIASES[value] || value;
  if (mode === "system" || PICKABLE.includes(mode)) return mode;
  return isTeamMode(mode) ? teamModeFor(codeOfMode(mode)) : null;
}

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

    a picked theme     dark / light  -> honoured, always
    "Match my phone"   an explicit choice       -> follow the OS
    nothing at all     never touched the picker -> Medicine Wheel Dark

  The second and third used to be the SAME state, because choosing "Match
  my phone" deleted the key. That made an explicit preference
  indistinguishable from never having expressed one - so making Medicine
  Wheel the default would have quietly overridden the people who had
  deliberately asked to follow their phone. "system" is now stored as
  itself, and only a genuinely empty slot falls through to the default.
*/
const DEFAULT_MODE = "dark";

export function savedMode() {
  const stored = localStorage.getItem(MODE_KEY);
  const mode = normalizeMode(stored);
  if (mode && mode !== stored) localStorage.setItem(MODE_KEY, mode);
  return mode || DEFAULT_MODE;
}

/*
  A PAGE MAY PIN THE PALETTE, AND THAT IS NOT THE SAME AS CHOOSING ONE.

  Golf is a branded surface: it is meant to look like Golf to everybody
  standing on the same tee, not like whichever club each of them picked in
  their profile. So the golf route pins the palette while it is open.

  The pin is deliberately kept OUT of savedMode() and out of localStorage.
  It changes what paints, never what the member asked for - so the profile
  picker still shows their real choice, and leaving golf restores it with
  nothing to undo. Anything that wrote the pin down would eventually leave
  somebody permanently in a theme they never picked.
*/
let pinned = "";

/** Pin the palette to one mode, or pass nothing to release it. */
export function pinMode(mode) {
  const next = normalizeMode(mode) || "";
  if (next === pinned) return;
  pinned = next;
  apply();
}

/** The mode that is actually painting right now - never "system". */
export function activeMode() {
  const want = pinned || savedMode();
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
  return modeOptions().find((o) => o.id === normalizeMode(id))?.name || id;
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

    Medicine Wheel Dark declares dark. This is a hint, not a
    repaint: it costs nothing and no other rule can achieve it.
  */
  /*
    A LIGHT SURFACE IS A LIST, NOT A GUESS.

    This drives two things that cannot be derived from the palette: the
    color-scheme hint, which is the only way to tell the browser what to do
    with the things IT draws - a <select> popup, a date picker, scrollbars,
    autofill - and the data-mode token every [data-mode="light"] rule in the
    CSS already tests for. The warm Light palette in this list is what
    makes those ~30 existing rules apply to it with nothing new written.
  */
  const lightSurface = name === "light" || name === "fairway";
  s.setProperty("color-scheme", lightSurface ? "light" : "dark");

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
  const fill = m.fill, fill2 = m.fill2;
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
  /* And vertically, for the edge-lines down the side of a card. */
  s.setProperty("--accent-sweep-v", `linear-gradient(180deg, ${fill}, ${fill2})`);
  s.setProperty("--on-accent", m.onAccent);
  /* Older border rules share the current secondary fill. */
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
  /*
    THE BAR MAY HAVE ITS OWN ACCENTS.

    Dark palettes use their page accents here. Light palettes explicitly use
    the darker pair that reads on their light header. Keeping this token
    separate also lets the tiny creed stars remain legible in every mode.
  */
  s.setProperty("--bar-ink", m.barInk || m.accent);
  s.setProperty("--bar-ink-2", m.barInk2 || m.accent2);
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
  const token = isTeamMode(name) ? "team" : lightSurface ? "light" : name;
  document.documentElement.setAttribute("data-mode", token);
  document.body?.setAttribute("data-mode", token);
  document.documentElement.setAttribute("data-palette", name);
  document.body?.setAttribute("data-palette", name);
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
  const mode = normalizeMode(value);
  if (mode) localStorage.setItem(MODE_KEY, mode);
  else localStorage.removeItem(MODE_KEY);
  apply();
  /* Not awaited: the palette has already repainted, and a slow network must
     never make the picker feel unresponsive. */
  void pushMode(localStorage.getItem(MODE_KEY) || "");
}

export function modeOptions() {
  return [
    { id: "system", name: "Match my phone" },
    { id: "dark", name: "Dark" },
    { id: "light", name: "Light" },
    { id: "fairway", name: "Fairway Light" },
  ];
}

/*
  teamOptions() WAS HERE and enumerated the 32 clubs as mode ids for the
  Appearance card's logo grid. That grid is gone - the club's colours are
  now offered next to the club picker in the profile editor, which is the
  only place somebody has just said which club is theirs. Nothing enumerates
  modes any more, and nfl-teams.js already exports nflTeams() for anything
  that needs the list. teamModeFor(code) still builds a single team mode.
*/


/* ---------------------------------------------------------------------
   Kept only so nothing that still imports them breaks. Palette choice goes
   through savedMode()/saveMode() now, so these answer for the crest and
   ignore what they are asked. They are not the mode picker.
   --------------------------------------------------------------------- */
export function applyTheme() { apply(); }
export function savedTheme() { return "dfl"; }
export function saveTheme() { apply(); }
export function teamColors() { return { name: "DFL Crest", primary: CREST.red, secondary: CREST.blue }; }

/* =====================================================================
   THE CHOICE FOLLOWS THE MEMBER, NOT THE BROWSER.
   ---------------------------------------------------------------------
   "dfl.mode" is localStorage, which is per device by definition, so
   picking a club on a desktop could never reach a phone. The mode now also
   rides on the member row.

   LOCALSTORAGE IS STILL THE AUTHORITY AT BOOT, and that is deliberate. It
   reads synchronously, before the app knows who is using it, so the page
   paints in the right palette on the first frame instead of flashing the
   default while a query runs. The server copy is reconciled a moment later.

   EVERY DATABASE FAILURE HERE IS SWALLOWED. theme_mode arrives in its own
   migration; a league that has not run theme_sync_schema.sql must keep a
   working per-device picker rather than see an error every time somebody
   changes colour.
   ===================================================================== */

const themeMissing = (err) =>
  /theme_mode|dfl_save_theme_mode|could not find|does not exist|schema cache/i.test(err?.message || "");

/** Publish this device's choice. Fire and forget - the UI already moved. */
async function pushMode(value) {
  try {
    if (!currentMember()) return;
    const { error } = await db().rpc("dfl_save_theme_mode", { new_mode: value });
    if (error && !themeMissing(error)) console.warn("theme: could not save mode", error.message);
  } catch (err) {
    if (!themeMissing(err)) console.warn("theme: could not save mode", err);
  }
}

/**
 * Adopt the palette stored against this member, if there is one.
 *
 * Called once from boot, after the member is restored. Three cases:
 *
 *   nothing stored   publish what this device already has, so the NEXT
 *                    device to sign in inherits it
 *   same as local    nothing to do
 *   different        adopt it and repaint - the member changed it elsewhere
 *
 * Adopting writes straight to storage rather than going through saveMode(),
 * which would push the value back to the server it just came from.
 */
export async function syncThemeFromMember() {
  const me = currentMember();
  if (!me) return;
  let remote;
  try {
    const { data, error } = await db()
      .from("members").select("theme_mode").eq("id", me.id).maybeSingle();
    if (error) throw error;
    remote = data?.theme_mode || null;
  } catch (err) {
    if (!themeMissing(err)) console.warn("theme: could not read mode", err);
    return;
  }

  const local = localStorage.getItem(MODE_KEY);
  if (!remote) { if (local) void pushMode(local); return; }
  /* An unknown or retired value - a club that no longer exists - is ignored
     rather than applied, the same way savedMode() ignores it. */
  const mode = normalizeMode(remote);
  if (!mode || mode === local) return;
  localStorage.setItem(MODE_KEY, mode);
  apply();
}
