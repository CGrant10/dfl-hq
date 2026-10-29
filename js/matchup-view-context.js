import {esc} from './ui.js';
const contexts=new WeakMap();
const known=v=>typeof v==='number'&&Number.isFinite(v);
// A recorded fantasy matchup travels with the viewing journey. NFL video scores
// remain separate; changing clips cannot replace this frozen fantasy context.
export function viewingMatchup(model,game){
 if(!model||game?.sides?.length!==2||!Number.isInteger(Number(model.week))||Number(model.week)<1||Number(model.week)>18||!Number.isInteger(Number(model.season))||Number(model.season)<2000)return null;
 if(!game.sides.every(s=>known(s.score)&&s.roster!=null&&s.name))return null;
 return {season:Number(model.season),week:Number(model.week),id:String(game.id),phase:model.completed?'Final':model.live?'In progress':'Recorded scores',sides:game.sides.map(s=>({roster:String(s.roster),name:String(s.name),score:s.score}))};
}
export function setViewingMatchup(node,context){if(node){if(context)contexts.set(node,context);else contexts.delete(node)}}
export function viewingMatchupFrom(source){
 for(let node=source;node;node=node.parentElement){const context=contexts.get(node);if(context)return context}
 return null;
}
export function matchupContextMarkup(context){
 if(!context)return '';
 return `<aside class="matchup-view-context" aria-label="DFL matchup scores"><small>DFL · Week ${esc(context.week)} <span>${esc(context.phase)}</span></small><div>${context.sides.map(s=>`<span><strong>${esc(s.name)}</strong><b>${s.score.toFixed(2)}</b></span>`).join('')}</div></aside>`;
}
export function applyViewingMatchup(dialog,source){
 const context=viewingMatchupFrom(source);setViewingMatchup(dialog,context);
 let slot=dialog.querySelector('[data-viewing-matchup]');
 if(!slot){slot=document.createElement('div');slot.dataset.viewingMatchup='';dialog.querySelector(':scope > header')?.append(slot)}
 slot.hidden=!context;slot.innerHTML=matchupContextMarkup(context);return context;
}
