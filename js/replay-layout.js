// Resize only the two panes; the playing media element is never replaced.
export function mountReplayLayout(dialog,{motion=()=>true}={}){
 const view=dialog.querySelector('.home-reel-view'),grip=dialog.querySelector('[data-reel-resize]');
 let wanted=50,frame=0,animation=0,drag=null,stopped=false;
 const bounds=()=>{const height=view.clientHeight;return {min:18,max:Math.max(18,Math.min(70,(height-290)/height*100))}};
 function apply(value=wanted,animate=false){
  if(stopped)return;wanted=value;
  const {min,max}=bounds(),share=Math.max(min,Math.min(max,value));
  clearTimeout(animation);dialog.toggleAttribute('data-reel-layout-motion',animate&&motion());
  dialog.style.setProperty('--reel-stage-size',`${share}%`);dialog.dataset.reelPane=share<34?'browse':'watch';
  grip.setAttribute('aria-valuenow',String(Math.round(share)));grip.setAttribute('aria-valuemin',String(min));grip.setAttribute('aria-valuemax',String(Math.round(max)));
  grip.setAttribute('aria-valuetext',`${Math.round(share)}% video, ${100-Math.round(share)}% clip browser`);
  for(const button of dialog.querySelectorAll('[data-reel-layout]'))button.setAttribute('aria-pressed',String(button.dataset.reelLayout===(value===62?'watch':value===24?'browse':'')));
  if(animate&&motion())animation=setTimeout(()=>dialog.removeAttribute('data-reel-layout-motion'),240);
 }
 const down=event=>{
  if(event.button!==0)return;event.preventDefault();
  drag={id:event.pointerId,y:event.clientY,share:parseFloat(dialog.style.getPropertyValue('--reel-stage-size'))||50,height:view.clientHeight};
  grip.setPointerCapture(event.pointerId);dialog.setAttribute('data-reel-resizing','');
 };
 const move=event=>{if(!drag||event.pointerId!==drag.id)return;const value=drag.share+(event.clientY-drag.y)/drag.height*100;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>apply(value))};
 const up=event=>{if(!drag||event.pointerId!==drag.id)return;cancelAnimationFrame(frame);if(event.type==='pointerup')apply(drag.share+(event.clientY-drag.y)/drag.height*100);drag=null;dialog.removeAttribute('data-reel-resizing')};
 const key=event=>{
  const {min,max}=bounds(),share=parseFloat(dialog.style.getPropertyValue('--reel-stage-size'))||50;
  const next={ArrowUp:share-5,ArrowDown:share+5,Home:min,End:max,Enter:50}[event.key];
  if(next===undefined)return;event.preventDefault();apply(next,true);
 };
 const focus=event=>{if(event.target.matches('[data-reel-search]'))apply(24,true)};
 const click=event=>{const button=event.target.closest('[data-reel-layout]');if(button)apply(button.dataset.reelLayout==='watch'?62:24,true)};
 grip.addEventListener('pointerdown',down);grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',up);grip.addEventListener('pointercancel',up);grip.addEventListener('lostpointercapture',up);grip.addEventListener('keydown',key);dialog.addEventListener('click',click);dialog.addEventListener('focusin',focus);
 const observer=new ResizeObserver(()=>{if(dialog.open&&!drag)apply()});observer.observe(view);
 return {watch(){apply(62,true)},browse(){apply(24,true)},reset(){drag=null;dialog.removeAttribute('data-reel-resizing');apply(50)},stop(){stopped=true;observer.disconnect();cancelAnimationFrame(frame);clearTimeout(animation);grip.removeEventListener('pointerdown',down);grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',up);grip.removeEventListener('pointercancel',up);grip.removeEventListener('lostpointercapture',up);grip.removeEventListener('keydown',key);dialog.removeEventListener('click',click);dialog.removeEventListener('focusin',focus)}};
}
