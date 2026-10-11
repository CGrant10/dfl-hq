// One visible refresh at a time; returning to a live view bypasses score caches.
export function mountLiveScoreRefresh({refresh,active=()=>true,enabled=()=>true,onOffline=()=>{},onError=(_error)=>{},
  doc=document,win=window,visible=()=>doc.visibilityState==='visible',online=()=>win.navigator.onLine!==false,interval=60000}={}) {
  let stopped=false,running=false,queued=false,timer=null,wakeTimer=null;
  const ready=()=>!stopped&&active()&&enabled()&&visible()&&online();
  const clear=()=>{clearTimeout(timer);clearTimeout(wakeTimer);timer=wakeTimer=null};
  const schedule=()=>{clearTimeout(timer);if(ready())timer=setTimeout(()=>void request(),interval)};
  const request=async(force=false)=>{
    if(stopped||!active()||!visible())return;
    if(!online()){onOffline();return}
    if(running){queued ||= force;return}
    clearTimeout(timer);running=true;
    try{await refresh(force)}catch(error){onError(error)}
    finally{running=false;if(!stopped){if(queued&&ready()){queued=false;wake()}else{queued=false;schedule()}}}
  };
  const wake=()=>{
    if(!ready())return;
    clear();wakeTimer=setTimeout(()=>{wakeTimer=null;void request(true)},80);
  };
  const visibility=()=>{if(visible())wake();else{clear();queued=false}};
  const offline=()=>{clear();queued=false;if(!stopped&&active())onOffline()};
  const pageshow=event=>{if(event.persisted)wake()};
  doc.addEventListener('visibilitychange',visibility);
  win.addEventListener('online',wake);win.addEventListener('offline',offline);win.addEventListener('pageshow',pageshow);
  return {request,wake,start(){void request()},stop(){stopped=true;queued=false;clear();doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('online',wake);win.removeEventListener('offline',offline);win.removeEventListener('pageshow',pageshow)}};
}
