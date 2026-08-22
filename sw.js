// DFL HQ service worker
const CACHE_NAME = "dfl-hq-v1.120.1";
const CDN_HOSTS = new Set(["cdn.jsdelivr.net","fonts.googleapis.com","fonts.gstatic.com","a.espncdn.com"]);
const APP_SHELL = [
  "./","./index.html","./manifest.json",
  "./css/tokens.css","./css/style.css","./css/ui.css","./css/screens.css","./css/golf.css","./css/home.css","./css/nav-neutral.css",
  "./js/config.js","./js/app.js","./js/router.js","./js/ui.js","./js/store.js","./js/supabase.js","./js/members.js",
  "./js/pages/home.js","./js/pages/golf.js","./js/golf-theme.js","./js/golf-event-modes.js","./js/golf-gps-course-map.js","./js/golf-gps-beta.js","./js/golf-gps-red-trail-beta.js","./js/golf-gps-rolla-beta.js","./js/nav-neutral.js",
  "./icons/app-192.png","./icons/app-512.png","./icons/apple-touch-icon.png"
];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE_NAME).then(async c=>{
  const missing=[];
  await Promise.all(APP_SHELL.map(url=>c.add(url).catch(()=>missing.push(url))));
  if(missing.length)console.warn("[sw] not precached:",missing);
}).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
function revalidating(request){try{return new Request(request,{cache:"no-cache"});}catch{return request;}}
self.addEventListener("fetch",event=>{
  const{request}=event;if(request.method!=="GET")return;const url=new URL(request.url);
  if(url.hostname.endsWith("supabase.co")||url.hostname.endsWith("sleeper.app")||url.pathname.endsWith("/version.txt"))return;
  event.respondWith(fetch(revalidating(request)).then(response=>{
    if(response.ok&&(url.origin===location.origin||CDN_HOSTS.has(url.hostname))){const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(request,copy));}
    return response;
  }).catch(async()=>{const cached=await caches.match(request);if(cached)return cached;if(request.mode==="navigate")return caches.match("./index.html");return Response.error();}));
});
