// DFL HQ global theme system
// Default: DFL Crest - the league logo's own red, royal blue, white, black.
// Alternates: Medicine Wheel (yellow, red, black, white), Blue / Green.
//
// A device that has never picked a theme gets the default, so the league sees
// the crest colours without anybody doing anything. A device where somebody
// DID pick a theme keeps their pick - an explicit choice is not ours to
// overwrite just because the default moved.
const KEY = "dfl.theme";
const DEFAULT_THEME = "dfl";
const THEMES = {
  /*
    Two reds and two blues, and the pairs are not interchangeable.

    primary/secondary are the logo's own ink - deep enough to read as the
    crest's red and royal blue when they fill something or draw a border. Put
    either of them on #0d1117 as TEXT and they come in around 2.9:1, which is
    below anything readable, so the text-facing pair lives in the
    .theme-dfl block below at ~7:1. Same trick the Medicine Wheel theme
    already uses for its gold.
  */
  dfl: { primary: "#D0202B", secondary: "#1E43A0", dark: "#0A0A0A", light: "#FFFFFF", accent3: "#FFFFFF",
         ink: "#FF6B60", ink2: "#7FA6F5" },
  medicine: { primary: "#D4A72C", secondary: "#B23A2B", dark: "#0A0A0A", light: "#F7F4EA", accent3: "#FFFFFF",
         ink: "#D9B744", ink2: "#F07868" },
  bluegreen: { primary: "#2563EB", secondary: "#16A34A", dark: "#0D1117", light: "#F3F7FB", accent3: "#60A5FA",
         ink: "#60A5FA", ink2: "#4ADE80" }
};

/*
  ink / ink2 are the same two colours turned up until they are legible AS TEXT
  on the dark page, and they are exposed as --accent-ink / --accent-2-ink.

  Measured, not guessed: the crest's own #1E43A0 on #0d1117 is 2.1:1, so a
  7px star drawn in it is a dark smudge. #7FA6F5 is the same blue at 6.7:1.
  Fills and borders keep the true crest colours; anything that has to be READ
  uses the ink.
*/
const DFL_INK = { red: THEMES.dfl.ink, blue: THEMES.dfl.ink2 };

function injectThemeStyles() {
  if (document.getElementById("dfl-global-theme-style")) return;
  const style = document.createElement("style");
  style.id = "dfl-global-theme-style";
  style.textContent = `
    :root{--theme-primary:var(--accent);--theme-secondary:var(--accent-2);--theme-soft:color-mix(in srgb,var(--accent) 12%,transparent);--theme-soft-2:color-mix(in srgb,var(--accent-2) 10%,transparent);--theme-border:color-mix(in srgb,var(--accent) 34%,var(--line));}
    body{background:var(--bg);}
    /* --accent fills and draws borders; --accent-ink is what TEXT uses.
       Measured on #0d1117: the crest red reads 3.5:1, its ink 6.8:1 - and the
       tab bar label is the app's main "you are here", at 10px. Every theme
       supplies its own ink, so this is not one palette imposed on another. */
    .brand-text span{color:var(--accent-ink,var(--accent))}
    .tabbar a.on,.tabbar a:hover{color:var(--accent-ink,var(--accent))}
    .tabbar a.on:after{background:linear-gradient(90deg,var(--accent),var(--accent-2))}
    .btn.primary,.btn.accent{background:linear-gradient(135deg,var(--accent),var(--accent-2));color:var(--on-accent);border-color:var(--accent)}
    .btn.ghost:hover,.btn:hover{border-color:var(--accent);color:var(--accent-ink,var(--accent))}
    input:focus,select:focus,textarea:focus{border-color:var(--accent)!important;box-shadow:none}
    .whoami:hover{border-color:var(--accent);color:var(--accent-ink,var(--accent))}
    .profile-head.has-team{border-color:var(--theme-border);background:linear-gradient(135deg,var(--theme-soft),var(--theme-soft-2) 48%,var(--bg-2))}
    .profile-head.has-team:before{background:linear-gradient(90deg,var(--accent),var(--accent-2))}
    .swatchbar{border-color:var(--theme-border)}
    .dfl-team-card{border-color:var(--theme-border)}
    .medicine-accent{border-left:3px solid var(--accent);border-right:3px solid var(--accent-2)}
    .theme-medicine .pill.green,.theme-medicine .pill.accent{color:#D9B744;border-color:rgba(212,167,44,.35);background:rgba(212,167,44,.10)}
    .theme-medicine .pill.red{color:#F07868;border-color:rgba(178,58,43,.35);background:rgba(178,58,43,.10)}
    .theme-medicine .pill.blue{color:#E8E3D7;border-color:rgba(247,244,234,.28);background:rgba(247,244,234,.08)}
    .theme-medicine .section-link,.theme-medicine .card-cta{color:#D9B744}
    .theme-medicine .hero-mark{color:#D9B744}
    .theme-medicine .hero-creed strong{color:#F07868}
    .theme-dfl .pill.green,.theme-dfl .pill.accent{color:${DFL_INK.red};border-color:rgba(208,32,43,.38);background:rgba(208,32,43,.10)}
    .theme-dfl .pill.blue{color:${DFL_INK.blue};border-color:rgba(30,67,160,.45);background:rgba(30,67,160,.14)}
    .theme-dfl .pill.red{color:${DFL_INK.red};border-color:rgba(208,32,43,.38);background:rgba(208,32,43,.10)}
    .theme-dfl .section-link,.theme-dfl .card-cta,.theme-dfl .hero-mark{color:${DFL_INK.red}}
    .theme-dfl .hero-creed strong{color:${DFL_INK.blue}}
    /* Anything that says a number or a word in the accent colour has to use
       the readable red, not the crest red - see the note on THEMES.dfl. */
    .theme-dfl .gc-topar.under,.theme-dfl .golf-leader-score,.theme-dfl .gd-clock-lbl,
    .theme-dfl .gm-opt.is-on,.theme-dfl .gd-pick.is-cap,.theme-dfl .admin-badge{color:${DFL_INK.red}}
    .theme-dfl .brand-text span{text-shadow:0 0 12px rgba(208,32,43,.5)}
  `;
  document.head.appendChild(style);
}

function setVars(theme, name) {
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.primary);
  root.style.setProperty("--accent-2", theme.secondary);
  root.style.setProperty("--accent-dim", theme.secondary);
  root.style.setProperty("--on-accent", "#fff");
  root.style.setProperty("--theme-primary", theme.primary);
  root.style.setProperty("--theme-secondary", theme.secondary);
  root.style.setProperty("--accent-ink", theme.ink || theme.primary);
  root.style.setProperty("--accent-2-ink", theme.ink2 || theme.secondary);
  document.body?.setAttribute("data-theme", name);
  document.body?.classList.toggle("theme-dfl", name === "dfl");
  document.body?.classList.toggle("theme-medicine", name === "medicine");
  document.body?.classList.toggle("theme-bluegreen", name === "bluegreen");
  // Black for the crest, same as Medicine Wheel: the browser chrome should
  // match the logo's banner, not glow red around it.
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content",
    name === "medicine" || name === "dfl" ? "#0A0A0A" : theme.primary);
}

export function applyTheme(value) { injectThemeStyles(); const name = THEMES[value] ? value : DEFAULT_THEME; setVars(THEMES[name], name); }
export function saveTheme(value) { const name = THEMES[value] ? value : DEFAULT_THEME; localStorage.setItem(KEY, name); applyTheme(name); }
export function savedTheme() { const value = localStorage.getItem(KEY); return THEMES[value] ? value : DEFAULT_THEME; }
export function initTheme() { applyTheme(savedTheme()); }
export function themeOptions() { return [{ id:"dfl",name:"DFL Crest",primary:THEMES.dfl.primary,secondary:THEMES.dfl.secondary },{ id:"medicine",name:"Medicine Wheel",primary:THEMES.medicine.primary,secondary:THEMES.medicine.secondary },{ id:"bluegreen",name:"Blue / Green",primary:THEMES.bluegreen.primary,secondary:THEMES.bluegreen.secondary }]; }
export function teamColors(value) { const name=THEMES[value]?value:DEFAULT_THEME; const theme=THEMES[name]; return {name:themeOptions().find(x=>x.id===name).name,primary:theme.primary,secondary:theme.secondary}; }
