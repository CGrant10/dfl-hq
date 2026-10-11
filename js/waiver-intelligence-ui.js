import {esc} from './ui.js';
const count=n=>Math.max(0,Math.floor(Number(n)||0));
export function waiverMarketHtml(plan){
 const intel=plan.intelligence;if(!intel)return '';
 if(intel.state==='unavailable')return '<p class="coach-market-status">DFL pickup history unavailable. Refresh to try again.</p>';
 return `<div class="coach-market"><div><small>DFL PICKUP PULSE${intel.state==='partial'?' · PARTIAL HISTORY':''}</small><span>${count(intel.pickups)} adds · last ${count(intel.weeks)} weeks</span>${intel.myPriority?`<span>Waiver order <strong>#${count(intel.myPriority)}</strong></span>`:''}</div>${intel.positionDemand?.length?`<p>${intel.positionDemand.slice(0,4).map(row=>`<span>${esc(row.position)} <strong>${count(row.count)}</strong></span>`).join('')}</p>`:''}</div>`;
}
export function waiverOfferIntelHtml(offer){
 const intel=offer.intel;if(!intel)return '';
 const fits=intel.otherTeams||[],ahead=fits.filter(team=>team.ahead).length;
 const pieces=[intel.pickups?`${count(intel.pickups)} recent ${offer.player.position} pickups`:'',fits.length?`Fits ${fits.length} other team${fits.length===1?'':'s'}`:'',intel.recentDrop?`Dropped by ${intel.recentDrop.teamName}`:''].filter(Boolean);
 if(!pieces.length&&!intel.winningBids)return '';
 return `<details class="coach-intel" data-coach-detail="offer-${esc(offer.player.id)}"><summary>${esc(pieces.join(' · ')||'DFL bid history')}</summary><div>${fits.length?`<ul>${fits.slice(0,4).map(team=>`<li><strong>${esc(team.name)}</strong><span>+${Number(team.gain).toFixed(1)} projected lineup pts${team.ahead?' · higher waiver priority':''}</span></li>`).join('')}</ul>${fits.length>4?`<small>Plus ${fits.length-4} other teams.</small>`:''}<small>Potential roster fits${ahead?` · ${ahead} ahead in waiver order`:''}. Claims are private.</small>`:''}${intel.winningBids?`<p>DFL ${esc(intel.winningBids.position)} winning bids: <strong>${count(intel.winningBids.min)}–${count(intel.winningBids.max)}</strong> · ${count(intel.winningBids.samples)} claims</p>`:''}</div></details>`;
}
export function waiverDropsHtml(plan){
 if(!plan.recentDrops?.length)return '';
 return `<details class="coach-drops"><summary>Recent drops to watch · ${plan.recentDrops.length}</summary><ul>${plan.recentDrops.map(drop=>`<li><div><strong>${esc(drop.player.name)}</strong><small>${esc(drop.player.position)} · dropped by ${esc(drop.teamName)}</small></div><span>W${count(drop.targetWeek)} · +${Number(drop.gain).toFixed(1)} projected lineup pts</span></li>`).join('')}</ul></details>`;
}
