import{F as e,Hr as t,I as n,Ir as r,L as i,Lr as a,N as o,P as s,R as c,Rr as l,Wn as u,xn as d,yn as f}from"../app-core-DJ1rYCZP.js";var p={scoring:`Scoring`,keeper:`Keepers`,trade:`Trades`,waiver:`Waivers`,playoff:`Playoffs`,general:`General`},m=null;async function h(e){let[n,i]=await Promise.all([u().from(`rules`).select(`*`).order(`sort_order`,{ascending:!0}),u().from(`rule_categories`).select(`*`).order(`sort_order`,{ascending:!0})]);if(n.error){e.innerHTML=`<h1>Rules</h1>`+a(n.error);return}let p=n.data||[],_=t(p,`category`),y=g(i.data,_);if(!y.length){e.innerHTML=`
      <header class="page-head"><h1>League Rules</h1></header>
      ${r(`No rules yet.`)}`;return}m=f(`rules-tab`,y.map(e=>e.key),m),y.some(e=>e.key===m)||(m=y[0].key),e.innerHTML=`
    <header class="page-head utility-head">
      <small>LEAGUE HANDBOOK</small><h1>League Rules</h1>
    </header>

    <div id="rules-wrap">
      <div class="tabs" id="rule-tabs">
        ${y.map(e=>`
          <button data-cat="${l(e.key)}" class="${e.key===m?`on`:``}">
            ${l(e.label)}
            ${_.get(e.key)?.length?`<span class="tabcount">${_.get(e.key).length}</span>`:``}
          </button>`).join(``)}
      </div>

      <div id="rule-body"></div>
    </div>
  `;let b=e.querySelector(`#rule-body`),x=()=>{let e=_.get(m)||[],t=e.reduce((e,t)=>Math.max(e,Number(t.sort_order)||0),0)+1;b.innerHTML=v(e)+(s()?`<div class="row-end">${o(`rules`,`Add rule`,{category:m,sort_order:t})}</div>`:``)};e.querySelector(`#rule-tabs`).addEventListener(`click`,t=>{let n=t.target.closest(`button[data-cat]`);n&&(m=n.dataset.cat,d(`rules-tab`,m),e.querySelectorAll(`#rule-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.cat===m)),x())}),c(e.querySelector(`#rules-wrap`),()=>h(e)),x()}function g(e,t){let n=(e||[]).map(e=>({key:e.key,label:e.label})),r=new Set(n.map(e=>e.key));for(let e of t.keys())!e||r.has(e)||n.push({key:e,label:p[e]||_(e),orphan:!0});return n}function _(e){return String(e).replace(/[_-]+/g,` `).replace(/\b\w/g,e=>e.toUpperCase())}function v(t){let a=i(`rules`,t);return a.length?`<div class="card rulecard">
    ${a.map(t=>`
      <article class="rule ${n(`rules`,t)}">
        ${t.title?`<h3 class="rule-title">${l(t.title)}</h3>`:``}
        <div class="rule-text">${l(t.content)}</div>
        ${e(`rules`,t,{compact:!0})}
      </article>`).join(``)}
  </div>`:r(`Nothing written for this section yet.`)}export{p as DEFAULT_LABELS,h as render};