import {esc} from './ui.js';
import {loadNflGameDay} from './nfl-game-day.js';
import {loadNflGameSummary} from './nfl-game-center-data.js';
import {nflCenterGames,nflCenterPlays,nflFantasyRows,nflGameId} from './nfl-game-center-model.js';
import {patchGameDay} from './game-day-dom.js';
import {activeHighlightClips} from './home-highlight-model.js';
import {animateUi} from './ui-motion.js';
import {loadWeeklyStats} from './sleeper.js';
import {footballTeam} from './live-football-model.js';
let serial=0;
export function mountNflGameCenter(root,{getContext,active=()=>root.isConnected,getClips=()=>[],onClip=(_id)=>{},loadBoard=loadNflGameDay,loadSummary=loadNflGameSummary,loadStats=loadWeeklyStats,initialGame='',initialPlay=''}={}){
 const uid=`nfl-center-${++serial}`;root.dataset.nflGameCenter='';root.dataset.noSwipe='';
 let stopped=false,games=[],gameId=initialGame,mode='plays',filter='all',summary=null,weekly=[],checked=0,error=false,loading=false,token=0,timer=null,scope='',focusPlay=initialPlay;
 const current=()=>!stopped&&root.isConnected&&active()&&!document.hidden;
 const game=()=>games.find(g=>g.id===gameId);
 const clips=()=>activeHighlightClips(getClips()).filter(c=>c.game_id===gameId);
 function paint(){
  if(!root.isConnected||stopped)return;
  const context=getContext(),selected=game(),plays=nflCenterPlays(summary).filter(p=>filter==='all'||(filter==='scoring'?p.score:p.big||p.score)),fantasy=nflFantasyRows(summary,context?.players||[],{weekly,season:context?.season,week:context?.week}),videos=clips();
  const score=summary?.header?.competitions?.[0]?.competitors;
  const teams=selected?.sides.map(side=>({...side,score:score?.find(c=>footballTeam(c.team?.abbreviation)===side.code)?.score??side.score}))||[];
  patchGameDay(root,`<div class="nfl-center-picker"><label for="${uid}-game">NFL game<select id="${uid}-game" data-nfl-center-game>${games.map(g=>`<option value="${g.id}" ${g.id===gameId?'selected':''}>${esc(g.label)} · ${esc(g.status)}</option>`).join('')}</select></label><button type="button" class="linkbtn" data-nfl-center-refresh ${loading?'disabled':''}>${loading?'Loading…':'Refresh'}</button></div>${selected?`<header class="nfl-center-score"><span>${esc(teams[0]?.code)} <b>${esc(teams[0]?.score??'—')}</b></span><small>${esc(summary?.header?.competitions?.[0]?.status?.type?.shortDetail||selected.status)}</small><span><b>${esc(teams[1]?.score??'—')}</b> ${esc(teams[1]?.code)}</span></header><div class="nfl-center-modes" role="group" aria-label="NFL game view"><button type="button" data-nfl-center-mode="plays" aria-pressed="${mode==='plays'}">Play-by-play</button><button type="button" data-nfl-center-mode="fantasy" aria-pressed="${mode==='fantasy'}">Fantasy</button></div>`:''}<p class="nfl-center-status" role="status">${error?(summary?'Update unavailable · showing the last box score.':'Game details unavailable. Try Refresh.'):!games.length?(loading?'Loading NFL games…':'No NFL games available for this week.'):loading&&!summary?'Loading game details…':checked?`Updated ${new Date(checked).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`:''}</p><div class="nfl-center-body" data-nfl-center-body>${mode==='plays'?`${selected?`<label class="nfl-center-filter">Show<select data-nfl-center-filter aria-label="Filter NFL plays"><option value="all" ${filter==='all'?'selected':''}>All plays</option><option value="scoring" ${filter==='scoring'?'selected':''}>Scoring</option><option value="big" ${filter==='big'?'selected':''}>Big plays + scores</option></select></label>`:''}<ol class="nfl-center-plays" aria-label="NFL play-by-play, latest first">${[...plays].reverse().map(p=>{const clip=!p.voided&&videos.find(c=>c.play_id===p.id&&c.video_url);return `<li id="${uid}-play-${p.id}" ${focusPlay===p.id?'data-nfl-focused-play':''}><div><small>${p.period?`${p.period>4?'OT':'Q'+p.period} · `:''}${esc(p.clock)}</small>${p.score?'<b> SCORE</b>':''}${p.score&&p.away!=null&&p.home!=null?`<span>${esc(teams[0]?.code)} ${p.away} – ${p.home} ${esc(teams[1]?.code)}</span>`:''}</div><p>${esc(p.text)}</p>${clip?`<button type="button" class="linkbtn" data-nfl-center-clip="${clip.id}">▶ Watch video</button>`:''}</li>`}).join('')||(!loading&&!error?`<li class="nfl-center-empty">${selected?.state==='pre'?'Kickoff is coming. Plays appear once the game starts.':'No plays available for this view yet.'}</li>`:'')}</ol>`:`<div class="nfl-center-fantasy">${fantasy.map(p=>`<article ${p.isMine?'data-nfl-your-player':''}><div>${p.playerId?`<button type="button" class="linkbtn" data-player-card="${esc(p.playerId)}">${esc(p.name)}</button>`:`<strong>${esc(p.name)}</strong>`}<small>${esc(p.nflTeam)}${p.position?' · '+esc(p.position):''}${p.owner?' · '+esc(p.isMine?'Your team':p.owner):''}</small><p>${esc(p.line)}</p></div><span><b>${p.points===null?'—':p.points.toFixed(1)}</b><small>${p.league?'League':'PPR'}</small></span></article>`).join('')||(!loading?'<p class="nfl-center-empty">Player stats arrive after the game starts.</p>':'')}</div>`}</div>`);
 }
 function schedule(){clearTimeout(timer);if(current()&&game()?.state!=='post')timer=setTimeout(()=>void refresh(),20000)}
 async function refresh({reset=false}={}){
  if(!current())return;const context=getContext();if(!context?.season||!context.week)return;
  const key=`${context.season}:${context.week}`;if(key!==scope){scope=key;games=[];summary=null;weekly=[];checked=0;gameId=initialGame;reset=true}
  const request=++token;loading=true;error=false;paint();
  try{
   const board=await loadBoard(context.season,context.week);if(request!==token||!current())return;
   games=nflCenterGames(board.payload,context.season,context.week);if(!games.some(g=>g.id===gameId)){gameId=(games.find(g=>g.state==='in')||games[0])?.id||'';summary=null}
   const selected=game();if(selected){
    const stats=Promise.resolve().then(()=>loadStats(context.season,context.week,{maxAgeMs:20000})).catch(()=>null);
    const result=await loadSummary(selected,context.season);if(request!==token||!current()||gameId!==selected.id)return;summary=result.summary;checked=result.fetchedAt;
    void stats.then(bundle=>{if(request!==token||!current()||gameId!==selected.id)return;weekly=bundle?.data||[];paint()});
   }
  }catch{if(request===token&&current())error=true}
  finally{if(request===token&&current()){loading=false;paint();if(reset)root.querySelector('[data-nfl-center-body]')?.scrollTo(0,0);if(focusPlay){root.querySelector('[data-nfl-focused-play]')?.scrollIntoView({block:'nearest'});focusPlay=''}schedule()}}
 }
 const change=event=>{if(event.target.matches('[data-nfl-center-game]'))selectGame(event.target.value);if(event.target.matches('[data-nfl-center-filter]')){filter=event.target.value;paint()}};
 const click=event=>{const modeButton=event.target.closest('[data-nfl-center-mode]');if(modeButton&&mode!==modeButton.dataset.nflCenterMode){mode=modeButton.dataset.nflCenterMode;paint();animateUi(root.querySelector('[data-nfl-center-body]'),[{opacity:.5,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:180})}if(event.target.closest('[data-nfl-center-refresh]'))void refresh();const clip=event.target.closest('[data-nfl-center-clip]');if(clip)onClip(clip.dataset.nflCenterClip)};
 function selectGame(id,play=''){if(!nflGameId(id))return;focusPlay=play;if(id!==gameId){gameId=id;summary=null;checked=0;error=false;filter='all'}void refresh({reset:true})}
 const visibility=()=>{clearTimeout(timer);if(current())void refresh()};root.addEventListener('change',change);root.addEventListener('click',click);document.addEventListener('visibilitychange',visibility);paint();void refresh();
 return {refresh:()=>refresh(),selectGame,pause(){token++;clearTimeout(timer);loading=false},stop(){stopped=true;token++;clearTimeout(timer);root.removeEventListener('change',change);root.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility)}};
}
