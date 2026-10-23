import {animateUi,cancelUiMotion} from './ui-motion.js';
import {connectPortrait} from './connected-portrait.js';
import {enterSheet} from './sheet-drag.js';

// The photo arrives first. The panel then opens around the stationary photo;
// fetching details never controls the start of either movement.
export function enterPlayerCard(dialog,source,{motion=true,target='.dfl-player-portrait'}={}){
 let resolveArrival,resolveFinished,frame=0,stopped=false,hiddenPortrait=null,visibility='';
 const arrived=new Promise(resolve=>resolveArrival=resolve),finished=new Promise(resolve=>resolveFinished=resolve);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 dialog.dataset.playerCardStage='portrait';
 let actualConnection=()=>{};
 const connection=()=>actualConnection();connection.position=()=>actualConnection.position?.();
 const detach=()=>{
  window.removeEventListener('resize',interrupt);window.visualViewport?.removeEventListener('resize',interrupt);
  window.removeEventListener('dfl:ui-motion-change',interrupt);document.removeEventListener('visibilitychange',interrupt);reduced.removeEventListener('change',interrupt);
 };
 const stop=({closing=false}={})=>{
  if(stopped)return;stopped=true;
  if(closing){const style=getComputedStyle(dialog);dialog.style.clipPath=style.clipPath;dialog.style.opacity=style.opacity;}
  cancelAnimationFrame(frame);cancelUiMotion(dialog);connection();
  if(hiddenPortrait)hiddenPortrait.style.visibility=visibility;
  if(!closing)delete dialog.dataset.playerCardStage;
  detach();resolveArrival();resolveFinished();
 };
 function interrupt(){stop()}
 const reveal=()=>{
  frame=0;if(stopped||!dialog.open)return stop();
  const portrait=dialog.querySelector(target),box=dialog.getBoundingClientRect(),photo=portrait?.getBoundingClientRect();
  if(!photo||!connection.position?.())return stop();
  hiddenPortrait=portrait;visibility=portrait.style.visibility;portrait.style.visibility='hidden';
  // Capture an explicitly hidden seed's final state, not its temporary flight state.
  if(visibility==='hidden')visibility='';
  dialog.dataset.playerCardStage='card';
  const inset=`inset(${Math.max(0,photo.top-box.top)}px ${Math.max(0,box.right-photo.right)}px ${Math.max(0,box.bottom-photo.bottom)}px ${Math.max(0,photo.left-box.left)}px round ${getComputedStyle(portrait).borderRadius})`;
  const animation=animateUi(dialog,[{clipPath:inset},{clipPath:`inset(0px 0px 0px 0px round ${getComputedStyle(dialog).borderRadius})`}],{duration:240,motion});
  if(animation)animation.finished.then(()=>stop(),()=>stop());else stop();
 };
 const start=()=>{
  frame=0;if(stopped||!dialog.open)return stop();
  actualConnection=connectPortrait(source,dialog.querySelector(target),{motion,hideSource:true,hold:true});
  if(!connection.position?.()){
   delete dialog.dataset.playerCardStage;resolveArrival();
   const animation=enterSheet(dialog,{motion});
   if(animation)animation.finished.then(()=>stop(),()=>stop());else stop();
  }else{
   window.addEventListener('resize',interrupt);window.visualViewport?.addEventListener('resize',interrupt);
   window.addEventListener('dfl:ui-motion-change',interrupt);document.addEventListener('visibilitychange',interrupt);reduced.addEventListener('change',interrupt);
   actualConnection.finished.then(completed=>{
    if(stopped)return;
    resolveArrival();
    if(!completed)return stop();
    frame=requestAnimationFrame(reveal);
   });
  }
 };
 // Native scroll/focus events queued by opening the modal settle first.
 if(!motion||reduced.matches||document.documentElement.dataset.uiMotion==='off')start();
 else frame=requestAnimationFrame(start);
 return {arrived,finished,connection,stop};
}
