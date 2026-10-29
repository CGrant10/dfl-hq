import{Ar as e,F as t,Hr as n,I as r,Mr as i,N as a,Nr as o,P as s,Ut as c,Vr as l,Wn as u,j as d,zn as f}from"../app-core-JL-atkhk.js";var p=!1;async function m(){let e=await f().from(`votes`).select(`poll_id, member_id, username, answer`);return e.error?/member_id/.test(e.error.message||``)?(p=!0,f().from(`votes`).select(`poll_id, username, answer`)):e:(p=!1,e)}async function h(n){let a=c(),o=u(),[s,l,v]=await Promise.all([f().from(`polls`).select(`*`).order(`created_at`,{ascending:!1}),m(),f().from(`members`).select(`id, display_name, team_name`)]);if(s.error||l.error){n.innerHTML=i(s.error||l.error);return}let S=s.data||[],C=l.data||[],w=new Map((v.data||[]).map(e=>[String(e.id),e])),T=t(`polls`,S),E=T.filter(e=>e.active),D=T.filter(e=>!e.active),O=E.length?`
    ${D.length?`<h2 class="section-title">Open<span class="count">${E.length}</span></h2>`:``}
    ${E.map(e=>x(e,C,w,a,o)).join(``)}`:``,k=D.length?`
    <section class="poll-archive" data-collapse="polls-closed"
             data-collapse-default="folded"
             data-collapse-title="Closed polls"
             data-collapse-badge="${D.length}">
      ${D.map(e=>x(e,C,w,a,o)).join(``)}
    </section>`:``;n.innerHTML=`
    <div id="poll-list" class="polls-page">
      <header class="page-head">
        <h1>Polls</h1>
        ${d(`polls`,`Add poll`)}
      </header>
      ${p?`<div class="card note">
          <div class="card-body">Voting is not switched on yet. Run
          <strong>polls_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
        </div>`:``}

      ${a||!S.length?``:`<div class="card note">
          <div class="card-body">Pick your name in the top right to vote.</div>
        </div>`}

      ${S.length?``:e(`No polls yet`,a?``:`Choose your profile to vote when a poll opens.`,a?``:`<button type="button" class="linkbtn" data-open-profile>Choose profile →</button>`)}

      ${O}
      ${k}
    </div>
  `;let A=n.querySelector(`#poll-list`);r(A,()=>h(n)),A.addEventListener(`click`,e=>{let t=e.target.closest(`button[data-answer]`),r=e.target.closest(`button[data-clear-poll]`),i=e.target.closest(`button[data-toggle-poll]`),o=e.target.closest(`button[data-reset-poll]`);if(t)return g(n,t,a);if(r)return _(n,r,a);if(i)return y(n,i);if(o)return b(n,o)})}async function g(e,t,r){if(!r){n(`Pick your name in the top right first`,!0);return}if(t.dataset.mine===`true`)return;t.disabled=!0;let{error:i}=await f().rpc(`cast_vote`,{p_poll_id:Number(t.dataset.poll),p_member_id:Number(r.id),p_answer:t.dataset.answer});if(i){t.disabled=!1,n(v(i),!0);return}n(t.dataset.had===`true`?`Vote changed`:`Vote counted`),h(e)}async function _(e,t,r){if(!r)return;t.disabled=!0;let{error:i}=await f().rpc(`clear_vote`,{p_poll_id:Number(t.dataset.clearPoll),p_member_id:Number(r.id)});if(i){t.disabled=!1,n(v(i),!0);return}n(`Vote removed`),h(e)}function v(e){let t=e.message||`Could not save your vote`;return/could not find the function|does not exist|schema cache/i.test(t)?`Run polls_schema.sql in Supabase to enable voting`:t}async function y(e,t){let r=t.dataset.active===`true`;t.disabled=!0;let{error:i}=await f().from(`polls`).update({active:!r}).eq(`id`,t.dataset.togglePoll);if(i){n(i.message,!0),t.disabled=!1;return}n(r?`Poll closed`:`Poll reopened`),h(e)}async function b(e,t){if(!confirm(`Delete every vote on this poll? This cannot be undone.`))return;t.disabled=!0;let{error:r}=await f().from(`votes`).delete().eq(`poll_id`,t.dataset.resetPoll);if(r){n(r.message,!0),t.disabled=!1;return}n(`Votes reset`),h(e)}function x(e,t,n,r,i){let c=l(e.options),u=t.filter(t=>t.poll_id===e.id),d=r?u.find(e=>w(e,r)):null;return`
    <article class="card poll ${e.active?`is-open`:``} ${s(`polls`,e)}">
      <header class="poll-head">
        <h3 class="poll-q">${o(e.question)}</h3>
        <div class="meta-row">
          <span class="pill ${e.active?`green`:`grey`}">${e.active?`Open`:`Closed`}</span>
          <span class="muted tiny">${u.length} vote${u.length===1?``:`s`}</span>
          ${d?`<span class="pill">You picked ${o(d.answer)}</span>`:``}
        </div>
      </header>

      ${S(e,c,u,n,d,!!r)}

      ${e.active?`<p class="poll-you">
             ${d?`Tap another option to change your vote.
                  <button class="linkbtn" data-clear-poll="${e.id}">Remove my vote</button>`:r?`Tap an option to vote.`:`Pick your name in the top right to vote.`}
           </p>`:`<p class="poll-you">This poll is closed. Results are final.</p>`}

      ${i?`
        <footer class="poll-admin">
          <span class="admin-tag">Admin</span>
          ${a(`polls`,e,{compact:!0})}
          <button class="btn ghost small" data-toggle-poll="${e.id}" data-active="${e.active}">
            ${e.active?`Close poll`:`Reopen`}
          </button>
          ${u.length?`<button class="btn ghost small" data-reset-poll="${e.id}">Reset votes</button>`:``}
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