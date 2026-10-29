import{Ar as e,Br as t,F as n,Hr as r,I as i,Ir as a,M as o,Mr as s,N as c,Nr as l,P as u,Rr as d,Un as f,Ut as p,j as m,zn as h}from"../app-core-BvOTPJu9.js";var g=`events`;async function _(e){e.innerHTML=`
    <header class="utility-head"><small>LEAGUE SCHEDULE</small><h1>Calendar</h1></header>
    <div class="tabs" id="cal-tabs">
      <button data-tab="events" class="${g===`events`?`on`:``}">Events</button>
      <button data-tab="side"   class="${g===`side`?`on`:``}">Side Events</button>
    </div>
    <div id="cal-body"></div>
  `;let t=e.querySelector(`#cal-body`);i(t,()=>v(t,e)),e.querySelector(`#cal-tabs`).addEventListener(`click`,n=>{let r=n.target.closest(`button[data-tab]`);r&&(g=r.dataset.tab,e.querySelectorAll(`#cal-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.tab===g)),v(t,e))}),v(t,e)}async function v(e,t){if(navigator.onLine===!1){e.innerHTML=s(Error(`Offline`));return}e.innerHTML=d();try{g===`events`?await y(e):await T(e,t)}catch(t){e.innerHTML=s(t)}}async function y(t){let{data:r,error:i}=await h().from(`events`).select(`*`).order(`event_date`,{ascending:!0});if(i)throw i;let a=new Date().toISOString().slice(0,10),s=n(`events`,r),c=s.filter(e=>e.event_date>=a),l=s.filter(e=>e.event_date<a).reverse();t.innerHTML=`
    ${c.length?`<div class="card schedule">${c.map((e,t)=>b(e,!0,t===0)).join(``)}</div>`:e(`Nothing scheduled`,l.length?`Past events are below.`:``)}
    ${o()?`<div class="row-end">${m(`events`,`Add event`)}</div>`:``}
    ${l.length?`
      <h2 class="section-title">Past<span class="count">${l.length}</span></h2>
      <div class="card schedule is-past">${l.map(e=>b(e,!1,!1)).join(``)}</div>`:``}
  `}function b(e,n,r=!1){let i=new Date(String(e.event_date).length===10?e.event_date+`T12:00:00`:e.event_date),o=isNaN(i)?``:i.toLocaleDateString(void 0,{month:`short`}),s=isNaN(i)?`?`:i.getDate();return`
    <div class="evrow ${r?`next`:``} ${u(`events`,e)}">
      <div class="evdate" aria-hidden="true">
        <span class="evmon">${l(o)}</span>
        <span class="evday">${l(s)}</span>
      </div>
      <div class="evbody">
        <div class="evtop">
          ${r?`<span class="ev-next-tag">Next</span>`:``}
          <span class="evtitle">${l(e.title)}</span>
          <span class="pill ${n?`green`:`grey`}">${l(t(e.event_date))}</span>
        </div>
        <div class="evwhen">${l(a(e.event_date,e.event_time))}</div>
        ${e.description?`<div class="evnote">${l(e.description)}</div>`:``}
        ${c(`events`,e,{compact:!0})}
      </div>
    </div>`}var x=!1;async function S(){let e=await h().from(`side_event_signups`).select(`side_event_id, member_id, username`);return e.error?/member_id/.test(e.error.message||``)?(x=!0,h().from(`side_event_signups`).select(`side_event_id, username`)):e:(x=!1,e)}function C(e,t){return(e.member_id==null?null:t.get(String(e.member_id)))?.display_name||e.username||`Someone`}function w(e,t){return t?e.member_id==null?String(e.username||``).trim().toLowerCase()===String(t.display_name||``).trim().toLowerCase():String(e.member_id)===String(t.id):!1}async function T(t,i){let a=p(),[s,d,g]=await Promise.all([h().from(`side_events`).select(`*`).order(`created_at`,{ascending:!1}),S(),h().from(`members`).select(`id, display_name`)]);if(s.error||d.error)throw s.error||d.error;let _=n(`side_events`,s.data||[]),y=d.data||[],b=new Map((g.data||[]).map(e=>[String(e.id),e])),T=o()?`<div class="row-end">${m(`side_events`,`Add side event`)}</div>`:``;if(!_.length){t.innerHTML=e(`No side events yet.`)+T;return}t.innerHTML=`<div id="side-list">${`
    ${x?`<div class="card note">
        <div class="card-body">Joining is not switched on yet. Run
        <strong>side_events_member_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
      </div>`:``}
    ${a||x?``:`<div class="card note">
        <div class="card-body">Pick your name in the top right to join a side event.</div>
      </div>`}`}${_.map(e=>{let t=y.filter(t=>t.side_event_id===e.id),n=t.map(e=>C(e,b)),r=t.some(e=>w(e,a)),i=e.status===`Open`;return`
      <div class="card ${i?`accent`:``} ${u(`side_events`,e)}">
        <div class="card-title">${l(e.title)}</div>
        <div class="card-meta" style="margin:0 0 8px">
          <span class="pill">${l(e.kind)}</span>
          <span class="pill ${i?`green`:`grey`}">${l(e.status)}</span>
          · ${n.length} in
        </div>
        ${e.description?`<div class="card-body">${l(e.description)}</div>`:``}
        ${e.link?`<div style="margin-top:8px"><a href="${l(e.link)}" target="_blank" rel="noopener">Open bracket / pool →</a></div>`:``}
        ${n.length?`<div class="card-meta">Playing: ${l(n.join(`, `))}</div>`:``}
        ${i?`<div class="row-end">
          <button class="btn small ${r?`ghost`:``}" data-join="${e.id}" ${r?`disabled`:``}>
            ${r?`You're in`:`Count me in`}
          </button>
        </div>`:``}
        ${c(`side_events`,e)}
      </div>`}).join(``)}${T}</div>`,t.querySelector(`#side-list`).addEventListener(`click`,async e=>{let n=e.target.closest(`button[data-join]`);if(n){if(!a){r(`Pick your name in the top right to join`,!0);return}n.disabled=!0;try{await f(`side_event_signups`,{side_event_id:Number(n.dataset.join),member_id:Number(a.id)}),r(`You're in`),v(t,i)}catch(e){n.disabled=!1,r(E(e),!0)}}})}function E(e){if(e.code===`23505`)return`You already joined`;let t=e.message||`Could not join`;return/member_id|42703|schema cache/i.test(t)||e.code===`42703`?`Run side_events_member_schema.sql in Supabase to enable joining`:e.code===`42501`||/row-level security/i.test(t)?`Pick your name in the top right, then try again`:t}export{_ as render};