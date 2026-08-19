// =====================================================================
// router.js - hash based routing (#/home, #/rules, ...)
// Hash routing is used because GitHub Pages cannot rewrite URLs.
// =====================================================================

import { loading, errorBox } from "./ui.js";
import { ensureSportsbookNav } from "./sportsbook-nav.js";

// Pages are loaded on demand, so the first paint stays fast.
const routes = {
  home:     () => import("./pages/home.js"),
  rules:    () => import("./pages/rules.js"),
  keepers:  () => import("./pages/keepers.js"),
  polls:    () => import("./pages/polls.js"),
  arena:    () => import("./pages/arena.js"),
  golf:     () => import("./pages/golf.js"),
  sportsbook:() => import("./pages/sportsbook.js"),
  broadcast:() => import("./pages/broadcast.js"),
  calendar: () => import("./pages/calendar.js"),
  history:  () => import("./pages/history.js"),
  facts:    () => import("./pages/facts.js"),
  finances: () => import("./pages/finances.js"),
  profile:  () => import("./pages/profile-locked.js"),
  admin:    () => import("./pages/admin.js"),
};

/** Every page module name. Used by the updater to refresh unvisited pages. */
export function routeNames() { return Object.keys(routes); }
export function currentRoute() {
  const name = (location.hash || "#/home").replace("#/", "").split("?")[0];
  return routes[name] ? name : "home";
}
export function go(name) { location.hash = "#/" + name; }

let leaving = null;
const listeners = new Set();
export function onRoute(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function setTabIndicatorTarget(target) {
  const bar = document.getElementById("tabbar");
  if (!bar || !target) return;
  bar.style.setProperty("--tab-x", `${target.offsetLeft}px`);
  bar.style.setProperty("--tab-w", `${target.offsetWidth}px`);
  bar.classList.add("has-indicator");
}
function syncTabIndicator() {
  const bar = document.getElementById("tabbar");
  if (!bar) return;
  const active = bar.querySelector("a.on") ||
    (document.getElementById("more-btn")?.classList.contains("on") ? document.getElementById("more-btn") : null);
  if (!active) { bar.classList.remove("has-indicator"); return; }
  setTabIndicatorTarget(active);
}

export async function renderRoute() {
  const name = currentRoute();
  const view = document.getElementById("view");
  const changed = name !== lastAnimated;
  if (changed) { view.classList.remove("page-in"); view.classList.add("page-switching"); }
  try { leaving?.(); } catch (err) { console.warn(err); }
  leaving = null;

  let matched = false;
  document.querySelectorAll("#tabbar a").forEach((a) => {
    const on = a.dataset.route === name;
    if (on) matched = true;
    a.classList.toggle("on", on);
  });
  document.getElementById("more-btn")?.classList.toggle("on", !matched);
  syncTabIndicator();

  view.innerHTML = loading();
  try {
    const mod = await routes[name]();
    if (typeof mod.leave === "function") leaving = mod.leave;
    await mod.render(view);
    if (name === "profile") {
      import("./profile-commissioner.js")
        .then((m) => m.decorateCommissionerBadge(view))
        .catch(() => {});
    }
  } catch (err) { view.innerHTML = errorBox(err); }

  window.scrollTo(0, 0);
  lastAnimated = name;
  if (changed) {
    view.classList.remove("page-switching");
    void view.offsetWidth;
    view.classList.add("page-in");
  }
  for (const fn of listeners) { try { fn(name); } catch (err) { console.warn(err); } }
}

let lastAnimated = null;
export function startRouter() {
  ensureSportsbookNav();
  const bar = document.getElementById("tabbar");
  bar?.addEventListener("pointerdown", (event) => {
    const target = event.target.closest("a[data-route]");
    if (target) setTabIndicatorTarget(target);
  }, { passive: true });
  window.addEventListener("resize", syncTabIndicator);
  window.addEventListener("hashchange", renderRoute);
  if (!location.hash) location.hash = "#/home";
  renderRoute();
}
