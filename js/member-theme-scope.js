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
.tabbar :is(a,.tabmore),.tabbar :is(a,.tabmore).on,.tabbar :is(a,.tabmore):hover,
.tabbar :is(a,.tabmore) svg,.tabbar :is(a,.tabmore) .ico{color:#fff!important}
.tabbar :is(a,.tabmore).on::before,.tabbar :is(a,.tabmore).on::after{background:var(--accent-sweep)!important}
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
