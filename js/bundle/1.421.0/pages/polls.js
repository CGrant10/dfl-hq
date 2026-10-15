import{An as e,F as t,Ht as n,I as r,N as i,P as a,Sn as o,Yn as s,er as c,j as l,jn as u,xn as d,yn as f}from"../app-core-B1qjkzQy.js";var p=!1;async function m(){let e=await s().from(`votes`).select(`poll_id, member_id, username, answer`);return e.error?/member_id/.test(e.error.message||``)?(p=!0,s().from(`votes`).select(`poll_id, username, answer`)):e:(p=!1,e)}async function h(e){let i=n(),a=c(),[o,u,v]=await Promise.all([s().from(`polls`).select(`*`).order(`created_at`,{ascending:!1}),m(),s().from(`members`).select(`id, display_name, team_name`)]);if(o.error||u.error){e.innerHTML=d(o.error||u.error);return}let S=o.data||[],C=u.data||[],w=new Map((v.data||[]).map(e=>[String(e.id),e])),T=t(`polls`,S),E=T.filter(e=>e.active),D=T.filter(e=>!e.active),O=E.length?`
    ${D.length?`<h2 class="section-title">Open<span class="count">${E.length}</span></h2>`:``}
    ${E.map(e=>x(e,C,w,i,a)).join(``)}`:``,k=D.length?`
    <section class="poll-archive" data-collapse="polls-closed"
             data-collapse-default="folded"
             data-collapse-title="Closed polls"
             data-collapse-badge="${D.length}">
      ${D.map(e=>x(e,C,w,i,a)).join(``)}
    </section>`:``;e.innerHTML=`
    <div id="poll-list" class="polls-page">
      <header class="page-head">
        <h1>Polls</h1>
        ${l(`polls`,`Add poll`)}
      </header>
      ${p?`<div class="card note">
          <div class="card-body">Voting is not switched on yet. Run
          <strong>polls_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
        </div>`:``}

      ${i||!S.length?``:`<div class="card note">
          <div class="card-body">Pick your name in the top right to vote.</div>
        </div>`}

      ${S.length?``:f(`No polls yet`,i?``:`Choose your profile to vote when a poll opens.`,i?``:`<button type="button" class="linkbtn" data-open-profile>Choose profile →</button>`)}

      ${O}
      ${k}
    </div>
  `;let A=e.querySelector(`#poll-list`);r(A,()=>h(e)),A.addEventListener(`click`,t=>{let n=t.target.closest(`button[data-answer]`),r=t.target.closest(`button[data-clear-poll]`),a=t.target.closest(`button[data-toggle-poll]`),o=t.target.closest(`button[data-reset-poll]`);if(n)return g(e,n,i);if(r)return _(e,r,i);if(a)return y(e,a);if(o)return b(e,o)})}async function g(e,t,n){if(!n){u(`Pick your name in the top right first`,!0);return}if(t.dataset.mine===`true`)return;t.disabled=!0;let{error:r}=await s().rpc(`cast_vote`,{p_poll_id:Number(t.dataset.poll),p_member_id:Number(n.id),p_answer:t.dataset.answer});if(r){t.disabled=!1,u(v(r),!0);return}u(t.dataset.had===`true`?`Vote changed`:`Vote counted`),h(e)}async function _(e,t,n){if(!n)return;t.disabled=!0;let{error:r}=await s().rpc(`clear_vote`,{p_poll_id:Number(t.dataset.clearPoll),p_member_id:Number(n.id)});if(r){t.disabled=!1,u(v(r),!0);return}u(`Vote removed`),h(e)}function v(e){let t=e.message||`Could not save your vote`;return/could not find the function|does not exist|schema cache/i.test(t)?`Run polls_schema.sql in Supabase to enable voting`:t}async function y(e,t){let n=t.dataset.active===`true`;t.disabled=!0;let{error:r}=await s().from(`polls`).update({active:!n}).eq(`id`,t.dataset.togglePoll);if(r){u(r.message,!0),t.disabled=!1;return}u(n?`Poll closed`:`Poll reopened`),h(e)}async function b(e,t){if(!confirm(`Delete every vote on this poll? This cannot be undone.`))return;t.disabled=!0;let{error:n}=await s().from(`votes`).delete().eq(`poll_id`,t.dataset.resetPoll);if(n){u(n.message,!0),t.disabled=!1;return}u(`Votes reset`),h(e)}function x(t,n,r,s,c){let l=e(t.options),u=n.filter(e=>e.poll_id===t.id),d=s?u.find(e=>w(e,s)):null;return`
    <article class="card poll ${t.active?`is-open`:``} ${a(`polls`,t)}">
      <header class="poll-head">
        <h3 class="poll-q">${o(t.question)}</h3>
        <div class="meta-row">
          <span class="pill ${t.active?`green`:`grey`}">${t.active?`Open`:`Closed`}</span>
          <span class="muted tiny">${u.length} vote${u.length===1?``:`s`}</span>
          ${d?`<span class="pill">You picked ${o(d.answer)}</span>`:``}
        </div>
      </header>

      ${S(t,l,u,r,d,!!s)}

      ${t.active?`<p class="poll-you">
             ${d?`Tap another option to change your vote.
                  <button class="linkbtn" data-clear-poll="${t.id}">Remove my vote</button>`:s?`Tap an option to vote.`:`Pick your name in the top right to vote.`}
           </p>`:`<p class="poll-you">This poll is closed. Results are final.</p>`}

      ${c?`
        <footer class="poll-admin">
          <span class="admin-tag">Admin</span>
          ${i(`polls`,t,{compact:!0})}
          <button class="btn ghost small" data-toggle-poll="${t.id}" data-active="${t.active}">
            ${t.active?`Close poll`:`Reopen`}
          </button>
          ${u.length?`<button class="btn ghost small" data-reset-poll="${t.id}">Reset votes</button>`:``}
        </footer>`:``}
    </article>`}function S(e,t,n,r,i,a){let s=n.length||1,c=[...new Set([...t,...n.map(e=>e.answer)])];return c.length?`<div class="results">${c.map(c=>{let l=n.filter(e=>e.answer===c),u=Math.round(l.length/s*100),d=i?.answer===c,f=!t.includes(c),p=e.active&&!f,m=`
      <div class="result-top">
        <span>${d?`<span class="you-dot" aria-hidden="true"></span>`:``}${o(c)}${f?` <span class="muted tiny">(removed)</span>`:``}</span>
        <span class="result-n">${l.length} · ${u}%</span>
      </div>`;return`
      <div class="result ${d?`mine`:``}">
        ${p?`<button class="result-pick" data-poll="${e.id}" data-answer="${o(c)}"
                     data-mine="${d}" data-had="${!!i}"
                     ${a?``:`disabled`}
                     aria-pressed="${d}">${m}</button>`:m}
        <div class="bar"><span style="width:${u}%"></span></div>
        ${l.length?`<div class="voters">${l.map(e=>`<span class="voter ${i&&e===i?`is-you`:``}">${o(C(e,r))}</span>`).join(``)}</div>`:`<div class="voters"><span class="muted tiny">nobody yet</span></div>`}
      </div>`}).join(``)}</div>`:`<p class="muted tiny">This poll has no options yet.</p>`}function C(e,t){return(e.member_id==null?null:t.get(String(e.member_id)))?.display_name||e.username||`Someone`}function w(e,t){return e.member_id==null?String(e.username||``).trim().toLowerCase()===String(t.display_name||``).trim().toLowerCase():String(e.member_id)===String(t.id)}export{h as render};