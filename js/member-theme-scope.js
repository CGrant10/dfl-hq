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

/*
  PROFILE VISUALS ARE DYNAMIC.

  profile.js and profile-dfl.js rebuild their DOM after member switches and
  edits. Tag the actual rendered elements instead of relying on :has() or a
  chain of ancestor selectors. These classes become the stable contract for
  the polish below and survive every repaint because the observer re-applies
  them whenever Profile changes.
*/
function tagProfileVisuals(root = document) {
  const grid = root.querySelector?.("#profile-wrap .statgrid.is-3up");
  if (grid) {
    grid.classList.add("dfl-career-grid");
    grid.closest(".card")?.classList.add("dfl-career-card");
  }

  for (const trophy of root.querySelectorAll?.(".profile-head .ph-record .is-gold .ico-trophy") || []) {
    trophy.classList.add("dfl-profile-champ-trophy");
  }
}

function watchProfileVisuals() {
  tagProfileVisuals(document);
  const target = document.getElementById("app") || document.body || document.documentElement;
  if (!target || target.dataset?.profilePolishWatch === "1") return;
  if (target.dataset) target.dataset.profilePolishWatch = "1";
  new MutationObserver(() => tagProfileVisuals(document))
    .observe(target, { childList: true, subtree: true });
}

/* Keep the standalone stylesheet, but also install the critical visual rules
   directly from this module. This module is already part of app boot, so these
   rules cannot be skipped by a stale/missing stylesheet link. */
function loadPermanentChromeStyles() {
  if (!document.getElementById("dfl-profile-neutral-css")) {
    const link = document.createElement("link");
    link.id = "dfl-profile-neutral-css";
    link.rel = "stylesheet";
    link.href = "css/profile-neutral.css?v=1.109.92";
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

/* Career: explicit rendered classes, no :has() and no inferred structure. */
#profile-wrap .dfl-career-card{
  background:linear-gradient(180deg,var(--bg-2),color-mix(in srgb,var(--bg) 42%,var(--bg-2) 58%))!important;
  border:1px solid var(--line)!important;
  box-shadow:var(--shadow)!important
}
#profile-wrap .dfl-career-card .card-title{
  background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;
  -webkit-text-fill-color:var(--text)!important;color:var(--text)!important
}
#profile-wrap .dfl-career-grid{
  gap:1px!important;
  background:color-mix(in srgb,var(--line) 72%,transparent)!important;
  border:1px solid var(--line)!important;
  border-radius:14px!important;
  overflow:hidden!important
}
#profile-wrap .dfl-career-grid>.stat{
  background:color-mix(in srgb,var(--bg-2) 96%,#000 4%)!important;
  border:0!important;border-radius:0!important;box-shadow:none!important;
  padding:15px 8px!important
}
#profile-wrap .dfl-career-grid .stat-v,
#profile-wrap .dfl-career-grid .stat-v.good,
#profile-wrap .dfl-career-grid .stat-v.warn,
#profile-wrap .dfl-career-grid .stat-v.bad{
  background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;
  -webkit-text-fill-color:var(--text)!important;color:var(--text)!important
}
#profile-wrap .dfl-career-grid .stat-l{color:var(--muted)!important}

/* Championship hardware gets a real shiny gold treatment on the exact SVG. */
.dfl-profile-champ-trophy{
  color:#e7c66a!important;
  filter:drop-shadow(0 0 5px rgba(231,198,106,.38)) drop-shadow(0 1px 0 rgba(255,255,255,.08))!important
}
.dfl-profile-champ-trophy path:not([fill="none"]),
.dfl-profile-champ-trophy rect{
  fill:url(#dfl-gold-grad)!important
}
.dfl-profile-champ-trophy path[fill="none"]{
  stroke:url(#dfl-gold-grad)!important
}
`;
  document.head.appendChild(style);
}
loadPermanentChromeStyles();
watchProfileVisuals();

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
