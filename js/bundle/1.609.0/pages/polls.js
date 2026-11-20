import{F as e,Fr as t,Gr as n,Hn as r,I as i,Ir as a,N as o,Nr as s,P as c,Ut as l,Wr as u,j as d,qn as f}from"../app-core-_5V0bh1m.js";var p=!1;async function m(){let e=await r().from(`votes`).select(`poll_id, member_id, username, answer`);return e.error?/member_id/.test(e.error.message||``)?(p=!0,r().from(`votes`).select(`poll_id, username, answer`)):e:(p=!1,e)}async function h(n){let a=l(),o=f(),[c,u,v]=await Promise.all([r().from(`polls`).select(`*`).order(`created_at`,{ascending:!1}),m(),r().from(`members`).select(`id, display_name, team_name`)]);if(c.error||u.error){n.innerHTML=t(c.error||u.error);return}let S=c.data||[],C=u.data||[],w=new Map((v.data||[]).map(e=>[String(e.id),e])),T=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`poll`),E=e(`polls`,S).filter(e=>!T||String(e.id)===T);if(T&&!E.length){n.innerHTML=`<header class="page-head"><h1>Polls</h1></header><section class="state" role="status">This poll is no longer available. <a class="linkbtn" href="#/polls">All polls →</a></section>`;return}let D=T?E:E.filter(e=>e.active),O=T?[]:E.filter(e=>!e.active),k=D.length?`
    ${O.length?`<h2 class="section-title">Open<span class="count">${D.length}</span></h2>`:``}
    ${D.map(e=>x(e,C,w,a,o)).join(``)}`:``,A=O.length?`
    <section class="poll-archive" data-collapse="polls-closed"
             data-collapse-default="folded"
             data-collapse-title="Closed polls"
             data-collapse-badge="${O.length}">
      ${O.map(e=>x(e,C,w,a,o)).join(``)}
    </section>`:``;n.innerHTML=`
    <div id="poll-list" class="polls-page">
      <header class="page-head">
        <h1>Polls</h1>${T?`<a class="linkbtn" href="#/polls">All polls →</a>`:``}
        ${d(`polls`,`Add poll`)}
      </header>
      ${p?`<div class="card note">
          <div class="card-body">Voting is not switched on yet. Run
          <strong>polls_schema.sql</strong> in the Supabase SQL editor, then reload.</div>
        </div>`:``}

      ${a||!S.length?``:`<div class="card note">
          <div class="card-body">Pick your name in the top right to vote.</div>
        </div>`}

      ${S.length?``:s(`No polls yet`,a?``:`Choose your profile to vote when a poll opens.`,a?``:`<button type="button" class="linkbtn" data-open-profile>Choose profile →</button>`)}

      ${k}
      ${A}
    </div>
  `;let j=n.querySelector(`#poll-list`);i(j,()=>h(n)),j.addEventListener(`click`,e=>{let t=e.target.closest(`button[data-answer]`),r=e.target.closest(`button[data-clear-poll]`),i=e.target.closest(`button[data-toggle-poll]`),o=e.target.closest(`button[data-reset-poll]`);if(t)return g(n,t,a);if(r)return _(n,r,a);if(i)return y(n,i);if(o)return b(n,o)})}async function g(e,t,i){if(!i){n(`Pick your name in the top right first`,!0);return}if(t.dataset.mine===`true`)return;t.disabled=!0;let{error:a}=await r().rpc(`cast_vote`,{p_poll_id:Number(t.dataset.poll),p_member_id:Number(i.id),p_answer:t.dataset.answer});if(a){t.disabled=!1,n(v(a),!0);return}n(t.dataset.had===`true`?`Vote changed`:`Vote counted`),h(e)}async function _(e,t,i){if(!i)return;t.disabled=!0;let{error:a}=await r().rpc(`clear_vote`,{p_poll_id:Number(t.dataset.clearPoll),p_member_id:Number(i.id)});if(a){t.disabled=!1,n(v(a),!0);return}n(`Vote removed`),h(e)}function v(e){let t=e.message||`Could not save your vote`;return/could not find the function|does not exist|schema cache/i.test(t)?`Run polls_schema.sql in Supabase to enable voting`:t}async function y(e,t){let i=t.dataset.active===`true`;t.disabled=!0;let{error:a}=await r().from(`polls`).update({active:!i}).eq(`id`,t.dataset.togglePoll);if(a){n(a.message,!0),t.disabled=!1;return}n(i?`Poll closed`:`Poll reopened`),h(e)}async function b(e,t){if(!confirm(`Delete every vote on this poll? This cannot be undone.`))return;t.disabled=!0;let{error:i}=await r().from(`votes`).delete().eq(`poll_id`,t.dataset.resetPoll);if(i){n(i.message,!0),t.disabled=!1;return}n(`Votes reset`),h(e)}function x(e,t,n,r,i){let s=u(e.options),l=t.filter(t=>t.poll_id===e.id),d=r?l.find(e=>w(e,r)):null;return`
    <article data-story-poll="${a(e.id)}" ${new URLSearchParams(location.hash.split(`?`)[1]||``).get(`poll`)===String(e.id)?`data-route-focus tabindex="-1"`:``} class="card poll ${e.active?`is-open`:``} ${c(`polls`,e)}">
      <header class="poll-head">
        <h3 class="poll-q">${a(e.question)}</h3>
        <div class="meta-row">
          <span class="pill ${e.active?`green`:`grey`}">${e.active?`Open`:`Closed`}</span>
          <span class="muted tiny">${l.length} vote${l.length===1?``:`s`}</span>
          ${d?`<span class="pill">You picked ${a(d.answer)}</span>`:``}
        </div>
      </header>

      ${S(e,s,l,n,d,!!r)}

      ${e.active?`<p class="poll-you">
             ${d?`Tap another option to change your vote.
                  <button class="linkbtn" data-clear-poll="${e.id}">Remove my vote</button>`:r?`Tap an option to vote.`:`Pick your name in the top right to vote.`}
           </p>`:`<p class="poll-you">This poll is closed. Results are final.</p>`}

      ${i?`
        <footer class="poll-admin">
          <span class="admin-tag">Admin</span>
          ${o(`polls`,e,{compact:!0})}
          <button class="btn ghost small" data-toggle-poll="${e.id}" data-active="${e.active}">
            ${e.active?`Close poll`:`Reopen`}
          </button>
          ${l.length?`<button class="btn ghost small" data-reset-poll="${e.id}">Reset votes</button>`:``}
        </footer>`:``}
    </article>`}function S(e,t,n,r,i,o){let s=n.length||1,c=[...new Set([...t,...n.map(e=>e.answer)])];return c.length?`<div class="results">${c.map(c=>{let l=n.filter(e=>e.answer===c),u=Math.round(l.length/s*100),d=i?.answer===c,f=!t.includes(c),p=e.active&&!f,m=`
      <div class="result-top">
        <span>${d?`<span class="you-dot" aria-hidden="true"></span>`:``}${a(c)}${f?` <span class="muted tiny">(removed)</span>`:``}</span>
        <span class="result-n">${l.length} · ${u}%</span>
      </div>`;return`
      <div class="result ${d?`mine`:``}">
        ${p?`<button class="result-pick" data-poll="${e.id}" data-answer="${a(c)}"
                     data-mine="${d}" data-had="${!!i}"
                     ${o?``:`disabled`}
                     aria-pressed="${d}">${m}</button>`:m}
        <div class="bar"><span style="width:${u}%"></span></div>
        ${l.length?`<div class="voters">${l.map(e=>`<span class="voter ${i&&e===i?`is-you`:``}">${a(C(e,r))}</span>`).join(``)}</div>`:`<div class="voters"><span class="muted tiny">nobody yet</span></div>`}
      </div>`}).join(``)}</div>`:`<p class="muted tiny">This poll has no options yet.</p>`}function C(e,t){return(e.member_id==null?null:t.get(String(e.member_id)))?.display_name||e.username||`Someone`}function w(e,t){return e.member_id==null?String(e.username||``).trim().toLowerCase()===String(t.display_name||``).trim().toLowerCase():String(e.member_id)===String(t.id)}export{h as render};