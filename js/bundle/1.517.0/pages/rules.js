import{F as e,I as t,Lr as n,M as r,Mr as i,N as a,Nr as o,P as s,gn as c,j as l,jr as u,mn as d,zn as f}from"../app-core-DBXVXFOP.js";var p={scoring:`Scoring`,keeper:`Keepers`,trade:`Trades`,waiver:`Waivers`,playoff:`Playoffs`,general:`General`},m=null;async function h(e){let[a,s]=await Promise.all([f().from(`rules`).select(`*`).order(`sort_order`,{ascending:!0}),f().from(`rule_categories`).select(`*`).order(`sort_order`,{ascending:!0})]);if(a.error){e.innerHTML=`<h1>Rules</h1>`+i(a.error);return}let p=a.data||[],_=n(p,`category`),y=g(s.data,_);if(!y.length){e.innerHTML=`
      <header class="page-head"><h1>League Rules</h1></header>
      ${u(`No rules yet.`)}`;return}m=d(`rules-tab`,y.map(e=>e.key),m),y.some(e=>e.key===m)||(m=y[0].key),e.innerHTML=`
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
  `;let b=e.querySelector(`#rule-body`),x=()=>{let e=_.get(m)||[],t=e.reduce((e,t)=>Math.max(e,Number(t.sort_order)||0),0)+1;b.innerHTML=v(e)+(r()?`<div class="row-end">${l(`rules`,`Add rule`,{category:m,sort_order:t})}</div>`:``)};e.querySelector(`#rule-tabs`).addEventListener(`click`,t=>{let n=t.target.closest(`button[data-cat]`);n&&(m=n.dataset.cat,c(`rules-tab`,m),e.querySelectorAll(`#rule-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.cat===m)),x())}),t(e.querySelector(`#rules-wrap`),()=>h(e)),x()}function g(e,t){let n=(e||[]).map(e=>({key:e.key,label:e.label})),r=new Set(n.map(e=>e.key));for(let e of t.keys())!e||r.has(e)||n.push({key:e,label:p[e]||_(e),orphan:!0});return n}function _(e){return String(e).replace(/[_-]+/g,` `).replace(/\b\w/g,e=>e.toUpperCase())}function v(t){let n=e(`rules`,t);return n.length?`<div class="card rulecard">
    ${n.map(e=>`
      <article class="rule ${s(`rules`,e)}">
        ${e.title?`<h3 class="rule-title">${o(e.title)}</h3>`:``}
        <div class="rule-text">${o(e.content)}</div>
        ${a(`rules`,e,{compact:!0})}
      </article>`).join(``)}
  </div>`:u(`Nothing written for this section yet.`)}export{p as DEFAULT_LABELS,h as render};