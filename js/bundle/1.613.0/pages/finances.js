import{Ir as e,Lr as t,Rr as n,Wn as r,Wr as i,xn as a,yn as o,zr as s}from"../app-core-DJ1rYCZP.js";var c=null;async function l(n){let[i,s,l,d,f]=await Promise.all([r().from(`finance_seasons`).select(`*`).order(`season`,{ascending:!1}),r().from(`finance_payments`).select(`*`).order(`owner_name`,{ascending:!0}),r().from(`finance_payouts`).select(`*`).order(`sort_order`,{ascending:!0}),r().from(`finance_expenses`).select(`*`).order(`expense_date`,{ascending:!0}),r().from(`finance_competitions`).select(`*`).order(`name`,{ascending:!0})]),p=i.error||s.error||l.error||d.error||f.error;if(p){n.innerHTML=`<header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>`+t(p);return}let m={seasons:i.data||[],payments:s.data||[],payouts:l.data||[],expenses:d.data||[],comps:f.data||[]},h=[...new Set([...m.seasons.map(e=>e.season),...m.payments.map(e=>e.season),...m.payouts.map(e=>e.season),...m.expenses.map(e=>e.season),...m.comps.map(e=>e.season)])].sort((e,t)=>t-e);if(!h.length){n.innerHTML=`<header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>${e(`No fees on record yet.`)}`;return}let g=Number(new URLSearchParams(location.hash.split(`?`)[1]||``).get(`season`));c=h.includes(g)?g:Number(o(`finance-season`,h.map(String),String(c||``)))||c,h.includes(c)||(c=h[0]),n.innerHTML=`
    <header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>
    <div class="tabs" id="fin-years">
      ${h.map(e=>`<button data-year="${e}" class="${e===c?`on`:``}">${e}</button>`).join(``)}
    </div>
    <div id="fin-body"></div>
  `;let _=n.querySelector(`#fin-body`),v=()=>{_.innerHTML=u(m,c)};n.querySelector(`#fin-years`).addEventListener(`click`,e=>{let t=e.target.closest(`button[data-year]`);t&&(c=Number(t.dataset.year),a(`finance-season`,String(c)),n.querySelectorAll(`#fin-years button`).forEach(e=>e.classList.toggle(`on`,Number(e.dataset.year)===c)),v())}),v()}function u(e,t){let r=e.seasons.find(e=>e.season===t),i=e.payments.filter(e=>e.season===t),a=e.payouts.filter(e=>e.season===t),o=e.expenses.filter(e=>e.season===t),s=e.comps.filter(e=>e.season===t),c=Number(r?.buy_in||0),l=i.length,u=c*l,h=x(i,`amount_due`),g=x(i,`amount_paid`),b=h-g,S=x(o,`amount`),C=x(a,`amount`),w=g-S-C;return`
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
    </div>`,`${n}/${t.length} paid`)}function h(e){let t=g(e),r=Number(e.amount_due||0),a=Number(e.amount_paid||0),o=r-a,s=t.key===`paid`?i(a):t.key===`partial`?`${i(a)} of ${i(r)}`:`${i(r)} due`;return`
    <div class="due-row">
      <span class="due-dot ${t.cls}" title="${t.label}" aria-hidden="true"></span>
      <span class="due-who" title="${n(e.owner_name)}">
        ${n(e.owner_name)}
        <span class="sr-only"> — ${t.label}</span>
      </span>
      <span class="due-figure ${o>0?`owing`:``}">${s}</span>
    </div>`}function g(e){let t=Number(e.amount_due||0),n=Number(e.amount_paid||0);return n>=t&&t>0?{key:`paid`,label:`Paid`,cls:`green`}:n>0?{key:`partial`,label:`Partial`,cls:`warn`}:{key:`unpaid`,label:`Unpaid`,cls:`red`}}function _(t,r){if(!t.length)return d(`Prize structure`,`<div class="card">${e(`No payouts set.`)}</div>`);let a=x(t,`amount`),o=r-a;return d(`Prize structure`,`
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Payout</th><th>Winner</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${t.map(e=>`
              <tr>
                <td>
                  ${n(e.title)}
                  ${e.description?`<div class="muted tiny">${n(e.description)}</div>`:``}
                </td>
                <td class="muted">${n(e.winner||`—`)}</td>
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
    </div>`)}function v(t){return t.length?d(`Side competitions`,`
    <div class="card">
      ${t.map(e=>{let t=e.prize_pool==null?Number(e.buy_in||0)*Number(e.participants||0):Number(e.prize_pool);return`
          <div class="subcard">
            <div class="row" style="justify-content:space-between;align-items:baseline">
              <strong>${n(e.name)}</strong>
              <span class="pill ${e.status===`Finished`?`grey`:`green`}">${n(e.status)}</span>
            </div>
            <div class="statgrid" style="margin:8px 0 4px">
              ${b(`Buy-in`,i(e.buy_in))}
              ${b(`Players`,e.participants)}
              ${b(`Pool`,i(t))}
            </div>
            ${e.winner?`<div class="card-meta">Winner: <strong>${n(e.winner)}</strong></div>`:``}
            ${e.notes?`<div class="muted tiny">${n(e.notes)}</div>`:``}
          </div>`}).join(``)}
    </div>`):d(`Side competitions`,`<div class="card">${e(`None this season.`)}</div>`)}function y(t){return t.length?d(`Expenses`,`
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Item</th><th>Date</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${t.map(e=>`
              <tr>
                <td>
                  ${n(e.description)}
                  ${e.notes?`<div class="muted tiny">${n(e.notes)}</div>`:``}
                </td>
                <td class="muted">${e.expense_date?n(s(e.expense_date)):`—`}</td>
                <td class="num">${i(e.amount)}</td>
              </tr>`).join(``)}
            <tr>
              <td colspan="2"><strong>Total</strong></td>
              <td class="num"><strong>${i(x(t,`amount`))}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`):d(`Expenses`,`<div class="card">${e(`Nothing spent yet.`)}</div>`)}function b(e,t,r=``){return`<div class="stat"><span class="stat-v ${r}">${n(t)}</span><span class="stat-l">${n(e)}</span></div>`}function x(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}export{l as render};