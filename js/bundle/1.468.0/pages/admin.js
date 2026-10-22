import{$ as e,A as t,Ar as n,B as r,Bn as i,Br as a,Fn as o,Hn as s,In as c,Ir as l,Kn as u,Kt as d,L as f,Ln as p,Lr as m,Mn as h,Mr as g,Pn as _,Pr as v,R as y,Rn as b,Un as x,Ut as S,V as C,Vn as w,Wn as T,Yn as ee,Zn as E,c as te,ct as D,et as O,it as k,jn as A,jr as j,k as M,kr as N,nt as P,z as ne,zn as re}from"../app-core-BN15Zex_.js";import{At as ie,Et as ae,Ln as oe,Mt as se,Sr as ce,St as le,br as F,d as ue,h as de,m as fe,xr as pe}from"../home-core-BqNjPhz9.js";import{f as I,n as me,o as he,p as ge,r as _e,s as ve,t as ye}from"../keeper-rules-iB5MCYxx.js";import{a as be,t as xe}from"../notification-core-D0FTHEae.js";import{t as Se}from"../sync-Zq1DUttR.js";import{i as Ce,n as we,t as Te}from"../custom-alerts-C7NyPCmv.js";async function L(e,t){e.innerHTML=l();let i;try{i=await ee(t.table,{order:t.order||`created_at`,asc:!!t.asc}),await y(t.fields)}catch(t){e.innerHTML=n(t);return}let o=null;e.innerHTML=`
    <details class="crud-add" id="crud-box">
      <summary id="crud-heading">Add ${j(t.singular)}</summary>
      <form class="card" id="crud-form">
        ${f(t.fields,`f_`)}
        <div class="row-end">
          <button type="button" class="btn ghost hidden" id="crud-cancel">Cancel</button>
          <button type="submit" class="btn" id="crud-save">Save</button>
        </div>
      </form>
    </details>
    <div id="crud-list">${Ee(i,t)}</div>
  `;let s=e.querySelector(`#crud-form`),c=e.querySelector(`#crud-heading`),u=e.querySelector(`#crud-cancel`),d=e.querySelector(`#crud-box`);function p(){o=null,s.reset(),t.fields.forEach(e=>{e.default!==void 0&&r(s,e,e.default)}),c.textContent=`Add ${t.singular}`,u.classList.add(`hidden`),d&&(d.open=!1)}p(),s.addEventListener(`submit`,async n=>{n.preventDefault();let r=e.querySelector(`#crud-save`);r.disabled=!0;try{let n=ne(s,t.fields);o?await E(t.table,o,n):await w(t.table,n),a(o?`Saved`:`Added`),L(e,t)}catch(e){a(e.message||`Save failed`,!0),r.disabled=!1}}),u.addEventListener(`click`,p),e.querySelector(`#crud-list`).addEventListener(`click`,async n=>{let l=n.target.closest(`button[data-edit]`),f=n.target.closest(`button[data-del]`);if(l){let e=i.find(e=>String(e.id)===l.dataset.edit);if(!e)return;o=e.id,t.fields.forEach(t=>r(s,t,e[t.name])),c.textContent=`Edit ${t.singular}`,u.classList.remove(`hidden`),d&&(d.open=!0),s.scrollIntoView({behavior:`smooth`,block:`start`});return}if(f){let n=i.find(e=>String(e.id)===f.dataset.del);if(!n||!confirm(`Delete "${t.label(n)}"? This cannot be undone.`))return;try{await b(t.table,n.id),a(`Deleted`),L(e,t)}catch(e){a(e.message||`Delete failed`,!0)}}})}function Ee(e,t){return e.length?e.map(e=>`
    <div class="card">
      <div class="card-title">${j(t.label(e))}</div>
      ${t.sub?`<div class="card-meta" style="margin:0">${j(t.sub(e))}</div>`:``}
      <div class="row-end">
        <button class="btn ghost small" data-edit="${e.id}">Edit</button>
        <button class="btn danger small" data-del="${e.id}">Delete</button>
      </div>
    </div>`).join(``):N(`No ${t.plural} yet.`)}var De=/target_broadcast|target_hall|hall_status|hall_year|people_label|schema cache|does not exist/i;function Oe(){if(document.getElementById(`dfl-broadcast-inbox-style`))return;let e=document.createElement(`style`);e.id=`dfl-broadcast-inbox-style`,e.textContent=`
.broadcast-inbox{display:grid;gap:12px}
.bx-submit{overflow:hidden}
.bx-submit>img{display:block;width:100%;height:auto;max-height:440px;object-fit:cover}
.bx-submit .card-body{display:grid;gap:10px}
.bx-submit p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.bx-submit select{width:auto;min-width:68px;margin-left:6px}
.bx-targets{display:flex;gap:6px;flex-wrap:wrap}.bx-target{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;border:1px solid var(--border);border-radius:999px;padding:3px 7px;color:var(--muted)}
.bx-review-block{display:grid;gap:8px;padding-top:8px;border-top:1px solid var(--border)}.bx-review-head{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.bx-review-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.bx-review-actions .row-end{display:flex;gap:7px;margin-left:auto}
@media(min-width:780px){.broadcast-inbox{grid-template-columns:repeat(2,minmax(0,1fr))}}
`,document.head.appendChild(e)}async function ke(){let e=await p().from(`broadcast_submissions`).select(`id,member_id,image,caption,status,target_broadcast,target_hall,hall_status,hall_year,people_label,created_at,members(display_name)`).or(`and(target_broadcast.eq.true,status.eq.pending),and(target_hall.eq.true,hall_status.eq.pending)`).order(`created_at`,{ascending:!0});if(!e.error)return{rows:e.data||[],modern:!0};if(!De.test(e.error.message||``))throw e.error;let t=await p().from(`broadcast_submissions`).select(`id,member_id,image,caption,status,created_at,members(display_name)`).eq(`status`,`pending`).order(`created_at`,{ascending:!0});if(t.error)throw t.error;return{rows:t.data||[],modern:!1}}function Ae(e,t){return t===`broadcast`?`<div class="bx-review-block">
    <div class="bx-review-head">Broadcast review</div>
    <div class="bx-review-actions">
      <label class="tiny">On screen <select data-dwell>${[3,5,8,10,12,15].map(e=>`<option value="${e}"${e===8?` selected`:``}>${e}s</option>`).join(``)}</select></label>
      <span class="row-end"><button class="btn ghost small danger" data-reject-broadcast="${e.id}">Reject</button><button class="btn small" data-approve-broadcast="${e.id}">Approve</button></span>
    </div></div>`:`<div class="bx-review-block">
    <div class="bx-review-head">Hall of Fame review</div>
    <div class="bx-review-actions"><span class="muted tiny">Permanent league gallery${e.hall_year?` · ${j(e.hall_year)}`:``}</span>
      <span class="row-end"><button class="btn ghost small danger" data-reject-hall="${e.id}">Reject</button><button class="btn small" data-approve-hall="${e.id}">Approve</button></span>
    </div></div>`}async function je(){Oe();let e;try{e=await ke()}catch(e){return/broadcast_submissions|schema cache|does not exist/i.test(e?.message||``)?``:`<div class="muted">${j(e?.message||`Could not load submissions`)}</div>`}let{rows:t,modern:n}=e;return`<section class="block" data-broadcast-inbox data-modern="${n?`1`:`0`}">
    <h2 class="section-title">Photo Submission Inbox <span class="muted tiny">${t.length} pending</span></h2>
    <div class="broadcast-inbox">${t.length?t.map(e=>`
      <article class="card bx-submit">
        <img src="${j(e.image)}" alt="Submitted by ${j(e.members?.display_name||`member`)}">
        <div class="card-body">
          <div><strong>${j(e.members?.display_name||`Member`)}</strong>${n?`<div class="bx-targets">${e.target_broadcast?`<span class="bx-target">Broadcast</span>`:``}${e.target_hall?`<span class="bx-target">Hall of Fame</span>`:``}</div>`:``}</div>
          ${e.caption?`<p>${j(e.caption)}</p>`:``}
          ${n&&e.people_label?`<span class="muted tiny">In the photo: ${j(e.people_label)}</span>`:``}
          ${n?`${e.target_broadcast&&e.status===`pending`?Ae(e,`broadcast`):``}${e.target_hall&&e.hall_status===`pending`?Ae(e,`hall`):``}`:`<div class="row-between"><label class="tiny">On screen <select data-dwell>${[3,5,8,10,12,15].map(e=>`<option value="${e}"${e===8?` selected`:``}>${e}s</option>`).join(``)}</select></label><span><button class="btn ghost small danger" data-reject-broadcast="${e.id}">Reject</button> <button class="btn small" data-approve-broadcast="${e.id}">Approve</button></span></div>`}
        </div>
      </article>`).join(``):`<div class="card"><div class="card-body muted">Inbox clear.</div></div>`}</div>
  </section>`}function R(e,t){e.closest(`.bx-submit`)?.querySelectorAll(`button,select`).forEach(e=>e.disabled=t)}function Me(e,t){e.querySelectorAll(`[data-approve-broadcast]`).forEach(e=>e.addEventListener(`click`,async()=>{let n=e.closest(`.bx-submit`),r=Number(n.querySelector(`[data-dwell]`)?.value)||8;R(e,!0);let{error:i}=await p().rpc(`approve_broadcast_submission`,{p_id:Number(e.dataset.approveBroadcast),p_dwell_seconds:r});if(i)return R(e,!1),a(i.message,!0);a(`Approved for Broadcast`),t?.()})),e.querySelectorAll(`[data-reject-broadcast]`).forEach(e=>e.addEventListener(`click`,async()=>{R(e,!0);let{error:n}=await p().from(`broadcast_submissions`).update({status:`rejected`,reviewed_at:new Date().toISOString()}).eq(`id`,Number(e.dataset.rejectBroadcast));if(n)return R(e,!1),a(n.message,!0);a(`Broadcast submission rejected`),t?.()})),e.querySelectorAll(`[data-approve-hall]`).forEach(e=>e.addEventListener(`click`,async()=>{R(e,!0);let{error:n}=await p().rpc(`approve_hall_submission`,{p_id:Number(e.dataset.approveHall)});if(n)return R(e,!1),a(n.message,!0);a(`Added to the Hall of Fame`),t?.()})),e.querySelectorAll(`[data-reject-hall]`).forEach(e=>e.addEventListener(`click`,async()=>{R(e,!0);let{error:n}=await p().from(`broadcast_submissions`).update({hall_status:`rejected`,hall_reviewed_at:new Date().toISOString()}).eq(`id`,Number(e.dataset.rejectHall));if(n)return R(e,!1),a(n.message,!0);a(`Hall of Fame submission rejected`),t?.()}))}D();function Ne(e){return`<div class="row-end" style="margin-bottom:10px">
    <span class="muted tiny" data-bx-refreshed></span>
    <button type="button" class="btn ghost small" data-bx-refresh>${j(e)}</button>
  </div>`}async function z(e){await M(),e.innerHTML=`
    ${Ne(`Refresh the broadcast`)}
    <div data-broadcast-inbox-slot></div>
    <section class="block" data-bx-order>
      <h2 class="section-title">Running order</h2>
      <div data-bx-rows></div>
    </section>
    <div data-bx-manager></div>
    <section class="block" data-bx-sources>
      <h2 class="section-title">Where slides come from</h2>
      <div class="card">
        <div class="card-body">Turn a source off and the front page stops
        building slides from it. Hand-written slides above are unaffected.</div>
        <div class="switchlist" data-bx-switches></div>
      </div>
    </section>`;let t=e.querySelector(`[data-broadcast-inbox-slot]`);t&&(t.innerHTML=await je(),Me(t,()=>z(e))),await Fe(e.querySelector(`[data-bx-rows]`)),L(e.querySelector(`[data-bx-manager]`),C(`broadcast_items`)),await B(e.querySelector(`[data-bx-switches]`)),Pe(e,()=>z(e))}function Pe(e,t){let n=e.querySelector(`[data-bx-refresh]`);n&&n.addEventListener(`click`,async()=>{let r=n.textContent;n.disabled=!0,n.textContent=`Refreshing…`;try{oe(),await t();let n=e.querySelector(`[data-bx-refreshed]`);n&&(n.textContent=`Read at ${new Date().toLocaleTimeString()}`),a(`Refreshed`)}catch(e){n.disabled=!1,n.textContent=r,a(e.message||`Could not refresh`,!0)}})}async function Fe(e){if(!e)return;let{data:t,error:r}=await p().from(`broadcast_items`).select(`${ae},active`).order(`sort_order`,{ascending:!0}).order(`created_at`,{ascending:!0});if(r?.code===`42703`&&({data:t,error:r}=await p().from(`broadcast_items`).select(`${ae.replace(`,image_zoom`,``)},active`).order(`sort_order`,{ascending:!0}).order(`created_at`,{ascending:!0})),r){e.innerHTML=n(r);return}let i=t||[];if(!i.length){e.innerHTML=`<div class="state"><span class="state-title">No slides yet</span>
      <span>Add one below and it will appear here in running order.</span></div>`;return}e.innerHTML=`
    <div class="card">
      <div class="card-body">The order hand-written slides play in. Automatic
      slides are ranked by what is happening and are not listed here.</div>
      <ol class="bxorder">${i.map(Ie).join(``)}</ol>
    </div>
    <div class="bxpreview-wrap">
      <span class="u-label">Preview</span>
      <div class="bx-stage bxpreview" data-bx-preview></div>
    </div>`,Le(e,i[0]),e.addEventListener(`click`,t=>Re(t,e,i))}function Ie(e,t){let n=[e.treatment];return e.background&&e.background!=="default"&&n.push(e.background),n.push(e.dwell_seconds?`${e.dwell_seconds}s`:`auto`),e.featured&&n.push(`featured`),e.active||n.push(`OFF`),`
    <li class="bxrow${e.active?``:` is-off`}" data-bx-row="${e.id}">
      <button type="button" class="bxrow-main" data-bx-preview-id="${e.id}">
        <strong>${j(e.headline||e.kicker||`Untitled slide`)}</strong>
        <span class="muted">${j(n.join(` · `))}</span>
      </button>
      <span class="bxrow-moves">
        <button type="button" class="btn ghost small" data-bx-move="up" data-id="${e.id}"
          aria-label="Move ${j(e.headline||`slide`)} earlier">↑</button>
        <button type="button" class="btn ghost small" data-bx-move="down" data-id="${e.id}"
          aria-label="Move ${j(e.headline||`slide`)} later">↓</button>
      </span>
    </li>`}function Le(e,t){let n=e.querySelector(`[data-bx-preview]`);!n||!t||(n.innerHTML=le(se(t)),n.querySelector(`.bx-slide`)?.classList.add(`bx-in`),n.classList.toggle(`bx-on-light`,(t.background||``)===`light`))}async function Re(e,t,n){let r=e.target.closest(`[data-bx-preview-id]`);if(r){Le(t,n.find(e=>String(e.id)===r.dataset.bxPreviewId)),t.querySelectorAll(`.bxrow`).forEach(e=>e.classList.toggle(`on`,e.dataset.bxRow===r.dataset.bxPreviewId));return}let i=e.target.closest(`[data-bx-move]`);if(!i)return;let o=i.dataset.id,s=n.findIndex(e=>String(e.id)===o),c=i.dataset.bxMove===`up`?s-1:s+1;if(s<0||c<0||c>=n.length)return;t.querySelectorAll(`[data-bx-move]`).forEach(e=>e.disabled=!0);let l=n[s],u=n[c],[d,f]=await Promise.all([p().from(`broadcast_items`).update({sort_order:c}).eq(`id`,l.id),p().from(`broadcast_items`).update({sort_order:s}).eq(`id`,u.id)]);(d.error||f.error)&&a((d.error||f.error).message||`Could not reorder`,!0),await Fe(t)}async function B(t){if(!t)return;await O();let n=e(),r=await ie(),i=(e,t,n,r)=>`
    <label class="ov-field"><span>${j(e)}</span>
      <select data-ov="${j(t)}" data-field="${j(e.toLowerCase())}">
        ${r.map(e=>`<option value="${j(e.v)}"${String(n||``)===e.v?` selected`:``}>${j(e.l)}</option>`).join(``)}
      </select></label>`,o=[...F.keys()].map((e,t)=>({id:e,i:t,standing:pe(e,r.get(e))})).sort((e,t)=>t.standing-e.standing||e.i-t.i);t.innerHTML=o.map(({id:e,standing:t},a)=>{let[s,c]=F.get(e),l=r.get(e)||{},u=l.treatment||l.background||l.image||l.dwell_seconds||l.featured||l.weight;return`
    <div class="srcrow">
      <label class="switchrow">
        <input type="checkbox" data-gen="${j(e)}" ${n.has(e)?``:`checked`}>
        <span class="switch-text">
          <strong>${j(s)}</strong>
          <span class="muted">${j(c)}</span>
        </span>
      </label>
      <div class="srcmove">
        <button type="button" class="btn ghost small" data-gen-up="${j(e)}"
          ${a===0?`disabled`:``} aria-label="Move ${j(s)} earlier">↑</button>
        <button type="button" class="btn ghost small" data-gen-down="${j(e)}"
          ${a===o.length-1?`disabled`:``} aria-label="Move ${j(s)} later">↓</button>
        ${l.featured?`<span class="muted tiny">featured</span>`:l.weight?`<span class="muted tiny">moved</span>`:``}
      </div>
      <details class="ovbox"${u?` open`:``}>
        <summary>Look${u?` · customised`:``}</summary>
        <div class="ovgrid" data-ov-form="${j(e)}">
          ${i(`Treatment`,e,l.treatment,[{v:``,l:`Automatic (whatever suits the data)`},{v:`scoreboard`,l:`Scoreboard (needs two sides)`},{v:`champion`,l:`Champion`},{v:`stat`,l:`Stat`},{v:`announcement`,l:`Announcement`},{v:`event`,l:`Event`},{v:`hero`,l:`Hero`}])}
          ${i(`Background`,e,l.background,[{v:``,l:`Automatic (house look)`},{v:`default`,l:`DFL house`},{v:`dark`,l:`Dark`},{v:`light`,l:`Light`},{v:`image`,l:`Image`},{v:`logo`,l:`Crest`}])}
          <label class="ov-field"><span>Background picture</span>
            ${k({id:`ov-image-${e}`,name:`ov-image-${e}`,value:l.image||``,preset:`backdrop`,attrs:`data-ov="${j(e)}" data-field="image"`})}</label>
          <label class="ov-field"><span>Seconds</span>
            <input type="number" min="3" max="15" data-ov="${j(e)}" data-field="dwell_seconds" value="${j(l.dwell_seconds??``)}" placeholder="auto"></label>
          <label class="ov-field ov-check">
            <input type="checkbox" data-ov="${j(e)}" data-field="featured" ${l.featured?`checked`:``}>
            <span>Feature it</span></label>
          <div class="row-end">
            <button type="button" class="btn ghost small" data-ov-save="${j(e)}">Save look</button>
            <button type="button" class="btn ghost small" data-ov-clear="${j(e)}">Reset</button>
          </div>
        </div>
      </details>
    </div>`}).join(``),t.dataset.wired!==`1`&&(t.dataset.wired=`1`,t.addEventListener(`click`,async e=>{let n=e.target.closest(`[data-gen-up],[data-gen-down]`);if(n){let e=n.hasAttribute(`data-gen-up`),r=e?n.dataset.genUp:n.dataset.genDown,i=await ie(),o=[...F.keys()].map((e,t)=>({gid:e,i:t,standing:pe(e,i.get(e))})).sort((e,t)=>t.standing-e.standing||e.i-t.i),s=o.findIndex(e=>e.gid===r),c=o[e?s-1:s+1];if(!c)return;n.disabled=!0;try{let n=ce(r,c.standing,{above:e}),{error:i}=await p().from(`broadcast_overrides`).upsert({generator:r,weight:n,updated_at:new Date().toISOString()},{onConflict:`generator`});if(i)throw i;await B(t)}catch(e){n.disabled=!1,a(e?.message||`Could not move that`,!0)}return}let r=e.target.closest(`[data-ov-save]`),i=e.target.closest(`[data-ov-clear]`);if(!r&&!i)return;let o=(r||i).dataset.ovSave||(r||i).dataset.ovClear,s=t.querySelector(`[data-ov-form="${CSS.escape(o)}"]`);try{if(i){let{error:e}=await p().from(`broadcast_overrides`).delete().eq(`generator`,o);if(e)throw e;a(`Back to automatic`)}else{let e=e=>s.querySelector(`[data-field="${e}"]`),t=Number(e(`dwell_seconds`).value),n={generator:o,treatment:e(`treatment`).value||null,background:e(`background`).value||null,image:e(`image`).value.trim()||null,dwell_seconds:Number.isFinite(t)&&t>0?Math.min(15,Math.max(3,Math.round(t))):null,featured:e(`featured`).checked,updated_at:new Date().toISOString()},{error:r}=await p().from(`broadcast_overrides`).upsert(n,{onConflict:`generator`});if(r)throw r;a(`Look saved`)}await B(t)}catch(e){a(e.message||`Could not save that look`,!0)}}),t.addEventListener(`change`,async e=>{let t=e.target.closest(`[data-gen]`);if(!t)return;let n=t.dataset.gen;t.disabled=!0;try{await P(n,!t.checked),a(`${F.get(n)?.[0]||n} ${t.checked?`on`:`off`}`)}catch(e){t.checked=!t.checked,a(e.message||`Could not save that`,!0)}t.disabled=!1}))}var ze=[[`announcements`,`Announcements`],[`calendar`,`Calendar`],[`polls`,`Polls`],[`keepers`,`Keepers`],[`golf`,`Golf`],[`sportsbook`,`Sportsbook`],[`broadcast`,`Broadcast / Stage`],[`fees`,`Fees`],[`history`,`History / Facts`],[`rules`,`Rules`],[`members`,`Members`],[`sleeper`,`Sleeper Sync`]];async function Be(e){e.innerHTML=`<div class="card"><div class="card-body">Loading commissioner access…</div></div>`;let t=[];try{let{data:e,error:n}=await p().from(`members`).select(`id,display_name,team_name,active`).eq(`active`,!0).order(`sort_order`,{ascending:!0}).order(`display_name`,{ascending:!0});if(n)throw n;t=e||[]}catch(t){e.innerHTML=`<div class="card note"><div class="card-body">${j(t.message||`Could not load members`)}</div></div>`;return}if(!t.length){e.innerHTML=`<div class="card"><div class="card-body">Add league members before assigning commissioner access.</div></div>`;return}let n=!0,r=[],i=await p().rpc(`list_commissioner_access`);i.error?n=!1:r=i.data||[];let o=new Map(r.map(e=>[String(e.member_id),{member_id:Number(e.member_id),is_owner:!!e.is_owner,active:!!e.active,permissions:Array.isArray(e.permissions)?e.permissions:[]}]));e.innerHTML=`
    <div class="section-head"><h2>Commissioner Access</h2></div>
    <div class="card note"><div class="card-body">Give a league member their own commissioner PIN and only the tools they should control. Select a member to review and adjust what they already have.</div></div>
    ${n?``:`<div class="card note"><div class="card-body">Current assignments cannot be loaded until <strong>commissioner_access_editor_schema.sql</strong> is run in Supabase. You can still replace access by entering a new PIN.</div></div>`}
    <form class="card" id="commissioner-form">
      <label for="commissioner-member">League member</label>
      <select id="commissioner-member" required>${t.map(e=>`<option value="${j(e.id)}">${j(e.display_name||e.team_name||`Member ${e.id}`)}</option>`).join(``)}</select>
      <p class="muted" id="commissioner-current" aria-live="polite"></p>
      <label for="commissioner-pin">Commissioner PIN</label>
      <input id="commissioner-pin" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" autocomplete="new-password" placeholder="At least 4 digits">
      <p class="muted" id="commissioner-pin-help"></p>
      <label class="checkrow"><input type="checkbox" id="commissioner-owner"> <span><strong>Owner</strong><br><small class="muted">Full access, including managing commissioners.</small></span></label>
      <div class="section-head"><h3>Permissions</h3></div>
      <div class="checklist" id="commissioner-perms">${ze.map(([e,t])=>`<label class="checkrow"><input type="checkbox" value="${j(e)}"> <span>${j(t)}</span></label>`).join(``)}</div>
      <div class="row-end"><button type="button" class="btn danger ghost" id="commissioner-disable">Disable access</button><button type="submit" class="btn">Save changes</button></div>
    </form>

    <div class="card">
      <div class="card-title">Profile PIN rescue</div>
      <p class="muted tiny">If a member forgets their optional Profile PIN, you can remove the lock. The old PIN is never shown.</p>
      <div class="row-end"><button type="button" class="btn ghost" id="profile-pin-reset">Reset selected member's Profile PIN</button></div>
    </div>`;let s=e.querySelector(`#commissioner-form`),c=e.querySelector(`#commissioner-member`),l=e.querySelector(`#commissioner-pin`),u=e.querySelector(`#commissioner-pin-help`),d=e.querySelector(`#commissioner-current`),f=e.querySelector(`#commissioner-owner`),m=e.querySelector(`#commissioner-disable`),h=[...e.querySelectorAll(`#commissioner-perms input[type=checkbox]`)],g=()=>o.get(String(c.value)),_=()=>{h.forEach(e=>{e.disabled=f.checked})},v=()=>{let e=g(),t=new Set(e?.permissions||[]);l.value=``,f.checked=!!e?.is_owner,h.forEach(e=>{e.checked=t.has(e.value)}),l.required=!n||!e,l.placeholder=e?`Leave blank to keep current PIN`:`At least 4 digits`,u.textContent=e?`Leave this blank to keep the current commissioner PIN, or enter a new one to replace it.`:`Set a PIN of at least four digits for new commissioner access.`,d.textContent=n?e?.active?e.is_owner?`Current access: Owner · all permissions`:`Current access: Commissioner · ${e.permissions.length} permission${e.permissions.length===1?``:`s`}`:e?`Current access: Disabled · previous settings shown below`:`Current access: None`:`Current access unavailable until the database update is installed.`,m.disabled=n?!e?.active:!1,_()};c.addEventListener(`change`,v),f.addEventListener(`change`,_),l.addEventListener(`input`,()=>{l.value=l.value.replace(/\D/g,``)}),v(),s.addEventListener(`submit`,async e=>{e.preventDefault();let t=s.querySelector(`button[type="submit"]`);t.disabled=!0;try{if(!g()&&l.value.length<4)throw Error(`Set a PIN of at least four digits for new commissioner access.`);let e=h.filter(e=>e.checked).map(e=>e.value),{error:t}=await p().rpc(`save_commissioner`,{target_member_id:Number(c.value),new_pin:l.value,new_permissions:e,make_owner:f.checked});if(t)throw t;o.set(String(c.value),{member_id:Number(c.value),is_owner:f.checked,active:!0,permissions:e}),a(f.checked?`Owner access updated`:`Commissioner access updated`),v()}catch(e){let t=!l.value&&/PIN must be at least/i.test(e.message||``)?`Run commissioner_access_editor_schema.sql in Supabase to edit access without resetting the PIN.`:e.message;a(t||`Could not save commissioner access`,!0)}finally{t.disabled=!1}}),m.addEventListener(`click`,async()=>{let e=t.find(e=>String(e.id)===String(c.value)),n=e?.display_name||e?.team_name||`this member`;if(confirm(`Disable commissioner access for ${n}?`))try{let{error:e}=await p().rpc(`disable_commissioner`,{target_member_id:Number(c.value)});if(e)throw e;let t=g()||{member_id:Number(c.value),permissions:[],is_owner:!1};o.set(String(c.value),{...t,active:!1}),a(`Commissioner access disabled`),v()}catch(e){a(e.message||`Could not disable commissioner access`,!0)}}),e.querySelector(`#profile-pin-reset`).addEventListener(`click`,async()=>{let e=t.find(e=>String(e.id)===String(c.value)),n=e?.display_name||e?.team_name||`this member`;if(confirm(`Remove ${n}'s Profile PIN lock? They can set a new one from their Profile.`))try{let{error:e}=await p().rpc(`profile_owner_reset_pin`,{target_member_id:Number(c.value)});if(e)throw e;a(`Profile PIN lock reset`)}catch(e){a(/profile_owner_reset_pin|function/i.test(e.message||``)?`Run profile_lock_schema.sql in Supabase first`:e.message||`Could not reset Profile PIN`,!0)}})}var Ve=[`Sunday`,`Monday`,`Tuesday`,`Wednesday`,`Thursday`,`Friday`,`Saturday`],He=/^([01]\d|2[0-3]):[0-5]\d$/;function V(e=[]){let t=new Map;for(let n of e||[]){let e=Number(n?.day),r=String(n?.time||``).slice(0,5);!Number.isInteger(e)||e<0||e>6||!He.test(r)||t.set(`${e}:${r}`,{day:e,time:r})}return[...t.values()].sort((e,t)=>e.day-t.day||e.time.localeCompare(t.time))}function Ue(e=[]){let t=Array.from({length:7},()=>[]);return V(e).forEach(({day:e,time:n})=>t[e].push(n)),t}function We(e=[],t=new Date){return V(e).map(e=>{let[n,r]=e.time.split(`:`).map(Number),i=new Date(t);return i.setDate(t.getDate()+(e.day-t.getDay()+7)%7),i.setHours(n,r,0,0),i<=t&&i.setDate(i.getDate()+7),i}).sort((e,t)=>e-t)[0]||null}function Ge(e,t=`12:00`){let n=Ve[e];return`<div class="sl-schedule-time">
    <input type="time" value="${j(t)}" data-sync-time data-day="${e}"
      aria-label="${n} sync time">
    <button class="sl-remove-time" type="button" data-remove-sync-time
      aria-label="Remove ${n} sync time">Remove</button>
  </div>`}function Ke(e){let t=Ue(e);return Ve.map((e,n)=>`
    <section class="sl-schedule-day" data-schedule-day="${n}">
      <div class="sl-schedule-day-head">
        <strong>${e}</strong>
        <button type="button" data-add-sync-time="${n}">+ Add time</button>
      </div>
      <div class="sl-schedule-times" data-times-for="${n}">
        ${t[n].map(e=>Ge(n,e)).join(``)}
        <span class="sl-no-times" ${t[n].length?`hidden`:``}>No automatic sync</span>
      </div>
    </section>`).join(``)}async function qe(e){let t=e.querySelector(`#sl-people-list`);if(!t)return;let{data:n,error:r}=await p().from(`sleeper_users`).select(`sleeper_user_id, display_name, team_name, hidden`).order(`display_name`,{ascending:!0});if(r){t.innerHTML=`<span class="warntext">${j(r.message)}</span>
      <div class="muted tiny">Run <strong>members_schema.sql</strong> to add the hidden flag.</div>`;return}if(!n?.length){t.textContent=`Nobody synced yet.`;return}t.innerHTML=`
    <div class="muted tiny" style="margin-bottom:8px">${n.filter(e=>!e.hidden).length} of ${n.length} shown</div>
    ${n.map(e=>`
      <label class="checkrow">
        <input type="checkbox" data-user="${j(e.sleeper_user_id)}" ${e.hidden?``:`checked`}>
        <span>
          <strong>${j(e.display_name)}</strong>
          ${e.team_name?`<span class="muted tiny"> · ${j(e.team_name)}</span>`:``}
        </span>
      </label>`).join(``)}
  `}async function H(e){e.innerHTML=l();let t;try{let{data:e,error:n}=await p().from(`sleeper_config`).select(`*`).eq(`id`,1).single();if(n)throw n;t=e}catch(t){e.innerHTML=n(t)+`<div class="card"><div class="card-body muted">If this says the table is missing, run
       <strong>sleeper_schema.sql</strong> in the Supabase SQL editor.</div></div>`;return}let[{count:r},{count:i},o]=await Promise.all([p().from(`sleeper_leagues`).select(`*`,{count:`exact`,head:!0}),p().from(`sleeper_matchups`).select(`*`,{count:`exact`,head:!0}),p().rpc(`sleeper_get_sync_schedule`)]),s=o.error?null:o.data,c=V(s?.slots||[]),u=s?.enabled??t.auto_sync_enabled??!1;e.innerHTML=`
    <form class="card" id="sl-form">
      <div class="card-title">Sleeper league</div>
      <label for="sl-id">Sleeper League ID</label>
      <input id="sl-id" type="text" inputmode="numeric" placeholder="1048291837465738240"
             value="${j(t.sleeper_league_id||``)}">
      <div class="row-end"><button class="btn ghost" type="submit">Save league ID</button></div>
    </form>

    <div class="card">
      <div class="card-title">Sync</div>
      <div class="card-meta" style="margin:0 0 10px">
        Last sync: <strong>${t.last_synced_at?j(g(t.last_synced_at))+` `+new Date(t.last_synced_at).toLocaleTimeString():`never`}</strong>
        ${t.last_sync_note?`<br>${j(t.last_sync_note)}`:``}
        <br>Stored now: ${r||0} season(s), ${i||0} matchups.
      </div>
      <button class="btn primary block" id="sl-sync">Sync Current Season</button>
      <button class="btn ghost block" id="sl-sync-history" style="margin-top:8px">Repair All Season History</button>
      <div class="muted tiny" style="margin-top:8px">
        Use the fast current-season sync after roster, matchup, waiver or trade changes.
        History repair is only needed when older records are missing or corrected.
      </div>
      <pre id="sl-log" class="synclog hidden"></pre>
    </div>

    <div class="card sl-schedule-card">
      <div class="sl-schedule-title-row">
        <div>
          <div class="card-title">Automatic sync schedule</div>
          <div class="muted tiny">Pick any weekdays and times. Central time · adjusts for daylight saving.</div>
        </div>
        <label class="sl-schedule-toggle">
          <input id="sl-auto-enabled" type="checkbox" ${u?`checked`:``}
            ${s?``:`disabled`}>
          <span>Enabled</span>
        </label>
      </div>
      ${s?`
        <div class="sl-schedule-days">${Ke(c)}</div>
        <div class="sl-schedule-foot">
          <div class="muted tiny">
            ${t.last_auto_checked_at?`Last automatic check: ${j(g(t.last_auto_checked_at))}`:`No automatic check recorded yet.`}
            ${t.last_auto_error?`<br><span class="warntext">${j(t.last_auto_error)}</span>`:``}
          </div>
          <button class="btn primary" id="sl-save-schedule" type="button">Save schedule</button>
        </div>`:`
        <div class="notice warn" style="margin-top:12px">
          Schedule controls need <strong>sleeper_sync_schedule_schema.sql</strong> applied to Supabase.
        </div>`}
    </div>

    <div class="card" id="sl-people">
      <div class="card-title">Who shows up</div>
      <div id="sl-people-list" class="muted tiny">Loading…</div>
    </div>
  `,qe(e);let d=e.querySelector(`.sl-schedule-card`);d?.addEventListener(`click`,e=>{let t=e.target.closest(`[data-add-sync-time]`);if(t){let e=Number(t.dataset.addSyncTime),n=d.querySelector(`[data-times-for="${e}"]`);if(n.querySelectorAll(`[data-sync-time]`).length>=8){a(`That day already has the maximum of 8 sync times`,!0);return}let r=new Set([...n.querySelectorAll(`[data-sync-time]`)].map(e=>e.value)),i=[`12:00`,`13:00`,`15:30`,`18:00`,`21:00`,`00:00`,`09:00`].find(e=>!r.has(e))||`12:00`;n.querySelector(`.sl-no-times`)?.setAttribute(`hidden`,``),n.insertAdjacentHTML(`beforeend`,Ge(e,i)),n.querySelector(`.sl-schedule-time:last-child input`)?.focus();return}let n=e.target.closest(`[data-remove-sync-time]`);if(n){let e=n.closest(`.sl-schedule-times`);n.closest(`.sl-schedule-time`)?.remove(),e.querySelector(`[data-sync-time]`)||e.querySelector(`.sl-no-times`)?.removeAttribute(`hidden`)}}),e.querySelector(`#sl-save-schedule`)?.addEventListener(`click`,async t=>{let n=t.currentTarget,r=e.querySelector(`#sl-auto-enabled`).checked,i=V([...e.querySelectorAll(`[data-sync-time]`)].map(e=>({day:Number(e.dataset.day),time:e.value})));if(r&&!i.length){a(`Add at least one time before enabling automatic sync`,!0);return}n.disabled=!0,n.textContent=`Saving…`;let{error:o}=await p().rpc(`sleeper_save_sync_schedule`,{new_schedule:i,new_enabled:r});if(o){a(o.message,!0),n.disabled=!1,n.textContent=`Save schedule`;return}a(r?`Automatic sync saved · ${i.length} weekly time${i.length===1?``:`s`}`:`Automatic sync paused`),H(e)}),e.querySelector(`#sl-people-list`).addEventListener(`change`,async e=>{let t=e.target.closest(`input[data-user]`);if(!t)return;let{error:n}=await p().from(`sleeper_users`).update({hidden:!t.checked}).eq(`sleeper_user_id`,t.dataset.user);n?(a(n.message,!0),t.checked=!t.checked):a(t.checked?`Now visible`:`Hidden`)}),e.querySelector(`#sl-form`).addEventListener(`submit`,async t=>{t.preventDefault();let n=e.querySelector(`#sl-id`).value.trim(),{error:r}=await p().from(`sleeper_config`).update({sleeper_league_id:n}).eq(`id`,1);r?a(r.message,!0):a(`League ID saved`)});async function f(t,n){let r=e.querySelector(`#sl-log`),i=e.querySelector(`#sl-id`).value.trim();if(!i){a(`Enter a Sleeper league ID first`,!0);return}r.classList.remove(`hidden`),r.textContent=``;let o=e=>{r.textContent+=e+`
`,r.scrollTop=r.scrollHeight},s=[...e.querySelectorAll(`#sl-sync, #sl-sync-history`)];s.forEach(e=>{e.disabled=!0});let c=n.textContent;n.textContent=t?`Repairing history…`:`Syncing current season…`;try{await p().from(`sleeper_config`).update({sleeper_league_id:i}).eq(`id`,1);let{counts:n}=await Se(i,o,{includeHistory:t});a(`Synced ${n.seasons} season(s)`),H(e)}catch(e){o(`\nFAILED: ${e.message}`),a(e.message,!0),s.forEach(e=>{e.disabled=!1}),n.textContent=c}}e.querySelector(`#sl-sync`).addEventListener(`click`,e=>f(!1,e.currentTarget)),e.querySelector(`#sl-sync-history`).addEventListener(`click`,e=>{confirm(`Repair every linked Sleeper season? Normal team changes only need the current-season sync.`)&&f(!0,e.currentTarget)})}var U=new Date().getFullYear();async function W(e){e.innerHTML=l();let t,r,i,o;try{let[e,n,a]=await Promise.all([p().from(`finance_seasons`).select(`*`).eq(`season`,U).maybeSingle(),p().from(`finance_payments`).select(`*`).eq(`season`,U).order(`owner_name`),p().from(`finance_payouts`).select(`*`).eq(`season`,U).order(`sort_order`)]);if(n.error||a.error)throw n.error||a.error;t=e.data||null,r=n.data||[],i=a.data||[],o=await d().catch(()=>[])}catch(t){e.innerHTML=n(t);return}let s=Number(t?.buy_in||0),c=s*r.length,u=o.filter(e=>!r.some(t=>Ye(t.owner_name,e.display_name))),f=r.filter(e=>Number(e.amount_due)!==s);e.innerHTML=`
    <div class="card">
      <div class="card-title">Season</div>
      <div class="setup-grid">
        <label for="su-year">Season</label>
        <label for="su-buyin">Buy-in per team ($)</label>
        <input id="su-year" type="number" value="${j(U)}" step="1">
        <input id="su-buyin" type="number" value="${j(s)}" step="1" min="0">
      </div>
      <div class="row-end">
        <button class="btn" id="su-save-season">Save season</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Teams</div>
      <div class="setup-figures">
        ${G(r.length,r.length===1?`team`:`teams`)}
        ${G(m(s),`each`)}
        ${G(m(c),`pot`)}
      </div>

      ${r.length?`<div class="chiprow">${r.map(e=>`<span class="chip flat">${j(e.owner_name)}</span>`).join(``)}</div>`:`<p class="muted tiny">Nobody is in this season yet.</p>`}

      <div class="row-end">
        ${u.length?`<button class="btn" id="su-add-members">
               Add ${u.length} league member${u.length===1?``:`s`}
             </button>`:`<span class="muted tiny">Every league member is in this season.</span>`}
        ${f.length&&s>0?`<button class="btn ghost" id="su-fix-dues">
               Set ${f.length} due${f.length===1?``:`s`} to ${m(s)}
             </button>`:``}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Payouts</div>
      <div id="su-payouts">
        ${i.length?i.map(Je).join(``):``}
      </div>
      <div class="row-end" style="justify-content:space-between">
        <button class="btn ghost small" id="su-add-payout">+ Add payout</button>
        <span id="su-tally" class="setup-tally"></span>
      </div>
      <div class="row-end">
        <button class="btn" id="su-save-payouts">Save payouts</button>
      </div>
    </div>
  `;let h=e.querySelector(`#su-tally`),g=()=>{let t=[...e.querySelectorAll(`#su-payouts .po-amount`)].reduce((e,t)=>e+(Number(t.value)||0),0),n=c-t;if(!c){h.innerHTML=`<span class="muted">${s<=0?`Set a buy-in to see the pot`:`Add teams to see the pot`}</span>`;return}h.innerHTML=`${m(t)} of ${m(c)}
      <span class="${n===0?`ok`:n<0?`over`:`under`}">
        ${n===0?`balanced`:n<0?m(-n)+` over`:m(n)+` left`}
      </span>`};g(),e.querySelector(`#su-payouts`).addEventListener(`input`,g),e.querySelector(`#su-payouts`).addEventListener(`click`,e=>{let t=e.target.closest(`button[data-drop]`);t&&(t.closest(`.po-row`).remove(),g())}),e.querySelector(`#su-add-payout`).addEventListener(`click`,()=>{e.querySelector(`#su-payouts`).insertAdjacentHTML(`beforeend`,Je(null)),g()}),e.querySelector(`#su-save-season`).addEventListener(`click`,async t=>{let n=Number(e.querySelector(`#su-year`).value),r=Number(e.querySelector(`#su-buyin`).value)||0;if(!n){a(`Give the season a year`,!0);return}t.target.disabled=!0;try{let{error:t}=await p().from(`finance_seasons`).upsert({season:n,buy_in:r},{onConflict:`season`});if(t)throw t;U=n,a(`Saved`),W(e)}catch(e){a(e.message||`Could not save`,!0),t.target.disabled=!1}}),e.querySelector(`#su-add-members`)?.addEventListener(`click`,async t=>{t.target.disabled=!0;try{for(let e of u)await w(`finance_payments`,{season:U,owner_name:e.display_name,team_name:e.team_name||``,sleeper_user_id:e.sleeper_user_id||null,amount_due:s,amount_paid:0});a(`Added ${u.length} to ${U}`),W(e)}catch(e){a(e.message||`Could not add everyone`,!0),t.target.disabled=!1}}),e.querySelector(`#su-fix-dues`)?.addEventListener(`click`,async t=>{t.target.disabled=!0;try{let{error:t}=await p().from(`finance_payments`).update({amount_due:s}).eq(`season`,U);if(t)throw t;a(`Dues updated`),W(e)}catch(e){a(e.message||`Could not update the dues`,!0),t.target.disabled=!1}}),e.querySelector(`#su-save-payouts`).addEventListener(`click`,async t=>{let n=[...e.querySelectorAll(`#su-payouts .po-row`)].map((e,t)=>({id:e.dataset.id||null,title:e.querySelector(`.po-title`).value.trim(),amount:Number(e.querySelector(`.po-amount`).value)||0,sort_order:t+1})).filter(e=>e.title);t.target.disabled=!0;try{let t=new Set(n.filter(e=>e.id).map(e=>String(e.id)));for(let e of i)t.has(String(e.id))||await b(`finance_payouts`,e.id);for(let e of n)e.id?await E(`finance_payouts`,e.id,{title:e.title,amount:e.amount,sort_order:e.sort_order}):await w(`finance_payouts`,{season:U,title:e.title,amount:e.amount,sort_order:e.sort_order});a(`Payouts saved`),W(e)}catch(e){a(e.message||`Could not save the payouts`,!0),t.target.disabled=!1}})}function Je(e){return`
    <div class="po-row" ${e?`data-id="${j(e.id)}"`:``}>
      <input class="po-title" type="text" placeholder="Champion"
             value="${e?j(e.title):``}">
      <input class="po-amount" type="number" step="1" min="0" placeholder="0"
             value="${e?j(Number(e.amount)):``}">
      <button type="button" class="btn ghost small" data-drop aria-label="Remove">&times;</button>
    </div>`}function G(e,t){return`<div class="setup-figure">
            <span class="sf-v">${j(e)}</span>
            <span class="sf-l">${j(t)}</span>
          </div>`}function Ye(e,t){return String(e||``).trim().toLowerCase()===String(t||``).trim().toLowerCase()}var K=new Date().getFullYear(),Xe=[{id:`buyin`,tab:`Buy-in`,table:`finance_seasons`,singular:`season`,plural:`seasons`,order:`season`,asc:!1,label:e=>`${e.season} — ${m(e.buy_in)} per team`,sub:e=>e.notes||``,fields:[{name:`season`,label:`Season`,type:`number`,required:!0,default:K},{name:`buy_in`,label:`Buy-in per team ($)`,type:`number`,required:!0,default:0},{name:`notes`,label:`Notes`,type:`textarea`}]},{id:`payments`,tab:`Dues`,table:`finance_payments`,singular:`team`,plural:`teams`,order:`owner_name`,asc:!0,label:e=>`${e.owner_name}${e.team_name?` — `+e.team_name:``}`,sub:e=>`${e.season} · paid ${m(e.amount_paid)} of ${m(e.amount_due)}`,fields:[{name:`season`,label:`Season`,type:`number`,required:!0,default:K},{name:`owner_name`,label:`Team owner`,type:`text`,required:!0,placeholder:`Slaw`},{name:`team_name`,label:`Team name`,type:`text`,placeholder:`Slaw Squad`},{name:`amount_due`,label:`Amount due ($)`,type:`number`,default:0},{name:`amount_paid`,label:`Amount paid ($)`,type:`number`,default:0},{name:`date_paid`,label:`Date paid`,type:`date`},{name:`notes`,label:`Notes`,type:`textarea`,placeholder:`Venmo, paying in two halves…`},{name:`sleeper_user_id`,label:`Link to Sleeper account (optional)`,type:`select`,optionsFrom:{table:`sleeper_users`,value:`sleeper_user_id`,label:`display_name`,order:`display_name`}}]},{id:`payouts`,tab:`Payouts`,table:`finance_payouts`,singular:`payout`,plural:`payouts`,order:`sort_order`,asc:!0,label:e=>`${e.title} — ${m(e.amount)}`,sub:e=>`${e.season}${e.winner?` · `+e.winner:``}`,fields:[{name:`season`,label:`Season`,type:`number`,required:!0,default:K},{name:`title`,label:`Payout`,type:`text`,required:!0,placeholder:`Champion`},{name:`amount`,label:`Amount ($)`,type:`number`,required:!0,default:0},{name:`description`,label:`Description (optional)`,type:`text`},{name:`winner`,label:`Winner (optional)`,type:`text`},{name:`sort_order`,label:`Display order`,type:`number`,default:1}]},{id:`expenses`,tab:`Expenses`,table:`finance_expenses`,singular:`expense`,plural:`expenses`,order:`expense_date`,asc:!1,label:e=>`${e.description} — ${m(e.amount)}`,sub:e=>`${e.season}`,fields:[{name:`season`,label:`Season`,type:`number`,required:!0,default:K},{name:`description`,label:`What was it`,type:`text`,required:!0,placeholder:`Trophy engraving`},{name:`amount`,label:`Amount ($)`,type:`number`,required:!0,default:0},{name:`expense_date`,label:`Date`,type:`date`},{name:`notes`,label:`Notes`,type:`textarea`}]},{id:`comps`,tab:`Competitions`,table:`finance_competitions`,singular:`competition`,plural:`competitions`,order:`name`,asc:!0,label:e=>e.name,sub:e=>`${e.season} · ${e.status}${e.winner?` · `+e.winner:``}`,fields:[{name:`season`,label:`Season`,type:`number`,required:!0,default:K},{name:`name`,label:`Competition`,type:`text`,required:!0,placeholder:`March Madness`},{name:`buy_in`,label:`Buy-in ($)`,type:`number`,default:0},{name:`participants`,label:`Number of players`,type:`number`,default:0},{name:`prize_pool`,label:`Prize pool ($) — leave blank to calculate`,type:`number`},{name:`winner`,label:`Winner`,type:`text`},{name:`status`,label:`Status`,type:`select`,options:[`Open`,`Running`,`Finished`]},{name:`notes`,label:`Notes`,type:`textarea`}]}],Ze={id:`setup`,tab:`Setup`},q=`setup`;function Qe(e){e.innerHTML=`
    <div class="tabs subtabs" id="fin-admin-tabs">
      ${[Ze,...Xe].map(e=>`
        <button data-fin="${e.id}" class="${e.id===q?`on`:``}">${j(e.tab)}</button>
      `).join(``)}
    </div>
    <div id="fin-admin-body"></div>
  `;let t=e.querySelector(`#fin-admin-body`),n=()=>q===Ze.id?W(t):L(t,Xe.find(e=>e.id===q));e.querySelector(`#fin-admin-tabs`).addEventListener(`click`,t=>{let r=t.target.closest(`button[data-fin]`);r&&(q=r.dataset.fin,e.querySelectorAll(`#fin-admin-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.fin===q)),n())}),n()}var J=[{value:_e.FIXED_FROM_BASIS,label:`Fixed`,hint:`The cost stays the same every keeper year.`},{value:_e.ESCALATES_PER_YEAR,label:`Climbs each year`,hint:`The adjustment applies again for every extra keeper year.`}];async function $e(e){e.innerHTML=`<div class="card"><div class="card-body muted">Reading the keeper rules…</div></div>`;let[t,n]=await Promise.all([p().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression, notes, updated_at`).order(`effective_season`,{ascending:!1}),p().from(`sleeper_leagues`).select(`season`).order(`season`,{ascending:!1}).limit(1)]),r=null;try{let e=await p().from(`keeper_season_state`).select(`season, member_entry_locked`);r=e.error?null:e.data||[]}catch{r=null}if(t.error){e.innerHTML=`<div class="card"><div class="card-body">
      Keeper rules are not switched on yet. Run <strong>keeper_rules_schema.sql</strong>
      and then <strong>keeper_basis_correction.sql</strong> in the Supabase SQL editor.
      <p class="muted tiny">${j(t.error.message||``)}</p></div></div>`;return}let i=t.data||[],o=(n.data||[])[0]?.season??new Date().getFullYear(),s=i[0]?.effective_season??o,c=()=>{let t=i.find(e=>Number(e.effective_season)===Number(s)),n=t||{...me,effective_season:s};e.innerHTML=et(i,n,!t,o)+d(s,r),f()};function l(){let t=e.querySelector(`[data-kr-form]`);return{effective_season:Number(t.effective_season.value),max_keeper_seasons:Number(t.max_keeper_seasons.value),round_adjustment:Number(t.round_adjustment.value),progression:t.progression.value,cost_basis:ye.PREVIOUS_SEASON_DRAFT_ROUND}}function u(){let t=e.querySelector(`[data-kr-preview]`),n=e.querySelector(`[data-kr-errors]`),r=ge(l());if(!r.ok){t.innerHTML=`<span class="muted">—</span>`,n.textContent=r.errors.join(` · `);return}n.textContent=``;let i=r.config.effective_season,a=I(r.config,{basisRound:8,targetSeason:i}),o=I(r.config,{basisRound:2,targetSeason:i}),s=I(r.config,{basisRound:1,targetSeason:i});t.innerHTML=`
      <p class="kr-summary">${j(ve(r.config))}</p>
      <p class="kr-example"><strong>${j(a.basisSeason)} Draft R${a.basisRound}</strong>
        → <strong>${j(i)} Keeper R${a.cost}</strong></p>
      <ul class="kr-cases">
        <li>${j(o.basisSeason)} Draft R${o.basisRound} → ${j(i)} Keeper R${o.cost}</li>
        <li>${j(s.basisSeason)} Draft R${s.basisRound} → ${j(i)} Keeper R${s.cost}
          <span class="muted tiny">R1 is the floor, always</span></li>
      </ul>
      <p class="muted tiny">${j(a.text)}</p>`}function d(e,t){if(t==null)return``;let n=!!t.find(t=>Number(t.season)===Number(e))?.member_entry_locked;return`<section class="card"><div class="card-body">
      <h3 class="card-heading">Member entry for ${e}</h3>
      <p class="muted tiny">${n?`Closed. Members cannot choose or change their own ${e} keeper. You still can.`:`Open. Members can choose and change their own ${e} keeper until you close it.`}</p>
      <div class="row-end">
        <button type="button" class="btn ${n?``:`danger`}" data-kr-lock="${n?`0`:`1`}"
                data-kr-lock-season="${e}">
          ${n?`Reopen ${e} for members`:`Close ${e} to members`}
        </button>
      </div>
    </div></section>`}function f(){e.querySelectorAll(`[data-kr-lock]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.krLock===`1`,n=Number(e.dataset.krLockSeason);e.disabled=!0;try{let{data:e,error:i}=await p().rpc(`keeper_set_season_lock`,{target_season:n,locked:t});if(i)throw i;let o=Array.isArray(e)?e[0]:e;if(!o)throw Error(`That was refused.`);r=[...(r||[]).filter(e=>Number(e.season)!==n),{season:n,member_entry_locked:!!o.member_entry_locked}],a(o.member_entry_locked?`${n} closed to members`:`${n} reopened for members`),c()}catch(t){e.disabled=!1,a(t?.message||`Could not change that`,!0)}})}),e.querySelectorAll(`[data-kr-season]`).forEach(e=>{e.addEventListener(`click`,()=>{s=Number(e.dataset.krSeason),c()})});let t=e.querySelector(`[data-kr-form]`);t.addEventListener(`input`,u),t.addEventListener(`change`,u),t.addEventListener(`submit`,async n=>{n.preventDefault();let r=t.querySelector(`button[type=submit]`),i=ge(l());if(!i.ok){a(i.errors[0],!0);return}r.disabled=!0;try{let{data:t,error:n}=await p().from(`keeper_rules`).upsert({effective_season:i.config.effective_season,max_keeper_seasons:i.config.max_keeper_seasons,cost_basis:i.config.cost_basis,round_adjustment:i.config.round_adjustment,progression:i.config.progression,updated_at:new Date().toISOString()},{onConflict:`effective_season`}).select(`effective_season`);if(n)throw n;if(!t||!t.length)throw Error(`The database refused that write. Sign in as admin and try again.`);a(`${i.config.effective_season} keeper rules saved`),await $e(e)}catch(e){r.disabled=!1,a(e.message||`Could not save the keeper rules`,!0)}}),u()}c()}function et(e,t,n,r){let i=e.map(e=>Number(e.effective_season)),a=Math.max(r,...i.length?i:[r])+1;return`
    <div class="card kr-card">
      <div class="card-title-row">
        <div>
          <div class="card-title">Keeper rules</div>
          <p class="muted tiny">The configuration the keeper engine reads. The
            <a href="#/rules">Rules page</a> is the league's wording; this is the maths.</p>
        </div>
        <span class="admin-badge">Admin only</span>
      </div>

      <div class="tabs kr-seasons">
        ${[...new Set([...i,a])].sort((e,t)=>t-e).map(e=>`
          <button type="button" data-kr-season="${e}"
            class="${Number(e)===Number(t.effective_season)?`on`:``}">${e}${i.includes(e)?``:` +`}</button>`).join(``)}
      </div>

      <form data-kr-form class="kr-form">
        <input type="hidden" name="effective_season" value="${j(t.effective_season)}">

        <p class="kr-note">${n?`Nothing is configured for <strong>${j(t.effective_season)}</strong> yet.
             Saving adds a new rule set that takes effect from that season.`:`Editing the rule set effective from <strong>${j(t.effective_season)}</strong>.`}
          A season is governed by the newest rule set at or before it, so changing a future
          season cannot alter a keeper already recorded.</p>

        <div class="kr-fields">
          <label class="kr-field">
            <span>Maximum keeper seasons</span>
            <input name="max_keeper_seasons" type="number" min="1" max="20" inputmode="numeric"
                   value="${j(t.max_keeper_seasons)}" required>
            <small class="muted tiny">How many seasons one player may be kept in total.</small>
          </label>

          <label class="kr-field">
            <span>Rounds earlier than the basis</span>
            <input name="round_adjustment" type="number" min="0" max="20" inputmode="numeric"
                   value="${j(t.round_adjustment)}" required>
            <small class="muted tiny">0 means the keeper costs that same round.</small>
          </label>

          <label class="kr-field">
            <span>Cost progression</span>
            <select name="progression">
              ${J.map(e=>`<option value="${e.value}" ${e.value===t.progression?`selected`:``}>${j(e.label)}</option>`).join(``)}
            </select>
            <small class="muted tiny">${j(J.find(e=>e.value===t.progression)?.hint||J[0].hint)}</small>
          </label>
        </div>

        <div class="kr-field is-fixed">
          <span>Cost basis</span>
          <strong>${j(he(me)||`Previous season's draft round`)}</strong>
          <small class="muted tiny">A 2026 keeper is priced from that player's 2025 DFL draft
            round. This is the league's rule and the only basis the engine supports, so it is
            not editable here.</small>
        </div>

        <div class="kr-preview">
          <div class="kr-preview-head">What this means</div>
          <div data-kr-preview></div>
          <p class="kr-errors" data-kr-errors role="alert"></p>
        </div>

        <div class="row-end">
          <button class="btn" type="submit">${n?`Add`:`Save`} ${j(t.effective_season)} rules</button>
        </div>
      </form>
    </div>`}async function tt(e){await t(`css/notifications.css`);let n=await d();e.innerHTML=`<section class="admin-notify-panel"><div class="section-head"><div><h2>Send notification</h2><p class="muted">Delivered to the in-app inbox and any enabled phones.</p></div></div>
    <form class="card" id="notification-compose">
      <div class="form-grid two"><label>Title<input name="title" maxlength="80" required placeholder="League update"></label><label>Category<select name="category">${xe.map(([e,t])=>`<option value="${e}">${j(t)}</option>`).join(``)}</select></label></div>
      <label>Message<textarea name="body" maxlength="240" rows="3" required placeholder="What does the league need to know?"></textarea><small class="muted"><span data-notify-count>0</span>/240</small></label>
      <div class="form-grid two"><label>Opens to<select name="targetUrl"><option value="#/home">Home</option><option value="#/analyzer">Team analyzer</option><option value="#/trade">Trade room</option><option value="#/sportsbook">Sportsbook</option><option value="#/wall">League wall</option><option value="#/polls">Polls</option><option value="#/finances">Fees</option><option value="#/calendar">Calendar</option><option value="#/rules">Rules</option><option value="#/notifications">Notifications</option></select></label><label>Recipients<select name="audience"><option value="all">Everyone</option><option value="members">Selected members</option></select></label></div>
      <fieldset class="notify-recipient-picker hidden"><legend>Choose members</legend>${n.map(e=>`<label><input type="checkbox" value="${e.id}"><span><strong>${j(e.display_name)}</strong>${e.team_name?`<small>${j(e.team_name)}</small>`:``}</span></label>`).join(``)}</fieldset>
      <div class="row-end"><button class="btn" type="submit">Send notification</button></div>
    </form><div data-notify-result></div></section>`;let r=e.querySelector(`#notification-compose`),i=e.querySelector(`.notify-recipient-picker`);r.elements.audience.addEventListener(`change`,()=>i.classList.toggle(`hidden`,r.elements.audience.value!==`members`)),r.elements.body.addEventListener(`input`,()=>{e.querySelector(`[data-notify-count]`).textContent=String(r.elements.body.value.length)}),r.addEventListener(`submit`,async t=>{t.preventDefault();let n=r.querySelector(`button[type="submit"]`),o=be({title:r.elements.title.value,body:r.elements.body.value,category:r.elements.category.value,targetUrl:r.elements.targetUrl.value,audience:r.elements.audience.value,targetMemberIds:[...i.querySelectorAll(`input:checked`)].map(e=>e.value)});if(!o.title||!o.body)return a(`Add a title and message`,!0);if(r.elements.audience.value===`members`&&!o.targetMemberIds.length)return a(`Choose at least one member`,!0);n.disabled=!0;try{let{data:t,error:n}=await re().functions.invoke(`send-notification`,{headers:u(),body:{action:`send`,...o}});if(n){let e=null;try{e=await n.context?.json()}catch{}throw Error(e?.error||e?.message||n.message||`Could not send notification`)}if(!t?.ok)throw Error(t?.error||`Notification could not be sent`);let s=Number(t.delivered)||0;e.querySelector(`[data-notify-result]`).innerHTML=`<div class="card note"><div class="card-body"><strong>Sent to the league inbox.</strong><br><span class="muted">${s} phone${s===1?``:`s`} received push delivery${t.pushConfigured?`.`:`; phone delivery needs its server keys configured.`}</span></div></div>`,r.reset(),i.classList.add(`hidden`),e.querySelector(`[data-notify-count]`).textContent=`0`,a(`Notification sent`)}catch(e){a(e.message||`Could not send notification`,!0)}finally{n.disabled=!1}})}var nt={roster_count:`Missing or unexpected rosters`,roster_ids:`Duplicate or missing roster IDs`,roster_owners:`Duplicate or missing owners`,missing_owners:`Owner directory incomplete`,empty_rosters:`Empty roster data`,duplicate_players:`Players assigned to multiple teams`,matchup_rosters:`Matchups assigned to the wrong rosters`,matchup_count:`Incomplete weekly matchups`,invalid_starters:`Duplicate or unowned starters`,wrong_week:`Wrong league week`,wrong_season:`Wrong league season`,league_format:`League settings differ from 12-team PPR / one QB`},rt=Object.freeze({app_ready:2500,largest_contentful_paint:2500,cumulative_layout_shift:.1,interaction_latency:200,route_render:1e3,route_module:800,route_content:700,long_task:200});function it(e=[]){return e.map(e=>({...e,limit:rt[e.metric]})).filter(e=>Number.isFinite(e.limit)&&Number(e.p75)>e.limit).sort((e,t)=>Number(t.p75)/t.limit-Number(e.p75)/e.limit)}var at={app_ready:`App ready`,largest_contentful_paint:`Largest paint`,cumulative_layout_shift:`Layout shift`,interaction_latency:`Interaction latency`,route_render:`Route render`,route_module:`Route module`,route_content:`Route content`,long_task:`Main-thread stall`},ot={app_ready:`Reduce startup work and competing requests.`,largest_contentful_paint:`Prioritize the first useful card and its images.`,cumulative_layout_shift:`Reserve dimensions for late content and images.`,interaction_latency:`Trim work inside tap and navigation handlers.`,route_render:`Audit the route’s total data and DOM work.`,route_module:`Split or defer route-only code.`,route_content:`Reduce data waterfalls and render smaller first paint.`,long_task:`Break up synchronous rendering on mobile.`},Y=(e,t)=>t===`score`?Number(e).toFixed(3):`${Math.round(Number(e))} ms`;async function st(e){e.innerHTML=`<div class="card"><div class="card-body muted">Loading real-user performance…</div></div>`;let[{data:t,error:r},i]=await Promise.all([p().rpc(`app_performance_summary`,{days_back:14}),Promise.resolve(p().rpc(`app_reliability_summary`)).catch(()=>({error:!0}))]);if(r){e.innerHTML=`${n(r)}<div class="card note"><div class="card-body">Run <strong>performance_metrics_schema.sql</strong> in Supabase to activate anonymous performance tracking.</div></div>`;return}let a=t||[],o=it(a);e.innerHTML=ct(i.data,i.error)+`<div class="section-head"><div><h2>Real-user performance</h2><p class="muted">Last 14 days · anonymous 25% session sample</p></div></div>
    <section class="perf-health ${o.length?`is-warn`:`is-good`}"><div><small>PERFORMANCE HEALTH</small><strong>${o.length?`${o.length} hotspot${o.length===1?``:`s`}`:`Within target`}</strong></div>${o.length?`<ol>${o.slice(0,5).map(e=>`<li><span><b>${j(e.route)} · ${j(at[e.metric]||e.metric)}</b><small>${j(ot[e.metric]||`Review this route.`)}</small></span><strong>${Y(e.p75,e.unit)}</strong></li>`).join(``)}</ol>`:`<p>No P75 metric is outside the current mobile-friendly target.</p>`}</section>
    <div class="card"><div class="card-body">
      <p class="muted tiny">Measures broad device and network conditions only. No member, team, content, full URL, or persistent browser identity is stored.</p>
      ${a.length?`<div class="table-wrap"><table><thead><tr><th>Measure</th><th>Route</th><th>Samples</th><th>Median</th><th>P75</th><th>P95</th></tr></thead><tbody>${a.map(e=>`<tr><td>${j(at[e.metric]||e.metric)}</td><td>${j(e.route)}</td><td>${Number(e.samples)||0}</td><td>${Y(e.p50,e.unit)}</td><td>${Y(e.p75,e.unit)}</td><td>${Y(e.p95,e.unit)}</td></tr>`).join(``)}</tbody></table></div>`:`<div class="empty">No sampled sessions yet. Data will appear as members use this release.</div>`}
    </div></div>`}function ct(e,t){if(t||!e)return`<section class="card"><div class="card-body"><h2>App reliability</h2><p role="status">Reliability checks are unavailable. Try again.</p></div></section>`;let n=e.issues||[],r=e.wall||{},i=e.sync||{},a=e.leagueHealth,o=a&&Date.now()-Date.parse(a.checkedAt)>(i.mode===`live`||i.mode===`kickoff`?20:150)*6e4;return`<section class="card"><div class="card-body"><h2>App reliability</h2>${a?`<p role="status"><strong>League checks: ${a.ok?`Passed`:`Needs attention`}${o?` · snapshot overdue`:``}</strong> · ${Number(a.rostersChecked)||0}/${Number(a.expectedTeams)||12} rosters · Week ${Number(a.week)||0}</p>${a.issues?.length?`<ul>${a.issues.map(e=>`<li>${j(nt[e]||`League data needs review`)}</li>`).join(``)}</ul>`:``}`:`<p>League checks: waiting for the next sync.</p>`}<p>${i.enabled?`Background sync on`:`Background sync paused`} · ${j(i.mode||`waiting for first run`)}${i.checked_at?` · checked ${j(new Date(i.checked_at).toLocaleString())}`:``}</p>${i.error?`<p role="status">Sync needs attention: ${j(i.error)}</p>`:``}<p>Wall pushes: ${Number(r.delivered)||0} delivered · ${Number(r.pending)||0} queued · ${Number(r.failed)||0} failed</p>${n.length?`<div class="table-wrap"><table><thead><tr><th>Issue</th><th>Route</th><th>Source</th><th>Release</th><th>Sessions</th></tr></thead><tbody>${n.map(e=>`<tr><td>${j(e.kind.replaceAll(`_`,` `))}</td><td>${j(e.route)}</td><td>${j(e.source)}</td><td>${j(e.app_version)}</td><td>${Number(e.samples)||0}</td></tr>`).join(``)}</tbody></table></div>`:`<p>No reported issues in the last 14 days.</p>`}<p class="muted tiny">Technical categories only. No member, message, request URL or error text is collected.</p></div></section>`}var X=e=>e.then(e=>({value:e}),e=>({error:e})),lt=e=>Number(e?.value?.count)||0;function ut(e){let t=Date.parse(e?.last_synced_at||``);return t?Date.now()-t>216e5?{tone:`warn`,label:`Sync is stale`,detail:v(e.last_synced_at)}:{tone:`good`,label:`Sleeper current`,detail:v(e.last_synced_at)}:{tone:`bad`,label:`Never synced`,detail:`Run the current-season sync.`}}function dt(e){let t=e.teams.map(e=>e.teamName).join(` ↔ `)||`Completed trade`,n=e.balanced?`Balanced`:e.winner?`${e.winner} edge`:`Review needed`;return`<article class="ops-trade-row">
    <a href="${j(e.href)}"><small>${e.week?`WEEK ${j(e.week)}`:`TRADE`}</small><strong>${j(t)}</strong><span>${j(n)}</span></a>
    ${e.breakingActive?`<button class="btn ghost small" data-ops-end-trade="${j(e.id)}">End alert</button>`:`<em>Archived</em>`}
  </article>`}function ft(e){return`<article class="ops-trade-row">
    <a href="${j(e.href)}"><small>${j(e.label)}</small><strong>${j(e.title)}</strong><span>${j(e.message||`No supporting text`)}</span></a>
    ${e.breakingActive?`<button class="btn ghost small" data-ops-end-custom="${j(e.rawId)}">End alert</button>`:`<em>Archived</em>`}
  </article>`}async function Z(e){e.innerHTML=`<div class="card"><div class="card-body muted">Checking league operations…</div></div>`;let[t,n,r,i,o,s,c,l]=await Promise.all([X(p().from(`sleeper_config`).select(`last_synced_at,last_sync_note,last_auto_checked_at,last_auto_error,auto_sync_enabled`).eq(`id`,1).maybeSingle()),X(p().from(`sportsbook_markets`).select(`id`,{count:`exact`,head:!0}).in(`status`,[`open`,`locked`])),X(p().rpc(`commissioner_operations_health`)),X(p().rpc(`sleeper_get_sync_schedule`)),X(p().rpc(`app_performance_summary`,{days_back:14})),X(fe({limit:20})),X(Ce({limit:10})),X(re().functions.invoke(`sync-sportsbook-feed`,{body:{action:`status`},headers:u()}))]),d=t.value?.data||{},f=ut(d),m=(s.value||[]).map(de).filter(Boolean),h=m.filter(e=>e.breakingActive),g=c.value||[],_=h.length+g.filter(e=>e.breakingActive).length,y=r.value?.data||{},b=Number(y.push_devices)||0,x=Number(y.push_failures)||0,S=Number(y.member_review)||0,C=Number(y.unsettled_tickets)||0,w=Number(y.expired_push_devices)||0,T=Number(y.missing_profile_images)||0,ee=i.value?.data||{},E=ee.enabled?We(ee.slots||[]):null,D=it(o.value?.data||[]),O=l.value?.data||{},k=O.lastError||l.error?.message||l.value?.error?.message||``,A=Number(O.monthlyEventObjects)||0,M=Number(y.latest_final_week)||0,N=Number(y.settlement_pending)||0,P=[[`Sleeper sync`,f.tone===`good`,f.detail],[`Sportsbook settlement`,!N,N?`${N} completed market${N===1?``:`s`} waiting`:`Caught up`],[`Power rankings`,M>0,M?`Week ${M} finalized`:`Waiting for final scores`],[`Tuesday report`,M>0,M?`Week ${M} receipt available`:`No completed week`],[`Trade import`,!!y.latest_trade_at,y.latest_trade_at?`Latest ${v(y.latest_trade_at)}`:`No completed trade receipt`],[`Schedule dispatcher`,y.cron_last_status===`succeeded`,y.cron_last_run?`${y.cron_last_status||`unknown`} · ${v(y.cron_last_run)}`:`No run recorded`]];e.innerHTML=`<div class="section-head ops-head"><div><h2>League operations</h2><p class="muted">Sync, alerts, notifications and open weekly jobs in one place.</p></div><a class="btn ghost small" href="#/notifications">Notification inbox</a></div>
    <div class="ops-command-bar"><button class="btn" type="button" data-ops-sync-now>↻ Sync Sleeper now</button><span>${E?`Next auto sync ${j(E.toLocaleString([],{weekday:`short`,hour:`numeric`,minute:`2-digit`}))}`:`No automatic sync scheduled`}</span></div>
    <div class="ops-status-grid">
      <a class="ops-status is-${f.tone}" href="#/admin"><small>LEAGUE DATA</small><strong>${j(f.label)}</strong><span>${j(f.detail)}</span></a>
      <a class="ops-status ${d.last_auto_error?`is-bad`:`is-good`}" href="#/admin"><small>AUTO SYNC</small><strong>${d.auto_sync_enabled?`Enabled`:`Paused`}</strong><span>${j(d.last_auto_error||(d.last_auto_checked_at?`Checked ${v(d.last_auto_checked_at)}`:`No check recorded`))}</span></a>
      <a class="ops-status ${x?`is-warn`:`is-good`}" href="#/notifications"><small>PUSH HEALTH</small><strong>${b}</strong><span>${x?`${x} delivery failures recorded`:`Enabled devices healthy`}</span></a>
      <a class="ops-status ${C||k?`is-warn`:`is-good`}" href="#/sportsbook"><small>SPORTSBOOK</small><strong>${C}</strong><span>${lt(n)} active markets · ${A} API objects this month</span></a>
      <a class="ops-status ${S?`is-warn`:`is-good`}" href="#/admin"><small>MEMBER REVIEW</small><strong>${S}</strong><span>Inactive or unlinked profiles</span></a>
      <a class="ops-status ${D.length?`is-warn`:`is-good`}" href="#/admin" data-open-performance><small>PERFORMANCE</small><strong>${D.length}</strong><span>${D.length?`Real-user hotspots`:`Within current targets`}</span></a>
    </div>
    <details class="ops-diagnostics"><summary>Diagnostics <span>${w+T?`${w+T} items`:`all clear`}</span></summary>
      <div><p><small>EXPIRED PUSH ENDPOINTS</small><strong>${w}</strong><span>Automatically replaced when an opted-in device returns.</span></p>
      <p><small>MISSING PROFILE IMAGES</small><strong>${T}</strong><span>Active members using the fallback mark.</span></p>
      <p><small>LAST PUSH DELIVERY</small><strong>${y.last_push_success?j(v(y.last_push_success)):`No success recorded`}</strong><span>${x?`${x} active delivery failures`:`Current endpoints are clean`}</span></p>
      <p><small>OLDEST OPEN TICKET</small><strong>${y.oldest_open_ticket?j(v(y.oldest_open_ticket)):`None`}</strong><span>${C} tickets awaiting settlement.</span></p>
      <p><small>ODDS FEED</small><strong>${O.lastSuccessAt?j(v(O.lastSuccessAt)):`No sync recorded`}</strong><span>${k?j(k):`${Number(O.activeMarkets)||0} cached markets · ${A} billed event objects this month`}</span></p></div>
    </details>
    <div class="section-head"><div><h2>Weekly automation</h2><p class="muted">One timeline for the jobs that move the league into its next week.</p></div><span class="pill ${P.every(e=>e[1])?`green`:`grey`}">${P.filter(e=>e[1]).length}/${P.length}</span></div>
    <section class="ops-automation-line">${P.map(([e,t,n])=>`<article class="${t?`is-good`:`is-warn`}"><i></i><div><strong>${j(e)}</strong><span>${j(n)}</span></div></article>`).join(``)}</section>
    <div class="section-head"><div><h2>Custom breaking alert</h2><p class="muted">Launch your own league-wide banner using the same breaking treatment.</p></div><span class="pill ${_?`red`:`grey`}">${_} active</span></div>
    <form class="ops-alert-compose" data-ops-alert-form>
      <div><label for="ops-alert-label">Label</label><input id="ops-alert-label" maxlength="28" value="LEAGUE ALERT" placeholder="BREAKING"></div>
      <div class="ops-alert-wide"><label for="ops-alert-title">Headline</label><input id="ops-alert-title" maxlength="120" required placeholder="Your headline"></div>
      <div class="ops-alert-wide"><label for="ops-alert-message">Supporting text</label><textarea id="ops-alert-message" maxlength="240" rows="2" placeholder="Add the detail everyone should see"></textarea></div>
      <div><label for="ops-alert-target">Opens</label><select id="ops-alert-target"><option value="#/home">Home</option><option value="#/trade">Trade Analyzer</option><option value="#/facts">Facts</option><option value="#/fees">Fees</option><option value="#/polls">Polls</option><option value="#/notifications">Notifications</option></select></div>
      <label class="checkrow ops-alert-phone"><input type="checkbox" data-ops-alert-phone checked><span><strong>Send phone notification</strong><br><small class="muted">Uses each member's announcement preference.</small></span></label>
      <div class="row-end ops-alert-action"><button class="btn" type="submit">Launch alert</button></div>
    </form>
    ${g.length?`<div class="ops-trade-list">${g.map(ft).join(``)}</div>`:``}
    <div class="section-head"><div><h2>Breaking trade desk</h2><p class="muted">Completed trade coverage stays live until a commissioner ends it.</p></div></div>
    <div class="ops-trade-list">${m.length?m.map(dt).join(``):`<div class="empty">No completed trade receipts yet.</div>`}</div>
    <div class="section-head"><div><h2>Release health</h2><p class="muted">Real-user speed data remains under Performance; this desk is the fast operational check.</p></div><a class="btn ghost small" href="#/admin" data-open-performance>View performance</a></div>`,e.querySelectorAll(`[data-ops-end-trade]`).forEach(t=>t.addEventListener(`click`,async()=>{if(confirm(`End the breaking banner for this trade? The receipt will remain in Trade Analyzer.`)){t.disabled=!0;try{await ue(t.dataset.opsEndTrade),a(`Breaking coverage ended`),await Z(e)}catch(e){t.disabled=!1,a(e.message||`Could not end coverage`,!0)}}})),e.querySelector(`[data-ops-sync-now]`)?.addEventListener(`click`,async t=>{let n=t.currentTarget;n.disabled=!0,n.textContent=`Syncing…`;try{let{counts:t}=await te();a(`Sleeper synced · ${t.rosters} rosters`),window.dispatchEvent(new CustomEvent(`dfl:quick-sync-complete`,{detail:{counts:t}})),await Z(e)}catch(e){n.disabled=!1,n.textContent=`↻ Sync Sleeper now`,a(e.message||`Sync failed`,!0)}}),e.querySelectorAll(`[data-ops-end-custom]`).forEach(t=>t.addEventListener(`click`,async()=>{if(confirm(`End this custom breaking alert?`)){t.disabled=!0;try{await we(t.dataset.opsEndCustom),a(`Custom alert ended`),await Z(e)}catch(e){t.disabled=!1,a(e.message||`Could not end custom alert`,!0)}}})),e.querySelector(`[data-ops-alert-form]`)?.addEventListener(`submit`,async t=>{t.preventDefault();let n=t.currentTarget,r=n.querySelector(`button[type="submit"]`);r.disabled=!0,r.textContent=`Launching…`;try{let t=await Te({label:n.querySelector(`#ops-alert-label`).value,title:n.querySelector(`#ops-alert-title`).value,message:n.querySelector(`#ops-alert-message`).value,targetUrl:n.querySelector(`#ops-alert-target`).value,sendPhone:n.querySelector(`[data-ops-alert-phone]`).checked});a(t.notificationError?`Banner launched · phone notification failed`:`Breaking alert launched`,!!t.notificationError),await Z(e)}catch(e){r.disabled=!1,r.textContent=`Launch alert`,a(e.message||`Could not launch custom alert`,!0)}}),e.querySelector(`[data-open-performance]`)?.addEventListener(`click`,e=>{e.preventDefault(),document.querySelector(`#admin-tabs [data-section="performance"]`)?.click()})}var pt=[{id:`members`,tab:`Members`,table:`members`,permission:`members`},{id:`rule_categories`,tab:`Rule tabs`,table:`rule_categories`,permission:`rules`}],mt=[{id:`operations`,tab:`Operations`,permission:`sleeper`,render:Z},{id:`finances`,tab:`Fees`,permission:`fees`,render:Qe},{id:`keepers`,tab:`Keeper rules`,permission:`keepers`,render:$e},{id:`sleeper`,tab:`Sleeper`,permission:`sleeper`,render:H},{id:`performance`,tab:`Performance`,permission:`sleeper`,render:st},{id:`broadcast`,tab:`Broadcast`,permission:`broadcast`,render:z},{id:`notifications`,tab:`Notifications`,permission:`broadcast`,render:tt},{id:`commissioners`,tab:`Commissioner Access`,ownerOnly:!0,render:Be}],Q=`operations`,ht=typeof CSS<`u`&&typeof CSS.supports==`function`&&CSS.supports(`-webkit-text-security`,`disc`);function gt(e,t,n=`dfl-admin-key`,r=!1){let i=`id="${e}" required
    ${t?`placeholder="${j(t)}"`:``}
    ${r?`inputmode="numeric" pattern="[0-9]*"`:``}
    autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
    data-form-type="other" data-lpignore="true" data-1p-ignore data-bwignore
    data-protonpass-ignore="true"`;return`<div class="pwwrap">
    ${ht?`<input type="text" class="masked" name="${n}" ${i}>`:`<input type="password" name="${n}" ${i}>`}
    <button type="button" class="pweye" data-eye="${e}" aria-label="Show password">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path class="eye-open" d="M1.8 12S5.4 5.4 12 5.4 22.2 12 22.2 12 18.6 18.6 12 18.6 1.8 12 1.8 12z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        <circle class="eye-open" cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" stroke-width="1.7"/>
        <path class="eye-slash hidden" d="M3.5 3.5l17 17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>
    </button>
  </div>`}function _t(e){e.querySelectorAll(`button[data-eye]`).forEach(t=>{let n=e.querySelector(`#`+t.dataset.eye);n&&t.addEventListener(`click`,()=>{let e=ht?n.classList.contains(`masked`):n.type===`password`;ht?n.classList.toggle(`masked`,!e):n.type=e?`text`:`password`,t.classList.toggle(`on`,e),t.querySelector(`.eye-slash`)?.classList.toggle(`hidden`,!e),t.setAttribute(`aria-label`,e?`Hide password`:`Show password`),n.focus()})})}function vt(e){return T()?!0:e.ownerOnly?x():i(e.permission)}async function $(e){if(!c){e.innerHTML=`<h1>Admin</h1><div class="card"><div class="card-body">Add your Supabase keys in js/config.js first.</div></div>`;return}if(!s()){yt(e);return}let t=[...pt,...mt].filter(vt);t.some(e=>e.id===Q)||(Q=t[0]?.id||``);let n=S(),r=T()?`Master admin`:`${n?.display_name||`Commissioner`}${x()?` · Owner`:``}`;e.innerHTML=`
    <div class="section-head" style="margin-top:0">
      <div><h1 style="margin:0">Admin</h1><div class="muted tiny">${j(r)}</div></div>
      <button class="btn ghost small" id="logout">Sign out</button>
    </div>

    ${t.length?`<div class="tabs" id="admin-tabs">
      ${t.map(e=>`<button data-section="${e.id}" class="${e.id===Q?`on`:``}">${j(e.tab)}</button>`).join(``)}
    </div><div id="admin-body"></div>`:`<div class="card note"><div class="card-body">Your commissioner account is active, but no Admin-screen tools have been assigned. Your permitted inline editing tools are still available on their normal pages.</div></div>`}

    ${T()?`<div class="section-head"><h2>Master password</h2></div>
    <form class="card" id="pw-form">
      <label for="new-pw">New master admin password</label>
      ${gt(`new-pw`,`at least 6 characters`)}
      <div class="row-end"><button class="btn ghost" type="submit">Change password</button></div>
    </form>`:``}
  `;let i=e.querySelector(`#admin-body`),o=()=>{if(!i)return;let e=mt.find(e=>e.id===Q&&vt(e));if(e)return e.render(i);let t=pt.find(e=>e.id===Q&&vt(e)),n=t&&C(t.table);if(!n){i.innerHTML=``;return}return L(i,n)};e.querySelector(`#admin-tabs`)?.addEventListener(`click`,t=>{let n=t.target.closest(`button[data-section]`);n&&(Q=n.dataset.section,e.querySelectorAll(`#admin-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.section===Q)),o())}),e.querySelector(`#logout`).addEventListener(`click`,()=>{h(),a(`Signed out of commissioner access`),$(e)}),_t(e),e.querySelector(`#pw-form`)?.addEventListener(`submit`,async t=>{t.preventDefault();let n=e.querySelector(`#new-pw`);try{await _(n.value),n.value=``,a(`Master password changed`)}catch(e){a(e.message||`Could not change password`,!0)}}),o()}function yt(e){let t=S();e.innerHTML=`
    <h1>Admin</h1>
    ${t?`<form class="card" id="commissioner-login-form">
      <div class="card-title">Commissioner access</div>
      <p class="muted">Signed in as <strong>${j(t.display_name)}</strong>. Enter your personal commissioner PIN.</p>
      <label for="commissioner-login-pin">Commissioner PIN</label>
      ${gt(`commissioner-login-pin`,``,`dfl-commissioner-pin`,!0)}
      <div class="row-end"><button class="btn" type="submit">Enter commissioner mode</button></div>
    </form>`:`<div class="card note"><div class="card-body">Pick your league member first to use a personal commissioner PIN.</div></div>`}

    <div class="section-head"><h2>Master access</h2></div>
    <form class="card" id="login-form">
      <p class="muted">Owner fallback. This is the original shared master password.</p>
      <label for="pw">Master admin password</label>
      ${gt(`pw`,``)}
      <div class="row-end"><button class="btn ghost" type="submit">Sign in as master</button></div>
    </form>`,_t(e),e.querySelector(`#commissioner-login-form`)?.addEventListener(`submit`,async t=>{t.preventDefault();let n=t.target.querySelector(`button[type=submit]`);n.disabled=!0;try{await o(e.querySelector(`#commissioner-login-pin`).value)?(a(`Commissioner access unlocked`),$(e)):(a(`Wrong commissioner PIN or access is disabled`,!0),n.disabled=!1)}catch(e){a(e.message||`Commissioner sign in failed`,!0),n.disabled=!1}}),e.querySelector(`#login-form`).addEventListener(`submit`,async t=>{t.preventDefault();let n=t.target.querySelector(`button[type=submit]`);n.disabled=!0;try{await A(e.querySelector(`#pw`).value)?(a(`Master admin unlocked`),$(e)):(a(`Wrong master password`,!0),n.disabled=!1)}catch(e){a(e.message||`Sign in failed`,!0),n.disabled=!1}})}export{$ as render};