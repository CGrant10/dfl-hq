// DFL HQ service worker
const CACHE_NAME = "dfl-hq-v1.109.81";
/* a.espncdn.com serves the NFL club logos on the profile and the Wall.
   Caching it means a logo seen once still renders offline. */
const CDN_HOSTS = new Set(["cdn.jsdelivr.net","fonts.googleapis.com","fonts.gstatic.com","a.espncdn.com"]);
const APP_SHELL = ["./","./index.html","./css/tokens.css","./css/style.css","./css/ui.css","./css/screens.css","./css/marquee.css","./css/stage.css","./css/broadcast.css","./css/broadcast-base.css","./css/golf.css","./css/splash-loading.css","./css/home.css","./fonts/rajdhani-600.woff2","./fonts/rajdhani-700.woff2","./manifest.json","./js/config.js","./js/app.js","./js/install.js","./js/update.js","./js/members.js","./js/member-lock.js","./js/presence.js","./js/theme.js","./js/router.js","./js/sportsbook-nav.js","./js/profile-commissioner.js","./js/profile-identity.js","./js/identity-rules.js","./js/nfl-teams.js","./js/team-theme.js","./js/icons.js","./js/store.js","./js/supabase.js","./js/focus-trap.js","./js/keeper-advisor.js","./js/keeper-rules.js","./js/keeper-entry.js","./js/keeper-self.js","./js/ui.js","./js/lore.js","./js/whatsnew.js","./js/broadcast-deck.js","./js/broadcast-stage.js","./js/broadcast-inbox.js","./js/member-wall.js","./js/marquee.js","./js/golf-guest.js","./js/golf-join.js","./js/crud.js","./js/form.js","./js/image-field.js","./js/image-shrink.js","./js/form-layout.js","./js/inline.js","./js/sections.js","./js/settings.js","./js/sleeper.js","./js/sync.js","./js/pages/home.js","./js/pages/rules.js","./js/pages/keepers.js","./js/pages/polls.js","./js/pages/arena.js","./js/pages/golf.js","./js/pages/sportsbook.js","./js/sportsbook-ticket.js","./js/pages/proposals.js","./js/chip-eaters.js","./js/activity.js","./js/sleeper-bracket.js","./js/name-pick.js","./js/season-result.js","./js/golf-scorecard.js","./js/golf-offline.js","./js/golf-battle.js","./js/golf-people.js","./js/share.js","./js/fact-share.js","./js/golf-share.js","./js/golf-match.js","./js/golf-matches.js","./js/collapse.js","./js/golf-courses.js","./js/golf-draft.js","./js/golf-bag.js","./js/pages/broadcast.js","./js/arena/race.js","./js/arena/race-forward-shim.js","./js/arena/pixi-runtime-finish.js","./js/arena/duck-physics.js","./js/arena/racer-view.js","./js/arena/sprites.js","./js/arena/dfl-sprites.js","./js/pages/calendar.js","./js/pages/history.js","./js/pages/facts.js","./js/funfacts.js","./js/pages/finances.js","./js/pages/profile.js","./js/pages/profile-locked.js","./js/pages/profile-dfl.js","./js/pages/admin.js","./js/pages/admin_commissioners.js","./js/pages/admin_sleeper.js","./js/pages/admin_finance.js","./js/pages/admin_finance_setup.js","./js/pages/admin_broadcast.js","./icons/app-192.png","./icons/app-512.png","./icons/app-maskable-512.png","./icons/mark-192.png","./icons/mark-512.png","./icons/mark-maskable-512.png","./icons/crest-512.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./icons/apple-touch-icon.png","./icons/logo-64.png","./icons/logo-crest.png","./icons/dfl-seal-512.png","./icons/dfl-seal-192.png","./js/bottomline.js","./js/ticker-lines.js","./js/broadcast-order.js","./js/profile-share.js"];
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

  // Finish-line presentation hotfix. Normal imports receive the wrapper,
  // while the wrapper's ?finish-base=1 import reaches the committed runtime
  // directly. This changes only finish.groundRatio/courseStopped; racer
  // physics, official finish times and order stay exact.
  if(url.origin===location.origin && url.pathname.endsWith("/js/arena/pixi-runtime.js") && url.searchParams.get("finish-base")!=="1"){
    const shim=new URL("./js/arena/pixi-runtime-finish.js",self.registration.scope);
    event.respondWith(fetch(new Request(shim,{cache:"no-cache"})).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(shim,copy));}
      return response;
    }).catch(async()=>await caches.match(shim)||Response.error()));
    return;
  }

  // Arena physics swap. All normal imports of race.js receive the forward-only
  // compatibility module. The shim imports race.js?legacy=1 to reuse helpers;
  // that query explicitly bypasses this redirect and prevents a module loop.
  if(url.origin===location.origin && url.pathname.endsWith("/js/arena/race.js") && url.searchParams.get("legacy")!=="1"){
    const shim=new URL("./js/arena/race-forward-shim.js",self.registration.scope);
    event.respondWith(fetch(new Request(shim,{cache:"no-cache"})).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(shim,copy));}
      return response;
    }).catch(async()=>await caches.match(shim)||Response.error()));
    return;
  }

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