import{F as e,Fr as t,I as n,Kn as r,Mr as i,N as a,P as o,Pr as s,Ur as c,Ut as l,Vn as u,Wr as d,j as f}from"../app-core-DB2nIyQT.js";var p=!1;async function m(){let e=await u().from(`votes`).select(`poll_id, member_id, username, answer`);return e.error?/member_id/.test(e.error.message||``)?(p=!0,u().from(`votes`).select(`poll_id, username, answer`)):e:(p=!1,e)}async function h(t){let a=l(),o=r(),[c,d,v]=await Promise.all([u().from(`polls`).select(`*`).order(`created_at`,{ascending:!1}),m(),u().from(`members`).select(`id, display_name, team_name`)]);if(c.error||d.error){t.innerHTML=s(c.error||d.error);return}let S=c.data||[],C=d.data||[],w=new Map((v.data||[]).map(e=>[String(e.id),e])),T=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`poll`),E=e(`polls`,S).filter(e=>!T||String(e.id)===T);if(T&&!E.length){t.innerHTML=`<header class="page-head"><h1>Polls</h1></header><section class="state" role="status">This poll is no longer available. <a class="linkbtn" href="#/polls">All polls →</a></section>`;return}let D=T?E:E.filter(e=>e.active),O=T?[]:E.filter(e=>!e.active),k=D.length?`
    ${O.length?`<h2 class="section-title">Open<span class="count">${D.length}</span></h2>`:``}
    ${D.map(e=>x(e,C,w,a,o)).join(``)}`:``,A=O.length?`
    <section class="poll-archive" data-collapse="polls-closed"
             data-collapse-default="folded"
             data-collapse-title="Closed polls"
             data-collapse-badge="${O.length}">
      ${O.map(e=>x(e,C,w,a,o)).join(``)}
    </section>`:``;t.innerHTML=`
    <div id="poll-list" class="polls-page">
      <header class="page-head">
        <h1>Polls</h1>${T?`<a class="linkbtn" href="#/polls">All polls →</a>`:``}
        ${f(`polls`,`Add poll`)}
      </header>
      ${p?`<div class="card note">
          <div class="card-body">Voting is not switched on yet. Run
          <strong>polls_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
        </div>`:``}

      ${a||!S.length?``:`<div class="card note">
          <div class="card-body">Pick your name in the top right to vote.</div>
        </div>`}

      ${S.length?``:i(`No polls yet`,a?``:`Choose your profile to vote when a poll opens.`,a?``:`<button type="button" class="linkbtn" data-open-profile>Choose profile →</button>`)}

      ${k}
      ${A}
    </div>
  `;let j=t.querySelector(`#poll-list`);n(j,()=>h(t)),j.addEventListener(`click`,e=>{let n=e.target.closest(`button[data-answer]`),r=e.target.closest(`button[data-clear-poll]`),i=e.target.closest(`button[data-toggle-poll]`),o=e.target.closest(`button[data-reset-poll]`);if(n)return g(t,n,a);if(r)return _(t,r,a);if(i)return y(t,i);if(o)return b(t,o)})}async function g(e,t,n){if(!n){d(`Pick your name in the top right first`,!0);return}if(t.dataset.mine===`true`)return;t.disabled=!0;let{error:r}=await u().rpc(`cast_vote`,{p_poll_id:Number(t.dataset.poll),p_member_id:Number(n.id),p_answer:t.dataset.answer});if(r){t.disabled=!1,d(v(r),!0);return}d(t.dataset.had===`true`?`Vote changed`:`Vote counted`),h(e)}async function _(e,t,n){if(!n)return;t.disabled=!0;let{error:r}=await u().rpc(`clear_vote`,{p_poll_id:Number(t.dataset.clearPoll),p_member_id:Number(n.id)});if(r){t.disabled=!1,d(v(r),!0);return}d(`Vote removed`),h(e)}function v(e){let t=e.message||`Could not save your vote`;return/could not find the function|does not exist|schema cache/i.test(t)?`Run polls_schema.sql in Supabase to enable voting`:t}async function y(e,t){let n=t.dataset.active===`true`;t.disabled=!0;let{error:r}=await u().from(`polls`).update({active:!n}).eq(`id`,t.dataset.togglePoll);if(r){d(r.message,!0),t.disabled=!1;return}d(n?`Poll closed`:`Poll reopened`),h(e)}async function b(e,t){if(!confirm(`Delete every vote on this poll? This cannot be undone.`))return;t.disabled=!0;let{error:n}=await u().from(`votes`).delete().eq(`poll_id`,t.dataset.resetPoll);if(n){d(n.message,!0),t.disabled=!1;return}d(`Votes reset`),h(e)}function x(e,n,r,i,s){let l=c(e.options),u=n.filter(t=>t.poll_id===e.id),d=i?u.find(e=>w(e,i)):null;return`
    <article data-story-poll="${t(e.id)}" ${new URLSearchParams(location.hash.split(`?`)[1]||``).get(`poll`)===String(e.id)?`data-route-focus tabindex="-1"`:``} class="card poll ${e.active?`is-open`:``} ${o(`polls`,e)}">
      <header class="poll-head">
        <h3 class="poll-q">${t(e.question)}</h3>
        <div class="meta-row">
          <span class="pill ${e.active?`green`:`grey`}">${e.active?`Open`:`Closed`}</span>
          <span class="muted tiny">${u.length} vote${u.length===1?``:`s`}</span>
          ${d?`<span class="pill">You picked ${t(d.answer)}</span>`:``}
        </div>
      </header>

      ${S(e,l,u,r,d,!!i)}

      ${e.active?`<p class="poll-you">
             ${d?`Tap another option to change your vote.
                  <button class="linkbtn" data-clear-poll="${e.id}">Remove my vote</button>`:i?`Tap an option to vote.`:`Pick your name in the top right to vote.`}
           </p>`:`<p class="poll-you">This poll is closed. Results are final.</p>`}

      ${s?`
        <footer class="poll-admin">
          <span class="admin-tag">Admin</span>
          ${a(`polls`,e,{compact:!0})}
          <button class="btn ghost small" data-toggle-poll="${e.id}" data-active="${e.active}">
            ${e.active?`Close poll`:`Reopen`}
          </button>
          ${u.length?`<button class="btn ghost small" data-reset-poll="${e.id}">Reset votes</button>`:``}
        </footer>`:``}
    </article>`}function S(e,n,r,i,a,o){let s=r.length||1,c=[...new Set([...n,...r.map(e=>e.answer)])];return c.length?`<div class="results">${c.map(c=>{let l=r.filter(e=>e.answer===c),u=Math.round(l.length/s*100),d=a?.answer===c,f=!n.includes(c),p=e.active&&!f,m=`
      <div class="result-top">
        <span>${d?`<span class="you-dot" aria-hidden="true"></span>`:``}${t(c)}${f?` <span class="muted tiny">(removed)</span>`:``}</span>
        <span class="result-n">${l.length} · ${u}%</span>
      </div>`;return`
      <div class="result ${d?`mine`:``}">
        ${p?`<button class="result-pick" data-poll="${e.id}" data-answer="${t(c)}"
                     data-mine="${d}" data-had="${!!a}"
                     ${o?``:`disabled`}
                     aria-pressed="${d}">${m}</button>`:m}
        <div class="bar"><span style="width:${u}%"></span></div>
        ${l.length?`<div class="voters">${l.map(e=>`<span class="voter ${a&&e===a?`is-you`:``}">${t(C(e,i))}</span>`).join(``)}</div>`:`<div class="voters"><span class="muted tiny">nobody yet</span></div>`}
      </div>`}).join(``)}</div>`:`<p class="muted tiny">This poll has no options yet.</p>`}function C(e,t){return(e.member_id==null?null:t.get(String(e.member_id)))?.display_name||e.username||`Someone`}function w(e,t){return e.member_id==null?String(e.username||``).trim().toLowerCase()===String(t.display_name||``).trim().toLowerCase():String(e.member_id)===String(t.id)}export{h as render};