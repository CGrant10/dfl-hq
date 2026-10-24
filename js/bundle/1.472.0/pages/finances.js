import{Ar as e,Mr as t,Nr as n,Rn as r,Rr as i,hn as a,jr as o,pn as s}from"../app-core-BNd3TRYi.js";var c=null;async function l(t){let[n,i,l,d,f]=await Promise.all([r().from(`finance_seasons`).select(`*`).order(`season`,{ascending:!1}),r().from(`finance_payments`).select(`*`).order(`owner_name`,{ascending:!0}),r().from(`finance_payouts`).select(`*`).order(`sort_order`,{ascending:!0}),r().from(`finance_expenses`).select(`*`).order(`expense_date`,{ascending:!0}),r().from(`finance_competitions`).select(`*`).order(`name`,{ascending:!0})]),p=n.error||i.error||l.error||d.error||f.error;if(p){t.innerHTML=`<header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>`+o(p)+`<div class="card"><div class="card-body muted">If a table is missing, run
       <strong>finance_schema.sql</strong> in the Supabase SQL editor.</div></div>`;return}let m={seasons:n.data||[],payments:i.data||[],payouts:l.data||[],expenses:d.data||[],comps:f.data||[]},h=[...new Set([...m.seasons.map(e=>e.season),...m.payments.map(e=>e.season),...m.payouts.map(e=>e.season),...m.expenses.map(e=>e.season),...m.comps.map(e=>e.season)])].sort((e,t)=>t-e);if(!h.length){t.innerHTML=`<header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>${e(`No fees on record yet.`)}`;return}c=Number(s(`finance-season`,h.map(String),String(c||``)))||c,h.includes(c)||(c=h[0]),t.innerHTML=`
    <header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>
    <div class="tabs" id="fin-years">
      ${h.map(e=>`<button data-year="${e}" class="${e===c?`on`:``}">${e}</button>`).join(``)}
    </div>
    <div id="fin-body"></div>
  `;let g=t.querySelector(`#fin-body`),_=()=>{g.innerHTML=u(m,c)};t.querySelector(`#fin-years`).addEventListener(`click`,e=>{let n=e.target.closest(`button[data-year]`);n&&(c=Number(n.dataset.year),a(`finance-season`,String(c)),t.querySelectorAll(`#fin-years button`).forEach(e=>e.classList.toggle(`on`,Number(e.dataset.year)===c)),_())}),_()}function u(e,n){let r=e.seasons.find(e=>e.season===n),i=e.payments.filter(e=>e.season===n),a=e.payouts.filter(e=>e.season===n),o=e.expenses.filter(e=>e.season===n),s=e.comps.filter(e=>e.season===n),c=Number(r?.buy_in||0),l=i.length,u=c*l,h=x(i,`amount_due`),g=x(i,`amount_paid`),b=h-g,S=x(o,`amount`),C=x(a,`amount`),w=g-S-C;return`
    ${f(c,l,u)}
    ${p({expected:h,collected:g,owed:b,spent:S,paidOut:C,remaining:w})}
    ${m(i)}
    ${_(a,u)}
    ${v(s)}
    ${y(o)}
    ${r?.notes?d(`Notes`,`<div class="card">
                    <div class="card-body">${t(r.notes)}</div></div>`):``}
  `}function d(e,n,r=``){return`<section class="fin-section">
    <h2 class="section-title">${t(e)}${r?`<span class="count">${t(r)}</span>`:``}</h2>
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
    </div>`)}function m(t){if(!t.length)return d(`Dues`,`<div class="card">${e(`Nobody added yet.`)}</div>`);let n=t.filter(e=>g(e).key===`paid`).length;return d(`Dues`,`
    <div class="card duecard">
      ${t.map(h).join(``)}
    </div>`,`${n}/${t.length} paid`)}function h(e){let n=g(e),r=Number(e.amount_due||0),a=Number(e.amount_paid||0),o=r-a,s=n.key===`paid`?i(a):n.key===`partial`?`${i(a)} of ${i(r)}`:`${i(r)} due`;return`
    <div class="due-row">
      <span class="due-dot ${n.cls}" title="${n.label}" aria-hidden="true"></span>
      <span class="due-who">
        ${t(e.owner_name)}
        <span class="sr-only"> — ${n.label}</span>
      </span>
      <span class="due-figure ${o>0?`owing`:``}">${s}</span>
    </div>`}function g(e){let t=Number(e.amount_due||0),n=Number(e.amount_paid||0);return n>=t&&t>0?{key:`paid`,label:`Paid`,cls:`green`}:n>0?{key:`partial`,label:`Partial`,cls:`warn`}:{key:`unpaid`,label:`Unpaid`,cls:`red`}}function _(n,r){if(!n.length)return d(`Prize structure`,`<div class="card">${e(`No payouts set.`)}</div>`);let a=x(n,`amount`),o=r-a;return d(`Prize structure`,`
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Payout</th><th>Winner</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${n.map(e=>`
              <tr>
                <td>
                  ${t(e.title)}
                  ${e.description?`<div class="muted tiny">${t(e.description)}</div>`:``}
                </td>
                <td class="muted">${t(e.winner||`—`)}</td>
                <td class="num">${i(e.amount)}</td>
              </tr>`).join(``)}
            <tr>
              <td colspan="2"><strong>Total payouts</strong></td>
              <td class="num"><strong>${i(a)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      ${r>0&&o!==0?`<div class="card-meta">
        ${o>0?`${i(o)} unallocated`:`<span class="warntext">${i(-o)} over the prize pool</span>`}
      </div>`:``}
    </div>`)}function v(n){return n.length?d(`Side competitions`,`
    <div class="card">
      ${n.map(e=>{let n=e.prize_pool==null?Number(e.buy_in||0)*Number(e.participants||0):Number(e.prize_pool);return`
          <div class="subcard">
            <div class="row" style="justify-content:space-between;align-items:baseline">
              <strong>${t(e.name)}</strong>
              <span class="pill ${e.status===`Finished`?`grey`:`green`}">${t(e.status)}</span>
            </div>
            <div class="statgrid" style="margin:8px 0 4px">
              ${b(`Buy-in`,i(e.buy_in))}
              ${b(`Players`,e.participants)}
              ${b(`Pool`,i(n))}
            </div>
            ${e.winner?`<div class="card-meta">Winner: <strong>${t(e.winner)}</strong></div>`:``}
            ${e.notes?`<div class="muted tiny">${t(e.notes)}</div>`:``}
          </div>`}).join(``)}
    </div>`):d(`Side competitions`,`<div class="card">${e(`None this season.`)}</div>`)}function y(r){return r.length?d(`Expenses`,`
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Item</th><th>Date</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${r.map(e=>`
              <tr>
                <td>
                  ${t(e.description)}
                  ${e.notes?`<div class="muted tiny">${t(e.notes)}</div>`:``}
                </td>
                <td class="muted">${e.expense_date?t(n(e.expense_date)):`—`}</td>
                <td class="num">${i(e.amount)}</td>
              </tr>`).join(``)}
            <tr>
              <td colspan="2"><strong>Total</strong></td>
              <td class="num"><strong>${i(x(r,`amount`))}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`):d(`Expenses`,`<div class="card">${e(`Nothing spent yet.`)}</div>`)}function b(e,n,r=``){return`<div class="stat"><span class="stat-v ${r}">${t(n)}</span><span class="stat-l">${t(e)}</span></div>`}function x(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}export{l as render};