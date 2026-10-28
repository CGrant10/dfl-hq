import{Br as e,F as t,I as n,Mr as r,N as i,P as a,Rn as o,Un as s,Ut as c,Vr as l,j as u,jr as d,kr as f}from"../app-core-SPLIJHE7.js";var p=!1;async function m(){let e=await o().from(`votes`).select(`poll_id, member_id, username, answer`);return e.error?/member_id/.test(e.error.message||``)?(p=!0,o().from(`votes`).select(`poll_id, username, answer`)):e:(p=!1,e)}async function h(e){let r=c(),i=s(),[a,l,v]=await Promise.all([o().from(`polls`).select(`*`).order(`created_at`,{ascending:!1}),m(),o().from(`members`).select(`id, display_name, team_name`)]);if(a.error||l.error){e.innerHTML=d(a.error||l.error);return}let S=a.data||[],C=l.data||[],w=new Map((v.data||[]).map(e=>[String(e.id),e])),T=t(`polls`,S),E=T.filter(e=>e.active),D=T.filter(e=>!e.active),O=E.length?`
    ${D.length?`<h2 class="section-title">Open<span class="count">${E.length}</span></h2>`:``}
    ${E.map(e=>x(e,C,w,r,i)).join(``)}`:``,k=D.length?`
    <section class="poll-archive" data-collapse="polls-closed"
             data-collapse-default="folded"
             data-collapse-title="Closed polls"
             data-collapse-badge="${D.length}">
      ${D.map(e=>x(e,C,w,r,i)).join(``)}
    </section>`:``;e.innerHTML=`
    <div id="poll-list" class="polls-page">
      <header class="page-head">
        <h1>Polls</h1>
        ${u(`polls`,`Add poll`)}
      </header>
      ${p?`<div class="card note">
          <div class="card-body">Voting is not switched on yet. Run
          <strong>polls_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
        </div>`:``}

      ${r||!S.length?``:`<div class="card note">
          <div class="card-body">Pick your name in the top right to vote.</div>
        </div>`}

      ${S.length?``:f(`No polls yet`,r?``:`Choose your profile to vote when a poll opens.`,r?``:`<button type="button" class="linkbtn" data-open-profile>Choose profile →</button>`)}

      ${O}
      ${k}
    </div>
  `;let A=e.querySelector(`#poll-list`);n(A,()=>h(e)),A.addEventListener(`click`,t=>{let n=t.target.closest(`button[data-answer]`),i=t.target.closest(`button[data-clear-poll]`),a=t.target.closest(`button[data-toggle-poll]`),o=t.target.closest(`button[data-reset-poll]`);if(n)return g(e,n,r);if(i)return _(e,i,r);if(a)return y(e,a);if(o)return b(e,o)})}async function g(e,t,n){if(!n){l(`Pick your name in the top right first`,!0);return}if(t.dataset.mine===`true`)return;t.disabled=!0;let{error:r}=await o().rpc(`cast_vote`,{p_poll_id:Number(t.dataset.poll),p_member_id:Number(n.id),p_answer:t.dataset.answer});if(r){t.disabled=!1,l(v(r),!0);return}l(t.dataset.had===`true`?`Vote changed`:`Vote counted`),h(e)}async function _(e,t,n){if(!n)return;t.disabled=!0;let{error:r}=await o().rpc(`clear_vote`,{p_poll_id:Number(t.dataset.clearPoll),p_member_id:Number(n.id)});if(r){t.disabled=!1,l(v(r),!0);return}l(`Vote removed`),h(e)}function v(e){let t=e.message||`Could not save your vote`;return/could not find the function|does not exist|schema cache/i.test(t)?`Run polls_schema.sql in Supabase to enable voting`:t}async function y(e,t){let n=t.dataset.active===`true`;t.disabled=!0;let{error:r}=await o().from(`polls`).update({active:!n}).eq(`id`,t.dataset.togglePoll);if(r){l(r.message,!0),t.disabled=!1;return}l(n?`Poll closed`:`Poll reopened`),h(e)}async function b(e,t){if(!confirm(`Delete every vote on this poll? This cannot be undone.`))return;t.disabled=!0;let{error:n}=await o().from(`votes`).delete().eq(`poll_id`,t.dataset.resetPoll);if(n){l(n.message,!0),t.disabled=!1;return}l(`Votes reset`),h(e)}function x(t,n,o,s,c){let l=e(t.options),u=n.filter(e=>e.poll_id===t.id),d=s?u.find(e=>w(e,s)):null;return`
    <article class="card poll ${t.active?`is-open`:``} ${a(`polls`,t)}">
      <header class="poll-head">
        <h3 class="poll-q">${r(t.question)}</h3>
        <div class="meta-row">
          <span class="pill ${t.active?`green`:`grey`}">${t.active?`Open`:`Closed`}</span>
          <span class="muted tiny">${u.length} vote${u.length===1?``:`s`}</span>
          ${d?`<span class="pill">You picked ${r(d.answer)}</span>`:``}
        </div>
      </header>

      ${S(t,l,u,o,d,!!s)}

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
    </article>`}function S(e,t,n,i,a,o){let s=n.length||1,c=[...new Set([...t,...n.map(e=>e.answer)])];return c.length?`<div class="results">${c.map(c=>{let l=n.filter(e=>e.answer===c),u=Math.round(l.length/s*100),d=a?.answer===c,f=!t.includes(c),p=e.active&&!f,m=`
      <div class="result-top">
        <span>${d?`<span class="you-dot" aria-hidden="true"></span>`:``}${r(c)}${f?` <span class="muted tiny">(removed)</span>`:``}</span>
        <span class="result-n">${l.length} · ${u}%</span>
      </div>`;return`
      <div class="result ${d?`mine`:``}">
        ${p?`<button class="result-pick" data-poll="${e.id}" data-answer="${r(c)}"
                     data-mine="${d}" data-had="${!!a}"
                     ${o?``:`disabled`}
                     aria-pressed="${d}">${m}</button>`:m}
        <div class="bar"><span style="width:${u}%"></span></div>
        ${l.length?`<div class="voters">${l.map(e=>`<span class="voter ${a&&e===a?`is-you`:``}">${r(C(e,i))}</span>`).join(``)}</div>`:`<div class="voters"><span class="muted tiny">nobody yet</span></div>`}
      </div>`}).join(``)}</div>`:`<p class="muted tiny">This poll has no options yet.</p>`}function C(e,t){return(e.member_id==null?null:t.get(String(e.member_id)))?.display_name||e.username||`Someone`}function w(e,t){return e.member_id==null?String(e.username||``).trim().toLowerCase()===String(t.display_name||``).trim().toLowerCase():String(e.member_id)===String(t.id)}export{h as render};