import {esc} from './ui.js';
import {tradeSafeguards} from './trade-roster-context.js';
export function tradeCoverageMarkup(result,pool,{compact=false,parties=[]}={}){
 const rows=tradeSafeguards(result).flatMap((context,i)=>{
  const owner=i===0?'You':parties[i]?.team_name||`Team ${i+1}`;
  const handcuff=context.lostHandcuffs?.[0],depth=context.depth?.find(d=>d.after===0)||(!compact&&context.depth?.[0]);
  const gained=!handcuff&&!depth&&context.gainedHandcuffs?.[0];
  if(!handcuff&&!depth&&!gained)return [];
  const link=handcuff||gained,backup=link&&pool.get(String(link.playerId)),starter=link&&pool.get(String(link.starterId));
  return [`<div class="td-coverage-row${gained?' is-gain':''}"><span data-ui-name title="${esc(owner)}">${esc(owner)} · ${handcuff?'Handcuff lost':gained?'Handcuff added':`${esc(depth.position)} depth`}</span><b data-ui-name title="${esc(backup?.name||'')}">${esc(link?backup?.name||link.playerId:`${depth.availableBefore??depth.before} → ${depth.availableAfter??depth.after} options`)}</b>${link?`<small data-ui-name title="${esc(starter?.name||'')}">${esc(starter?.name||link.starterId)} cover</small>`:''}</div>`];
 });
 return rows.length?`<section class="td-coverage${compact?' is-compact':''}" aria-label="Roster coverage">${rows.join('')}</section>`:'';
}
