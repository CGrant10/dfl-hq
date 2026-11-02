import {esc} from './ui.js';
import {multigameRows} from './multigame-model.js';
import {patchGameDay} from './game-day-dom.js';
export function multigameMarkup(games,selected){
 const rows=games;
 return `<div class="multigame-head"><h3>NFL games</h3><span>${games.length} ${games.length===1?'game':'games'}</span></div><div class="multigame-grid" data-no-swipe role="group" aria-label="All NFL games">${rows.map(g=>`<article id="desk-game-${g.id}" class="multigame-card${g.id===selected?' is-selected':''}"><button type="button" data-desk-game="${g.id}" aria-pressed="${g.id===selected}" aria-label="Follow ${esc(g.label)} play-by-play"><small>${esc(g.status)}</small><div class="multigame-score">${g.sides.map(s=>`<span>${esc(s.code)}<b>${s.score??'—'}</b></span>`).join('')}</div><span class="multigame-people">${g.players.slice(0,2).map(p=>`<span class="${p.isMine?'is-mine':''}">${esc(p.name)}${typeof p.points==='number'?` <b>${p.points.toFixed(1)}</b>`:''}</span>`).join('')||''}</span><span class="multigame-latest">${esc(g.failed?'Update unavailable':g.latest|| (g.state==='pre'?'Awaiting kickoff':'Open play-by-play'))}</span><span class="multigame-follow">${g.id===selected?'Following':'Follow game'} →</span></button></article>`).join('')||'<p class="network-empty">No NFL games this week.</p>'}</div>`;
}
export function mountMultigame(root,{getContext,active=()=>root.isConnected,onSelect=(_id)=>{}}={}){
 let stopped=false,payload=null,games=[],selected='',key='',revealed='',frame=0;const summaries=new Map();
 const reveal=()=>{
  if(frame||revealed===selected)return;
  frame=requestAnimationFrame(()=>{frame=0;if(stopped||!active())return;
   const rail=root.querySelector('.multigame-grid'),button=rail?.querySelector('[aria-pressed="true"]');
   if(!rail?.clientWidth||!button)return;
   const r=rail.getBoundingClientRect(),b=button.getBoundingClientRect();
   if(b.left<r.left||b.right>r.right)rail.scrollLeft+=b.left-r.left-(r.width-b.width)/2;
   revealed=selected;
  });
 };
 const paint=()=>{if(stopped||!root.isConnected)return;games=multigameRows(payload,getContext(),summaries);patchGameDay(root,multigameMarkup(games,selected));root.hidden=!games.length;reveal()};
 const update=(board,id)=>{
  if(stopped||!active()||document.hidden)return;payload=board;selected=id;
  const context=getContext(),next=`${context.season}:${context.week}`;
  if(next!==key){key=next;revealed='';summaries.clear()}
  paint();
 };
 const click=e=>{const button=e.target.closest('[data-desk-game]');if(button){selected=button.dataset.deskGame;paint();onSelect(selected)}};
 root.classList.add('multigame-desk');root.addEventListener('click',click);
 return {update,summary(game,result){if(stopped||!active()||document.hidden||!games.some(g=>g.id===game.id))return;summaries.set(game.id,result);paint()},select(id){selected=id;paint()},hasLive:()=>games.some(g=>g.state==='in'),hasPending:()=>games.some(g=>['in','pre'].includes(g.state)),stop(){stopped=true;cancelAnimationFrame(frame);summaries.clear();root.removeEventListener('click',click)}};
}
