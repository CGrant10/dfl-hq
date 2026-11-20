import{F as e,Fr as t,Gr as n,Hn as r,I as i,Ir as a,Kn as o,M as s,N as c,Nr as l,P as u,Ur as d,Ut as f,Vr as p,j as m,zr as h}from"../app-core-_5V0bh1m.js";var g=`events`;async function _(e){new URLSearchParams(location.hash.split(`?`)[1]||``).has(`event`)&&(g=`events`),e.innerHTML=`
    <header class="utility-head"><small>LEAGUE SCHEDULE</small><h1>Calendar</h1></header>
    <div class="tabs" id="cal-tabs">
      <button data-tab="events" class="${g===`events`?`on`:``}">Events</button>
      <button data-tab="side"   class="${g===`side`?`on`:``}">Side Events</button>
    </div>
    <div id="cal-body"></div>
  `;let t=e.querySelector(`#cal-body`);i(t,()=>v(t,e)),e.querySelector(`#cal-tabs`).addEventListener(`click`,n=>{let r=n.target.closest(`button[data-tab]`);r&&(g=r.dataset.tab,e.querySelectorAll(`#cal-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.tab===g)),v(t,e))}),await v(t,e)}async function v(e,n){if(navigator.onLine===!1){e.innerHTML=t(Error(`Offline`));return}e.innerHTML=p();try{g===`events`?await y(e):await T(e,n)}catch(n){e.innerHTML=t(n)}}async function y(t){let{data:n,error:i}=await r().from(`events`).select(`*`).order(`event_date`,{ascending:!0});if(i)throw i;let a=new Date().toISOString().slice(0,10),o=e(`events`,n),c=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`event`);if(c&&!o.some(e=>String(e.id)===c)){t.innerHTML=`<section class="state" role="status">This event is no longer available. <a class="linkbtn" href="#/calendar">All events →</a></section>`;return}let u=o.filter(e=>e.event_date>=a),d=o.filter(e=>e.event_date<a).reverse();t.innerHTML=`
    ${u.length?`<div class="card schedule">${u.map((e,t)=>b(e,!0,t===0)).join(``)}</div>`:l(`Nothing scheduled`)}
    ${s()?`<div class="row-end">${m(`events`,`Add event`)}</div>`:``}
    ${d.length?`
      <h2 class="section-title">Past<span class="count">${d.length}</span></h2>
      <div class="card schedule is-past">${d.map(e=>b(e,!1,!1)).join(``)}</div>`:``}
  `}function b(e,t,n=!1){let r=new Date(String(e.event_date).length===10?e.event_date+`T12:00:00`:e.event_date),i=isNaN(r)?``:r.toLocaleDateString(void 0,{month:`short`}),o=isNaN(r)?`?`:r.getDate();return`
    <div data-story-event="${a(e.id)}" ${new URLSearchParams(location.hash.split(`?`)[1]||``).get(`event`)===String(e.id)?`data-route-focus tabindex="-1"`:``} class="evrow ${n?`next`:``} ${u(`events`,e)}">
      <div class="evdate" aria-hidden="true">
        <span class="evmon">${a(i)}</span>
        <span class="evday">${a(o)}</span>
      </div>
      <div class="evbody">
        <div class="evtop">
          ${n?`<span class="ev-next-tag">Next</span>`:``}
          <span class="evtitle">${a(e.title)}</span>
          <span class="pill ${t?`green`:`grey`}">${a(d(e.event_date))}</span>
        </div>
        <div class="evwhen">${a(h(e.event_date,e.event_time))}</div>
        ${e.description?`<div class="evnote">${a(e.description)}</div>`:``}
        ${c(`events`,e,{compact:!0})}
      </div>
    </div>`}var x=!1;async function S(){let e=await r().from(`side_event_signups`).select(`side_event_id, member_id, username`);return e.error?/member_id/.test(e.error.message||``)?(x=!0,r().from(`side_event_signups`).select(`side_event_id, username`)):e:(x=!1,e)}function C(e,t){return(e.member_id==null?null:t.get(String(e.member_id)))?.display_name||e.username||`Someone`}function w(e,t){return t?e.member_id==null?String(e.username||``).trim().toLowerCase()===String(t.display_name||``).trim().toLowerCase():String(e.member_id)===String(t.id):!1}async function T(t,i){let d=f(),[p,h,g]=await Promise.all([r().from(`side_events`).select(`*`).order(`created_at`,{ascending:!1}),S(),r().from(`members`).select(`id, display_name`)]);if(p.error||h.error)throw p.error||h.error;let _=e(`side_events`,p.data||[]),y=h.data||[],b=new Map((g.data||[]).map(e=>[String(e.id),e])),T=s()?`<div class="row-end">${m(`side_events`,`Add side event`)}</div>`:``;if(!_.length){t.innerHTML=l(`No side events yet.`)+T;return}t.innerHTML=`<div id="side-list">${`
    ${x?`<div class="card note">
        <div class="card-body">Joining is not switched on yet. Run
        <strong>side_events_member_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
      </div>`:``}
    ${d||x?``:`<div class="card note">
        <div class="card-body">Pick your name in the top right to join a side event.</div>
      </div>`}`}${_.map(e=>{let t=y.filter(t=>t.side_event_id===e.id),n=t.map(e=>C(e,b)),r=t.some(e=>w(e,d)),i=e.status===`Open`;return`
      <div class="card ${i?`accent`:``} ${u(`side_events`,e)}">
        <div class="card-title">${a(e.title)}</div>
        <div class="card-meta" style="margin:0 0 8px">
          <span class="pill">${a(e.kind)}</span>
          <span class="pill ${i?`green`:`grey`}">${a(e.status)}</span>
          · ${n.length} in
        </div>
        ${e.description?`<div class="card-body">${a(e.description)}</div>`:``}
        ${e.link?`<div style="margin-top:8px"><a href="${a(e.link)}" target="_blank" rel="noopener">Open bracket / pool →</a></div>`:``}
        ${n.length?`<div class="card-meta">Playing: ${a(n.join(`, `))}</div>`:``}
        ${i?`<div class="row-end">
          <button class="btn small ${r?`ghost`:``}" data-join="${e.id}" ${r?`disabled`:``}>
            ${r?`You're in`:`Count me in`}
          </button>
        </div>`:``}
        ${c(`side_events`,e)}
      </div>`}).join(``)}${T}</div>`,t.querySelector(`#side-list`).addEventListener(`click`,async e=>{let r=e.target.closest(`button[data-join]`);if(r){if(!d){n(`Pick your name in the top right to join`,!0);return}r.disabled=!0;try{await o(`side_event_signups`,{side_event_id:Number(r.dataset.join),member_id:Number(d.id)}),n(`You're in`),v(t,i)}catch(e){r.disabled=!1,n(E(e),!0)}}})}function E(e){if(e.code===`23505`)return`You already joined`;let t=e.message||`Could not join`;return/member_id|42703|schema cache/i.test(t)||e.code===`42703`?`Run side_events_member_schema.sql in Supabase to enable joining`:e.code===`42501`||/row-level security/i.test(t)?`Pick your name in the top right, then try again`:t}export{_ as render};