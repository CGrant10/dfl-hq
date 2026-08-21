/* =====================================================================
   golf-theme.js - Golf looks like Golf, whatever you picked in your profile
   ---------------------------------------------------------------------
   THE PROBLEM. The palette is a member setting: pick a club in your profile
   and the whole app wears it. That is right everywhere except here. Golf is
   a shared surface - four people standing on the same tee, passing a phone
   around to enter a card - and it was rendering in four different colour
   schemes, so the scorecard a member opened looked nothing like the one
   beside it. The tints on that card are not decoration either: under, level
   and over par are colour, and a club palette moves them.

   SO THE ROUTE PINS THE PALETTE. Every #/golf screen paints one theme,
   Medicine Wheel unless a commissioner says otherwise, and leaving golf
   hands the member their own theme straight back.

   WHAT THIS IS NOT. It does not change, save, or read past the member's
   own choice. theme.js keeps the pin out of localStorage entirely
   (see pinMode there), so the profile picker still shows what they picked
   and there is nothing to restore when they navigate away.

   THE ADMIN CONTROL. One key in app_settings - golf.theme - so it is one
   answer for the whole app rather than a column on every outing, and the
   RLS on that table is what refuses a non-admin write. The picker below
   only hides a button; Postgres is the gate. Missing table, missing key,
   or a value that no longer names a real palette all fall through to
   Medicine Wheel rather than to whatever the member happened to pick.
   ===================================================================== */
import { pinMode, modeOptions, modeLabel } from "./theme.js";
import { loadSettings, saveSetting } from "./settings.js";
import { canEdit } from "./inline.js";
import { esc, toast } from "./ui.js";

export const GOLF_THEME_KEY = "golf.theme";
const DEFAULT_GOLF_THEME = "medicine";

/* The three written-out palettes only. A club palette is somebody's team
   identity and has no business being the house look of a golf day, so the
   picker does not offer the 32 of them - and "Match my phone" is the one
   thing this feature exists to stop. */
const CHOOSABLE = ["medicine", "dark", "light"];

let wanted = DEFAULT_GOLF_THEME;

const onGolf = () => (location.hash || "#/home").split("?")[0] === "#/golf";

/** Pin while golf is open, release the moment it is not. */
function sync() {
  pinMode(onGolf() ? wanted : "");
}

async function readSetting() {
  try {
    const settings = await loadSettings();
    const stored = String(settings.get(GOLF_THEME_KEY) || "").trim();
    wanted = CHOOSABLE.includes(stored) ? stored : DEFAULT_GOLF_THEME;
  } catch {
    /* No settings table yet is not an error - it is a league that has not
       run settings_schema.sql, and the default is a fine answer. */
    wanted = DEFAULT_GOLF_THEME;
  }
  sync();
}

// ------------------------------------------------------------ the control

function markup() {
  const name = (id) => modeOptions().find((o) => o.id === id)?.name || modeLabel(id);
  return `<details class="card golf-theme-card">
    <summary class="card-title-row">
      <span class="card-title">Golf look</span>
      <span class="pill">${esc(name(wanted))}</span>
    </summary>
    <div class="card-body">
      <p class="muted tiny">Every golf screen paints this for everybody, whatever each member picked in their own profile. It does not change anybody's profile theme.</p>
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
  sync();                       // paint it now; the write can take its time
  paintControls();
  try {
    await saveSetting(GOLF_THEME_KEY, id);
    /*
      READ IT BACK, because a refused write does not come back as an error.
      Row level security makes the upsert match nothing and PostgREST answers
      204 - so somebody without the admin token would see the palette change
      on their own phone and a toast saying it changed for everybody, while
      the table never moved. Same trap mustWrite() exists for in pages/golf.js.
    */
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

/* Every hole this page left, filled or emptied together. A non-admin gets
   an empty placeholder rather than a disabled control: there is nothing
   here for them to know about. */
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

/*
  Pin from the FIRST paint, not after the settings round trip. Booting
  straight onto a golf link would otherwise show the member's own palette
  for as long as the network took, which is exactly the flash this exists
  to remove. The stored value refines it a moment later if it differs.
*/
sync();
void readSetting().then(paintControls);

/* The event page and the events list both leave a hole, and both are built
   after this module runs. Same watch the other golf modules use. */
new MutationObserver(() => {
  if (document.querySelector(".golf-theme-page:empty") && canEdit()) paintControls();
}).observe(document.body, { childList: true, subtree: true });
