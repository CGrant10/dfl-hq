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

/*
  THE LIFECYCLE RULE, and it is the whole of the convention.

    A page that creates a persistent resource in render() owns tearing it
    down in leave(). render() may call its own leave() first when it is
    rebuilding itself.

  "Persistent" means anything that outlives the DOM the router is about to
  throw away: an interval, a rAF loop, a Supabase realtime channel, an
  observer, a listener on window or document, or an unsubscribe callback.
  Listeners on elements the page itself created are NOT persistent - those
  die with the elements - so they need nothing.

  leave() is optional and deliberately stays that way. A page with no such
  resource must not grow an empty one for the sake of uniformity, because an
  empty leave() reads as "this was checked and there is cleanup here" when the
  truth is the opposite. There is no framework and no lifecycle manager: the
  four lines below are the entire mechanism.

  Exporting leave() today: broadcast (rAF loop, realtime channel, poll,
  ResizeObserver, Pixi renderer), home (the stage timer and the presence
  subscription) and arena (the shared-race watcher's channel and poll), plus
  golf (the leaderboard poll and its visibilitychange listener). The comment
  that used to sit here said only broadcast needed it, which stopped being
  true three features ago.
*/
let leaving = null;

export async function renderRoute() {
  const name = currentRoute();
  const view = document.getElementById("view");

  /* Before anything else, and never allowed to stop the navigation: a page
     that throws on the way out must not trap you on it. */
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
