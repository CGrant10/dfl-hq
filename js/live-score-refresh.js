// One visible refresh at a time; returning to a live view bypasses score caches.
export function mountLiveScoreRefresh({refresh,active=()=>true,enabled=()=>true,onOffline=()=>{},onError=(_error)=>{},
  doc=document,win=window,visible=()=>doc.visibilityState==='visible',online=()=>win.navigator.onLine!==false,interval=60000}={}) {
  let stopped=false,suspended=false,running=false,queued=false,timer=null,wakeTimer=null,failures=0;
  const ready=()=>!stopped&&!suspended&&active()&&enabled()&&visible()&&online();
  const clear=()=>{clearTimeout(timer);clearTimeout(wakeTimer);timer=wakeTimer=null};
  const schedule=()=>{clearTimeout(timer);if(ready()){const delay=failures?Math.min(interval,5000*3**Math.min(failures-1,3)):interval;timer=setTimeout(()=>void request(failures>0),delay)}};
  const request=async(force=false)=>{
    if(stopped||suspended||!active()||!visible())return;
    if(!online()){onOffline();return}
    if(running){queued ||= force;return}
    clearTimeout(timer);running=true;
    try{const result=await refresh(force);failures=result===false?failures+1:0}catch(error){failures++;if(!stopped&&active())onError(error)}
    finally{running=false;if(!stopped){if(queued&&ready()){queued=false;wake()}else{queued=false;schedule()}}}
  };
  const wake=()=>{
    if(!ready())return;
    clear();wakeTimer=setTimeout(()=>{wakeTimer=null;void request(true)},80);
  };
  const visibility=()=>{if(visible())wake();else{clear();queued=false}};
  const offline=()=>{clear();queued=false;if(!stopped&&active())onOffline()};
  const pageshow=event=>{suspended=false;if(event.persisted)wake()};
  const pagehide=()=>{suspended=true;clear();queued=false};
  doc.addEventListener('visibilitychange',visibility);
  win.addEventListener('focus',wake);win.addEventListener('online',wake);win.addEventListener('offline',offline);win.addEventListener('pageshow',pageshow);
  win.addEventListener('pagehide',pagehide);
  return {request,wake,start(){void request()},stop(){stopped=true;queued=false;clear();doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('focus',wake);win.removeEventListener('online',wake);win.removeEventListener('offline',offline);win.removeEventListener('pageshow',pageshow);win.removeEventListener('pagehide',pagehide)}};
}
