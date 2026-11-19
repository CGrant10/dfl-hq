import { APP_VERSION, LEAGUE_FOUNDED } from "./config.js";

const bar=()=>document.getElementById("update");
const UPDATE_CHECK_MS=10*60*1000;
let stopLogoGlow=null;

// A cold logo download can outlast the whole sweep. Start only after its
// pixels are decoded and the screen is visible; never hold the Update action.
export function mountUpdateLogoGlow(el){
  const image=el.querySelector('.update-gate__mark img');
  const glow=el.querySelector('.update-gate__glow');
  el.removeAttribute('data-logo-ready');
  if(!image)return()=>{};
  let stopped=false,decoded=false,decoding=false,frame=0;
  const visible=()=>!stopped&&el.isConnected&&!document.hidden&&!el.classList.contains('hidden');
  const paint=()=>{
    el.dataset.updateHidden=String(document.hidden);
    if(!decoded||!visible()||el.dataset.logoReady==='true')return;
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{frame=0;if(visible())el.dataset.logoReady='true';});
  };
  const loaded=async()=>{
    if(stopped||decoding||decoded||!image.naturalWidth)return;
    decoding=true;
    try{await image.decode?.();}catch{}
    if(stopped)return;
    // CSS variables resolve relative URLs at the stylesheet that consumes
    // them. Use the image's absolute URL so /css/icons/ is never requested.
    glow?.style.setProperty('--update-logo-mask',`url("${image.currentSrc||image.src}")`);
    decoded=true;paint();
  };
  image.addEventListener('load',loaded);
  document.addEventListener('visibilitychange',paint);
  if(image.complete)void loaded();
  return()=>{
    stopped=true;cancelAnimationFrame(frame);
    image.removeEventListener('load',loaded);
    document.removeEventListener('visibilitychange',paint);
  };
}

function pendingGolfScores(){
  try{
    const value=JSON.parse(localStorage.getItem("dfl.golf.pending")||"{}");
    return value&&typeof value==="object"&&Object.keys(value).length>0;
  }catch{return false;}
}

function scoreEntryOpen(){
  return Boolean(document.querySelector('[data-tb-sheet]:not([hidden]),[data-gqm-pop]:not([hidden])'));
}

export function updateBlocked(){return pendingGolfScores()||scoreEntryOpen();}

export function isNewer(remote,local){
  const a=String(remote).trim().split(".").map(Number),b=String(local).trim().split(".").map(Number);
  for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x>y)return true;if(x<y)return false}
  return false;
}

export function updateGateMarkup(version){
  const safeVersion=String(version).replace(/[^0-9.]/g,"");
  const season=new Date().getFullYear()-LEAGUE_FOUNDED+1;
  const anniversary=season>=10&&season%10===0;
  return `<div class="update-gate__content">
    <p class="update-gate__eyebrow">DFL HQ UPDATE</p>
    <h1>The league just got better.</h1>
    <span class="update-gate__mark"><img src="icons/app-update-aligned.svg?v=${safeVersion}" alt="DFL HQ" width="512" height="512" crossorigin="anonymous"><span class="update-gate__glow" aria-hidden="true"></span></span>
    ${anniversary?`<p class="update-gate__anniversary">${season} YEAR ANNIVERSARY</p>`:""}
    <div class="update-gate__action">
      <button class="update-gate__button" id="update-go" type="button">UPDATE NOW</button>
      <p class="update-gate__version">Version ${safeVersion}</p>
      <p class="update-gate__status" role="status" aria-live="polite"></p>
    </div>
  </div>`;
}

function showGate(el,version){
  if(el.classList.contains('is-updating'))return;
  if(el.dataset.version===version&&!el.classList.contains('hidden')&&el.classList.contains('update-gate'))return;
  stopLogoGlow?.();
  el.dataset.version=version;
  el.setAttribute("role","dialog");
  el.setAttribute("aria-modal","true");
  el.setAttribute("aria-labelledby","update-gate-title");
  el.innerHTML=updateGateMarkup(version).replace("<h1>",'<h1 id="update-gate-title">');
  el.classList.remove("hidden");
  el.classList.add("update-gate");
  document.body.classList.add("update-required");
  stopLogoGlow=mountUpdateLogoGlow(el);
  requestAnimationFrame(()=>el.querySelector("#update-go")?.focus());
}

async function serverVersion(){
  const res=await fetch(`version.txt?cb=${Date.now()}`,{cache:"no-store"});
  if(!res.ok)throw new Error(`version.txt returned ${res.status}`);
  const text=(await res.text()).trim();
  if(!/^\d+(\.\d+)*$/.test(text))throw new Error(`version.txt looks wrong: "${text.slice(0,30)}"`);
  return text;
}

// Ask the controlling worker, rather than assuming a five-second timer means
// installation finished. The new release owns its own atomic offline bundle.
function workerRelease(worker){
  if(!worker)return Promise.resolve('');
  return new Promise(resolve=>{
    const channel=new MessageChannel();let done=false;
    const finish=value=>{if(done)return;done=true;clearTimeout(timer);channel.port1.close();channel.port2.close();resolve(value)};
    const timer=setTimeout(()=>finish(''),500);
    channel.port1.onmessage=event=>finish(event.data?.release||'');
    try{worker.postMessage({type:'DFL_APP_RELEASE'},[channel.port2])}catch{finish('')}
  });
}

export function activateUpdate(version,{timeoutMs=30000}={}){
  if(!('serviceWorker' in navigator))return Promise.resolve();
  const workers=navigator.serviceWorker;
  return new Promise((resolve,reject)=>{
    let done=false,checking=false,again=false;
    const finish=error=>{if(done)return;done=true;clearTimeout(timer);workers.removeEventListener('controllerchange',check);error?reject(error):resolve()};
    const check=async()=>{
      if(done)return;
      if(checking){again=true;return}
      checking=true;
      const release=await workerRelease(workers.controller);checking=false;
      if(done)return;
      if(release===version){finish();return}
      if(again){again=false;void check()}
    };
    const timer=setTimeout(()=>finish(new Error('The new app did not finish installing. Please retry.')),timeoutMs);
    workers.addEventListener('controllerchange',check);
    void (async()=>{
      const registration=await workers.getRegistration();
      if(done)return;
      // A browser without an installed worker can navigate directly to fresh HTML.
      if(!registration){finish();return}
      await check();if(done)return;
      await registration.update();
      if(!done)void check();
    })().catch(finish);
  });
}

export async function forceUpdate(){
  if(updateBlocked())return false;
  const version=bar()?.dataset.version||APP_VERSION;
  // Do not re-fetch the loaded (old) app graph or wait on unrelated worker
  // registrations. Keep the gate visible until the requested release controls us.
  await activateUpdate(version);
  try{sessionStorage.setItem('dfl.update.reboot',JSON.stringify({at:Date.now(),version}));}catch{}
  location.replace(`${location.pathname}?u=${Date.now()}${location.hash}`);
  return true;
}

export async function checkForUpdate(announce=false){
  const latest=await serverVersion(),stale=isNewer(latest,APP_VERSION),el=bar();
  if(stale&&el&&!updateBlocked())showGate(el,latest);
  return{current:APP_VERSION,latest,stale};
}

export function setupUpdates(){
  const el=bar();if(!el)return;
  el.addEventListener("click",async e=>{
    const go=e.target.closest("#update-go");
    if(go){
      if(updateBlocked()){el.querySelector(".update-gate__status").textContent="Finish or sync the current score, then update.";return}
      if(go.disabled)return;
      go.disabled=true;go.textContent="UPDATING…";
      el.classList.add("is-updating");
      el.setAttribute('aria-busy','true');
      el.querySelector(".update-gate__status").textContent="Installing update…";
      try{
        const updated=await forceUpdate();
        if(updated)return;
        el.querySelector('.update-gate__status').textContent='Finish or sync the current score, then update.';
      }catch(error){
        console.warn('Update installation failed',error);
        el.querySelector('.update-gate__status').textContent='Could not finish updating. Check your connection and retry.';
      }
      el.classList.remove('is-updating');el.removeAttribute('aria-busy');
      go.disabled=false;go.textContent='RETRY UPDATE';
      return;
    }
  });
  checkForUpdate().catch(()=>{});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkForUpdate().catch(()=>{})});
  setInterval(()=>{if(!document.hidden)checkForUpdate().catch(()=>{})},UPDATE_CHECK_MS);
}
