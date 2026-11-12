import {nflCenterGames} from './nfl-game-center-model.js';
import {footballTeam,footballPlays} from './live-football-model.js';
import {team,teamLogoUrl} from './nfl-teams.js';
import {patchGameDay} from './game-day-dom.js';
import {esc} from './ui.js';
import {replayIcon} from './replay-icons.js';

// Only the matching week's verified board supplies scores. Archived clips
// without that board keep their identities and an honest replay label.
export function replayGameEntries(clips,context){
 const games=context?.nflPayload?nflCenterGames(context.nflPayload,context.season,context.week).filter(g=>g.sides.every(s=>team(s.code))):[],seen=new Set(games.map(g=>g.id));
 for(const clip of clips){if(seen.has(clip.game_id)||!/^\d{1,24}$/.test(clip.game_id))continue;seen.add(clip.game_id);const codes=[...new Set(String(clip.game_label||'').split(/[^A-Za-z]+/).map(footballTeam).filter(code=>team(code)))];games.push({id:clip.game_id,label:clip.game_label,status:'Replay',state:'replay',sides:codes.slice(0,2).map(code=>({code,score:null}))})}
 return games;
}
// Retain only the verified header and highest play id, not a second box score.
export function replayGameObservation(summary){let id='';for(const play of [...footballPlays(summary),...(summary?.scoringPlays||[])]){const next=String(play.id||'');if(/^\d{1,24}$/.test(next)&&(!id||BigInt(next)>BigInt(id)))id=next}return {header:summary?.header,drives:{current:{plays:id?[{id}]:[]}}}}
export function replayGameMarkup(games,selected,{idPrefix='replay-game',compact=false}={}){const index=games.findIndex(g=>g.id===selected);return games.map((game,i)=>`<button type="button" class="replay-game" id="${esc(idPrefix)}-${esc(game.id)}" data-replay-game="${esc(game.id)}" data-replay-neighbor="${i<index?'before':i>index?'after':'current'}" aria-pressed="${game.id===selected}" tabindex="${game.id===selected?0:-1}" aria-label="${esc(game.label)} · ${esc(game.status)}"><span class="replay-game-sides">${game.sides.length?game.sides.map((side,j)=>`${compact&&j===1?`<small>${esc(game.status)}</small>`:''}<span><img src="${esc(teamLogoUrl(side.code))}" alt="" width="20" height="20" decoding="async" onerror="this.hidden=true"><strong${compact?' class="sr-only"':''}>${esc(side.code)}</strong><b>${side.score??'—'}</b></span>`).join(''):`<strong>${esc(game.label)}</strong>`}</span>${compact?'':`<small>${esc(game.status)}</small>`}</button>`).join('')}
export function replayGamesMarkup(games=[],selected='',options={}){const i=games.findIndex(g=>g.id===selected);return `<button type="button" data-replay-step="-1" aria-label="Previous NFL game"${i<=0?' disabled':''}>${replayIcon('chevron-left')}</button><div class="replay-game-track" data-replay-games role="group" aria-label="Choose an NFL game">${replayGameMarkup(games,selected,options)}</div><button type="button" data-replay-step="1" aria-label="Next NFL game"${i<0||i===games.length-1?' disabled':''}>${replayIcon('chevron-right')}</button>`}

// Native scrolling only browses the rail. A game changes on explicit activation.
// Keeping selection separate also prevents score refreshes from pulling it back.
export function mountReplayGames(host,{select,active=()=>true,motion=()=>true,idPrefix='replay-game',compact=false}){
 host.innerHTML=replayGamesMarkup([], '',{idPrefix,compact});
 const track=host.querySelector('[data-replay-games]');let games=[],selected='',key='',moving=false,stopped=false,browsing=false,gesture=null,suppressClick=false;
 const buttons=()=>[...track.querySelectorAll('[data-replay-game]')];
 const scrollTo=(id,smooth)=>{const el=buttons().find(b=>b.dataset.replayGame===id);if(el)track.scrollTo({left:el.offsetLeft-(track.clientWidth-el.offsetWidth)/2,behavior:smooth&&motion()?'smooth':'instant'})};
 const move=(id,focus=false)=>{if(!id||stopped||!active())return;browsing=false;if(id!==selected){moving=true;try{select(id)}finally{moving=false}}if(stopped)return;scrollTo(id,true);if(focus)buttons().find(b=>b.dataset.replayGame===id)?.focus({preventScroll:true})};
 const down=event=>{browsing=true;suppressClick=false;gesture={id:event.pointerId,x:event.clientX,y:event.clientY,left:track.scrollLeft}};
 const drag=event=>{if(gesture?.id===event.pointerId&&(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>8||Math.abs(track.scrollLeft-gesture.left)>8))suppressClick=true};
 const up=event=>{drag(event);gesture=null};
 const cancel=()=>{if(gesture)suppressClick=true;gesture=null};
 const wheel=()=>{browsing=true};
 const click=event=>{const game=event.target.closest('[data-replay-game]'),step=event.target.closest('[data-replay-step]');if(game){if(event.detail&&suppressClick){event.preventDefault();event.stopPropagation();return}move(game.dataset.replayGame)}else if(step)move(games[games.findIndex(g=>g.id===selected)+Number(step.dataset.replayStep)]?.id)};
 const keydown=event=>{
  const target=event.target.closest('[data-replay-game]');if(!target||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||stopped||!active())return;
  event.preventDefault();event.stopPropagation();browsing=true;
  const i=games.findIndex(g=>g.id===target.dataset.replayGame),next=event.key==='Home'?0:event.key==='End'?games.length-1:i+(event.key==='ArrowRight'?1:-1),id=games[next]?.id;
  if(id){for(const b of buttons())b.tabIndex=b.dataset.replayGame===id?0:-1;buttons().find(b=>b.dataset.replayGame===id)?.focus({preventScroll:true});scrollTo(id,true)}
 };
 host.addEventListener('click',click);host.addEventListener('keydown',keydown);track.addEventListener('pointerdown',down,{passive:true});track.addEventListener('pointermove',drag,{passive:true});track.addEventListener('pointerup',up,{passive:true});track.addEventListener('pointercancel',cancel,{passive:true});track.addEventListener('wheel',wheel,{passive:true});
 const resize=new ResizeObserver(()=>{if(!browsing)scrollTo(selected,false)});resize.observe(track);
 return {update(rows,id){
  if(stopped)return;const nextKey=JSON.stringify(rows.map(g=>[g.id,g.status,g.sides])),changed=nextKey!==key,selection=id!==selected,focused=selection?id:track.contains(document.activeElement)?document.activeElement.closest('[data-replay-game]')?.dataset.replayGame:id;
  games=rows;selected=id;key=nextKey;if(changed)patchGameDay(track,replayGameMarkup(rows,id,{idPrefix,compact}));
  const i=games.findIndex(g=>g.id===id);for(const b of buttons()){const index=games.findIndex(g=>g.id===b.dataset.replayGame);b.setAttribute('aria-pressed',String(b.dataset.replayGame===id));b.tabIndex=b.dataset.replayGame===(focused||id)?0:-1;b.dataset.replayNeighbor=index<i?'before':index===i?'current':'after'}
  host.querySelector('[data-replay-step="-1"]').disabled=i<=0;host.querySelector('[data-replay-step="1"]').disabled=i<0||i===games.length-1;
  if(selection){browsing=false;scrollTo(id,moving)}
 },stop(){stopped=true;gesture=null;resize.disconnect();host.removeEventListener('click',click);host.removeEventListener('keydown',keydown);track.removeEventListener('pointerdown',down);track.removeEventListener('pointermove',drag);track.removeEventListener('pointerup',up);track.removeEventListener('pointercancel',cancel);track.removeEventListener('wheel',wheel)}};
}
