import {animateUi,cancelUiMotion} from './ui-motion.js';

const rolls=new WeakMap(),reactions=new WeakMap();
const anchor=host=>host?.matches('.gd-thermal-number')?host:host?.querySelector('.gd-thermal-number');
export function cancelScoreRoll(host){const number=anchor(host);if(!number)return;rolls.get(number)?.();reactions.delete(number);number.dispatchEvent(new CustomEvent('dfl:score-flare-stop',{bubbles:true}));}

// Roll a clipped, decorative copy. The recorded number, its geometry and the
// GPU glyph anchor stay mounted throughout the change, including scrolls.
export function rollScore(host,{from,to,motion=true}={}){
 const number=anchor(host),value=number?.querySelector('.gd-thermal-value');
 cancelScoreRoll(host);
 if(!value||!motion||from==null||to==null||!Number.isFinite(Number(from))||!Number.isFinite(Number(to))||Number(from)===Number(to))return()=>{};
 const fromText=Number(from).toFixed(2),toText=Number(to).toFixed(2);
 if(fromText===toText)return()=>{};
 const box=value.getBoundingClientRect();
 if(box.width<=0||box.height<=0||box.bottom<=0||box.top>=innerHeight||box.right<=0||box.left>=innerWidth)return()=>{};
 const clip=document.createElement('span');clip.className='gd-score-roll';clip.setAttribute('aria-hidden','true');
 const old=document.createElement('span'),next=document.createElement('span');
 old.textContent=fromText;next.textContent=toText;clip.append(old,next);number.append(clip);number.dataset.scoreRolling='';
 let stopped=false;
 const stop=()=>{if(stopped)return;stopped=true;cancelUiMotion(clip);clip.remove();if(rolls.get(number)===stop){rolls.delete(number);delete number.dataset.scoreRolling}};
 rolls.set(number,stop);
 const direction=Number(to)>Number(from)?1:-1;
 const timing={duration:300,easing:'cubic-bezier(.16,1,.3,1)',motion};
 const outgoing=animateUi(old,[{transform:'translateY(0)',opacity:1},{transform:`translateY(${-direction*100}%)`,opacity:0}],timing);
 const incoming=animateUi(next,[{transform:`translateY(${direction*100}%)`,opacity:0},{transform:'translateY(0)',opacity:1}],timing);
 if(!outgoing||!incoming){stop();return()=>{}};
 const reaction={};reactions.set(number,reaction);
 if(['hot','cold'].includes(number.dataset.scoreTemperature))number.dispatchEvent(new CustomEvent('dfl:score-flare',{bubbles:true}));
 void Promise.allSettled([outgoing.finished,incoming.finished]).then(stop);
 return()=>{if(reactions.get(number)===reaction)cancelScoreRoll(number);else stop()};
}
