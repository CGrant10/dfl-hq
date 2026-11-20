import{Fr as e,Hn as t,Hr as n,Ir as r,Lr as i,Pr as a,_n as o,yn as s}from"../app-core-_5V0bh1m.js";var c=null;async function l(n){let[r,i,l,d,f]=await Promise.all([t().from(`finance_seasons`).select(`*`).order(`season`,{ascending:!1}),t().from(`finance_payments`).select(`*`).order(`owner_name`,{ascending:!0}),t().from(`finance_payouts`).select(`*`).order(`sort_order`,{ascending:!0}),t().from(`finance_expenses`).select(`*`).order(`expense_date`,{ascending:!0}),t().from(`finance_competitions`).select(`*`).order(`name`,{ascending:!0})]),p=r.error||i.error||l.error||d.error||f.error;if(p){n.innerHTML=`<header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>`+e(p);return}let m={seasons:r.data||[],payments:i.data||[],payouts:l.data||[],expenses:d.data||[],comps:f.data||[]},h=[...new Set([...m.seasons.map(e=>e.season),...m.payments.map(e=>e.season),...m.payouts.map(e=>e.season),...m.expenses.map(e=>e.season),...m.comps.map(e=>e.season)])].sort((e,t)=>t-e);if(!h.length){n.innerHTML=`<header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>${a(`No fees on record yet.`)}`;return}let g=Number(new URLSearchParams(location.hash.split(`?`)[1]||``).get(`season`));c=h.includes(g)?g:Number(o(`finance-season`,h.map(String),String(c||``)))||c,h.includes(c)||(c=h[0]),n.innerHTML=`
    <header class="utility-head"><small>LEAGUE LEDGER</small><h1>League Fees</h1></header>
    <div class="tabs" id="fin-years">
      ${h.map(e=>`<button data-year="${e}" class="${e===c?`on`:``}">${e}</button>`).join(``)}
    </div>
    <div id="fin-body"></div>
  `;let _=n.querySelector(`#fin-body`),v=()=>{_.innerHTML=u(m,c)};n.querySelector(`#fin-years`).addEventListener(`click`,e=>{let t=e.target.closest(`button[data-year]`);t&&(c=Number(t.dataset.year),s(`finance-season`,String(c)),n.querySelectorAll(`#fin-years button`).forEach(e=>e.classList.toggle(`on`,Number(e.dataset.year)===c)),v())}),v()}function u(e,t){let n=e.seasons.find(e=>e.season===t),i=e.payments.filter(e=>e.season===t),a=e.payouts.filter(e=>e.season===t),o=e.expenses.filter(e=>e.season===t),s=e.comps.filter(e=>e.season===t),c=Number(n?.buy_in||0),l=i.length,u=c*l,h=x(i,`amount_due`),g=x(i,`amount_paid`),b=h-g,S=x(o,`amount`),C=x(a,`amount`),w=g-S-C;return`
    ${f(c,l,u)}
    ${p({expected:h,collected:g,owed:b,spent:S,paidOut:C,remaining:w})}
    ${m(i)}
    ${_(a,u)}
    ${v(s)}
    ${y(o)}
    ${n?.notes?d(`Notes`,`<div class="card">
                    <div class="card-body">${r(n.notes)}</div></div>`):``}
  `}function d(e,t,n=``){return`<section class="fin-section">
    <h2 class="section-title">${r(e)}${n?`<span class="count">${r(n)}</span>`:``}</h2>
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
    </div>`)}function m(e){if(!e.length)return d(`Dues`,`<div class="card">${a(`Nobody added yet.`)}</div>`);let t=e.filter(e=>g(e).key===`paid`).length;return d(`Dues`,`
    <div class="card duecard">
      ${e.map(h).join(``)}
    </div>`,`${t}/${e.length} paid`)}function h(e){let t=g(e),i=Number(e.amount_due||0),a=Number(e.amount_paid||0),o=i-a,s=t.key===`paid`?n(a):t.key===`partial`?`${n(a)} of ${n(i)}`:`${n(i)} due`;return`
    <div class="due-row">
      <span class="due-dot ${t.cls}" title="${t.label}" aria-hidden="true"></span>
      <span class="due-who" title="${r(e.owner_name)}">
        ${r(e.owner_name)}
        <span class="sr-only"> — ${t.label}</span>
      </span>
      <span class="due-figure ${o>0?`owing`:``}">${s}</span>
    </div>`}function g(e){let t=Number(e.amount_due||0),n=Number(e.amount_paid||0);return n>=t&&t>0?{key:`paid`,label:`Paid`,cls:`green`}:n>0?{key:`partial`,label:`Partial`,cls:`warn`}:{key:`unpaid`,label:`Unpaid`,cls:`red`}}function _(e,t){if(!e.length)return d(`Prize structure`,`<div class="card">${a(`No payouts set.`)}</div>`);let i=x(e,`amount`),o=t-i;return d(`Prize structure`,`
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Payout</th><th>Winner</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${e.map(e=>`
              <tr>
                <td>
                  ${r(e.title)}
                  ${e.description?`<div class="muted tiny">${r(e.description)}</div>`:``}
                </td>
                <td class="muted">${r(e.winner||`—`)}</td>
                <td class="num">${n(e.amount)}</td>
              </tr>`).join(``)}
            <tr>
              <td colspan="2"><strong>Total payouts</strong></td>
              <td class="num"><strong>${n(i)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      ${t>0&&o!==0?`<div class="card-meta">
        ${o>0?`${n(o)} unallocated`:`<span class="warntext">${n(-o)} over the prize pool</span>`}
      </div>`:``}
    </div>`)}function v(e){return e.length?d(`Side competitions`,`
    <div class="card">
      ${e.map(e=>{let t=e.prize_pool==null?Number(e.buy_in||0)*Number(e.participants||0):Number(e.prize_pool);return`
          <div class="subcard">
            <div class="row" style="justify-content:space-between;align-items:baseline">
              <strong>${r(e.name)}</strong>
              <span class="pill ${e.status===`Finished`?`grey`:`green`}">${r(e.status)}</span>
            </div>
            <div class="statgrid" style="margin:8px 0 4px">
              ${b(`Buy-in`,n(e.buy_in))}
              ${b(`Players`,e.participants)}
              ${b(`Pool`,n(t))}
            </div>
            ${e.winner?`<div class="card-meta">Winner: <strong>${r(e.winner)}</strong></div>`:``}
            ${e.notes?`<div class="muted tiny">${r(e.notes)}</div>`:``}
          </div>`}).join(``)}
    </div>`):d(`Side competitions`,`<div class="card">${a(`None this season.`)}</div>`)}function y(e){return e.length?d(`Expenses`,`
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Item</th><th>Date</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${e.map(e=>`
              <tr>
                <td>
                  ${r(e.description)}
                  ${e.notes?`<div class="muted tiny">${r(e.notes)}</div>`:``}
                </td>
                <td class="muted">${e.expense_date?r(i(e.expense_date)):`—`}</td>
                <td class="num">${n(e.amount)}</td>
              </tr>`).join(``)}
            <tr>
              <td colspan="2"><strong>Total</strong></td>
              <td class="num"><strong>${n(x(e,`amount`))}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`):d(`Expenses`,`<div class="card">${a(`Nothing spent yet.`)}</div>`)}function b(e,t,n=``){return`<div class="stat"><span class="stat-v ${n}">${r(t)}</span><span class="stat-l">${r(e)}</span></div>`}function x(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}export{l as render};