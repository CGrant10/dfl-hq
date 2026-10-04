const numeric = value => value != null && Number.isFinite(Number(value)) ? Number(value) : null;
export function scoreChange(before, after) {
 const from=numeric(before),to=numeric(after);
 if(from==null||to==null)return null;
 const delta=Math.round((to-from)*100)/100;
 return delta===0?null:{from,to,delta,label:`${delta>0?'+':'−'}${Math.abs(delta).toFixed(2)}`};
}
// Animate only successful refreshes, never initial loads or tab changes.
export function animateScoreChanges(root,{previous,model,motion,gameId=null}){
 const animations=[],badges=[],hosts=[];
 if(!motion||matchMedia('(prefers-reduced-motion: reduce)').matches)return()=>{};
 for(const host of root.querySelectorAll('[data-gameday-score-key]')){
  const key=host.dataset.gamedayScoreKey,change=scoreChange(previous?.points?.[key],model.snapshot.points[key]);
  if(!change)continue;
  const badge=document.createElement('span');badge.className=`gd-score-delta${change.delta<0?' is-negative':''}`;badge.textContent=change.label;badge.setAttribute('aria-hidden','true');host.append(badge);host.classList.add('gd-score-updated');badges.push(badge);hosts.push(host);
  // Keep glyph geometry fixed so the GPU fire remains aligned with the number.
  const value=host.querySelector('.gd-thermal-value');
  if(value?.animate)animations.push(value.animate([{opacity:.55},{opacity:1}],{duration:450,easing:'ease-out'}));
  if(badge.animate){const animation=badge.animate([{opacity:0,transform:'translateY(3px)',offset:0},{opacity:1,transform:'translateY(0)',offset:.12},{opacity:1,transform:'translateY(0)',offset:.75},{opacity:0,transform:'translateY(-5px)',offset:1}],{duration:2600,easing:'ease-out'});animations.push(animation);animation.onfinish=()=>{badge.remove();host.classList.remove('gd-score-updated')}}else{badge.remove();host.classList.remove('gd-score-updated')};
 }
 const game=model.games.find(g=>gameId?g.id===gameId:g.isMine),old=game&&previous?.leaders?.[game.id];
 if(old&&game.leader&&old!==game.leader){
  const team=root.querySelector(`[data-gameday-team="${CSS.escape(game.leader)}"]`);
  if(team?.animate)animations.push(team.animate([{backgroundColor:getComputedStyle(team).getPropertyValue('--accent-soft').trim()||'rgba(239,201,76,.12)'},{backgroundColor:'transparent'}],{duration:1000,easing:'ease-out'}));
  if(team?.animate){
   const ring=document.createElement('span');ring.className='gd-lead-ring';ring.setAttribute('aria-hidden','true');team.append(ring);badges.push(ring);
   const ripple=ring.animate([{opacity:.65,transform:'scale(.96)'},{opacity:0,transform:'scale(1.04)'}],{duration:1200,easing:'ease-out'});animations.push(ripple);ripple.onfinish=()=>ring.remove();
   const label=document.createElement('span');label.className='gd-lead-celebration';label.textContent='New lead';label.setAttribute('aria-hidden','true');team.append(label);badges.push(label);
   const hold=label.animate([{opacity:0,offset:0},{opacity:1,offset:.1},{opacity:1,offset:.8},{opacity:0,offset:1}],{duration:3500});animations.push(hold);hold.onfinish=()=>label.remove();
  }
 }
 return()=>{animations.forEach(animation=>{animation.onfinish=null;animation.cancel()});badges.forEach(badge=>badge.remove());hosts.forEach(host=>host.classList.remove('gd-score-updated'))};
}
