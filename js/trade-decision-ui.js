import {tradeAssessment} from './trade-assessment.js';
import {tradePerspective} from './trade-routing.js';
import {esc} from './ui.js';
const signed=value=>`${value>0?'+':value<0?'−':''}${Math.abs(Number(value)||0).toFixed(1)}`;
export function tradeDecisionMarkup(result,pool,{compact=false}={}){
 const p=tradePerspective(result),a=tradeAssessment(p);if(!a)return '';
 const names=ids=>(ids||[]).map(id=>pool.get(String(id))?.name||id).join(', ');
 return `<section class="td-decision${compact?' is-compact':''}" aria-label="Trade balance, lineup impact and risk">
  <dl><div><dt>${Array.isArray(result.values)?'Your balance':'Balance'}</dt><dd>${Math.round(a.fairness)}%</dd></div><div><dt>Your lineup</dt><dd class="${a.weeklyA<0?'is-down':'is-up'}">${signed(a.weeklyA)}<small> pts/wk</small></dd></div><div><dt>${Array.isArray(result.values)?'Group balance':'Their lineup'}</dt><dd>${Array.isArray(result.values)?`${result.fairness}%`:signed(a.weeklyB)}${Array.isArray(result.values)?'':'<small> pts/wk</small>'}</dd></div></dl>
  ${a.flags.length?`<div class="td-risk-flags" aria-label="Trade risks">${a.flags.map(flag=>`<span>${esc(flag)}</span>`).join('')}</div>`:''}
  ${p.requiredDropsA?.length?`<p class="td-roster-cost"><b>Required drops</b> ${esc(names(p.requiredDropsA))}${p.rosterCostA?` · ${p.rosterCostA} value`:''}</p>`:''}
  ${!compact&&p.requiredDropsB?.length?`<p class="td-roster-cost"><b>Their required drops</b> ${esc(names(p.requiredDropsB))}</p>`:''}
  ${p.waiverAddsA?.length?`<p class="td-roster-cost"><b>Waiver option${p.waiverAddsA.length>1?'s':''}</b> ${esc((p.waiverAddsA||[]).map(id=>pool.get(id)?.name||[...pool.values()].flatMap(p=>p.waiverOptions||[]).find(p=>p.id===id)?.name||id).join(', '))}</p>`:''}
  ${p.openSlotsA?`<p class="td-roster-cost"><b>Open spots</b> ${p.openSlotsA}</p>`:''}
 </section>`;
}
