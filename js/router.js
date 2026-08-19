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

/*
  WHO WANTS TELLING WHEN THE ROUTE CHANGES.

  BottomLine and other subscribers still receive the settled route AFTER the
  page has rendered. The tab indicator no longer needs to wait for that point:
  it is shell chrome, so the router can measure it as soon as the route starts.
*/
const listeners = new Set();
export function onRoute(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/*
  THE TAB INDICATOR HAS TWO MOMENTS:

    pointerdown   preview the tab under the thumb immediately
    route start   reconcile to the actual route (Back/Forward included)

  The second step is authoritative, so a preview can never leave the bar in a
  false state. Geometry is still measured from the real elements; no equal-tab
  assumption and no change to the routing contract.
*/
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
  if (!active) {
    bar.classList.remove("has-indicator");
    return;
  }
  setTabIndicatorTarget(active);
}

export async function renderRoute() {
  const name = currentRoute();
  const view = document.getElementById("view");
  const changed = name !== lastAnimated;

  /* Give the thumb immediate visual acknowledgement while the page module is
     loading/rendering. This class is presentation only; it never delays work. */
  if (changed) {
    view.classList.remove("page-in");
    view.classList.add("page-switching");
  }

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

  /* Route start, not render completion. This is what removes the lag on a tap
     and also keeps browser Back/Forward perfectly in sync. */
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
  } catch (err) {
    view.innerHTML = errorBox(err);
  }

  window.scrollTo(0, 0);

  /*
    THE ROUTE TRANSITION.

    The subtle `page-switching` state began at route start, so the tap already
    felt acknowledged while this work happened. Once the actual page exists,
    remove that state and play the existing entrance animation. Same-route
    re-renders remain animation-free, exactly as before.
  */
  lastAnimated = name;
  if (changed) {
    view.classList.remove("page-switching");
    void view.offsetWidth;
    view.classList.add("page-in");
  }

  /* After the page exists, so subscribers that need page content can measure it. */
  for (const fn of listeners) {
    try { fn(name); } catch (err) { console.warn(err); }
  }
}

/* The last route the transition actually played for - see above. */
let lastAnimated = null;

export function startRouter() {
  ensureSportsbookNav();
  const bar = document.getElementById("tabbar");
  /* pointerdown fires at contact, before click/hashchange. Only direct route
     tabs preview; More is a sheet, so it stays put until a route is chosen. */
  bar?.addEventListener("pointerdown", (event) => {
    const target = event.target.closest("a[data-route]");
    if (target) setTabIndicatorTarget(target);
  }, { passive: true });

  window.addEventListener("resize", syncTabIndicator);
  window.addEventListener("hashchange", renderRoute);
  if (!location.hash) location.hash = "#/home";
  renderRoute();
}
