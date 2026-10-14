import {animateUi,cancelUiMotion,exitUi} from './ui-motion.js';

export function sheetShouldClose({distance=0,velocity=0,height=0,cancelled=false}) {
  return !cancelled && (distance>=Math.max(60,Math.min(120,height*.2)) || distance>=36&&velocity>=.65);
}
export function enterSheet(dialog,{motion=true}={}) {
  return animateUi(dialog,[{opacity:0,transform:`translateY(${innerWidth<=600?24:10}px)`},{opacity:1,transform:'none'}],{duration:220,motion});
}
export function exitSheet(dialog,complete,options={}) {
  const viewport=window.visualViewport;
  const edge=viewport?viewport.offsetTop+viewport.height:innerHeight;
  const current=getComputedStyle(dialog).transform;
  const offset=current==='none'?0:new DOMMatrixReadOnly(current).m42;
  const transform=innerWidth<=600?`translateY(${Math.max(24,edge-dialog.getBoundingClientRect().top+offset+24)}px)`:'translateY(12px)';
  exitUi(dialog,complete,{...options,transform,duration:220});
}

// Only the fixed header owns the gesture; the body and form stay native.
export function mountSheetDrag(dialog,{handle,canDismiss=()=>true,dismiss,onStart=()=>{}}) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),viewport=window.visualViewport;
  let gesture=null,frame=0,returning=null,suppressUntil=0,stopped=false;
  dialog.dataset.sheetReady='true';handle.dataset.sheetHandle='true';
  const motion=()=>!reduced.matches&&document.documentElement.dataset.uiMotion!=='off'&&dialog.dataset.motion!=='off';
  const clean=()=>{
    dialog.style.removeProperty('transform');dialog.style.removeProperty('--sheet-dim');
    delete dialog.dataset.sheetMoving;
  };
  const release=id=>{if(handle.hasPointerCapture?.(id))handle.releasePointerCapture(id);};
  const reset=()=>{
    const current=gesture;gesture=null;
    if(current)release(current.id);
    cancelAnimationFrame(frame);frame=0;
    returning=null;cancelUiMotion(dialog);clean();
  };
  const finish=(event,cancelled=false)=>{
    if(!gesture||event&&event.pointerId!==gesture.id)return;
    const current=gesture;gesture=null;release(current.id);cancelAnimationFrame(frame);frame=0;
    if(!current.moving&&!current.origin)return;
    suppressUntil=performance.now()+400;
    const distance=event?Math.max(0,event.clientY-current.y):current.distance;
    const now=performance.now(),sample=current.samples.find(s=>now-s.at<=100)||current.samples.at(-1);
    const velocity=sample&&now-sample.at>0?(distance-sample.distance)/(now-sample.at):0;
    if(canDismiss()&&sheetShouldClose({distance,velocity,height:current.height,cancelled})) {dismiss();return;}
    const transform=getComputedStyle(dialog).transform,dim=getComputedStyle(dialog).getPropertyValue('--sheet-dim').trim()||'1';
    dialog.style.transform='none';dialog.style.setProperty('--sheet-dim','1');
    const animation=animateUi(dialog,[{transform,'--sheet-dim':dim},{transform:'none','--sheet-dim':'1'}],{duration:200});
    if(!animation){clean();return;}
    returning=animation;
    const done=()=>{if(returning===animation){returning=null;clean();}};
    animation.finished.then(done,done);
  };
  const down=event=>{
    suppressUntil=0;
    if(event.isPrimary===false){finish(null,true);return;}
    if(stopped||!dialog.open||dialog.dataset.uiClosing||innerWidth>600||event.button!==0||!canDismiss()||event.target.closest('button,a,input,select,textarea,[contenteditable]'))return;
    finish(null,true);
    const transform=getComputedStyle(dialog).transform;
    const origin=transform==='none'?0:new DOMMatrixReadOnly(transform).m42;
    const dim=getComputedStyle(dialog).getPropertyValue('--sheet-dim').trim()||'1';
    returning=null;cancelUiMotion(dialog);
    if(!origin)clean();
    if(origin){dialog.dataset.sheetMoving='true';dialog.style.transform=`translateY(${origin}px)`;dialog.style.setProperty('--sheet-dim',dim);}
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,height:dialog.getBoundingClientRect().height,origin,distance:0,moving:false,samples:[{at:performance.now(),distance:0}]};
  };
  const move=event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(!gesture.moving&&Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)){finish(event,true);return;}
    if(!gesture.moving&&dy>8&&dy>Math.abs(dx)*1.2){
      gesture.moving=true;handle.setPointerCapture?.(event.pointerId);dialog.dataset.sheetMoving='true';onStart();
    }
    if(!gesture.moving)return;
    gesture.distance=Math.max(0,dy);gesture.samples.push({at:performance.now(),distance:gesture.distance});
    gesture.samples=gesture.samples.filter(s=>performance.now()-s.at<=120);
    if(!motion())return;
    if(!frame)frame=requestAnimationFrame(()=>{
      frame=0;if(!gesture)return;
      const offset=Math.min(gesture.height,gesture.origin+gesture.distance);
      dialog.style.transform=`translateY(${offset}px)`;
      dialog.style.setProperty('--sheet-dim',String(Math.max(.2,1-offset/Math.max(1,gesture.height))));
    });
  };
  const up=event=>finish(event);
  const cancel=event=>finish(event,true);
  const lost=event=>{if(event.target===handle&&gesture?.moving&&!handle.hasPointerCapture?.(event.pointerId))finish(event,true);};
  const click=event=>{if(performance.now()<suppressUntil&&!event.target.closest('button,a,input,select,textarea')){event.preventDefault();event.stopImmediatePropagation();}};
  const interrupt=()=>{finish(null,true);if(!motion()||document.hidden)reset();};
  const viewportChange=()=>{finish(null,true);};
  handle.addEventListener('pointerdown',down);handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);
  handle.addEventListener('pointercancel',cancel);handle.addEventListener('lostpointercapture',lost);handle.addEventListener('click',click,true);
  dialog.addEventListener('close',reset);document.addEventListener('visibilitychange',interrupt);window.addEventListener('dfl:ui-motion-change',interrupt);
  window.addEventListener('pagehide',reset);
  window.addEventListener('resize',viewportChange);viewport?.addEventListener('resize',viewportChange);reduced.addEventListener('change',interrupt);
  return {reset,stop(){
    stopped=true;reset();delete dialog.dataset.sheetReady;delete handle.dataset.sheetHandle;
    handle.removeEventListener('pointerdown',down);handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);
    handle.removeEventListener('pointercancel',cancel);handle.removeEventListener('lostpointercapture',lost);handle.removeEventListener('click',click,true);
    dialog.removeEventListener('close',reset);document.removeEventListener('visibilitychange',interrupt);window.removeEventListener('dfl:ui-motion-change',interrupt);
    window.removeEventListener('pagehide',reset);
    window.removeEventListener('resize',viewportChange);viewport?.removeEventListener('resize',viewportChange);reduced.removeEventListener('change',interrupt);
  }};
}
