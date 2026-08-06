// =====================================================================
// store.js - everything we remember on this device (localStorage)
// =====================================================================

const KEY_NAME  = "dfl.username";
const KEY_ADMIN = "dfl.adminToken";

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
