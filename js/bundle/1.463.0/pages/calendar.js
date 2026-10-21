import{Ar as e,Br as t,F as n,I as r,Ir as i,Ln as a,M as o,N as s,Or as c,P as l,Pr as u,Rr as d,Ut as f,Vn as p,j as m,jr as h}from"../app-core-D3rPgvAm.js";var g=`events`;async function _(e){e.innerHTML=`
    <header class="utility-head"><small>LEAGUE SCHEDULE</small><h1>Calendar</h1></header>
    <div class="tabs" id="cal-tabs">
      <button data-tab="events" class="${g===`events`?`on`:``}">Events</button>
      <button data-tab="side"   class="${g===`side`?`on`:``}">Side Events</button>
    </div>
    <div id="cal-body"></div>
  `;let t=e.querySelector(`#cal-body`);r(t,()=>v(t,e)),e.querySelector(`#cal-tabs`).addEventListener(`click`,n=>{let r=n.target.closest(`button[data-tab]`);r&&(g=r.dataset.tab,e.querySelectorAll(`#cal-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.tab===g)),v(t,e))}),v(t,e)}async function v(t,n){if(navigator.onLine===!1){t.innerHTML=e(Error(`Offline`));return}t.innerHTML=i();try{g===`events`?await y(t):await T(t,n)}catch(n){t.innerHTML=e(n)}}async function y(e){let{data:t,error:r}=await a().from(`events`).select(`*`).order(`event_date`,{ascending:!0});if(r)throw r;let i=new Date().toISOString().slice(0,10),s=n(`events`,t),l=s.filter(e=>e.event_date>=i),u=s.filter(e=>e.event_date<i).reverse();e.innerHTML=`
    ${l.length?`<div class="card schedule">${l.map((e,t)=>b(e,!0,t===0)).join(``)}</div>`:c(`Nothing scheduled`,u.length?`Past events are below.`:``)}
    ${o()?`<div class="row-end">${m(`events`,`Add event`)}</div>`:``}
    ${u.length?`
      <h2 class="section-title">Past<span class="count">${u.length}</span></h2>
      <div class="card schedule is-past">${u.map(e=>b(e,!1,!1)).join(``)}</div>`:``}
  `}function b(e,t,n=!1){let r=new Date(String(e.event_date).length===10?e.event_date+`T12:00:00`:e.event_date),i=isNaN(r)?``:r.toLocaleDateString(void 0,{month:`short`}),a=isNaN(r)?`?`:r.getDate();return`
    <div class="evrow ${n?`next`:``} ${l(`events`,e)}">
      <div class="evdate" aria-hidden="true">
        <span class="evmon">${h(i)}</span>
        <span class="evday">${h(a)}</span>
      </div>
      <div class="evbody">
        <div class="evtop">
          ${n?`<span class="ev-next-tag">Next</span>`:``}
          <span class="evtitle">${h(e.title)}</span>
          <span class="pill ${t?`green`:`grey`}">${h(d(e.event_date))}</span>
        </div>
        <div class="evwhen">${h(u(e.event_date,e.event_time))}</div>
        ${e.description?`<div class="evnote">${h(e.description)}</div>`:``}
        ${s(`events`,e,{compact:!0})}
      </div>
    </div>`}var x=!1;async function S(){let e=await a().from(`side_event_signups`).select(`side_event_id, member_id, username`);return e.error?/member_id/.test(e.error.message||``)?(x=!0,a().from(`side_event_signups`).select(`side_event_id, username`)):e:(x=!1,e)}function C(e,t){return(e.member_id==null?null:t.get(String(e.member_id)))?.display_name||e.username||`Someone`}function w(e,t){return t?e.member_id==null?String(e.username||``).trim().toLowerCase()===String(t.display_name||``).trim().toLowerCase():String(e.member_id)===String(t.id):!1}async function T(e,r){let i=f(),[u,d,g]=await Promise.all([a().from(`side_events`).select(`*`).order(`created_at`,{ascending:!1}),S(),a().from(`members`).select(`id, display_name`)]);if(u.error||d.error)throw u.error||d.error;let _=n(`side_events`,u.data||[]),y=d.data||[],b=new Map((g.data||[]).map(e=>[String(e.id),e])),T=o()?`<div class="row-end">${m(`side_events`,`Add side event`)}</div>`:``;if(!_.length){e.innerHTML=c(`No side events yet.`)+T;return}e.innerHTML=`<div id="side-list">${`
    ${x?`<div class="card note">
        <div class="card-body">Joining is not switched on yet. Run
        <strong>side_events_member_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
      </div>`:``}
    ${i||x?``:`<div class="card note">
        <div class="card-body">Pick your name in the top right to join a side event.</div>
      </div>`}`}${_.map(e=>{let t=y.filter(t=>t.side_event_id===e.id),n=t.map(e=>C(e,b)),r=t.some(e=>w(e,i)),a=e.status===`Open`;return`
      <div class="card ${a?`accent`:``} ${l(`side_events`,e)}">
        <div class="card-title">${h(e.title)}</div>
        <div class="card-meta" style="margin:0 0 8px">
          <span class="pill">${h(e.kind)}</span>
          <span class="pill ${a?`green`:`grey`}">${h(e.status)}</span>
          · ${n.length} in
        </div>
        ${e.description?`<div class="card-body">${h(e.description)}</div>`:``}
        ${e.link?`<div style="margin-top:8px"><a href="${h(e.link)}" target="_blank" rel="noopener">Open bracket / pool →</a></div>`:``}
        ${n.length?`<div class="card-meta">Playing: ${h(n.join(`, `))}</div>`:``}
        ${a?`<div class="row-end">
          <button class="btn small ${r?`ghost`:``}" data-join="${e.id}" ${r?`disabled`:``}>
            ${r?`You're in`:`Count me in`}
          </button>
        </div>`:``}
        ${s(`side_events`,e)}
      </div>`}).join(``)}${T}</div>`,e.querySelector(`#side-list`).addEventListener(`click`,async n=>{let a=n.target.closest(`button[data-join]`);if(a){if(!i){t(`Pick your name in the top right to join`,!0);return}a.disabled=!0;try{await p(`side_event_signups`,{side_event_id:Number(a.dataset.join),member_id:Number(i.id)}),t(`You're in`),v(e,r)}catch(e){a.disabled=!1,t(E(e),!0)}}})}function E(e){if(e.code===`23505`)return`You already joined`;let t=e.message||`Could not join`;return/member_id|42703|schema cache/i.test(t)||e.code===`42703`?`Run side_events_member_schema.sql in Supabase to enable joining`:e.code===`42501`||/row-level security/i.test(t)?`Pick your name in the top right, then try again`:t}export{_ as render};