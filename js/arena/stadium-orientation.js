import {trapFocus} from '../focus-trap.js';
export function needsStadiumLandscape({width,height,touch=false}){
 return width<height&&(width<=900||touch);
}
let lockOwner=null;
export function mountStadiumOrientation(stage,{onChange=(_blocked)=>{},autoExpand=()=>true}={}){
 const gate=document.createElement('dialog');gate.className='sr-orientation-gate';gate.setAttribute('aria-labelledby','sr-orientation-title');
 gate.innerHTML='<div class="sr-orientation-card"><svg class="sr-orientation-phone" viewBox="0 0 80 80" aria-hidden="true"><rect x="25" y="12" width="30" height="56" rx="6"/><path d="M35 18h10M38 61h4M12 38a28 28 0 0 1 8-19m-10 1 10-1-1 10M68 42a28 28 0 0 1-8 19m10-1-10 1 1-10"/></svg><h2 id="sr-orientation-title">Rotate to watch</h2><button type="button" data-landscape-open>Open landscape</button><a href="#/arena">Back to Arena</a></div>';
 (stage.querySelector('.sr-watch-surface')||stage).append(gate);
 const button=gate.querySelector('button'),owner={};let stopped=false,blocked=false,busy=false,initialized=false,releaseFocus=null,dismissed=false,generation=0;
 const required=()=>needsStadiumLandscape({width:innerWidth,height:innerHeight,touch:matchMedia('(any-pointer:coarse)').matches});
 const expanded=()=>document.fullscreenElement===stage||stage.classList.contains('sr-expanded');
 const unlock=()=>{if(lockOwner!==owner)return;lockOwner=null;try{screen.orientation?.unlock?.();}catch{}};
 const sync=()=>{
  if(stopped)return;const next=required(),changed=next!==blocked;blocked=next;
  if(blocked)stage.classList.remove('sr-expanded');
  else if(!dismissed&&autoExpand()&&(changed||!initialized)&&matchMedia('(any-pointer:coarse)').matches&&document.fullscreenElement!==stage)stage.classList.add('sr-expanded');
  initialized=true;
  const cssExpanded=stage.classList.contains('sr-expanded');document.body.classList.toggle('sr-stadium-expanded',cssExpanded);
  if(!expanded()&&releaseFocus){releaseFocus();releaseFocus=null;}
  stage.dataset.landscapeBlocked=String(blocked);
  stage.querySelector('[data-expand]')?.setAttribute('aria-label',expanded()?'Close expanded race':'Expand race');
  const exitLabel=stage.querySelector('[data-expand-label]');if(exitLabel)exitLabel.textContent=expanded()?'Close view':'Watch';
  document.body.classList.toggle('sr-landscape-required',blocked);
  // A non-modal gate only covers the field. Editing and race controls remain usable.
  if(blocked&&!gate.open)gate.setAttribute('open','');else if(!blocked&&gate.open)gate.close();
  if(expanded()&&!releaseFocus)releaseFocus=trapFocus(stage,{initial:'[data-expand]',returnTo:stage.querySelector('[data-expand]'),preventScroll:true});
  if(changed)onChange(blocked);
 };
 const fullscreenChanged=()=>{if(document.fullscreenElement!==stage){unlock();dismissed=true;stage.classList.remove('sr-expanded');}sync();};
 async function exit(){
  ++generation;dismissed=true;stage.classList.remove('sr-expanded');unlock();
  try{if(document.fullscreenElement===stage)await document.exitFullscreen();}catch{}
  if(!stopped)sync();return !expanded();
 }
 async function expand(){
  if(stopped)return;if(expanded()){await exit();return;}if(busy)return;
  busy=true;button.disabled=true;dismissed=false;const token=++generation;
  try{
   if(typeof stage.requestFullscreen!=='function'){if(!required())stage.classList.add('sr-expanded');return;}
   await stage.requestFullscreen();
   if(stopped||token!==generation){if(document.fullscreenElement===stage)await document.exitFullscreen();return;}
   if(typeof screen.orientation?.lock==='function'){
    lockOwner=owner;try{await screen.orientation.lock('landscape');}catch{unlock();}
    if(stopped||token!==generation)unlock();
   }
  }catch{if(!stopped&&token===generation&&!required())stage.classList.add('sr-expanded');}
  finally{busy=false;button.disabled=false;if(!stopped)sync();}
 }
 button.hidden=typeof stage.requestFullscreen!=='function';button.onclick=()=>void expand();
 gate.addEventListener('cancel',event=>{event.preventDefault();void exit();});
 window.addEventListener('resize',sync,{passive:true});screen.orientation?.addEventListener?.('change',sync);document.addEventListener('fullscreenchange',fullscreenChanged);
 return {get blocked(){return blocked;},sync,expand,exit,stop(){if(stopped)return;stopped=true;++generation;unlock();window.removeEventListener('resize',sync);screen.orientation?.removeEventListener?.('change',sync);document.removeEventListener('fullscreenchange',fullscreenChanged);releaseFocus?.();if(gate.open)gate.close();gate.remove();stage.classList.remove('sr-expanded');document.body.classList.remove('sr-landscape-required','sr-stadium-expanded');}};
}
