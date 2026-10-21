import {esc} from './ui.js';
import {playerPortrait} from './player-presentation.js';
import {loadPlayerComparison} from './player-compare-data.js';
import {comparisonCandidates,comparisonPlayer} from './player-compare-model.js';
import {enterSheet,exitSheet,mountSheetDrag} from './sheet-drag.js';
import {fitDialogToViewport} from './dialog-viewport.js';
import {animateUi,cancelUiMotion,cancelUiExit} from './ui-motion.js';
import {connectPortrait} from './connected-portrait.js';
let dialog,body,drag,data,left='',right='',originId='',tab='week',picking=false,opener,portraitSource,request=0,stopConnection=()=>{},lastLoaded=0,session=0,pickFrame=0,connectionSide='left',detailRevision=0;
function stopPortrait(){cancelAnimationFrame(pickFrame);pickFrame=0;stopConnection();const heads=body?.querySelector('[data-compare-heads]');if(heads)cancelUiMotion(heads);}
const fmt=(n,d=1)=>n!=null&&Number.isFinite(Number(n))?Number(n).toFixed(d):'—';
const current=token=>token===request&&dialog.open&&!dialog.dataset.uiClosing;
function headers(){
 const host=body.querySelector('[data-compare-heads]');
 for(const [side,id]of [['left',left],['right',right]]){
  const slot=host.querySelector(`[data-compare-side="${side}"]`),p=data?.players.get(id);
  const stamp=JSON.stringify([id,p?.name,p?.position,p?.nflTeam,data?.owners.get(id)]);
  if(slot.dataset.player===stamp&&slot.childElementCount)continue;slot.dataset.player=stamp;
  slot.innerHTML=p?`${playerPortrait(p)}<strong>${esc(p.name)}</strong><small>${esc([p.position,p.nflTeam].filter(Boolean).join(' · '))}</small><span>${esc(data.owners.get(id)||'Free agent')}</span><button type="button" class="linkbtn" data-compare-change="${side}">Change<span class="sr-only"> ${esc(p.name)}</span></button>`:`<button type="button" class="pc-compare-add" data-compare-change="${side}"><b aria-hidden="true">+</b>Choose player</button>`;
 }
}
function row(label,a,b,{rank=false,highlight=false}={}){
 const known=v=>typeof v==='number'&&Number.isFinite(v),winner=highlight&&known(a)&&known(b)&&a!==b?(rank?a<b:a>b)?0:1:-1;
 return `<div class="pc-compare-row"><span>${esc(label)}</span>${[a,b].map((value,i)=>`<b${winner===i?' class="is-edge"':''}>${esc(value==null?'—':typeof value==='number'?fmt(value):value)}</b>`).join('')}</div>`;
}
function metrics(){
 const pane=body.querySelector('[data-compare-metrics]');if(!data||!left||!right){pane.innerHTML='';return}
 const pair=[comparisonPlayer(data,left),comparisonPlayer(data,right)];if(pair.some(p=>!p))return;
 const [a,b]=pair,same=a.player.position===b.player.position,paired=fn=>pair.map(fn),weekLabel=a.week?`Week ${a.week}`:'Week pending';
 let content;
 if(tab==='week'){
  const game=p=>p.bye?'No game':p.gameState==='live'?'Live':p.gameState==='final'?'Final':p.opponent?`vs ${p.opponent}`:'Opponent pending';
  const kickoff=p=>{const at=Date.parse(p.kickoff);return Number.isFinite(at)?new Date(at).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}):'—'};
  content=`<h3>${esc(weekLabel)} · ${esc(String(data.analysis.leagueFormat?.scoring||'league scoring').toUpperCase())}</h3>${row('Projection',...paired(p=>p.projection),{highlight:same})}${row('Matchup',...paired(game))}${row('Kickoff',...paired(kickoff))}${row('Injury tag',...paired(p=>p.injury))}<h3>Recent completed games</h3>${row('Average',a.average,b.average,{highlight:same})}${row('Low–high',...paired(p=>p.range?`${fmt(p.range[0])}–${fmt(p.range[1])}`:null))}${row('Games sampled',...paired(p=>String(p.recent.length)))}<div class="pc-compare-history">${pair.map(p=>`<div aria-label="${esc(p.player.name)} recent scores">${p.recent.map(r=>`<span><small>W${esc(r.week)}</small><b>${fmt(r.points)}</b></span>`).join('')||'<span>—</span>'}</div>`).join('')}</div><p class="pc-compare-source">Sleeper · League scoring${data.projectionsStale?' · Cached projections':''}</p>`;
 }else{
  const source=data.analysis.expertConsensus,at=source?.updatedAt?new Date(source.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'';
  content=`<h3>Rest of season</h3>${row('DFL value /100',a.tradeValue,b.tradeValue,{highlight:same})}${row('FantasyPros overall',...paired(p=>p.expert?`#${p.expert.rank}`:null))}${row('FantasyPros position',...paired(p=>p.expert?`${p.player.position}${p.expert.positionRank}`:null))}${row('DFL owner',a.owner,b.owner)}<p class="pc-compare-source">FantasyPros ROS · ${esc(source?.status||'Unavailable')}${at?` · ${esc(at)}`:''}</p>`;
 }
 pane.innerHTML=content;pane.setAttribute('aria-labelledby','player-compare-tab-'+tab);
 body.querySelector('[data-compare-tabs]').hidden=false;
 body.querySelectorAll('[data-compare-tab]').forEach(button=>{const selected=button.dataset.compareTab===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;button.id='player-compare-tab-'+button.dataset.compareTab});
 body.querySelector('[data-compare-tabs]').style.setProperty('--compare-tab',tab==='week'?0:1);
}
function results(){
 const host=body.querySelector('[data-compare-results]');if(!data)return;
 const position=body.querySelector('[data-compare-position]').value,query=body.querySelector('[data-compare-search]').value;
 const side=body.dataset.pickingSide||'right',exclude=side==='right'?left:right;
 const rows=comparisonCandidates(data,{position,query,exclude});
 host.innerHTML=rows.length?rows.map(p=>`<button type="button" class="pc-compare-result" data-compare-pick="${esc(p.id)}">${playerPortrait(p)}<span><strong>${esc(p.name)}</strong><small>${esc([p.position,p.nflTeam,data.owners.get(p.id)||'Free agent'].filter(Boolean).join(' · '))}</small></span><span aria-hidden="true">+</span></button>`).join(''):'<p role="status">No matching players.</p>';
}
function pick(side='right'){
 detailRevision++;stopPortrait();picking=true;body.dataset.pickingSide=side;body.querySelector('[data-compare-picker]').hidden=false;body.querySelector('[data-compare-metrics]').hidden=true;body.querySelector('[data-compare-tabs]').hidden=true;
 body.querySelector('[data-compare-search]').value='';body.querySelector('[data-compare-position]').value=data?.players.get(side==='right'?left:right)?.position||'';results();
 body.querySelector('[data-compare-search]').focus({preventScroll:true});
}
function close({immediate=false}={}){
 if(!dialog.open||dialog.dataset.uiClosing&&!immediate)return;
 const origin=connectionSide==='left'?stopConnection.position?.():null;stopPortrait();
 if(!immediate&&!dialog.dataset.sheetMoving&&left===originId){const target=portraitSource?.isConnected?portraitSource:null;stopConnection=connectPortrait(body.querySelector('[data-compare-side="left"] .dfl-player-portrait'),target,{origin,hideSource:true,duration:280,easing:'cubic-bezier(.4,0,.2,1)'});}
 exitSheet(dialog,()=>{drag.reset();dialog.close()},{immediate,connected:!!stopConnection.position?.()});
}
function setup(){
 if(dialog)return;dialog=document.createElement('dialog');dialog.className='gameday-spotlight dfl-player-compare';dialog.setAttribute('aria-labelledby','player-compare-title');
 dialog.innerHTML='<header><span class="dfl-sheet-grip" aria-hidden="true"></span><h2 id="player-compare-title" tabindex="-1" autofocus>Compare players</h2><button type="button" class="linkbtn" data-compare-refresh aria-label="Refresh comparison">↻</button><button type="button" class="linkbtn" data-compare-close>Close</button></header><div class="pc-compare-body"></div>';
 document.body.append(dialog);body=dialog.querySelector('.pc-compare-body');
 drag=mountSheetDrag(dialog,{handle:dialog.querySelector('header'),dismiss:()=>close(),onStart:()=>stopPortrait()});
 dialog.addEventListener('cancel',event=>{event.preventDefault();close()});
 dialog.addEventListener('close',()=>{session++;request++;stopPortrait();cancelUiExit(dialog);cancelUiMotion(dialog);if(opener?.isConnected)opener.focus({preventScroll:true})});
 window.addEventListener('hashchange',()=>{if(dialog.open)close({immediate:true})});
 dialog.addEventListener('click',event=>{
  const target=event.target;if(target===dialog||target.closest('[data-compare-close]')){close();return}
  if(target.closest('[data-compare-refresh],[data-compare-retry]')){void load(true);return}
  const change=target.closest('[data-compare-change]');if(change){pick(change.dataset.compareChange);return}
  const selected=target.closest('[data-compare-pick]');if(selected){
   detailRevision++;stopPortrait();const portrait=selected.querySelector('.dfl-player-portrait'),origin=portrait?.getBoundingClientRect(),side=body.dataset.pickingSide,epoch=session;
   if(side==='left')left=selected.dataset.comparePick;else right=selected.dataset.comparePick;
   picking=false;headers();body.querySelector('[data-compare-picker]').hidden=true;body.querySelector('[data-compare-metrics]').hidden=false;metrics();body.scrollTop=0;
   body.querySelector(`[data-compare-tab="${tab}"]`).focus({preventScroll:true});
   // Let the intentional picker scroll reset settle before connecting the copy.
   pickFrame=requestAnimationFrame(()=>{pickFrame=0;if(epoch!==session||!dialog.open||dialog.dataset.uiClosing||picking)return;connectionSide=side;const slot=body.querySelector(`[data-compare-side="${side}"]`);stopConnection=connectPortrait(portrait,slot.querySelector('.dfl-player-portrait'),{origin,duration:280});
    if(stopConnection.position?.())for(const copy of slot.querySelectorAll(':scope > strong,:scope > small,:scope > span:not(.dfl-player-portrait)'))animateUi(copy,[{opacity:0},{opacity:0,offset:.7},{opacity:1}],{duration:280,easing:'linear'});});return;
  }
  const button=target.closest('[data-compare-tab]');if(button){tab=button.dataset.compareTab;metrics();animateUi(body.querySelector('[data-compare-metrics]'),[{opacity:.7},{opacity:1}],{duration:160});}
 });
 body.addEventListener('input',event=>{if(event.target.matches('[data-compare-search]'))results()});body.addEventListener('change',event=>{if(event.target.matches('[data-compare-position]'))results()});
 body.addEventListener('keydown',event=>{const button=event.target.closest('[data-compare-tab]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'week':event.key==='End'?'trade':tab==='week'?'trade':'week';body.querySelector(`[data-compare-tab="${next}"]`).click();body.querySelector(`[data-compare-tab="${next}"]`).focus()});
}
async function load(refresh=false){
 const token=++request,status=body.querySelector('[data-compare-status]'),refreshButton=dialog.querySelector('[data-compare-refresh]');refreshButton.disabled=true;status.textContent=data?'Updating…':'Loading players…';
 try{const next=await loadPlayerComparison({refresh});if(!current(token))return;data=next;lastLoaded=Date.now();stopPortrait();headers();body.querySelector('[data-compare-search]').disabled=false;status.textContent='';
  if(!data.players.has(left)||right&&!data.players.has(right)){status.textContent='Player unavailable.';return}
  if(picking){if(body.dataset.positionReady!=='1'){body.querySelector('[data-compare-position]').value=data.players.get(left)?.position||'';body.dataset.positionReady='1'}results()}else metrics();
 }catch{if(current(token))status.innerHTML='Couldn’t load comparison. <button type="button" class="linkbtn" data-compare-retry>Retry</button>'}
 finally{if(current(token))refreshButton.disabled=false}
}
export async function openPlayerComparison(id,{otherId='',source=document.activeElement}={}){
 setup();const epoch=++session,revision=++detailRevision;stopPortrait();connectionSide='left';cancelUiExit(dialog);drag.reset();opener=source;portraitSource=source?.closest('.dfl-player-card')?.querySelector('.player-card-hero .dfl-player-portrait')||source?.closest('.dfl-player')?.querySelector('.dfl-player-portrait');left=String(id);originId=left;right=String(otherId);if(right===left)right='';tab='week';picking=!right;request++;
 body.innerHTML=`<div class="pc-compare-heads" data-compare-heads><section data-compare-side="left"></section><section data-compare-side="right"></section></div><div class="pc-compare-tabs" data-compare-tabs role="tablist" aria-label="Comparison view" hidden><i aria-hidden="true"></i><button type="button" role="tab" aria-selected="true" data-compare-tab="week" aria-controls="player-compare-metrics">This week</button><button type="button" role="tab" aria-selected="false" data-compare-tab="trade" aria-controls="player-compare-metrics">Trade outlook</button></div><section data-compare-picker${picking?'':' hidden'}><div class="pc-compare-search"><label><span class="sr-only">Find a comparison player</span><input type="search" data-compare-search placeholder="Search players" disabled></label><label><span class="sr-only">Filter position</span><select data-compare-position>${[['','All positions'],...['QB','RB','WR','TE','K','DEF'].map(p=>[p,p])].map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label></div><div data-compare-results></div></section><section id="player-compare-metrics" role="tabpanel" data-compare-metrics${picking?' hidden':''}></section><p class="pc-compare-status" role="status" data-compare-status></p>`;
 body.dataset.pickingSide='right';body.dataset.positionReady='0';body.scrollTop=0;dialog.querySelector('[data-compare-refresh]').disabled=false;if(!dialog.open)dialog.showModal();fitDialogToViewport(dialog);dialog.querySelector('h2').focus({preventScroll:true});
 const entrance=enterSheet(dialog),settled=entrance?.finished.catch(()=>{})||Promise.resolve();
 const pending=Date.now()-lastLoaded<30000&&data?Promise.resolve().then(()=>{headers();body.querySelector('[data-compare-search]').disabled=false;if(picking){body.querySelector('[data-compare-position]').value=data.players.get(left)?.position||'';body.dataset.positionReady='1';results()}else metrics()}):load();
 await Promise.all([settled,pending]);if(epoch!==session||revision!==detailRevision||!dialog.open||dialog.dataset.uiClosing||dialog.dataset.sheetMoving)return;
 stopConnection=connectPortrait(portraitSource,body.querySelector('[data-compare-side="left"] .dfl-player-portrait'));
}
