import {mountPlayerQuickActions} from './player-quick-actions.js';
import {toast} from './ui.js';
let mountedDocument=null,unmount=null,playerModule=null;
const loadPlayer=()=>playerModule||=(import('./player-card.js').catch(error=>{playerModule=null;throw error}));
const usable=source=>source?.isConnected!==false&&!(source?.closest?.('dialog')&&(!source.closest('dialog').open||source.closest('dialog').dataset.uiClosing));
const targetFor=node=>node?.closest?.('[data-player-card]')
 ||(node?.closest?.('.dfl-player-portrait')&&node.closest('.dfl-player')?.querySelector('[data-player-card]'));
export function mountPlayerCards() {
 if(mountedDocument===document)return unmount;
 unmount?.();mountedDocument=document;const stopQuick=mountPlayerQuickActions();
 const doc=document;let intent=0;
 const cancel=()=>{intent++};
 // Warm only on an actual interaction, keeping the cold-start graph unchanged.
 const warm=event=>{if(targetFor(event.target))void loadPlayer().catch(()=>{})};
 const click=event=>{
  const compare=event.target.closest('[data-player-compare]');
  if(compare){const token=++intent;event.preventDefault();void import('./player-compare.js').then(({openPlayerComparison})=>{if(token===intent&&usable(compare))return openPlayerComparison(compare.dataset.playerCompare,{otherId:compare.dataset.compareWith||'',source:compare})}).catch(()=>{if(token===intent)toast('Player comparison unavailable. Tap again to retry.',true)});return}
  const target=targetFor(event.target);if(!target)return;
  event.preventDefault();const token=++intent,context=playerCardScope(target);
  const selection={id:target.dataset.playerCard,name:target.dataset.playerName,team:target.dataset.playerTeam};
  void loadPlayer().then(({openPlayerCard})=>{
   if(token!==intent||!usable(target)||target.dataset.playerCard!==selection.id)return;
   return openPlayerCard(selection,{source:target,...(context?{context}:{})});
  }).catch(()=>{if(token===intent)toast('Player card unavailable. Tap again to retry.',true)});
 };
 doc.addEventListener('pointerdown',warm,{passive:true});doc.addEventListener('focusin',warm);doc.addEventListener('click',click);
 globalThis.window?.addEventListener('hashchange',cancel);
 unmount=()=>{cancel();stopQuick?.();doc.removeEventListener?.('pointerdown',warm);doc.removeEventListener?.('focusin',warm);doc.removeEventListener?.('click',click);globalThis.window?.removeEventListener('hashchange',cancel);if(mountedDocument===doc)mountedDocument=null;};
 return unmount;
}

export function playerCardScope(source){
 const season=Number(source?.dataset.playerSeason),week=Number(source?.dataset.playerWeek);
 if(!Number.isInteger(season)||season<2000||!Number.isInteger(week)||week<1||week>18)return null;
 return {id:source.dataset.playerCard,season,week,state:['live','final','upcoming'].includes(source.dataset.playerState)?source.dataset.playerState:''};
}
