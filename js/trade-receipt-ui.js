import {esc} from './ui.js';
import {tradeAlertViewModel} from './trade-alerts.js';
import {playerIdentity} from './player-presentation.js';
import {teamIdentity} from './team-presentation.js';
const value=n=>n==null||!Number.isFinite(Number(n))?'—':Math.round(Number(n));
const signed=n=>n==null||!Number.isFinite(Number(n))?'—':`${n>0?'+':n<0?'−':''}${Math.abs(n).toFixed(1)}`;
const netValue=n=>n==null?'—':`${n>0?'+':n<0?'−':''}${value(Math.abs(n))}`;

export function completedTradeMarkup(alerts=[],selectedTransactionId='',{standalone=false}={}){
 const views=alerts.map(tradeAlertViewModel).filter(Boolean);
 if(!views.length)return '';
 views.sort((a,b)=>Number(b.transactionId===selectedTransactionId)-Number(a.transactionId===selectedTransactionId));
 const cards=views.map((alert,index)=>{
  const selected=String(alert.transactionId)===String(selectedTransactionId),open=selectedTransactionId?selected:index===0;
  const teamName=id=>alert.teams.find(t=>t.rosterId===id)?.teamName||'';
  const playerRows=(players,direction)=>[...players].sort((a,b)=>(Number(b.value)||0)-(Number(a.value)||0)).map(p=>{
   const peer=teamName(direction==='received'?p.fromRosterId:p.toRosterId),detail=[p.position,p.nflTeam,peer?`${direction==='received'?'From':'To'} ${peer}`:''].filter(Boolean).join(' · ');
   return `<div class="td-receipt-player"><button type="button" class="player-card-trigger td-receipt-player-action" data-player-card="${esc(p.id)}" aria-label="View ${esc(p.name)} player card">${playerIdentity(p,{detail})}</button><span class="td-receipt-value"><span class="sr-only">Trade value </span><b>${value(p.value)}</b></span></div>`;
  }).join('')||'<p class="muted tiny">No players</p>';
  const call=alert.balanced?'Balanced deal':alert.outcome.grade==='Value edge'?`${alert.winner} · biggest value gain`:alert.winner?`${alert.winner} wins value`:alert.outcome.grade==='Close call'?'Close call':alert.fairness!=null&&alert.status==='graded'?`No clear winner · ${alert.caution.label}`:alert.caution.label;
  const packages=alert.receivedPackages||alert.packages,received=!!alert.receivedPackages;
  const impacts=alert.lineupDeltas.map((row,i)=>({...row,depth:alert.depthDeltas[i]?.weekly})).filter(row=>row.weekly!=null);
  const caution=alert.outcome.grade==='Review'||alert.outcome.needsReview||alert.status==='partial';
  const balanceRows=alert.teams.map(team=>{
   const totals=alert.teamValues.find(t=>t.rosterId===team.rosterId),balance=totals?.balance;
   return `<div class="td-receipt-balance-row" data-balance-team="${esc(team.rosterId)}"><strong>${esc(team.teamName)}</strong><b>${balance==null?'—':`${balance}%`}<small>value balance</small></b><span>Sent <em>${value(totals?.sent)}</em> <span aria-hidden="true">→</span> Received <em>${value(totals?.received)}</em></span><span class="td-receipt-net ${totals?.net>0?'is-up':totals?.net<0?'is-down':''}"><span class="sr-only">Net value </span>${netValue(totals?.net)}<small> net value</small></span>${balance==null?'':`<span class="td-receipt-balance-track" aria-hidden="true"><i style="width:${Math.max(0,Math.min(100,balance))}%"></i></span>`}</div>`;
  }).join('');
  return `<details class="td-alert-receipt" id="trade-${esc(alert.transactionId)}" data-receipt-tone="${esc(alert.outcome.tone)}"${selected?' data-route-focus':''}${open?' open':''}>
   <summary class="td-receipt-summary"><div class="td-receipt-heading"><small>${alert.season?`${esc(alert.season)} · `:''}${alert.week?`WEEK ${esc(alert.week)}`:'COMPLETED'}${alert.teams.length>2?` · ${alert.teams.length} TEAMS`:''}</small><h3>${alert.teams.map(t=>esc(t.teamName)).join(` <span class="td-receipt-vs" aria-label="and">${alert.teams.length>2?'+':'↔'}</span> `)}</h3><p class="td-receipt-call">${esc(call)}</p></div><span class="td-receipt-score"><b>${alert.fairness==null?'—':`${alert.fairness}%`}</b><small>${esc(alert.balanceLabel)}${caution&&alert.fairness!=null?' · est.':''}</small></span><span class="td-receipt-chevron" aria-hidden="true"></span></summary>
   <div class="td-receipt-body"><section class="td-receipt-comparison" aria-label="Team value balance">${balanceRows}</section><div class="td-alert-packages">${packages.map(pkg=>{
    const sent=alert.packages.find(t=>t.rosterId===pkg.rosterId);
    return `<section data-receipt-team="${esc(pkg.rosterId)}" aria-label="${esc(pkg.teamName)} trade receipt">${teamIdentity({...pkg.team,team_name:pkg.teamName},{meta:received?'RECEIVED':'SENT',compact:true})}
     <div class="td-receipt-column-head" aria-hidden="true"><span>${received?'Players received':'Players sent'}</span><span>Value</span></div>${playerRows(pkg.players,received?'received':'sent')}
     ${received&&sent?.players.length?`<details class="td-receipt-sent"><summary>Sent · ${sent.players.length} player${sent.players.length===1?'':'s'}</summary>${playerRows(sent.players,'sent')}</details>`:''}
    </section>`;
   }).join('')}</div>
   <footer class="td-receipt-footer">${caution?`<details class="td-receipt-notes"><summary>${esc(alert.caution.label)}</summary><p>${esc(alert.caution.detail)}</p>${alert.limitations.slice(1).map(text=>`<p>${esc(text)}</p>`).join('')}</details>`:`<p>${esc(alert.reason?.title||'Deal done. Keep the receipt.')}</p>`}
   ${impacts.length?`<details class="td-receipt-impact-fold"><summary>Roster impact <span>pts/wk</span></summary><table class="td-receipt-impact"><caption class="sr-only">Projected roster impact · points per week</caption><thead><tr><th scope="col">Team</th><th scope="col">Lineup</th><th scope="col">Depth</th></tr></thead><tbody>${impacts.map(row=>`<tr><th scope="row">${esc(row.teamName)}</th><td><span class="td-receipt-impact-label" aria-hidden="true">Lineup</span>${signed(row.weekly)}</td><td><span class="td-receipt-impact-label" aria-hidden="true">Depth</span>${signed(row.depth)}</td></tr>`).join('')}</tbody></table></details>`:''}
   ${alert.reviewedAt?`<time class="td-receipt-reviewed" datetime="${esc(alert.reviewedAt)}">Routing reviewed ${esc(new Date(alert.reviewedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'}))}</time>`:''}</footer></div>
  </details>`;
 }).join('');
 return standalone?`<section class="td-completed td-receipt-reader"><div class="td-alert-list">${cards}</div></section>`:`<details class="ta-report-section td-completed"${selectedTransactionId?' open':''}><summary class="ta-report-title"><div><small>COMPLETED DEALS</small><h2>Trade receipts</h2></div><span class="ta-fold-hint">${views.length} saved</span><span class="ta-fold-chevron" aria-hidden="true"></span></summary><div class="ta-section-body td-alert-list">${cards}</div></details>`;
}
