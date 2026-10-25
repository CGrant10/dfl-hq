import {esc} from './ui.js';
import {playerPortrait} from './player-presentation.js';
import {loadPlayerCard} from './player-card-data.js';
import {currentMember} from './members.js';
import {SLEEPER_APP_URL} from './sleeper-links.js';
import {mountSheetDrag,enterSheet,exitSheet} from './sheet-drag.js';
import {fitDialogToViewport} from './dialog-viewport.js';

let active=null;
export function openPlayerQuickMenu(source,{opener=source,beforeView=()=>{}}={}){
 active?.();const id=source.dataset.playerCard||source.dataset.gamedayPlayer;if(!id)return;
 const container=source.closest('dialog,#view');
 const currentSource=()=>source.isConnected?source:container?.querySelector(source.dataset.gamedayPlayer?`[data-gameday-player="${CSS.escape(id)}"][data-player-roster="${CSS.escape(source.dataset.playerRoster||'')}"]`:`[data-player-card="${CSS.escape(id)}"]`);
 const identity=source.closest('.dfl-player'),name=source.dataset.playerName||identity?.querySelector('.player-card-trigger')?.textContent?.trim()||source.getAttribute('aria-label')?.replace(/^View | player card$/g,'')||'Player';
 const dialog=document.createElement('dialog');dialog.className='dfl-action-sheet player-quick-menu';dialog.setAttribute('aria-labelledby','player-quick-title');
 dialog.innerHTML=`<header><span class="dfl-sheet-grip" aria-hidden="true"></span><h2 id="player-quick-title">Player actions</h2><button type="button" class="linkbtn" data-close>Close</button></header><div class="player-quick-identity" aria-hidden="true">${playerPortrait({id,name})}<strong>${esc(name)}</strong></div><nav aria-label="Player quick actions"><button type="button" data-view>View player <span aria-hidden="true">→</span></button><a data-trade hidden>Build trade <span aria-hidden="true">→</span></a><a href="${SLEEPER_APP_URL}" target="_blank" rel="noopener noreferrer">Open Sleeper <span aria-hidden="true">→</span></a></nav>`;
 let closed=false,returnFocus=true;
 const cleanup=()=>{if(closed)return;closed=true;drag.stop();window.removeEventListener('hashchange',immediate);dialog.remove();if(returnFocus)(opener?.isConnected?opener:currentSource())?.focus({preventScroll:true});if(active===immediate)active=null};
 const dismiss=()=>exitSheet(dialog,()=>{dialog.close();cleanup()});
 const immediate=()=>{dialog.close();cleanup()};
 const drag=mountSheetDrag(dialog,{handle:dialog.querySelector('header'),dismiss});active=immediate;
 dialog.querySelector('[data-close]').onclick=dismiss;
 dialog.querySelector('[data-view]').onclick=()=>{returnFocus=false;beforeView();const target=currentSource();immediate();target?.click()};
 dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss()});dialog.addEventListener('close',cleanup);
 dialog.addEventListener('click',e=>{if(e.target===dialog)dismiss()});
 window.addEventListener('hashchange',immediate);document.body.append(dialog);dialog.showModal();fitDialogToViewport(dialog);enterSheet(dialog);dialog.querySelector('[data-view]').focus({preventScroll:true});
 const member=currentMember()?.id;
 // Existing cached card loader supplies roster ownership only after a hold.
 void loadPlayerCard({id}).then(model=>{
  if(closed||(currentMember()?.id)!==member)return;
  dialog.querySelector('.player-quick-identity').innerHTML=`${playerPortrait(model.player)}<strong>${esc(model.player.name)}</strong>`;
  const target=dialog.querySelector('[data-trade]');
  if(model.owner&&model.myRosterId!=null&&String(model.owner.id)!==String(model.myRosterId)&&currentMember()?.sleeper_user_id){target.href=`#/trade?team=${encodeURIComponent(model.myRosterId)}&target=${encodeURIComponent(id)}&partner=${encodeURIComponent(model.owner.id)}`;target.hidden=false}
 }).catch(()=>{});
 return immediate;
}
