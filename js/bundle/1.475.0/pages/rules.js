import{Ar as e,F as t,I as n,Ir as r,M as i,Mr as a,N as o,P as s,Rn as c,hn as l,j as u,jr as d,pn as f}from"../app-core-IU0YLukr.js";var p={scoring:`Scoring`,keeper:`Keepers`,trade:`Trades`,waiver:`Waivers`,playoff:`Playoffs`,general:`General`},m=null;async function h(t){let[o,s]=await Promise.all([c().from(`rules`).select(`*`).order(`sort_order`,{ascending:!0}),c().from(`rule_categories`).select(`*`).order(`sort_order`,{ascending:!0})]);if(o.error){t.innerHTML=`<h1>Rules</h1>`+d(o.error);return}let p=o.data||[],_=r(p,`category`),y=g(s.data,_);if(!y.length){t.innerHTML=`
      <header class="page-head"><h1>League Rules</h1></header>
      ${e(`No rules yet.`)}`;return}m=f(`rules-tab`,y.map(e=>e.key),m),y.some(e=>e.key===m)||(m=y[0].key),t.innerHTML=`
    <header class="page-head utility-head">
      <small>LEAGUE HANDBOOK</small><h1>League Rules</h1>
    </header>

    <div id="rules-wrap">
      <div class="tabs" id="rule-tabs">
        ${y.map(e=>`
          <button data-cat="${a(e.key)}" class="${e.key===m?`on`:``}">
            ${a(e.label)}
            ${_.get(e.key)?.length?`<span class="tabcount">${_.get(e.key).length}</span>`:``}
          </button>`).join(``)}
      </div>

      <div id="rule-body"></div>
    </div>
  `;let b=t.querySelector(`#rule-body`),x=()=>{let e=_.get(m)||[],t=e.reduce((e,t)=>Math.max(e,Number(t.sort_order)||0),0)+1;b.innerHTML=v(e)+(i()?`<div class="row-end">${u(`rules`,`Add rule`,{category:m,sort_order:t})}</div>`:``)};t.querySelector(`#rule-tabs`).addEventListener(`click`,e=>{let n=e.target.closest(`button[data-cat]`);n&&(m=n.dataset.cat,l(`rules-tab`,m),t.querySelectorAll(`#rule-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.cat===m)),x())}),n(t.querySelector(`#rules-wrap`),()=>h(t)),x()}function g(e,t){let n=(e||[]).map(e=>({key:e.key,label:e.label})),r=new Set(n.map(e=>e.key));for(let e of t.keys())!e||r.has(e)||n.push({key:e,label:p[e]||_(e),orphan:!0});return n}function _(e){return String(e).replace(/[_-]+/g,` `).replace(/\b\w/g,e=>e.toUpperCase())}function v(n){let r=t(`rules`,n);return r.length?`<div class="card rulecard">
    ${r.map(e=>`
      <article class="rule ${s(`rules`,e)}">
        ${e.title?`<h3 class="rule-title">${a(e.title)}</h3>`:``}
        <div class="rule-text">${a(e.content)}</div>
        ${o(`rules`,e,{compact:!0})}
      </article>`).join(``)}
  </div>`:e(`Nothing written for this section yet.`)}export{p as DEFAULT_LABELS,h as render};