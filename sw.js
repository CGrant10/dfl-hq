// DFL HQ service worker
const CACHE_NAME = "dfl-hq-v1.186.0";
const CDN_HOSTS = new Set(["cdn.jsdelivr.net","fonts.googleapis.com","fonts.gstatic.com","a.espncdn.com"]);
const APP_SHELL = [
  "./","./index.html","./manifest.json",
  "./css/tokens.css","./css/style.css","./css/ui.css","./css/screens.css","./css/golf.css","./css/home.css","./css/nav-neutral.css",
  "./js/config.js","./js/app.js","./js/router.js","./js/ui.js","./js/store.js","./js/supabase.js","./js/members.js","./js/member-preview.js","./js/member-lock.js",
  "./js/pages/home.js","./js/pages/golf.js","./js/golf-theme.js","./js/golf-event-modes.js","./js/golf-gps-course-map.js","./js/golf-gps-distance.js","./js/golf-gps-beta.js","./js/golf-gps-red-trail-beta.js","./js/golf-gps-rolla-beta.js","./js/golf-gps-imported.js","./js/nav-neutral.js",
  "./js/golf-tournament-beta.js","./js/golf-tournament-beta-format.js","./js/golf-tournament-beta-rules.js","./js/golf-score-result.js","./js/golf-club-recommendation.js","./js/golf-offline.js","./js/golf-battle.js","./js/golf-board.js",
  "./icons/app-192.png","./icons/app-512.png","./icons/apple-touch-icon.png"
];
const SHELL_URLS = new Set(APP_SHELL.map(path => new URL(path, self.registration.scope).href));
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE_NAME).then(async c=>{
  const missing=[];
  await Promise.all(APP_SHELL.map(url=>c.add(url).catch(()=>missing.push(url))));
  if(missing.length)console.warn("[sw] not precached:",missing);
}).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
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
