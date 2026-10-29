import {animateUi} from './ui-motion.js';
import {timelineMarkup} from './matchup-timeline.js';
import {loadHomeHighlights} from './home-highlight-data.js';
import {momentSummaryMarkup} from './moment-summary-ui.js';
import {esc} from './ui.js';
import {loadGameDayMoments} from './game-day-moments.js';
import {mountMomentRecap} from './moment-recap.js';
import {matchupStory} from './matchup-story.js';
import {isFootballMomentKey} from './football-moments.js';
import {patchGameDay} from './game-day-dom.js';
import {matchupMomentum} from './matchup-momentum.js';
import {momentumMarkup,momentumDetail,momentumDescription} from './matchup-momentum-ui.js';
import {loadMatchupScoreHistory} from './matchup-momentum-data.js';
import {readJourneyChoice,writeJourneyChoice} from './journey-memory.js';

export function matchupHighlightsHtml(state,gameId,{final=false}={}){
 const items=(state.items||[]).filter(m=>m.matchupId===String(gameId));
 return `<section class="matchup-highlights" aria-label="Matchup highlights"><header><h3>${final?'Final story':'Matchup highlights'}</h3>${items.length||final?'<button type="button" class="linkbtn" data-highlights-recap>Play recap →</button>':''}</header>${items.length?`<ol>${items.slice(0,3).map(m=>`<li><button type="button" data-highlight="${esc(m.eventKey||m.key)}">${momentSummaryMarkup(m)}</button></li>`).join('')}</ol>`:''}${state.message?`<p role="status">${esc(state.message)}</p>`:!items.length?`<p role="status">${state.busy?'Loading highlights…':state.error?'Highlights unavailable.':'No saved highlights yet.'}</p>`:''}${state.error||state.message?'<button type="button" class="linkbtn" data-highlights-retry>Retry highlights</button>':''}${state.more?`<button type="button" class="linkbtn" data-highlights-more${state.busy?' disabled':''}>Earlier highlights</button>`:''}</section>`;
}

export function mountMatchupHighlights(root,{getModel,getGame,getPlayers=()=>({}),getHost,getMotion=()=>true,active=()=>root.isConnected,load=loadGameDayMoments,momentum=false,loadHistory=loadMatchupScoreHistory,loadClips=loadHomeHighlights,onClip=null}={}){
 let stopped=false,scope='',checked=0,lastWanted=null,token=0,state={items:[],busy:false,error:false,message:'',cursor:null,more:false};
 const consumed=new Set();let timelineFilter='all',timelineSelected='',clips=[],clipsScope='';
 let history=[],historyError=false,momentumSelected='',dragging=false,pendingPaint=false,clipsAt=0,clipBusy=false,dragView=null,prepared=null;
 const views=new Map(),covered=()=>momentum&&!!document.querySelector('dialog[open]');
 const momentumView=()=>{const model=getModel(),game=getGame();if(!prepared||prepared.items!==state.items||prepared.history!==history||prepared.game!==game||prepared.filter!==timelineFilter)prepared={items:state.items,history,game,filter:timelineFilter,value:matchupMomentum(state.items,history,model,game,{filter:timelineFilter})};const view=prepared.value,choice=view.entries.find(e=>e.key===momentumSelected)||view.entries.at(-1)||null;return {...view,choice,index:choice?view.entries.indexOf(choice):-1}};
 const recap=mountMomentRecap({getMotion,returnFocus:()=>getHost()?.querySelector('[data-highlights-recap]'),getContext:()=>({season:getModel()?.season,week:getModel()?.week}),getFinish:()=>matchupStory(getModel(),getGame(),state.items)});
 const current=()=>!stopped&&root.isConnected&&active();
 const paint=()=>{const host=getHost();if(!host||!current())return;if(dragging||covered()){pendingPaint=true;return}pendingPaint=false;
  if(momentum){const view=momentumView();patchGameDay(host,momentumMarkup(view,getGame(),getModel(),{filter:timelineFilter,selected:momentumSelected,clips,busy:state.busy,error:state.error,historyError,more:state.more}));syncSelection(view)}
  else patchGameDay(host,matchupHighlightsHtml(state,getGame()?.id,{final:!!matchupStory(getModel(),getGame(),state.items)})+timelineMarkup(state.items,getGame(),{filter:timelineFilter,selected:timelineSelected,model:getModel(),clips}))};
 const syncSelection=(view,announce=false)=>{
  const host=getHost(),game=getGame(),entry=view.choice,range=host?.querySelector('[data-momentum-scrub]');if(!range)return;
  range.value=String(Math.max(0,view.index));range.setAttribute('aria-valuetext',momentumDescription(entry,game));
  const cursor=host.querySelector('[data-momentum-cursor]');if(cursor&&entry){cursor.setAttribute('x1',String(view.x(entry.at)));cursor.setAttribute('x2',String(view.x(entry.at)))}
  const detail=host.querySelector('[data-momentum-detail]');if(detail)patchGameDay(detail,momentumDetail(entry,game,getModel(),clips));
  for(const node of host.querySelectorAll('[data-momentum-event]'))node.setAttribute('aria-pressed',String(node.dataset.momentumEvent===entry?.key));
  for(const button of host.querySelectorAll('[data-momentum-step]'))button.disabled=Number(button.dataset.momentumStep)<0?view.index<=0:view.index>=view.entries.length-1;
  host.querySelector('[data-momentum-latest]').disabled=!momentumSelected;
  if(announce)host.querySelector('[data-momentum-announcement]').textContent=momentumDescription(entry,game);
 };
 const selectionView=()=>{if(!dragging||!dragView)return momentumView();const choice=dragView.entries.find(e=>e.key===momentumSelected)||dragView.entries.at(-1)||null;return {...dragView,choice,index:choice?dragView.entries.indexOf(choice):-1}};
 const selectMoment=(key,{announce=false,animate=false}={})=>{momentumSelected=key;syncSelection(selectionView(),announce);if(animate)animateUi(getHost()?.querySelector('[data-momentum-detail]'),[{opacity:.6},{opacity:1}],{duration:140,motion:getMotion()})};
 const remember=()=>{if(momentum&&scope)writeJourneyChoice('momentum:'+scope,{selected:momentumSelected,filter:timelineFilter})};
 const holdSelection=()=>{if(!momentum)return;const choice=momentumView().choice;if(choice){momentumSelected=choice.key;syncSelection(momentumView());remember()}};
 const fetchClips=()=>{if(!momentum||Date.now()-clipsAt<60000||!state.items.some(m=>m.recap?.play))return;clipsAt=Date.now();const requested=scope;void loadClips().then(rows=>{if(current()&&scope===requested){clips=rows;paint()}}).catch(()=>{if(scope===requested)clipsAt=0})};
 const route=()=>{const params=new URLSearchParams(location.hash.split('?')[1]||''),m=getModel();return params.get('matchup')===String(getGame()?.id)&&Number(params.get('season'))===m?.season&&Number(params.get('week'))===m?.week&&isFootballMomentKey(params.get('moment'))?params.get('moment'):null};
 const open=(startKey=null)=>recap.open(state.items,getGame()?.id,{startKey});
 const update=async({force=false,earlier=false}={})=>{
  if(!current())return;
  const model=getModel(),game=getGame();if(!model||!game)return;
  const nextScope=JSON.stringify([model.leagueId,model.season,model.week,game.id]);
  if(nextScope!==scope){
   if(momentum&&scope)views.set(scope,{state:{...state,busy:false},history,historyError,momentumSelected,timelineFilter,checked,clips,clipsAt});
   const previous=momentum&&views.get(nextScope),saved=momentum&&readJourneyChoice(root,'momentum:'+nextScope);
   timelineFilter=previous?.timelineFilter??(['all','leads','plays'].includes(saved?.filter)?saved.filter:'all');momentumSelected=previous?.momentumSelected??(typeof saved?.selected==='string'&&saved.selected.length<=160?saved.selected:'');history=previous?.history||[];historyError=previous?.historyError||false;clips=previous?.clips||[];clipsAt=previous?.clipsAt||0;timelineSelected='';clipsScope='';scope=nextScope;token++;checked=previous?.checked||0;lastWanted=null;dragging=false;dragView=null;
   state=previous?.state||{items:[],busy:false,error:false,message:'',cursor:null,more:false};paint();
  }
  const wanted=route();
  if(covered())return;
  if(state.busy||!earlier&&!force&&Date.now()-checked<60000&&wanted===lastWanted)return;
  const request=++token;state.busy=true;state.error=false;state.message='';if(!state.items.length)paint();
  try{
   const [momentsResult,historyResult]=await Promise.allSettled([load(model,getPlayers(),{gameId:game.id,before:earlier?state.cursor:null}),momentum&&!earlier?loadHistory(model,game):Promise.resolve([])]);
   if(!current()||request!==token)return;
   if(momentum&&!earlier){if(historyResult.status==='fulfilled'){history=historyResult.value;historyError=false}else historyError=true}
   if(momentsResult.status==='rejected')throw momentsResult.reason;
   const data=momentsResult.value;
   const existing=state.items,items=new Map([...existing,...data.items].map(m=>[m.key,m]));
   // An alert can point beyond the visible page. Fetch that exact scoped key;
   // never substitute a recent but unrelated highlight.
   if(wanted&&!consumed.has(wanted)&&![...items.values()].some(m=>m.eventKey===wanted)){
    const exact=await load(model,getPlayers(),{gameId:game.id,eventKey:wanted,limit:1});
    if(!current()||request!==token)return;exact.items.forEach(m=>items.set(m.key,m));
   }
   const gap=!earlier&&existing.length&&Number(data.cursor)>Math.max(...existing.map(m=>Number(m.key)));
   state={items:[...items.values()].sort((a,b)=>b.at-a.at||Number(b.key)-Number(a.key)),busy:false,error:false,message:'',cursor:earlier||!existing.length||gap?data.cursor:state.cursor,more:earlier||!existing.length||gap?data.more:state.more};checked=Date.now();lastWanted=wanted;
   if(wanted&&!consumed.has(wanted)&&route()===wanted){
    if(state.items.some(m=>m.eventKey===wanted)){consumed.add(wanted);if(momentum){momentumSelected='moment:'+wanted;timelineFilter='all'}paint();open(wanted)}else state.message='This highlight is unavailable.';
   }
  }catch{if(request===token&&current())state.error=true}
  finally{if(request===token&&!stopped){state.busy=false;if(current()){paint();fetchClips()}}}
 };
 const click=event=>{
  if(!getHost()?.contains(event.target))return;
  const momentumFilter=event.target.closest('[data-momentum-filter]'),momentumEvent=event.target.closest('[data-momentum-event]'),momentumStep=event.target.closest('[data-momentum-step]'),clip=event.target.closest('[data-momentum-clip]');
  if(momentumFilter){timelineFilter=momentumFilter.dataset.momentumFilter;momentumSelected='';paint();remember();return}
  if(momentumEvent){selectMoment(momentumEvent.dataset.momentumEvent,{animate:true,announce:true});remember();return}
  if(momentumStep){const view=momentumView(),next=view.entries[view.index+Number(momentumStep.dataset.momentumStep)];if(next){selectMoment(next.key,{animate:true,announce:true});remember()}return}
  if(event.target.closest('[data-momentum-latest]')){selectMoment('',{announce:true});remember();return}
  if(momentum&&event.target.closest('a,[data-player-card],[data-highlight]'))holdSelection();
  if(clip&&onClip){event.preventDefault();if(clipBusy)return;clipBusy=true;clip.setAttribute('aria-busy','true');const requested=scope,selection=momentumSelected,accepts=()=>current()&&scope===requested&&momentumSelected===selection&&!covered();Promise.resolve().then(()=>onClip(clip.dataset.momentumClip,clip,accepts)).then(opened=>{if(opened===false&&accepts())location.hash=clip.getAttribute('href')}).catch(()=>{if(accepts())location.hash=clip.getAttribute('href')}).finally(()=>{clipBusy=false;clip.removeAttribute('aria-busy')});return}
  const filter=event.target.closest('[data-timeline-filter]'),moment=event.target.closest('[data-timeline-moment]');
  if(filter){timelineFilter=filter.dataset.timelineFilter;paint();return}
  if(moment){timelineSelected=moment.dataset.timelineMoment;paint();animateUi(getHost()?.querySelector('[data-timeline-detail]'),[{opacity:.5,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:180,motion:getMotion()});return}
  const selected=event.target.closest('[data-highlight]');
  if(selected){open(selected.dataset.highlight);return}
  if(event.target.closest('[data-highlights-recap]'))open();
  else if(event.target.closest('[data-highlights-retry]'))void update({force:true});
  else if(event.target.closest('[data-highlights-more]'))void update({earlier:true});
 };
 const toggle=event=>{if(!event.target.matches('.matchup-timeline[open]')||!current())return;const key=scope;if(clipsScope===key)return;clipsScope=key;void loadHomeHighlights().then(rows=>{if(current()&&scope===key){clips=rows;paint()}}).catch(()=>{if(scope===key)clipsScope=''})};root.addEventListener('toggle',toggle,true);
 const input=event=>{if(!momentum||!event.target.matches('[data-momentum-scrub]')||!getHost()?.contains(event.target))return;const view=dragging&&dragView?dragView:momentumView(),entry=view.entries[Number(event.target.value)];if(entry)selectMoment(entry.key,{announce:event.type==='change'})};
 const pointer=event=>{if(event.target.closest('[data-momentum-scrub]')&&getHost()?.contains(event.target)){dragging=true;dragView=momentumView()}};
 const release=()=>{const wasDragging=dragging;dragging=false;dragView=null;if(pendingPaint)paint();if(wasDragging)remember()};
 const keyup=event=>{if(momentum&&event.target.matches('[data-momentum-scrub]')&&getHost()?.contains(event.target))remember()};
 const visibility=()=>{if(document.hidden)release()};
 const observer=momentum?new MutationObserver(()=>{if(pendingPaint&&!covered()&&!dragging)paint()}):null;observer?.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
 const tab=()=>void update();root.addEventListener('click',click);root.addEventListener('dfl:clubhouse-tab',tab);root.addEventListener('input',input);root.addEventListener('change',input);root.addEventListener('keyup',keyup);root.addEventListener('pointerdown',pointer);document.addEventListener('pointerup',release);document.addEventListener('pointercancel',release);document.addEventListener('visibilitychange',visibility);
 return {update,items:()=>state.items,stop(){stopped=true;token++;observer?.disconnect();views.clear();prepared=null;recap.stop();root.removeEventListener('click',click);root.removeEventListener('toggle',toggle,true);root.removeEventListener('dfl:clubhouse-tab',tab);root.removeEventListener('input',input);root.removeEventListener('change',input);root.removeEventListener('keyup',keyup);root.removeEventListener('pointerdown',pointer);document.removeEventListener('pointerup',release);document.removeEventListener('pointercancel',release);document.removeEventListener('visibilitychange',visibility)}};
}
