// Only fixed technical categories leave the browser. Never send errors, stacks,
// image URLs, request URLs, member identity or league content.
import {APP_VERSION} from './config.js';
export const DIAGNOSTIC_KINDS=['request_error','image_error','runtime_error','promise_error','stale_scores'];
export const DIAGNOSTIC_SOURCES=['app','sleeper','nfl','supabase','image'];
export function diagnosticEvent({kind,source='app',route='app'}={}){
 if(!DIAGNOSTIC_KINDS.includes(kind)||!DIAGNOSTIC_SOURCES.includes(source))return null;
 return {kind,source,route:/^[a-z0-9-]{1,32}$/.test(route)?route:'app',version:APP_VERSION};
}
export function reportAppIssue(kind,source='app'){
 if(typeof window==='undefined'||window.navigator?.onLine===false)return;
 window.dispatchEvent(new CustomEvent('dfl:app-issue',{detail:{kind,source}}));
}
export function startAppDiagnostics({win=window,doc=document,send=async events=>(await import('./supabase.js')).db().rpc('record_app_issues',{p_events:events})}={}){
 const pending=new Map(),seen=new Set();let timer=null,sent=0,running=false;
 const route=()=>String(win.location.hash||'').replace(/^#\//,'').split('?')[0]||'app';
 const flush=async()=>{
  clearTimeout(timer);timer=null;
  if(running||!pending.size||win.navigator.onLine===false)return;
  const batch=[...pending.values()].slice(0,20-sent);if(!batch.length)return;
  pending.clear();sent+=batch.length;running=true;
  try{await send(batch)}catch{/* Diagnostics cannot block or recursively report failures. */}finally{running=false;if(pending.size&&sent<20)timer=setTimeout(()=>void flush(),8000)}
 };
 const capture=(kind,source='app')=>{
  if(sent>=20||win.navigator.onLine===false)return;
  const item=diagnosticEvent({kind,source,route:route()});if(!item)return;
  const key=`${item.route}:${kind}:${source}`;if(seen.has(key))return;seen.add(key);pending.set(key,item);
  clearTimeout(timer);timer=setTimeout(()=>void flush(),8000);
 };
 const issue=e=>capture(e.detail?.kind,e.detail?.source);
 const error=e=>{if(e.target?.tagName==='IMG')capture('image_error','image');else if(e.target===win||e.error)capture('runtime_error')};
 const reject=()=>capture('promise_error');
 const visibility=()=>{if(doc.hidden)void flush()};
 win.addEventListener('dfl:app-issue',issue);win.addEventListener('error',error,true);win.addEventListener('unhandledrejection',reject);
 doc.addEventListener('visibilitychange',visibility);win.addEventListener('pagehide',flush);win.addEventListener('online',flush);
 return {flush,stop(){clearTimeout(timer);win.removeEventListener('dfl:app-issue',issue);win.removeEventListener('error',error,true);win.removeEventListener('unhandledrejection',reject);doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('pagehide',flush);win.removeEventListener('online',flush)}};
}
