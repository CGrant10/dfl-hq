// =====================================================================
// router.js - hash based routing (#/home, #/rules, ...)
// Hash routing is used because GitHub Pages cannot rewrite URLs.
// =====================================================================

import { loading, errorBox } from "./ui.js";

// Pages are loaded on demand, so the first paint stays fast.
const routes = {
  home:     () => import("./pages/home.js"),
  rules:    () => import("./pages/rules.js"),
  keepers:  () => import("./pages/keepers.js"),
  polls:    () => import("./pages/polls.js"),
  arena:    () => import("./pages/arena.js"),
  golf:     () => import("./pages/golf.js"),
  broadcast:() => import("./pages/broadcast.js"),
  calendar: () => import("./pages/calendar.js"),
  history:  () => import("./pages/history.js"),
  facts:    () => import("./pages/facts.js"),
  finances: () => import("./pages/finances.js"),
  profile:  () => import("./pages/profile.js"),
  admin:    () => import("./pages/admin.js"),
};

/** Every page module name. Used by the updater to refresh unvisited pages. */
export function routeNames() {
  return Object.keys(routes);
}

export function currentRoute() {
  const name = (location.hash || "#/home").replace("#/", "").split("?")[0];
  return routes[name] ? name : "home";
}

export function go(name) {
  location.hash = "#/" + name;
}

/** Draw the current route into #view and light up the matching tab. */
// The page we are on, so it can be told when it is being left. Only the
// broadcast view needs this - it owns a rAF loop and a realtime channel, and
// leaving those running behind the next page would keep drawing over it.
let leaving = null;

export async function renderRoute() {
  const name = currentRoute();
  const view = document.getElementById("view");

  try { leaving?.(); } catch (err) { console.warn(err); }
  leaving = null;

  let matched = false;
  document.querySelectorAll("#tabbar a").forEach((a) => {
    const on = a.dataset.route === name;
    if (on) matched = true;
    a.classList.toggle("on", on);
  });
  /* Only four routes have a tab now. Everything else came in through More, so
     More is what should look active - otherwise the bar shows nothing selected
     and you cannot tell where you are. */
  document.getElementById("more-btn")?.classList.toggle("on", !matched);

  view.innerHTML = loading();
  try {
    const mod = await routes[name]();
    if (typeof mod.leave === "function") leaving = mod.leave;
    await mod.render(view);
  } catch (err) {
    view.innerHTML = errorBox(err);
  }

  window.scrollTo(0, 0);

  // Fade/slide the new page in. Restarting the animation needs the class
  // removed, a forced reflow, then the class back on.
  view.classList.remove("page-in");
  void view.offsetWidth;
  view.classList.add("page-in");
}

export function startRouter() {
  window.addEventListener("hashchange", renderRoute);
  if (!location.hash) location.hash = "#/home";
  renderRoute();
}
