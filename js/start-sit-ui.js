import {esc} from './ui.js';
import {playerIdentity} from './player-presentation.js';
const points=n=>Number.isFinite(n)?n.toFixed(1):'—';
const who=p=>playerIdentity({...p,injuryStatus:null,nflTeam:p.nflTeam||p.team},{interactive:true,detail:[p.position,p.opponent?`vs ${p.opponent}`:p.nflTeam||p.team].filter(Boolean).join(' · ')});
const form=p=>Number.isFinite(p.recentAverage)&&p.recentGames>=2?`<span class="ss-form">Last ${p.recentGames} · ${points(p.recentAverage)} avg.</span>`:'';
const when=p=>{const at=Date.parse(p.kickoff);return Number.isFinite(at)?new Date(at).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}):'';};

export function startSitMove(swap){
 const start=swap.start||swap.in,sit=swap.sit||swap.out;
 const call=swap.call||(swap.urgent?'Replace now':swap.gain>=3?'Clear upgrade':'Lean start');
 return `<article class="ss-move${swap.urgent?' is-urgent':''}" data-startsit-move>
  <header><strong>${esc(call)}</strong><span>${swap.urgent?'':`+${points(swap.gain)} projected pts`}</span></header>
  <div class="ss-pair"><section><small>START${swap.slot?` · ${esc(swap.slot)}`:''}</small>${who(start)}<b>${points(start.points)} <small>proj.</small></b>${start.injuryStatus?`<span class="ss-status">${esc(start.injuryStatus)}</span>`:''}${form(start)}<time>${esc(when(start))}</time></section>
   <section><small>BENCH</small>${who(sit)}<b>${points(sit.points)} <small>proj.</small></b>${sit.injuryStatus?`<span class="ss-status">${esc(sit.injuryStatus)}</span>`:sit.hasGame===false?'<span class="ss-status">No game</span>':''}${form(sit)}<time>${esc(when(sit))}</time></section></div>
  <button type="button" class="linkbtn" data-player-compare="${esc(start.id)}" data-compare-with="${esc(sit.id)}">Compare players</button>
  ${swap.reassign?.length?`<p class="ss-adjustment">${swap.reassign.map(move=>`Set ${esc(move.player.name)} at ${esc(move.to)}`).join(' · ')}</p>`:''}
  ${swap.backup?`<p class="ss-backup"><b>If inactive</b> ${esc(swap.backup.name)} · ${points(swap.backup.points)} proj.${when(swap.backup)?` · ${esc(when(swap.backup))}`:''}</p>`:''}
  ${start.isRisky&&!swap.backup?'<p class="ss-status">No confirmed healthy backup after kickoff.</p>':''}
  ${swap.confidence==='limited'?'<p class="ss-status">Limited projection data</p>':''}
 </article>`;
}

export function startSitSummary(advice){
 const missing=advice.unknownStarters?.length||0,empty=advice.emptySlots?.length||0;
 return !advice.lineupIsSet?'Set your lineup':missing?'Projections pending':empty?'Finish your lineup':advice.swaps?.length?`${advice.swaps.length} lineup move${advice.swaps.length===1?'':'s'}`:advice.alarms?.length?'Lineup needs attention':'Hold your lineup';
}

export function startSitContent(advice){
 const moves=advice.swaps||[],covered=new Set(moves.map(s=>(s.out||s.sit).id));
 const alarms=(advice.alarms||[]).filter(a=>!covered.has(a.player.id));
 return `<div class="ss-advice" data-startsit-advice>
  ${alarms.length?`<div class="ss-alerts">${alarms.map(a=>`<p><b>${esc(a.player.name)}</b><span>${esc(a.reason)} · no projected replacement</span></p>`).join('')}</div>`:''}
  ${advice.unknownStarters?.length?`<p class="ss-data-warning" role="status">Projection pending: ${advice.unknownStarters.map(p=>esc(p.name)).join(', ')}</p>`:''}
  ${advice.emptySlots?.length&&advice.lineupIsSet?`<p class="ss-data-warning">Open slots: ${advice.emptySlots.map(esc).join(' · ')}</p>`:''}
  ${moves.length?`<div class="ss-moves">${moves.map(startSitMove).join('')}</div>`:!alarms.length?`<p class="ss-hold"><strong>${esc(startSitSummary(advice))}</strong>${advice.lineupIsSet&&!advice.unknownStarters?.length&&!advice.emptySlots?.length?'<span>No clear upgrade on your bench.</span>':''}</p>`:''}
  ${advice.lockedCount?`<p class="ss-locks">${advice.lockedCount} starter${advice.lockedCount===1?'':'s'} locked</p>`:''}
 </div>`;
}
