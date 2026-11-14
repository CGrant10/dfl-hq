import {esc} from './ui.js';
import {automaticTradePlayer} from './player-availability.js';
import {normalizeReceivePositions} from './trade-receive-controls.js';
const key=(member,season,team)=>`dfl.trade.watch.v1.${member||'guest'}.${season}.${team}`;
export function readTradeWatch(member,season,team,storage){
 try{const row=JSON.parse((storage||globalThis.localStorage).getItem(key(member,season,team))||'null');return {targets:[...new Set((Array.isArray(row?.targets)?row.targets:[]).filter(id=>typeof id==='string'))].slice(0,12),positions:normalizeReceivePositions(row?.positions)}}catch{return {targets:[],positions:normalizeReceivePositions()}}
}
export function writeTradeWatch(member,season,team,value,storage){try{(storage||globalThis.localStorage).setItem(key(member,season,team),JSON.stringify({targets:[...new Set(value.targets.map(String))].slice(0,12),positions:normalizeReceivePositions(value.positions)}));return true}catch{return false}}
export function watchedTradeTargets(ids,teams,pool,mine){
 return ids.map(id=>{const player=pool.get(id),owner=teams.find(t=>(t.playerIds||[]).map(String).includes(id));return {id,player,owner,status:!player?'Unavailable':!owner?'Free agent':String(owner.id)===String(mine)?'On your roster':!automaticTradePlayer(player)?'Injury / availability':'Watching'}});
}
export function tradeWatchMarkup(state,teams,pool,mine,{open=false}={}){
 const rows=watchedTradeTargets(state.targets,teams,pool,mine);
 return `<details class="trade-watch" data-page-detail="trade-targets"${open?' open':''}><summary><span>Targets</span><b>${rows.length}</b></summary><div class="trade-watch-body"><label class="trade-watch-search"><span class="sr-only">Find a player to watch</span><input type="search" data-tw-search aria-controls="trade-watch-results" placeholder="Find a player to watch" autocomplete="off" maxlength="80"></label><ul id="trade-watch-results" data-tw-results aria-label="Matching players"></ul><ul class="trade-watch-list">${rows.map(r=>`<li><div><strong>${esc(r.player?.name||r.id)}</strong><small>${esc([r.player?.position,r.owner?.team_name||r.owner?.ownerName,r.player?.outForSeason?'Out for season':r.status].filter(Boolean).join(' · '))}</small></div>${r.status==='Watching'?`<button type="button" data-tw-shop="${esc(r.id)}" data-tw-owner="${esc(r.owner.id)}">Find offers</button>`:''}<button type="button" data-tw-remove="${esc(r.id)}" aria-label="Stop watching ${esc(r.player?.name||r.id)}">×</button></li>`).join('')||'<li class="trade-watch-empty">Keep your trade targets here.</li>'}</ul><p class="sr-only" data-tw-status role="status"></p></div></details>`;
}
export function tradeWatchSearch(query,teams,pool,mine,watched=[]){
 const q=String(query).trim().toLowerCase();if(q.length<2)return [];
 const owned=new Set(teams.filter(t=>String(t.id)!==String(mine)).flatMap(t=>t.playerIds||[]).map(String));
 return [...pool.values()].filter(p=>owned.has(String(p.id))&&!watched.includes(String(p.id))&&['QB','RB','WR','TE'].includes(p.position)&&p.name?.toLowerCase().includes(q)).sort((a,b)=>(Number(b.tradeValue)||0)-(Number(a.tradeValue)||0)).slice(0,6);
}
