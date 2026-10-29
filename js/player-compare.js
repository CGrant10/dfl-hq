import {esc} from './ui.js';
import {playerPortrait} from './player-presentation.js';
import {loadPlayerComparison} from './player-compare-data.js';
import {comparisonCandidates,comparisonWeeks} from './player-compare-model.js';
import {comparisonMetricsMarkup} from './player-compare-summary.js';
import {mountDisclosureMotion} from './disclosure-motion.js';
import {exitSheet,mountSheetDrag} from './sheet-drag.js';
import {enterPlayerCard} from './player-card-motion.js';
import {fitDialogToViewport} from './dialog-viewport.js';
import {animateUi,cancelUiMotion,cancelUiExit} from './ui-motion.js';
import {connectPortrait} from './connected-portrait.js';
let dialog,body,drag,data,left='',right='',originId='',tab='week',picking=false,opener,portraitSource,request=0,stopConnection=()=>{},lastLoaded=0,session=0,pickFrame=0,connectionSide='left',detailRevision=0;
let selectedWeek=null,requestedContext=null,pickerMemory=null,disclosure=null,logOpen=false;
let stopEntrance=(_options={})=>{},entranceDone=Promise.resolve();
function stopPortrait(options={}){stopEntrance(options);cancelAnimationFrame(pickFrame);pickFrame=0;stopConnection();const heads=body?.querySelector('[data-compare-heads]');if(heads)cancelUiMotion(heads);}
const current=token=>token===request&&dialog.open&&!dialog.dataset.uiClosing;
function headers(){
 const host=body.querySelector('[data-compare-heads]');
 for(const [side,id]of [['left',left],['right',right]]){
  const slot=host.querySelector(`[data-compare-side="${side}"]`),p=data?.players.get(id);
  const stamp=JSON.stringify([id,p?.name,p?.position,p?.nflTeam,p?.injuryStatus,p?.isOut,data?.owners.get(id)]);
  if(slot.dataset.player===stamp&&slot.childElementCount)continue;slot.dataset.player=stamp;
  slot.innerHTML=p?`${playerPortrait(p)}<strong>${esc(p.name)}</strong><small>${esc([p.position,p.nflTeam].filter(Boolean).join(' · '))}${p.injuryStatus||p.isOut?`<em class="pc-compare-availability" data-out="${!!p.isOut||/\b(IR|OUT|PUP|DOUBTFUL)\b/i.test(p.injuryStatus||'')}" aria-label="Current injury tag">${esc(p.injuryStatus||'Out')}</em>`:''}</small><span>${esc(data.owners.get(id)||'Free agent')}</span><button type="button" class="linkbtn" data-compare-change="${side}">Change<span class="sr-only"> ${esc(p.name)}</span></button>`:`<button type="button" class="pc-compare-add" data-compare-change="${side}"><b aria-hidden="true">+</b>Choose player</button>`;
 }
}
function metrics(){
 const pane=body.querySelector('[data-compare-metrics]');if(!data||!left||!right){pane.innerHTML='';return}
 const scroll=body.scrollTop;disclosure?.stop();const log=pane.querySelector('.pc-compare-log');if(log)logOpen=log.open;
 const weeks=comparisonWeeks(data);
 if(!weeks.includes(Number(selectedWeek)))selectedWeek=Number(data.analysis.liveWeek);
 const control=body.querySelector('[data-compare-week]'),stamp=JSON.stringify([weeks,data.analysis.liveWeek]);
 if(control.dataset.weeks!==stamp){control.innerHTML=weeks.map(week=>`<option value="${week}">Week ${week}${week===Number(data.analysis.liveWeek)?' · Current':''}</option>`).join('');control.dataset.weeks=stamp;}
 control.value=String(selectedWeek);body.querySelector('[data-compare-scope]').hidden=tab!=='week';
 pane.innerHTML=comparisonMetricsMarkup(data,left,right,{tab,week:selectedWeek,logOpen});pane.setAttribute('aria-labelledby','player-compare-tab-'+tab);
 body.querySelector('[data-compare-tabs]').hidden=false;
 body.querySelectorAll('[data-compare-tab]').forEach(button=>{const selected=button.dataset.compareTab===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;button.id='player-compare-tab-'+button.dataset.compareTab});
 body.querySelector('[data-compare-tabs]').style.setProperty('--compare-tab',tab==='week'?0:1);
 disclosure=mountDisclosureMotion(dialog,{selector:'.pc-compare-log',active:()=>dialog.open&&!dialog.dataset.uiClosing});body.scrollTop=scroll;
}
function results(){
 const host=body.querySelector('[data-compare-results]');if(!data)return;
 const position=body.querySelector('[data-compare-position]').value,query=body.querySelector('[data-compare-search]').value;
 const side=body.dataset.pickingSide||'right',exclude=side==='right'?left:right;
 const rows=comparisonCandidates(data,{position,query,exclude});
 host.innerHTML=rows.length?rows.map(p=>`<button type="button" class="pc-compare-result" data-compare-pick="${esc(p.id)}">${playerPortrait(p)}<span><strong>${esc(p.name)}</strong><small>${esc([p.position,p.nflTeam,data.owners.get(p.id)||'Free agent'].filter(Boolean).join(' · '))}</small></span><span aria-hidden="true">+</span></button>`).join(''):'<p role="status">No matching players.</p>';
}
function pick(side='right'){
 pickerMemory=left&&right?{scroll:body.scrollTop,side}:null;
 detailRevision++;stopPortrait();picking=true;body.dataset.pickingSide=side;body.querySelector('[data-compare-picker-title]').textContent=`Change ${side==='left'?'left':'right'} player`;body.querySelector('[data-compare-picker]').hidden=false;body.querySelector('[data-compare-metrics]').hidden=true;body.querySelector('[data-compare-tabs]').hidden=true;body.querySelector('[data-compare-scope]').hidden=true;body.querySelector('[data-compare-cancel]').hidden=!pickerMemory;
 body.querySelector('[data-compare-search]').value='';body.querySelector('[data-compare-position]').value=data?.players.get(side==='right'?left:right)?.position||'';results();
 body.querySelector('[data-compare-search]').scrollIntoView({block:'nearest',behavior:'instant'});body.querySelector('[data-compare-search]').focus({preventScroll:true});
}
function cancelPick(){
 if(!pickerMemory)return;
 const memory=pickerMemory;pickerMemory=null;picking=false;body.querySelector('[data-compare-picker]').hidden=true;body.querySelector('[data-compare-metrics]').hidden=false;headers();metrics();body.scrollTop=memory.scroll;body.querySelector(`[data-compare-change="${memory.side}"]`)?.focus({preventScroll:true});
}
function close({immediate=false}={}){
 if(!dialog.open||dialog.dataset.uiClosing&&!immediate)return;
 const origin=connectionSide==='left'?stopConnection.position?.():null;stopPortrait({closing:true});
 if(!immediate&&!dialog.dataset.sheetMoving&&left===originId&&(dialog.dataset.playerCardStage!=='portrait'||origin)){const target=portraitSource?.isConnected?portraitSource:null;stopConnection=connectPortrait(body.querySelector('[data-compare-side="left"] .dfl-player-portrait'),target,{origin,hideSource:true,duration:280,easing:'cubic-bezier(.4,0,.2,1)'});}
 exitSheet(dialog,()=>{drag.reset();dialog.close()},{immediate,connected:!!stopConnection.position?.()});
}
function setup(){
 if(dialog)return;dialog=document.createElement('dialog');dialog.className='gameday-spotlight dfl-player-compare';dialog.setAttribute('aria-labelledby','player-compare-title');
 dialog.innerHTML='<header><span class="dfl-sheet-grip" aria-hidden="true"></span><h2 id="player-compare-title" tabindex="-1" autofocus>Compare players</h2><button type="button" class="linkbtn" data-compare-refresh aria-label="Refresh comparison">↻</button><button type="button" class="linkbtn" data-compare-close>Close</button></header><div class="pc-compare-body"></div>';
 document.body.append(dialog);body=dialog.querySelector('.pc-compare-body');
 drag=mountSheetDrag(dialog,{handle:dialog.querySelector('header'),dismiss:()=>close(),onStart:()=>stopPortrait()});
 dialog.addEventListener('cancel',event=>{event.preventDefault();if(picking&&pickerMemory)cancelPick();else close()});
 dialog.addEventListener('close',()=>{if(dialog.open)return;session++;request++;disclosure?.stop();disclosure=null;stopPortrait();cancelUiExit(dialog);cancelUiMotion(dialog);delete dialog.dataset.playerCardStage;dialog.style.removeProperty('clip-path');dialog.style.removeProperty('opacity');if(opener?.isConnected)opener.focus({preventScroll:true})});
 window.addEventListener('hashchange',()=>{if(dialog.open)close({immediate:true})});
 dialog.addEventListener('click',event=>{
  const target=event.target;if(target===dialog||target.closest('[data-compare-close]')){close();return}
  if(target.closest('[data-compare-refresh],[data-compare-retry]')){void load(true);return}
  if(target.closest('[data-compare-cancel]')){cancelPick();return}
  const change=target.closest('[data-compare-change]');if(change){pick(change.dataset.compareChange);return}
  const selected=target.closest('[data-compare-pick]');if(selected){
   detailRevision++;stopPortrait();const portrait=selected.querySelector('.dfl-player-portrait'),origin=portrait?.getBoundingClientRect(),side=body.dataset.pickingSide,epoch=session;
   if(!data.players.has(selected.dataset.comparePick)||selected.dataset.comparePick===(side==='left'?right:left))return;
   const memory=pickerMemory;pickerMemory=null;if(side==='left')left=selected.dataset.comparePick;else right=selected.dataset.comparePick;
   picking=false;headers();body.querySelector('[data-compare-picker]').hidden=true;body.querySelector('[data-compare-metrics]').hidden=false;metrics();body.scrollTop=memory?.scroll||0;
   (memory?body.querySelector(`[data-compare-change="${side}"]`):body.querySelector(`[data-compare-tab="${tab}"]`))?.focus({preventScroll:true});
   // Let the intentional picker scroll reset settle before connecting the copy.
   pickFrame=requestAnimationFrame(()=>{pickFrame=0;if(epoch!==session||!dialog.open||dialog.dataset.uiClosing||picking)return;connectionSide=side;const slot=body.querySelector(`[data-compare-side="${side}"]`);stopConnection=connectPortrait(portrait,slot.querySelector('.dfl-player-portrait'),{origin,duration:280});
    if(stopConnection.position?.())for(const copy of slot.querySelectorAll(':scope > strong,:scope > small,:scope > span:not(.dfl-player-portrait)'))animateUi(copy,[{opacity:0},{opacity:0,offset:.7},{opacity:1}],{duration:280,easing:'linear'});});return;
  }
  const button=target.closest('[data-compare-tab]');if(button){tab=button.dataset.compareTab;metrics();animateUi(body.querySelector('[data-compare-metrics]'),[{opacity:.7},{opacity:1}],{duration:160});}
 });
 body.addEventListener('input',event=>{if(event.target.matches('[data-compare-search]'))results()});body.addEventListener('change',event=>{if(event.target.matches('[data-compare-position]'))results();if(event.target.matches('[data-compare-week]')){selectedWeek=Number(event.target.value);metrics();}});
 body.addEventListener('keydown',event=>{const button=event.target.closest('[data-compare-tab]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'week':event.key==='End'?'trade':tab==='week'?'trade':'week';body.querySelector(`[data-compare-tab="${next}"]`).click();body.querySelector(`[data-compare-tab="${next}"]`).focus()});
}
async function load(refresh=false){
 const token=++request,settled=entranceDone,status=body.querySelector('[data-compare-status]'),refreshButton=dialog.querySelector('[data-compare-refresh]');refreshButton.disabled=true;status.textContent=data?'Updating…':'Loading players…';
 try{const next=await loadPlayerComparison({refresh});await settled;if(!current(token))return;data=next;if(requestedContext&&requestedContext.season===Number(data.analysis.projectionSeason)){selectedWeek=requestedContext.week;}requestedContext=null;lastLoaded=Date.now();stopPortrait();headers();body.querySelector('[data-compare-search]').disabled=false;status.textContent='';
  if(!data.players.has(left)||right&&!data.players.has(right)){status.textContent='Player unavailable.';return}
  if(picking){if(body.dataset.positionReady!=='1'){body.querySelector('[data-compare-position]').value=data.players.get(left)?.position||'';body.dataset.positionReady='1'}results()}else metrics();
 }catch{await settled;if(current(token))status.innerHTML='Couldn’t load comparison. <button type="button" class="linkbtn" data-compare-retry>Retry</button>'}
 finally{if(current(token))refreshButton.disabled=false}
}
export async function openPlayerComparison(id,{otherId='',source=document.activeElement}={}){
 setup();++session;++detailRevision;stopPortrait();connectionSide='left';cancelUiExit(dialog);drag.reset();dialog.style.removeProperty('clip-path');dialog.style.removeProperty('opacity');delete dialog.dataset.playerCardStage;opener=source;portraitSource=source?.closest('.dfl-player-card')?.querySelector('.player-card-hero .dfl-player-portrait')||source?.closest('.dfl-player')?.querySelector('.dfl-player-portrait');const card=source?.closest('.dfl-player-card');requestedContext=card?{season:Number(card.dataset.playerSeason),week:Number(card.querySelector('[data-player-game-week][aria-pressed=true]')?.dataset.playerGameWeek)}:null;selectedWeek=null;pickerMemory=null;logOpen=false;left=String(id);originId=left;right=String(otherId);if(right===left)right='';tab='week';picking=!right;request++;
 body.innerHTML=`<div class="pc-compare-heads" data-compare-heads><section data-compare-side="left"></section><section data-compare-side="right"></section></div><div class="pc-compare-tabs" data-compare-tabs role="tablist" aria-label="Comparison view" hidden><i aria-hidden="true"></i><button type="button" role="tab" aria-selected="true" data-compare-tab="week" aria-controls="player-compare-metrics">Weekly</button><button type="button" role="tab" aria-selected="false" data-compare-tab="trade" aria-controls="player-compare-metrics">Trade outlook</button></div><label class="pc-compare-scope" data-compare-scope hidden><span>Game week</span><select data-compare-week aria-label="Comparison week"></select></label><section data-compare-picker${picking?'':' hidden'}><div class="pc-compare-picker-head"><strong data-compare-picker-title>Choose a player</strong><button type="button" class="linkbtn" data-compare-cancel hidden>Cancel</button></div><div class="pc-compare-search"><label><span class="sr-only">Find a comparison player</span><input type="search" data-compare-search placeholder="Search players" disabled></label><label><span class="sr-only">Filter position</span><select data-compare-position>${[['','All positions'],...['QB','RB','WR','TE','K','DEF'].map(p=>[p,p])].map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label></div><div data-compare-results></div></section><section id="player-compare-metrics" role="tabpanel" data-compare-metrics${picking?' hidden':''}></section><p class="pc-compare-status" role="status" data-compare-status></p>`;
 const cached=Date.now()-lastLoaded<30000&&data;
 if(cached){if(requestedContext?.season===Number(data.analysis.projectionSeason))selectedWeek=requestedContext.week;requestedContext=null;headers();body.querySelector('[data-compare-search]').disabled=false;if(picking){body.querySelector('[data-compare-position]').value=data.players.get(left)?.position||'';body.dataset.positionReady='1';results()}else metrics()}
 else if(portraitSource){const portrait=portraitSource.cloneNode(true);portrait.removeAttribute('style');portrait.querySelector('img')?.removeAttribute('style');for(const name of ['--player-primary','--player-secondary'])portrait.style.setProperty(name,getComputedStyle(portraitSource).getPropertyValue(name));body.querySelector('[data-compare-side="left"]').append(portrait)}
 body.dataset.pickingSide='right';body.dataset.positionReady=cached?'1':'0';body.scrollTop=0;dialog.querySelector('[data-compare-refresh]').disabled=false;dialog.dataset.playerCardStage='portrait';if(!dialog.open)dialog.showModal();fitDialogToViewport(dialog);dialog.querySelector('h2').focus({preventScroll:true});
 const entrance=enterPlayerCard(dialog,portraitSource,{target:'[data-compare-side="left"] .dfl-player-portrait'});stopEntrance=entrance.stop;stopConnection=entrance.connection;entranceDone=entrance.finished;
 if(!cached)await load();
}
