import{Ar as e,Br as t,F as n,Hn as r,I as i,Ln as a,N as o,Or as s,P as c,Ut as l,j as u,jr as d,zr as f}from"../app-core-D5eQvCkt.js";var p=!1;async function m(){let e=await a().from(`votes`).select(`poll_id, member_id, username, answer`);return e.error?/member_id/.test(e.error.message||``)?(p=!0,a().from(`votes`).select(`poll_id, username, answer`)):e:(p=!1,e)}async function h(t){let o=l(),c=r(),[d,f,v]=await Promise.all([a().from(`polls`).select(`*`).order(`created_at`,{ascending:!1}),m(),a().from(`members`).select(`id, display_name, team_name`)]);if(d.error||f.error){t.innerHTML=e(d.error||f.error);return}let S=d.data||[],C=f.data||[],w=new Map((v.data||[]).map(e=>[String(e.id),e])),T=n(`polls`,S),E=T.filter(e=>e.active),D=T.filter(e=>!e.active),O=E.length?`
    ${D.length?`<h2 class="section-title">Open<span class="count">${E.length}</span></h2>`:``}
    ${E.map(e=>x(e,C,w,o,c)).join(``)}`:``,k=D.length?`
    <section class="poll-archive" data-collapse="polls-closed"
             data-collapse-default="folded"
             data-collapse-title="Closed polls"
             data-collapse-badge="${D.length}">
      ${D.map(e=>x(e,C,w,o,c)).join(``)}
    </section>`:``;t.innerHTML=`
    <div id="poll-list" class="polls-page">
      <header class="page-head">
        <h1>Polls</h1>
        ${u(`polls`,`Add poll`)}
      </header>
      ${p?`<div class="card note">
          <div class="card-body">Voting is not switched on yet. Run
          <strong>polls_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
        </div>`:``}

      ${o||!S.length?``:`<div class="card note">
          <div class="card-body">Pick your name in the top right to vote.</div>
        </div>`}

      ${S.length?``:s(`No polls yet`,o?``:`Choose your profile to vote when a poll opens.`,o?``:`<button type="button" class="linkbtn" data-open-profile>Choose profile →</button>`)}

      ${O}
      ${k}
    </div>
  `;let A=t.querySelector(`#poll-list`);i(A,()=>h(t)),A.addEventListener(`click`,e=>{let n=e.target.closest(`button[data-answer]`),r=e.target.closest(`button[data-clear-poll]`),i=e.target.closest(`button[data-toggle-poll]`),a=e.target.closest(`button[data-reset-poll]`);if(n)return g(t,n,o);if(r)return _(t,r,o);if(i)return y(t,i);if(a)return b(t,a)})}async function g(e,n,r){if(!r){t(`Pick your name in the top right first`,!0);return}if(n.dataset.mine===`true`)return;n.disabled=!0;let{error:i}=await a().rpc(`cast_vote`,{p_poll_id:Number(n.dataset.poll),p_member_id:Number(r.id),p_answer:n.dataset.answer});if(i){n.disabled=!1,t(v(i),!0);return}t(n.dataset.had===`true`?`Vote changed`:`Vote counted`),h(e)}async function _(e,n,r){if(!r)return;n.disabled=!0;let{error:i}=await a().rpc(`clear_vote`,{p_poll_id:Number(n.dataset.clearPoll),p_member_id:Number(r.id)});if(i){n.disabled=!1,t(v(i),!0);return}t(`Vote removed`),h(e)}function v(e){let t=e.message||`Could not save your vote`;return/could not find the function|does not exist|schema cache/i.test(t)?`Run polls_schema.sql in Supabase to enable voting`:t}async function y(e,n){let r=n.dataset.active===`true`;n.disabled=!0;let{error:i}=await a().from(`polls`).update({active:!r}).eq(`id`,n.dataset.togglePoll);if(i){t(i.message,!0),n.disabled=!1;return}t(r?`Poll closed`:`Poll reopened`),h(e)}async function b(e,n){if(!confirm(`Delete every vote on this poll? This cannot be undone.`))return;n.disabled=!0;let{error:r}=await a().from(`votes`).delete().eq(`poll_id`,n.dataset.resetPoll);if(r){t(r.message,!0),n.disabled=!1;return}t(`Votes reset`),h(e)}function x(e,t,n,r,i){let a=f(e.options),s=t.filter(t=>t.poll_id===e.id),l=r?s.find(e=>w(e,r)):null;return`
    <article class="card poll ${e.active?`is-open`:``} ${c(`polls`,e)}">
      <header class="poll-head">
        <h3 class="poll-q">${d(e.question)}</h3>
        <div class="meta-row">
          <span class="pill ${e.active?`green`:`grey`}">${e.active?`Open`:`Closed`}</span>
          <span class="muted tiny">${s.length} vote${s.length===1?``:`s`}</span>
          ${l?`<span class="pill">You picked ${d(l.answer)}</span>`:``}
        </div>
      </header>

      ${S(e,a,s,n,l,!!r)}

      ${e.active?`<p class="poll-you">
             ${l?`Tap another option to change your vote.
                  <button class="linkbtn" data-clear-poll="${e.id}">Remove my vote</button>`:r?`Tap an option to vote.`:`Pick your name in the top right to vote.`}
           </p>`:`<p class="poll-you">This poll is closed. Results are final.</p>`}

      ${i?`
        <footer class="poll-admin">
          <span class="admin-tag">Admin</span>
          ${o(`polls`,e,{compact:!0})}
          <button class="btn ghost small" data-toggle-poll="${e.id}" data-active="${e.active}">
            ${e.active?`Close poll`:`Reopen`}
          </button>
          ${s.length?`<button class="btn ghost small" data-reset-poll="${e.id}">Reset votes</button>`:``}
        </footer>`:``}
    </article>`}function S(e,t,n,r,i,a){let o=n.length||1,s=[...new Set([...t,...n.map(e=>e.answer)])];return s.length?`<div class="results">${s.map(s=>{let c=n.filter(e=>e.answer===s),l=Math.round(c.length/o*100),u=i?.answer===s,f=!t.includes(s),p=e.active&&!f,m=`
      <div class="result-top">
        <span>${u?`<span class="you-dot" aria-hidden="true"></span>`:``}${d(s)}${f?` <span class="muted tiny">(removed)</span>`:``}</span>
        <span class="result-n">${c.length} · ${l}%</span>
      </div>`;return`
      <div class="result ${u?`mine`:``}">
        ${p?`<button class="result-pick" data-poll="${e.id}" data-answer="${d(s)}"
                     data-mine="${u}" data-had="${!!i}"
                     ${a?``:`disabled`}
                     aria-pressed="${u}">${m}</button>`:m}
        <div class="bar"><span style="width:${l}%"></span></div>
        ${c.length?`<div class="voters">${c.map(e=>`<span class="voter ${i&&e===i?`is-you`:``}">${d(C(e,r))}</span>`).join(``)}</div>`:`<div class="voters"><span class="muted tiny">nobody yet</span></div>`}
      </div>`}).join(``)}</div>`:`<p class="muted tiny">This poll has no options yet.</p>`}function C(e,t){return(e.member_id==null?null:t.get(String(e.member_id)))?.display_name||e.username||`Someone`}function w(e,t){return e.member_id==null?String(e.username||``).trim().toLowerCase()===String(t.display_name||``).trim().toLowerCase():String(e.member_id)===String(t.id)}export{h as render};