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

  The Profile page rebuilds itself after member switches and edits, so tag the
  exact rendered surfaces every time it changes. There are two separate career
  surfaces on this page: the compact six-stat Career card and the record-book
  block introduced by the literal heading "The career". The latter is the one
  that needs the hard neutral treatment requested here.
*/
function tagProfileVisuals(root = document) {
  const grid = root.querySelector?.("#profile-wrap .statgrid.is-3up");
  if (grid) {
    grid.classList.add("dfl-career-grid");
    grid.closest(".card")?.classList.add("dfl-career-card");
  }

  for (const heading of root.querySelectorAll?.("#profile-wrap .section-title") || []) {
    if (String(heading.textContent || "").trim().toLowerCase() !== "the career") continue;
    heading.classList.add("dfl-the-career-title");
    const card = heading.nextElementSibling;
    if (card?.classList.contains("recbook")) card.classList.add("dfl-the-career-card");
  }

  for (const trophy of root.querySelectorAll?.(".profile-head .ph-record .is-gold .ico-trophy") || []) {
    trophy.classList.add("dfl-profile-champ-trophy");
  }

  const cabinetTrophy = root.querySelector?.("#profile-wrap .cabinet .cab-row:not(.is-second) .ico-sm");
  if (cabinetTrophy) cabinetTrophy.classList.add("dfl-cabinet-gold-trophy");
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
    link.href = "css/profile-neutral.css?v=1.109.93";
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

/* Compact Career stats stay restrained and neutral. */
#profile-wrap .dfl-career-card .card-title{
  background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;
  -webkit-text-fill-color:var(--text)!important;color:var(--text)!important
}
#profile-wrap .dfl-career-grid .stat-v,
#profile-wrap .dfl-career-grid .stat-v.good,
#profile-wrap .dfl-career-grid .stat-v.warn,
#profile-wrap .dfl-career-grid .stat-v.bad{
  background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;
  -webkit-text-fill-color:var(--text)!important;color:var(--text)!important
}

/* THE CAREER: this is the record-book card the user was referring to.
   It must ignore team/light theme surfaces completely and read as a quiet,
   permanent DFL panel. */
#profile-wrap .dfl-the-career-title{
  background:none!important;
  -webkit-background-clip:border-box!important;background-clip:border-box!important;
  -webkit-text-fill-color:#f4f6f8!important;
  color:#f4f6f8!important
}
#profile-wrap .dfl-the-career-card{
  background:#111419!important;
  border:1px solid #2a3038!important;
  box-shadow:0 10px 28px rgba(0,0,0,.22)!important
}
#profile-wrap .dfl-the-career-card .rec{
  background:#15191f!important
}
#profile-wrap .dfl-the-career-card .rec-val{
  background:none!important;
  -webkit-background-clip:border-box!important;background-clip:border-box!important;
  -webkit-text-fill-color:#f6f7f9!important;
  color:#f6f7f9!important
}
#profile-wrap .dfl-the-career-card .rec-label,
#profile-wrap .dfl-the-career-card .rec-when{
  color:#98a2af!important
}
#profile-wrap .dfl-the-career-card .rec-who{
  color:#dbe1e8!important
}

/* Championship hardware. The Trophy Cabinet icon is another <use>-based SVG,
   so paint the rendered pixels gold the same reliable way the nav is neutralized. */
.dfl-cabinet-gold-trophy{
  filter:grayscale(1) sepia(1) saturate(6) hue-rotate(350deg) brightness(1.18) contrast(1.08)
    drop-shadow(0 0 4px rgba(245,200,76,.42)) drop-shadow(0 1px 0 rgba(255,255,255,.16))!important;
  opacity:1!important
}

/* The tiny profile-header championship icon is inline SVG and can take the
   league gold gradient directly. */
.dfl-profile-champ-trophy{
  color:#e7c66a!important;
  filter:drop-shadow(0 0 5px rgba(231,198,106,.38)) drop-shadow(0 1px 0 rgba(255,255,255,.08))!important
}
.dfl-profile-champ-trophy path:not([fill="none"]),
.dfl-profile-champ-trophy rect{fill:url(#dfl-gold-grad)!important}
.dfl-profile-champ-trophy path[fill="none"]{stroke:url(#dfl-gold-grad)!important}
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
