export function replaySnapSizes(height,width){
 const expanded=Math.min(96,Math.max(48,height*.16));
 const watch=Math.max(expanded,Math.min(height-220,width*9/16+152));
 const browse=Math.max(expanded,Math.min(watch-36,width*9/16+50,height*.4));
 return [watch,browse,expanded];
}
export function replaySnapIndex(sizes,size,velocity=0){
 const projected=size+Math.max(-1.5,Math.min(1.5,velocity))*130;
 return sizes.reduce((best,value,index)=>Math.abs(value-projected)<Math.abs(sizes[best]-projected)?index:best,0);
}
// One native video stays mounted as the drawer follows a finger and snaps.
export function mountReplayLayout(dialog,{motion=()=>true,onSnap=(_index)=>{}}={}){
 const view=dialog.querySelector('.home-reel-view'),grip=dialog.querySelector('[data-reel-resize]');
 let index=0,frame=0,animation=0,drag=null,stopped=false;
 const sizes=()=>replaySnapSizes(view.clientHeight,view.clientWidth);
 function apply(size,animate=false){
  if(stopped)return;clearTimeout(animation);dialog.toggleAttribute('data-reel-layout-motion',animate&&motion());
  dialog.style.setProperty('--reel-stage-size',`${size}px`);
  const stops=sizes(),height=view.clientHeight||1;
  grip.setAttribute('aria-valuenow',String(Math.round(size/height*100)));grip.setAttribute('aria-valuemin',String(Math.round(stops[2]/height*100)));grip.setAttribute('aria-valuemax',String(Math.round(stops[0]/height*100)));
  grip.setAttribute('aria-valuetext',drag?'Resizing drawer':['Watch','Browse','Expanded browser'][index]);
  if(animate&&motion())animation=setTimeout(()=>dialog.removeAttribute('data-reel-layout-motion'),280);
 }
 function snap(next,animate=true){
  index=Math.max(0,Math.min(2,next));drag=null;dialog.removeAttribute('data-reel-resizing');dialog.dataset.reelSnap=['watch','browse','expanded'][index];
  dialog.dataset.reelPane=index===0?'watch':'browse';apply(sizes()[index],animate);
  for(const button of dialog.querySelectorAll('[data-reel-layout]'))button.setAttribute('aria-pressed',String(button.dataset.reelLayout===(index===0?'watch':'browse')));
  onSnap(index);
 }
 const down=event=>{
  if(event.button!==0)return;event.preventDefault();cancelAnimationFrame(frame);
  drag={id:event.pointerId,y:event.clientY,lastY:event.clientY,lastAt:event.timeStamp,velocity:0,size:parseFloat(dialog.style.getPropertyValue('--reel-stage-size'))||sizes()[index]};
  grip.setPointerCapture(event.pointerId);dialog.setAttribute('data-reel-resizing','');
 };
 const move=event=>{if(!drag||event.pointerId!==drag.id)return;const elapsed=event.timeStamp-drag.lastAt;if(elapsed>0)drag.velocity=(event.clientY-drag.lastY)/elapsed;drag.lastY=event.clientY;drag.lastAt=event.timeStamp;const stops=sizes(),size=Math.max(stops[2],Math.min(stops[0],drag.size+event.clientY-drag.y));cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>apply(size))};
 const up=event=>{if(!drag||event.pointerId!==drag.id)return;cancelAnimationFrame(frame);const size=drag.size+event.clientY-drag.y,velocity=event.timeStamp-drag.lastAt<100?drag.velocity:0;snap(['pointercancel','lostpointercapture'].includes(event.type)?index:replaySnapIndex(sizes(),size,velocity))};
 const key=event=>{const next={ArrowUp:index+1,ArrowDown:index-1,Home:2,End:0,Enter:0}[event.key];if(next===undefined)return;event.preventDefault();snap(next)};
 const focus=event=>{if(event.target.matches('[data-reel-search]'))snap(2)};
 const click=event=>{const button=event.target.closest('[data-reel-layout]');if(button)snap(button.dataset.reelLayout==='watch'?0:1)};
 grip.addEventListener('pointerdown',down);grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',up);grip.addEventListener('pointercancel',up);grip.addEventListener('lostpointercapture',up);grip.addEventListener('keydown',key);dialog.addEventListener('click',click);dialog.addEventListener('focusin',focus);
 const observer=new ResizeObserver(()=>{if(dialog.open&&!drag)apply(sizes()[index])});observer.observe(view);
 return {watch(){snap(0)},browse(){snap(1)},expand(){snap(2)},reset(){snap(0,false)},stop(){stopped=true;observer.disconnect();cancelAnimationFrame(frame);clearTimeout(animation);grip.removeEventListener('pointerdown',down);grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',up);grip.removeEventListener('pointercancel',up);grip.removeEventListener('lostpointercapture',up);grip.removeEventListener('keydown',key);dialog.removeEventListener('click',click);dialog.removeEventListener('focusin',focus)}};
}
