// =====================================================================
// theme.js - recolour the app with a member's favourite team
// ---------------------------------------------------------------------
// Only the accent colour changes. The dark background stays, because a
// full team-coloured background would wreck readability and half the
// teams in sport are basically black.
//
// Team colours are brand colours, not UI colours, so they are corrected
// before use: anything too dark to read against #0d1117 gets lightened
// until it is, and the text drawn on top flips between dark and light
// depending on how bright the final accent is.
// =====================================================================

import { findTeam } from "./teams.js";

const KEY = "dfl.theme";
const DEFAULT_ACCENT = "#2fbf5f";      // the league green

// ------------------------------ colour maths -------------------------

function toRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

function toHex([r, g, b]) {
  return "#" + [r, g, b].map((v) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else                h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb([h, s, l]) {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map((v) => v * 255);
}

// Contrast against the #0d1117 background. 0.20 puts the accent at roughly
// a 4:1 ratio, which is right for bold text, buttons and icons.
const MIN_LUMINANCE = 0.20;

/**
 * Lighten a brand colour until it reads on the dark background.
 *
 * This raises lightness in HSL rather than blending toward white, because
 * blending desaturates: Chiefs red mixed with white turns pink, while the
 * same red raised in lightness stays unmistakably red.
 */
function readable(hex) {
  const rgb = toRgb(hex);
  if (luminance(rgb) >= MIN_LUMINANCE) return rgb;

  const [h, s, l] = rgbToHsl(rgb);
  // A little extra saturation keeps deep colours from drifting grey.
  const sat = Math.min(1, s < 0.15 ? s : s + 0.08);

  let lightness = l;
  let out = rgb;
  let guard = 0;
  while (luminance(out) < MIN_LUMINANCE && lightness < 0.92 && guard++ < 40) {
    lightness += 0.02;
    out = hslToRgb([h, sat, lightness]);
  }
  return out;
}

// ------------------------------- applying -----------------------------

/**
 * Paint the app in a team's colours.
 * @param {string} teamValue  e.g. "nfl:KC", or "" for the default green
 */
export function applyTheme(teamValue) {
  const root = document.documentElement;
  const team = findTeam(teamValue);

  const accentRgb = team ? readable(team.primary) : toRgb(DEFAULT_ACCENT);
  const accent    = toHex(accentRgb);
  const dim       = toHex(mix(accentRgb, [0, 0, 0], 0.45));
  // Dark text on a bright accent, white text on a deep one.
  const onAccent  = luminance(accentRgb) > 0.45 ? "#0b1016" : "#ffffff";

  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-dim", dim);
  root.style.setProperty("--on-accent", onAccent);

  if (team) {
    const secondRgb = readable(team.secondary);
    root.style.setProperty("--accent-2", toHex(secondRgb));
  } else {
    root.style.removeProperty("--accent-2");
  }
}

/** Remember the choice on this device so there is no flash on next load. */
export function saveTheme(teamValue) {
  if (teamValue) localStorage.setItem(KEY, teamValue);
  else           localStorage.removeItem(KEY);
  applyTheme(teamValue);
}

export function savedTheme() {
  return localStorage.getItem(KEY) || "";
}

/** Called once at start-up, before anything is drawn. */
export function initTheme() {
  applyTheme(savedTheme());
}
