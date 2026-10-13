import {esc} from './ui.js';
import {injuryRows} from './injury-report-ui.js';
import {patchGameDay} from './game-day-dom.js';

export function homeInjuryPanelMarkup() {
  return `<section class="home-injury-panel" aria-labelledby="home-injury-title"><header><div><small data-home-injury-priority>NFL AVAILABILITY</small><h2 id="home-injury-title">Injury wire</h2></div><button type="button" class="linkbtn" data-home-injury-play disabled>Loading</button></header><div class="home-injury-viewport" tabindex="0" role="region" aria-label="Injury list" data-home-injury-viewport><p class="home-injury-empty" role="status">Loading injury report…</p></div><footer><small data-home-injury-stamp></small><button type="button" class="linkbtn" data-open-injury-report>Full report →</button></footer></section>`;
}

// Advance the native viewport at a steady reading pace. The frame loop runs
// only while the wire is visible; touching it pauses until Play is pressed.
export function mountHomeInjuryPanel(root,{getReport}) {
  if (!root) return {update(){},stop(){}};
  const viewport=root.querySelector('[data-home-injury-viewport]'),play=root.querySelector('[data-home-injury-play]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let stopped=false,visible=false,paused=false,hover=false,focused=false,timer=null,frame=null,lastTime=null,position=0,maximum=0,dialogChecked=0,items=[],index=0,signature='';
  const motion=()=>!reduced.matches&&document.documentElement.dataset.uiMotion!=='off';
  const eligible=()=>!stopped&&root.isConnected&&visible&&!document.hidden&&!paused&&!hover&&!focused&&motion()&&items.length>1;
  const clear=()=>{clearTimeout(timer);cancelAnimationFrame(frame);timer=null;frame=null;lastTime=null;};
  const syncButton=()=>{play.hidden=items.length<2;play.disabled=!motion();play.textContent=!motion()?'Motion off':paused?'Play':'Pause';play.setAttribute('aria-label',`${paused?'Play':'Pause'} injury list scrolling`);};
  const tick=time=>{
    frame=null;
    if(!eligible()){clear();return;}
    // Native dialog focus stops us immediately; this also covers dialogs
    // opened without focus and avoids querying the DOM on every frame.
    if(time-dialogChecked>=250){
      dialogChecked=time;
      if(document.querySelector('dialog[open]')){arm();return;}
    }
    if(lastTime!==null){
      position+=18*Math.min(64,Math.max(0,time-lastTime))/1000;
      if(position>=maximum)position=0;
      viewport.scrollTo({top:position,behavior:'instant'});
    }
    lastTime=time;frame=requestAnimationFrame(tick);
  };
  const arm=()=>{
    clear();syncButton();
    if(!eligible())return;
    // Removed dialogs do not always deliver a native close event.
    if(document.querySelector('dialog[open]')){timer=setTimeout(arm,1000);return;}
    maximum=Math.max(0,viewport.scrollHeight-viewport.clientHeight);
    if(maximum<=1)return;
    position=viewport.scrollTop;dialogChecked=performance.now();
    frame=requestAnimationFrame(tick);
  };
  const stopScroll=()=>viewport.scrollTo({top:viewport.scrollTop,behavior:'instant'});
  const firstVisible=()=>{
    const rows=[...viewport.querySelectorAll('.injury-player')];
    return Math.max(0,rows.findIndex(row=>row.offsetTop-row.parentElement.offsetTop+row.offsetHeight>viewport.scrollTop+1));
  };
  const pause=()=>{paused=true;clear();stopScroll();syncButton();};
  const toggle=()=>{paused=!paused;arm();};
  const changed=()=>{if(!motion()||document.hidden)stopScroll();arm();};
  const focusIn=()=>{focused=true;clear();};
  const focusOut=event=>{if(!viewport.contains(event.relatedTarget)){focused=false;arm();}};
  const enter=event=>{if(event.pointerType==='mouse'){hover=true;clear();}};
  const leave=()=>{hover=false;arm();};
  const observer=new IntersectionObserver(entries=>{if(stopped)return;visible=entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.5);if(!visible)stopScroll();arm();},{threshold:.5});observer.observe(root);
  const resize=new ResizeObserver(()=>{if(!stopped)arm();});resize.observe(viewport);
  const modalFocus=event=>{if(event.target.closest('dialog[open]')){clear();stopScroll();arm();}else changed();};
  play.addEventListener('click',toggle);viewport.addEventListener('pointerdown',pause);viewport.addEventListener('wheel',pause,{passive:true});
  viewport.addEventListener('focusin',focusIn);viewport.addEventListener('focusout',focusOut);
  viewport.addEventListener('pointerenter',enter);viewport.addEventListener('pointerleave',leave);
  document.addEventListener('visibilitychange',changed);window.addEventListener('dfl:ui-motion-change',changed);reduced.addEventListener('change',changed);
  document.addEventListener('focusin',modalFocus);document.addEventListener('close',changed,true);
  return {
    update({loading=false}={}) {
      if(stopped)return;
      const report=getReport(),next=report?.items||[],key=JSON.stringify(next);
      root.querySelector('[data-home-injury-priority]').textContent=report?.rostersKnown?'DFL STARTERS FIRST':'NFL AVAILABILITY';
      root.querySelector('[data-home-injury-stamp]').textContent=report?`${next.length} players · ESPN · Checked ${new Date(report.checkedAt).toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'})}`:'';
      if(key!==signature||!next.length){
        clear();stopScroll();const anchor=items[firstVisible()]?.id,active=document.activeElement?.closest('.injury-player')?.dataset.injuryId;
        signature=key;items=next;index=Math.max(0,items.findIndex(item=>item.id===anchor));
        resize.disconnect();resize.observe(viewport);
        patchGameDay(viewport,items.length?`<ul class="injury-players">${injuryRows(items)}</ul>`:`<p class="home-injury-empty" role="status">${report?'No injuries listed in the current feed.':loading?'Loading injury report…':'Injury report unavailable. Open the full report to retry.'}</p>`);
        const list=viewport.querySelector('.injury-players');if(list)resize.observe(list);
        const rows=[...viewport.querySelectorAll('.injury-player')];
        const row=rows[index];viewport.scrollTo({top:row?row.offsetTop-row.parentElement.offsetTop:0,behavior:'instant'});
        if(active)rows.find(row=>row.dataset.injuryId===active)?.querySelector('button')?.focus({preventScroll:true});
      }
      arm();
    },
    stop() {
      stopped=true;clear();stopScroll();observer.disconnect();resize.disconnect();
      play.removeEventListener('click',toggle);viewport.removeEventListener('pointerdown',pause);viewport.removeEventListener('wheel',pause);
      viewport.removeEventListener('focusin',focusIn);viewport.removeEventListener('focusout',focusOut);
      viewport.removeEventListener('pointerenter',enter);viewport.removeEventListener('pointerleave',leave);
      document.removeEventListener('visibilitychange',changed);window.removeEventListener('dfl:ui-motion-change',changed);reduced.removeEventListener('change',changed);
      document.removeEventListener('focusin',modalFocus);document.removeEventListener('close',changed,true);
    },
  };
}
