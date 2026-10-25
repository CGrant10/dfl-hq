import {patchGameDay} from './game-day-dom.js';
import {footballGame,redZoneGames,liveStarterEvents,LIVE_FEED_AGE} from './live-football-model.js';
import {loadLiveFootball} from './live-football-data.js';
import {playerPortrait} from './player-presentation.js';
import {esc} from './ui.js';
import {animateUi,cancelUiMotion} from './ui-motion.js';
import {team} from './nfl-teams.js';

// Shared across Home, its watch dialog and Clubhouse. This also prevents a
// just-seen play from celebrating again after navigating to another live view.
const seen=new Set();
let toastOwner=null;
export function primeFootballEvents(events){for(const event of events)seen.add(event.key);while(seen.size>400)seen.delete(seen.values().next().value)}
const age=at=>{const seconds=Math.max(0,Math.floor((Date.now()-at)/1000));return seconds<60?`${seconds}s ago`:`${Math.floor(seconds/60)}m ago`};
export function redZoneMarkup(games,{compact=false,expanded=false}={}){
 if(!games.length)return '';
 return `<section class="nfl-red-watch" aria-label="Red Zone Watch"><header><strong><i aria-hidden="true"></i>Red Zone Watch</strong><button type="button" class="linkbtn" data-red-expand aria-expanded="${expanded}">${expanded?'Close':`Live plays${compact&&games.length>2?' ('+games.length+')':''}`} <span aria-hidden="true">${expanded?'−':'+'}</span></button></header><div class="nfl-red-games">${games.slice(0,compact&&!expanded?2:games.length).map(game=>{
  const club=team(game.offense),style=club?` style="--nfl-team:${esc(club.primary)}"`:'';
  return `<article class="nfl-red-game" data-nfl-game="${esc(game.id)}"${style}><div class="nfl-red-identities">${game.players.slice(0,compact?2:4).map(p=>`<button type="button" data-player-card="${esc(p.id)}" aria-label="View ${esc(p.name)} player card">${playerPortrait(p)}<span>${esc(p.name)}${compact?'':`<small>${esc(p.owner)}</small>`}</span></button>`).join('')}</div><div class="nfl-red-situation"><b>${esc(game.offense)} on offense</b><span>${esc(game.down)}${game.field?' · '+esc(game.field):''}</span><span>${game.period?game.period>4?'OT':`Q${game.period}`:''}${game.clock?' · '+esc(game.clock):''}</span></div><div class="nfl-red-detail"${expanded?'':' hidden'}><div class="nfl-mini-field" role="img" aria-label="${esc(game.offense)} offense, ${game.goal} yards to the end zone"><span>OWN 20</span><span>50</span><span>OPP 20</span><i style="--ball-position:${Math.max(0,Math.min(100,100-game.goal))}%" aria-hidden="true"></i></div>${game.lastPlay?`<p>${esc(game.lastPlay)}</p>`:''}<time datetime="${new Date(game.fetchedAt).toISOString()}">Checked ${age(game.fetchedAt)}</time></div></article>`;
 }).join('')}</div></section>`;
}
export function mountLiveFootball(root,{getModel,getHost,getGameId=()=>null,getMotion=()=>true,active=()=>true,compact=false,ownOnly=false,load=loadLiveFootball}={}){
 let stopped=false,request=0,feeds=[],initialized=false,startedAt=Date.now(),scope='',expanded=false,host=null,priorPanel=null,lastHtml='',timer=0,toast=null;const rowEffects=new Map();
 const bindings=new AbortController(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const motion=()=>getMotion()&&!reduced.matches&&document.documentElement.dataset.uiMotion!=='off';
 const current=()=>{const liveDialog=document.querySelector('.gameday-watch[open]');return !stopped&&root.isConnected&&active()&&document.visibilityState==='visible'&&(!liveDialog||root===liveDialog||root.closest('dialog')===liveDialog)};
 const clearToast=()=>{clearTimeout(timer);timer=0;if(toast){cancelUiMotion(toast);toast.remove();toast=null}if(toastOwner===clearToast)toastOwner=null};
 const clearEffects=()=>{clearToast();for(const [node,timeout]of rowEffects){clearTimeout(timeout);delete node.dataset.nflPlay;cancelUiMotion(node.querySelector('.dfl-player-portrait'))}rowEffects.clear()};
 const pause=()=>{clearEffects();initialized=false;startedAt=Date.now()};
 function showPlay(event){
  if(!current())return;
  for(const player of event.players){
   for(const row of root.querySelectorAll(`[data-gameday-row="${CSS.escape(`${player.roster}:${player.id}`)}"]`)){
    if(row.getBoundingClientRect().height===0)continue;
    if(rowEffects.has(row))clearTimeout(rowEffects.get(row));row.dataset.nflPlay=event.kind;
    animateUi(row.querySelector('.dfl-player-portrait'),[{transform:'translateY(0) scale(1)'},{transform:'translateY(-3px) scale(1.08)',offset:.42},{transform:'translateY(0) scale(1)'}],{duration:700,motion:motion()});
    rowEffects.set(row,setTimeout(()=>{delete row.dataset.nflPlay;rowEffects.delete(row)},1600));
   }
  }
  if(!event.players.some(p=>p.isMine))return;
  toastOwner?.();clearToast();toastOwner=clearToast;
  const owned=event.players.filter(p=>p.isMine),player=owned[0],passing=owned.every(p=>p.role==='passer'),label=event.kind==='touchdown'?(passing?'TD PASS':'TOUCHDOWN'):`${event.yards}-YD ${passing?'PASS':owned.some(p=>p.role==='receiver')?'RECEPTION':'RUN'}`;
  toast=document.createElement('section');toast.className='nfl-play-toast';toast.dataset.kind=event.kind;toast.setAttribute('aria-label','New live player moment');toast.dataset.motion=motion()?'on':'off';
  const club=team(player.nflTeam);if(club)toast.style.setProperty('--nfl-team',club.primary);
  toast.innerHTML=`<button type="button" class="nfl-toast-player" data-player-card="${esc(player.id)}" aria-label="View ${esc(player.name)} player card">${playerPortrait(player)}<span><strong>${esc(label)}</strong><b>${esc(event.players.filter(p=>p.isMine).map(p=>p.name).join(' + '))}</b></span></button><button type="button" class="linkbtn nfl-toast-close" aria-label="Dismiss player moment">×</button><p>${esc(event.text)}</p>`;
  toast.querySelector('.nfl-toast-close').onclick=clearToast;(document.activeElement?.closest('dialog[open]')||[...document.querySelectorAll('dialog[open]')].at(-1)||document.body).append(toast);
  animateUi(toast,[{opacity:0,transform:'translateY(12px) scale(.98)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:260,motion:motion()});
  const announcement=root.querySelector('[data-football-announcement]');if(announcement)announcement.textContent=`${label}. ${event.players.filter(p=>p.isMine).map(p=>p.name).join(' and ')}. ${event.text}`;
  timer=setTimeout(clearToast,5500);
 }
 function merged(model){
  const raw=model.nflPayload?.events;if(!raw)return feeds;
  const byId=new Map(feeds.map(feed=>[String(feed.game_id),feed]));
  for(const event of raw){const snapshot=footballGame(event,model);if(snapshot)byId.set(snapshot.id,{...byId.get(snapshot.id),game_id:snapshot.id,season:model.season,week:model.week,snapshot,snapshot_at:model.nflFetchedAt||model.checkedAt,fetched_at:byId.get(snapshot.id)?.fetched_at,plays:byId.get(snapshot.id)?.plays||[]})}
  return [...byId.values()];
 }
 function paint(){
  if(!current())return;root.dataset.footballMotion=motion()?'on':'off';const model=getModel();if(!model)return;
  const available=merged(model),zones=redZoneGames(available,model,{gameId:getGameId(),ownOnly});
  const nextHost=getHost?.();if(!nextHost)return;
  if(host!==nextHost){host=nextHost;lastHtml=''}
  let panel=host.querySelector(':scope > [data-football-panel]');if(!panel){panel=document.createElement('div');panel.dataset.footballPanel='';host.prepend(panel)}
  if(panel!==priorPanel){priorPanel=panel;lastHtml=''}
  const html=redZoneMarkup(zones,{compact,expanded});if(html!==lastHtml){const focused=panel.contains(document.activeElement);patchGameDay(panel,html);lastHtml=html;if(focused)panel.querySelector('[data-red-expand]')?.focus({preventScroll:true})}panel.hidden=!html;
  const marked=new Set(zones.flatMap(game=>game.players.map(p=>`${p.roster}:${p.id}`)));
  for(const row of root.querySelectorAll('[data-gameday-row]')){
   const key=row.dataset.gamedayRow,exists=row.querySelector('[data-red-zone-badge]');
   if(!marked.has(key)){exists?.remove();continue}
   if(!exists){const badge=document.createElement('span');badge.dataset.redZoneBadge='';badge.className='nfl-red-badge';badge.textContent='RED ZONE';badge.setAttribute('aria-label','NFL offense in the red zone');row.querySelector('.gameday-player-score')?.append(badge)}
  }
  let announcement=root.querySelector('[data-football-announcement]');if(!announcement){announcement=document.createElement('span');announcement.className='sr-only';announcement.dataset.footballAnnouncement='';announcement.setAttribute('role','status');root.append(announcement)}
  const events=liveStarterEvents(feeds,model,{gameId:getGameId(),ownOnly});
  if(!initialized){initialized=true;startedAt=Date.now();primeFootballEvents(events);return}
  const fresh=events.filter(event=>event.at>=startedAt&&!seen.has(event.key));primeFootballEvents(events);
  // Coalesce one poll into the strongest moment. No backlog of overlapping
  // sheets or celebrations when several starters score in the same minute.
  const chosen=fresh.sort((a,b)=>Number(b.players.some(p=>p.isMine))-Number(a.players.some(p=>p.isMine))||(b.kind==='touchdown')-(a.kind==='touchdown')||b.at-a.at)[0];if(chosen)showPlay(chosen);
 }
 async function update(){
  if(!current()){pause();return}const model=getModel();if(!model||model.completed){clearEffects();getHost?.()?.querySelector('[data-football-panel]')?.remove();for(const badge of root.querySelectorAll('[data-red-zone-badge]'))badge.remove();return}
  const key=`${model.leagueId}:${model.season}:${model.week}:${model.memberId||'guest'}`;
  if(key!==scope){scope=key;feeds=[];initialized=false;startedAt=Date.now();expanded=false;clearEffects()}
  paint();const token=++request;
  try{const next=await load(model.season,model.week);if(token!==request||!current()||scope!==key)return;feeds=next;paint()}
  catch{if(token===request&&current())paint()}
 }
 const click=event=>{
  const button=event.target.closest('[data-red-expand]');if(!button||!root.contains(event.target))return;const zones=redZoneGames(merged(getModel()),getModel(),{gameId:getGameId(),ownOnly}),priorHeights=new Map([...button.closest('.nfl-red-watch').querySelectorAll('.nfl-red-detail')].map(node=>[node,node.hidden?0:node.getBoundingClientRect().height]));expanded=!expanded;if(compact&&zones.length>2){lastHtml='';paint()}button.setAttribute('aria-expanded',String(expanded));button.innerHTML=expanded?'Close <span aria-hidden="true">−</span>':`Live plays${compact&&zones.length>2?' ('+zones.length+')':''} <span aria-hidden="true">+</span>`;
  for(const node of button.closest('.nfl-red-watch').querySelectorAll('.nfl-red-detail')){const from=priorHeights.get(node)??0;node.getAnimations().forEach(a=>a.cancel());node.hidden=false;const to=expanded?node.scrollHeight:0,own=String(Number(node.dataset.transition||0)+1);node.dataset.transition=own;const a=animateUi(node,[{height:from+'px',opacity:from?1:0,overflow:'hidden'},{height:to+'px',opacity:expanded?1:0,overflow:'hidden'}],{duration:220,motion:motion()});const finish=()=>{if(node.dataset.transition===own)node.hidden=!expanded};if(a)a.finished.then(finish,finish);else finish()}
  lastHtml=redZoneMarkup(redZoneGames(merged(getModel()),getModel(),{gameId:getGameId(),ownOnly}),{compact,expanded});
 };
 root.addEventListener('click',click,{signal:bindings.signal});root.addEventListener('dfl:clubhouse-tab',event=>{if(event.detail?.tab!=='matchups')pause()},{signal:bindings.signal});
 document.addEventListener('visibilitychange',pause,{signal:bindings.signal});window.addEventListener('pagehide',pause,{signal:bindings.signal});
 const preference=()=>{if(!motion())clearEffects()};window.addEventListener('dfl:ui-motion-change',preference,{signal:bindings.signal});reduced.addEventListener('change',preference);
 return {update,paint,motionChanged:preference,pause,stop(){stopped=true;request++;bindings.abort();reduced.removeEventListener('change',preference);clearEffects();for(const node of root.querySelectorAll('[data-football-panel],[data-red-zone-badge],[data-football-announcement]'))node.remove()}};
}
