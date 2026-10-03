import {loadWeeklyStats} from './sleeper.js';
import {spotlightStats} from './player-spotlight-model.js';
import {playerIdentity} from './player-presentation.js';
import {esc} from './ui.js';
export function mountPlayerSpotlight(root,{getModel}){
 const dialog=document.createElement('dialog');dialog.className='gameday-spotlight';dialog.setAttribute('aria-labelledby','gameday-spotlight-title');
 dialog.innerHTML='<header><h2 id="gameday-spotlight-title">Player spotlight</h2><button type="button" class="linkbtn" data-close-spotlight aria-label="Close player spotlight">Close</button></header><div data-spotlight-body></div>';
 root.appendChild(dialog);const body=dialog.querySelector('[data-spotlight-body]');let selection=null,bundle=null,loading=false,failed=false,request=0,stopped=false;
 const player=()=>getModel()?.games.flatMap(g=>g.sides).flatMap(t=>[...t.lineup,...t.bench]).find(p=>p.id===selection?.id&&p.roster===selection?.roster&&!p.empty);
 const render=()=>{
  const p=player(),model=getModel();if(!p||!model)return;
  const stats=spotlightStats(p,bundle?.data||[],model),status={live:'Live',final:'Final',upcoming:'Upcoming',unknown:'Status pending'}[p.state]||'Status pending';
  body.innerHTML=`${playerIdentity(p)}<div class="gameday-spotlight-score"><span><small>Fantasy points</small><strong>${p.points==null?'—':p.points.toFixed(2)}</strong></span><span>${esc(status)} · Week ${model.week}</span></div>${stats.items.length?`<dl class="gameday-stat-grid">${stats.items.map(s=>`<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('')}</dl>`:`<p role="status">${loading?'Loading game stats…':failed?'Game stats unavailable.':'No game stats yet.'}</p>`}${stats.updatedAt?`<time class="gameday-stat-time" datetime="${esc(new Date(stats.updatedAt).toISOString())}">Stats · ${esc(new Date(stats.updatedAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}))}${bundle?.stale?' · Last available':''}</time>`:''}`;
 };
 const load=async()=>{
  if(loading||!dialog.open||stopped)return;const model=getModel();if(!model)return;const mine=++request;loading=true;failed=false;render();
  try{const result=await loadWeeklyStats(model.season,model.week,{maxAgeMs:60000});if(stopped||mine!==request)return;bundle=result}
  catch{if(mine===request)failed=true}
  finally{if(mine===request){loading=false;if(dialog.open&&!stopped)render()}}
 };
 const click=event=>{const button=event.target.closest('[data-gameday-player]');if(!button)return;selection={id:button.dataset.gamedayPlayer,roster:button.dataset.playerRoster};bundle=null;failed=false;render();dialog.showModal();void load()};
 root.addEventListener('click',click);
 dialog.querySelector('[data-close-spotlight]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 dialog.addEventListener('close',()=>{request++;loading=false;const old=selection;selection=null;if(!stopped&&root.isConnected)[...root.querySelectorAll('[data-gameday-player]')].find(b=>b.dataset.gamedayPlayer===old?.id&&b.dataset.playerRoster===old?.roster)?.focus({preventScroll:true})});
 return{update(){if(dialog.open){render();void load()}},stop(){stopped=true;request++;root.removeEventListener('click',click);dialog.close();dialog.remove()}};
}
