/* =====================================================================
   golf-theme.js - Golf looks like Golf, whatever you picked in your profile
   ===================================================================== */
import { pinMode, modeOptions, modeLabel } from "./theme.js";
import { loadSettings, saveSetting } from "./settings.js";
import { canEdit } from "./inline.js";
import { esc, toast } from "./ui.js";

export const GOLF_THEME_KEY = "golf.theme";
const DEFAULT_GOLF_THEME = "medicine";
const CHOOSABLE = ["medicine", "dark", "light"];
const NAV_VARS = ["--accent","--accent-2","--accent-fill","--accent-2-fill","--accent-sweep","--accent-sweep-135","--text","--muted","--chalk"];

let wanted = DEFAULT_GOLF_THEME;
let navHeld = false;

const onGolf = () => (location.hash || "#/home").split("?")[0] === "#/golf";

/* Golf owns the page palette, but never the member's bottom navigation.
   Capture the member palette before pinMode() repaints the root and hold those
   few inherited tokens directly on the tab bar for the life of the Golf route. */
function holdMemberNavTheme(){
  const bar=document.getElementById("tabbar");
  if(!bar||navHeld)return;
  const root=getComputedStyle(document.documentElement);
  for(const name of NAV_VARS)bar.style.setProperty(name,root.getPropertyValue(name));
  navHeld=true;
}
function releaseMemberNavTheme(){
  const bar=document.getElementById("tabbar");
  if(bar)for(const name of NAV_VARS)bar.style.removeProperty(name);
  navHeld=false;
}

/** Pin while golf is open, release the moment it is not. */
function sync() {
  if(onGolf()){
    holdMemberNavTheme();
    pinMode(wanted);
  }else{
    pinMode("");
    releaseMemberNavTheme();
  }
}

async function readSetting() {
  try {
    const settings = await loadSettings();
    const stored = String(settings.get(GOLF_THEME_KEY) || "").trim();
    wanted = CHOOSABLE.includes(stored) ? stored : DEFAULT_GOLF_THEME;
  } catch {
    wanted = DEFAULT_GOLF_THEME;
  }
  sync();
}

function markup() {
  const name = (id) => modeOptions().find((o) => o.id === id)?.name || modeLabel(id);
  return `<details class="card golf-theme-card">
    <summary class="card-title-row">
      <span class="card-title">Golf look</span>
      <span class="pill">${esc(name(wanted))}</span>
    </summary>
    <div class="card-body">
      <p class="muted tiny">Every golf screen paints this for everybody, whatever each member picked in their own profile. The navigation keeps that member's own look.</p>
      <div class="gt-picker">${CHOOSABLE.map((id) => `
        <button type="button" class="gt-swatch${id === wanted ? " on" : ""}" data-golf-theme="${esc(id)}" aria-pressed="${id === wanted}">${esc(name(id))}</button>`).join("")}
      </div>
    </div>
  </details>`;
}

async function choose(id) {
  if (!CHOOSABLE.includes(id) || id === wanted) return;
  const before = wanted;
  wanted = id;
  sync();
  paintControls();
  try {
    await saveSetting(GOLF_THEME_KEY, id);
    const check = await loadSettings({ force: true });
    if (String(check.get(GOLF_THEME_KEY) || "") !== id) {
      throw new Error("The database refused that. Sign in as admin and try again.");
    }
    toast(`Golf now paints ${modeLabel(id)} for everybody`);
  } catch (err) {
    wanted = before;
    sync();
    paintControls();
    toast(err?.message || "Could not save the golf look", true);
  }
}

function paintControls() {
  for (const slot of document.querySelectorAll(".golf-theme-page")) {
    slot.innerHTML = canEdit() ? markup() : "";
  }
}

document.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-golf-theme]");
  if (btn) void choose(btn.dataset.golfTheme);
});

window.addEventListener("hashchange", () => { sync(); paintControls(); });
sync();
void readSetting().then(paintControls);

new MutationObserver(() => {
  if (document.querySelector(".golf-theme-page:empty") && canEdit()) paintControls();
}).observe(document.body, { childList: true, subtree: true });
