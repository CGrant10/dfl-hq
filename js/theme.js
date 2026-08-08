// DFL HQ global theme system
// Default: Medicine Wheel (yellow, red, black, white).
// Alternate: Blue / Green.
const KEY = "dfl.theme";
const THEMES = {
  medicine: { primary: "#D4A72C", secondary: "#B23A2B", dark: "#0A0A0A", light: "#F7F4EA", accent3: "#FFFFFF" },
  bluegreen: { primary: "#2563EB", secondary: "#16A34A", dark: "#0D1117", light: "#F3F7FB", accent3: "#60A5FA" }
};

function injectThemeStyles() {
  if (document.getElementById("dfl-global-theme-style")) return;
  const style = document.createElement("style");
  style.id = "dfl-global-theme-style";
  style.textContent = `
    :root{--theme-primary:var(--accent);--theme-secondary:var(--accent-2);--theme-soft:color-mix(in srgb,var(--accent) 12%,transparent);--theme-soft-2:color-mix(in srgb,var(--accent-2) 10%,transparent);--theme-border:color-mix(in srgb,var(--accent) 34%,var(--line));}
    body{background:var(--bg);}
    .brand-text span,.brand-text small{color:var(--accent)}
    .tabbar a.on,.tabbar a:hover{color:var(--accent)}
    .tabbar a.on:after{background:linear-gradient(90deg,var(--accent),var(--accent-2))}
    .btn.primary,.btn.accent{background:linear-gradient(135deg,var(--accent),var(--accent-2));color:var(--on-accent);border-color:var(--accent)}
    .btn.ghost:hover,.btn:hover{border-color:var(--accent);color:var(--accent)}
    input:focus,select:focus,textarea:focus{border-color:var(--accent)!important;box-shadow:none}
    .whoami:hover{border-color:var(--accent);color:var(--accent)}
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
  document.body?.setAttribute("data-theme", name);
  document.body?.classList.toggle("theme-medicine", name === "medicine");
  document.body?.classList.toggle("theme-bluegreen", name === "bluegreen");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", name === "medicine" ? "#0A0A0A" : theme.primary);
}

export function applyTheme(value) { injectThemeStyles(); const name = THEMES[value] ? value : "medicine"; setVars(THEMES[name], name); }
export function saveTheme(value) { const name = THEMES[value] ? value : "medicine"; localStorage.setItem(KEY, name); applyTheme(name); }
export function savedTheme() { const value = localStorage.getItem(KEY); return THEMES[value] ? value : "medicine"; }
export function initTheme() { applyTheme(savedTheme()); }
export function themeOptions() { return [{ id:"medicine",name:"Medicine Wheel",primary:THEMES.medicine.primary,secondary:THEMES.medicine.secondary },{ id:"bluegreen",name:"Blue / Green",primary:THEMES.bluegreen.primary,secondary:THEMES.bluegreen.secondary }]; }
export function teamColors(value) { const name=THEMES[value]?value:"medicine"; const theme=THEMES[name]; return {name:themeOptions().find(x=>x.id===name).name,primary:theme.primary,secondary:theme.secondary}; }
