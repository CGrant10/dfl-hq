import {animateUi,cancelUiMotion} from './ui-motion.js';
// Decorative copies never intercept input or enter the accessibility tree.
export function connectArtwork(source,target,{motion=true,duration=300,hideSource=false,origin=null}={}){
 if(!source?.isConnected||!target?.isConnected||!HTMLElement.prototype.showPopover)return()=>{};
 const from=origin||source.getBoundingClientRect(),to=target.getBoundingClientRect();
 const visible=r=>r.width>0&&r.height>0&&r.bottom>44&&r.top<innerHeight-48&&r.left<innerWidth&&r.right>0;
 if(!visible(from)||!visible(to))return()=>{};
 const overlay=source.cloneNode(true);overlay.removeAttribute('id');overlay.setAttribute('popover','manual');overlay.setAttribute('aria-hidden','true');overlay.classList.add('dfl-connected-artwork');overlay.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
 const style=getComputedStyle(target);Object.assign(overlay.style,{position:'fixed',inset:'auto',margin:'0',left:`${to.left}px`,top:`${to.top}px`,width:`${to.width}px`,height:`${to.height}px`,padding:style.padding,boxSizing:'border-box',pointerEvents:'none',transformOrigin:'top left',visibility:'visible',borderRadius:style.borderRadius,background:style.background,border:style.border});
 const initial=overlay.querySelector('i'),targetInitial=target.querySelector('i');if(initial&&targetInitial)initial.style.font=getComputedStyle(targetInitial).font;
 document.body.append(overlay);overlay.showPopover();const visibility=target.style.visibility,sourceVisibility=source.style.visibility;
 let stopped=false;const stop=()=>{if(stopped)return;stopped=true;cancelUiMotion(overlay);overlay.remove();target.style.visibility=visibility;if(hideSource)source.style.visibility=sourceVisibility};
 stop.position=()=>overlay.isConnected?overlay.getBoundingClientRect():null;
 const animation=animateUi(overlay,[{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`,borderRadius:getComputedStyle(source).borderRadius},{transform:'translate(0,0) scale(1,1)',borderRadius:style.borderRadius}],{duration,motion});
 if(animation){target.style.visibility='hidden';if(hideSource)source.style.visibility='hidden';animation.finished.then(stop,stop)}else stop();return stop;
}
