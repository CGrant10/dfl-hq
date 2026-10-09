import {esc} from './ui.js';
import {lineupPreviewsFor,restoreTradeProposal} from './trade-workspace.js';
import {tradePerspective} from './trade-routing.js';
import {expertSourceMarkup} from './expert-rankings-model.js';
const name=t=>t?.team_name||t?.ownerName||`Team ${t?.id||''}`;
const signed=n=>`${Number(n)>0?'+':Number(n)<0?'−':''}${Math.abs(Number(n)||0).toFixed(1)}`;
const player=p=>p?`<strong>${esc(p.name)}</strong><small>${esc([p.position,p.nflTeam,p.injuryStatus].filter(Boolean).join(' · '))}</small>`:'<span class="muted">Empty slot</span>';

export function lineupComparisonMarkup(deal,pool){
 const previews=lineupPreviewsFor(deal,pool);
 return `<details class="td-lineup-preview"><summary><span>Before &amp; after lineups</span><small>Starters, bench and drops</small></summary><div class="td-lineup-teams">${previews.map((p,i)=>`<section><h3>${esc(name(deal.parties[i]))}</h3><div class="td-lineup-labels"><span>Slot</span><span>Before</span><span>After</span></div>${p.before.map((before,index)=>{const after=p.after[index],changed=String(before.player?.id)!==String(after.player?.id);return `<div class="td-lineup-slot${changed?' is-changed':''}"><small>${before.slot}</small><div>${player(before.player)}</div><div>${player(after.player)}${changed?'<em>Changed</em>':''}</div></div>`}).join('')}<div class="td-lineup-total"><small>Projected ROS avg / wk</small><b>${p.beforePoints.toFixed(1)} → ${p.afterPoints.toFixed(1)}</b></div><details class="td-bench-preview"><summary>Bench &amp; required drops${p.drops.length?` · ${p.drops.length} to drop`:''}</summary><div><small>BENCH BEFORE</small><p>${esc(p.benchBefore.map(p=>p.name).join(', ')||'No rated bench players')}</p><small>BENCH AFTER</small><p>${esc(p.benchAfter.map(p=>p.name).join(', ')||'No rated bench players')}</p><small>REQUIRED DROPS</small><p>${esc(p.drops.map(p=>p.name).join(', ')||'None')}</p></div></details></section>`).join('')}</div></details>`;
}

export function counterofferMarkup(candidates,pool,parties){
 const team=id=>name(parties.find(t=>String(t.id)===String(id))),playerName=id=>pool.get(String(id))?.name||id;
 if(!candidates.length)return '<p class="td-projection-note">No counteroffer found. Try different players.</p>';
 return `<div class="td-counter-list">${candidates.map((c,i)=>{const change=c.change,p=tradePerspective(c.result),text=change.type==='add'?`Add ${playerName(change.player)} · ${team(change.from)} → ${team(change.to)}`:change.type==='remove'?`Remove ${playerName(change.player)} from ${team(change.from)}’s package`:`Replace ${playerName(change.previous)} with ${playerName(change.player)} · ${team(change.from)} → ${team(change.to)}`;return `<article><strong>${esc(text)}</strong><p>${c.result.fairness}% group balance · Your lineup ${signed(p.weeklyDeltaA)} avg/wk</p><ul>${c.parties.map((t,j)=>`<li><span>${esc(name(t))}</span><b>${signed(c.result.weeklyDeltas?.[j]??(j?p.weeklyDeltaB:p.weeklyDeltaA))} avg/wk</b></li>`).join('')}</ul><button type="button" class="btn ghost small" data-td-use-counter="${i}">Review this counteroffer</button></article>`}).join('')}</div>`;
}

export function proposalsMarkup(rows,teams,pool,open=false){
 return `<details class="td-proposals"${open?' open':''}><summary><span>Compare saved deals</span><small>${rows.length} of 3 saved on this device</small></summary><div class="td-proposal-grid">${rows.map((row,i)=>{const deal=restoreTradeProposal(row,teams,pool),p=tradePerspective(deal?.result);return `<article><header><strong>Deal ${i+1}</strong><button type="button" class="btn ghost small" data-td-delete-proposal="${esc(row.id)}" aria-label="Remove saved deal ${i+1}">Remove</button></header><h3>${esc(row.teamIds.map(id=>name(teams.find(t=>String(t.id)===String(id)))).join(' ↔ '))}</h3>${deal?`<dl><div><dt>Your lineup</dt><dd>${signed(p.weeklyDeltaA)} avg/wk</dd></div><div><dt>Your depth</dt><dd>${signed(p.depthDeltaA)} avg/wk</dd></div><div><dt>Group balance</dt><dd>${deal.result.fairness}%</dd></div><div><dt>Player value</dt><dd>${Math.round(p.valueToA)} in · ${Math.round(p.valueToB)} out</dd></div></dl><p><small>YOU SEND</small> ${esc(deal.sends[0].map(id=>pool.get(id)?.name||id).join(' + '))}</p><p><small>YOU RECEIVE</small> ${esc(deal.receives[0].map(id=>pool.get(id)?.name||id).join(' + '))}</p><button type="button" class="btn ghost small" data-td-load-proposal="${esc(row.id)}">Review deal ${i+1}</button>`:'<p class="muted">Rosters changed. Build a new deal.</p>'}</article>`}).join('')||'<p class="muted">Save a deal to compare it with your next idea.</p>'}</div></details>`;
}

export function tradeDataContext(data,pool){
 const rostered=new Set((data.teams||[]).flatMap(t=>t.playerIds||[]).map(String));
 const format=data.leagueFormat,scoring={ppr:'Full PPR',half_ppr:'Half PPR',std:'Standard'}[format?.scoring]||'League scoring';
 const leagueCopy=`${format?.teams??data.teams?.length??0} teams · ${scoring} · 1 QB · 2 RB · 2 WR · 1 TE · 1 FLEX (RB/WR/TE) · 1 K · 1 DEF`;
 const times=[['Season projections',data.projectionUpdatedAt],['Production',data.productionUpdatedAt],['Availability',data.availabilityUpdatedAt??data.liveSignalsUpdatedAt],['Completed weekly results',data.weeklyResultsUpdatedAt]];
 const stamp=at=>at?new Date(at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Update time unavailable';
 return `<details class="td-data-context"><summary><span>League &amp; data</span><small>Sources · updates</small></summary><p data-trade-league-format>${esc(leagueCopy)}</p><p>Team names · ${esc(data.teamNamesSource||'Synced roster')}</p>${expertSourceMarkup(data.expertConsensus,esc,true)}${data.staleSources?.length?`<p>Cached data · ${esc(data.staleSources.join(', '))}</p>`:''}${times.map(([label,at])=>`<div><span>${label}</span><time>${esc(stamp(at))}</time></div>`).join('')}<p>Injury flags · ${[...pool.values()].filter(p=>rostered.has(String(p.id))&&(p.injuryStatus||p.isOut||p.isRisky)).length} players</p></details>`;
}
