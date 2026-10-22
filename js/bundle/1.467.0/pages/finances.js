import{Ar as e,Ln as t,Lr as n,Mr as r,fn as i,jr as a,kr as o,mn as s}from"../app-core-D55Bgs9I.js";var c=null;async function l(n){let[r,a,l,d,f]=await Promise.all([t().from(`finance_seasons`).select(`*`).order(`season`,{ascending:!1}),t().from(`finance_payments`).select(`*`).order(`owner_name`,{ascending:!0}),t().from(`finance_payouts`).select(`*`).order(`sort_order`,{ascending:!0}),t().from(`finance_expenses`).select(`*`).order(`expense_date`,{ascending:!0}),t().from(`finance_competitions`).select(`*`).order(`name`,{ascending:!0})]),p=r.error||a.error||l.error||d.error||f.error;if(p){n.innerHTML=`<header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>`+e(p)+`<div class="card"><div class="card-body muted">If a table is missing, run
       <strong>finance_schema.sql</strong> in the Supabase SQL editor.</div></div>`;return}let m={seasons:r.data||[],payments:a.data||[],payouts:l.data||[],expenses:d.data||[],comps:f.data||[]},h=[...new Set([...m.seasons.map(e=>e.season),...m.payments.map(e=>e.season),...m.payouts.map(e=>e.season),...m.expenses.map(e=>e.season),...m.comps.map(e=>e.season)])].sort((e,t)=>t-e);if(!h.length){n.innerHTML=`<header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>${o(`No fees on record yet.`)}`;return}c=Number(i(`finance-season`,h.map(String),String(c||``)))||c,h.includes(c)||(c=h[0]),n.innerHTML=`
    <header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>
    <div class="tabs" id="fin-years">
      ${h.map(e=>`<button data-year="${e}" class="${e===c?`on`:``}">${e}</button>`).join(``)}
    </div>
    <div id="fin-body"></div>
  `;let g=n.querySelector(`#fin-body`),_=()=>{g.innerHTML=u(m,c)};n.querySelector(`#fin-years`).addEventListener(`click`,e=>{let t=e.target.closest(`button[data-year]`);t&&(c=Number(t.dataset.year),s(`finance-season`,String(c)),n.querySelectorAll(`#fin-years button`).forEach(e=>e.classList.toggle(`on`,Number(e.dataset.year)===c)),_())}),_()}function u(e,t){let n=e.seasons.find(e=>e.season===t),r=e.payments.filter(e=>e.season===t),i=e.payouts.filter(e=>e.season===t),o=e.expenses.filter(e=>e.season===t),s=e.comps.filter(e=>e.season===t),c=Number(n?.buy_in||0),l=r.length,u=c*l,h=x(r,`amount_due`),g=x(r,`amount_paid`),b=h-g,S=x(o,`amount`),C=x(i,`amount`),w=g-S-C;return`
    ${f(c,l,u)}
    ${p({expected:h,collected:g,owed:b,spent:S,paidOut:C,remaining:w})}
    ${m(r)}
    ${_(i,u)}
    ${v(s)}
    ${y(o)}
    ${n?.notes?d(`Notes`,`<div class="card">
                    <div class="card-body">${a(n.notes)}</div></div>`):``}
  `}function d(e,t,n=``){return`<section class="fin-section">
    <h2 class="section-title">${a(e)}${n?`<span class="count">${a(n)}</span>`:``}</h2>
    ${t}
  </section>`}function f(e,t,r){return d(`League buy-in`,`
    <div class="card fin-summary-card">
      <div class="statgrid">
        ${b(`Buy-in`,n(e))}
        ${b(`Teams`,t)}
        ${b(`Prize pool`,n(r))}
      </div>
    </div>`)}function p(e){let t=e.remaining<0;return d(`Fees summary`,`
    <div class="card fin-summary-card">
      <div class="statgrid">
        
        ${b(`Expected`,n(e.expected))}
        ${b(`Collected`,n(e.collected))}
        ${b(`Owed`,n(e.owed),e.owed>0?`warn`:``)}
        ${b(`Expenses`,n(e.spent))}
        ${b(`Payouts`,n(e.paidOut))}
        ${b(`Balance`,n(e.remaining),t?`bad`:`good`)}
      </div>
      
      ${t?`<div class="card-meta">
        <strong class="warntext">More has been committed than collected.</strong>
      </div>`:``}
    </div>`)}function m(e){if(!e.length)return d(`Dues`,`<div class="card">${o(`Nobody added yet.`)}</div>`);let t=e.filter(e=>g(e).key===`paid`).length;return d(`Dues`,`
    <div class="card duecard">
      ${e.map(h).join(``)}
    </div>`,`${t}/${e.length} paid`)}function h(e){let t=g(e),r=Number(e.amount_due||0),i=Number(e.amount_paid||0),o=r-i,s=t.key===`paid`?n(i):t.key===`partial`?`${n(i)} of ${n(r)}`:`${n(r)} due`;return`
    <div class="due-row">
      <span class="due-dot ${t.cls}" title="${t.label}" aria-hidden="true"></span>
      <span class="due-who">
        ${a(e.owner_name)}
        <span class="sr-only"> — ${t.label}</span>
      </span>
      <span class="due-figure ${o>0?`owing`:``}">${s}</span>
    </div>`}function g(e){let t=Number(e.amount_due||0),n=Number(e.amount_paid||0);return n>=t&&t>0?{key:`paid`,label:`Paid`,cls:`green`}:n>0?{key:`partial`,label:`Partial`,cls:`warn`}:{key:`unpaid`,label:`Unpaid`,cls:`red`}}function _(e,t){if(!e.length)return d(`Prize structure`,`<div class="card">${o(`No payouts set.`)}</div>`);let r=x(e,`amount`),i=t-r;return d(`Prize structure`,`
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Payout</th><th>Winner</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${e.map(e=>`
              <tr>
                <td>
                  ${a(e.title)}
                  ${e.description?`<div class="muted tiny">${a(e.description)}</div>`:``}
                </td>
                <td class="muted">${a(e.winner||`—`)}</td>
                <td class="num">${n(e.amount)}</td>
              </tr>`).join(``)}
            <tr>
              <td colspan="2"><strong>Total payouts</strong></td>
              <td class="num"><strong>${n(r)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      ${t>0&&i!==0?`<div class="card-meta">
        ${i>0?`${n(i)} unallocated`:`<span class="warntext">${n(-i)} over the prize pool</span>`}
      </div>`:``}
    </div>`)}function v(e){return e.length?d(`Side competitions`,`
    <div class="card">
      ${e.map(e=>{let t=e.prize_pool==null?Number(e.buy_in||0)*Number(e.participants||0):Number(e.prize_pool);return`
          <div class="subcard">
            <div class="row" style="justify-content:space-between;align-items:baseline">
              <strong>${a(e.name)}</strong>
              <span class="pill ${e.status===`Finished`?`grey`:`green`}">${a(e.status)}</span>
            </div>
            <div class="statgrid" style="margin:8px 0 4px">
              ${b(`Buy-in`,n(e.buy_in))}
              ${b(`Players`,e.participants)}
              ${b(`Pool`,n(t))}
            </div>
            ${e.winner?`<div class="card-meta">Winner: <strong>${a(e.winner)}</strong></div>`:``}
            ${e.notes?`<div class="muted tiny">${a(e.notes)}</div>`:``}
          </div>`}).join(``)}
    </div>`):d(`Side competitions`,`<div class="card">${o(`None this season.`)}</div>`)}function y(e){return e.length?d(`Expenses`,`
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Item</th><th>Date</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${e.map(e=>`
              <tr>
                <td>
                  ${a(e.description)}
                  ${e.notes?`<div class="muted tiny">${a(e.notes)}</div>`:``}
                </td>
                <td class="muted">${e.expense_date?a(r(e.expense_date)):`—`}</td>
                <td class="num">${n(e.amount)}</td>
              </tr>`).join(``)}
            <tr>
              <td colspan="2"><strong>Total</strong></td>
              <td class="num"><strong>${n(x(e,`amount`))}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`):d(`Expenses`,`<div class="card">${o(`Nothing spent yet.`)}</div>`)}function b(e,t,n=``){return`<div class="stat"><span class="stat-v ${n}">${a(t)}</span><span class="stat-l">${a(e)}</span></div>`}function x(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}export{l as render};