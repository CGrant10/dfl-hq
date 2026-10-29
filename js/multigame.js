import {esc} from './ui.js';
import {multigameRows,reconcileGamePins} from './multigame-model.js';
import {loadNflGameSummary} from './nfl-game-center-data.js';
import {patchGameDay} from './game-day-dom.js';
import {currentMember} from './members.js';
export function multigameMarkup(games,pins,selected){
 const rows=pins.map(id=>games.find(g=>g.id===id)).filter(Boolean);
 return `<div class="multigame-head"><div><h3>Your games</h3></div><details id="multigame-edit"><summary>Edit games <b>${pins.length}/3</b></summary><div>${games.map(g=>`<label><input type="checkbox" data-desk-pin="${g.id}" ${pins.includes(g.id)?'checked':pins.length>=3?'disabled':''}><span>${esc(g.label)}</span></label>`).join('')}</div></details></div><div class="multigame-grid" data-no-swipe role="group" aria-label="Pinned NFL games">${rows.map(g=>`<article id="desk-game-${g.id}" class="multigame-card${g.id===selected?' is-selected':''}"><button type="button" data-desk-game="${g.id}" aria-pressed="${g.id===selected}" aria-label="Follow ${esc(g.label)} play-by-play"><small>${esc(g.status)}</small><div class="multigame-score">${g.sides.map(s=>`<span>${esc(s.code)}<b>${s.score??'—'}</b></span>`).join('')}</div><span class="multigame-people">${g.players.slice(0,2).map(p=>`<span class="${p.isMine?'is-mine':''}">${esc(p.name)}${typeof p.points==='number'?` <b>${p.points.toFixed(1)}</b>`:''}</span>`).join('')||'<span>No rostered offensive players</span>'}</span><span class="multigame-latest">${esc(g.failed?'Update unavailable':g.latest|| (g.state==='pre'?'Awaiting kickoff':'Open play-by-play'))}</span><span class="multigame-follow">${g.id===selected?'Following':'Follow game'} →</span></button></article>`).join('')||'<p class="network-empty">Pin up to three games to follow together.</p>'}</div>`;
}
export function mountMultigame(root,{getContext,active=()=>root.isConnected,onSelect=(_id)=>{},onChange=()=>{},member=()=>currentMember()?.id,loadSummary=loadNflGameSummary}={}){
 let stopped=false,generation=0,payload=null,games=[],pins=[],selected='',key='',busy=false;const summaries=new Map();
 const storageKey=()=>`dfl.nfl.pins.v1.${member()||'guest'}.${key}`;
 const paint=()=>{if(stopped||!root.isConnected)return;games=multigameRows(payload,getContext(),summaries);patchGameDay(root,multigameMarkup(games,pins,selected));root.hidden=!games.length};
 const save=()=>{try{localStorage.setItem(storageKey(),JSON.stringify(pins))}catch{}};
 const update=async(board,id)=>{
  if(stopped||!active()||document.hidden)return;payload=board;selected=id;const context=getContext(),next=`${context.season}:${context.week}`;
  if(next!==key){key=next;generation++;summaries.clear();games=multigameRows(payload,context);let saved=null;try{saved=JSON.parse(localStorage.getItem(storageKey())||'null')}catch{}pins=reconcileGamePins(saved,games)}else pins=reconcileGamePins(pins,multigameRows(payload,context));
  paint();if(busy)return;busy=true;const token=generation,requestedPins=[...pins];
  try{const rows=await Promise.allSettled(requestedPins.map(async id=>{const game=games.find(g=>g.id===id);return [id,await loadSummary(game,context.season)]}));if(stopped||token!==generation||!active()||document.hidden)return;
   rows.forEach((row,i)=>{if(row.status==='fulfilled')summaries.set(row.value[0],row.value[1]);else{const id=requestedPins[i];if(id)summaries.set(id,{...summaries.get(id),failed:true})}});paint();
  }finally{busy=false}
 };
 const click=e=>{const button=e.target.closest('[data-desk-game]');if(button){selected=button.dataset.deskGame;paint();onSelect(selected)}};
 const change=e=>{const box=e.target.closest('[data-desk-pin]');if(!box)return;const id=box.dataset.deskPin;if(box.checked&&pins.length<3)pins.push(id);else if(!box.checked)pins=pins.filter(v=>v!==id);save();paint();onChange();};
 root.classList.add('multigame-desk');root.addEventListener('click',click);root.addEventListener('change',change);
 return {update,select(id){selected=id;paint()},hasLive:()=>pins.some(id=>games.some(g=>g.id===id&&g.state==='in')),hasPending:()=>pins.some(id=>games.some(g=>g.id===id&&['in','pre'].includes(g.state))),stop(){stopped=true;generation++;root.removeEventListener('click',click);root.removeEventListener('change',change)}};
}
