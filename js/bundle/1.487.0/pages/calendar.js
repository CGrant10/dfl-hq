import{F as e,Fr as t,Hn as n,I as r,Lr as i,M as a,Mr as o,N as s,P as c,Rn as l,Ut as u,Vr as d,j as f,jr as p,kr as m,zr as h}from"../app-core-CxbgLL8E.js";var g=`events`;async function _(e){e.innerHTML=`
    <header class="utility-head"><small>LEAGUE SCHEDULE</small><h1>Calendar</h1></header>
    <div class="tabs" id="cal-tabs">
      <button data-tab="events" class="${g===`events`?`on`:``}">Events</button>
      <button data-tab="side"   class="${g===`side`?`on`:``}">Side Events</button>
    </div>
    <div id="cal-body"></div>
  `;let t=e.querySelector(`#cal-body`);r(t,()=>v(t,e)),e.querySelector(`#cal-tabs`).addEventListener(`click`,n=>{let r=n.target.closest(`button[data-tab]`);r&&(g=r.dataset.tab,e.querySelectorAll(`#cal-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.tab===g)),v(t,e))}),v(t,e)}async function v(e,t){if(navigator.onLine===!1){e.innerHTML=p(Error(`Offline`));return}e.innerHTML=i();try{g===`events`?await y(e):await T(e,t)}catch(t){e.innerHTML=p(t)}}async function y(t){let{data:n,error:r}=await l().from(`events`).select(`*`).order(`event_date`,{ascending:!0});if(r)throw r;let i=new Date().toISOString().slice(0,10),o=e(`events`,n),s=o.filter(e=>e.event_date>=i),c=o.filter(e=>e.event_date<i).reverse();t.innerHTML=`
    ${s.length?`<div class="card schedule">${s.map((e,t)=>b(e,!0,t===0)).join(``)}</div>`:m(`Nothing scheduled`,c.length?`Past events are below.`:``)}
    ${a()?`<div class="row-end">${f(`events`,`Add event`)}</div>`:``}
    ${c.length?`
      <h2 class="section-title">Past<span class="count">${c.length}</span></h2>
      <div class="card schedule is-past">${c.map(e=>b(e,!1,!1)).join(``)}</div>`:``}
  `}function b(e,n,r=!1){let i=new Date(String(e.event_date).length===10?e.event_date+`T12:00:00`:e.event_date),a=isNaN(i)?``:i.toLocaleDateString(void 0,{month:`short`}),l=isNaN(i)?`?`:i.getDate();return`
    <div class="evrow ${r?`next`:``} ${c(`events`,e)}">
      <div class="evdate" aria-hidden="true">
        <span class="evmon">${o(a)}</span>
        <span class="evday">${o(l)}</span>
      </div>
      <div class="evbody">
        <div class="evtop">
          ${r?`<span class="ev-next-tag">Next</span>`:``}
          <span class="evtitle">${o(e.title)}</span>
          <span class="pill ${n?`green`:`grey`}">${o(h(e.event_date))}</span>
        </div>
        <div class="evwhen">${o(t(e.event_date,e.event_time))}</div>
        ${e.description?`<div class="evnote">${o(e.description)}</div>`:``}
        ${s(`events`,e,{compact:!0})}
      </div>
    </div>`}var x=!1;async function S(){let e=await l().from(`side_event_signups`).select(`side_event_id, member_id, username`);return e.error?/member_id/.test(e.error.message||``)?(x=!0,l().from(`side_event_signups`).select(`side_event_id, username`)):e:(x=!1,e)}function C(e,t){return(e.member_id==null?null:t.get(String(e.member_id)))?.display_name||e.username||`Someone`}function w(e,t){return t?e.member_id==null?String(e.username||``).trim().toLowerCase()===String(t.display_name||``).trim().toLowerCase():String(e.member_id)===String(t.id):!1}async function T(t,r){let i=u(),[p,h,g]=await Promise.all([l().from(`side_events`).select(`*`).order(`created_at`,{ascending:!1}),S(),l().from(`members`).select(`id, display_name`)]);if(p.error||h.error)throw p.error||h.error;let _=e(`side_events`,p.data||[]),y=h.data||[],b=new Map((g.data||[]).map(e=>[String(e.id),e])),T=a()?`<div class="row-end">${f(`side_events`,`Add side event`)}</div>`:``;if(!_.length){t.innerHTML=m(`No side events yet.`)+T;return}t.innerHTML=`<div id="side-list">${`
    ${x?`<div class="card note">
        <div class="card-body">Joining is not switched on yet. Run
        <strong>side_events_member_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
      </div>`:``}
    ${i||x?``:`<div class="card note">
        <div class="card-body">Pick your name in the top right to join a side event.</div>
      </div>`}`}${_.map(e=>{let t=y.filter(t=>t.side_event_id===e.id),n=t.map(e=>C(e,b)),r=t.some(e=>w(e,i)),a=e.status===`Open`;return`
      <div class="card ${a?`accent`:``} ${c(`side_events`,e)}">
        <div class="card-title">${o(e.title)}</div>
        <div class="card-meta" style="margin:0 0 8px">
          <span class="pill">${o(e.kind)}</span>
          <span class="pill ${a?`green`:`grey`}">${o(e.status)}</span>
          · ${n.length} in
        </div>
        ${e.description?`<div class="card-body">${o(e.description)}</div>`:``}
        ${e.link?`<div style="margin-top:8px"><a href="${o(e.link)}" target="_blank" rel="noopener">Open bracket / pool →</a></div>`:``}
        ${n.length?`<div class="card-meta">Playing: ${o(n.join(`, `))}</div>`:``}
        ${a?`<div class="row-end">
          <button class="btn small ${r?`ghost`:``}" data-join="${e.id}" ${r?`disabled`:``}>
            ${r?`You're in`:`Count me in`}
          </button>
        </div>`:``}
        ${s(`side_events`,e)}
      </div>`}).join(``)}${T}</div>`,t.querySelector(`#side-list`).addEventListener(`click`,async e=>{let a=e.target.closest(`button[data-join]`);if(a){if(!i){d(`Pick your name in the top right to join`,!0);return}a.disabled=!0;try{await n(`side_event_signups`,{side_event_id:Number(a.dataset.join),member_id:Number(i.id)}),d(`You're in`),v(t,r)}catch(e){a.disabled=!1,d(E(e),!0)}}})}function E(e){if(e.code===`23505`)return`You already joined`;let t=e.message||`Could not join`;return/member_id|42703|schema cache/i.test(t)||e.code===`42703`?`Run side_events_member_schema.sql in Supabase to enable joining`:e.code===`42501`||/row-level security/i.test(t)?`Pick your name in the top right, then try again`:t}export{_ as render};