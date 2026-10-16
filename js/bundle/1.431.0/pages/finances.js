import{Cn as e,On as t,Sn as n,Yn as r,bn as i,dn as a,pn as o,xn as s}from"../app-core-BuUTx-Nz.js";var c=null;async function l(e){let[t,n,l,d,f]=await Promise.all([r().from(`finance_seasons`).select(`*`).order(`season`,{ascending:!1}),r().from(`finance_payments`).select(`*`).order(`owner_name`,{ascending:!0}),r().from(`finance_payouts`).select(`*`).order(`sort_order`,{ascending:!0}),r().from(`finance_expenses`).select(`*`).order(`expense_date`,{ascending:!0}),r().from(`finance_competitions`).select(`*`).order(`name`,{ascending:!0})]),p=t.error||n.error||l.error||d.error||f.error;if(p){e.innerHTML=`<header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>`+s(p)+`<div class="card"><div class="card-body muted">If a table is missing, run
       <strong>finance_schema.sql</strong> in the Supabase SQL editor.</div></div>`;return}let m={seasons:t.data||[],payments:n.data||[],payouts:l.data||[],expenses:d.data||[],comps:f.data||[]},h=[...new Set([...m.seasons.map(e=>e.season),...m.payments.map(e=>e.season),...m.payouts.map(e=>e.season),...m.expenses.map(e=>e.season),...m.comps.map(e=>e.season)])].sort((e,t)=>t-e);if(!h.length){e.innerHTML=`<header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>${i(`No fees on record yet.`)}`;return}c=Number(a(`finance-season`,h.map(String),String(c||``)))||c,h.includes(c)||(c=h[0]),e.innerHTML=`
    <header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>
    <div class="tabs" id="fin-years">
      ${h.map(e=>`<button data-year="${e}" class="${e===c?`on`:``}">${e}</button>`).join(``)}
    </div>
    <div id="fin-body"></div>
  `;let g=e.querySelector(`#fin-body`),_=()=>{g.innerHTML=u(m,c)};e.querySelector(`#fin-years`).addEventListener(`click`,t=>{let n=t.target.closest(`button[data-year]`);n&&(c=Number(n.dataset.year),o(`finance-season`,String(c)),e.querySelectorAll(`#fin-years button`).forEach(e=>e.classList.toggle(`on`,Number(e.dataset.year)===c)),_())}),_()}function u(e,t){let r=e.seasons.find(e=>e.season===t),i=e.payments.filter(e=>e.season===t),a=e.payouts.filter(e=>e.season===t),o=e.expenses.filter(e=>e.season===t),s=e.comps.filter(e=>e.season===t),c=Number(r?.buy_in||0),l=i.length,u=c*l,h=x(i,`amount_due`),g=x(i,`amount_paid`),b=h-g,S=x(o,`amount`),C=x(a,`amount`),w=g-S-C;return`
    ${f(c,l,u)}
    ${p({expected:h,collected:g,owed:b,spent:S,paidOut:C,remaining:w})}
    ${m(i)}
    ${_(a,u)}
    ${v(s)}
    ${y(o)}
    ${r?.notes?d(`Notes`,`<div class="card">
                    <div class="card-body">${n(r.notes)}</div></div>`):``}
  `}function d(e,t,r=``){return`<section class="fin-section">
    <h2 class="section-title">${n(e)}${r?`<span class="count">${n(r)}</span>`:``}</h2>
    ${t}
  </section>`}function f(e,n,r){return d(`League buy-in`,`
    <div class="card fin-summary-card">
      <div class="statgrid">
        ${b(`Buy-in`,t(e))}
        ${b(`Teams`,n)}
        ${b(`Prize pool`,t(r))}
      </div>
    </div>`)}function p(e){let n=e.remaining<0;return d(`Fees summary`,`
    <div class="card fin-summary-card">
      <div class="statgrid">
        
        ${b(`Expected`,t(e.expected))}
        ${b(`Collected`,t(e.collected))}
        ${b(`Owed`,t(e.owed),e.owed>0?`warn`:``)}
        ${b(`Expenses`,t(e.spent))}
        ${b(`Payouts`,t(e.paidOut))}
        ${b(`Balance`,t(e.remaining),n?`bad`:`good`)}
      </div>
      
      ${n?`<div class="card-meta">
        <strong class="warntext">More has been committed than collected.</strong>
      </div>`:``}
    </div>`)}function m(e){if(!e.length)return d(`Dues`,`<div class="card">${i(`Nobody added yet.`)}</div>`);let t=e.filter(e=>g(e).key===`paid`).length;return d(`Dues`,`
    <div class="card duecard">
      ${e.map(h).join(``)}
    </div>`,`${t}/${e.length} paid`)}function h(e){let r=g(e),i=Number(e.amount_due||0),a=Number(e.amount_paid||0),o=i-a,s=r.key===`paid`?t(a):r.key===`partial`?`${t(a)} of ${t(i)}`:`${t(i)} due`;return`
    <div class="due-row">
      <span class="due-dot ${r.cls}" title="${r.label}" aria-hidden="true"></span>
      <span class="due-who">
        ${n(e.owner_name)}
        <span class="sr-only"> — ${r.label}</span>
      </span>
      <span class="due-figure ${o>0?`owing`:``}">${s}</span>
    </div>`}function g(e){let t=Number(e.amount_due||0),n=Number(e.amount_paid||0);return n>=t&&t>0?{key:`paid`,label:`Paid`,cls:`green`}:n>0?{key:`partial`,label:`Partial`,cls:`warn`}:{key:`unpaid`,label:`Unpaid`,cls:`red`}}function _(e,r){if(!e.length)return d(`Prize structure`,`<div class="card">${i(`No payouts set.`)}</div>`);let a=x(e,`amount`),o=r-a;return d(`Prize structure`,`
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Payout</th><th>Winner</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${e.map(e=>`
              <tr>
                <td>
                  ${n(e.title)}
                  ${e.description?`<div class="muted tiny">${n(e.description)}</div>`:``}
                </td>
                <td class="muted">${n(e.winner||`—`)}</td>
                <td class="num">${t(e.amount)}</td>
              </tr>`).join(``)}
            <tr>
              <td colspan="2"><strong>Total payouts</strong></td>
              <td class="num"><strong>${t(a)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      ${r>0&&o!==0?`<div class="card-meta">
        ${o>0?`${t(o)} unallocated`:`<span class="warntext">${t(-o)} over the prize pool</span>`}
      </div>`:``}
    </div>`)}function v(e){return e.length?d(`Side competitions`,`
    <div class="card">
      ${e.map(e=>{let r=e.prize_pool==null?Number(e.buy_in||0)*Number(e.participants||0):Number(e.prize_pool);return`
          <div class="subcard">
            <div class="row" style="justify-content:space-between;align-items:baseline">
              <strong>${n(e.name)}</strong>
              <span class="pill ${e.status===`Finished`?`grey`:`green`}">${n(e.status)}</span>
            </div>
            <div class="statgrid" style="margin:8px 0 4px">
              ${b(`Buy-in`,t(e.buy_in))}
              ${b(`Players`,e.participants)}
              ${b(`Pool`,t(r))}
            </div>
            ${e.winner?`<div class="card-meta">Winner: <strong>${n(e.winner)}</strong></div>`:``}
            ${e.notes?`<div class="muted tiny">${n(e.notes)}</div>`:``}
          </div>`}).join(``)}
    </div>`):d(`Side competitions`,`<div class="card">${i(`None this season.`)}</div>`)}function y(r){return r.length?d(`Expenses`,`
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Item</th><th>Date</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${r.map(r=>`
              <tr>
                <td>
                  ${n(r.description)}
                  ${r.notes?`<div class="muted tiny">${n(r.notes)}</div>`:``}
                </td>
                <td class="muted">${r.expense_date?n(e(r.expense_date)):`—`}</td>
                <td class="num">${t(r.amount)}</td>
              </tr>`).join(``)}
            <tr>
              <td colspan="2"><strong>Total</strong></td>
              <td class="num"><strong>${t(x(r,`amount`))}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`):d(`Expenses`,`<div class="card">${i(`Nothing spent yet.`)}</div>`)}function b(e,t,r=``){return`<div class="stat"><span class="stat-v ${r}">${n(t)}</span><span class="stat-l">${n(e)}</span></div>`}function x(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}export{l as render};