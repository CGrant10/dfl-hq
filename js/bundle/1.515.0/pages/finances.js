import{Mr as e,Nr as t,Pr as n,gn as r,jr as i,mn as a,zn as o,zr as s}from"../app-core-BvOTPJu9.js";var c=null;async function l(t){let[n,s,l,d,f]=await Promise.all([o().from(`finance_seasons`).select(`*`).order(`season`,{ascending:!1}),o().from(`finance_payments`).select(`*`).order(`owner_name`,{ascending:!0}),o().from(`finance_payouts`).select(`*`).order(`sort_order`,{ascending:!0}),o().from(`finance_expenses`).select(`*`).order(`expense_date`,{ascending:!0}),o().from(`finance_competitions`).select(`*`).order(`name`,{ascending:!0})]),p=n.error||s.error||l.error||d.error||f.error;if(p){t.innerHTML=`<header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>`+e(p)+`<div class="card"><div class="card-body muted">If a table is missing, run
       <strong>finance_schema.sql</strong> in the Supabase SQL editor.</div></div>`;return}let m={seasons:n.data||[],payments:s.data||[],payouts:l.data||[],expenses:d.data||[],comps:f.data||[]},h=[...new Set([...m.seasons.map(e=>e.season),...m.payments.map(e=>e.season),...m.payouts.map(e=>e.season),...m.expenses.map(e=>e.season),...m.comps.map(e=>e.season)])].sort((e,t)=>t-e);if(!h.length){t.innerHTML=`<header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>${i(`No fees on record yet.`)}`;return}c=Number(a(`finance-season`,h.map(String),String(c||``)))||c,h.includes(c)||(c=h[0]),t.innerHTML=`
    <header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>
    <div class="tabs" id="fin-years">
      ${h.map(e=>`<button data-year="${e}" class="${e===c?`on`:``}">${e}</button>`).join(``)}
    </div>
    <div id="fin-body"></div>
  `;let g=t.querySelector(`#fin-body`),_=()=>{g.innerHTML=u(m,c)};t.querySelector(`#fin-years`).addEventListener(`click`,e=>{let n=e.target.closest(`button[data-year]`);n&&(c=Number(n.dataset.year),r(`finance-season`,String(c)),t.querySelectorAll(`#fin-years button`).forEach(e=>e.classList.toggle(`on`,Number(e.dataset.year)===c)),_())}),_()}function u(e,n){let r=e.seasons.find(e=>e.season===n),i=e.payments.filter(e=>e.season===n),a=e.payouts.filter(e=>e.season===n),o=e.expenses.filter(e=>e.season===n),s=e.comps.filter(e=>e.season===n),c=Number(r?.buy_in||0),l=i.length,u=c*l,h=x(i,`amount_due`),g=x(i,`amount_paid`),b=h-g,S=x(o,`amount`),C=x(a,`amount`),w=g-S-C;return`
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
        ${b(`Buy-in`,s(e))}
        ${b(`Teams`,t)}
        ${b(`Prize pool`,s(n))}
      </div>
    </div>`)}function p(e){let t=e.remaining<0;return d(`Fees summary`,`
    <div class="card fin-summary-card">
      <div class="statgrid">
        
        ${b(`Expected`,s(e.expected))}
        ${b(`Collected`,s(e.collected))}
        ${b(`Owed`,s(e.owed),e.owed>0?`warn`:``)}
        ${b(`Expenses`,s(e.spent))}
        ${b(`Payouts`,s(e.paidOut))}
        ${b(`Balance`,s(e.remaining),t?`bad`:`good`)}
      </div>
      
      ${t?`<div class="card-meta">
        <strong class="warntext">More has been committed than collected.</strong>
      </div>`:``}
    </div>`)}function m(e){if(!e.length)return d(`Dues`,`<div class="card">${i(`Nobody added yet.`)}</div>`);let t=e.filter(e=>g(e).key===`paid`).length;return d(`Dues`,`
    <div class="card duecard">
      ${e.map(h).join(``)}
    </div>`,`${t}/${e.length} paid`)}function h(e){let n=g(e),r=Number(e.amount_due||0),i=Number(e.amount_paid||0),a=r-i,o=n.key===`paid`?s(i):n.key===`partial`?`${s(i)} of ${s(r)}`:`${s(r)} due`;return`
    <div class="due-row">
      <span class="due-dot ${n.cls}" title="${n.label}" aria-hidden="true"></span>
      <span class="due-who">
        ${t(e.owner_name)}
        <span class="sr-only"> — ${n.label}</span>
      </span>
      <span class="due-figure ${a>0?`owing`:``}">${o}</span>
    </div>`}function g(e){let t=Number(e.amount_due||0),n=Number(e.amount_paid||0);return n>=t&&t>0?{key:`paid`,label:`Paid`,cls:`green`}:n>0?{key:`partial`,label:`Partial`,cls:`warn`}:{key:`unpaid`,label:`Unpaid`,cls:`red`}}function _(e,n){if(!e.length)return d(`Prize structure`,`<div class="card">${i(`No payouts set.`)}</div>`);let r=x(e,`amount`),a=n-r;return d(`Prize structure`,`
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Payout</th><th>Winner</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${e.map(e=>`
              <tr>
                <td>
                  ${t(e.title)}
                  ${e.description?`<div class="muted tiny">${t(e.description)}</div>`:``}
                </td>
                <td class="muted">${t(e.winner||`—`)}</td>
                <td class="num">${s(e.amount)}</td>
              </tr>`).join(``)}
            <tr>
              <td colspan="2"><strong>Total payouts</strong></td>
              <td class="num"><strong>${s(r)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      ${n>0&&a!==0?`<div class="card-meta">
        ${a>0?`${s(a)} unallocated`:`<span class="warntext">${s(-a)} over the prize pool</span>`}
      </div>`:``}
    </div>`)}function v(e){return e.length?d(`Side competitions`,`
    <div class="card">
      ${e.map(e=>{let n=e.prize_pool==null?Number(e.buy_in||0)*Number(e.participants||0):Number(e.prize_pool);return`
          <div class="subcard">
            <div class="row" style="justify-content:space-between;align-items:baseline">
              <strong>${t(e.name)}</strong>
              <span class="pill ${e.status===`Finished`?`grey`:`green`}">${t(e.status)}</span>
            </div>
            <div class="statgrid" style="margin:8px 0 4px">
              ${b(`Buy-in`,s(e.buy_in))}
              ${b(`Players`,e.participants)}
              ${b(`Pool`,s(n))}
            </div>
            ${e.winner?`<div class="card-meta">Winner: <strong>${t(e.winner)}</strong></div>`:``}
            ${e.notes?`<div class="muted tiny">${t(e.notes)}</div>`:``}
          </div>`}).join(``)}
    </div>`):d(`Side competitions`,`<div class="card">${i(`None this season.`)}</div>`)}function y(e){return e.length?d(`Expenses`,`
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Item</th><th>Date</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${e.map(e=>`
              <tr>
                <td>
                  ${t(e.description)}
                  ${e.notes?`<div class="muted tiny">${t(e.notes)}</div>`:``}
                </td>
                <td class="muted">${e.expense_date?t(n(e.expense_date)):`—`}</td>
                <td class="num">${s(e.amount)}</td>
              </tr>`).join(``)}
            <tr>
              <td colspan="2"><strong>Total</strong></td>
              <td class="num"><strong>${s(x(e,`amount`))}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`):d(`Expenses`,`<div class="card">${i(`Nothing spent yet.`)}</div>`)}function b(e,n,r=``){return`<div class="stat"><span class="stat-v ${r}">${t(n)}</span><span class="stat-l">${t(e)}</span></div>`}function x(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}export{l as render};