import {esc} from './ui.js';
import {injuryRows} from './injury-report-ui.js';
import {patchGameDay} from './game-day-dom.js';

export function homeInjuryPanelMarkup() {
  return `<section class="home-injury-panel" aria-labelledby="home-injury-title"><header><div><small data-home-injury-priority>NFL AVAILABILITY</small><h2 id="home-injury-title">Injury wire</h2></div><button type="button" class="linkbtn" data-home-injury-play disabled>Loading</button></header><div class="home-injury-viewport" tabindex="0" role="region" aria-label="Injury list" data-home-injury-viewport><p class="home-injury-empty" role="status">Loading injury report…</p></div><footer><small data-home-injury-stamp></small><button type="button" class="linkbtn" data-open-injury-report>Full report →</button></footer></section>`;
}

// A native scroll box advances one row at a time, without a continuous JS
// animation loop. Touching/scrolling the list pauses it until Play is pressed.
export function mountHomeInjuryPanel(root,{getReport}) {
  if (!root) return {update(){},stop(){}};
  const viewport=root.querySelector('[data-home-injury-viewport]'),play=root.querySelector('[data-home-injury-play]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let stopped=false,visible=false,paused=false,hover=false,focused=false,timer=null,items=[],index=0,signature='';
  const motion=()=>!reduced.matches&&document.documentElement.dataset.uiMotion!=='off';
  const eligible=()=>!stopped&&root.isConnected&&visible&&!document.hidden&&!paused&&!hover&&!focused&&motion()&&items.length>1;
  const canRun=()=>eligible()&&!document.querySelector('dialog[open]');
  const clear=()=>{clearTimeout(timer);timer=null;};
  const syncButton=()=>{play.hidden=items.length<2;play.disabled=!motion();play.textContent=!motion()?'Motion off':paused?'Play':'Pause';play.setAttribute('aria-label',`${paused?'Play':'Pause'} injury list scrolling`);};
  const arm=()=>{
    clear();syncButton();
    if (!eligible()) return;
    // A dialog can be removed before its native close event reaches document.
    // A covered, visible wire checks again slowly, without moving its list.
    if(document.querySelector('dialog[open]')){timer=setTimeout(()=>{timer=null;arm();},1000);return;}
    timer=setTimeout(()=>{
      timer=null;if(!canRun()){arm();return;}
      const rows=viewport.querySelectorAll('.injury-player');
      if(viewport.scrollHeight<=viewport.clientHeight+1){return;}
      const atEnd=viewport.scrollTop+viewport.clientHeight>=viewport.scrollHeight-2;
      index=atEnd?0:Math.min(index+1,items.length-1);
      const row=rows[index],list=row?.parentElement;
      if(row)viewport.scrollTo({top:Math.max(0,row.offsetTop-list.offsetTop),behavior:atEnd?'instant':'smooth'});
      arm();
    },5000);
  };
  const stopScroll=()=>viewport.scrollTo({top:viewport.scrollTop,behavior:'instant'});
  const firstVisible=()=>{
    const rows=[...viewport.querySelectorAll('.injury-player')];
    return Math.max(0,rows.findIndex(row=>row.offsetTop-row.parentElement.offsetTop+row.offsetHeight>viewport.scrollTop+1));
  };
  const pause=()=>{paused=true;clear();stopScroll();syncButton();};
  const toggle=()=>{paused=!paused;if(!paused){
    index=firstVisible();
  }arm();};
  const changed=()=>{if(!motion()||document.hidden)stopScroll();arm();};
  const focusIn=()=>{focused=true;clear();};
  const focusOut=event=>{if(!viewport.contains(event.relatedTarget)){focused=false;arm();}};
  const enter=event=>{if(event.pointerType==='mouse'){hover=true;clear();}};
  const leave=()=>{hover=false;arm();};
  const observer=new IntersectionObserver(entries=>{if(stopped)return;visible=entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.5);if(!visible)stopScroll();arm();},{threshold:.5});observer.observe(root);
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
        clear();stopScroll();const anchor=items[paused?firstVisible():index]?.id,active=document.activeElement?.closest('.injury-player')?.dataset.injuryId;
        signature=key;items=next;index=paused?Math.max(0,items.findIndex(item=>item.id===anchor)):0;
        patchGameDay(viewport,items.length?`<ul class="injury-players">${injuryRows(items)}</ul>`:`<p class="home-injury-empty" role="status">${report?'No injuries listed in the current feed.':loading?'Loading injury report…':'Injury report unavailable. Open the full report to retry.'}</p>`);
        const rows=[...viewport.querySelectorAll('.injury-player')];
        const row=rows[index];viewport.scrollTo({top:row?row.offsetTop-row.parentElement.offsetTop:0,behavior:'instant'});
        if(active)rows.find(row=>row.dataset.injuryId===active)?.querySelector('button')?.focus({preventScroll:true});
      }
      arm();
    },
    stop() {
      stopped=true;clear();stopScroll();observer.disconnect();
      play.removeEventListener('click',toggle);viewport.removeEventListener('pointerdown',pause);viewport.removeEventListener('wheel',pause);
      viewport.removeEventListener('focusin',focusIn);viewport.removeEventListener('focusout',focusOut);
      viewport.removeEventListener('pointerenter',enter);viewport.removeEventListener('pointerleave',leave);
      document.removeEventListener('visibilitychange',changed);window.removeEventListener('dfl:ui-motion-change',changed);reduced.removeEventListener('change',changed);
      document.removeEventListener('focusin',modalFocus);document.removeEventListener('close',changed,true);
    },
  };
}
