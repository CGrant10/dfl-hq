import {esc} from './ui.js';
import {playerPortrait} from './player-presentation.js';
import {teamPortrait} from './team-presentation.js';

export function momentRecapFrames(items=[],matchupId=null){
 const unique=new Map(items.filter(m=>m&&['lead','big','surge'].includes(m.kind)&&Number.isFinite(m.at)&&m.text&&(matchupId==null||m.matchupId===String(matchupId))).map(m=>[String(m.key),m]));
 const moments=[...unique.values()].sort((a,b)=>a.at-b.at||String(a.key).localeCompare(String(b.key),undefined,{numeric:true})).slice(-8);
 if(!moments.length)return [];
 return [...moments.map(m=>({...m,title:m.kind==='lead'?'Lead change':m.kind==='surge'?'Scoring surge':'Big day'})),{key:'recap:close',kind:'close',title:'Receipts saved.',text:'Talk your shit. The numbers are right here.'}];
}
export function momentRecapFrame(frame){
 const art=frame.player?playerPortrait(frame.player):frame.team?teamPortrait(frame.team):'<span class="recap-finish" aria-hidden="true">DFL</span>';
 return `<article class="moment-recap-frame is-${esc(frame.kind)}" aria-live="polite" aria-atomic="true"><div class="moment-recap-art">${art}</div><small>${esc(frame.title)}</small><h3>${esc(frame.text)}</h3>${frame.at?`<time datetime="${new Date(frame.at).toISOString()}">Observed ${esc(new Date(frame.at).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}))}</time>`:''}</article>`;
}
export function mountMomentRecap({getMotion=()=>true,returnFocus=()=>null}={}){
 const dialog=document.createElement('dialog');dialog.className='gd-moment-recap';dialog.setAttribute('aria-labelledby','moment-recap-title');
 dialog.innerHTML='<header><h2 id="moment-recap-title" tabindex="-1">GameDay recap</h2><button type="button" class="linkbtn" data-recap-close>Close</button></header><div class="moment-recap-progress" aria-hidden="true"></div><div data-recap-frame></div><p class="moment-recap-count" role="status"></p><footer><button type="button" class="btn ghost" data-recap-back>Back</button><button type="button" class="btn" data-recap-play>Play</button><button type="button" class="btn ghost" data-recap-next>Next</button></footer>';
 document.body.append(dialog);let frames=[],index=0,playing=false,timer=0,animation=null,opener=null,stopped=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const pause=()=>{playing=false;clearTimeout(timer);dialog.querySelector('[data-recap-play]').textContent=index===frames.length-1?'Replay':'Play'};
 const schedule=()=>{clearTimeout(timer);if(playing&&!document.hidden)timer=setTimeout(()=>step(1),4500)};
 const draw=()=>{
  animation?.cancel();dialog.querySelector('[data-recap-frame]').innerHTML=momentRecapFrame(frames[index]);
  dialog.querySelector('.moment-recap-progress').innerHTML=frames.map((_,i)=>`<i${i<=index?' class="is-seen"':''}></i>`).join('');
  dialog.querySelector('.moment-recap-count').textContent=`${index+1} of ${frames.length}`;
  const back=dialog.querySelector('[data-recap-back]'),next=dialog.querySelector('[data-recap-next]'),focused=document.activeElement;back.disabled=index===0;next.disabled=index===frames.length-1;
  if(focused===back&&back.disabled||focused===next&&next.disabled)dialog.querySelector('[data-recap-play]').focus({preventScroll:true});
  if(getMotion()&&!reduced.matches)animation=dialog.querySelector('.moment-recap-frame').animate?.([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:260,easing:'cubic-bezier(.2,.7,.2,1)'});
  if(index===frames.length-1)pause();else dialog.querySelector('[data-recap-play]').textContent=playing?'Pause':'Play';schedule();
 };
 const step=direction=>{index=Math.max(0,Math.min(frames.length-1,index+direction));draw()};
 const close=()=>{pause();animation?.cancel();dialog.close()};
 dialog.addEventListener('click',event=>{
  event.stopPropagation();if(event.target===dialog||event.target.closest('[data-recap-close]'))close();
  else if(event.target.closest('[data-recap-back],[data-recap-next]')){pause();step(event.target.closest('[data-recap-back]')?-1:1)}
  else if(event.target.closest('[data-recap-play]')){if(playing){pause();return}if(index===frames.length-1)index=0;playing=true;draw()}
 });
 dialog.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();pause();step(event.key==='ArrowLeft'?-1:1)}});
 dialog.addEventListener('cancel',event=>{event.preventDefault();close()});
 dialog.addEventListener('close',()=>{pause();animation?.cancel();if(!stopped)(opener?.isConnected?opener:returnFocus())?.focus({preventScroll:true})});
 const interrupt=()=>{if(document.hidden||!getMotion()||reduced.matches){pause();animation?.cancel()}};
 document.addEventListener('visibilitychange',interrupt);window.addEventListener('dfl:ui-motion-change',interrupt);reduced.addEventListener('change',interrupt);
 return {open(items,matchupId=null){if(stopped)return;frames=momentRecapFrames(items,matchupId);if(!frames.length)return;opener=document.activeElement;index=0;pause();draw();dialog.showModal();dialog.querySelector('h2').focus({preventScroll:true})},stop(){stopped=true;pause();animation?.cancel();dialog.close();dialog.remove();document.removeEventListener('visibilitychange',interrupt);window.removeEventListener('dfl:ui-motion-change',interrupt);reduced.removeEventListener('change',interrupt)}};
}
