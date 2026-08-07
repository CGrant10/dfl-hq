// =====================================================================
// theme.js - global per-user team theme
// ---------------------------------------------------------------------
// Each member chooses a favourite team on their profile. The choice is
// saved locally immediately and can also be saved to members.favorite_team.
// The selected team's brand colours become the visual identity of the
// entire app, while contrast-safe derived colours keep the UI readable.
// =====================================================================

import { findTeam } from "./teams.js";

const KEY = "dfl.theme";
const DEFAULT_ACCENT = "#2fbf5f";

function toRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}
function toHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}
function hslToRgb([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const hue = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map((v) => v * 255);
}
const MIN_LUMINANCE = 0.20;
function readable(hex) {
  const rgb = toRgb(hex);
  if (luminance(rgb) >= MIN_LUMINANCE) return rgb;
  const [h, s, l] = rgbToHsl(rgb);
  const sat = Math.min(1, s < 0.15 ? s : s + 0.08);
  let lightness = l, out = rgb, guard = 0;
  while (luminance(out) < MIN_LUMINANCE && lightness < 0.92 && guard++ < 40) {
    lightness += 0.02;
    out = hslToRgb([h, sat, lightness]);
  }
  return out;
}

function injectThemeStyles() {
  if (document.getElementById("dfl-global-theme-style")) return;
  const style = document.createElement("style");
  style.id = "dfl-global-theme-style";
  style.textContent = `
    :root{--theme-primary:var(--accent);--theme-secondary:var(--accent-2);--theme-soft:color-mix(in srgb,var(--accent) 14%,transparent);--theme-soft-2:color-mix(in srgb,var(--accent-2) 10%,transparent);--theme-border:color-mix(in srgb,var(--accent) 38%,var(--line));--theme-glow:color-mix(in srgb,var(--accent) 24%,transparent)}
    body{background:radial-gradient(circle at 50% -12%,var(--theme-soft),transparent 38%),var(--bg)}
    .topbar{border-bottom-color:var(--theme-border);box-shadow:0 2px 24px var(--theme-glow)}
    .brand-text span,.brand-text small{color:var(--accent)}
    .tabbar{border-top-color:var(--theme-border)}
    .tabbar a.on,.tabbar a:hover{color:var(--accent)}
    .tabbar a.on:after{background:linear-gradient(90deg,var(--accent),var(--accent-2))}
    .btn.primary,.btn.accent{background:linear-gradient(135deg,var(--accent),var(--accent-2));color:var(--on-accent);border-color:var(--accent)}
    .btn.ghost:hover,.btn:hover{border-color:var(--accent);color:var(--accent)}
    input:focus,select:focus,textarea:focus{border-color:var(--accent)!important;box-shadow:0 0 0 3px var(--theme-soft)}
    .card{border-color:var(--theme-border)}
    .card-title,.card-heading{border-left:3px solid var(--accent);padding-left:10px}
    .pill.green,.pill.accent{background:var(--theme-soft);border-color:var(--theme-border);color:var(--accent)}
    .whoami{border-color:var(--theme-border)}
    .whoami:hover{border-color:var(--accent);color:var(--accent)}
    .profile-head.has-team{border-color:var(--theme-border);background:linear-gradient(135deg,var(--theme-soft),var(--theme-soft-2) 48%,var(--bg-2))}
    .profile-head.has-team:before{background:linear-gradient(90deg,var(--accent),var(--accent-2))}
    .swatchbar{border-color:var(--theme-border)}
    .dfl-team-card{border-color:var(--theme-border)}
  `;
  document.head.appendChild(style);
}

export function applyTheme(teamValue) {
  injectThemeStyles();
  const root = document.documentElement;
  const team = findTeam(teamValue);
  const accentRgb = team ? readable(team.primary) : toRgb(DEFAULT_ACCENT);
  const accent = toHex(accentRgb);
  const dim = toHex(mix(accentRgb, [0, 0, 0], 0.45));
  const onAccent = luminance(accentRgb) > 0.45 ? "#0b1016" : "#ffffff";
  let second = accent;
  if (team) {
    const secondRgb = readable(team.secondary);
    second = Math.abs(luminance(secondRgb) - luminance(accentRgb)) < 0.06
      ? toHex(mix(secondRgb, [255, 255, 255], 0.35)) : toHex(secondRgb);
  }
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-dim", dim);
  root.style.setProperty("--on-accent", onAccent);
  root.style.setProperty("--accent-2", second);
  root.style.setProperty("--theme-primary", accent);
  root.style.setProperty("--theme-secondary", second);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", accent);
  document.body?.setAttribute("data-team-theme", teamValue || "default");
}

export function teamColors(teamValue) {
  const team = findTeam(teamValue);
  if (!team) return null;
  return { name: team.name, leagueLabel: team.leagueLabel, primary: toHex(readable(team.primary)), secondary: toHex(readable(team.secondary)) };
}

export function saveTheme(teamValue) {
  if (teamValue) localStorage.setItem(KEY, teamValue); else localStorage.removeItem(KEY);
  applyTheme(teamValue);
}
export function savedTheme() { return localStorage.getItem(KEY) || ""; }
export function initTheme() { applyTheme(savedTheme()); }
