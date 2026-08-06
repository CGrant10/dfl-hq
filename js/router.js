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
  calendar: () => import("./pages/calendar.js"),
  history:  () => import("./pages/history.js"),
  owners:   () => import("./pages/owners.js"),
  finances: () => import("./pages/finances.js"),
  admin:    () => import("./pages/admin.js"),
};

export function currentRoute() {
  const name = (location.hash || "#/home").replace("#/", "").split("?")[0];
  return routes[name] ? name : "home";
}

export function go(name) {
  location.hash = "#/" + name;
}

/** Draw the current route into #view and light up the matching tab. */
export async function renderRoute() {
  const name = currentRoute();
  const view = document.getElementById("view");

  document.querySelectorAll("#tabbar a").forEach((a) => {
    a.classList.toggle("on", a.dataset.route === name);
  });

  view.innerHTML = loading();
  try {
    const mod = await routes[name]();
    await mod.render(view);
  } catch (err) {
    view.innerHTML = errorBox(err);
  }
  window.scrollTo(0, 0);
}

export function startRouter() {
  window.addEventListener("hashchange", renderRoute);
  if (!location.hash) location.hash = "#/home";
  renderRoute();
}
