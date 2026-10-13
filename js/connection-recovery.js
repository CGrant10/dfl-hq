// Retry failed reads in the current screen. Never replay a submitted action.
export function mountConnectionRecovery({root,retry,active=()=>true,failed=()=>true,
  doc=document,win=window,onError=()=>{}}={}) {
  let stopped=false,pending=null,timer=null;
  const ready=()=>!stopped&&active()&&failed();
  const request=()=>{
    if(!ready()||pending)return pending||Promise.resolve(false);
    clearTimeout(timer);timer=null;
    pending=Promise.resolve().then(()=>ready()?retry():false).catch(error=>{onError(error);return false}).finally(()=>{pending=null});
    return pending;
  };
  const wake=()=>{
    if(!ready()||doc.visibilityState!=='visible'||win.navigator.onLine===false||pending)return;
    clearTimeout(timer);timer=setTimeout(()=>{timer=null;void request()},80);
  };
  const click=event=>{
    if(!event.target.closest?.('[data-route-retry],[data-retry-page]')||!ready())return;
    event.preventDefault();event.stopPropagation();void request();
  };
  const visibility=()=>{if(doc.visibilityState==='visible')wake();else{clearTimeout(timer);timer=null}};
  const offline=()=>{clearTimeout(timer);timer=null};
  root.addEventListener('click',click);win.addEventListener('online',wake);win.addEventListener('offline',offline);doc.addEventListener('visibilitychange',visibility);
  return {request,stop(){stopped=true;clearTimeout(timer);root.removeEventListener('click',click);win.removeEventListener('online',wake);win.removeEventListener('offline',offline);doc.removeEventListener('visibilitychange',visibility)}};
}
