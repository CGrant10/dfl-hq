// Member-switch theme reconciliation + permanent league chrome.
import { db } from "./supabase.js";
import { currentMember } from "./members.js";
import { applyTheme, isTeamMode, teamModeFor } from "./theme.js";
import "./arena-duration-ui.js";

const MODE_KEY = "dfl.mode";
const PICKABLE = new Set(["dark", "light", "medicine", "system"]);

function validMode(value) {
  const v = String(value || "");
  if (PICKABLE.has(v)) return v;
  if (isTeamMode(v)) return teamModeFor(v.slice("team:".length)) || "";
  return "";
}

/* Keep the standalone stylesheet, but also install the critical visual rules
   directly from this module. This module is already part of app boot, so these
   rules cannot be skipped by a stale/missing stylesheet link. */
function loadPermanentChromeStyles() {
  if (!document.getElementById("dfl-profile-neutral-css")) {
    const link = document.createElement("link");
    link.id = "dfl-profile-neutral-css";
    link.rel = "stylesheet";
    link.href = "css/profile-neutral.css?v=1.109.91";
    document.head.appendChild(link);
  }

  if (document.getElementById("dfl-visual-polish-hardfix")) return;
  const style = document.createElement("style");
  style.id = "dfl-visual-polish-hardfix";
  style.textContent = `
/* League chrome stays neutral. SVG symbols in index.html use a gradient inside
   <use>, which CSS cannot pierce; filtering the rendered SVG neutralizes the
   actual pixels instead. */
.brand-word,.brand-text .brand-word,.brand-text .brand-word span{
  background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;
  -webkit-text-fill-color:#fff!important;color:#fff!important
}
.tabbar :is(a,.tabmore){color:#fff!important}
.tabbar :is(a,.tabmore) svg,#more svg,.sheet-card svg{
  filter:grayscale(1) saturate(0) brightness(1.7)!important;
  opacity:.9!important
}
.tabbar :is(a,.tabmore).on svg{opacity:1!important}

/* Career: make the difference unmistakable. One dark integrated panel with
   neutral figures instead of six themed/light boxes. */
#profile-wrap .card:has(.statgrid.is-3up){
  background:linear-gradient(180deg,var(--bg-2),color-mix(in srgb,var(--bg) 36%,var(--bg-2) 64%))!important;
  border:1px solid var(--line)!important;
  box-shadow:var(--shadow)!important
}
#profile-wrap .card:has(.statgrid.is-3up) .card-title{
  background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;
  -webkit-text-fill-color:var(--text)!important;color:var(--text)!important
}
#profile-wrap .statgrid.is-3up{
  gap:1px!important;background:var(--line-soft)!important;border:1px solid var(--line-soft)!important;
  border-radius:12px!important;overflow:hidden!important
}
#profile-wrap .statgrid.is-3up>.stat{
  background:color-mix(in srgb,var(--bg-2) 94%,#000 6%)!important;
  border:0!important;border-radius:0!important;box-shadow:none!important;padding:14px 8px!important
}
#profile-wrap .statgrid.is-3up .stat-v,
#profile-wrap .statgrid.is-3up .stat-v.good,
#profile-wrap .statgrid.is-3up .stat-v.warn{
  background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;
  -webkit-text-fill-color:var(--text)!important;color:var(--text)!important
}
#profile-wrap .statgrid.is-3up .stat-l{color:var(--muted)!important}

/* Profile championship trophy is real inline SVG, so its paths ARE reachable.
   Paint it with the league gold gradient rather than member theme colors. */
.profile-head .ph-record .is-gold{color:#e7c66a!important}
.profile-head .ph-record .is-gold .ico-trophy{filter:drop-shadow(0 0 5px rgba(231,198,106,.35))!important}
.profile-head .ph-record .is-gold .ico-trophy path:not([fill="none"]),
.profile-head .ph-record .is-gold .ico-trophy rect{fill:url(#dfl-gold-grad)!important}
.profile-head .ph-record .is-gold .ico-trophy path[fill="none"]{stroke:url(#dfl-gold-grad)!important}
`;
  document.head.appendChild(style);
}
loadPermanentChromeStyles();

/**
 * Repaint for the newly-selected member without ever writing a theme back.
 * If that member has no saved theme, clear the previous member's local value
 * so theme.js falls through to its normal Medicine Wheel default.
 */
export async function adoptSelectedMemberTheme() {
  const me = currentMember();
  if (!me) return;

  try {
    const { data, error } = await db()
      .from("members")
      .select("theme_mode")
      .eq("id", me.id)
      .maybeSingle();
    if (error) throw error;

    const remote = validMode(data?.theme_mode);
    if (remote) localStorage.setItem(MODE_KEY, remote);
    else localStorage.removeItem(MODE_KEY);
    applyTheme();
  } catch (err) {
    if (!/theme_mode|could not find|does not exist|schema cache/i.test(err?.message || "")) {
      console.warn("theme: could not switch member palette", err);
    }
    localStorage.removeItem(MODE_KEY);
    applyTheme();
  }
}
