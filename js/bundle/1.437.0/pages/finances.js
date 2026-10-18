import{Cn as e,Sn as t,Xn as n,fn as r,kn as i,mn as a,wn as o,xn as s}from"../app-core-BFOwtmGe.js";var c=null;async function l(e){let[i,o,l,d,f]=await Promise.all([n().from(`finance_seasons`).select(`*`).order(`season`,{ascending:!1}),n().from(`finance_payments`).select(`*`).order(`owner_name`,{ascending:!0}),n().from(`finance_payouts`).select(`*`).order(`sort_order`,{ascending:!0}),n().from(`finance_expenses`).select(`*`).order(`expense_date`,{ascending:!0}),n().from(`finance_competitions`).select(`*`).order(`name`,{ascending:!0})]),p=i.error||o.error||l.error||d.error||f.error;if(p){e.innerHTML=`<header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>`+t(p)+`<div class="card"><div class="card-body muted">If a table is missing, run
       <strong>finance_schema.sql</strong> in the Supabase SQL editor.</div></div>`;return}let m={seasons:i.data||[],payments:o.data||[],payouts:l.data||[],expenses:d.data||[],comps:f.data||[]},h=[...new Set([...m.seasons.map(e=>e.season),...m.payments.map(e=>e.season),...m.payouts.map(e=>e.season),...m.expenses.map(e=>e.season),...m.comps.map(e=>e.season)])].sort((e,t)=>t-e);if(!h.length){e.innerHTML=`<header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>${s(`No fees on record yet.`)}`;return}c=Number(r(`finance-season`,h.map(String),String(c||``)))||c,h.includes(c)||(c=h[0]),e.innerHTML=`
    <header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>
    <div class="tabs" id="fin-years">
      ${h.map(e=>`<button data-year="${e}" class="${e===c?`on`:``}">${e}</button>`).join(``)}
    </div>
    <div id="fin-body"></div>
  `;let g=e.querySelector(`#fin-body`),_=()=>{g.innerHTML=u(m,c)};e.querySelector(`#fin-years`).addEventListener(`click`,t=>{let n=t.target.closest(`button[data-year]`);n&&(c=Number(n.dataset.year),a(`finance-season`,String(c)),e.querySelectorAll(`#fin-years button`).forEach(e=>e.classList.toggle(`on`,Number(e.dataset.year)===c)),_())}),_()}function u(t,n){let r=t.seasons.find(e=>e.season===n),i=t.payments.filter(e=>e.season===n),a=t.payouts.filter(e=>e.season===n),o=t.expenses.filter(e=>e.season===n),s=t.comps.filter(e=>e.season===n),c=Number(r?.buy_in||0),l=i.length,u=c*l,h=x(i,`amount_due`),g=x(i,`amount_paid`),b=h-g,S=x(o,`amount`),C=x(a,`amount`),w=g-S-C;return`
    ${f(c,l,u)}
    ${p({expected:h,collected:g,owed:b,spent:S,paidOut:C,remaining:w})}
    ${m(i)}
    ${_(a,u)}
    ${v(s)}
    ${y(o)}
    ${r?.notes?d(`Notes`,`<div class="card">
                    <div class="card-body">${e(r.notes)}</div></div>`):``}
  `}function d(t,n,r=``){return`<section class="fin-section">
    <h2 class="section-title">${e(t)}${r?`<span class="count">${e(r)}</span>`:``}</h2>
    ${n}
  </section>`}function f(e,t,n){return d(`League buy-in`,`
    <div class="card fin-summary-card">
      <div class="statgrid">
        ${b(`Buy-in`,i(e))}
        ${b(`Teams`,t)}
        ${b(`Prize pool`,i(n))}
      </div>
    </div>`)}function p(e){let t=e.remaining<0;return d(`Fees summary`,`
    <div class="card fin-summary-card">
      <div class="statgrid">
        
        ${b(`Expected`,i(e.expected))}
        ${b(`Collected`,i(e.collected))}
        ${b(`Owed`,i(e.owed),e.owed>0?`warn`:``)}
        ${b(`Expenses`,i(e.spent))}
        ${b(`Payouts`,i(e.paidOut))}
        ${b(`Balance`,i(e.remaining),t?`bad`:`good`)}
      </div>
      
      ${t?`<div class="card-meta">
        <strong class="warntext">More has been committed than collected.</strong>
      </div>`:``}
    </div>`)}function m(e){if(!e.length)return d(`Dues`,`<div class="card">${s(`Nobody added yet.`)}</div>`);let t=e.filter(e=>g(e).key===`paid`).length;return d(`Dues`,`
    <div class="card duecard">
      ${e.map(h).join(``)}
    </div>`,`${t}/${e.length} paid`)}function h(t){let n=g(t),r=Number(t.amount_due||0),a=Number(t.amount_paid||0),o=r-a,s=n.key===`paid`?i(a):n.key===`partial`?`${i(a)} of ${i(r)}`:`${i(r)} due`;return`
    <div class="due-row">
      <span class="due-dot ${n.cls}" title="${n.label}" aria-hidden="true"></span>
      <span class="due-who">
        ${e(t.owner_name)}
        <span class="sr-only"> — ${n.label}</span>
      </span>
      <span class="due-figure ${o>0?`owing`:``}">${s}</span>
    </div>`}function g(e){let t=Number(e.amount_due||0),n=Number(e.amount_paid||0);return n>=t&&t>0?{key:`paid`,label:`Paid`,cls:`green`}:n>0?{key:`partial`,label:`Partial`,cls:`warn`}:{key:`unpaid`,label:`Unpaid`,cls:`red`}}function _(t,n){if(!t.length)return d(`Prize structure`,`<div class="card">${s(`No payouts set.`)}</div>`);let r=x(t,`amount`),a=n-r;return d(`Prize structure`,`
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Payout</th><th>Winner</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${t.map(t=>`
              <tr>
                <td>
                  ${e(t.title)}
                  ${t.description?`<div class="muted tiny">${e(t.description)}</div>`:``}
                </td>
                <td class="muted">${e(t.winner||`—`)}</td>
                <td class="num">${i(t.amount)}</td>
              </tr>`).join(``)}
            <tr>
              <td colspan="2"><strong>Total payouts</strong></td>
              <td class="num"><strong>${i(r)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      ${n>0&&a!==0?`<div class="card-meta">
        ${a>0?`${i(a)} unallocated`:`<span class="warntext">${i(-a)} over the prize pool</span>`}
      </div>`:``}
    </div>`)}function v(t){return t.length?d(`Side competitions`,`
    <div class="card">
      ${t.map(t=>{let n=t.prize_pool==null?Number(t.buy_in||0)*Number(t.participants||0):Number(t.prize_pool);return`
          <div class="subcard">
            <div class="row" style="justify-content:space-between;align-items:baseline">
              <strong>${e(t.name)}</strong>
              <span class="pill ${t.status===`Finished`?`grey`:`green`}">${e(t.status)}</span>
            </div>
            <div class="statgrid" style="margin:8px 0 4px">
              ${b(`Buy-in`,i(t.buy_in))}
              ${b(`Players`,t.participants)}
              ${b(`Pool`,i(n))}
            </div>
            ${t.winner?`<div class="card-meta">Winner: <strong>${e(t.winner)}</strong></div>`:``}
            ${t.notes?`<div class="muted tiny">${e(t.notes)}</div>`:``}
          </div>`}).join(``)}
    </div>`):d(`Side competitions`,`<div class="card">${s(`None this season.`)}</div>`)}function y(t){return t.length?d(`Expenses`,`
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Item</th><th>Date</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${t.map(t=>`
              <tr>
                <td>
                  ${e(t.description)}
                  ${t.notes?`<div class="muted tiny">${e(t.notes)}</div>`:``}
                </td>
                <td class="muted">${t.expense_date?e(o(t.expense_date)):`—`}</td>
                <td class="num">${i(t.amount)}</td>
              </tr>`).join(``)}
            <tr>
              <td colspan="2"><strong>Total</strong></td>
              <td class="num"><strong>${i(x(t,`amount`))}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`):d(`Expenses`,`<div class="card">${s(`Nothing spent yet.`)}</div>`)}function b(t,n,r=``){return`<div class="stat"><span class="stat-v ${r}">${e(n)}</span><span class="stat-l">${e(t)}</span></div>`}function x(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}export{l as render};