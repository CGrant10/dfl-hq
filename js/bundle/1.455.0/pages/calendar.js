import{An as e,Cn as t,En as n,F as r,Ht as i,I as a,M as o,Mn as s,N as c,On as l,P as u,Sn as d,Xn as f,bn as p,er as m,j as h}from"../app-core-CHZHG8T_.js";var g=`events`;async function _(e){e.innerHTML=`
    <header class="utility-head"><small>LEAGUE SCHEDULE</small><h1>Calendar</h1></header>
    <div class="tabs" id="cal-tabs">
      <button data-tab="events" class="${g===`events`?`on`:``}">Events</button>
      <button data-tab="side"   class="${g===`side`?`on`:``}">Side Events</button>
    </div>
    <div id="cal-body"></div>
  `;let t=e.querySelector(`#cal-body`);a(t,()=>v(t,e)),e.querySelector(`#cal-tabs`).addEventListener(`click`,n=>{let r=n.target.closest(`button[data-tab]`);r&&(g=r.dataset.tab,e.querySelectorAll(`#cal-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.tab===g)),v(t,e))}),v(t,e)}async function v(e,t){if(navigator.onLine===!1){e.innerHTML=d(Error(`Offline`));return}e.innerHTML=l();try{g===`events`?await y(e):await T(e,t)}catch(t){e.innerHTML=d(t)}}async function y(e){let{data:t,error:n}=await f().from(`events`).select(`*`).order(`event_date`,{ascending:!0});if(n)throw n;let i=new Date().toISOString().slice(0,10),a=r(`events`,t),s=a.filter(e=>e.event_date>=i),c=a.filter(e=>e.event_date<i).reverse();e.innerHTML=`
    ${s.length?`<div class="card schedule">${s.map((e,t)=>b(e,!0,t===0)).join(``)}</div>`:p(`Nothing scheduled`,c.length?`Past events are below.`:``)}
    ${o()?`<div class="row-end">${h(`events`,`Add event`)}</div>`:``}
    ${c.length?`
      <h2 class="section-title">Past<span class="count">${c.length}</span></h2>
      <div class="card schedule is-past">${c.map(e=>b(e,!1,!1)).join(``)}</div>`:``}
  `}function b(r,i,a=!1){let o=new Date(String(r.event_date).length===10?r.event_date+`T12:00:00`:r.event_date),s=isNaN(o)?``:o.toLocaleDateString(void 0,{month:`short`}),l=isNaN(o)?`?`:o.getDate();return`
    <div class="evrow ${a?`next`:``} ${u(`events`,r)}">
      <div class="evdate" aria-hidden="true">
        <span class="evmon">${t(s)}</span>
        <span class="evday">${t(l)}</span>
      </div>
      <div class="evbody">
        <div class="evtop">
          ${a?`<span class="ev-next-tag">Next</span>`:``}
          <span class="evtitle">${t(r.title)}</span>
          <span class="pill ${i?`green`:`grey`}">${t(e(r.event_date))}</span>
        </div>
        <div class="evwhen">${t(n(r.event_date,r.event_time))}</div>
        ${r.description?`<div class="evnote">${t(r.description)}</div>`:``}
        ${c(`events`,r,{compact:!0})}
      </div>
    </div>`}var x=!1;async function S(){let e=await f().from(`side_event_signups`).select(`side_event_id, member_id, username`);return e.error?/member_id/.test(e.error.message||``)?(x=!0,f().from(`side_event_signups`).select(`side_event_id, username`)):e:(x=!1,e)}function C(e,t){return(e.member_id==null?null:t.get(String(e.member_id)))?.display_name||e.username||`Someone`}function w(e,t){return t?e.member_id==null?String(e.username||``).trim().toLowerCase()===String(t.display_name||``).trim().toLowerCase():String(e.member_id)===String(t.id):!1}async function T(e,n){let a=i(),[l,d,g]=await Promise.all([f().from(`side_events`).select(`*`).order(`created_at`,{ascending:!1}),S(),f().from(`members`).select(`id, display_name`)]);if(l.error||d.error)throw l.error||d.error;let _=r(`side_events`,l.data||[]),y=d.data||[],b=new Map((g.data||[]).map(e=>[String(e.id),e])),T=o()?`<div class="row-end">${h(`side_events`,`Add side event`)}</div>`:``;if(!_.length){e.innerHTML=p(`No side events yet.`)+T;return}e.innerHTML=`<div id="side-list">${`
    ${x?`<div class="card note">
        <div class="card-body">Joining is not switched on yet. Run
        <strong>side_events_member_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
      </div>`:``}
    ${a||x?``:`<div class="card note">
        <div class="card-body">Pick your name in the top right to join a side event.</div>
      </div>`}`}${_.map(e=>{let n=y.filter(t=>t.side_event_id===e.id),r=n.map(e=>C(e,b)),i=n.some(e=>w(e,a)),o=e.status===`Open`;return`
      <div class="card ${o?`accent`:``} ${u(`side_events`,e)}">
        <div class="card-title">${t(e.title)}</div>
        <div class="card-meta" style="margin:0 0 8px">
          <span class="pill">${t(e.kind)}</span>
          <span class="pill ${o?`green`:`grey`}">${t(e.status)}</span>
          · ${r.length} in
        </div>
        ${e.description?`<div class="card-body">${t(e.description)}</div>`:``}
        ${e.link?`<div style="margin-top:8px"><a href="${t(e.link)}" target="_blank" rel="noopener">Open bracket / pool →</a></div>`:``}
        ${r.length?`<div class="card-meta">Playing: ${t(r.join(`, `))}</div>`:``}
        ${o?`<div class="row-end">
          <button class="btn small ${i?`ghost`:``}" data-join="${e.id}" ${i?`disabled`:``}>
            ${i?`You're in`:`Count me in`}
          </button>
        </div>`:``}
        ${c(`side_events`,e)}
      </div>`}).join(``)}${T}</div>`,e.querySelector(`#side-list`).addEventListener(`click`,async t=>{let r=t.target.closest(`button[data-join]`);if(r){if(!a){s(`Pick your name in the top right to join`,!0);return}r.disabled=!0;try{await m(`side_event_signups`,{side_event_id:Number(r.dataset.join),member_id:Number(a.id)}),s(`You're in`),v(e,n)}catch(e){r.disabled=!1,s(E(e),!0)}}})}function E(e){if(e.code===`23505`)return`You already joined`;let t=e.message||`Could not join`;return/member_id|42703|schema cache/i.test(t)||e.code===`42703`?`Run side_events_member_schema.sql in Supabase to enable joining`:e.code===`42501`||/row-level security/i.test(t)?`Pick your name in the top right, then try again`:t}export{_ as render};