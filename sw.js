// DFL HQ service worker
const CACHE_NAME = "dfl-hq-v1.487.0";
const APP_CACHE_PREFIX = "dfl-hq-v";
const CDN_HOSTS = new Set(["cdn.jsdelivr.net","fonts.googleapis.com","fonts.gstatic.com","a.espncdn.com"]);
const APP_SHELL = [
  "./js/player-directory-model.js","./js/player-directory-data.js",
  "./js/football-moments.js","./js/football-moment-share.js","./js/matchup-story.js","./js/matchup-highlights.js","./css/matchup-highlights.css",
  "./js/trade-intentions-model.js","./js/trade-intentions-ui.js","./js/trade-intentions-data.js","./css/trade-intentions.css",
  "./js/matchup-route-motion.js","./js/trade-receipt-motion.js",
  "./css/home-premium.css",
  "./js/daily-broadcast.js","./js/player-compare.js","./js/player-compare-data.js","./js/player-compare-model.js","./css/broadcast-premium.css","./css/player-compare.css",
  "./js/record-chases-model.js","./js/record-chases.js","./js/team-art.js","./css/team-art.css","./css/record-chases.css","./css/player-game-explorer.css","./assets/team-art/dfl-team-art-1470.webp",
  "./js/reading-preferences.js","./js/moment-recap.js","./css/decision-polish.css","./css/readability.css",
  "./js/route-history.js","./js/start-sit-ui.js","./css/start-sit.css",
  "./js/trade-alert-dock.js","./js/scroll-chrome.js",
  "./js/arena/stadium-orientation.js","./js/arena/stadium-motion.js","./js/arena/stadium-racer-labels.js","./js/arena/stadium-racer-roster.js","./js/arena/racer-kit-model.js","./js/arena/finish-model.js","./js/arena/finish-presentation.js","./js/arena/racer-character.js","./js/arena/racer-character-art.js","./js/arena/racer-kit-editor.js",
  "./js/pages/arena-stadium.js","./js/pages/arena-viewer.js","./js/arena/stadium-data.js","./js/arena/stadium-model.js","./js/arena/stadium-renderer.js","./js/arena/stadium-director.js","./js/arena/stadium-scene.js","./js/arena/stadium-crowd-model.js","./js/arena/stadium-crowd.js","./js/arena/stadium-feedback.js","./css/stadium-arena.css",
  "./css/app-shared.css?v=1.487.0","./js/trade-receive-controls.js","./js/trade-offer-search.js","./js/trade-offer-catalog.js","./js/workers/trade-offers.js","./js/tab-scroll-cues.js",
  "./js/player-watchlist-data.js","./js/player-watchlist-model.js","./js/watchlist-alerts.js","./js/player-watchlist-ui.js",
  "./js/loading-presentation.js","./js/home-score-collapse.js","./js/home-primary-action.js","./js/connected-artwork.js","./js/archive-route-motion.js","./js/broadcast-gesture-motion.js",
  "./js/player-form.js","./js/player-game-model.js","./js/player-game-explorer.js",

  "./js/analyzer-scouting.js",
  "./js/nav-highlight.js",
  "./js/dialog-viewport.js",
  "./js/ui-motion.js","./js/sheet-drag.js","./js/page-scroll-motion.js","./js/route-placeholder.js","./js/route-motion.js","./js/swipe-tabs.js","./js/horizontal-swipe.js","./js/home-injury-panel.js","./js/connected-portrait.js","./js/player-card-motion.js",
  "./js/clubhouse-polish.js",

  "./js/trade-routing.js","./js/trade-receipt-ui.js","./js/trade-workspace.js","./js/trade-connected-motion.js","./js/trade-workspace-ui.js","./js/sleeper-links.js","./js/trade-negotiation-model.js","./js/trade-negotiation-data.js","./js/trade-negotiation-ui.js",


  "./assets/home-broadcast-stadium.webp","./assets/dfl-daily-hero.webp","./assets/dfl-daily-splatter.webp","./assets/dfl-daily-champion.webp","./assets/dfl-daily-chip-eater.webp","./assets/dfl-daily-archive.webp","./assets/dfl-daily-rivalry.webp","./assets/dfl-daily-paper.webp","./assets/dfl-daily-wordmark.webp","./assets/dfl-daily-wordmark-medicine.webp","./assets/dfl-daily-ten.webp","./assets/dfl-daily-headline.webp","./js/home-presentation.js","./js/home-lead-story.js",
  "./assets/anniversary-ten.webp",
  "./js/league-results.js","./js/game-day-league.js","./js/game-day-dom.js","./js/game-day-panels.js","./js/game-day-moments.js","./js/game-day-moments-model.js",
  "./js/player-quick-actions.js","./js/player-quick-menu.js","./css/premium-actions.css","./js/arena/replay-share-model.js","./js/arena/replay-share.js","./js/player-card-actions.js","./js/player-card.js","./js/player-card-model.js","./js/player-card-data.js","./js/view-memory.js","./js/trade-draft.js","./js/trade-package-limits.js","./js/trade-offer-recheck.js","./js/league-health.js","./js/rivalry-story.js","./js/rivalry-story-model.js","./js/performance-policy.js",
  "./js/share-editorial.js","./js/share-layouts.js","./js/share-layout-model.js","./js/share-export-model.js","./fonts/anton-regular.woff2","./fonts/inter-latin-variable.woff2","./images/share/editorial-paper.webp",
  "./js/game-day-watch.js","./js/watch-score-collapse.js","./js/game-day-experience-model.js","./js/game-day-player-rows.js","./js/game-day-lineup-comparison.js",
  "./js/game-day-disclosure.js","./js/nfl-game-day.js","./js/live-football-model.js","./js/live-football.js","./js/live-football-data.js","./css/live-football.css","./js/game-day-model.js","./js/game-day.js","./js/game-day-score-motion.js","./js/game-day-moment-effects.js","./js/game-day-matchup-share.js", "./js/matchup-banter.js","./js/matchup-chirp-ui.js", "./js/player-spotlight.js", "./js/player-spotlight-model.js", "./js/player-week-detail-model.js", "./js/player-week-detail-data.js", "./js/player-week-details.js", "./js/home-highlight-model.js", "./js/home-highlight-data.js", "./js/home-highlight-ui.js", "./js/home-highlights.js","./js/highlight-browse-model.js","./js/home-matchup-preview.js","./js/clubhouse-team-highlights.js","./js/team-highlight-model.js", "./js/score-temperature.js", "./js/score-vfx.js", "./js/score-vfx-shaders.js",
  "./js/clubhouse-center.js","./js/clubhouse-center-model.js","./js/clubhouse-center-ui.js","./js/clubhouse-matchup-model.js","./js/clubhouse-matchup-cards.js","./js/clubhouse-matchup-live.js",
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
  "./js/broadcast-stage.js","./js/broadcast-depth.js",
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
  "./js/home-week-outlook.js","./js/home-week-flow.js",
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
  "./js/player-presentation.js","./js/trade-player-picker.js","./js/wall-composer.js","./js/wall-photo-viewer.js",
  "./js/power-pulse.js",
  "./js/league-power-model.js","./js/league-power-roster.js","./js/league-power-ui.js",
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
  "./js/sportsbook-core-props.js","./js/sportsbook-featured-props.js",
  "./js/sportsbook-fantasy-weeks.js",
  "./js/sportsbook-ticket.js",
  "./js/sync.js",
  "./js/team-analyzer-data.js","./js/analyzer-player-form.js","./js/analyzer-live-refresh.js",
  "./js/analyzer-league-context.js",
  "./js/current-team-names.js", "./js/expert-rankings-model.js", "./js/expert-rankings-data.js", "./js/trade-confidence.js", "./data/expert-ros-ppr.json",
  "./js/team-analyzer.js",
  "./js/trade-player-evidence.js",
  "./js/team-presentation.js", "./js/member-photo.js",
  "./js/team-theme.js",
  "./js/theme.js",
  "./js/ticker-lines.js",
  "./js/trade-alerts.js","./js/trade-receipt-model.js","./js/trade-alert-capture.js","./js/trade-verdict.js","./js/trade-assessment.js","./js/trade-suggestion-quality.js","./js/trade-auto-balance.js","./js/trade-refine-offers.js","./js/trade-package-edits.js","./js/trade-week-forecast.js","./js/trade-target-search.js","./js/trade-decision-ui.js","./js/trade-weekly-outlook.js",
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

  "./js/league-search.js","./js/player-search-index.js","./js/wall-conversations.js","./js/wall-drafts.js","./js/weekly-clubhouse-model.js","./js/weekly-clubhouse-data.js","./js/weekly-clubhouse-ui.js","./js/weekly-clubhouse-share.js","./js/pages/clubhouse.js","./js/wall-reactions.js","./js/sportsbook-loading.js","./js/sportsbook-view-state.js","./js/member-wall.js","./js/pages/wall.js",
  "./js/golf-quick-save-core.js",
  "./js/league-history-week.js",
  "./js/golf-quick-save-state.js",
  "./js/weekly-signal-changes.js",
  "./js/trade-accountability.js",
  "./js/trade-model-health.js",
  "./js/notification-device-state.js",
  "./js/service-worker.js","./js/pickem-state.js","./js/golf-event-status.js","./js/pages/calendar.js",
  "./","./index.html","./manifest.json","./css/stakes.css",
  "./css/tokens.css","./css/style.css","./css/ui.css","./css/screens.css","./css/sportsbook.css","./js/sportsbook-slip.js","./js/sportsbook-pickem.js","./js/sleeper-prop-import.js","./js/sleeper-prop-import-ui.js","./css/golf.css","./css/home.css","./css/breaking-trade.css","./css/update-gate.css",
  "./js/wall-continuity.js","./js/wall-live.js","./js/sportsbook-fantasy-results.js","./js/sportsbook-fantasy-data.js","./js/sportsbook-live.js","./js/sportsbook-settlement.js","./js/sportsbook-account-motion.js","./js/live-score-refresh.js","./js/score-freshness.js","./js/game-day-readiness.js","./js/matchup-finish.js","./js/matchup-finish-model.js","./css/matchup-finish.css","./js/lineup-alert-model.js","./js/waiver-coach.js","./js/advice-receipts.js","./js/advice-receipts-data.js","./js/advice-receipts-ui.js","./css/advice-receipts.css?v=1.487.0","./js/waiver-history-data.js","./js/waiver-intelligence.js","./js/waiver-intelligence-ui.js","./js/roster-coach-data.js","./js/roster-coach-ui.js","./js/matchup-targets.js","./js/weekly-roasts.js",
  "./js/config.js","./js/app.js","./js/season-nav.js","./js/router.js","./js/connection-recovery.js","./js/ui.js","./js/store.js","./js/supabase.js","./js/members.js","./js/member-preview.js","./js/member-lock.js",
  "./js/app-diagnostics.js","./js/performance.js","./js/performance-findings.js","./js/pages/admin_performance.js","./js/pages/admin_operations.js","./js/breaking-trade.js","./js/custom-alerts.js","./js/league-state.js","./js/league-stakes.js","./js/weekly-briefing.js","./js/roster-next-action.js","./js/pages/stakes.js","./js/sleeper-sync-schedule.js",
  "./js/notifications.js","./js/notification-core.js","./js/notify-nudge.js","./js/profile-notifications.js","./js/weekly-outlook.js","./js/trade-desk.js","./js/pages/trade.js","./js/player-history.js","./js/season-outlook.js","./js/league-trajectory.js","./js/trend-panel.js","./js/weekly-outlook-panel.js","./css/weekly-outlook.css","./js/pages/notifications.js","./js/pages/admin_notifications.js","./css/notifications.css","./icons/badge-96.png",
  "./js/pages/home.js","./js/home-clubhouse.js","./js/next-move.js","./js/pages/golf.js","./js/golf-theme.js","./js/golf-event-modes.js","./js/golf-gps-course-map.js","./js/golf-gps-distance.js","./js/golf-gps-beta.js","./js/golf-gps-red-trail-beta.js","./js/golf-gps-rolla-beta.js","./js/golf-gps-imported.js","./js/nav-neutral.js",
  "./js/golf-tournament-beta.js","./js/golf-tournament-beta-format.js","./js/golf-tournament-beta-rules.js","./js/golf-score-result.js","./js/golf-club-recommendation.js","./js/golf-offline.js","./js/golf-battle.js","./js/golf-board.js",
  /* The rendering marks, not the launcher icons. app-512.png was 232KB of
     precache for an image the page never draws - only the OS reads it, at
     install time, when there is by definition a network. The splash mark and
     brand mark ARE drawn on first paint and were not cached at all. */
  /* Update-gate artwork is fetched only if the gate is actually shown. The
     anniversary uses its optimized WebP directly from Home instead. */
  "./icons/dfl-logo-512.webp","./icons/dfl-logo-64.webp",
  "./icons/app-192.png","./icons/app-192-1410.png","./icons/dfl-logo-tile-256.webp","./icons/apple-touch-icon-1410.png","./icons/favicon-64-1410.png"
];
// The worker imports the manifest into its own installed script resources.
// A missing or mismatched bundle cannot activate under the new release label.
if(typeof importScripts==='function'){
  importScripts('./js/bundle/1.487.0/precache.js');
  if(self.DFL_BUNDLE_RELEASE!==CACHE_NAME.slice(APP_CACHE_PREFIX.length)||!Array.isArray(self.DFL_BUNDLE_SHELL)||!self.DFL_BUNDLE_SHELL.length)throw Error('Application bundle release mismatch');
}
const BUNDLED_STYLES=new Set(self.DFL_BUNDLE_STYLES||[]);
const PRECACHE = self.DFL_BUNDLE_SHELL
  ? [...APP_SHELL.filter(path=>!path.startsWith('./js/')&&!BUNDLED_STYLES.has(path)), ...self.DFL_BUNDLE_SHELL, './js/workers/trade-offers.js']
  : APP_SHELL;
// A release needs its complete code and styles, not every decorative image.
// Keep all compiled routes available offline; fill artwork after the first page.
const INSTALL_CACHE=PRECACHE.filter(path=>!/^\.\/(assets|images)\//.test(path));
const EXTRA_CACHE=PRECACHE.filter(path=>!INSTALL_CACHE.includes(path));
const BUNDLE_URLS=new Set((self.DFL_BUNDLE_SHELL||[]).map(path=>new URL(path,self.registration.scope).href));
const SHELL_URLS = new Set(PRECACHE.map(path => new URL(path, self.registration.scope).href.split('?')[0]));
let warming=null,warmAllowed=false;
self.addEventListener('message',event=>{
  if(event.data?.type==='DFL_APP_RELEASE')event.ports?.[0]?.postMessage({release:CACHE_NAME.slice(APP_CACHE_PREFIX.length)});
  if(!event.source?.url?.startsWith(self.registration.scope))return;
  if(event.data?.type==='DFL_CACHE_PAUSE')warmAllowed=false;
  if(event.data?.type==='DFL_CACHE_EXTRAS'){
    warmAllowed=true;
    warming||=cacheAssets(EXTRA_CACHE,2,true).finally(()=>warming=null);
    event.waitUntil(warming);
  }
});
async function cacheAssets(urls,limit=6,optional=false){
  const c=await caches.open(CACHE_NAME);let index=0;
  const missing=[];
  // A new worker must revalidate even a still-fresh browser HTTP entry;
  // otherwise its new app-cache name can contain the previous release's code.
  await Promise.all(Array.from({length:Math.min(limit,urls.length)},async()=>{while(index<urls.length){
    if(optional&&!warmAllowed)return;
    const url=urls[index++],request=revalidating(new Request(new URL(url,self.registration.scope),{priority:"low"}));
    if(optional&&await c.match(request))continue;
    if(BUNDLE_URLS.has(request.url)){
      const response=await fetch(request);
      if(!response.ok||!/javascript|ecmascript/.test(response.headers.get('content-type')||''))throw Error(`Application module unavailable: ${url}`);
      await c.put(request,response);
    }else await c.add(request).catch(()=>missing.push(url));
  }}));
  if(missing.length)console.warn("[sw] not precached:",missing);
}
self.addEventListener("install",e=>e.waitUntil(cacheAssets(INSTALL_CACHE).then(()=>self.skipWaiting())));
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
  // Only the app entry points use the cached app document. Standalone pages
  // and directly opened images must receive their own network responses.
  const scopePath=new URL(self.registration.scope).pathname;
  const appNavigation=request.mode==="navigate"&&(url.pathname===scopePath||url.pathname===`${scopePath}index.html`);
  const shellRequest=url.origin===location.origin&&(appNavigation||SHELL_URLS.has(url.href.split("?")[0]));
  if(shellRequest){
    // Release-scoped bundles are immutable. A normal cached import does not
    // need another background download; explicit reload/retry still revalidates.
    if(BUNDLE_URLS.has(url.href.split('?')[0])&&!["reload","no-cache","no-store"].includes(request.cache)){
      event.respondWith((async()=>{
        const cache=await caches.open(CACHE_NAME),candidate=await cache.match(request,{ignoreSearch:true});
        if(usableCached(candidate,request))return candidate;
        const fresh=await refreshCached(request);return usableCached(fresh,request)?fresh:Response.error();
      })());return;
    }
    const refreshRequest=appNavigation?new Request(new URL("./index.html",self.registration.scope),{credentials:"same-origin"}):request;
    const refresh=refreshCached(refreshRequest);
    event.waitUntil(refresh.then(()=>{}));
    /* Update navigation and explicit asset refetches must wait for the network,
       otherwise a fresh version label can still boot cached, older modules. */
    if((appNavigation&&url.searchParams.has("u"))||["reload","no-cache","no-store"].includes(request.cache)){
      event.respondWith((async()=>{
        const fresh=await refresh;
        if(usableCached(fresh,request))return fresh;
        const cache=await caches.open(CACHE_NAME);
        const fallback=await cache.match(refreshRequest,{ignoreSearch:true});
        return usableCached(fallback,request)?fallback:Response.error();
      })());
      return;
    }
    event.respondWith((async()=>{
      // A retired worker's late refresh can recreate its cache after activation.
      // Never borrow those older modules for the current release.
      const cache=await caches.open(CACHE_NAME);
      const candidate=appNavigation
        ?await cache.match(refreshRequest,{ignoreSearch:true})||await cache.match(request,{ignoreSearch:true})
        :await cache.match(request,{ignoreSearch:true});
      const cached=usableCached(candidate,request)?candidate:null;
      if(cached)return cached;
      return await refresh||Response.error();
    })());
    return;
  }
  event.respondWith(fetch(revalidating(request)).then(response=>{
    if(response.ok&&(url.origin===location.origin||CDN_HOSTS.has(url.hostname))){const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(request,copy));}
    return response;
  }).catch(async()=>{
    const cache=await caches.open(CACHE_NAME);
    return await cache.match(request)||(url.origin!==location.origin?await caches.match(request):null)||Response.error();
  }));
});

/* Web Push arrives here even while the installed app is closed. Payloads are
   deliberately small and every destination is an internal hash route. */
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { data = { body: event.data?.text() || "" }; }
  // A delayed injury alert is useless once its starter has kicked off.
  if(data.expiresAt&&(!Number.isFinite(Date.parse(data.expiresAt))||Date.parse(data.expiresAt)<=Date.now()))return;
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
    icon: data.icon || "icons/app-192-1410.png",
    badge: "icons/badge-96.png",
    tag: data.messageId ? `dfl-notification-${data.messageId}` : "dfl-notification",
    renotify: data.category !== "wall" && data.category !== "matchup_moments",
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
