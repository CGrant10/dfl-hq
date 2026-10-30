import {readJourneyChoice,writeJourneyChoice} from './journey-memory.js';
import {nflFantasyMarkup} from './nfl-fantasy-ui.js';
import {nflPlayNameIndex,nflPlayPresentation} from './nfl-play-presentation.js';
import {esc} from './ui.js';
import {loadNflGameDay} from './nfl-game-day.js';
import {loadNflGameSummary} from './nfl-game-center-data.js';
import {nflCenterGames,nflCenterPlays,nflFantasyRows,nflGameId,nflObservedGame} from './nfl-game-center-model.js';
import {patchGameDay} from './game-day-dom.js';
import {activeHighlightClips} from './home-highlight-model.js';
import {animateUi,cancelUiMotion} from './ui-motion.js';
import {nflFieldMarkup,animateNflField,nflPlayColors} from './nfl-field-ui.js';
import {nflBoardAhead} from './nfl-field-model.js';
import {loadWeeklyStats} from './sleeper.js';
import {teamLogoUrl} from './nfl-teams.js';
let serial=0;
function scoreMarkup(observed,hidden){
 return `<header class="nfl-center-score"${hidden?' hidden':''}>${(observed.sides||[]).map((side,index)=>`${index===1?`<small>${esc(observed.status)}</small>`:''}<span><img src="${esc(teamLogoUrl(side.code))}" alt="" width="28" height="28" decoding="async" onerror="this.hidden=true"><strong>${esc(side.code)}</strong><b>${esc(side.score??'—')}</b></span>`).join('')}</header>`;
}
function playMarkup(p,{uid,teams,clip,view,focused}){
 const score=!p.voided&&p.score&&p.away!=null&&p.home!=null?`<small class="nfl-play-score">${esc(teams[0]?.code)} ${p.away} – ${p.home} ${esc(teams[1]?.code)}</small>`:'';
 return `<li id="${uid}-play-${p.id}" data-play-kind="${view.kind}"${p.team?` data-play-team="${esc(p.team)}" style="${nflPlayColors(p.team)}"`:''}${p.voided?' data-play-voided':''}${focused?' data-nfl-focused-play':''}><div class="nfl-play-meta"><small>${p.team?`<b class="nfl-play-team">${esc(p.team)}</b>`:''}<span>${p.period?`${p.period>4?'OT':'Q'+p.period}`:''}</span><b>${esc(p.clock)}</b></small></div><div class="nfl-play-content">${(view.kind!=='play'||p.voided)&&view.headline!==view.label?`<b class="nfl-play-tag">${esc(view.label)}</b>`:''}<div class="nfl-play-details"><h4>${p.field?`<button type="button" class="nfl-play-select" data-nfl-field-play="${p.id}" aria-label="${esc(`View ${view.headline} on field`)}">`:''}<span class="nfl-play-headline">${esc(view.headline)}</span>${view.result&&!p.voided&&['touchdown','big-play'].includes(view.kind)?`<span class="nfl-play-result">${esc(view.result)}</span>`:''}${score}${p.field?'</button>':''}</h4><p>${esc(p.text)}</p></div>${clip?`<div class="nfl-play-actions"><button type="button" class="linkbtn" data-nfl-center-clip="${clip.id}"><span aria-hidden="true">▶</span> Watch clip</button></div>`:''}</div></li>`;
}
export function mountNflGameCenter(root,{getContext,active=()=>root.isConnected,getClips=()=>[],onClip=(_id,_source=null)=>{},loadBoard=loadNflGameDay,loadSummary=loadNflGameSummary,loadStats=loadWeeklyStats,initialGame='',initialPlay='',embedded=false,initialMode='plays',onGameChange=(_id)=>{},onBoard=(_payload,_selected)=>{},watchOthers=()=>false,liveOthers=()=>false}={}){
 const memoryKey=embedded?'nfl-replay':'nfl-center',saved=readJourneyChoice(root,memoryKey);
 if(saved){initialGame=nflGameId(saved.game)?saved.game:initialGame;initialMode=['plays','fantasy'].includes(saved.mode)?saved.mode:initialMode}
 const uid=`nfl-center-${++serial}`;root.dataset.nflGameCenter='';root.dataset.noSwipe='';
 let stopped=false,games=[],gameId=initialGame,mode=initialMode,filter=['all','scoring','big'].includes(saved?.filter)?saved.filter:'all',summary=null,weekly=[],checked=0,error=false,loading=false,token=0,timer=null,scope='',focusPlay=initialPlay,fieldPlay='',fieldKey='';
 const blockedByModal=()=>[...document.querySelectorAll('dialog[open]')].some(dialog=>!dialog.contains(root));
 const current=()=>!stopped&&root.isConnected&&active()&&!document.hidden&&!blockedByModal();
 const online=()=>navigator.onLine!==false;
 const final=()=>game()?.state==='post'&&summary?.header?.competitions?.[0]?.status?.type?.state==='post';
 const game=()=>games.find(g=>g.id===gameId);
 let nameSource=null,nameIndex=[],pendingPlays=new Set();
 const scroller=root.closest('.reel-game-browser')||document.scrollingElement;
 const scrollTarget=scroller===document.scrollingElement?document:scroller;
 const snapshots=new Map(),readings=new Map();let pendingReading=false;
 const viewKey=()=>`${gameId}:${mode}:${mode==='plays'?filter:''}`;
 const rowSelector=()=>mode==='plays'?'.nfl-center-plays li[id]':'.nfl-fantasy-player[id]';
 const edge=()=>Math.max(scroller===document.scrollingElement?0:scroller.getBoundingClientRect().top,root.querySelector('.nfl-center-tools')?.getBoundingClientRect().bottom||0);
 const saveReading=()=>{
  if(!summary||!root.getClientRects().length)return;
  const boundary=edge(),row=[...root.querySelectorAll(rowSelector())].find(n=>n.getBoundingClientRect().bottom>boundary);
  readings.set(viewKey(),{id:row?.id,offset:row?row.getBoundingClientRect().top-boundary:0,scroll:scroller.scrollTop});
 };
 const restoreReading=()=>{
  if(!pendingReading||!summary)return false;
  const saved=readings.get(viewKey()),row=saved?.id?root.querySelector('#'+CSS.escape(saved.id)):null;
  if(row)scroller.scrollTop+=row.getBoundingClientRect().top-edge()-saved.offset;
  else if(saved)scroller.scrollTop=saved.scroll;
  else {const body=root.querySelector('[data-nfl-center-body]');if(body)scroller.scrollTop+=body.getBoundingClientRect().top-edge();}
  pendingReading=false;return true;
 };
 const atLatest=()=>{const first=root.querySelector('.nfl-center-plays li[id]');return !first||first.getBoundingClientRect().top>=edge()-24};
 const latestNotice=()=>{const button=root.querySelector('[data-nfl-latest]');if(button){button.hidden=mode!=='plays'||!pendingPlays.size&&atLatest();const label=`Back to ${game()?.state==='in'?'live':'latest'}${pendingPlays.size?' · '+pendingPlays.size+' new '+(pendingPlays.size===1?'play':'plays'):''}`;if(button.textContent!==label)button.textContent=label}};
 const reading=()=>{if(mode==='plays'&&atLatest())pendingPlays.clear();latestNotice()};
 const remember=()=>writeJourneyChoice(memoryKey,{game:gameId,mode,filter});
 const names=()=>{if(summary!==nameSource){nameSource=summary;nameIndex=nflPlayNameIndex(summary)}return nameIndex};
 const clips=()=>activeHighlightClips(getClips()).filter(c=>c.game_id===gameId);
 function paint(){
  if(!root.isConnected||stopped)return;
  const context=getContext(),selected=game(),allPlays=nflCenterPlays(summary,selected),plays=allPlays.filter(p=>filter==='all'||!p.voided&&(filter==='scoring'?p.score:p.big||p.score)),fantasy=nflFantasyRows(summary,context?.players||[],{weekly,season:context?.season,week:context?.week}),videos=clips();
  const observed=nflObservedGame(selected,summary,context?.season),officialState=observed?.state,teams=observed?.sides||[];
  const fieldSelection=allPlays.find(p=>p.id===(fieldPlay||focusPlay))||allPlays.at(-1),historical=!!fieldPlay&&fieldSelection?.id!==allPlays.at(-1)?.id;
  const previousField=root.querySelector('[data-nfl-field]');
  const scrollTop=scroller.scrollTop,boundary=edge();
  const anchor=[...root.querySelectorAll(rowSelector())].find(row=>row.getBoundingClientRect().bottom>boundary),top=anchor?.getBoundingClientRect().top,latest=mode==='plays'&&root.querySelector('.nfl-center-plays li[id]')?.getBoundingClientRect().top>=boundary-24;
  patchGameDay(root,`<div class="nfl-center-tools"><div class="nfl-center-picker"><label for="${uid}-game"><span class="sr-only">NFL game</span><select id="${uid}-game" data-nfl-center-game ${games.length?'':'disabled'}>${!games.length?`<option value="">${loading?'Loading games…':'No games this week'}</option>`:''}${games.map(g=>`<option value="${g.id}" ${g.id===gameId?'selected':''}>${esc(g.id===gameId?`${observed.label} · ${observed.status}`:`${g.label} · ${g.status}`)}</option>`).join('')}</select></label><button type="button" class="linkbtn" data-nfl-center-refresh aria-label="Refresh NFL game" aria-busy="${loading}" ${loading?'disabled':''}><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M16 8a6 6 0 1 0 0 5M16 3v5h-5"/></svg></button></div>${selected?`<div class="nfl-center-modes" style="--nfl-mode:${mode==='fantasy'?1:0}" ${embedded?'hidden':''} role="group" aria-label="NFL game view"><i aria-hidden="true"></i><button type="button" data-nfl-center-mode="plays" aria-pressed="${mode==='plays'}">Play-by-play</button><button type="button" data-nfl-center-mode="fantasy" aria-pressed="${mode==='fantasy'}">Fantasy stats</button></div>`:''}</div>${selected?scoreMarkup(observed,mode==='fantasy'):''}<p class="nfl-center-status${selected&&summary&&checked&&!error&&online()?' is-quiet':''}" role="status">${!online()?'Offline · reconnecting when available.':error?(summary?'Update unavailable · showing the last box score.':'Game details unavailable. Try Refresh.'):!games.length?(loading?'Loading NFL games…':'No NFL games available for this week.'):loading&&!summary?'Loading game details…':checked?officialState==='in'?'Live':officialState==='post'?'Final':'Scheduled':''}</p><div class="nfl-center-body" data-nfl-center-body aria-busy="${loading&&!summary}">${mode==='plays'?`${selected?nflFieldMarkup(fieldSelection,observed,{uid,historical}):''}${selected?`<label class="nfl-center-filter">Show<select data-nfl-center-filter aria-label="Filter NFL plays"><option value="all" ${filter==='all'?'selected':''}>All plays</option><option value="scoring" ${filter==='scoring'?'selected':''}>Scoring</option><option value="big" ${filter==='big'?'selected':''}>Big plays + scores</option></select></label>`:''}<ol class="nfl-center-plays" aria-label="NFL play-by-play, latest first">${[...plays].reverse().map(p=>playMarkup(p,{uid,teams,clip:!p.voided&&videos.find(c=>c.play_id===p.id&&c.video_url),view:nflPlayPresentation(p,names()),focused:focusPlay===p.id})).join('')||(!loading&&!error?`<li class="nfl-center-empty">${selected?.state==='pre'?'Kickoff is coming. Plays appear once the game starts.':'No plays available for this view yet.'}</li>`:'')}</ol>`:nflFantasyMarkup(fantasy,teams,{uid,loading,error,season:context?.season,week:context?.week,state:officialState})}</div><button type="button" class="nfl-latest" data-nfl-latest hidden></button>`);
  const nextFieldKey=mode==='plays'?`${gameId}:${fieldSelection?.id||''}:${fieldSelection?.field?`${fieldSelection.field.start.x},${fieldSelection.field.end.x},${fieldSelection.field.voided}`:'unknown'}`:'';
  if(nextFieldKey!==fieldKey){if(previousField)cancelUiMotion(previousField);if(mode==='plays')animateNflField(root,fieldSelection,animateUi);fieldKey=nextFieldKey;}
  latestNotice();
  if(!restoreReading()){if(anchor?.isConnected&&!latest)scroller.scrollTop+=anchor.getBoundingClientRect().top-top;else if(latest)scroller.scrollTop=scrollTop;}
 }
 function schedule(){clearTimeout(timer);if(current()&&online()&&(!final()||watchOthers()))timer=setTimeout(()=>void refresh(),game()?.state==='in'||liveOthers()?5000:30000)}
 async function refresh({reset=false,force=false}={}){
  if(!current()||loading&&!reset)return;clearTimeout(timer);if(!online()){paint();return;}const context=getContext();if(!context?.season||!context.week)return;
  const key=`${context.season}:${context.week}`;if(key!==scope){pendingPlays.clear();fieldPlay='';scope=key;snapshots.clear();readings.clear();pendingReading=false;games=[];summary=null;weekly=[];checked=0;gameId=initialGame;reset=true}
  const request=++token;loading=true;error=false;paint();
  try{
   const prior=summary?new Set(nflCenterPlays(summary,game()).map(p=>p.id)):null,following=mode==='plays'&&atLatest();
   const board=await loadBoard(context.season,context.week,{force,maxAgeMs:game()?.state==='in'||liveOthers()?5000:20000});if(request!==token||!current())return;
   games=nflCenterGames(board.payload,context.season,context.week);if(!games.some(g=>g.id===gameId)){gameId=(games.find(g=>g.state==='in')||games[0])?.id||'';summary=null;fieldPlay='';pendingPlays.clear();onGameChange(gameId)}
   onBoard(board.payload,gameId);
   if(prior&&!following)for(const play of nflCenterPlays(summary,game()))if(!prior.has(play.id))pendingPlays.add(play.id);
   if(nflBoardAhead(summary,game()))paint();
   const selected=game();if(selected){
    const stats=Promise.resolve().then(()=>loadStats(context.season,context.week,{maxAgeMs:20000})).catch(()=>null);
    const result=await loadSummary(selected,context.season,{force});if(request!==token||!current()||gameId!==selected.id)return;const before=summary?new Set(nflCenterPlays(summary,selected).map(p=>p.id)):null,following=mode==='plays'&&atLatest();if(before&&!following)for(const play of nflCenterPlays(result.summary,selected))if(!before.has(play.id))pendingPlays.add(play.id);if(following)pendingPlays.clear();summary=result.summary;checked=result.fetchedAt;snapshots.set(gameId,{summary,checked,filter});
    void stats.then(bundle=>{if(request!==token||!current()||gameId!==selected.id)return;const next=bundle?.data||[];if(next!==weekly){weekly=next;paint()}});
   }
  }catch{if(request===token&&current())error=true}
  finally{if(request===token&&current()){loading=false;paint();if(focusPlay){root.querySelector('[data-nfl-focused-play]')?.scrollIntoView({block:'nearest'});focusPlay=''}schedule()}}
 }
 const change=event=>{if(event.target.matches('[data-nfl-center-game]'))selectGame(event.target.value);if(event.target.matches('[data-nfl-center-filter]')){saveReading();filter=event.target.value;pendingReading=true;remember();paint()}};
 function changeMode(next){
  if(!['plays','fantasy'].includes(next)||next===mode)return;
  saveReading();mode=next;pendingReading=true;remember();paint();
  animateUi(root.querySelector('[data-nfl-center-body]'),[{opacity:.65},{opacity:1}],{duration:160});
 }
 const scrollField=node=>{if(!node)return;node.focus?.({preventScroll:true});node.scrollIntoView({block:'center',behavior:document.documentElement.dataset.uiMotion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});};
 const click=event=>{
  const fieldButton=event.target.closest('[data-nfl-field-play]');if(fieldButton){fieldPlay=fieldButton.dataset.nflFieldPlay;fieldKey='';paint();scrollField(root.querySelector('[data-nfl-field]'));return;}
  if(event.target.closest('[data-nfl-field-latest]')){fieldPlay='';paint();scrollField(root.querySelector('[data-nfl-field]'));return;}
  const fieldReturn=event.target.closest('[data-nfl-field-return]');if(fieldReturn){scrollField(root.querySelector(`[data-nfl-field-play="${CSS.escape(fieldReturn.dataset.nflFieldReturn)}"]`));return;}

  if(event.target.closest('[data-nfl-latest]')){pendingPlays.clear();const first=root.querySelector('.nfl-center-plays li[id]');if(first)scroller.scrollTop=Math.max(0,scroller.scrollTop+first.getBoundingClientRect().top-edge()-4);latestNotice();return;}
  const modeButton=event.target.closest('[data-nfl-center-mode]');if(modeButton)changeMode(modeButton.dataset.nflCenterMode);
  if(event.target.closest('[data-nfl-center-refresh]'))void refresh({force:true});
  const clip=event.target.closest('[data-nfl-center-clip]');if(clip){saveReading();onClip(clip.dataset.nflCenterClip,clip);}
 };
 function selectGame(id,play=''){
  if(!nflGameId(id))return;
  saveReading();focusPlay=play;
  if(id!==gameId){
   if(summary)snapshots.set(gameId,{summary,checked,filter});
   fieldPlay='';
   gameId=id;const cached=snapshots.get(id);summary=cached?.summary||null;checked=cached?.checked||0;filter=cached?.filter||'all';error=false;pendingPlays.clear();onGameChange(id);
  }
  pendingReading=true;remember();void refresh({reset:true,force:true});
 }
 const suspend=()=>{token++;clearTimeout(timer);loading=false};
 const wake=()=>{if(current()){suspend();void refresh({force:true})}};
 const visibility=()=>{if(document.hidden)suspend();else wake()};
 const offline=()=>{suspend();if(current())paint()};
 // Dialogs can be removed before their queued close event fires. Observe only
 // changes involving dialogs; live row patches never trigger a resume request.
 let modalBlocked=blockedByModal();
 const modalObserver=new MutationObserver(records=>{
  const relevant=records.some(r=>r.type==='attributes'?r.target.tagName==='DIALOG':[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&n.tagName==='DIALOG'));
  if(!relevant||stopped)return;
  const blocked=blockedByModal();if(blocked===modalBlocked)return;modalBlocked=blocked;
  if(blocked)suspend();else wake();
 });
 modalObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
 const events=[['visibilitychange',visibility,document],['online',wake,window],['offline',offline,window],['focus',wake,window],['pageshow',wake,window],['pagehide',suspend,window]];
 scrollTarget.addEventListener('scroll',reading,{passive:true});root.addEventListener('change',change);root.addEventListener('click',click);for(const [event,handler,target] of events)target.addEventListener(event,handler);paint();const ready=refresh();
 return {ready,setMode:changeMode,refresh:()=>refresh({force:true}),selectGame,pause:suspend,stop(){stopped=true;suspend();cancelUiMotion(root);snapshots.clear();readings.clear();modalObserver.disconnect();scrollTarget.removeEventListener('scroll',reading);root.removeEventListener('change',change);root.removeEventListener('click',click);for(const [event,handler,target] of events)target.removeEventListener(event,handler)}};
}
