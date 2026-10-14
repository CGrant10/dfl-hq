import {animateUi} from './ui-motion.js';
import {readPageChoice} from './page-disclosure.js';

export function animateBankroll(node,from,to){
  let frame=0;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const allowed=()=>!media.matches&&readPageChoice('gameday-motion',['on','off'],'on')==='on'&&document.visibilityState==='visible';
  const finish=()=>{cancelAnimationFrame(frame);frame=0;node.textContent=Number(to).toLocaleString();media.removeEventListener('change',finish);document.removeEventListener('visibilitychange',finish);window.removeEventListener('dfl:ui-motion-change',finish);};
  if(!allowed()||from===to){node.textContent=Number(to).toLocaleString();return()=>{};}
  const start=performance.now(),duration=620;
  const tick=now=>{
    if(!node.isConnected||!allowed()){finish();return;}
    const progress=Math.min(1,(now-start)/duration),eased=1-(1-progress)**3;
    node.textContent=Math.round(from+(to-from)*eased).toLocaleString();
    if(progress<1)frame=requestAnimationFrame(tick);else finish();
  };
  media.addEventListener('change',finish);document.addEventListener('visibilitychange',finish);window.addEventListener('dfl:ui-motion-change',finish);
  frame=requestAnimationFrame(tick);return finish;
}

export function revealTicketResult(node,status){
  return animateUi(node,[{boxShadow:`inset 3px 0 0 ${status==='won'?'var(--milestone)':'var(--accent)'}`,opacity:.8},{boxShadow:'inset 3px 0 0 transparent',opacity:1}],{duration:800});
}
