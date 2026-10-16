import{Cn as e,Dn as t,F as n,I as r,M as i,N as a,P as o,Sn as s,Xn as c,fn as l,j as u,mn as d,xn as f}from"../app-core-z_urOxHY.js";var p={scoring:`Scoring`,keeper:`Keepers`,trade:`Trades`,waiver:`Waivers`,playoff:`Playoffs`,general:`General`},m=null;async function h(n){let[a,o]=await Promise.all([c().from(`rules`).select(`*`).order(`sort_order`,{ascending:!0}),c().from(`rule_categories`).select(`*`).order(`sort_order`,{ascending:!0})]);if(a.error){n.innerHTML=`<h1>Rules</h1>`+s(a.error);return}let p=a.data||[],_=t(p,`category`),y=g(o.data,_);if(!y.length){n.innerHTML=`
      <header class="page-head"><h1>League Rules</h1></header>
      ${f(`No rules yet.`)}`;return}m=l(`rules-tab`,y.map(e=>e.key),m),y.some(e=>e.key===m)||(m=y[0].key),n.innerHTML=`
    <header class="page-head utility-head">
      <small>LEAGUE HANDBOOK</small><h1>League Rules</h1>
    </header>

    <div id="rules-wrap">
      <div class="tabs" id="rule-tabs">
        ${y.map(t=>`
          <button data-cat="${e(t.key)}" class="${t.key===m?`on`:``}">
            ${e(t.label)}
            ${_.get(t.key)?.length?`<span class="tabcount">${_.get(t.key).length}</span>`:``}
          </button>`).join(``)}
      </div>

      <div id="rule-body"></div>
    </div>
  `;let b=n.querySelector(`#rule-body`),x=()=>{let e=_.get(m)||[],t=e.reduce((e,t)=>Math.max(e,Number(t.sort_order)||0),0)+1;b.innerHTML=v(e)+(i()?`<div class="row-end">${u(`rules`,`Add rule`,{category:m,sort_order:t})}</div>`:``)};n.querySelector(`#rule-tabs`).addEventListener(`click`,e=>{let t=e.target.closest(`button[data-cat]`);t&&(m=t.dataset.cat,d(`rules-tab`,m),n.querySelectorAll(`#rule-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.cat===m)),x())}),r(n.querySelector(`#rules-wrap`),()=>h(n)),x()}function g(e,t){let n=(e||[]).map(e=>({key:e.key,label:e.label})),r=new Set(n.map(e=>e.key));for(let e of t.keys())!e||r.has(e)||n.push({key:e,label:p[e]||_(e),orphan:!0});return n}function _(e){return String(e).replace(/[_-]+/g,` `).replace(/\b\w/g,e=>e.toUpperCase())}function v(t){let r=n(`rules`,t);return r.length?`<div class="card rulecard">
    ${r.map(t=>`
      <article class="rule ${o(`rules`,t)}">
        ${t.title?`<h3 class="rule-title">${e(t.title)}</h3>`:``}
        <div class="rule-text">${e(t.content)}</div>
        ${a(`rules`,t,{compact:!0})}
      </article>`).join(``)}
  </div>`:f(`Nothing written for this section yet.`)}export{p as DEFAULT_LABELS,h as render};