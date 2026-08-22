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

let wanted = DEFAULT_GOLF_THEME;

const onGolf = () => (location.hash || "#/home").split("?")[0] === "#/golf";

/** Golf pins the page palette only. The nav owns its own neutral styling. */
function sync() {
  pinMode(onGolf() ? wanted : "");
}

/*
  Tournament controls predate commissioner roles and still call their access
  badge "Admin only". That is no longer true: an authenticated commissioner
  with Golf permission can use them, and Commissioner Owners inherit every
  commissioner permission. Keep the existing class/style, but make the words
  match the actual authorization model. Restrict this to Golf and to the exact
  legacy label so LIVE/Complete/etc badges are never touched.
*/
function paintAccessLabels() {
  if (!onGolf()) return;
  for (const badge of document.querySelectorAll("#golf-outing .admin-badge")) {
    if (badge.textContent?.trim() === "Admin only") {
      badge.textContent = "Commissioner";
      badge.title = "Commissioner access";
      badge.setAttribute("aria-label", "Commissioner access");
    }
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
      <p class="muted tiny">Every golf screen paints this for everybody, whatever each member picked in their own profile. The navigation keeps its own stable look.</p>
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
      throw new Error("The database refused that. Sign in as commissioner and try again.");
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
  paintAccessLabels();
}

document.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-golf-theme]");
  if (btn) void choose(btn.dataset.golfTheme);
});

window.addEventListener("hashchange", () => { sync(); paintControls(); paintAccessLabels(); });
sync();
void readSetting().then(() => { paintControls(); paintAccessLabels(); });

new MutationObserver(() => {
  if (document.querySelector(".golf-theme-page:empty") && canEdit()) paintControls();
  paintAccessLabels();
}).observe(document.body, { childList: true, subtree: true });
