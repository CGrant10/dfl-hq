// Retry failed reads in the current screen. Never replay a submitted action.
export function mountConnectionRecovery({root,retry,active=()=>true,failed=()=>true,
  doc=document,win=window,onError=()=>{}}={}) {
  let stopped=false,suspended=false,pending=null,timer=null,queued=false;
  const ready=()=>!stopped&&!suspended&&active()&&failed();
  const request=()=>{
    if(!ready()||pending)return pending||Promise.resolve(false);
    clearTimeout(timer);timer=null;
    pending=Promise.resolve().then(()=>ready()?retry():false).catch(error=>{onError(error);return false}).finally(()=>{pending=null;if(queued){queued=false;wake()}});
    return pending;
  };
  const wake=()=>{
    if(!ready()||doc.visibilityState!=='visible'||win.navigator.onLine===false)return;
    if(pending){queued=true;return;}
    clearTimeout(timer);timer=setTimeout(()=>{timer=null;void request()},80);
  };
  const click=event=>{
    if(!event.target.closest?.('[data-route-retry],[data-retry-page]')||!ready())return;
    event.preventDefault();event.stopPropagation();void request();
  };
  const visibility=()=>{if(doc.visibilityState==='visible')wake();else{clearTimeout(timer);timer=null}};
  const offline=()=>{clearTimeout(timer);timer=null;queued=false};
  const pageshow=event=>{suspended=false;if(event.persisted)wake()};
  const pagehide=()=>{suspended=true;clearTimeout(timer);timer=null;queued=false};
  root.addEventListener('click',click);win.addEventListener('online',wake);win.addEventListener('offline',offline);doc.addEventListener('visibilitychange',visibility);
  win.addEventListener('pageshow',pageshow);win.addEventListener('pagehide',pagehide);
  return {request,stop(){stopped=true;queued=false;clearTimeout(timer);root.removeEventListener('click',click);win.removeEventListener('online',wake);win.removeEventListener('offline',offline);win.removeEventListener('pageshow',pageshow);win.removeEventListener('pagehide',pagehide);doc.removeEventListener('visibilitychange',visibility)}};
}
