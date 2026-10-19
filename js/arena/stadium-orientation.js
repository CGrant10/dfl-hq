import {trapFocus} from '../focus-trap.js';

// Portrait watches the same wide scene inline. Only touch landscape opts into
// immersive viewing automatically; an explicit close always wins over resize.
export function autoExpandStadium({width,height,touch=false}){
 return touch&&width>height;
}
export function mountStadiumOrientation(stage,{onChange=()=>{},autoExpand=()=>true}={}){
 let stopped=false,busy=false,initialized=false,releaseFocus=null,dismissed=false,generation=0,lastPortrait=null;
 const expanded=()=>document.fullscreenElement===stage||stage.classList.contains('sr-expanded');
 const sync=()=>{
  if(stopped)return;
  const portrait=innerHeight>innerWidth,changed=portrait!==lastPortrait;
  if(!dismissed&&autoExpand()&&(changed||!initialized)&&autoExpandStadium({width:innerWidth,height:innerHeight,touch:matchMedia('(any-pointer:coarse)').matches})&&document.fullscreenElement!==stage)stage.classList.add('sr-expanded');
  // An automatic landscape expansion returns inline on rotation. Explicit
  // fullscreen/expanded viewing remains open and letterboxes in portrait.
  if(portrait&&stage.dataset.expansion!=='manual'&&document.fullscreenElement!==stage)stage.classList.remove('sr-expanded');
  initialized=true;lastPortrait=portrait;stage.dataset.portrait=String(portrait);
  document.body.classList.toggle('sr-stadium-expanded',stage.classList.contains('sr-expanded'));
  if(!expanded()&&releaseFocus){releaseFocus();releaseFocus=null;}
  stage.querySelector('[data-expand]')?.setAttribute('aria-label',expanded()?'Close expanded race':'Expand race');
  const label=stage.querySelector('[data-expand-label]');if(label)label.textContent=expanded()?'Close':'Expand';
  if(expanded()&&!releaseFocus)releaseFocus=trapFocus(stage,{initial:'[data-expand]',returnTo:stage.querySelector('[data-expand]'),preventScroll:true});
  if(changed)onChange();
 };
 const fullscreenChanged=()=>{if(document.fullscreenElement!==stage){dismissed=true;stage.classList.remove('sr-expanded');delete stage.dataset.expansion;}sync();};
 async function exit(){
  ++generation;dismissed=true;stage.classList.remove('sr-expanded');delete stage.dataset.expansion;
  try{if(document.fullscreenElement===stage)await document.exitFullscreen();}catch{}
  if(!stopped)sync();return !expanded();
 }
 async function expand(){
  if(stopped)return;if(expanded()||busy){await exit();return;}
  busy=true;dismissed=false;stage.dataset.expansion='manual';const token=++generation;
  try{
   if(typeof stage.requestFullscreen!=='function'){stage.classList.add('sr-expanded');return;}
   await stage.requestFullscreen();
   if(stopped||token!==generation){if(document.fullscreenElement===stage)await document.exitFullscreen();return;}
  }catch{if(!stopped&&token===generation)stage.classList.add('sr-expanded');}
  finally{busy=false;if(!stopped)sync();}
 }
 window.addEventListener('resize',sync,{passive:true});screen.orientation?.addEventListener?.('change',sync);document.addEventListener('fullscreenchange',fullscreenChanged);
 return {sync,expand,exit,stop(){if(stopped)return;stopped=true;++generation;window.removeEventListener('resize',sync);screen.orientation?.removeEventListener?.('change',sync);document.removeEventListener('fullscreenchange',fullscreenChanged);releaseFocus?.();stage.classList.remove('sr-expanded');delete stage.dataset.expansion;document.body.classList.remove('sr-stadium-expanded');}};
}
