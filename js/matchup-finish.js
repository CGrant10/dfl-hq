import {esc,toast} from './ui.js';
import {patchGameDay} from './game-day-dom.js';
import {matchupFinish,finishSeenKey} from './matchup-finish-model.js';

const memory=new Set(),storageKey='dfl.matchup-finishes.v1';
function seen(key){if(memory.has(key))return true;try{return JSON.parse(localStorage.getItem(storageKey)||'[]').includes(key)}catch{return false}}
function remember(key){memory.add(key);if(memory.size>80)memory.delete(memory.values().next().value);try{const stored=JSON.parse(localStorage.getItem(storageKey)||'[]');localStorage.setItem(storageKey,JSON.stringify([...new Set([...(Array.isArray(stored)?stored:[]),key])].slice(-80)))}catch{}}
export function matchupFinishHtml(result){
 if(!result)return '';
 return `<section class="matchup-finish" aria-label="Final matchup receipt" data-finish-kind="${result.kind}"><span class="matchup-finish-rule" aria-hidden="true"></span><div class="matchup-finish-verdict"><strong>${esc(result.label)}</strong><span><b>${result.margin.toFixed(2)}</b><small>${result.kind==='tie'?'point gap':'point'+(result.margin===1?'':'s')}</small></span></div><p class="matchup-finish-roast">${esc(result.roast)}</p><div class="matchup-finish-actions"><button type="button" class="linkbtn" data-finish-replay>Replay finish</button><button type="button" class="linkbtn" data-finish-share>Share final</button></div><span class="sr-only" role="status" data-finish-announcement></span></section>`;
}

// A single finite reveal, shared by Watch and Clubhouse. Scores stay truthful
// throughout: animation reveals the actual digits instead of counting fake ones.
export function mountMatchupFinish(root,{getModel,getGame,getSurface=()=>root,getMotion=()=>true,getOwner=()=>null,allowAuto=()=>true,onShare=()=>{}}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let stopped=false,result=null,surface=null,stamp='',frame=null,transitionTimer=null,animations=[],observer=null,sharing=false,explicitPending=false;
 const cancel=()=>{animations.forEach(animation=>{animation.onfinish=null;animation.cancel()});animations=[];if(surface)delete surface.dataset.finishPlaying};
 const disconnect=()=>{observer?.disconnect();observer=null;cancelAnimationFrame(frame);frame=null;clearTimeout(transitionTimer);transitionTimer=null};
 const canMove=()=>getMotion()&&!reduced.matches&&document.visibilityState==='visible';
 const scoreSurface=()=>surface?.querySelector('.clubhouse-game-teams,.gd-watch-scoreboard');
 const visible=()=>{
  const node=scoreSurface();if(stopped||!root.isConnected||!surface?.isConnected||surface.closest('[hidden],[inert]')||surface.closest('dialog:not([open])')||!node?.getClientRects().length||document.visibilityState!=='visible')return false;
  const rect=node.getBoundingClientRect();return rect.bottom>44&&rect.top<innerHeight-48;
 };
 const play=(explicit=false)=>{
  cancel();if(!result||!visible())return;
  const key=finishSeenKey(result,getOwner());if(!explicit&&(seen(key)||!allowAuto())){disconnect();return}
  explicitPending=false;
  remember(key);disconnect();
  const announcement=surface.querySelector('[data-finish-announcement]');if(announcement)announcement.textContent=result.announcement;
  if(!canMove())return;
  surface.dataset.finishPlaying=result.kind;
  const animate=(node,frames,options={})=>{
   if(!node?.animate)return;const animation=node.animate(frames,{duration:620,easing:'cubic-bezier(.2,.75,.25,1)',fill:'backwards',...options});
   animations.push(animation);animation.onfinish=()=>{animations=animations.filter(item=>item!==animation);animation.cancel();if(!animations.length&&surface)delete surface.dataset.finishPlaying};
  };
  const teams=surface.querySelectorAll('.clubhouse-game-side,.gd-watch-score-team');
  teams.forEach((team,index)=>{
   const identity=team.querySelector('.clubhouse-matchup-name,h3'),portrait=team.querySelector('.dfl-team-mark');
   for(const node of [identity,portrait])animate(node,[{opacity:0,transform:`translateX(${index?20:-20}px)`},{opacity:1,transform:'translateX(0)'}],{delay:index*60});
   const score=team.querySelector('[data-matchup-score-value],.gd-thermal-value');
   animate(score,[{opacity:0,transform:'translateY(8px) scale(.96)'},{opacity:1,transform:'translateY(0) scale(1)'}],{delay:160+index*60,duration:result.kind==='clutch'?780:600});
  });
  animate(surface.querySelector('.matchup-finish-rule'),[{transform:'scaleX(0)',opacity:0},{transform:'scaleX(1)',opacity:1}],{delay:380,duration:result.kind==='blowout'?800:500});
  animate(surface.querySelector('.matchup-finish-verdict'),[{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{delay:500,duration:480});
  animate(surface.querySelector('.matchup-finish-roast'),[{opacity:0},{opacity:1}],{delay:780,duration:420});
 };
 const attempt=()=>{
  frame=null;if(!result||!visible())return;
  if(document.documentElement.dataset.matchupTransition){clearTimeout(transitionTimer);transitionTimer=setTimeout(()=>{transitionTimer=null;if(!document.documentElement.dataset.matchupTransition)play(explicitPending)},700);return}
  play(explicitPending);
 };
 const schedule=()=>{if(!stopped&&frame===null)frame=requestAnimationFrame(attempt)};
 const update=()=>{
  if(stopped)return;
  const next=matchupFinish(getModel(),getGame()),nextSurface=getSurface();
  const nextStamp=JSON.stringify([next?.key,next?.sides.map(team=>[team.name,team.score]),getOwner()]);
  if(nextSurface===surface&&nextStamp===stamp)return;
  cancel();disconnect();explicitPending=false;if(surface)delete surface.dataset.finishReady;
  surface=nextSurface;result=next;stamp=nextStamp;
  const slot=surface?.querySelector('[data-matchup-finish]');if(!slot)return;
  patchGameDay(slot,matchupFinishHtml(result));slot.hidden=!result;
  if(!result)return;
  surface.dataset.finishReady=result.kind;
  if(!allowAuto()||seen(finishSeenKey(result,getOwner())))return;
  const node=scoreSurface();if(node){observer=new IntersectionObserver(schedule,{threshold:.15});observer.observe(node)}schedule();
 };
 const click=async event=>{
  const button=event.target.closest('[data-finish-replay],[data-finish-share]');if(!button||!surface?.contains(button)||!result)return;
  event.preventDefault();
  if(button.hasAttribute('data-finish-replay')){
   if(visible())play(true);
   else {explicitPending=true;const node=scoreSurface();if(node){observer?.disconnect();observer=new IntersectionObserver(schedule,{threshold:.15});observer.observe(node);node.scrollIntoView({block:'center',behavior:canMove()?'smooth':'instant'});schedule()}}
   return;
  }
  if(sharing)return;sharing=true;button.disabled=true;button.setAttribute('aria-busy','true');
  try{await onShare()}catch{toast('Could not share this final. Try again.',true)}
  finally{sharing=false;if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy')}}
 };
 const motionChanged=()=>{if(!canMove())cancel()};
 const visibility=()=>{if(document.visibilityState!=='visible')cancel();else schedule()};
 root.addEventListener('click',click);reduced.addEventListener('change',motionChanged);document.addEventListener('visibilitychange',visibility);
 return {update,motionChanged,cancel,
  stop(){if(stopped)return;stopped=true;cancel();disconnect();root.removeEventListener('click',click);reduced.removeEventListener('change',motionChanged);document.removeEventListener('visibilitychange',visibility)},
 };
}
