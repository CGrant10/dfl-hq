// =====================================================================
// experience.js - optional tactile/audio feedback and contextual atmosphere
// =====================================================================

const SOUND_KEY = "dfl.experience.sound";
const HAPTIC_KEY = "dfl.experience.haptics";

const read = (key, fallback) => {
  try { const value = localStorage.getItem(key); return value == null ? fallback : value === "1"; }
  catch { return fallback; }
};
const write = (key, on) => { try { localStorage.setItem(key, on ? "1" : "0"); } catch {} };

export const soundEnabled = () => read(SOUND_KEY, false);
export const hapticsEnabled = () => read(HAPTIC_KEY, true);
export const setSoundEnabled = on => write(SOUND_KEY, Boolean(on));
export const setHapticsEnabled = on => write(HAPTIC_KEY, Boolean(on));

const vibrations = { tick: 8, success: [16, 35, 22], alert: [28, 35, 28], payout: [14, 24, 14, 24, 32] };
function vibrate(kind) {
  if (!hapticsEnabled() || !globalThis.navigator?.vibrate) return;
  try { globalThis.navigator.vibrate(vibrations[kind] || vibrations.tick); } catch {}
}

function tone(kind) {
  if (!soundEnabled()) return;
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Audio) return;
  try {
    const context = new Audio();
    const gain = context.createGain();
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.055, context.currentTime + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .24);
    gain.connect(context.destination);
    const notes = kind === "alert" ? [220, 330] : kind === "payout" ? [330, 440, 660] : [420, 560];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = kind === "alert" ? "sawtooth" : "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      const start = context.currentTime + index * .055;
      oscillator.start(start);
      oscillator.stop(start + .13);
    });
    setTimeout(() => context.close().catch(() => {}), 550);
  } catch {}
}

export function feedback(kind = "tick") {
  vibrate(kind);
  if (kind !== "tick") tone(kind);
}

export function experienceSettingsMarkup() {
  return `<div class="experience-settings" aria-label="App feedback">
    <label><span><strong>Haptic feedback</strong><small>Short phone taps for controls and completed actions.</small></span><input type="checkbox" data-experience-haptics ${hapticsEnabled() ? "checked" : ""}></label>
    <label><span><strong>Sound effects</strong><small>Optional result, alert and payout stings. Muted by default.</small></span><input type="checkbox" data-experience-sound ${soundEnabled() ? "checked" : ""}></label>
    <button type="button" class="btn ghost small" data-experience-preview>Preview feedback</button>
  </div>`;
}

export function wireExperienceSettings(root) {
  root?.querySelector?.("[data-experience-haptics]")?.addEventListener("change", event => {
    setHapticsEnabled(event.currentTarget.checked);
    if (event.currentTarget.checked) vibrate("success");
  });
  root?.querySelector?.("[data-experience-sound]")?.addEventListener("change", event => {
    setSoundEnabled(event.currentTarget.checked);
    if (event.currentTarget.checked) tone("success");
  });
  root?.querySelector?.("[data-experience-preview]")?.addEventListener("click", () => feedback("success"));
}

export function syncExperience(view, route) {
  const body = document.body;
  if (!body) return;
  if (route === "golf") { delete body.dataset.atmosphere; return; }
  const copy = String(view?.textContent || "").toLowerCase();
  const state = document.body.classList.contains("has-breaking-trade") ? "breaking"
    : route === "sportsbook" ? "sportsbook"
      : route === "trade" || route === "analyzer" ? "front-office"
        : route === "home" && /all players final|win secured|final report/.test(copy) ? "final"
          : route === "home" && /live score|\blive\b/.test(copy) ? "live"
            : route === "home" ? "pregame" : "clubhouse";
  body.dataset.atmosphere = state;
}

export function startExperience() {
  document.addEventListener("click", event => {
    if (location.hash.startsWith("#/golf")) return;
    if (event.target.closest("[data-experience-preview]")) return;
    if (event.target.closest("button,[role='tab'],summary,.tabbar a")) vibrate("tick");
  }, { passive: true });
  let momentTimer = 0;
  window.addEventListener("dfl:moment", event => {
    const kind = event.detail?.kind || "success";
    feedback(kind);
    document.body.dataset.moment = kind;
    document.body.classList.remove("is-dfl-moment");
    void document.body.offsetWidth;
    document.body.classList.add("is-dfl-moment");
    clearTimeout(momentTimer);
    momentTimer = setTimeout(() => document.body.classList.remove("is-dfl-moment"), 720);
  });
}
