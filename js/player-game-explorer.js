import {playerGameHeadline} from './player-card-summary.js';
import {esc} from './ui.js';
import {playerFormHtml} from './player-form.js';
import {playerGame,playerGameGroups,playerGameShareSpec} from './player-game-model.js';
import {thermalScore,playerScoreTemperature} from './score-temperature.js';
import {animateUi,cancelUiMotion} from './ui-motion.js';
import {patchGameDay} from './game-day-dom.js';

export function playerGameDetailsHtml(game){
 if(!game)return '<p class="player-card-empty">Game stats unavailable.</p>';
 const groups=playerGameGroups(game);
 return `<header class="player-game-heading"><h3>Week ${game.week}${game.opponent?` · vs ${esc(game.opponent)}`:''} box score</h3><button type="button" class="linkbtn" data-player-game-share${game.points===null||game.state==='Yet to play'?' disabled':''}>Share performance</button></header>${groups.length?groups.map((g,i)=>`<section class="player-game-group"><button type="button" data-player-stat-group="${i}" aria-expanded="false" aria-controls="player-game-stats-${i}"><strong>${esc(g.label)}</strong><span>${esc(g.items.find(s=>/_yd$/.test(s.key))?g.items.find(s=>/_yd$/.test(s.key)).value+' yd':g.items[0].value+' '+g.items[0].label.toLowerCase())} <i aria-hidden="true">+</i></span></button><div id="player-game-stats-${i}" class="player-game-stat-body" hidden><dl class="gameday-stat-grid">${g.items.map(s=>`<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('')}</dl></div></section>`).join(''):'<p class="player-card-empty">Game stats unavailable.</p>'}<span class="sr-only" role="status" data-player-game-announcement></span>`;
}

export function mountPlayerGameExplorer(root,model,{initialWeek,getMotion=()=>true,onShare=(_spec)=>{}}={}){
 let selected=Number(initialWeek??model.week),stopped=false,pointer=null,revision=0,lastDetails='';const moving=new Set(),listeners=new AbortController();
 const weeks=()=>[...model.recent||[]].sort((a,b)=>a.week-b.week);
 if(!playerGame(model,selected))selected=Number(weeks().at(-1)?.week)||selected;
 const cancelGroups=()=>{revision++;for(const panel of moving){cancelUiMotion(panel);panel.style.removeProperty('height');panel.style.removeProperty('overflow');panel.hidden=panel.previousElementSibling.getAttribute('aria-expanded')!=='true'}moving.clear()};
 const paint=(announce=false)=>{
  const game=playerGame(model,selected),index=weeks().findIndex(w=>Number(w.week)===selected),slider=root.querySelector('.player-game-scrub');
  if(slider){slider.setAttribute('aria-valuenow',String(index+1));slider.setAttribute('aria-valuetext',game?`Week ${game.week}, ${game.points===null?'score unavailable':game.points.toFixed(2)+' points'}${game.opponent?', versus '+game.opponent:''}`:'Game unavailable');slider.style.setProperty('--player-game-index',index);}
  for(const button of root.querySelectorAll('[data-player-game-week]'))button.setAttribute('aria-pressed',String(Number(button.dataset.playerGameWeek)===selected));
  for(const [i,dot]of [...root.querySelectorAll('.player-form-dot')].entries())dot.classList.toggle('is-selected',Number(weeks().filter(w=>typeof w.points==='number'&&Number.isFinite(w.points))[i]?.week)===selected);
  const score=root.querySelector('.gameday-spotlight-score > span'),status=root.querySelector('.gameday-spotlight-score > span:last-child');
  if(score&&game){const stamp=JSON.stringify([game.week,game.points,game.state]);if(score.dataset.scoreStamp!==stamp){score.innerHTML=`${thermalScore(game.points,playerScoreTemperature({...model.player,points:game.points,state:game.current?model.state:game.points!==null&&game.opponent?'final':'unknown',afterHalftime:model.afterHalftime}),{tag:'strong'})}<small>Fantasy points</small>`;score.dataset.scoreStamp=stamp}status.textContent=`${game.state} · Week ${game.week}`;}
  const line=root.querySelector('[data-player-game-line]');if(line){const text=playerGameHeadline(game,model.player.position);if(line.textContent!==text)line.textContent=text;line.hidden=!text;}
  const time=root.querySelector('.gameday-stat-time');if(time){const at=game?.stats?.updatedAt;time.hidden=!at;if(at){time.dateTime=new Date(at).toISOString();time.textContent='Stats · '+new Date(at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});}}
  const host=root.querySelector('[data-player-game-details]');if(host){const stamp=JSON.stringify([game?.week,game?.opponent,game?.stats,game?.rawStats,game?.points===null||game?.state==='Yet to play']);if(stamp!==lastDetails){cancelGroups();patchGameDay(host,playerGameDetailsHtml(game));lastDetails=stamp;}if(announce)host.querySelector('[data-player-game-announcement]').textContent=slider?.getAttribute('aria-valuetext')||'';}
 };
 const select=week=>{if(week==null||Number(week)===selected||!playerGame(model,week))return;selected=Number(week);paint(true)};
 const at=x=>{const slider=root.querySelector('.player-game-scrub'),box=slider.getBoundingClientRect(),rows=weeks();return rows[Math.max(0,Math.min(rows.length-1,Math.floor((x-box.left)/Math.max(1,box.width)*rows.length)))]?.week};
 const toggle=button=>{
  const panel=button.nextElementSibling,opening=button.getAttribute('aria-expanded')!=='true',height=panel.hidden?0:panel.getBoundingClientRect().height,token=revision;
  cancelUiMotion(panel);button.setAttribute('aria-expanded',String(opening));panel.hidden=false;panel.style.height=`${height}px`;panel.style.overflow='hidden';
  const finish=()=>{if(stopped||token!==revision||!panel.isConnected)return;panel.hidden=button.getAttribute('aria-expanded')!=='true';panel.style.removeProperty('height');panel.style.removeProperty('overflow');moving.delete(panel)};
  const animation=animateUi(panel,[{height:`${height}px`},{height:`${opening?panel.scrollHeight:0}px`}],{duration:220,motion:getMotion()});moving.add(panel);if(animation)animation.finished.then(finish,()=>{});else finish();
 };
 const options={signal:listeners.signal};
 root.addEventListener('click',async event=>{
  const week=event.target.closest('[data-player-game-week]');if(week){select(week.dataset.playerGameWeek);return}
  const group=event.target.closest('[data-player-stat-group]');if(group){toggle(group);return}
  const share=event.target.closest('[data-player-game-share]');if(!share||share.disabled)return;
  const spec=playerGameShareSpec(model,playerGame(model,selected));if(!spec)return;share.disabled=true;share.setAttribute('aria-busy','true');try{await onShare(spec)}finally{if(!stopped&&share.isConnected){share.disabled=false;share.removeAttribute('aria-busy')}};
 },options);
 root.addEventListener('pointerdown',event=>{if(!event.target.closest('.player-game-scrub')||event.isPrimary===false||event.button!==0)return;pointer={id:event.pointerId,x:event.clientX,y:event.clientY,drag:false,vertical:false}},options);
 root.addEventListener('pointermove',event=>{if(pointer?.id!==event.pointerId||pointer.vertical)return;const dx=Math.abs(event.clientX-pointer.x),dy=Math.abs(event.clientY-pointer.y);if(!pointer.drag){if(dy>8&&dy>dx){pointer.vertical=true;return}if(dx<8||dx<dy*1.2)return;pointer.drag=true;root.setPointerCapture(event.pointerId)}event.preventDefault();select(at(event.clientX))},{...options,passive:false});
 root.addEventListener('pointerup',event=>{if(pointer?.id!==event.pointerId)return;if(!pointer.vertical)select(at(event.clientX));if(root.hasPointerCapture(event.pointerId))root.releasePointerCapture(event.pointerId);pointer=null},options);
 root.addEventListener('pointercancel',()=>{pointer=null},options);
 root.addEventListener('keydown',event=>{if(!event.target.matches('.player-game-scrub')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const rows=weeks(),i=rows.findIndex(w=>Number(w.week)===selected);select(rows[event.key==='Home'?0:event.key==='End'?rows.length-1:Math.max(0,Math.min(rows.length-1,i+(event.key==='ArrowRight'?1:-1)))]?.week)},options);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');reduced.addEventListener('change',cancelGroups,options);window.addEventListener('dfl:ui-motion-change',cancelGroups,options);
 paint();
 return {get selectedWeek(){return selected},update(context){if(stopped||Number(context.week)!==Number(model.week)||context.season!=null&&Number(context.season)!==Number(model.season))return;if(model.points===context.points&&model.state===context.state&&model.afterHalftime===context.afterHalftime)return;model.points=context.points;model.state=context.state;model.afterHalftime=context.afterHalftime;model.recent=(model.recent||[]).map(w=>Number(w.week)===Number(model.week)?{...w,points:context.points}:w);patchGameDay(root.querySelector('[data-player-game-chart]'),playerFormHtml(model,{interactive:true}));paint()},stop(){stopped=true;cancelGroups();listeners.abort();if(pointer&&root.hasPointerCapture(pointer.id))root.releasePointerCapture(pointer.id);pointer=null}};
}
