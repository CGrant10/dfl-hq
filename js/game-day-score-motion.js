import { animateGameDayMoments } from './game-day-moment-effects.js';
const numeric = value => value != null && Number.isFinite(Number(value)) ? Number(value) : null;
export function scoreChange(before, after) {
 const from=numeric(before),to=numeric(after);
 if(from==null||to==null)return null;
 const delta=Math.round((to-from)*100)/100;
 return delta===0?null:{from,to,delta,label:`${delta>0?'+':'−'}${Math.abs(delta).toFixed(2)}`};
}
// Animate only successful refreshes, never initial loads or tab changes.
export function animateScoreChanges(root,{previous,model,motion,gameId=null,feedback=false}){
 const animations=[],badges=[],hosts=[],timers=[];
 const animated=motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!animated&&!feedback)return()=>{};
 const stopMoments=animated?animateGameDayMoments(root,{previous,model,gameId}):()=>{};
 for(const host of root.querySelectorAll('[data-gameday-score-key],[data-gameday-total-key]')){
  const total=host.dataset.gamedayTotalKey,key=total??host.dataset.gamedayScoreKey,change=scoreChange(total!=null?previous?.totals?.[key]:previous?.points?.[key],total!=null?model.snapshot.totals?.[key]:model.snapshot.points[key]);
  if(!change)continue;
  const badge=document.createElement('span');badge.className=`gd-score-delta${change.delta<0?' is-negative':''}`;badge.textContent=change.label;badge.setAttribute('aria-hidden','true');host.append(badge);host.classList.add('gd-score-updated');badges.push(badge);hosts.push(host);
  // Keep glyph geometry fixed so the GPU fire remains aligned with the number.
  const value=host.querySelector('.gd-thermal-value,[data-matchup-score-value]');
  if(animated&&value?.animate)animations.push(value.animate([{opacity:.55},{opacity:1}],{duration:450,easing:'ease-out'}));
  const remove=()=>{badge.remove();host.classList.remove('gd-score-updated')};
  if(animated&&badge.animate){const animation=badge.animate([{opacity:0,transform:'translateY(3px)',offset:0},{opacity:1,transform:'translateY(0)',offset:.12},{opacity:1,transform:'translateY(0)',offset:.75},{opacity:0,transform:'translateY(-5px)',offset:1}],{duration:2600,easing:'ease-out'});animations.push(animation);animation.onfinish=remove}else if(feedback){timers.push(setTimeout(remove,2600))}else remove();
 }
 return()=>{stopMoments();timers.forEach(clearTimeout);animations.forEach(animation=>{animation.onfinish=null;animation.cancel()});badges.forEach(badge=>badge.remove());hosts.forEach(host=>host.classList.remove('gd-score-updated'))};
}
