import{Br as e,F as t,Fr as n,Gn as r,Hr as i,I as a,M as o,Mr as s,N as c,P as l,Pr as u,Rr as d,Ut as f,Vn as p,Wr as m,j as h}from"../app-core-DUzSwxhI.js";var g=`events`;async function _(e){new URLSearchParams(location.hash.split(`?`)[1]||``).has(`event`)&&(g=`events`),e.innerHTML=`
    <header class="utility-head"><small>LEAGUE SCHEDULE</small><h1>Calendar</h1></header>
    <div class="tabs" id="cal-tabs">
      <button data-tab="events" class="${g===`events`?`on`:``}">Events</button>
      <button data-tab="side"   class="${g===`side`?`on`:``}">Side Events</button>
    </div>
    <div id="cal-body"></div>
  `;let t=e.querySelector(`#cal-body`);a(t,()=>v(t,e)),e.querySelector(`#cal-tabs`).addEventListener(`click`,n=>{let r=n.target.closest(`button[data-tab]`);r&&(g=r.dataset.tab,e.querySelectorAll(`#cal-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.tab===g)),v(t,e))}),await v(t,e)}async function v(t,n){if(navigator.onLine===!1){t.innerHTML=u(Error(`Offline`));return}t.innerHTML=e();try{g===`events`?await y(t):await T(t,n)}catch(e){t.innerHTML=u(e)}}async function y(e){let{data:n,error:r}=await p().from(`events`).select(`*`).order(`event_date`,{ascending:!0});if(r)throw r;let i=new Date().toISOString().slice(0,10),a=t(`events`,n),c=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`event`);if(c&&!a.some(e=>String(e.id)===c)){e.innerHTML=`<section class="state" role="status">This event is no longer available. <a class="linkbtn" href="#/calendar">All events →</a></section>`;return}let l=a.filter(e=>e.event_date>=i),u=a.filter(e=>e.event_date<i).reverse();e.innerHTML=`
    ${l.length?`<div class="card schedule">${l.map((e,t)=>b(e,!0,t===0)).join(``)}</div>`:s(`Nothing scheduled`,u.length?`Past events are below.`:``)}
    ${o()?`<div class="row-end">${h(`events`,`Add event`)}</div>`:``}
    ${u.length?`
      <h2 class="section-title">Past<span class="count">${u.length}</span></h2>
      <div class="card schedule is-past">${u.map(e=>b(e,!1,!1)).join(``)}</div>`:``}
  `}function b(e,t,r=!1){let a=new Date(String(e.event_date).length===10?e.event_date+`T12:00:00`:e.event_date),o=isNaN(a)?``:a.toLocaleDateString(void 0,{month:`short`}),s=isNaN(a)?`?`:a.getDate();return`
    <div data-story-event="${n(e.id)}" ${new URLSearchParams(location.hash.split(`?`)[1]||``).get(`event`)===String(e.id)?`data-route-focus tabindex="-1"`:``} class="evrow ${r?`next`:``} ${l(`events`,e)}">
      <div class="evdate" aria-hidden="true">
        <span class="evmon">${n(o)}</span>
        <span class="evday">${n(s)}</span>
      </div>
      <div class="evbody">
        <div class="evtop">
          ${r?`<span class="ev-next-tag">Next</span>`:``}
          <span class="evtitle">${n(e.title)}</span>
          <span class="pill ${t?`green`:`grey`}">${n(i(e.event_date))}</span>
        </div>
        <div class="evwhen">${n(d(e.event_date,e.event_time))}</div>
        ${e.description?`<div class="evnote">${n(e.description)}</div>`:``}
        ${c(`events`,e,{compact:!0})}
      </div>
    </div>`}var x=!1;async function S(){let e=await p().from(`side_event_signups`).select(`side_event_id, member_id, username`);return e.error?/member_id/.test(e.error.message||``)?(x=!0,p().from(`side_event_signups`).select(`side_event_id, username`)):e:(x=!1,e)}function C(e,t){return(e.member_id==null?null:t.get(String(e.member_id)))?.display_name||e.username||`Someone`}function w(e,t){return t?e.member_id==null?String(e.username||``).trim().toLowerCase()===String(t.display_name||``).trim().toLowerCase():String(e.member_id)===String(t.id):!1}async function T(e,i){let a=f(),[u,d,g]=await Promise.all([p().from(`side_events`).select(`*`).order(`created_at`,{ascending:!1}),S(),p().from(`members`).select(`id, display_name`)]);if(u.error||d.error)throw u.error||d.error;let _=t(`side_events`,u.data||[]),y=d.data||[],b=new Map((g.data||[]).map(e=>[String(e.id),e])),T=o()?`<div class="row-end">${h(`side_events`,`Add side event`)}</div>`:``;if(!_.length){e.innerHTML=s(`No side events yet.`)+T;return}e.innerHTML=`<div id="side-list">${`
    ${x?`<div class="card note">
        <div class="card-body">Joining is not switched on yet. Run
        <strong>side_events_member_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
      </div>`:``}
    ${a||x?``:`<div class="card note">
        <div class="card-body">Pick your name in the top right to join a side event.</div>
      </div>`}`}${_.map(e=>{let t=y.filter(t=>t.side_event_id===e.id),r=t.map(e=>C(e,b)),i=t.some(e=>w(e,a)),o=e.status===`Open`;return`
      <div class="card ${o?`accent`:``} ${l(`side_events`,e)}">
        <div class="card-title">${n(e.title)}</div>
        <div class="card-meta" style="margin:0 0 8px">
          <span class="pill">${n(e.kind)}</span>
          <span class="pill ${o?`green`:`grey`}">${n(e.status)}</span>
          · ${r.length} in
        </div>
        ${e.description?`<div class="card-body">${n(e.description)}</div>`:``}
        ${e.link?`<div style="margin-top:8px"><a href="${n(e.link)}" target="_blank" rel="noopener">Open bracket / pool →</a></div>`:``}
        ${r.length?`<div class="card-meta">Playing: ${n(r.join(`, `))}</div>`:``}
        ${o?`<div class="row-end">
          <button class="btn small ${i?`ghost`:``}" data-join="${e.id}" ${i?`disabled`:``}>
            ${i?`You're in`:`Count me in`}
          </button>
        </div>`:``}
        ${c(`side_events`,e)}
      </div>`}).join(``)}${T}</div>`,e.querySelector(`#side-list`).addEventListener(`click`,async t=>{let n=t.target.closest(`button[data-join]`);if(n){if(!a){m(`Pick your name in the top right to join`,!0);return}n.disabled=!0;try{await r(`side_event_signups`,{side_event_id:Number(n.dataset.join),member_id:Number(a.id)}),m(`You're in`),v(e,i)}catch(e){n.disabled=!1,m(E(e),!0)}}})}function E(e){if(e.code===`23505`)return`You already joined`;let t=e.message||`Could not join`;return/member_id|42703|schema cache/i.test(t)||e.code===`42703`?`Run side_events_member_schema.sql in Supabase to enable joining`:e.code===`42501`||/row-level security/i.test(t)?`Pick your name in the top right, then try again`:t}export{_ as render};