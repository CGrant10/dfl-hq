// =====================================================================
// app.js - start-up: username prompt, admin restore, router, service worker
// =====================================================================

import { APP_VERSION } from "./config.js";
import { getUsername, setUsername } from "./store.js";
import { restoreAdmin, registerUser, configured } from "./supabase.js";
import { startRouter, renderRoute } from "./router.js";
import { toast } from "./ui.js";

const welcome      = document.getElementById("welcome");
const welcomeForm  = document.getElementById("welcome-form");
const welcomeInput = document.getElementById("welcome-input");
const welcomeCancel= document.getElementById("welcome-cancel");
const whoamiName   = document.getElementById("whoami-name");

function paintName() {
  whoamiName.textContent = getUsername() || "Set name";
}

/** Show the "what is your league name" overlay. */
function askName({ cancellable = false } = {}) {
  welcomeInput.value = getUsername();
  welcomeCancel.classList.toggle("hidden", !cancellable);
  welcome.classList.remove("hidden");
  setTimeout(() => welcomeInput.focus(), 50);
}

welcomeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = welcomeInput.value.trim();
  if (!name) return;

  setUsername(name);
  paintName();
  welcome.classList.add("hidden");
  await registerUser(name);
  toast(`Welcome, ${name}`);
  renderRoute();                       // votes / signups depend on the name
});

welcomeCancel.addEventListener("click", () => welcome.classList.add("hidden"));

// Tapping the name chip in the header lets you change it.
document.getElementById("whoami").addEventListener("click", () => {
  askName({ cancellable: !!getUsername() });
});

async function boot() {
  console.log(`DFL HQ v${APP_VERSION}`);
  paintName();

  if (!configured) {
    toast("Add your Supabase keys in js/config.js", true);
  }

  await restoreAdmin();                // silently re-enable admin if remembered
  startRouter();

  if (!getUsername()) askName();       // first visit on this device
  else registerUser(getUsername());

  // Service worker: offline shell + faster loads. Skipped on file:// URLs.
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(console.warn);
  }
}

boot();
