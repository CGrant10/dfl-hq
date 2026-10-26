import {esc} from './ui.js';
import {playerPortrait} from './player-presentation.js';
import {loadGameDayMoments} from './game-day-moments.js';
import {mountMomentRecap} from './moment-recap.js';
import {matchupStory} from './matchup-story.js';
import {isFootballMomentKey} from './football-moments.js';
import {patchGameDay} from './game-day-dom.js';

export function matchupHighlightsHtml(state,gameId,{final=false}={}){
 const items=(state.items||[]).filter(m=>m.matchupId===String(gameId));
 return `<section class="matchup-highlights" aria-label="Matchup highlights"><header><h3>${final?'Final story':'Matchup highlights'}</h3>${items.length||final?'<button type="button" class="linkbtn" data-highlights-recap>Play recap →</button>':''}</header>${items.length?`<ol>${items.slice(0,3).map(m=>`<li><button type="button" data-highlight="${esc(m.eventKey||m.key)}">${m.player?playerPortrait(m.player):'<span class="moment-mini-mark" aria-hidden="true">↗</span>'}<span><strong>${esc(m.title||(m.kind==='lead'?'Lead change':m.kind==='surge'?'Scoring surge':'Big day'))}</strong><span>${esc(m.text)}</span></span></button></li>`).join('')}</ol>`:''}${state.message?`<p role="status">${esc(state.message)}</p>`:!items.length?`<p role="status">${state.busy?'Loading highlights…':state.error?'Highlights unavailable.':'No saved highlights yet.'}</p>`:''}${state.error||state.message?'<button type="button" class="linkbtn" data-highlights-retry>Retry highlights</button>':''}${state.more?`<button type="button" class="linkbtn" data-highlights-more${state.busy?' disabled':''}>Earlier highlights</button>`:''}</section>`;
}

export function mountMatchupHighlights(root,{getModel,getGame,getPlayers=()=>({}),getHost,getMotion=()=>true,active=()=>root.isConnected,load=loadGameDayMoments}={}){
 let stopped=false,scope='',checked=0,lastWanted=null,token=0,state={items:[],busy:false,error:false,message:'',cursor:null,more:false};
 const consumed=new Set();
 const recap=mountMomentRecap({getMotion,returnFocus:()=>getHost()?.querySelector('[data-highlights-recap]'),getContext:()=>({season:getModel()?.season,week:getModel()?.week}),getFinish:()=>matchupStory(getModel(),getGame(),state.items)});
 const current=()=>!stopped&&root.isConnected&&active();
 const paint=()=>{const host=getHost();if(host&&current())patchGameDay(host,matchupHighlightsHtml(state,getGame()?.id,{final:!!matchupStory(getModel(),getGame(),state.items)}))};
 const route=()=>{const params=new URLSearchParams(location.hash.split('?')[1]||''),m=getModel();return params.get('matchup')===String(getGame()?.id)&&Number(params.get('season'))===m?.season&&Number(params.get('week'))===m?.week&&isFootballMomentKey(params.get('moment'))?params.get('moment'):null};
 const open=(startKey=null)=>recap.open(state.items,getGame()?.id,{startKey});
 const update=async({force=false,earlier=false}={})=>{
  if(!current())return;
  const model=getModel(),game=getGame();if(!model||!game)return;
  const nextScope=JSON.stringify([model.leagueId,model.season,model.week,game.id]);
  if(nextScope!==scope){scope=nextScope;token++;checked=0;lastWanted=null;state={items:[],busy:false,error:false,message:'',cursor:null,more:false}}
  const wanted=route();
  if(state.busy||!earlier&&!force&&Date.now()-checked<60000&&wanted===lastWanted)return;
  const request=++token;state.busy=true;state.error=false;state.message='';if(!state.items.length)paint();
  try{
   const data=await load(model,getPlayers(),{gameId:game.id,before:earlier?state.cursor:null});
   if(!current()||request!==token)return;
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
    if(state.items.some(m=>m.eventKey===wanted)){consumed.add(wanted);paint();open(wanted)}else state.message='This highlight is unavailable.';
   }
  }catch{if(request===token&&current())state.error=true}
  finally{if(request===token&&!stopped){state.busy=false;if(current())paint()}}
 };
 const click=event=>{
  if(!getHost()?.contains(event.target))return;
  const selected=event.target.closest('[data-highlight]');
  if(selected){open(selected.dataset.highlight);return}
  if(event.target.closest('[data-highlights-recap]'))open();
  else if(event.target.closest('[data-highlights-retry]'))void update({force:true});
  else if(event.target.closest('[data-highlights-more]'))void update({earlier:true});
 };
 const tab=()=>void update();root.addEventListener('click',click);root.addEventListener('dfl:clubhouse-tab',tab);
 return {update,items:()=>state.items,stop(){stopped=true;token++;recap.stop();root.removeEventListener('click',click);root.removeEventListener('dfl:clubhouse-tab',tab)}};
}
