// DFL HQ service worker
const CACHE_NAME = "dfl-hq-v1.319.0";
const APP_CACHE_PREFIX = "dfl-hq-v";
const CDN_HOSTS = new Set(["cdn.jsdelivr.net","fonts.googleapis.com","fonts.gstatic.com","a.espncdn.com"]);
const APP_SHELL = [
  "./css/app-shell.css?v=1.319.0","./css/home-layout.css?v=1.319.0",
  "./css/home-broadcast-design.css?v=1.319.0","./assets/home-broadcast-stadium.webp","./css/home-newspaper.css?v=1.319.0","./assets/dfl-daily-hero.webp","./assets/dfl-daily-crest.webp","./assets/dfl-daily-splatter.webp","./assets/dfl-daily-champion.webp","./assets/dfl-daily-chip-eater.webp","./assets/dfl-daily-archive.webp","./assets/dfl-daily-rivalry.webp","./assets/dfl-daily-paper.webp","./assets/dfl-daily-wordmark.webp","./assets/dfl-daily-wordmark-medicine.webp","./assets/dfl-daily-ten.webp","./assets/dfl-daily-headline.webp","./icons/dfl-seal-heritage-512.webp","./js/home-presentation.js",
  "./assets/anniversary-ten.webp",
  "./js/league-results.js","./js/game-day-league.js","./js/game-day-dom.js","./js/game-day-panels.js","./js/game-day-moments.js","./js/game-day-moments-model.js",
  "./js/player-card-actions.js","./js/player-card.js","./js/player-card-model.js","./js/player-card-data.js","./js/view-memory.js","./js/trade-draft.js","./js/rivalry-story.js","./js/rivalry-story-model.js","./js/performance-policy.js","./css/connected-experience.css?v=1.319.0",
  "./js/share-editorial.js","./js/share-layouts.js","./js/share-layout-model.js","./js/share-export-model.js","./css/share-preview.css?v=1.319.0","./fonts/anton-regular.woff2","./fonts/inter-latin-variable.woff2","./images/share/editorial-paper.webp",
  "./css/game-day-watch.css?v=1.319.0","./js/game-day-watch.js","./js/game-day-experience-model.js","./js/game-day-player-rows.js",
  "./js/nfl-game-day.js","./js/game-day-model.js","./js/game-day.js","./js/game-day-score-motion.js","./js/game-day-matchup-share.js", "./js/matchup-banter.js", "./js/player-spotlight.js", "./js/player-spotlight-model.js", "./js/score-temperature.js", "./js/score-vfx.js", "./js/score-vfx-shaders.js",
  "./js/clubhouse-matchup-model.js","./js/clubhouse-matchup-cards.js","./js/clubhouse-matchup-live.js",
  "./js/page-disclosure.js", "./js/injury-report-model.js", "./js/injury-report-data.js", "./js/injury-report-ui.js",
  "./js/pages/facts.js","./js/fact-share.js","./js/funfacts.js","./js/clubhouse-play.js","./js/league-trivia.js","./js/league-play-model.js","./js/lineup-lab.js","./js/lineup-lab-ui.js",
  // Complete static dependency graph for startup and the core clubhouse routes.
  "./js/activity.js",
  "./js/aftermath-share.js",
  "./js/arena-duration-ui.js",
  "./js/arena/dfl-sprites.js",
  "./js/arena/landscape-lock.js",
  "./js/arena/sprite-themes.js",
  "./js/brand-ink.js",
  "./js/broadcast-artwork.js",
  "./js/broadcast-deck.js",
  "./js/broadcast-order.js",
  "./js/broadcast-stage.js",
  "./js/chip-eaters.js",
  "./js/collapse.js",
  "./js/dfl-scoring.js",
  "./js/draft-order-data.js",
  "./js/draft-order.js",
  "./js/engagement-home.js",
  "./js/experience.js",
  "./js/focus-trap.js",
  "./js/form-layout.js",
  "./js/form-value.js",
  "./js/form.js",
  "./js/funfacts.js",
  "./js/golf-guest.js",
  "./js/golf-join.js",
  "./js/home-slides.js",
  "./js/home-week-outlook.js",
  "./js/icons.js",
  "./js/identity-rules.js",
  "./js/image-field.js",
  "./js/image-shrink.js",
  "./js/inline.js",
  "./js/install.js",
  "./js/lazy-css.js",
  "./js/league-photo-feature.js",
  "./js/live-score.js",
  "./js/lore.js",
  "./js/marquee.js",
  "./js/member-theme-scope.js",
  "./js/nfl-teams.js",
  "./js/pages/sportsbook.js",
  "./js/player-presentation.js",
  "./js/power-pulse.js",
  "./js/presence.js",
  "./js/profile-identity.js",
  "./js/quick-sleeper-sync.js",
  "./js/scroll-assembly.js",
  "./js/sections.js",
  "./js/settings.js",
  "./js/share.js",
  "./js/share-card-style.js",
  "./js/sleeper-bracket.js",
  "./js/sleeper-sync-scope.js",
  "./js/sleeper.js",
  "./js/sportsbook-nav.js",
  "./js/sportsbook-props.js",
  "./js/sportsbook-core-props.js",
  "./js/sportsbook-fantasy-weeks.js",
  "./js/sportsbook-ticket.js",
  "./js/sync.js",
  "./js/team-analyzer-data.js",
  "./js/team-analyzer.js",
  "./js/team-presentation.js",
  "./js/team-theme.js",
  "./js/theme.js",
  "./js/ticker-lines.js",
  "./js/trade-alerts.js",
  "./js/update.js",
  "./js/whatsnew.js",
  "https://cdn.jsdelivr.net/npm/@supabase/auth-js@2.112.3/+esm",
  "https://cdn.jsdelivr.net/npm/@supabase/functions-js@2.112.3/+esm",
  "https://cdn.jsdelivr.net/npm/@supabase/phoenix@0.4.5/+esm",
  "https://cdn.jsdelivr.net/npm/@supabase/postgrest-js@2.112.3/+esm",
  "https://cdn.jsdelivr.net/npm/@supabase/realtime-js@2.112.3/+esm",
  "https://cdn.jsdelivr.net/npm/@supabase/storage-js@2.112.3/+esm",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm",
  "https://cdn.jsdelivr.net/npm/iceberg-js@0.8.1/+esm",
  "https://cdn.jsdelivr.net/npm/tslib@2.8.1/+esm",

  "./js/league-search.js","./js/wall-conversations.js","./js/wall-drafts.js","./js/weekly-clubhouse-model.js","./js/weekly-clubhouse-data.js","./js/weekly-clubhouse-ui.js","./js/weekly-clubhouse-share.js","./js/pages/clubhouse.js","./js/wall-reactions.js","./js/sportsbook-loading.js","./js/sportsbook-view-state.js","./js/member-wall.js","./js/pages/wall.js",
  "./js/golf-quick-save-core.js",
  "./js/league-history-week.js",
  "./js/golf-quick-save-state.js",
  "./js/weekly-signal-changes.js",
  "./js/trade-accountability.js",
  "./js/trade-model-health.js",
  "./js/notification-device-state.js",
  "./js/service-worker.js","./js/pickem-state.js","./js/golf-event-status.js","./js/pages/calendar.js",
  "./","./index.html","./manifest.json","./css/power-pulse-system.css?v=1.319.0","./css/stakes.css",
  "./css/tokens.css","./css/style.css","./css/ui.css","./css/screens.css","./css/sportsbook.css","./js/sportsbook-slip.js","./js/sportsbook-pickem.js","./js/sleeper-prop-import.js","./js/sleeper-prop-import-ui.js","./css/golf.css","./css/home.css","./css/home-editorial.css?v=1.319.0","./css/breaking-trade.css","./css/nav-neutral.css?v=1.319.0","./css/update-gate.css",
  "./js/config.js","./js/app.js","./js/season-nav.js","./js/router.js","./js/ui.js","./js/store.js","./js/supabase.js","./js/members.js","./js/member-preview.js","./js/member-lock.js",
  "./js/performance.js","./js/performance-findings.js","./js/pages/admin_performance.js","./js/pages/admin_operations.js","./js/breaking-trade.js","./js/custom-alerts.js","./js/league-state.js","./js/league-stakes.js","./js/weekly-briefing.js","./js/pages/stakes.js","./js/sleeper-sync-schedule.js",
  "./js/notifications.js","./js/notification-core.js","./js/notify-nudge.js","./js/profile-notifications.js","./js/weekly-outlook.js","./js/trade-desk.js","./js/pages/trade.js","./js/player-history.js","./js/season-outlook.js","./js/league-trajectory.js","./js/trend-panel.js","./js/weekly-outlook-panel.js","./css/weekly-outlook.css","./js/pages/notifications.js","./js/pages/admin_notifications.js","./css/notifications.css","./icons/badge-96.png",
  "./js/pages/home.js","./js/home-clubhouse.js","./js/next-move.js","./js/pages/golf.js","./js/golf-theme.js","./js/golf-event-modes.js","./js/golf-gps-course-map.js","./js/golf-gps-distance.js","./js/golf-gps-beta.js","./js/golf-gps-red-trail-beta.js","./js/golf-gps-rolla-beta.js","./js/golf-gps-imported.js","./js/nav-neutral.js",
  "./js/golf-tournament-beta.js","./js/golf-tournament-beta-format.js","./js/golf-tournament-beta-rules.js","./js/golf-score-result.js","./js/golf-club-recommendation.js","./js/golf-offline.js","./js/golf-battle.js","./js/golf-board.js",
  /* The rendering marks, not the launcher icons. app-512.png was 232KB of
     precache for an image the page never draws - only the OS reads it, at
     install time, when there is by definition a network. The splash mark and
     brand mark ARE drawn on first paint and were not cached at all. */
  /* Update-gate artwork is fetched only if the gate is actually shown. The
     anniversary uses its optimized WebP directly from Home instead. */
  "./icons/dfl-seal-heritage-512.webp","./icons/dfl-seal-heritage-64.webp",
  "./icons/app-192.png","./icons/apple-touch-icon.png"
];
const SHELL_URLS = new Set(APP_SHELL.map(path => new URL(path, self.registration.scope).href));
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE_NAME).then(async c=>{
  const missing=[];
  await Promise.all(APP_SHELL.map(url=>c.add(url).catch(()=>missing.push(url))));
  if(missing.length)console.warn("[sw] not precached:",missing);
}).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys
  /* Retire old app shells only. Sleeper data caches have their own expiry
     rules and must survive a DFL release. */
  .filter(k=>k.startsWith(APP_CACHE_PREFIX)&&k!==CACHE_NAME)
  .map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
function revalidating(request){try{return new Request(request,{cache:"no-cache"});}catch{return request;}}
async function refreshCached(request){
  try{
    const response=await fetch(revalidating(request));
    if(response.ok){const copy=response.clone();await caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
    return response;
  }catch{return null;}
}
function usableCached(response,request){
  if(!response)return false;
  const type=response.headers.get("content-type")||"";
  if(request.destination==="style")return type.includes("text/css");
  if(request.destination==="script")return /javascript|ecmascript/.test(type);
  if(request.mode==="navigate")return type.includes("text/html");
  return true;
}
self.addEventListener("fetch",event=>{
  const{request}=event;if(request.method!=="GET")return;const url=new URL(request.url);
  if(url.hostname.endsWith("supabase.co")||url.hostname.endsWith("sleeper.app")||url.pathname.endsWith("/version.txt"))return;
  const shellRequest=url.origin===location.origin&&(request.mode==="navigate"||SHELL_URLS.has(url.href.split("?")[0]));
  if(shellRequest){
    const refreshRequest=request.mode==="navigate"?new Request(new URL("./index.html",self.registration.scope),{credentials:"same-origin"}):request;
    const refresh=refreshCached(refreshRequest);
    event.waitUntil(refresh.then(()=>{}));
    /* The update button deliberately adds ?u=. That navigation must wait for
       the network response instead of immediately handing the old shell back
       from cache, otherwise the same update banner can loop forever. */
    if(request.mode==="navigate"&&url.searchParams.has("u")){
      event.respondWith((async()=>{
        const fresh=await refresh;
        if(usableCached(fresh,request))return fresh;
        return await caches.match("./index.html")||Response.error();
      })());
      return;
    }
    event.respondWith((async()=>{
      const candidate=await caches.match(request,{ignoreSearch:true})||request.mode==="navigate"&&await caches.match("./index.html");
      const cached=usableCached(candidate,request)?candidate:null;
      if(cached)return cached;
      return await refresh||Response.error();
    })());
    return;
  }
  event.respondWith(fetch(revalidating(request)).then(response=>{
    if(response.ok&&(url.origin===location.origin||CDN_HOSTS.has(url.hostname))){const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(request,copy));}
    return response;
  }).catch(async()=>await caches.match(request)||Response.error()));
});

/* Web Push arrives here even while the installed app is closed. Payloads are
   deliberately small and every destination is an internal hash route. */
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { data = { body: event.data?.text() || "" }; }
  const url = /^#\/[a-z0-9-]+(?:\?[^\s]*)?$/i.test(data.url || "") ? data.url : "#/notifications";
  /*
    THE BADGE IS NOT THE APP ICON, AND USING THE APP ICON FOR IT IS WHY THE
    STATUS BAR SHOWED A WHITE BOX.

    Android throws away the badge's colour and keeps ONLY its alpha channel, so
    every opaque pixel becomes solid white. app-192.png is a full-bleed seal
    with no transparency, which is a perfect white square by the time Android
    is done with it. badge-96.png is the shape drawn in transparency instead.

    Fixed here rather than taken from the payload, so a sender cannot put a
    colour icon back in this slot - and so the fix lands with the service
    worker, without waiting on an Edge Function deploy.

    renotify needs a tag, which is always set below. Without it a second
    notification silently replaces the first: no sound, no buzz, no banner.
  */
  event.waitUntil(self.registration.showNotification(data.title || "DFL HQ", {
    body: data.body || "You have a new league update.",
    icon: data.icon || "icons/app-192.png",
    badge: "icons/badge-96.png",
    tag: data.messageId ? `dfl-notification-${data.messageId}` : "dfl-notification",
    renotify: true,
    vibrate: [90, 60, 90],
    data: { url, messageId: data.messageId || null },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "#/notifications", self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async clients => {
    const existing = clients.find(client => new URL(client.url).origin === new URL(target).origin);
    if (existing) { await existing.focus(); existing.navigate(target); return; }
    return self.clients.openWindow(target);
  }));
});

