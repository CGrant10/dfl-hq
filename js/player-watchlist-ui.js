import {esc,toast} from './ui.js';
import {getMemberId,currentMember} from './members.js';
import {readPlayerWatchlist} from './player-watchlist-data.js';
import {loadRosterCoachSnapshot,clearRosterCoachCache} from './roster-coach-data.js';
import {buildWatchlistRows} from './player-watchlist-model.js';
import {playerIdentity} from './player-presentation.js';
import {ensureStylesheet} from './lazy-css.js';
import {team as nflClub} from './nfl-teams.js';
const date=value=>value?new Date(value).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}):'';
export function watchlistRowHtml(p,rosterId){
 const gain=p.offer?.gains.find(g=>g.week===p.offer.targetWeek)?.gain;
 const link=p.ownerId!=null&&!p.own&&rosterId!=null?`<a class="linkbtn" href="#/trade?team=${encodeURIComponent(rosterId)}&target=${encodeURIComponent(p.id)}&partner=${encodeURIComponent(p.ownerId)}">Explore trade</a>`:p.ownerId==null?`<a class="linkbtn" href="https://sleeper.com/${p.leagueId?'leagues/'+encodeURIComponent(p.leagueId)+'/team':''}" target="_blank" rel="noopener">Open Sleeper</a>`:'';
 return `<li class="player-watch-row">${playerIdentity(p,{interactive:true})}<div class="player-watch-detail"><span>${esc(p.owner)}</span><small>${p.points!=null?esc(p.points.toFixed(1))+' projected · ':''}${p.state==='upcoming'?'Kickoff '+esc(date(p.kickoff)):p.state==='live'?'Game live':p.state==='final'?'Game finished':'Kickoff unconfirmed'}</small>${p.fit?`<b>${esc(p.fit)}${gain!=null?' · +'+esc(gain.toFixed(1))+' lineup pts':''}</b>`:''}${p.offer?`<small>${p.offer.drop?'Drop '+esc(p.offer.drop.name):'Open roster spot · no drop needed'}</small>`:''}</div><div class="player-watch-actions">${link}<button type="button" class="linkbtn" data-watch-remove="${esc(p.id)}" aria-label="Stop watching ${esc(p.name)}">Remove</button></div></li>`;
}
export function mountWatchButton(button,id){
 const memberId=getMemberId();if(!memberId){button.hidden=true;return;}
 let watched=false,known=false;
 const paint=()=>{button.textContent=known?(watched?'Watching · remove':'Watch player'):'Retry watchlist';button.setAttribute('aria-pressed',String(watched));};
 const update=async(action='read')=>{
  button.disabled=true;
  try{const rows=await readPlayerWatchlist({action,player:action==='read'?null:String(id),memberId});if(!button.isConnected||String(getMemberId())!==String(memberId))return;watched=rows.some(r=>r.player_id===String(id));known=true;paint();}
  catch(e){if(button.isConnected){known=false;paint();toast(e.message,true)}}
  finally{if(button.isConnected)button.disabled=false}
 };
 button.textContent='Checking watchlist…';button.onclick=()=>void update(known?(watched?'remove':'add'):'read');void update();
}
export function mountPlayerWatchlist(host,{data,season,week}){
 const memberId=getMemberId(),member=currentMember();if(!memberId)return ()=>{};
 let snapshot=null,saved=[],items=[],busy=false,stopped=false,generation=0;
 const current=()=>!stopped&&host.isConnected&&String(getMemberId())===String(memberId);
 const ownRoster=()=>snapshot?.rosters.find(r=>String(r.owner_id)===String(member?.sleeper_user_id));
 void ensureStylesheet('css/player-watchlist.css');
 host.innerHTML='<section class="wo-panel player-watchlist" aria-label="Your player watchlist"><header class="wo-head"><div><small>YOUR RADAR</small><h2>Player watchlist</h2></div><button type="button" class="linkbtn" data-watch-refresh>Refresh</button></header><form class="player-watch-search"><label for="player-watch-search">Find a player to watch</label><input id="player-watch-search" type="search" autocomplete="off" placeholder="Player name or NFL team"><div data-watch-search-results></div></form><p role="status" data-watch-message>Loading your watchlist…</p><ul data-watch-rows></ul><footer><small>Saved for your member on this device · up to 20 players. Drop and injury alerts use your Waivers notification setting.</small></footer></section>';
 const message=host.querySelector('[data-watch-message]'),list=host.querySelector('[data-watch-rows]'),search=host.querySelector('input'),results=host.querySelector('[data-watch-search-results]');
 const draw=()=>{
  const mine=ownRoster();
  items=snapshot?buildWatchlistRows(saved.map(r=>r.player_id),snapshot,{rosterId:mine?.roster_id,values:data.pool}):[];
  list.innerHTML=items.map(p=>watchlistRowHtml(p,mine?.roster_id)).join('');
  message.textContent=saved.length?`${saved.length} watched${mine?' · roster fit for '+(data.teams.find(t=>String(t.id)===String(mine.roster_id))?.team_name||'your team'):''}`:'Your radar is empty. Find a player above or tap Watch player on a player card.';
  find();
 };
 const find=()=>{
  const query=search.value.trim().toLowerCase();
  if(!query||!snapshot){results.innerHTML='';return;}
  const words=query.split(/\s+/),ids=new Set(saved.map(r=>r.player_id));
  const matches=Object.entries(snapshot.players).filter(([id,p])=>['QB','RB','WR','TE','K','DEF'].includes(p.p)&&nflClub(p.t)&&words.every(w=>`${p.n} ${p.t} ${p.p}`.toLowerCase().includes(w))).slice(0,8);
  results.innerHTML=matches.length?matches.map(([id,p])=>`<button type="button" class="player-watch-result" data-watch-add="${esc(id)}" ${ids.has(id)?'disabled':''}><span>${esc(p.n)}<small>${esc(p.p)} · ${esc(p.t||'No NFL team')}</small></span><b>${ids.has(id)?'Watching':'+ Watch'}</b></button>`).join(''):'<p>No matching players.</p>';
 };
 const load=async(force=false)=>{
  if(!current()||busy)return;busy=true;const token=++generation;host.querySelector('[data-watch-refresh]').disabled=true;
  try{
   if(force)clearRosterCoachCache();
   const [savedRows,fresh]=await Promise.all([readPlayerWatchlist({memberId}),loadRosterCoachSnapshot(data.league.sleeper_league_id,season,week)]);
   if(!current()||token!==generation)return;saved=savedRows;snapshot=fresh;draw();
  }catch(e){if(current()){message.textContent='Watchlist couldn’t refresh. '+(list.children.length?'Showing the last check.':'Tap Refresh to retry.');toast(e.message,true)}}
  finally{busy=false;if(current())host.querySelector('[data-watch-refresh]').disabled=false}
 };
 const change=e=>{if(String(e.detail?.memberId)===String(memberId))void load();};
 host.querySelector('form').addEventListener('submit',e=>e.preventDefault());search.addEventListener('input',find);
 host.addEventListener('click',async e=>{
  const button=e.target.closest('[data-watch-add],[data-watch-remove]');
  if(e.target.closest('[data-watch-refresh]')){void load(true);return;}
  if(!button||busy||!current())return;busy=true;button.disabled=true;
  try{
   saved=await readPlayerWatchlist({action:button.hasAttribute('data-watch-add')?'add':'remove',player:button.dataset.watchAdd||button.dataset.watchRemove,memberId});
   if(current()){if(button.hasAttribute('data-watch-add'))search.value='';draw();(button.hasAttribute('data-watch-add')?search:host.querySelector('[data-watch-refresh]')).focus({preventScroll:true})}
  }catch(error){if(current()){toast(error.message,true);button.disabled=false}}
  finally{busy=false}
 });
 globalThis.addEventListener('dfl:watchlist-change',change);void load();
 return ()=>{stopped=true;generation++;globalThis.removeEventListener('dfl:watchlist-change',change)};
}
