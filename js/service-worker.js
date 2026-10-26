// Push setup must never hold the first route open waiting for its own worker.
let registrationRequest;
let warmHooks=false,firstRouteReady=false,warmTimer=null;
let pageReady=()=>{};
if(typeof window!=='undefined')window.addEventListener('dfl:app-ready',()=>{firstRouteReady=true;pageReady()},{once:true});
function installCacheWarmup(registration){
  if(!registration||warmHooks||typeof window==='undefined'||typeof document==='undefined')return;
  warmHooks=true;
  const cancel=()=>{clearTimeout(warmTimer);warmTimer=null;registration.active?.postMessage({type:'DFL_CACHE_PAUSE'})};
  const schedule=()=>{
    clearTimeout(warmTimer);
    const connection=navigator.connection||{};
    if(!firstRouteReady||document.hidden||connection.saveData||['slow-2g','2g','3g'].includes(connection.effectiveType)){cancel();return}
    // Give the first route's real data priority over decorative offline artwork.
    warmTimer=setTimeout(()=>{warmTimer=null;if(!document.hidden)registration.active?.postMessage({type:'DFL_CACHE_EXTRAS'})},5000);
  };
  pageReady=schedule;
  navigator.serviceWorker.addEventListener('controllerchange',schedule);
  document.addEventListener('visibilitychange',schedule);
  schedule();
}

export function registerAppWorker() {
  if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return Promise.resolve(null);
  registrationRequest ||= navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
    .then(registration=>{installCacheWarmup(registration);return registration})
    .catch(error => { registrationRequest = null; console.warn("Service worker unavailable", error); return null; });
  return registrationRequest;
}

export async function activeAppWorker({ wait = false, timeoutMs = 6000 } = {}) {
  if (!("serviceWorker" in navigator)) return null;
  let timer;
  const lookup = async () => {
    if (wait) await registerAppWorker();
    const registered = await navigator.serviceWorker.getRegistration();
    if (registered?.active) return registered;
    return wait ? navigator.serviceWorker.ready : null;
  };
  try {
    return await Promise.race([
      lookup(),
      new Promise(resolve => { timer = setTimeout(() => resolve(null), timeoutMs); }),
    ]);
  } catch { return null; }
  finally { clearTimeout(timer); }
}

export async function requireAppWorker() {
  const worker = await activeAppWorker({ wait: true });
  if (!worker) throw new Error("Notifications could not connect on this device. Check your connection and try again.");
  return worker;
}
