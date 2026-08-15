// =====================================================================
// store.js - everything we remember on this device (localStorage)
// =====================================================================

const KEY_NAME  = "dfl.username";
const KEY_ADMIN = "dfl.adminToken";
const KEY_REDUCE_RACE_MOTION = "dfl.reduceRaceMotion";
export const RACE_MOTION_CHANGE = "dfl:race-motion-change";

export function getUsername() {
  return localStorage.getItem(KEY_NAME) || "";
}

export function setUsername(name) {
  localStorage.setItem(KEY_NAME, String(name).trim().slice(0, 30));
}

export function clearUsername() {
  localStorage.removeItem(KEY_NAME);
}

// The admin "token" is simply the admin password. It is only ever sent to
// Supabase over HTTPS in a request header; Postgres decides if it is valid.
export function getAdminToken() {
  return localStorage.getItem(KEY_ADMIN) || "";
}

export function setAdminToken(token) {
  if (token) localStorage.setItem(KEY_ADMIN, token);
  else       localStorage.removeItem(KEY_ADMIN);
}

// Arena motion is an explicit app preference. It deliberately does not read
// prefers-reduced-motion: the race must not silently change because of an OS
// or browser setting. Missing storage is the full-motion default.
export function getReduceRaceMotion() {
  return localStorage.getItem(KEY_REDUCE_RACE_MOTION) === "1";
}

export function setReduceRaceMotion(reduced) {
  if (reduced) localStorage.setItem(KEY_REDUCE_RACE_MOTION, "1");
  else localStorage.removeItem(KEY_REDUCE_RACE_MOTION);
  window.dispatchEvent(new CustomEvent(RACE_MOTION_CHANGE, {
    detail: { reduced: Boolean(reduced) },
  }));
}

export function onReduceRaceMotionChange(listener) {
  const notify = () => listener(getReduceRaceMotion());
  const stored = (event) => {
    if (event.key === KEY_REDUCE_RACE_MOTION || event.key == null) notify();
  };
  window.addEventListener(RACE_MOTION_CHANGE, notify);
  window.addEventListener("storage", stored);
  return () => {
    window.removeEventListener(RACE_MOTION_CHANGE, notify);
    window.removeEventListener("storage", stored);
  };
}
