import{Cn as e,F as t,Ht as n,I as r,Mn as i,N as a,P as o,Sn as s,Xn as c,bn as l,j as u,jn as d,tr as f}from"../app-core-Y9CxlHmO.js";var p=!1;async function m(){let e=await c().from(`votes`).select(`poll_id, member_id, username, answer`);return e.error?/member_id/.test(e.error.message||``)?(p=!0,c().from(`votes`).select(`poll_id, username, answer`)):e:(p=!1,e)}async function h(e){let i=n(),a=f(),[o,d,v]=await Promise.all([c().from(`polls`).select(`*`).order(`created_at`,{ascending:!1}),m(),c().from(`members`).select(`id, display_name, team_name`)]);if(o.error||d.error){e.innerHTML=s(o.error||d.error);return}let S=o.data||[],C=d.data||[],w=new Map((v.data||[]).map(e=>[String(e.id),e])),T=t(`polls`,S),E=T.filter(e=>e.active),D=T.filter(e=>!e.active),O=E.length?`
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
        ${u(`polls`,`Add poll`)}
      </header>
      ${p?`<div class="card note">
          <div class="card-body">Voting is not switched on yet. Run
          <strong>polls_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
        </div>`:``}

      ${i||!S.length?``:`<div class="card note">
          <div class="card-body">Pick your name in the top right to vote.</div>
        </div>`}

      ${S.length?``:l(`No polls yet`,i?``:`Choose your profile to vote when a poll opens.`,i?``:`<button type="button" class="linkbtn" data-open-profile>Choose profile →</button>`)}

      ${O}
      ${k}
    </div>
  `;let A=e.querySelector(`#poll-list`);r(A,()=>h(e)),A.addEventListener(`click`,t=>{let n=t.target.closest(`button[data-answer]`),r=t.target.closest(`button[data-clear-poll]`),a=t.target.closest(`button[data-toggle-poll]`),o=t.target.closest(`button[data-reset-poll]`);if(n)return g(e,n,i);if(r)return _(e,r,i);if(a)return y(e,a);if(o)return b(e,o)})}async function g(e,t,n){if(!n){i(`Pick your name in the top right first`,!0);return}if(t.dataset.mine===`true`)return;t.disabled=!0;let{error:r}=await c().rpc(`cast_vote`,{p_poll_id:Number(t.dataset.poll),p_member_id:Number(n.id),p_answer:t.dataset.answer});if(r){t.disabled=!1,i(v(r),!0);return}i(t.dataset.had===`true`?`Vote changed`:`Vote counted`),h(e)}async function _(e,t,n){if(!n)return;t.disabled=!0;let{error:r}=await c().rpc(`clear_vote`,{p_poll_id:Number(t.dataset.clearPoll),p_member_id:Number(n.id)});if(r){t.disabled=!1,i(v(r),!0);return}i(`Vote removed`),h(e)}function v(e){let t=e.message||`Could not save your vote`;return/could not find the function|does not exist|schema cache/i.test(t)?`Run polls_schema.sql in Supabase to enable voting`:t}async function y(e,t){let n=t.dataset.active===`true`;t.disabled=!0;let{error:r}=await c().from(`polls`).update({active:!n}).eq(`id`,t.dataset.togglePoll);if(r){i(r.message,!0),t.disabled=!1;return}i(n?`Poll closed`:`Poll reopened`),h(e)}async function b(e,t){if(!confirm(`Delete every vote on this poll? This cannot be undone.`))return;t.disabled=!0;let{error:n}=await c().from(`votes`).delete().eq(`poll_id`,t.dataset.resetPoll);if(n){i(n.message,!0),t.disabled=!1;return}i(`Votes reset`),h(e)}function x(t,n,r,i,s){let c=d(t.options),l=n.filter(e=>e.poll_id===t.id),u=i?l.find(e=>w(e,i)):null;return`
    <article class="card poll ${t.active?`is-open`:``} ${o(`polls`,t)}">
      <header class="poll-head">
        <h3 class="poll-q">${e(t.question)}</h3>
        <div class="meta-row">
          <span class="pill ${t.active?`green`:`grey`}">${t.active?`Open`:`Closed`}</span>
          <span class="muted tiny">${l.length} vote${l.length===1?``:`s`}</span>
          ${u?`<span class="pill">You picked ${e(u.answer)}</span>`:``}
        </div>
      </header>

      ${S(t,c,l,r,u,!!i)}

      ${t.active?`<p class="poll-you">
             ${u?`Tap another option to change your vote.
                  <button class="linkbtn" data-clear-poll="${t.id}">Remove my vote</button>`:i?`Tap an option to vote.`:`Pick your name in the top right to vote.`}
           </p>`:`<p class="poll-you">This poll is closed. Results are final.</p>`}

      ${s?`
        <footer class="poll-admin">
          <span class="admin-tag">Admin</span>
          ${a(`polls`,t,{compact:!0})}
          <button class="btn ghost small" data-toggle-poll="${t.id}" data-active="${t.active}">
            ${t.active?`Close poll`:`Reopen`}
          </button>
          ${l.length?`<button class="btn ghost small" data-reset-poll="${t.id}">Reset votes</button>`:``}
        </footer>`:``}
    </article>`}function S(t,n,r,i,a,o){let s=r.length||1,c=[...new Set([...n,...r.map(e=>e.answer)])];return c.length?`<div class="results">${c.map(c=>{let l=r.filter(e=>e.answer===c),u=Math.round(l.length/s*100),d=a?.answer===c,f=!n.includes(c),p=t.active&&!f,m=`
      <div class="result-top">
        <span>${d?`<span class="you-dot" aria-hidden="true"></span>`:``}${e(c)}${f?` <span class="muted tiny">(removed)</span>`:``}</span>
        <span class="result-n">${l.length} · ${u}%</span>
      </div>`;return`
      <div class="result ${d?`mine`:``}">
        ${p?`<button class="result-pick" data-poll="${t.id}" data-answer="${e(c)}"
                     data-mine="${d}" data-had="${!!a}"
                     ${o?``:`disabled`}
                     aria-pressed="${d}">${m}</button>`:m}
        <div class="bar"><span style="width:${u}%"></span></div>
        ${l.length?`<div class="voters">${l.map(t=>`<span class="voter ${a&&t===a?`is-you`:``}">${e(C(t,i))}</span>`).join(``)}</div>`:`<div class="voters"><span class="muted tiny">nobody yet</span></div>`}
      </div>`}).join(``)}</div>`:`<p class="muted tiny">This poll has no options yet.</p>`}function C(e,t){return(e.member_id==null?null:t.get(String(e.member_id)))?.display_name||e.username||`Someone`}function w(e,t){return e.member_id==null?String(e.username||``).trim().toLowerCase()===String(t.display_name||``).trim().toLowerCase():String(e.member_id)===String(t.id)}export{h as render};