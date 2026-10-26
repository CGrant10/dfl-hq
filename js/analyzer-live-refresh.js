import {mountLiveScoreRefresh} from './live-score-refresh.js';
import {captureRefreshView,restoreRefreshView} from './view-memory.js';

export function analyzerRevision(data) {
  // Values are rounded. Evidence, forecasts and availability can change a
  // verdict even when that displayed number is identical. Retrieval timestamps
  // alone must not redraw an otherwise unchanged report.
  const expert=data.expertConsensus;
  const replacements=new Map([...data.pool.values()].flatMap(p=>(p.waiverOptions||[]).map(option=>[option.id,option])));
  return JSON.stringify([data.projectionSeason,data.liveWeek,data.staleSources,data.liveScoresStale,
    data.leagueFormat,expert&&[expert.status,expert.updatedAt,expert.experts,expert.matched,expert.total],
    data.teams,[...data.pool],[...replacements],data.nflSchedule?[...data.nflSchedule]:null],
    (key,value)=>key==='waiverOptions'?undefined:value);
}
export function mountAnalyzerLiveRefresh({view,initial,apply,active=()=>view.isConnected,
  load=()=>Promise.resolve(initial),canApply=()=>!document.querySelector('dialog[open]')
    && !(view.contains(document.activeElement)&&document.activeElement.matches('input:not([type=checkbox]):not([type=radio]),textarea,select')),
  doc=document,win=window,beforeApply=()=>captureRefreshView(view),afterApply=memory=>restoreRefreshView(view,memory,{active}),onError=error=>console.warn('Analyzer update unavailable',error)} = {}) {
  let stopped=false,pending=null,revision=analyzerRevision(initial),lastAttempt=Date.now(),commitTimer=null,stopRestore=()=>{};
  let recoveryStatus=null;
  const status=state=>{
    if(stopped||!active()||!doc.createElement||(state==='checking'&&!recoveryStatus))return;
    if(!recoveryStatus){
      recoveryStatus=doc.createElement('p');recoveryStatus.className='analyzer-recovery';recoveryStatus.setAttribute('role','status');
      const text=doc.createElement('span'),button=doc.createElement('button');button.type='button';button.className='linkbtn';button.textContent='Retry';
      button.addEventListener('click',()=>void loop.request(true));recoveryStatus.append(text,button);
    }
    if(!view.contains(recoveryStatus))view.prepend(recoveryStatus);
    recoveryStatus.hidden=state==='ready';
    recoveryStatus.firstElementChild.textContent=state==='offline'?'Offline':state==='checking'?'Updating…':'Refresh unavailable';
    recoveryStatus.lastElementChild.disabled=state==='checking';recoveryStatus.lastElementChild.textContent=state==='checking'?'Retrying…':'Retry';
  };
  let lastScroll=-Infinity;const pointers=new Set();
  const settle=()=>{clearTimeout(commitTimer);commitTimer=setTimeout(commit,180)};
  const commit=()=>{
    if(stopped||!active()||doc.visibilityState==='hidden'||!pending||!canApply())return;
    if(pointers.size)return;
    if(Date.now()-lastScroll<180){settle();return}
    const next=pending;pending=null;const stamp=analyzerRevision(next);
    if(stamp===revision)return;
    const focused=doc.activeElement;
    const attributes=focused&&view.contains(focused)?[...focused.attributes].filter(a=>a.name.startsWith('data-')||a.name==='value'):[];
    const focusSelector=focused?.id?`#${CSS.escape(focused.id)}`:attributes.length?attributes.map(a=>`[${a.name}="${CSS.escape(a.value)}"]`).join(''):null;
    stopRestore();const memory=beforeApply();apply(next);revision=stamp;
    if(focusSelector)view.querySelector(focusSelector)?.focus({preventScroll:true});stopRestore=afterApply(memory)||(()=>{});
  };
  const loop=mountLiveScoreRefresh({doc,win,active,interval:60000,refresh:async(force)=>{
    if(!force&&Date.now()-lastAttempt<45000)return;
    lastAttempt=Date.now();status('checking');const next=await load();
    if(stopped||!active())return;
    if(next.state!=='ready')throw Error('Player data unavailable');
    pending=next;commit();if(recoveryStatus)status('ready');
  },onError:error=>{status('error');onError(error)},onOffline:()=>status('offline')});
  const blur=()=>{clearTimeout(commitTimer);commitTimer=setTimeout(commit,120)},closed=blur,synced=()=>loop.wake();
  const scrolling=()=>{lastScroll=Date.now();if(pending)settle()},down=event=>pointers.add(event.pointerId),up=event=>{pointers.delete(event.pointerId);if(pending)settle()},release=()=>{pointers.clear();if(pending)settle()};
  win.addEventListener('scroll',scrolling,{passive:true,capture:true});view.addEventListener('pointerdown',down);win.addEventListener('pointerup',up);win.addEventListener('pointercancel',up);win.addEventListener('blur',release);doc.addEventListener('visibilitychange',release);
  view.addEventListener('focusout',blur);doc.addEventListener('close',closed,true);win.addEventListener('dfl:quick-sync-complete',synced);
  loop.start();
  return()=>{stopped=true;pending=null;clearTimeout(commitTimer);loop.stop();stopRestore();recoveryStatus?.remove();view.removeEventListener('focusout',blur);doc.removeEventListener('close',closed,true);win.removeEventListener('dfl:quick-sync-complete',synced);win.removeEventListener('scroll',scrolling,true);view.removeEventListener('pointerdown',down);win.removeEventListener('pointerup',up);win.removeEventListener('pointercancel',up);win.removeEventListener('blur',release);doc.removeEventListener('visibilitychange',release);pointers.clear()};
}
