import{F as e,Fr as t,Gr as n,Gt as r,I as i,Jn as a,L as o,Lr as s,N as c,P as l,R as u,Rr as d,Ur as f,Vr as p,Wn as m,qr as h}from"../app-core-DJ1rYCZP.js";var g=`events`;async function _(e){new URLSearchParams(location.hash.split(`?`)[1]||``).has(`event`)&&(g=`events`),e.innerHTML=`
    <header class="utility-head"><small>LEAGUE SCHEDULE</small><h1>Calendar</h1></header>
    <div class="tabs" id="cal-tabs">
      <button data-tab="events" class="${g===`events`?`on`:``}">Events</button>
      <button data-tab="side"   class="${g===`side`?`on`:``}">Side Events</button>
    </div>
    <div id="cal-body"></div>
  `;let t=e.querySelector(`#cal-body`);u(t,()=>v(t,e)),e.querySelector(`#cal-tabs`).addEventListener(`click`,n=>{let r=n.target.closest(`button[data-tab]`);r&&(g=r.dataset.tab,e.querySelectorAll(`#cal-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.tab===g)),v(t,e))}),await v(t,e)}async function v(e,t){if(navigator.onLine===!1){e.innerHTML=s(Error(`Offline`));return}e.innerHTML=f();try{g===`events`?await y(e):await T(e,t)}catch(t){e.innerHTML=s(t)}}async function y(e){let{data:n,error:r}=await m().from(`events`).select(`*`).order(`event_date`,{ascending:!0});if(r)throw r;let i=new Date().toISOString().slice(0,10),a=o(`events`,n),s=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`event`);if(s&&!a.some(e=>String(e.id)===s)){e.innerHTML=`<section class="state" role="status">This event is no longer available. <a class="linkbtn" href="#/calendar">All events →</a></section>`;return}let u=a.filter(e=>e.event_date>=i),d=a.filter(e=>e.event_date<i).reverse();e.innerHTML=`
    ${u.length?`<div class="card schedule">${u.map((e,t)=>b(e,!0,t===0)).join(``)}</div>`:t(`Nothing scheduled`)}
    ${l()?`<div class="row-end">${c(`events`,`Add event`)}</div>`:``}
    ${d.length?`
      <h2 class="section-title">Past<span class="count">${d.length}</span></h2>
      <div class="card schedule is-past">${d.map(e=>b(e,!1,!1)).join(``)}</div>`:``}
  `}function b(t,r,a=!1){let o=new Date(String(t.event_date).length===10?t.event_date+`T12:00:00`:t.event_date),s=isNaN(o)?``:o.toLocaleDateString(void 0,{month:`short`}),c=isNaN(o)?`?`:o.getDate();return`
    <div data-story-event="${d(t.id)}" ${new URLSearchParams(location.hash.split(`?`)[1]||``).get(`event`)===String(t.id)?`data-route-focus tabindex="-1"`:``} class="evrow ${a?`next`:``} ${i(`events`,t)}">
      <div class="evdate" aria-hidden="true">
        <span class="evmon">${d(s)}</span>
        <span class="evday">${d(c)}</span>
      </div>
      <div class="evbody">
        <div class="evtop">
          ${a?`<span class="ev-next-tag">Next</span>`:``}
          <span class="evtitle">${d(t.title)}</span>
          <span class="pill ${r?`green`:`grey`}">${d(n(t.event_date))}</span>
        </div>
        <div class="evwhen">${d(p(t.event_date,t.event_time))}</div>
        ${t.description?`<div class="evnote">${d(t.description)}</div>`:``}
        ${e(`events`,t,{compact:!0})}
      </div>
    </div>`}var x=!1;async function S(){let e=await m().from(`side_event_signups`).select(`side_event_id, member_id, username`);return e.error?/member_id/.test(e.error.message||``)?(x=!0,m().from(`side_event_signups`).select(`side_event_id, username`)):e:(x=!1,e)}function C(e,t){return(e.member_id==null?null:t.get(String(e.member_id)))?.display_name||e.username||`Someone`}function w(e,t){return t?e.member_id==null?String(e.username||``).trim().toLowerCase()===String(t.display_name||``).trim().toLowerCase():String(e.member_id)===String(t.id):!1}async function T(n,s){let u=r(),[f,p,g]=await Promise.all([m().from(`side_events`).select(`*`).order(`created_at`,{ascending:!1}),S(),m().from(`members`).select(`id, display_name`)]);if(f.error||p.error)throw f.error||p.error;let _=o(`side_events`,f.data||[]),y=p.data||[],b=new Map((g.data||[]).map(e=>[String(e.id),e])),T=l()?`<div class="row-end">${c(`side_events`,`Add side event`)}</div>`:``;if(!_.length){n.innerHTML=t(`No side events yet.`)+T;return}n.innerHTML=`<div id="side-list">${`
    ${x?`<div class="card note">
        <div class="card-body">Joining is not switched on yet. Run
        <strong>side_events_member_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
      </div>`:``}
    ${u||x?``:`<div class="card note">
        <div class="card-body">Pick your name in the top right to join a side event.</div>
      </div>`}`}${_.map(t=>{let n=y.filter(e=>e.side_event_id===t.id),r=n.map(e=>C(e,b)),a=n.some(e=>w(e,u)),o=t.status===`Open`;return`
      <div class="card ${o?`accent`:``} ${i(`side_events`,t)}">
        <div class="card-title">${d(t.title)}</div>
        <div class="card-meta" style="margin:0 0 8px">
          <span class="pill">${d(t.kind)}</span>
          <span class="pill ${o?`green`:`grey`}">${d(t.status)}</span>
          · ${r.length} in
        </div>
        ${t.description?`<div class="card-body">${d(t.description)}</div>`:``}
        ${t.link?`<div style="margin-top:8px"><a href="${d(t.link)}" target="_blank" rel="noopener">Open bracket / pool →</a></div>`:``}
        ${r.length?`<div class="card-meta">Playing: ${d(r.join(`, `))}</div>`:``}
        ${o?`<div class="row-end">
          <button class="btn small ${a?`ghost`:``}" data-join="${t.id}" ${a?`disabled`:``}>
            ${a?`You're in`:`Count me in`}
          </button>
        </div>`:``}
        ${e(`side_events`,t)}
      </div>`}).join(``)}${T}</div>`,n.querySelector(`#side-list`).addEventListener(`click`,async e=>{let t=e.target.closest(`button[data-join]`);if(t){if(!u){h(`Pick your name in the top right to join`,!0);return}t.disabled=!0;try{await a(`side_event_signups`,{side_event_id:Number(t.dataset.join),member_id:Number(u.id)}),h(`You're in`),v(n,s)}catch(e){t.disabled=!1,h(E(e),!0)}}})}function E(e){if(e.code===`23505`)return`You already joined`;let t=e.message||`Could not join`;return/member_id|42703|schema cache/i.test(t)||e.code===`42703`?`Run side_events_member_schema.sql in Supabase to enable joining`:e.code===`42501`||/row-level security/i.test(t)?`Pick your name in the top right, then try again`:t}export{_ as render};