import{F as e,Fr as t,Gt as n,I as r,Kr as i,L as a,Lr as o,N as s,R as c,Rr as l,Wn as u,Yn as d,qr as f}from"../app-core-DJ1rYCZP.js";var p=!1;async function m(){let e=await u().from(`votes`).select(`poll_id, member_id, username, answer`);return e.error?/member_id/.test(e.error.message||``)?(p=!0,u().from(`votes`).select(`poll_id, username, answer`)):e:(p=!1,e)}async function h(e){let r=n(),i=d(),[l,f,v]=await Promise.all([u().from(`polls`).select(`*`).order(`created_at`,{ascending:!1}),m(),u().from(`members`).select(`id, display_name, team_name`)]);if(l.error||f.error){e.innerHTML=o(l.error||f.error);return}let S=l.data||[],C=f.data||[],w=new Map((v.data||[]).map(e=>[String(e.id),e])),T=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`poll`),E=a(`polls`,S).filter(e=>!T||String(e.id)===T);if(T&&!E.length){e.innerHTML=`<header class="page-head"><h1>Polls</h1></header><section class="state" role="status">This poll is no longer available. <a class="linkbtn" href="#/polls">All polls →</a></section>`;return}let D=T?E:E.filter(e=>e.active),O=T?[]:E.filter(e=>!e.active),k=D.length?`
    ${O.length?`<h2 class="section-title">Open<span class="count">${D.length}</span></h2>`:``}
    ${D.map(e=>x(e,C,w,r,i)).join(``)}`:``,A=O.length?`
    <section class="poll-archive" data-collapse="polls-closed"
             data-collapse-default="folded"
             data-collapse-title="Closed polls"
             data-collapse-badge="${O.length}">
      ${O.map(e=>x(e,C,w,r,i)).join(``)}
    </section>`:``;e.innerHTML=`
    <div id="poll-list" class="polls-page">
      <header class="page-head">
        <h1>Polls</h1>${T?`<a class="linkbtn" href="#/polls">All polls →</a>`:``}
        ${s(`polls`,`Add poll`)}
      </header>
      ${p?`<div class="card note">
          <div class="card-body">Voting is not switched on yet. Run
          <strong>polls_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
        </div>`:``}

      ${r||!S.length?``:`<div class="card note">
          <div class="card-body">Pick your name in the top right to vote.</div>
        </div>`}

      ${S.length?``:t(`No polls yet`,r?``:`Choose your profile to vote when a poll opens.`,r?``:`<button type="button" class="linkbtn" data-open-profile>Choose profile →</button>`)}

      ${k}
      ${A}
    </div>
  `;let j=e.querySelector(`#poll-list`);c(j,()=>h(e)),j.addEventListener(`click`,t=>{let n=t.target.closest(`button[data-answer]`),i=t.target.closest(`button[data-clear-poll]`),a=t.target.closest(`button[data-toggle-poll]`),o=t.target.closest(`button[data-reset-poll]`);if(n)return g(e,n,r);if(i)return _(e,i,r);if(a)return y(e,a);if(o)return b(e,o)})}async function g(e,t,n){if(!n){f(`Pick your name in the top right first`,!0);return}if(t.dataset.mine===`true`)return;t.disabled=!0;let{error:r}=await u().rpc(`cast_vote`,{p_poll_id:Number(t.dataset.poll),p_member_id:Number(n.id),p_answer:t.dataset.answer});if(r){t.disabled=!1,f(v(r),!0);return}f(t.dataset.had===`true`?`Vote changed`:`Vote counted`),h(e)}async function _(e,t,n){if(!n)return;t.disabled=!0;let{error:r}=await u().rpc(`clear_vote`,{p_poll_id:Number(t.dataset.clearPoll),p_member_id:Number(n.id)});if(r){t.disabled=!1,f(v(r),!0);return}f(`Vote removed`),h(e)}function v(e){let t=e.message||`Could not save your vote`;return/could not find the function|does not exist|schema cache/i.test(t)?`Run polls_schema.sql in Supabase to enable voting`:t}async function y(e,t){let n=t.dataset.active===`true`;t.disabled=!0;let{error:r}=await u().from(`polls`).update({active:!n}).eq(`id`,t.dataset.togglePoll);if(r){f(r.message,!0),t.disabled=!1;return}f(n?`Poll closed`:`Poll reopened`),h(e)}async function b(e,t){if(!confirm(`Delete every vote on this poll? This cannot be undone.`))return;t.disabled=!0;let{error:n}=await u().from(`votes`).delete().eq(`poll_id`,t.dataset.resetPoll);if(n){f(n.message,!0),t.disabled=!1;return}f(`Votes reset`),h(e)}function x(t,n,a,o,s){let c=i(t.options),u=n.filter(e=>e.poll_id===t.id),d=o?u.find(e=>w(e,o)):null;return`
    <article data-story-poll="${l(t.id)}" ${new URLSearchParams(location.hash.split(`?`)[1]||``).get(`poll`)===String(t.id)?`data-route-focus tabindex="-1"`:``} class="card poll ${t.active?`is-open`:``} ${r(`polls`,t)}">
      <header class="poll-head">
        <h3 class="poll-q">${l(t.question)}</h3>
        <div class="meta-row">
          <span class="pill ${t.active?`green`:`grey`}">${t.active?`Open`:`Closed`}</span>
          <span class="muted tiny">${u.length} vote${u.length===1?``:`s`}</span>
          ${d?`<span class="pill">You picked ${l(d.answer)}</span>`:``}
        </div>
      </header>

      ${S(t,c,u,a,d,!!o)}

      ${t.active?`<p class="poll-you">
             ${d?`Tap another option to change your vote.
                  <button class="linkbtn" data-clear-poll="${t.id}">Remove my vote</button>`:o?`Tap an option to vote.`:`Pick your name in the top right to vote.`}
           </p>`:`<p class="poll-you">This poll is closed. Results are final.</p>`}

      ${s?`
        <footer class="poll-admin">
          <span class="admin-tag">Admin</span>
          ${e(`polls`,t,{compact:!0})}
          <button class="btn ghost small" data-toggle-poll="${t.id}" data-active="${t.active}">
            ${t.active?`Close poll`:`Reopen`}
          </button>
          ${u.length?`<button class="btn ghost small" data-reset-poll="${t.id}">Reset votes</button>`:``}
        </footer>`:``}
    </article>`}function S(e,t,n,r,i,a){let o=n.length||1,s=[...new Set([...t,...n.map(e=>e.answer)])];return s.length?`<div class="results">${s.map(s=>{let c=n.filter(e=>e.answer===s),u=Math.round(c.length/o*100),d=i?.answer===s,f=!t.includes(s),p=e.active&&!f,m=`
      <div class="result-top">
        <span>${d?`<span class="you-dot" aria-hidden="true"></span>`:``}${l(s)}${f?` <span class="muted tiny">(removed)</span>`:``}</span>
        <span class="result-n">${c.length} · ${u}%</span>
      </div>`;return`
      <div class="result ${d?`mine`:``}">
        ${p?`<button class="result-pick" data-poll="${e.id}" data-answer="${l(s)}"
                     data-mine="${d}" data-had="${!!i}"
                     ${a?``:`disabled`}
                     aria-pressed="${d}">${m}</button>`:m}
        <div class="bar"><span style="width:${u}%"></span></div>
        ${c.length?`<div class="voters">${c.map(e=>`<span class="voter ${i&&e===i?`is-you`:``}">${l(C(e,r))}</span>`).join(``)}</div>`:`<div class="voters"><span class="muted tiny">nobody yet</span></div>`}
      </div>`}).join(``)}</div>`:`<p class="muted tiny">This poll has no options yet.</p>`}function C(e,t){return(e.member_id==null?null:t.get(String(e.member_id)))?.display_name||e.username||`Someone`}function w(e,t){return e.member_id==null?String(e.username||``).trim().toLowerCase()===String(t.display_name||``).trim().toLowerCase():String(e.member_id)===String(t.id)}export{h as render};