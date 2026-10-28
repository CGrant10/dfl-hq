import {readJourneyChoice,writeJourneyChoice} from './journey-memory.js';
import {nflFantasyMarkup} from './nfl-fantasy-ui.js';
import {nflPlayNameIndex,nflPlayPresentation} from './nfl-play-presentation.js';
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
export function mountNflGameCenter(root,{getContext,active=()=>root.isConnected,getClips=()=>[],onClip=(_id)=>{},loadBoard=loadNflGameDay,loadSummary=loadNflGameSummary,loadStats=loadWeeklyStats,initialGame='',initialPlay='',embedded=false,initialMode='plays',onGameChange=(_id)=>{},onBoard=(_payload,_selected)=>{},watchOthers=()=>false,liveOthers=()=>false}={}){
 const memoryKey=embedded?'nfl-replay':'nfl-center',saved=readJourneyChoice(root,memoryKey);
 if(saved){initialGame=nflGameId(saved.game)?saved.game:initialGame;initialMode=['plays','fantasy'].includes(saved.mode)?saved.mode:initialMode}
 const uid=`nfl-center-${++serial}`;root.dataset.nflGameCenter='';root.dataset.noSwipe='';
 let stopped=false,games=[],gameId=initialGame,mode=initialMode,filter=['all','scoring','big'].includes(saved?.filter)?saved.filter:'all',summary=null,weekly=[],checked=0,error=false,loading=false,token=0,timer=null,scope='',focusPlay=initialPlay;
 const current=()=>!stopped&&root.isConnected&&active()&&!document.hidden;
 const online=()=>navigator.onLine!==false;
 const final=()=>game()?.state==='post'&&summary?.header?.competitions?.[0]?.status?.type?.state==='post';
 const game=()=>games.find(g=>g.id===gameId);
 let nameSource=null,nameIndex=[],pendingPlays=new Set();
 const scroller=root.closest('.reel-game-browser')||document.scrollingElement;
 const atLatest=()=>{const first=root.querySelector('.nfl-center-plays li[id]');return !first||first.getBoundingClientRect().top>=(scroller===document.scrollingElement?0:scroller.getBoundingClientRect().top)-24};
 const latestNotice=()=>{const button=root.querySelector('[data-nfl-latest]');if(button){button.hidden=mode!=='plays'||!pendingPlays.size&&atLatest();const label=`Back to ${game()?.state==='in'?'live':'latest'}${pendingPlays.size?' · '+pendingPlays.size+' new '+(pendingPlays.size===1?'play':'plays'):''}`;if(button.textContent!==label)button.textContent=label}};
 const reading=()=>{if(mode==='plays'&&atLatest())pendingPlays.clear();latestNotice()};
 const remember=()=>writeJourneyChoice(memoryKey,{game:gameId,mode,filter});
 const names=()=>{if(summary!==nameSource){nameSource=summary;nameIndex=nflPlayNameIndex(summary)}return nameIndex};
 const clips=()=>activeHighlightClips(getClips()).filter(c=>c.game_id===gameId);
 function paint(){
  if(!root.isConnected||stopped)return;
  const context=getContext(),selected=game(),plays=nflCenterPlays(summary).filter(p=>filter==='all'||(filter==='scoring'?p.score:p.big||p.score)),fantasy=nflFantasyRows(summary,context?.players||[],{weekly,season:context?.season,week:context?.week}),videos=clips();
  const score=summary?.header?.competitions?.[0]?.competitors;
  const teams=selected?.sides.map(side=>({...side,score:score?.find(c=>footballTeam(c.team?.abbreviation)===side.code)?.score??side.score}))||[];
  const scroller=root.closest('.reel-game-browser')||document.scrollingElement,scrollTop=scroller.scrollTop,edge=scroller===document.scrollingElement?0:scroller.getBoundingClientRect().top;
  const anchor=[...root.querySelectorAll('.nfl-center-plays li[id]')].find(row=>row.getBoundingClientRect().bottom>edge),top=anchor?.getBoundingClientRect().top,latest=root.querySelector('.nfl-center-plays li[id]')?.getBoundingClientRect().top>=edge-24;
  patchGameDay(root,`<div class="nfl-center-picker"><label for="${uid}-game">NFL game<select id="${uid}-game" data-nfl-center-game>${games.map(g=>`<option value="${g.id}" ${g.id===gameId?'selected':''}>${esc(g.label)} · ${esc(g.status)}</option>`).join('')}</select></label><button type="button" class="linkbtn" data-nfl-center-refresh ${loading?'disabled':''}>${loading?'Loading…':'Refresh'}</button></div>${selected?`<header class="nfl-center-score" ${mode==='fantasy'?'hidden':''}><span>${esc(teams[0]?.code)} <b>${esc(teams[0]?.score??'—')}</b></span><small>${esc(summary?.header?.competitions?.[0]?.status?.type?.shortDetail||selected.status)}</small><span><b>${esc(teams[1]?.score??'—')}</b> ${esc(teams[1]?.code)}</span></header><div class="nfl-center-modes" ${embedded?'hidden':''} role="group" aria-label="NFL game view"><button type="button" data-nfl-center-mode="plays" aria-pressed="${mode==='plays'}">Play-by-play</button><button type="button" data-nfl-center-mode="fantasy" aria-pressed="${mode==='fantasy'}">Fantasy stats</button></div>`:''}<p class="nfl-center-status" role="status">${!online()?'Offline · reconnecting when available.':error?(summary?'Update unavailable · showing the last box score.':'Game details unavailable. Try Refresh.'):!games.length?(loading?'Loading NFL games…':'No NFL games available for this week.'):loading&&!summary?'Loading game details…':checked?`${selected?.state==='in'?'Live · ':''}${new Date(checked).toLocaleTimeString([],{hour:'numeric',minute:'2-digit',second:'2-digit'})}`:''}</p><div class="nfl-center-body" data-nfl-center-body>${mode==='plays'?`${selected?`<label class="nfl-center-filter">Show<select data-nfl-center-filter aria-label="Filter NFL plays"><option value="all" ${filter==='all'?'selected':''}>All plays</option><option value="scoring" ${filter==='scoring'?'selected':''}>Scoring</option><option value="big" ${filter==='big'?'selected':''}>Big plays + scores</option></select></label>`:''}<ol class="nfl-center-plays" aria-label="NFL play-by-play, latest first">${[...plays].reverse().map(p=>{const clip=!p.voided&&videos.find(c=>c.play_id===p.id&&c.video_url),view=nflPlayPresentation(p,names());return `<li id="${uid}-play-${p.id}" data-play-kind="${view.kind}" ${focusPlay===p.id?'data-nfl-focused-play':''}><div class="nfl-play-meta"><small>${p.period?`${p.period>4?'OT':'Q'+p.period} · `:''}${esc(p.clock)}</small>${view.kind!=='play'?`<b>${esc(view.label)}</b>`:''}${p.score&&p.away!=null&&p.home!=null?`<span>${esc(teams[0]?.code)} ${p.away} – ${p.home} ${esc(teams[1]?.code)}</span>`:''}</div><h4>${esc(view.headline)}</h4>${view.result?`<p class="nfl-play-result">${esc(view.result)}</p>`:''}<div class="nfl-play-actions"><details class="nfl-play-details"><summary>Play details</summary><p>${esc(p.text)}</p></details>${clip?`<button type="button" class="linkbtn" data-nfl-center-clip="${clip.id}">▶ Watch clip</button>`:''}</div></li>`}).join('')||(!loading&&!error?`<li class="nfl-center-empty">${selected?.state==='pre'?'Kickoff is coming. Plays appear once the game starts.':'No plays available for this view yet.'}</li>`:'')}</ol>`:nflFantasyMarkup(fantasy,teams,{uid,loading,error})}</div><button type="button" class="nfl-latest" data-nfl-latest hidden></button>`);
  latestNotice();
  if(anchor?.isConnected&&!latest)scroller.scrollTop+=anchor.getBoundingClientRect().top-top;else if(latest)scroller.scrollTop=scrollTop;
 }
 function schedule(){clearTimeout(timer);if(current()&&online()&&(!final()||watchOthers()))timer=setTimeout(()=>void refresh(),game()?.state==='in'||liveOthers()?10000:30000)}
 async function refresh({reset=false,force=false}={}){
  if(!current()||loading&&!reset)return;clearTimeout(timer);if(!online()){paint();return;}const context=getContext();if(!context?.season||!context.week)return;
  const key=`${context.season}:${context.week}`;if(key!==scope){pendingPlays.clear();scope=key;games=[];summary=null;weekly=[];checked=0;gameId=initialGame;reset=true}
  const request=++token;loading=true;error=false;paint();
  try{
   const board=await loadBoard(context.season,context.week,{force});if(request!==token||!current())return;
   games=nflCenterGames(board.payload,context.season,context.week);if(!games.some(g=>g.id===gameId)){gameId=(games.find(g=>g.state==='in')||games[0])?.id||'';summary=null;pendingPlays.clear();onGameChange(gameId)}
   onBoard(board.payload,gameId);
   const selected=game();if(selected){
    const stats=Promise.resolve().then(()=>loadStats(context.season,context.week,{maxAgeMs:20000})).catch(()=>null);
    const result=await loadSummary(selected,context.season,{force});if(request!==token||!current()||gameId!==selected.id)return;const before=summary?new Set(nflCenterPlays(summary).map(p=>p.id)):null,following=mode==='plays'&&atLatest();if(before&&!following)for(const play of nflCenterPlays(result.summary))if(!before.has(play.id))pendingPlays.add(play.id);if(following)pendingPlays.clear();summary=result.summary;checked=result.fetchedAt;
    void stats.then(bundle=>{if(request!==token||!current()||gameId!==selected.id)return;weekly=bundle?.data||[];paint()});
   }
  }catch{if(request===token&&current())error=true}
  finally{if(request===token&&current()){loading=false;paint();if(reset)root.querySelector('[data-nfl-center-body]')?.scrollTo(0,0);if(focusPlay){root.querySelector('[data-nfl-focused-play]')?.scrollIntoView({block:'nearest'});focusPlay=''}schedule()}}
 }
 const change=event=>{if(event.target.matches('[data-nfl-center-game]'))selectGame(event.target.value);if(event.target.matches('[data-nfl-center-filter]')){filter=event.target.value;remember();paint()}};
 const click=event=>{if(event.target.closest('[data-nfl-latest]')){pendingPlays.clear();root.querySelector('[data-nfl-latest]').hidden=true;const first=root.querySelector('.nfl-center-plays li[id]');if(first){const edge=scroller===document.scrollingElement?0:scroller.getBoundingClientRect().top,inset=(root.querySelector('.nfl-center-picker')?.clientHeight||0)+56;scroller.scrollTop=Math.max(0,scroller.scrollTop+first.getBoundingClientRect().top-edge-inset)}return;}const modeButton=event.target.closest('[data-nfl-center-mode]');if(modeButton&&mode!==modeButton.dataset.nflCenterMode){mode=modeButton.dataset.nflCenterMode;remember();paint();animateUi(root.querySelector('[data-nfl-center-body]'),[{opacity:.5,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:180})}if(event.target.closest('[data-nfl-center-refresh]'))void refresh({force:true});const clip=event.target.closest('[data-nfl-center-clip]');if(clip)onClip(clip.dataset.nflCenterClip)};
 function selectGame(id,play=''){if(!nflGameId(id))return;focusPlay=play;if(id!==gameId){gameId=id;summary=null;checked=0;error=false;filter='all';pendingPlays.clear();onGameChange(id)}remember();void refresh({reset:true,force:true})}
 const suspend=()=>{token++;clearTimeout(timer);loading=false};
 const wake=()=>{if(current()){suspend();void refresh({force:true})}};
 const visibility=()=>{if(document.hidden)suspend();else wake()};
 const offline=()=>{suspend();if(current())paint()};
 const events=[['visibilitychange',visibility,document],['online',wake,window],['offline',offline,window],['focus',wake,window],['pageshow',wake,window],['pagehide',suspend,window]];
 scroller.addEventListener('scroll',reading,{passive:true});root.addEventListener('change',change);root.addEventListener('click',click);for(const [event,handler,target] of events)target.addEventListener(event,handler);paint();const ready=refresh();
 return {ready,setMode(next){if(!['plays','fantasy'].includes(next)||next===mode)return;mode=next;remember();paint();if(scroller!==document.scrollingElement)scroller.scrollTop=0},refresh:()=>refresh({force:true}),selectGame,pause:suspend,stop(){stopped=true;suspend();scroller.removeEventListener('scroll',reading);root.removeEventListener('change',change);root.removeEventListener('click',click);for(const [event,handler,target] of events)target.removeEventListener(event,handler)}};
}
