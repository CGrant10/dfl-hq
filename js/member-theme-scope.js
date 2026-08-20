// Member-switch theme reconciliation + permanent league chrome.
// Boot keeps the existing theme.js behavior; a live identity switch must not
// publish the previous member's browser-local palette into the next member.
import { db } from "./supabase.js";
import { currentMember } from "./members.js";
import { applyTheme, isTeamMode, teamModeFor } from "./theme.js";

const MODE_KEY = "dfl.mode";
const PICKABLE = new Set(["dark", "light", "medicine", "system"]);

function validMode(value) {
  const v = String(value || "");
  if (PICKABLE.has(v)) return v;
  if (isTeamMode(v)) return teamModeFor(v.slice("team:".length)) || "";
  return "";
}

/* DFL itself stays DFL. Member colors belong to content, controls and the
   active-position marker, not the permanent wordmark/nav ink. Keeping this
   here means the rule loads with the theme-switch fix and cannot be skipped by
   an old HTML cache that has not learned about a new stylesheet yet. */
function lockLeagueChrome() {
  if (document.getElementById("dfl-chrome-lock")) return;
  const style = document.createElement("style");
  style.id = "dfl-chrome-lock";
  style.textContent = `
.brand-word,.brand-text .brand-word,.brand-text .brand-word span{
  background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;
  -webkit-text-fill-color:#fff!important;color:#fff!important
}
.tabbar :is(a,.tabmore),.tabbar :is(a,.tabmore).on,.tabbar :is(a,.tabmore):hover{color:#fff!important}
.tabbar :is(a,.tabmore) svg{color:#c7cfda!important}
.tabbar :is(a,.tabmore).on svg{color:#fff!important}
.tabbar :is(a,.tabmore) svg [stroke]{stroke:currentColor!important}
.tabbar :is(a,.tabmore) svg [fill]:not([fill="none"]){fill:currentColor!important}
#more svg,.sheet-card svg{color:#c7cfda!important}
#more svg [stroke],.sheet-card svg [stroke]{stroke:currentColor!important}
#more svg [fill]:not([fill="none"]),.sheet-card svg [fill]:not([fill="none"]){fill:currentColor!important}
.tabbar :is(a,.tabmore).on::before,.tabbar :is(a,.tabmore).on::after{background:var(--accent-sweep)!important}

/* Career is league history, not team branding. Blend it into the app's dark
   surface system and keep its numbers neutral instead of painting six little
   theme-coloured tiles inside a card. */
#profile-wrap .card:has([data-share-profile]){
  background:linear-gradient(180deg,var(--bg-2),color-mix(in srgb,var(--bg-2) 86%,var(--bg) 14%))!important;
  border-color:var(--line)!important;
  box-shadow:var(--shadow)!important
}
#profile-wrap .card:has([data-share-profile]) .card-title,
#profile-wrap .card:has([data-share-profile]) .stat-v,
#profile-wrap .card:has([data-share-profile]) .stat-v.good,
#profile-wrap .card:has([data-share-profile]) .stat-v.warn{
  background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;
  -webkit-text-fill-color:var(--text)!important;color:var(--text)!important
}
#profile-wrap .card:has([data-share-profile]) .stat{
  background:color-mix(in srgb,var(--bg-2) 82%,var(--bg) 18%)!important;
  border-color:var(--line-soft)!important;
  box-shadow:none!important
}
#profile-wrap .card:has([data-share-profile]) .stat-l{color:var(--muted)!important}

/* A championship trophy is hardware, not a member accent. Use the same shiny
   gold gradient as the rest of the league trophies and give it a tiny gleam. */
.profile-head .ph-record .is-gold svg{color:#e7c66a!important;filter:drop-shadow(0 0 4px rgba(231,198,106,.24))}
.profile-head .ph-record .is-gold svg [stroke]{stroke:url(#dfl-gold-grad)!important}
.profile-head .ph-record .is-gold svg [fill]:not([fill="none"]){fill:url(#dfl-gold-grad)!important}
`;
  document.head.appendChild(style);
}
lockLeagueChrome();

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
    // A missing migration should not break member switching. More importantly,
    // do not publish or copy the previous member's local theme in this path.
    if (!/theme_mode|could not find|does not exist|schema cache/i.test(err?.message || "")) {
      console.warn("theme: could not switch member palette", err);
    }
    localStorage.removeItem(MODE_KEY);
    applyTheme();
  }
}
