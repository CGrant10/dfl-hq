import{F as e,Fr as t,I as n,M as r,N as i,Nr as a,P as o,Pr as s,Vn as c,gn as l,j as u,vn as d,zr as f}from"../app-core-DwTm3Eo9.js";var p={scoring:`Scoring`,keeper:`Keepers`,trade:`Trades`,waiver:`Waivers`,playoff:`Playoffs`,general:`General`},m=null;async function h(e){let[i,o]=await Promise.all([c().from(`rules`).select(`*`).order(`sort_order`,{ascending:!0}),c().from(`rule_categories`).select(`*`).order(`sort_order`,{ascending:!0})]);if(i.error){e.innerHTML=`<h1>Rules</h1>`+s(i.error);return}let p=i.data||[],_=f(p,`category`),y=g(o.data,_);if(!y.length){e.innerHTML=`
      <header class="page-head"><h1>League Rules</h1></header>
      ${a(`No rules yet.`)}`;return}m=l(`rules-tab`,y.map(e=>e.key),m),y.some(e=>e.key===m)||(m=y[0].key),e.innerHTML=`
    <header class="page-head utility-head">
      <small>LEAGUE HANDBOOK</small><h1>League Rules</h1>
    </header>

    <div id="rules-wrap">
      <div class="tabs" id="rule-tabs">
        ${y.map(e=>`
          <button data-cat="${t(e.key)}" class="${e.key===m?`on`:``}">
            ${t(e.label)}
            ${_.get(e.key)?.length?`<span class="tabcount">${_.get(e.key).length}</span>`:``}
          </button>`).join(``)}
      </div>

      <div id="rule-body"></div>
    </div>
  `;let b=e.querySelector(`#rule-body`),x=()=>{let e=_.get(m)||[],t=e.reduce((e,t)=>Math.max(e,Number(t.sort_order)||0),0)+1;b.innerHTML=v(e)+(r()?`<div class="row-end">${u(`rules`,`Add rule`,{category:m,sort_order:t})}</div>`:``)};e.querySelector(`#rule-tabs`).addEventListener(`click`,t=>{let n=t.target.closest(`button[data-cat]`);n&&(m=n.dataset.cat,d(`rules-tab`,m),e.querySelectorAll(`#rule-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.cat===m)),x())}),n(e.querySelector(`#rules-wrap`),()=>h(e)),x()}function g(e,t){let n=(e||[]).map(e=>({key:e.key,label:e.label})),r=new Set(n.map(e=>e.key));for(let e of t.keys())!e||r.has(e)||n.push({key:e,label:p[e]||_(e),orphan:!0});return n}function _(e){return String(e).replace(/[_-]+/g,` `).replace(/\b\w/g,e=>e.toUpperCase())}function v(n){let r=e(`rules`,n);return r.length?`<div class="card rulecard">
    ${r.map(e=>`
      <article class="rule ${o(`rules`,e)}">
        ${e.title?`<h3 class="rule-title">${t(e.title)}</h3>`:``}
        <div class="rule-text">${t(e.content)}</div>
        ${i(`rules`,e,{compact:!0})}
      </article>`).join(``)}
  </div>`:a(`Nothing written for this section yet.`)}export{p as DEFAULT_LABELS,h as render};