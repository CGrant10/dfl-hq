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
export function replayGameMarkup(games,selected){const index=games.findIndex(g=>g.id===selected);return games.map((game,i)=>`<button type="button" class="replay-game" id="replay-game-${esc(game.id)}" data-replay-game="${esc(game.id)}" data-replay-neighbor="${i<index?'before':i>index?'after':'current'}" aria-pressed="${game.id===selected}" tabindex="${game.id===selected?0:-1}" aria-label="${esc(game.label)} · ${esc(game.status)}"><span class="replay-game-sides">${game.sides.length?game.sides.map(side=>`<span><img src="${esc(teamLogoUrl(side.code))}" alt="" width="20" height="20" decoding="async" onerror="this.hidden=true"><strong>${esc(side.code)}</strong><b>${side.score??'—'}</b></span>`).join(''):`<strong>${esc(game.label)}</strong>`}</span><small>${esc(game.status)}</small></button>`).join('')}

// Native snap scrolling follows a finger without moving or cloning the video.
// Commit once the strip settles; controls and reduced motion use the same path.
export function mountReplayGames(host,{select,active=()=>true,motion=()=>true}){
 host.innerHTML=`<button type="button" data-replay-step="-1" aria-label="Previous NFL game">${replayIcon('chevron-left')}</button><div class="replay-game-track" data-replay-games role="group" aria-label="Choose an NFL game"></div><button type="button" data-replay-step="1" aria-label="Next NFL game">${replayIcon('chevron-right')}</button>`;
 const track=host.querySelector('[data-replay-games]');let games=[],selected='',key='',timer=0,aligning=false,interacting=false,moving=false,stopped=false;
 const buttons=()=>[...track.querySelectorAll('[data-replay-game]')];
 const scrollTo=(id,smooth)=>{const el=buttons().find(b=>b.dataset.replayGame===id);if(!el)return;aligning=true;track.scrollTo({left:el.offsetLeft-(track.clientWidth-el.offsetWidth)/2,behavior:smooth&&motion()?'smooth':'instant'})};
 const move=(id,focus=false)=>{if(!id||!active()||id===selected)return;moving=true;try{select(id)}finally{moving=false}if(stopped)return;if(focus)buttons().find(b=>b.dataset.replayGame===id)?.focus({preventScroll:true})};
 const settle=()=>{clearTimeout(timer);if(stopped||!active()||!track.clientWidth||aligning)return;const center=track.scrollLeft+track.clientWidth/2,nearest=buttons().reduce((best,b)=>Math.abs(b.offsetLeft+b.offsetWidth/2-center)<Math.abs(best.offsetLeft+best.offsetWidth/2-center)?b:best,buttons()[0]);interacting=false;if(nearest){move(nearest.dataset.replayGame);scrollTo(nearest.dataset.replayGame,true)}};
 const scroll=()=>{clearTimeout(timer);timer=setTimeout(settle,140)};
 const touch=()=>{aligning=false;interacting=true};
 const click=event=>{const game=event.target.closest('[data-replay-game]'),step=event.target.closest('[data-replay-step]');if(game){move(game.dataset.replayGame);scrollTo(game.dataset.replayGame,true)}else if(step)move(games[games.findIndex(g=>g.id===selected)+Number(step.dataset.replayStep)]?.id)};
 const keydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const i=games.findIndex(g=>g.id===selected),next=event.key==='Home'?0:event.key==='End'?games.length-1:i+(event.key==='ArrowRight'?1:-1);move(games[next]?.id,true)};
 host.addEventListener('click',click);host.addEventListener('keydown',keydown);track.addEventListener('scroll',scroll,{passive:true});track.addEventListener('scrollend',settle);track.addEventListener('pointerdown',touch,{passive:true});track.addEventListener('wheel',touch,{passive:true});
 const resize=new ResizeObserver(()=>scrollTo(selected,false));resize.observe(track);
 return {update(rows,id){const nextKey=JSON.stringify(rows.map(g=>[g.id,g.status,g.sides]));const changed=nextKey!==key,selection=id!==selected;games=rows;selected=id;key=nextKey;if(changed)patchGameDay(track,replayGameMarkup(rows,id));else for(const b of buttons()){b.setAttribute('aria-pressed',String(b.dataset.replayGame===id));b.tabIndex=b.dataset.replayGame===id?0:-1;b.dataset.replayNeighbor=games.findIndex(g=>g.id===b.dataset.replayGame)<games.findIndex(g=>g.id===id)?'before':b.dataset.replayGame===id?'current':'after'}const i=games.findIndex(g=>g.id===id);host.querySelector('[data-replay-step="-1"]').disabled=i<=0;host.querySelector('[data-replay-step="1"]').disabled=i<0||i===games.length-1;if(selection||changed&&!interacting)scrollTo(id,moving)},stop(){stopped=true;clearTimeout(timer);resize.disconnect();host.removeEventListener('click',click);host.removeEventListener('keydown',keydown);track.removeEventListener('scroll',scroll);track.removeEventListener('scrollend',settle);track.removeEventListener('pointerdown',touch);track.removeEventListener('wheel',touch)}};
}
