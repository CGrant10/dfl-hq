import {esc} from './ui.js';
import {ensureStylesheet} from './lazy-css.js';
import {loadAdviceReceipts} from './advice-receipts-data.js';
import {adviceReceiptSummary} from './advice-receipts.js';
const signed=n=>`${n>0?'+':''}${Number(n).toFixed(2)}`;
const disclosureState=new Map();
const labels={hit:'HIT',miss:'MISS',push:'PUSH',pending:'PENDING',ungraded:'UNGRADED'};
function receiptHtml(r){
  const when=new Date(r.captured_at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  const scores=(r.added_players||[]).map((p,i)=>`${p.name}: ${r.addedActual?.[i]?.toFixed(2)??'—'}`).join(' · ');
  const baseline=(r.removed_players||[]).map((p,i)=>`${p.name}: ${r.removedActual?.[i]?.toFixed(2)??'—'}`).join(' · ')||'Empty slot: 0';
  return `<article class="advice-receipt is-${esc(r.grade)}"><div class="advice-receipt-top"><small>W${r.week} · ${r.kind==='lineup'?'START / SIT':'WAIVER'} · ${esc(r.teamName)}</small><span>${labels[r.grade]||'PENDING'}</span></div><strong>${esc(r.label)}</strong><div class="advice-receipt-result"><b>${r.actualGain===null?'—':signed(r.actualGain)}</b><small>actual lineup difference · pts</small></div><p>${esc(r.copy)}</p><details data-advice-receipt="${esc(r.id)}"><summary>The numbers</summary><div><p><b>Projected:</b> ${signed(r.projected_gain)} lineup pts</p>${r.actualGain!==null?`<p><b>Recommended:</b> ${esc(scores)}</p><p><b>Replaced:</b> ${esc(baseline)}</p>`:''}<p><b>Recorded:</b> ${esc(when)} · before kickoff</p>${r.kind==='waiver'?'<p>Compared with the best legal lineup on the saved roster, not the dropped bench player.</p>':''}<p>This comparison doesn’t prove the manager made the move. Final scores can change with stat corrections.</p></div></details></article>`;
}
export function adviceReceiptsHtml(model){
  const rows=model.rows||[],counts=adviceReceiptSummary(rows),completed=counts.hits+counts.misses+counts.pushes;
  const record=completed?`${counts.hits} hit${counts.hits===1?'':'s'} · ${counts.misses} miss${counts.misses===1?'':'es'}${counts.pushes?` · ${counts.pushes} push${counts.pushes===1?'':'es'}`:''}`:rows.length?(counts.pending?`${counts.pending} pending · waiting for finals`:'No verified outcomes yet'):'Tracking starts with new pregame calls';
  const summary=record+(completed&&counts.pending?` · ${counts.pending} pending`:'')+(counts.ungraded?` · ${counts.ungraded} ungraded`:'');
  return `<section class="card advice-receipts" aria-label="DFL advice receipts"><header><div><small>THE APP’S RECEIPTS</small><h2>Did DFL HQ back it up?</h2><p>${esc(summary)}</p></div><button type="button" class="linkbtn" data-advice-refresh aria-label="Refresh advice receipts">Refresh</button></header>${!rows.length?`<p class="advice-empty">${model.history?'Pregame calls will collect here, then get graded after the NFL week finishes.':'No advice was recorded before kickoff for this week.'} Past advice won’t be invented.</p>`:`<div class="advice-receipt-list">${rows.slice(0,2).map(receiptHtml).join('')}</div>${rows.length>2?`<details class="advice-more" data-advice-receipt="more"><summary>More calls · ${rows.length-2}</summary><div class="advice-receipt-list">${rows.slice(2).map(receiptHtml).join('')}</div></details>`:''}<p class="advice-footnote">Saved pregame calls · lineup comparisons, whether or not the move was made.</p>`}</section>`;
}
export function mountAdviceReceipts(host,input){
  let stopped=false,busy=false;
  const scope=`${input.leagueId}:${input.season}:${input.week}:${input.rosterId||'all'}`;
  if(!disclosureState.has(scope)){if(disclosureState.size>=48)disclosureState.delete(disclosureState.keys().next().value);disclosureState.set(scope,{opened:new Set(),focusRefresh:false})}
  const state=disclosureState.get(scope);
  host.addEventListener('toggle',event=>{const detail=event.target,key=detail.dataset?.adviceReceipt;if(!key||!host.contains(detail))return;if(detail.open)state.opened.add(key);else state.opened.delete(key)},true);
  const draw=async(force=false)=>{
    if(stopped||!host.isConnected||busy)return;busy=true;
    for(const detail of host.querySelectorAll('details')){const key=detail.dataset.adviceReceipt;if(detail.open)state.opened.add(key);else state.opened.delete(key)}
    const focus=host.contains(document.activeElement)||state.focusRefresh;
    const refresh=host.querySelector('[data-advice-refresh]');if(refresh)refresh.disabled=true;
    try{await ensureStylesheet('css/advice-receipts.css');const result=await loadAdviceReceipts({...input,force});if(stopped||!host.isConnected)return;
      host.innerHTML=adviceReceiptsHtml(result);host.querySelectorAll('details').forEach(d=>{if(state.opened.has(d.dataset.adviceReceipt))d.open=true});
      host.querySelector('[data-advice-refresh]').addEventListener('click',()=>{state.focusRefresh=true;void draw(true)});
      if(focus)host.querySelector('[data-advice-refresh]').focus({preventScroll:true});state.focusRefresh=false;
    }catch{if(stopped||!host.isConnected)return;host.innerHTML='<section class="card advice-receipts"><header><div><small>THE APP’S RECEIPTS</small><h2>Advice receipts</h2><p role="status">Receipts couldn’t load. Your current advice is still available.</p></div><button type="button" class="linkbtn" data-advice-refresh>Retry</button></header></section>';host.querySelector('button').addEventListener('click',()=>void draw(true));if(focus)host.querySelector('button').focus({preventScroll:true})}
    finally{busy=false}
  };
  host.innerHTML='<section class="card advice-receipts"><p role="status">Loading DFL’s advice receipts…</p></section>';void draw();return()=>{stopped=true};
}
