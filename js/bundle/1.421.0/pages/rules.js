import{En as e,F as t,I as n,M as r,N as i,P as a,Sn as o,Yn as s,bn as c,dn as l,j as u,pn as d,xn as f}from"../app-core-BtxfXwZ7.js";var p={scoring:`Scoring`,keeper:`Keepers`,trade:`Trades`,waiver:`Waivers`,playoff:`Playoffs`,general:`General`},m=null;async function h(t){let[i,a]=await Promise.all([s().from(`rules`).select(`*`).order(`sort_order`,{ascending:!0}),s().from(`rule_categories`).select(`*`).order(`sort_order`,{ascending:!0})]);if(i.error){t.innerHTML=`<h1>Rules</h1>`+f(i.error);return}let p=i.data||[],_=e(p,`category`),y=g(a.data,_);if(!y.length){t.innerHTML=`
      <header class="page-head"><h1>League Rules</h1></header>
      ${c(`No rules yet.`)}`;return}m=l(`rules-tab`,y.map(e=>e.key),m),y.some(e=>e.key===m)||(m=y[0].key),t.innerHTML=`
    <header class="page-head utility-head">
      <small>LEAGUE HANDBOOK</small><h1>League Rules</h1>
    </header>

    <div id="rules-wrap">
      <div class="tabs" id="rule-tabs">
        ${y.map(e=>`
          <button data-cat="${o(e.key)}" class="${e.key===m?`on`:``}">
            ${o(e.label)}
            ${_.get(e.key)?.length?`<span class="tabcount">${_.get(e.key).length}</span>`:``}
          </button>`).join(``)}
      </div>

      <div id="rule-body"></div>
    </div>
  `;let b=t.querySelector(`#rule-body`),x=()=>{let e=_.get(m)||[],t=e.reduce((e,t)=>Math.max(e,Number(t.sort_order)||0),0)+1;b.innerHTML=v(e)+(r()?`<div class="row-end">${u(`rules`,`Add rule`,{category:m,sort_order:t})}</div>`:``)};t.querySelector(`#rule-tabs`).addEventListener(`click`,e=>{let n=e.target.closest(`button[data-cat]`);n&&(m=n.dataset.cat,d(`rules-tab`,m),t.querySelectorAll(`#rule-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.cat===m)),x())}),n(t.querySelector(`#rules-wrap`),()=>h(t)),x()}function g(e,t){let n=(e||[]).map(e=>({key:e.key,label:e.label})),r=new Set(n.map(e=>e.key));for(let e of t.keys())!e||r.has(e)||n.push({key:e,label:p[e]||_(e),orphan:!0});return n}function _(e){return String(e).replace(/[_-]+/g,` `).replace(/\b\w/g,e=>e.toUpperCase())}function v(e){let n=t(`rules`,e);return n.length?`<div class="card rulecard">
    ${n.map(e=>`
      <article class="rule ${a(`rules`,e)}">
        ${e.title?`<h3 class="rule-title">${o(e.title)}</h3>`:``}
        <div class="rule-text">${o(e.content)}</div>
        ${i(`rules`,e,{compact:!0})}
      </article>`).join(``)}
  </div>`:c(`Nothing written for this section yet.`)}export{p as DEFAULT_LABELS,h as render};