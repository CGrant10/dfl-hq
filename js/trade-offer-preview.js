import {lineupPreviewsFor} from './trade-workspace.js';
import {lineupSlotChanges} from './trade-workspace-ui.js';
import {tradeTransfers} from './trade-routing.js';
import {esc} from './ui.js';

const name=team=>team.team_name||team.ownerName||`Team ${team.id}`;
const signed=n=>`${n>0?'+':n<0?'−':''}${Math.abs(n).toFixed(1)}`;
const player=p=>p?`<button type="button" data-player-card="${esc(p.id)}">${esc(p.name)}</button>`:'<span>Empty slot</span>';

// Only called when an offer is expanded. Use the same optimized starters,
// roster limits and routing as Check a trade, without regrading the offer.
export function offerLineupMarkup(offer,mine,pool){
 const parties=offer.parties||[mine,offer.other],sends=offer.sends||[offer.sendA,offer.sendB];
 const transfers=tradeTransfers(parties,sends,offer.destinations);
 if(!transfers)return '<p class="tb-preview-empty">Rosters changed. Refresh offers.</p>';
 const previews=lineupPreviewsFor({parties,...transfers},pool);
 return `<div class="tb-preview-lineups"><small class="tb-preview-context">Rest-of-season starters · projected</small>${previews.map((preview,i)=>{
  const rows=lineupSlotChanges(preview),delta=offer.weeklyDeltas?.[i]??(i===0?offer.weeklyDeltaA:i===1?offer.weeklyDeltaB:undefined)??(preview.afterPoints-preview.beforePoints);
  return `<section><header><strong>${esc(i===0?'Your starters':name(parties[i]))}</strong><b>${signed(delta)} pts/wk</b></header>${rows.length?`<div class="tb-preview-labels"><span>Slot</span><span>Before</span><span>After</span></div>${rows.map(row=>`<div class="tb-preview-slot"><small>${esc(row.slot)}</small>${player(row.before)}${player(row.after)}</div>`).join('')}`:'<p class="tb-preview-empty">Starters stay the same.</p>'}${preview.drops.length?`<p class="tb-preview-risk">Drop: ${esc(preview.drops.map(p=>p.name).join(', '))}</p>`:''}${preview.waiverAdds.length?`<p class="tb-preview-context">Waiver fill: ${esc(preview.waiverAdds.map(p=>p.name).join(', '))}</p>`:''}</section>`;
 }).join('')}</div>`;
}
