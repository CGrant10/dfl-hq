// DFL HQ service worker
const CACHE_NAME = "dfl-hq-v1.116.0";
/* a.espncdn.com serves the NFL club logos on the profile and the Wall.
   Caching it means a logo seen once still renders offline. */
const CDN_HOSTS = new Set(["cdn.jsdelivr.net","fonts.googleapis.com","fonts.gstatic.com","a.espncdn.com"]);
const APP_SHELL = ["./","./index.html","./css/tokens.css","./css/style.css","./css/ui.css","./css/screens.css","./css/marquee.css","./css/stage.css","./css/broadcast.css","./css/broadcast-base.css","./css/golf.css","./css/splash-loading.css","./css/home.css","./css/profile-neutral.css","./css/arena-beta.css","./css/arena-beta-production.css","./css/arena-beta-render.css","./assets/arena-beta/arena-beta-render-valid.jpg","./fonts/rajdhani-600.woff2","./fonts/rajdhani-700.woff2","./manifest.json","./js/config.js","./js/app.js","./js/install.js","./js/update.js","./js/members.js","./js/member-lock.js","./js/member-theme-scope.js","./js/league-photo-feature.js","./js/engagement-home.js","./js/arena-duration-ui.js","./js/arena/landscape-lock.js","./js/arena/mobile-broadcast-performance.js","./js/presence.js","./js/theme.js","./js/router.js","./js/sportsbook-nav.js","./js/profile-commissioner.js","./js/profile-identity.js","./js/identity-rules.js","./js/nfl-teams.js","./js/team-theme.js","./js/icons.js","./js/store.js","./js/supabase.js","./js/focus-trap.js","./js/keeper-advisor.js","./js/keeper-rules.js","./js/keeper-entry.js","./js/keeper-self.js","./js/ui.js","./js/lore.js","./js/whatsnew.js","./js/broadcast-deck.js","./js/broadcast-stage.js","./js/broadcast-inbox.js","./js/member-wall.js","./js/marquee.js","./js/golf-guest.js","./js/golf-join.js","./js/crud.js","./js/form.js","./js/image-field.js","./js/image-shrink.js","./js/form-layout.js","./js/inline.js","./js/sections.js","./js/settings.js","./js/sleeper.js","./js/sync.js","./js/pages/home.js","./js/pages/rules.js","./js/pages/keepers.js","./js/pages/polls.js","./js/pages/arena.js","./js/pages/arena-beta.js","./js/arena-beta/vehicle-renderer.js","./js/pages/golf.js","./js/pages/sportsbook.js","./js/sportsbook-ticket.js","./js/pages/proposals.js","./js/chip-eaters.js","./js/activity.js","./js/sleeper-bracket.js","./js/name-pick.js","./js/season-result.js","./js/golf-scorecard.js","./js/golf-offline.js","./js/golf-battle.js","./js/golf-people.js","./js/share.js","./js/fact-share.js","./js/golf-share.js","./js/golf-match.js","./js/golf-matches.js","./js/golf-live.js","./js/golf-theme.js","./js/collapse.js","./js/golf-courses.js","./js/golf-draft.js","./js/golf-bag.js","./js/pages/broadcast.js","./js/arena/race.js?legacy=1","./js/arena/race-forward-shim.js","./js/arena/race-time-normalize.js","./js/arena/pixi-runtime.js?finish-base=1","./js/arena/pixi-runtime-finish.js","./js/arena/duck-physics.js","./js/arena/racer-view.js","./js/arena/sprites.js","./js/arena/dfl-sprites.js","./js/pages/calendar.js","./js/pages/history.js","./js/pages/facts.js","./js/funfacts.js","./js/pages/finances.js","./js/pages/profile.js","./js/pages/profile-locked.js","./js/pages/profile-dfl.js","./js/pages/admin.js","./js/pages/admin_commissioners.js","./js/pages/admin_sleeper.js","./js/pages/admin_finance.js","./js/pages/admin_finance_setup.js","./js/pages/admin_broadcast.js","./icons/app-192.png","./icons/app-512.png","./icons/app-maskable-512.png","./icons/mark-192.png","./icons/mark-512.png","./icons/mark-maskable-512.png","./icons/crest-512.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./icons/apple-touch-icon.png","./icons/logo-64.png","./icons/logo-crest.png","./icons/dfl-seal-512.png","./icons/dfl-seal-192.png","./js/bottomline.js","./js/ticker-lines.js","./js/broadcast-order.js","./js/profile-share.js"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE_NAME).then(async c=>{
  const missing=[];
  await Promise.all(APP_SHELL.map(url=>c.add(url).catch(()=>missing.push(url))));
  if(missing.length)console.warn("[sw] not precached:",missing);
}).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
function revalidating(request){try{return new Request(request,{cache:"no-cache"});}catch{return request;}}
self.addEventListener("fetch",event=>{
  const{request}=event;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.hostname.endsWith("supabase.co")||url.hostname.endsWith("sleeper.app")||url.pathname.endsWith("/version.txt"))return;

  /* The Arena engine shims used to live HERE: this handler rewrote requests
     for race.js and pixi-runtime.js to race-forward-shim.js and
     pixi-runtime-finish.js. That made the patched race engine conditional on
     a service worker being installed AND already in control - a first visit,
     a cleared SW, or any context that never registers one silently ran the
     unpatched engine. Since the simulation is seeded and the phone and the
     OBS Broadcast view must compute the same race from that seed, one side
     having the SW and the other not meant a desynced race.

     The importers now name the shims directly. The shims are still the only
     importers of the originals, via ?legacy=1 / ?finish-base=1 - keep those
     queries: a stale SW from before this change still rewrites the bare
     paths, and without the query it would rewrite a shim to itself. */

  event.respondWith(fetch(revalidating(request)).then(response=>{
    if(response.ok&&(url.origin===location.origin||CDN_HOSTS.has(url.hostname))){
      const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(request,copy));
    }
    return response;
  }).catch(async()=>{
    const cached=await caches.match(request);if(cached)return cached;
    if(request.mode==="navigate")return caches.match("./index.html");
    return Response.error();
  }));
});