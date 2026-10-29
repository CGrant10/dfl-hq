import {esc} from './ui.js';
import {playerPortrait} from './player-presentation.js';
import {patchGameDay} from './game-day-dom.js';
const name=t=>t.team_name||t.ownerName||`Team ${t.id}`;
export function tradeRouteTarget(parties,sends,id,to){
 id=String(id);to=String(to);
 if(sends.reduce((count,ids)=>count+[...ids||[]].map(String).filter(value=>value===id).length,0)!==1)return null;
 const owners=parties.filter((t,i)=>[...sends[i]||[]].map(String).includes(id)&&t.playerIds.map(String).includes(id));
 return owners.length===1&&parties.some(t=>String(t.id)===to&&String(t.id)!==String(owners[0].id))?to:null;
}
export function routingBoardMarkup(parties,state,pool,selected=''){
 const players=parties.flatMap((owner,i)=>[...state.sends[i]||[]].map(String).map(id=>({id,owner,player:pool.get(id),to:state.destinations?.[id]}))).filter(row=>row.player);
 if(parties.length<3||!players.length)return '';
 const chip=({id,owner,player})=>`<div class="td-route-chip" data-trade-player="${esc(id)}" id="td-route-player-${esc(id)}"><button type="button" data-td-route-select="${esc(id)}" aria-pressed="${selected===id}" aria-label="Choose recipient for ${esc(player.name)}"${parties.length<3?' disabled':''}>${playerPortrait(player)}<span><strong>${esc(player.name)}</strong><small>From ${esc(name(owner))}</small></span></button>${parties.length>2?`<button type="button" class="td-route-handle" data-td-route-drag="${esc(id)}" aria-label="Move ${esc(player.name)} to another team"><svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true"><path d="M5 4h1m4 0h1M5 10h1m4 0h1M5 16h1m4 0h1" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>`:''}</div>`;
 const unassigned=players.filter(row=>!tradeRouteTarget(parties,state.sends,row.id,row.to));
 return `<header><h3>Where they land</h3></header><div class="td-route-lanes">${parties.map(t=>`<section class="td-route-lane" data-td-route-zone="${esc(t.id)}"><header><strong>${esc(name(t))}</strong>${selected?`<button type="button" class="linkbtn" data-td-route-to="${esc(t.id)}"${!tradeRouteTarget(parties,state.sends,selected,t.id)?' disabled':''}>Send here</button>`:''}</header><div id="td-route-lane-${esc(t.id)}">${players.filter(row=>String(row.to)===String(t.id)&&tradeRouteTarget(parties,state.sends,row.id,t.id)).map(chip).join('')||'<span class="td-route-empty">No incoming players</span>'}</div></section>`).join('')}</div>${unassigned.length?`<div class="td-route-unassigned"><strong>Choose a destination</strong>${unassigned.map(chip).join('')}</div>`:''}${selected?'<button type="button" class="linkbtn" data-td-route-cancel>Cancel move</button>':''}`;
}
export function mountTradeRoutingBoard(host,{getParties,getState,pool,onMove}={}){
 let stopped=false,selected='',drag=null,ghost=null,frame=0,suppressUntil=0;
 const render=()=>{if(stopped||!host?.isConnected)return;const parties=getParties(),state=getState();if(selected&&!state.sends.some(ids=>ids.has(selected)))selected='';const markup=routingBoardMarkup(parties,state,pool,selected);host.hidden=!markup;patchGameDay(host,markup)};
 const clearDrag=()=>{cancelAnimationFrame(frame);frame=0;ghost?.remove();ghost=null;if(drag?.handle.hasPointerCapture?.(drag.id))drag.handle.releasePointerCapture(drag.id);drag=null;host?.querySelectorAll('[data-route-over]').forEach(n=>delete n.dataset.routeOver);};
 const arm=id=>{selected=id;render();host.querySelector('[data-td-route-to]:not(:disabled)')?.focus({preventScroll:true})};
 const move=(id,to)=>{const target=tradeRouteTarget(getParties(),getState().sends,id,to);if(!target||String(getState().destinations?.[id])===target)return false;selected='';onMove(id,target);render();host.querySelector(`[data-td-route-select="${CSS.escape(id)}"]`)?.focus({preventScroll:true});return true};
 const click=e=>{if(performance.now()<suppressUntil){e.preventDefault();return}const choose=e.target.closest('[data-td-route-select],[data-td-route-drag]');if(choose){arm(choose.dataset.tdRouteSelect||choose.dataset.tdRouteDrag);return}const target=e.target.closest('[data-td-route-to]');if(target){move(selected,target.dataset.tdRouteTo);return}if(e.target.closest('[data-td-route-cancel]')){selected='';render()}};
 const down=e=>{
  if(e.isPrimary===false){cancel();return}
  const handle=e.target.closest('[data-td-route-drag]');if(!handle||e.button!==0||e.isPrimary===false||drag)return;
  const id=handle.dataset.tdRouteDrag,chip=handle.closest('.td-route-chip');
  drag={id:e.pointerId,player:id,handle,chip,x:e.clientX,y:e.clientY,dx:0,dy:0,started:false,to:null,rect:chip.getBoundingClientRect(),zones:[...host.querySelectorAll('[data-td-route-zone]')].filter(z=>tradeRouteTarget(getParties(),getState().sends,id,z.dataset.tdRouteZone)).map(node=>({node,id:node.dataset.tdRouteZone,rect:node.getBoundingClientRect()}))};
  handle.setPointerCapture?.(e.pointerId);
 };
 const draw=()=>{frame=0;if(!drag?.started||!ghost)return;ghost.style.transform=`translate3d(${drag.dx}px,${drag.dy}px,0)`;for(const z of drag.zones){if(z.id===drag.to)z.node.dataset.routeOver='true';else delete z.node.dataset.routeOver}};
 const pointermove=e=>{
  if(!drag||drag.id!==e.pointerId)return;drag.dx=e.clientX-drag.x;drag.dy=e.clientY-drag.y;
  if(!drag.started&&Math.hypot(drag.dx,drag.dy)>=8){drag.started=true;suppressUntil=performance.now()+400;ghost=drag.chip.cloneNode(true);ghost.removeAttribute('id');ghost.className='td-route-ghost';ghost.setAttribute('aria-hidden','true');ghost.inert=true;ghost.setAttribute('popover','manual');ghost.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));const r=drag.rect;Object.assign(ghost.style,{left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`});document.body.append(ghost);if(ghost.showPopover)ghost.showPopover();}
  if(!drag.started)return;
  drag.to=drag.zones.find(z=>e.clientX>=z.rect.left&&e.clientX<=z.rect.right&&e.clientY>=z.rect.top&&e.clientY<=z.rect.bottom)?.id||null;
  if(!frame)frame=requestAnimationFrame(draw);
 };
 const up=e=>{if(!drag||drag.id!==e.pointerId)return;const {player,to,started}=drag;if(started)suppressUntil=performance.now()+400;clearDrag();if(started&&e.type==='pointerup'&&to)move(player,to)};
 const cancel=()=>{if(drag?.started)suppressUntil=performance.now()+400;clearDrag()};
 const key=e=>{if(e.key==='Escape'){cancel();selected='';render()}};
 host?.addEventListener('click',click);host?.addEventListener('pointerdown',down);host?.addEventListener('keydown',key);
 window.addEventListener('pointermove',pointermove,{passive:true});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);window.addEventListener('scroll',cancel,true);window.addEventListener('resize',cancel);document.addEventListener('visibilitychange',cancel);window.addEventListener('dfl:ui-motion-change',cancel);
 return {update(){cancel();render()},stop(){stopped=true;clearDrag();host?.removeEventListener('click',click);host?.removeEventListener('pointerdown',down);host?.removeEventListener('keydown',key);window.removeEventListener('pointermove',pointermove);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);window.removeEventListener('scroll',cancel,true);window.removeEventListener('resize',cancel);document.removeEventListener('visibilitychange',cancel);window.removeEventListener('dfl:ui-motion-change',cancel)}};
}
