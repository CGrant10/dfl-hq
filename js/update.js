import { APP_VERSION } from "./config.js";

const bar=()=>document.getElementById("update");

async function routeList(){
  try{const r=await import("./router.js");if(typeof r.routeNames==="function")return r.routeNames()}catch{}
  return [...document.querySelectorAll("#tabbar a[data-route]")].map(a=>a.dataset.route).filter(Boolean);
}

async function appFiles(){
  const base=new URL(".",location.href).href;
  const loaded=performance.getEntriesByType("resource").map(e=>e.name.split("?")[0]).filter(n=>n.startsWith(location.origin)&&/\.(js|css|json|html)$/.test(n));
  const pages=(await routeList()).map(n=>`${base}js/pages/${n}.js`);
  const shell=["","index.html","css/style.css","css/profile-neutral.css","manifest.json","sw.js","js/config.js","js/nav-neutral.js","js/golf-gps-course-map.js","js/golf-gps-beta.js","js/golf-gps-red-trail-beta.js","js/golf-gps-rolla-beta.js","js/golf-event-course-picker.js","js/golf-live-to-par.js"].map(p=>base+p);
  return [...new Set([...shell,...loaded,...pages])];
}

async function refetchAll(){
  const files=await appFiles();
  const results=await Promise.allSettled(files.map(url=>fetch(url,{cache:"reload"})));
  const failed=results.filter(r=>r.status==="rejected").length;
  if(failed)console.warn(`Update: ${failed} of ${files.length} files could not be refreshed`);
}

function isNewer(remote,local){
  const a=String(remote).trim().split(".").map(Number),b=String(local).trim().split(".").map(Number);
  for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x>y)return true;if(x<y)return false}
  return false;
}

async function serverVersion(){
  const res=await fetch(`version.txt?cb=${Date.now()}`,{cache:"no-store"});
  if(!res.ok)throw new Error(`version.txt returned ${res.status}`);
  const text=(await res.text()).trim();
  if(!/^\d+(\.\d+)*$/.test(text))throw new Error(`version.txt looks wrong: "${text.slice(0,30)}"`);
  return text;
}

function watchWorkerChange(timeout=5000){
  if(!("serviceWorker" in navigator))return{promise:Promise.resolve(),cancel(){}};
  let finish=()=>{};
  const promise=new Promise(resolve=>{
    let done=false,timer;
    finish=()=>{
      if(done)return;
      done=true;
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("controllerchange",finish);
      resolve();
    };
    navigator.serviceWorker.addEventListener("controllerchange",finish);
    timer=setTimeout(finish,timeout);
  });
  return{promise,cancel:finish};
}

export async function forceUpdate(){
  try{
    // Keep the current shell available until the replacement worker is ready.
    await refetchAll();
    if("serviceWorker" in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      const before=navigator.serviceWorker.controller;
      const change=watchWorkerChange();
      await Promise.all(regs.map(r=>r.update().catch(()=>{})));
      const replacement=regs.some(r=>r.installing||r.waiting);
      const alreadyChanged=navigator.serviceWorker.controller!==before;
      if(replacement&&!alreadyChanged)await change.promise;
      else change.cancel();
      await navigator.serviceWorker.ready.catch(()=>{});
    }
  }catch(err){console.warn("Update refresh failed, reloading with cache buster",err)}
  location.replace(`${location.pathname}?u=${Date.now()}${location.hash}`);
}

export async function checkForUpdate(announce=false){
  const latest=await serverVersion(),stale=isNewer(latest,APP_VERSION),el=bar();
  if(stale&&el){
    el.innerHTML=`<span class="install-text">Version ${latest} is available. You have ${APP_VERSION}.</span><button class="btn small" id="update-go">Update</button><button class="install-x" id="update-no" aria-label="Later">&times;</button>`;
    el.classList.remove("hidden");
  }else if(announce&&el){
    el.innerHTML=`<span class="install-text">You are up to date (v${APP_VERSION}).</span><button class="install-x" id="update-no" aria-label="Close">&times;</button>`;
    el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),3500);
  }
  return{current:APP_VERSION,latest,stale};
}

export function setupUpdates(){
  const el=bar();if(!el)return;
  el.addEventListener("click",async e=>{
    const go=e.target.closest("#update-go");
    if(go){go.disabled=true;go.textContent="Updating…";el.querySelector("#update-no")?.remove();await forceUpdate();return}
    if(e.target.closest("#update-no"))el.classList.add("hidden");
  });
  checkForUpdate().catch(()=>{});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkForUpdate().catch(()=>{})});
}
