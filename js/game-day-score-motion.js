import { animateGameDayMoments,syncLeadMarkers } from './game-day-moment-effects.js';
import {rollScore} from './score-roll.js';
const numeric = value => value != null && Number.isFinite(Number(value)) ? Number(value) : null;
export function scoreChange(before, after) {
 const from=numeric(before),to=numeric(after);
 if(from==null||to==null)return null;
 const delta=Math.round((to-from)*100)/100;
 return delta===0?null:{from,to,delta,label:`${delta>0?'+':'−'}${Math.abs(delta).toFixed(2)}`};
}
// Legacy snapshots without timestamps retain their existing behavior.
// Current live screens stamp both sides to suppress stale catch-up effects.
export function recentScoreRefresh(previous,next,maxAgeMs=120000){
 const before=numeric(previous?.checkedAt),after=numeric(next?.checkedAt);
 return before==null||after==null||after>=before&&after-before<=maxAgeMs;
}
// Animate only successful refreshes, never initial loads or tab changes.
export function animateScoreChanges(root,{previous,model,motion,gameId=null,feedback=false,extraRoots=[]}){
 const surfaces=[root,...extraRoots];for(const surface of surfaces)syncLeadMarkers(surface,model,gameId);
 if(!recentScoreRefresh(previous,model.snapshot))return()=>{};
 const animations=[],badges=[],hosts=[],timers=[],rolls=[];
 const animated=motion&&!root.closest('[data-motion="off"]')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!animated&&!feedback)return()=>{};
 const stopMoments=animated?animateGameDayMoments(root,{previous,model,gameId,teamRoot:extraRoots[0]||root}):()=>{};
 for(const host of surfaces.flatMap(surface=>[...surface.querySelectorAll('[data-gameday-score-key],[data-gameday-total-key]')])){
  const total=host.dataset.gamedayTotalKey,key=total??host.dataset.gamedayScoreKey,change=scoreChange(total!=null?previous?.totals?.[key]:previous?.points?.[key],total!=null?model.snapshot.totals?.[key]:model.snapshot.points[key]);
  if(!change)continue;
  const badge=document.createElement('span');badge.className=`gd-score-delta${change.delta<0?' is-negative':''}`;badge.textContent=change.label;badge.setAttribute('aria-hidden','true');const phase=host.matches('.gameday-player-score')?host.querySelector(':scope > small'):null;(phase||host).append(badge);host.classList.add('gd-score-updated');badges.push(badge);hosts.push(host);
  // Keep glyph geometry fixed so the GPU fire remains aligned with the number.
  const value=host.querySelector('.gd-thermal-value,[data-matchup-score-value]');
  if(animated&&value?.animate){if(value.classList.contains('gd-thermal-value'))rolls.push(rollScore(host,{from:change.from,to:change.to,motion}));else animations.push(value.animate([{opacity:.55},{opacity:1}],{duration:450,easing:'ease-out'}))}
  const remove=()=>{badge.remove();host.classList.remove('gd-score-updated')};
  if(animated&&badge.animate){const animation=badge.animate([{opacity:0,transform:'translateY(3px)',offset:0},{opacity:1,transform:'translateY(0)',offset:.12},{opacity:1,transform:'translateY(0)',offset:.75},{opacity:0,transform:phase?'translateY(0)':'translateY(-5px)',offset:1}],{duration:2600,easing:'ease-out'});animations.push(animation);animation.onfinish=remove}else if(feedback){timers.push(setTimeout(remove,2600))}else remove();
 }
 return()=>{stopMoments();rolls.forEach(stop=>stop());timers.forEach(clearTimeout);animations.forEach(animation=>{animation.onfinish=null;animation.cancel()});badges.forEach(badge=>badge.remove());hosts.forEach(host=>host.classList.remove('gd-score-updated'))};
}
