import {tradeAssessment} from './trade-assessment.js';
import {tradePerspective} from './trade-routing.js';
import {esc} from './ui.js';
import {tradeLineupFitLabel} from './trade-suggestion-quality.js';
const signed=value=>`${value>0?'+':value<0?'−':''}${Math.abs(Number(value)||0).toFixed(1)}`;
export function tradeDealChirp(result) {
 const p=tradePerspective(result),a=tradeAssessment(p);
 if(!a||a.needsReview||a.confidence?.level!=='strong')return '';
 if(a.weeklyA<=-1)return 'Projected starters get worse. Bold fucking strategy.';
 if(Math.abs(a.weeklyA)<.3&&p.sendA?.length>=2&&p.sendB?.length===1&&Number(p.depthDeltaA)<0)return 'Same projected points. Generous as fuck.';
 if(a.weeklyA>=3)return 'Projected upgrade. Some useful fucking business.';
 return '';
}
export function tradeDecisionMarkup(result,pool,{compact=false}={}){
 const p=tradePerspective(result),a=tradeAssessment(p);if(!a)return '';
 const chirp=compact?'':tradeDealChirp(result);
 const weeklyA=result.windowDeltas?.[0]??a.weeklyA,weeklyB=result.windowDeltas?.[1]??a.weeklyB;
 const window=result.windowWeeks?.length===1?`Week ${result.windowWeeks[0]}`:result.windowWeeks?.length?`Weeks ${result.windowWeeks[0]}–${result.windowWeeks.at(-1)}`:'';
 const names=ids=>(ids||[]).map(id=>pool.get(String(id))?.name||id).join(', ');
 return `<section class="td-decision${compact?' is-compact':''}" aria-label="Trade balance, lineup impact and risk">
  <dl><div><dt>${Array.isArray(result.values)?'Your price balance':'Price balance'}</dt><dd>${Math.round(a.fairness)}%</dd></div><div><dt>Your lineup</dt><dd class="${weeklyA<0?'is-down':'is-up'}">${signed(weeklyA)}<small> pts/wk</small></dd></div><div><dt>${Array.isArray(result.values)?'Group balance':'Their lineup'}</dt><dd>${Array.isArray(result.values)?`${result.fairness}%`:signed(weeklyB)}${Array.isArray(result.values)?'':'<small> pts/wk</small>'}</dd></div></dl>
  <p class="td-fit-call">${esc(p.projectionEvidence?.missing?.length?'Lineup estimate unavailable':tradeLineupFitLabel(result.windowDeltas||result.weeklyDeltas||[a.weeklyA,a.weeklyB]))}<small>${esc(window||'Rest of season')} · projected</small></p>
  ${a.flags.length?`<div class="td-risk-flags" aria-label="Trade risks"><span>${esc(a.flags[0])}</span>${a.flags.length>1?`<details><summary>+${a.flags.length-1} more</summary>${a.flags.slice(1).map(flag=>`<span>${esc(flag)}</span>`).join('')}</details>`:''}</div>`:''}
  ${p.requiredDropsA?.length?`<p class="td-roster-cost"><b>Required drops</b> ${esc(names(p.requiredDropsA))}${p.rosterCostA?` · ${p.rosterCostA} value`:''}</p>`:''}
  ${!compact&&p.requiredDropsB?.length?`<p class="td-roster-cost"><b>Their required drops</b> ${esc(names(p.requiredDropsB))}</p>`:''}
  ${p.waiverAddsA?.length?`<p class="td-roster-cost"><b>Waiver option${p.waiverAddsA.length>1?'s':''}</b> ${esc((p.waiverAddsA||[]).map(id=>pool.get(id)?.name||[...pool.values()].flatMap(p=>p.waiverOptions||[]).find(p=>p.id===id)?.name||id).join(', '))}</p>`:''}
  ${p.openSlotsA?`<p class="td-roster-cost"><b>Open spots</b> ${p.openSlotsA}</p>`:''}
  ${chirp?`<p class="td-deal-chirp">${esc(chirp)}</p>`:''}
 </section>`;
}
