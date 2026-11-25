import{$n as e,B as t,Gn as n,Gt as r,H as i,Hn as a,Ir as o,Jn as s,Jt as c,Kn as l,Lr as u,M as d,Rn as f,Rr as p,U as m,Un as h,Ur as g,V as _,Vn as v,Vr as y,Wn as b,Wr as x,Xn as S,Yn as C,Zn as w,c as ee,ir as T,it as E,j as te,nr as D,nt as O,ot as k,qn as A,qr as j,tt as M,ut as N,z as P,zn as F,zr as ne}from"../app-core-DJ1rYCZP.js";import{Ar as re,Fr as ie,Ir as ae,Nr as oe,Wt as se,Z as ce,_r as I,jr as le,kr as ue,q as de,rt as fe,tt as pe,vr as me,yr as he}from"../home-core-BZBvVLYy.js";import{f as ge,n as _e,o as ve,p as ye,r as be,s as xe,t as Se}from"../keeper-rules-iB5MCYxx.js";import{a as Ce,t as we}from"../notification-core-CqJqgpYn.js";import{t as Te}from"../sync-CJf_2xF7.js";async function L(e,r){e.innerHTML=g();let a;try{a=await D(r.table,{order:r.order||`created_at`,asc:!!r.asc}),await t(r.fields)}catch(t){e.innerHTML=u(t);return}let o=null;e.innerHTML=`
    <details class="crud-add" id="crud-box">
      <summary id="crud-heading">Add ${p(r.singular)}</summary>
      <form class="card" id="crud-form">
        ${P(r.fields,`f_`)}
        <div class="row-end">
          <button type="button" class="btn ghost hidden" id="crud-cancel">Cancel</button>
          <button type="submit" class="btn" id="crud-save">Save</button>
        </div>
      </form>
    </details>
    <div id="crud-list">${Ee(a,r)}</div>
  `;let c=e.querySelector(`#crud-form`),l=e.querySelector(`#crud-heading`),d=e.querySelector(`#crud-cancel`),f=e.querySelector(`#crud-box`);function m(){o=null,c.reset(),r.fields.forEach(e=>{e.default!==void 0&&i(c,e,e.default)}),l.textContent=`Add ${r.singular}`,d.classList.add(`hidden`),f&&(f.open=!1)}m(),c.addEventListener(`submit`,async t=>{t.preventDefault();let n=e.querySelector(`#crud-save`);n.disabled=!0;try{let t=_(c,r.fields);o?await T(r.table,o,t):await s(r.table,t),j(o?`Saved`:`Added`),L(e,r)}catch(e){j(e.message||`Save failed`,!0),n.disabled=!1}}),d.addEventListener(`click`,m),e.querySelector(`#crud-list`).addEventListener(`click`,async t=>{let s=t.target.closest(`button[data-edit]`),u=t.target.closest(`button[data-del]`);if(s){let e=a.find(e=>String(e.id)===s.dataset.edit);if(!e)return;o=e.id,r.fields.forEach(t=>i(c,t,e[t.name])),l.textContent=`Edit ${r.singular}`,d.classList.remove(`hidden`),f&&(f.open=!0),c.scrollIntoView({behavior:`smooth`,block:`start`});return}if(u){let t=a.find(e=>String(e.id)===u.dataset.del);if(!t||!confirm(`Delete "${r.label(t)}"? This cannot be undone.`))return;try{await n(r.table,t.id),j(`Deleted`),L(e,r)}catch(e){j(e.message||`Delete failed`,!0)}}})}function Ee(e,t){return e.length?e.map(e=>`
    <div class="card">
      <div class="card-title">${p(t.label(e))}</div>
      ${t.sub?`<div class="card-meta" style="margin:0">${p(t.sub(e))}</div>`:``}
      <div class="row-end">
        <button class="btn ghost small" data-edit="${e.id}">Edit</button>
        <button class="btn danger small" data-del="${e.id}">Delete</button>
      </div>
    </div>`).join(``):o(`No ${t.plural} yet.`)}var De=/target_broadcast|target_hall|hall_status|hall_year|people_label|schema cache|does not exist/i;function Oe(){if(document.getElementById(`dfl-broadcast-inbox-style`))return;let e=document.createElement(`style`);e.id=`dfl-broadcast-inbox-style`,e.textContent=`
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
`,document.head.appendChild(e)}async function ke(){let e=await b().from(`broadcast_submissions`).select(`id,member_id,image,caption,status,target_broadcast,target_hall,hall_status,hall_year,people_label,created_at,members(display_name)`).or(`and(target_broadcast.eq.true,status.eq.pending),and(target_hall.eq.true,hall_status.eq.pending)`).order(`created_at`,{ascending:!0});if(!e.error)return{rows:e.data||[],modern:!0};if(!De.test(e.error.message||``))throw e.error;let t=await b().from(`broadcast_submissions`).select(`id,member_id,image,caption,status,created_at,members(display_name)`).eq(`status`,`pending`).order(`created_at`,{ascending:!0});if(t.error)throw t.error;return{rows:t.data||[],modern:!1}}function Ae(e,t){return t===`broadcast`?`<div class="bx-review-block">
    <div class="bx-review-head">Broadcast review</div>
    <div class="bx-review-actions">
      <label class="tiny">On screen <select data-dwell>${[3,5,8,10,12,15].map(e=>`<option value="${e}"${e===8?` selected`:``}>${e}s</option>`).join(``)}</select></label>
      <span class="row-end"><button class="btn ghost small danger" data-reject-broadcast="${e.id}">Reject</button><button class="btn small" data-approve-broadcast="${e.id}">Approve</button></span>
    </div></div>`:`<div class="bx-review-block">
    <div class="bx-review-head">Hall of Fame review</div>
    <div class="bx-review-actions"><span class="muted tiny">Permanent league gallery${e.hall_year?` · ${p(e.hall_year)}`:``}</span>
      <span class="row-end"><button class="btn ghost small danger" data-reject-hall="${e.id}">Reject</button><button class="btn small" data-approve-hall="${e.id}">Approve</button></span>
    </div></div>`}async function je(){Oe();let e;try{e=await ke()}catch(e){return/broadcast_submissions|schema cache|does not exist/i.test(e?.message||``)?``:`<div class="muted">${p(e?.message||`Could not load submissions`)}</div>`}let{rows:t,modern:n}=e;return`<section class="block" data-broadcast-inbox data-modern="${n?`1`:`0`}">
    <h2 class="section-title">Photo Submission Inbox <span class="muted tiny">${t.length} pending</span></h2>
    <div class="broadcast-inbox">${t.length?t.map(e=>`
      <article class="card bx-submit">
        <img src="${p(e.image)}" alt="Submitted by ${p(e.members?.display_name||`member`)}">
        <div class="card-body">
          <div><strong>${p(e.members?.display_name||`Member`)}</strong>${n?`<div class="bx-targets">${e.target_broadcast?`<span class="bx-target">Broadcast</span>`:``}${e.target_hall?`<span class="bx-target">Hall of Fame</span>`:``}</div>`:``}</div>
          ${e.caption?`<p>${p(e.caption)}</p>`:``}
          ${n&&e.people_label?`<span class="muted tiny">In the photo: ${p(e.people_label)}</span>`:``}
          ${n?`${e.target_broadcast&&e.status===`pending`?Ae(e,`broadcast`):``}${e.target_hall&&e.hall_status===`pending`?Ae(e,`hall`):``}`:`<div class="row-between"><label class="tiny">On screen <select data-dwell>${[3,5,8,10,12,15].map(e=>`<option value="${e}"${e===8?` selected`:``}>${e}s</option>`).join(``)}</select></label><span><button class="btn ghost small danger" data-reject-broadcast="${e.id}">Reject</button> <button class="btn small" data-approve-broadcast="${e.id}">Approve</button></span></div>`}
        </div>
      </article>`).join(``):`<div class="card"><div class="card-body muted">Inbox clear.</div></div>`}</div>
  </section>`}function R(e,t){e.closest(`.bx-submit`)?.querySelectorAll(`button,select`).forEach(e=>e.disabled=t)}function Me(e,t){e.querySelectorAll(`[data-approve-broadcast]`).forEach(e=>e.addEventListener(`click`,async()=>{let n=e.closest(`.bx-submit`),r=Number(n.querySelector(`[data-dwell]`)?.value)||8;R(e,!0);let{error:i}=await b().rpc(`approve_broadcast_submission`,{p_id:Number(e.dataset.approveBroadcast),p_dwell_seconds:r});if(i)return R(e,!1),j(i.message,!0);j(`Approved for Broadcast`),t?.()})),e.querySelectorAll(`[data-reject-broadcast]`).forEach(e=>e.addEventListener(`click`,async()=>{R(e,!0);let{error:n}=await b().from(`broadcast_submissions`).update({status:`rejected`,reviewed_at:new Date().toISOString()}).eq(`id`,Number(e.dataset.rejectBroadcast));if(n)return R(e,!1),j(n.message,!0);j(`Broadcast submission rejected`),t?.()})),e.querySelectorAll(`[data-approve-hall]`).forEach(e=>e.addEventListener(`click`,async()=>{R(e,!0);let{error:n}=await b().rpc(`approve_hall_submission`,{p_id:Number(e.dataset.approveHall)});if(n)return R(e,!1),j(n.message,!0);j(`Added to the Hall of Fame`),t?.()})),e.querySelectorAll(`[data-reject-hall]`).forEach(e=>e.addEventListener(`click`,async()=>{R(e,!0);let{error:n}=await b().from(`broadcast_submissions`).update({hall_status:`rejected`,hall_reviewed_at:new Date().toISOString()}).eq(`id`,Number(e.dataset.rejectHall));if(n)return R(e,!1),j(n.message,!0);j(`Hall of Fame submission rejected`),t?.()}))}N();function Ne(e){return`<div class="row-end" style="margin-bottom:10px">
    <span class="muted tiny" data-bx-refreshed></span>
    <button type="button" class="btn ghost small" data-bx-refresh>${p(e)}</button>
  </div>`}async function z(e){await te(),e.innerHTML=`
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
    </section>`;let t=e.querySelector(`[data-broadcast-inbox-slot]`);t&&(t.innerHTML=await je(),Me(t,()=>z(e))),await Fe(e.querySelector(`[data-bx-rows]`)),L(e.querySelector(`[data-bx-manager]`),m(`broadcast_items`)),await B(e.querySelector(`[data-bx-switches]`)),Pe(e,()=>z(e))}function Pe(e,t){let n=e.querySelector(`[data-bx-refresh]`);n&&n.addEventListener(`click`,async()=>{let r=n.textContent;n.disabled=!0,n.textContent=`Refreshing…`;try{se(),await t();let n=e.querySelector(`[data-bx-refreshed]`);n&&(n.textContent=`Read at ${new Date().toLocaleTimeString()}`),j(`Refreshed`)}catch(e){n.disabled=!1,n.textContent=r,j(e.message||`Could not refresh`,!0)}})}async function Fe(e){if(!e)return;let{data:t,error:n}=await b().from(`broadcast_items`).select(`${ce},active`).order(`sort_order`,{ascending:!0}).order(`created_at`,{ascending:!0});if(n?.code===`42703`&&({data:t,error:n}=await b().from(`broadcast_items`).select(`${ce.replace(`,image_zoom`,``)},active`).order(`sort_order`,{ascending:!0}).order(`created_at`,{ascending:!0})),n){e.innerHTML=u(n);return}let r=t||[];if(!r.length){e.innerHTML=`<div class="state"><span class="state-title">No slides yet</span>
      <span>Add one below and it will appear here in running order.</span></div>`;return}e.innerHTML=`
    <div class="card">
      <div class="card-body">The order hand-written slides play in. Automatic
      slides are ranked by what is happening and are not listed here.</div>
      <ol class="bxorder">${r.map(Ie).join(``)}</ol>
    </div>
    <div class="bxpreview-wrap">
      <span class="u-label">Preview</span>
      <div class="bx-stage bxpreview" data-bx-preview></div>
    </div>`,Le(e,r[0]),e.addEventListener(`click`,t=>Re(t,e,r))}function Ie(e,t){let n=[e.treatment];return e.background&&e.background!=="default"&&n.push(e.background),n.push(e.dwell_seconds?`${e.dwell_seconds}s`:`auto`),e.featured&&n.push(`featured`),e.active||n.push(`OFF`),`
    <li class="bxrow${e.active?``:` is-off`}" data-bx-row="${e.id}">
      <button type="button" class="bxrow-main" data-bx-preview-id="${e.id}">
        <strong>${p(e.headline||e.kicker||`Untitled slide`)}</strong>
        <span class="muted">${p(n.join(` · `))}</span>
      </button>
      <span class="bxrow-moves">
        <button type="button" class="btn ghost small" data-bx-move="up" data-id="${e.id}"
          aria-label="Move ${p(e.headline||`slide`)} earlier">↑</button>
        <button type="button" class="btn ghost small" data-bx-move="down" data-id="${e.id}"
          aria-label="Move ${p(e.headline||`slide`)} later">↓</button>
      </span>
    </li>`}function Le(e,t){let n=e.querySelector(`[data-bx-preview]`);!n||!t||(n.innerHTML=de(fe(t)),n.querySelector(`.bx-slide`)?.classList.add(`bx-in`),n.classList.toggle(`bx-on-light`,(t.background||``)===`light`))}async function Re(e,t,n){let r=e.target.closest(`[data-bx-preview-id]`);if(r){Le(t,n.find(e=>String(e.id)===r.dataset.bxPreviewId)),t.querySelectorAll(`.bxrow`).forEach(e=>e.classList.toggle(`on`,e.dataset.bxRow===r.dataset.bxPreviewId));return}let i=e.target.closest(`[data-bx-move]`);if(!i)return;let a=i.dataset.id,o=n.findIndex(e=>String(e.id)===a),s=i.dataset.bxMove===`up`?o-1:o+1;if(o<0||s<0||s>=n.length)return;t.querySelectorAll(`[data-bx-move]`).forEach(e=>e.disabled=!0);let c=n[o],l=n[s],[u,d]=await Promise.all([b().from(`broadcast_items`).update({sort_order:s}).eq(`id`,c.id),b().from(`broadcast_items`).update({sort_order:o}).eq(`id`,l.id)]);(u.error||d.error)&&j((u.error||d.error).message||`Could not reorder`,!0),await Fe(t)}async function B(e){if(!e)return;await O();let t=M(),n=await pe(),r=(e,t,n,r)=>`
    <label class="ov-field"><span>${p(e)}</span>
      <select data-ov="${p(t)}" data-field="${p(e.toLowerCase())}">
        ${r.map(e=>`<option value="${p(e.v)}"${String(n||``)===e.v?` selected`:``}>${p(e.l)}</option>`).join(``)}
      </select></label>`,i=[...I.keys()].map((e,t)=>({id:e,i:t,standing:me(e,n.get(e))})).sort((e,t)=>t.standing-e.standing||e.i-t.i);e.innerHTML=i.map(({id:e,standing:a},o)=>{let[s,c]=I.get(e),l=n.get(e)||{},u=l.treatment||l.background||l.image||l.dwell_seconds||l.featured||l.weight;return`
    <div class="srcrow">
      <label class="switchrow">
        <input type="checkbox" data-gen="${p(e)}" ${t.has(e)?``:`checked`}>
        <span class="switch-text">
          <strong>${p(s)}</strong>
          <span class="muted">${p(c)}</span>
        </span>
      </label>
      <div class="srcmove">
        <button type="button" class="btn ghost small" data-gen-up="${p(e)}"
          ${o===0?`disabled`:``} aria-label="Move ${p(s)} earlier">↑</button>
        <button type="button" class="btn ghost small" data-gen-down="${p(e)}"
          ${o===i.length-1?`disabled`:``} aria-label="Move ${p(s)} later">↓</button>
        ${l.featured?`<span class="muted tiny">featured</span>`:l.weight?`<span class="muted tiny">moved</span>`:``}
      </div>
      <details class="ovbox"${u?` open`:``}>
        <summary>Look${u?` · customised`:``}</summary>
        <div class="ovgrid" data-ov-form="${p(e)}">
          ${r(`Treatment`,e,l.treatment,[{v:``,l:`Automatic (whatever suits the data)`},{v:`scoreboard`,l:`Scoreboard (needs two sides)`},{v:`champion`,l:`Champion`},{v:`stat`,l:`Stat`},{v:`announcement`,l:`Announcement`},{v:`event`,l:`Event`},{v:`hero`,l:`Hero`}])}
          ${r(`Background`,e,l.background,[{v:``,l:`Automatic (house look)`},{v:`default`,l:`DFL house`},{v:`dark`,l:`Dark`},{v:`light`,l:`Light`},{v:`image`,l:`Image`},{v:`logo`,l:`Crest`}])}
          <label class="ov-field"><span>Background picture</span>
            ${k({id:`ov-image-${e}`,name:`ov-image-${e}`,value:l.image||``,preset:`backdrop`,attrs:`data-ov="${p(e)}" data-field="image"`})}</label>
          <label class="ov-field"><span>Seconds</span>
            <input type="number" min="3" max="15" data-ov="${p(e)}" data-field="dwell_seconds" value="${p(l.dwell_seconds??``)}" placeholder="auto"></label>
          <label class="ov-field ov-check">
            <input type="checkbox" data-ov="${p(e)}" data-field="featured" ${l.featured?`checked`:``}>
            <span>Feature it</span></label>
          <div class="row-end">
            <button type="button" class="btn ghost small" data-ov-save="${p(e)}">Save look</button>
            <button type="button" class="btn ghost small" data-ov-clear="${p(e)}">Reset</button>
          </div>
        </div>
      </details>
    </div>`}).join(``),e.dataset.wired!==`1`&&(e.dataset.wired=`1`,e.addEventListener(`click`,async t=>{let n=t.target.closest(`[data-gen-up],[data-gen-down]`);if(n){let t=n.hasAttribute(`data-gen-up`),r=t?n.dataset.genUp:n.dataset.genDown,i=await pe(),a=[...I.keys()].map((e,t)=>({gid:e,i:t,standing:me(e,i.get(e))})).sort((e,t)=>t.standing-e.standing||e.i-t.i),o=a.findIndex(e=>e.gid===r),s=a[t?o-1:o+1];if(!s)return;n.disabled=!0;try{let n=he(r,s.standing,{above:t}),{error:i}=await b().from(`broadcast_overrides`).upsert({generator:r,weight:n,updated_at:new Date().toISOString()},{onConflict:`generator`});if(i)throw i;await B(e)}catch(e){n.disabled=!1,j(e?.message||`Could not move that`,!0)}return}let r=t.target.closest(`[data-ov-save]`),i=t.target.closest(`[data-ov-clear]`);if(!r&&!i)return;let a=(r||i).dataset.ovSave||(r||i).dataset.ovClear,o=e.querySelector(`[data-ov-form="${CSS.escape(a)}"]`);try{if(i){let{error:e}=await b().from(`broadcast_overrides`).delete().eq(`generator`,a);if(e)throw e;j(`Back to automatic`)}else{let e=e=>o.querySelector(`[data-field="${e}"]`),t=Number(e(`dwell_seconds`).value),n={generator:a,treatment:e(`treatment`).value||null,background:e(`background`).value||null,image:e(`image`).value.trim()||null,dwell_seconds:Number.isFinite(t)&&t>0?Math.min(15,Math.max(3,Math.round(t))):null,featured:e(`featured`).checked,updated_at:new Date().toISOString()},{error:r}=await b().from(`broadcast_overrides`).upsert(n,{onConflict:`generator`});if(r)throw r;j(`Look saved`)}await B(e)}catch(e){j(e.message||`Could not save that look`,!0)}}),e.addEventListener(`change`,async e=>{let t=e.target.closest(`[data-gen]`);if(!t)return;let n=t.dataset.gen;t.disabled=!0;try{await E(n,!t.checked),j(`${I.get(n)?.[0]||n} ${t.checked?`on`:`off`}`)}catch(e){t.checked=!t.checked,j(e.message||`Could not save that`,!0)}t.disabled=!1}))}var ze=[[`announcements`,`Announcements`],[`calendar`,`Calendar`],[`polls`,`Polls`],[`keepers`,`Keepers`],[`golf`,`Golf`],[`sportsbook`,`Sportsbook`],[`broadcast`,`Broadcast / Stage`],[`fees`,`Fees`],[`history`,`History / Facts`],[`rules`,`Rules`],[`members`,`Members`],[`sleeper`,`Sleeper Sync`]];async function Be(e){e.innerHTML=`<div class="card"><div class="card-body">Loading commissioner access…</div></div>`;let t=[];try{let{data:e,error:n}=await b().from(`members`).select(`id,display_name,team_name,active`).eq(`active`,!0).order(`sort_order`,{ascending:!0}).order(`display_name`,{ascending:!0});if(n)throw n;t=e||[]}catch(t){e.innerHTML=`<div class="card note"><div class="card-body">${p(t.message||`Could not load members`)}</div></div>`;return}if(!t.length){e.innerHTML=`<div class="card"><div class="card-body">Add league members before assigning commissioner access.</div></div>`;return}let n=!0,r=[],i=await b().rpc(`list_commissioner_access`);i.error?n=!1:r=i.data||[];let a=new Map(r.map(e=>[String(e.member_id),{member_id:Number(e.member_id),is_owner:!!e.is_owner,active:!!e.active,permissions:Array.isArray(e.permissions)?e.permissions:[]}]));e.innerHTML=`
    <div class="section-head"><h2>Commissioner Access</h2></div>
    <div class="card note"><div class="card-body">Give a league member their own commissioner PIN and only the tools they should control. Select a member to review and adjust what they already have.</div></div>
    ${n?``:`<div class="card note"><div class="card-body">Current assignments cannot be loaded until <strong>commissioner_access_editor_schema.sql</strong> is run in Supabase. You can still replace access by entering a new PIN.</div></div>`}
    <form class="card" id="commissioner-form">
      <label for="commissioner-member">League member</label>
      <select id="commissioner-member" required>${t.map(e=>`<option value="${p(e.id)}">${p(e.display_name||e.team_name||`Member ${e.id}`)}</option>`).join(``)}</select>
      <p class="muted" id="commissioner-current" aria-live="polite"></p>
      <label for="commissioner-pin">Commissioner PIN</label>
      <input id="commissioner-pin" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" autocomplete="new-password" placeholder="At least 4 digits">
      <p class="muted" id="commissioner-pin-help"></p>
      <label class="checkrow"><input type="checkbox" id="commissioner-owner"> <span><strong>Owner</strong><br><small class="muted">Full access, including managing commissioners.</small></span></label>
      <div class="section-head"><h3>Permissions</h3></div>
      <div class="checklist" id="commissioner-perms">${ze.map(([e,t])=>`<label class="checkrow"><input type="checkbox" value="${p(e)}"> <span>${p(t)}</span></label>`).join(``)}</div>
      <div class="row-end"><button type="button" class="btn danger ghost" id="commissioner-disable">Disable access</button><button type="submit" class="btn">Save changes</button></div>
    </form>

    <div class="card">
      <div class="card-title">Profile PIN rescue</div>
      <p class="muted tiny">If a member forgets their optional Profile PIN, you can remove the lock. The old PIN is never shown.</p>
      <div class="row-end"><button type="button" class="btn ghost" id="profile-pin-reset">Reset selected member's Profile PIN</button></div>
    </div>`;let o=e.querySelector(`#commissioner-form`),s=e.querySelector(`#commissioner-member`),c=e.querySelector(`#commissioner-pin`),l=e.querySelector(`#commissioner-pin-help`),u=e.querySelector(`#commissioner-current`),d=e.querySelector(`#commissioner-owner`),f=e.querySelector(`#commissioner-disable`),m=[...e.querySelectorAll(`#commissioner-perms input[type=checkbox]`)],h=()=>a.get(String(s.value)),g=()=>{m.forEach(e=>{e.disabled=d.checked})},_=()=>{let e=h(),t=new Set(e?.permissions||[]);c.value=``,d.checked=!!e?.is_owner,m.forEach(e=>{e.checked=t.has(e.value)}),c.required=!n||!e,c.placeholder=e?`Leave blank to keep current PIN`:`At least 4 digits`,l.textContent=e?`Leave this blank to keep the current commissioner PIN, or enter a new one to replace it.`:`Set a PIN of at least four digits for new commissioner access.`,u.textContent=n?e?.active?e.is_owner?`Current access: Owner · all permissions`:`Current access: Commissioner · ${e.permissions.length} permission${e.permissions.length===1?``:`s`}`:e?`Current access: Disabled · previous settings shown below`:`Current access: None`:`Current access unavailable until the database update is installed.`,f.disabled=n?!e?.active:!1,g()};s.addEventListener(`change`,_),d.addEventListener(`change`,g),c.addEventListener(`input`,()=>{c.value=c.value.replace(/\D/g,``)}),_(),o.addEventListener(`submit`,async e=>{e.preventDefault();let t=o.querySelector(`button[type="submit"]`);t.disabled=!0;try{if(!h()&&c.value.length<4)throw Error(`Set a PIN of at least four digits for new commissioner access.`);let e=m.filter(e=>e.checked).map(e=>e.value),{error:t}=await b().rpc(`save_commissioner`,{target_member_id:Number(s.value),new_pin:c.value,new_permissions:e,make_owner:d.checked});if(t)throw t;a.set(String(s.value),{member_id:Number(s.value),is_owner:d.checked,active:!0,permissions:e}),j(d.checked?`Owner access updated`:`Commissioner access updated`),_()}catch(e){let t=!c.value&&/PIN must be at least/i.test(e.message||``)?`Run commissioner_access_editor_schema.sql in Supabase to edit access without resetting the PIN.`:e.message;j(t||`Could not save commissioner access`,!0)}finally{t.disabled=!1}}),f.addEventListener(`click`,async()=>{let e=t.find(e=>String(e.id)===String(s.value)),n=e?.display_name||e?.team_name||`this member`;if(confirm(`Disable commissioner access for ${n}?`))try{let{error:e}=await b().rpc(`disable_commissioner`,{target_member_id:Number(s.value)});if(e)throw e;let t=h()||{member_id:Number(s.value),permissions:[],is_owner:!1};a.set(String(s.value),{...t,active:!1}),j(`Commissioner access disabled`),_()}catch(e){j(e.message||`Could not disable commissioner access`,!0)}}),e.querySelector(`#profile-pin-reset`).addEventListener(`click`,async()=>{let e=t.find(e=>String(e.id)===String(s.value)),n=e?.display_name||e?.team_name||`this member`;if(confirm(`Remove ${n}'s Profile PIN lock? They can set a new one from their Profile.`))try{let{error:e}=await b().rpc(`profile_owner_reset_pin`,{target_member_id:Number(s.value)});if(e)throw e;j(`Profile PIN lock reset`)}catch(e){j(/profile_owner_reset_pin|function/i.test(e.message||``)?`Run profile_lock_schema.sql in Supabase first`:e.message||`Could not reset Profile PIN`,!0)}})}var Ve=[`Sunday`,`Monday`,`Tuesday`,`Wednesday`,`Thursday`,`Friday`,`Saturday`],He=/^([01]\d|2[0-3]):[0-5]\d$/;function V(e=[]){let t=new Map;for(let n of e||[]){let e=Number(n?.day),r=String(n?.time||``).slice(0,5);!Number.isInteger(e)||e<0||e>6||!He.test(r)||t.set(`${e}:${r}`,{day:e,time:r})}return[...t.values()].sort((e,t)=>e.day-t.day||e.time.localeCompare(t.time))}function Ue(e=[]){let t=Array.from({length:7},()=>[]);return V(e).forEach(({day:e,time:n})=>t[e].push(n)),t}function We(e=[],t=new Date){return V(e).map(e=>{let[n,r]=e.time.split(`:`).map(Number),i=new Date(t);return i.setDate(t.getDate()+(e.day-t.getDay()+7)%7),i.setHours(n,r,0,0),i<=t&&i.setDate(i.getDate()+7),i}).sort((e,t)=>e-t)[0]||null}function Ge(e,t=`12:00`){let n=Ve[e];return`<div class="sl-schedule-time">
    <input type="time" value="${p(t)}" data-sync-time data-day="${e}"
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
    </section>`).join(``)}async function qe(e){let t=e.querySelector(`#sl-people-list`);if(!t)return;let{data:n,error:r}=await b().from(`sleeper_users`).select(`sleeper_user_id, display_name, team_name, hidden`).order(`display_name`,{ascending:!0});if(r){t.innerHTML=`<span class="warntext">${p(r.message)}</span>
      <div class="muted tiny">Run <strong>members_schema.sql</strong> to add the hidden flag.</div>`;return}if(!n?.length){t.textContent=`Nobody synced yet.`;return}t.innerHTML=`
    <div class="muted tiny" style="margin-bottom:8px">${n.filter(e=>!e.hidden).length} of ${n.length} shown</div>
    ${n.map(e=>`
      <label class="checkrow">
        <input type="checkbox" data-user="${p(e.sleeper_user_id)}" ${e.hidden?``:`checked`}>
        <span>
          <strong>${p(e.display_name)}</strong>
          ${e.team_name?`<span class="muted tiny"> · ${p(e.team_name)}</span>`:``}
        </span>
      </label>`).join(``)}
  `}async function H(e){e.innerHTML=g();let t;try{let{data:e,error:n}=await b().from(`sleeper_config`).select(`*`).eq(`id`,1).single();if(n)throw n;t=e}catch(t){e.innerHTML=u(t)+`<div class="card"><div class="card-body muted">If this says the table is missing, run
       <strong>sleeper_schema.sql</strong> in the Supabase SQL editor.</div></div>`;return}let[{count:n},{count:r},i]=await Promise.all([b().from(`sleeper_leagues`).select(`*`,{count:`exact`,head:!0}),b().from(`sleeper_matchups`).select(`*`,{count:`exact`,head:!0}),b().rpc(`sleeper_get_sync_schedule`)]),a=i.error?null:i.data,o=V(a?.slots||[]),s=a?.enabled??t.auto_sync_enabled??!1;e.innerHTML=`
    <form class="card" id="sl-form">
      <div class="card-title">Sleeper league</div>
      <label for="sl-id">Sleeper League ID</label>
      <input id="sl-id" type="text" inputmode="numeric" placeholder="1048291837465738240"
             value="${p(t.sleeper_league_id||``)}">
      <div class="row-end"><button class="btn ghost" type="submit">Save league ID</button></div>
    </form>

    <div class="card">
      <div class="card-title">Sync</div>
      <div class="card-meta" style="margin:0 0 10px">
        Last sync: <strong>${t.last_synced_at?p(ne(t.last_synced_at))+` `+new Date(t.last_synced_at).toLocaleTimeString():`never`}</strong>
        ${t.last_sync_note?`<br>${p(t.last_sync_note)}`:``}
        <br>Stored now: ${n||0} season(s), ${r||0} matchups.
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
          <input id="sl-auto-enabled" type="checkbox" ${s?`checked`:``}
            ${a?``:`disabled`}>
          <span>Enabled</span>
        </label>
      </div>
      ${a?`
        <div class="sl-schedule-days">${Ke(o)}</div>
        <div class="sl-schedule-foot">
          <div class="muted tiny">
            ${t.last_auto_checked_at?`Last automatic check: ${p(ne(t.last_auto_checked_at))}`:`No automatic check recorded yet.`}
            ${t.last_auto_error?`<br><span class="warntext">${p(t.last_auto_error)}</span>`:``}
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
  `,qe(e);let c=e.querySelector(`.sl-schedule-card`);c?.addEventListener(`click`,e=>{let t=e.target.closest(`[data-add-sync-time]`);if(t){let e=Number(t.dataset.addSyncTime),n=c.querySelector(`[data-times-for="${e}"]`);if(n.querySelectorAll(`[data-sync-time]`).length>=8){j(`That day already has the maximum of 8 sync times`,!0);return}let r=new Set([...n.querySelectorAll(`[data-sync-time]`)].map(e=>e.value)),i=[`12:00`,`13:00`,`15:30`,`18:00`,`21:00`,`00:00`,`09:00`].find(e=>!r.has(e))||`12:00`;n.querySelector(`.sl-no-times`)?.setAttribute(`hidden`,``),n.insertAdjacentHTML(`beforeend`,Ge(e,i)),n.querySelector(`.sl-schedule-time:last-child input`)?.focus();return}let n=e.target.closest(`[data-remove-sync-time]`);if(n){let e=n.closest(`.sl-schedule-times`);n.closest(`.sl-schedule-time`)?.remove(),e.querySelector(`[data-sync-time]`)||e.querySelector(`.sl-no-times`)?.removeAttribute(`hidden`)}}),e.querySelector(`#sl-save-schedule`)?.addEventListener(`click`,async t=>{let n=t.currentTarget,r=e.querySelector(`#sl-auto-enabled`).checked,i=V([...e.querySelectorAll(`[data-sync-time]`)].map(e=>({day:Number(e.dataset.day),time:e.value})));if(r&&!i.length){j(`Add at least one time before enabling automatic sync`,!0);return}n.disabled=!0,n.textContent=`Saving…`;let{error:a}=await b().rpc(`sleeper_save_sync_schedule`,{new_schedule:i,new_enabled:r});if(a){j(a.message,!0),n.disabled=!1,n.textContent=`Save schedule`;return}j(r?`Automatic sync saved · ${i.length} weekly time${i.length===1?``:`s`}`:`Automatic sync paused`),H(e)}),e.querySelector(`#sl-people-list`).addEventListener(`change`,async e=>{let t=e.target.closest(`input[data-user]`);if(!t)return;let{error:n}=await b().from(`sleeper_users`).update({hidden:!t.checked}).eq(`sleeper_user_id`,t.dataset.user);n?(j(n.message,!0),t.checked=!t.checked):j(t.checked?`Now visible`:`Hidden`)}),e.querySelector(`#sl-form`).addEventListener(`submit`,async t=>{t.preventDefault();let n=e.querySelector(`#sl-id`).value.trim(),{error:r}=await b().from(`sleeper_config`).update({sleeper_league_id:n}).eq(`id`,1);r?j(r.message,!0):j(`League ID saved`)});async function l(t,n){let r=e.querySelector(`#sl-log`),i=e.querySelector(`#sl-id`).value.trim();if(!i){j(`Enter a Sleeper league ID first`,!0);return}r.classList.remove(`hidden`),r.textContent=``;let a=e=>{r.textContent+=e+`
`,r.scrollTop=r.scrollHeight},o=[...e.querySelectorAll(`#sl-sync, #sl-sync-history`)];o.forEach(e=>{e.disabled=!0});let s=n.textContent;n.textContent=t?`Repairing history…`:`Syncing current season…`;try{await b().from(`sleeper_config`).update({sleeper_league_id:i}).eq(`id`,1);let{counts:n}=await Te(i,a,{includeHistory:t});j(`Synced ${n.seasons} season(s)`),H(e)}catch(e){a(`\nFAILED: ${e.message}`),j(e.message,!0),o.forEach(e=>{e.disabled=!1}),n.textContent=s}}e.querySelector(`#sl-sync`).addEventListener(`click`,e=>l(!1,e.currentTarget)),e.querySelector(`#sl-sync-history`).addEventListener(`click`,e=>{confirm(`Repair every linked Sleeper season? Normal team changes only need the current-season sync.`)&&l(!0,e.currentTarget)})}var U=new Date().getFullYear();async function W(e){e.innerHTML=g();let t,r,i,a;try{let[e,n,o]=await Promise.all([b().from(`finance_seasons`).select(`*`).eq(`season`,U).maybeSingle(),b().from(`finance_payments`).select(`*`).eq(`season`,U).order(`owner_name`),b().from(`finance_payouts`).select(`*`).eq(`season`,U).order(`sort_order`)]);if(n.error||o.error)throw n.error||o.error;t=e.data||null,r=n.data||[],i=o.data||[],a=await c().catch(()=>[])}catch(t){e.innerHTML=u(t);return}let o=Number(t?.buy_in||0),l=o*r.length,d=a.filter(e=>!r.some(t=>Ye(t.owner_name,e.display_name))),f=r.filter(e=>Number(e.amount_due)!==o);e.innerHTML=`
    <div class="card">
      <div class="card-title">Season</div>
      <div class="setup-grid">
        <label for="su-year">Season</label>
        <label for="su-buyin">Buy-in per team ($)</label>
        <input id="su-year" type="number" value="${p(U)}" step="1">
        <input id="su-buyin" type="number" value="${p(o)}" step="1" min="0">
      </div>
      <div class="row-end">
        <button class="btn" id="su-save-season">Save season</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Teams</div>
      <div class="setup-figures">
        ${G(r.length,r.length===1?`team`:`teams`)}
        ${G(x(o),`each`)}
        ${G(x(l),`pot`)}
      </div>

      ${r.length?`<div class="chiprow">${r.map(e=>`<span class="chip flat">${p(e.owner_name)}</span>`).join(``)}</div>`:`<p class="muted tiny">Nobody is in this season yet.</p>`}

      <div class="row-end">
        ${d.length?`<button class="btn" id="su-add-members">
               Add ${d.length} league member${d.length===1?``:`s`}
             </button>`:`<span class="muted tiny">Every league member is in this season.</span>`}
        ${f.length&&o>0?`<button class="btn ghost" id="su-fix-dues">
               Set ${f.length} due${f.length===1?``:`s`} to ${x(o)}
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
  `;let m=e.querySelector(`#su-tally`),h=()=>{let t=[...e.querySelectorAll(`#su-payouts .po-amount`)].reduce((e,t)=>e+(Number(t.value)||0),0),n=l-t;if(!l){m.innerHTML=`<span class="muted">${o<=0?`Set a buy-in to see the pot`:`Add teams to see the pot`}</span>`;return}m.innerHTML=`${x(t)} of ${x(l)}
      <span class="${n===0?`ok`:n<0?`over`:`under`}">
        ${n===0?`balanced`:n<0?x(-n)+` over`:x(n)+` left`}
      </span>`};h(),e.querySelector(`#su-payouts`).addEventListener(`input`,h),e.querySelector(`#su-payouts`).addEventListener(`click`,e=>{let t=e.target.closest(`button[data-drop]`);t&&(t.closest(`.po-row`).remove(),h())}),e.querySelector(`#su-add-payout`).addEventListener(`click`,()=>{e.querySelector(`#su-payouts`).insertAdjacentHTML(`beforeend`,Je(null)),h()}),e.querySelector(`#su-save-season`).addEventListener(`click`,async t=>{let n=Number(e.querySelector(`#su-year`).value),r=Number(e.querySelector(`#su-buyin`).value)||0;if(!n){j(`Give the season a year`,!0);return}t.target.disabled=!0;try{let{error:t}=await b().from(`finance_seasons`).upsert({season:n,buy_in:r},{onConflict:`season`});if(t)throw t;U=n,j(`Saved`),W(e)}catch(e){j(e.message||`Could not save`,!0),t.target.disabled=!1}}),e.querySelector(`#su-add-members`)?.addEventListener(`click`,async t=>{t.target.disabled=!0;try{for(let e of d)await s(`finance_payments`,{season:U,owner_name:e.display_name,team_name:e.team_name||``,sleeper_user_id:e.sleeper_user_id||null,amount_due:o,amount_paid:0});j(`Added ${d.length} to ${U}`),W(e)}catch(e){j(e.message||`Could not add everyone`,!0),t.target.disabled=!1}}),e.querySelector(`#su-fix-dues`)?.addEventListener(`click`,async t=>{t.target.disabled=!0;try{let{error:t}=await b().from(`finance_payments`).update({amount_due:o}).eq(`season`,U);if(t)throw t;j(`Dues updated`),W(e)}catch(e){j(e.message||`Could not update the dues`,!0),t.target.disabled=!1}}),e.querySelector(`#su-save-payouts`).addEventListener(`click`,async t=>{let r=[...e.querySelectorAll(`#su-payouts .po-row`)].map((e,t)=>({id:e.dataset.id||null,title:e.querySelector(`.po-title`).value.trim(),amount:Number(e.querySelector(`.po-amount`).value)||0,sort_order:t+1})).filter(e=>e.title);t.target.disabled=!0;try{let t=new Set(r.filter(e=>e.id).map(e=>String(e.id)));for(let e of i)t.has(String(e.id))||await n(`finance_payouts`,e.id);for(let e of r)e.id?await T(`finance_payouts`,e.id,{title:e.title,amount:e.amount,sort_order:e.sort_order}):await s(`finance_payouts`,{season:U,title:e.title,amount:e.amount,sort_order:e.sort_order});j(`Payouts saved`),W(e)}catch(e){j(e.message||`Could not save the payouts`,!0),t.target.disabled=!1}})}function Je(e){return`
    <div class="po-row" ${e?`data-id="${p(e.id)}"`:``}>
      <input class="po-title" type="text" placeholder="Champion"
             value="${e?p(e.title):``}">
      <input class="po-amount" type="number" step="1" min="0" placeholder="0"
             value="${e?p(Number(e.amount)):``}">
      <button type="button" class="btn ghost small" data-drop aria-label="Remove">&times;</button>
    </div>`}function G(e,t){return`<div class="setup-figure">
            <span class="sf-v">${p(e)}</span>
            <span class="sf-l">${p(t)}</span>
          </div>`}function Ye(e,t){return String(e||``).trim().toLowerCase()===String(t||``).trim().toLowerCase()}var K=new Date().getFullYear(),Xe=[{id:`buyin`,tab:`Buy-in`,table:`finance_seasons`,singular:`season`,plural:`seasons`,order:`season`,asc:!1,label:e=>`${e.season} — ${x(e.buy_in)} per team`,sub:e=>e.notes||``,fields:[{name:`season`,label:`Season`,type:`number`,required:!0,default:K},{name:`buy_in`,label:`Buy-in per team ($)`,type:`number`,required:!0,default:0},{name:`notes`,label:`Notes`,type:`textarea`}]},{id:`payments`,tab:`Dues`,table:`finance_payments`,singular:`team`,plural:`teams`,order:`owner_name`,asc:!0,label:e=>`${e.owner_name}${e.team_name?` — `+e.team_name:``}`,sub:e=>`${e.season} · paid ${x(e.amount_paid)} of ${x(e.amount_due)}`,fields:[{name:`season`,label:`Season`,type:`number`,required:!0,default:K},{name:`owner_name`,label:`Team owner`,type:`text`,required:!0,placeholder:`Slaw`},{name:`team_name`,label:`Team name`,type:`text`,placeholder:`Slaw Squad`},{name:`amount_due`,label:`Amount due ($)`,type:`number`,default:0},{name:`amount_paid`,label:`Amount paid ($)`,type:`number`,default:0},{name:`date_paid`,label:`Date paid`,type:`date`},{name:`notes`,label:`Notes`,type:`textarea`,placeholder:`Venmo, paying in two halves…`},{name:`sleeper_user_id`,label:`Link to Sleeper account (optional)`,type:`select`,optionsFrom:{table:`sleeper_users`,value:`sleeper_user_id`,label:`display_name`,order:`display_name`}}]},{id:`payouts`,tab:`Payouts`,table:`finance_payouts`,singular:`payout`,plural:`payouts`,order:`sort_order`,asc:!0,label:e=>`${e.title} — ${x(e.amount)}`,sub:e=>`${e.season}${e.winner?` · `+e.winner:``}`,fields:[{name:`season`,label:`Season`,type:`number`,required:!0,default:K},{name:`title`,label:`Payout`,type:`text`,required:!0,placeholder:`Champion`},{name:`amount`,label:`Amount ($)`,type:`number`,required:!0,default:0},{name:`description`,label:`Description (optional)`,type:`text`},{name:`winner`,label:`Winner (optional)`,type:`text`},{name:`sort_order`,label:`Display order`,type:`number`,default:1}]},{id:`expenses`,tab:`Expenses`,table:`finance_expenses`,singular:`expense`,plural:`expenses`,order:`expense_date`,asc:!1,label:e=>`${e.description} — ${x(e.amount)}`,sub:e=>`${e.season}`,fields:[{name:`season`,label:`Season`,type:`number`,required:!0,default:K},{name:`description`,label:`What was it`,type:`text`,required:!0,placeholder:`Trophy engraving`},{name:`amount`,label:`Amount ($)`,type:`number`,required:!0,default:0},{name:`expense_date`,label:`Date`,type:`date`},{name:`notes`,label:`Notes`,type:`textarea`}]},{id:`comps`,tab:`Competitions`,table:`finance_competitions`,singular:`competition`,plural:`competitions`,order:`name`,asc:!0,label:e=>e.name,sub:e=>`${e.season} · ${e.status}${e.winner?` · `+e.winner:``}`,fields:[{name:`season`,label:`Season`,type:`number`,required:!0,default:K},{name:`name`,label:`Competition`,type:`text`,required:!0,placeholder:`March Madness`},{name:`buy_in`,label:`Buy-in ($)`,type:`number`,default:0},{name:`participants`,label:`Number of players`,type:`number`,default:0},{name:`prize_pool`,label:`Prize pool ($) — leave blank to calculate`,type:`number`},{name:`winner`,label:`Winner`,type:`text`},{name:`status`,label:`Status`,type:`select`,options:[`Open`,`Running`,`Finished`]},{name:`notes`,label:`Notes`,type:`textarea`}]}],Ze={id:`setup`,tab:`Setup`},q=`setup`;function Qe(e){e.innerHTML=`
    <div class="tabs subtabs" id="fin-admin-tabs">
      ${[Ze,...Xe].map(e=>`
        <button data-fin="${e.id}" class="${e.id===q?`on`:``}">${p(e.tab)}</button>
      `).join(``)}
    </div>
    <div id="fin-admin-body"></div>
  `;let t=e.querySelector(`#fin-admin-body`),n=()=>q===Ze.id?W(t):L(t,Xe.find(e=>e.id===q));e.querySelector(`#fin-admin-tabs`).addEventListener(`click`,t=>{let r=t.target.closest(`button[data-fin]`);r&&(q=r.dataset.fin,e.querySelectorAll(`#fin-admin-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.fin===q)),n())}),n()}var J=[{value:be.FIXED_FROM_BASIS,label:`Fixed`,hint:`The cost stays the same every keeper year.`},{value:be.ESCALATES_PER_YEAR,label:`Climbs each year`,hint:`The adjustment applies again for every extra keeper year.`}];async function $e(e){e.innerHTML=`<div class="card"><div class="card-body muted">Reading the keeper rules…</div></div>`;let[t,n]=await Promise.all([b().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression, notes, updated_at`).order(`effective_season`,{ascending:!1}),b().from(`sleeper_leagues`).select(`season`).order(`season`,{ascending:!1}).limit(1)]),r=null;try{let e=await b().from(`keeper_season_state`).select(`season, member_entry_locked`);r=e.error?null:e.data||[]}catch{r=null}if(t.error){e.innerHTML=`<div class="card"><div class="card-body">
      Keeper rules are not switched on yet. Run <strong>keeper_rules_schema.sql</strong>
      and then <strong>keeper_basis_correction.sql</strong> in the Supabase SQL editor.
      <p class="muted tiny">${p(t.error.message||``)}</p></div></div>`;return}let i=t.data||[],a=(n.data||[])[0]?.season??new Date().getFullYear(),o=i[0]?.effective_season??a,s=()=>{let t=i.find(e=>Number(e.effective_season)===Number(o)),n=t||{..._e,effective_season:o};e.innerHTML=et(i,n,!t,a)+u(o,r),d()};function c(){let t=e.querySelector(`[data-kr-form]`);return{effective_season:Number(t.effective_season.value),max_keeper_seasons:Number(t.max_keeper_seasons.value),round_adjustment:Number(t.round_adjustment.value),progression:t.progression.value,cost_basis:Se.PREVIOUS_SEASON_DRAFT_ROUND}}function l(){let t=e.querySelector(`[data-kr-preview]`),n=e.querySelector(`[data-kr-errors]`),r=ye(c());if(!r.ok){t.innerHTML=`<span class="muted">—</span>`,n.textContent=r.errors.join(` · `);return}n.textContent=``;let i=r.config.effective_season,a=ge(r.config,{basisRound:8,targetSeason:i}),o=ge(r.config,{basisRound:2,targetSeason:i}),s=ge(r.config,{basisRound:1,targetSeason:i});t.innerHTML=`
      <p class="kr-summary">${p(xe(r.config))}</p>
      <p class="kr-example"><strong>${p(a.basisSeason)} Draft R${a.basisRound}</strong>
        → <strong>${p(i)} Keeper R${a.cost}</strong></p>
      <ul class="kr-cases">
        <li>${p(o.basisSeason)} Draft R${o.basisRound} → ${p(i)} Keeper R${o.cost}</li>
        <li>${p(s.basisSeason)} Draft R${s.basisRound} → ${p(i)} Keeper R${s.cost}
          <span class="muted tiny">R1 is the floor, always</span></li>
      </ul>
      <p class="muted tiny">${p(a.text)}</p>`}function u(e,t){if(t==null)return``;let n=!!t.find(t=>Number(t.season)===Number(e))?.member_entry_locked;return`<section class="card"><div class="card-body">
      <h3 class="card-heading">Member entry for ${e}</h3>
      <p class="muted tiny">${n?`Closed. Members cannot choose or change their own ${e} keeper. You still can.`:`Open. Members can choose and change their own ${e} keeper until you close it.`}</p>
      <div class="row-end">
        <button type="button" class="btn ${n?``:`danger`}" data-kr-lock="${n?`0`:`1`}"
                data-kr-lock-season="${e}">
          ${n?`Reopen ${e} for members`:`Close ${e} to members`}
        </button>
      </div>
    </div></section>`}function d(){e.querySelectorAll(`[data-kr-lock]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.krLock===`1`,n=Number(e.dataset.krLockSeason);e.disabled=!0;try{let{data:e,error:i}=await b().rpc(`keeper_set_season_lock`,{target_season:n,locked:t});if(i)throw i;let a=Array.isArray(e)?e[0]:e;if(!a)throw Error(`That was refused.`);r=[...(r||[]).filter(e=>Number(e.season)!==n),{season:n,member_entry_locked:!!a.member_entry_locked}],j(a.member_entry_locked?`${n} closed to members`:`${n} reopened for members`),s()}catch(t){e.disabled=!1,j(t?.message||`Could not change that`,!0)}})}),e.querySelectorAll(`[data-kr-season]`).forEach(e=>{e.addEventListener(`click`,()=>{o=Number(e.dataset.krSeason),s()})});let t=e.querySelector(`[data-kr-form]`);t.addEventListener(`input`,l),t.addEventListener(`change`,l),t.addEventListener(`submit`,async n=>{n.preventDefault();let r=t.querySelector(`button[type=submit]`),i=ye(c());if(!i.ok){j(i.errors[0],!0);return}r.disabled=!0;try{let{data:t,error:n}=await b().from(`keeper_rules`).upsert({effective_season:i.config.effective_season,max_keeper_seasons:i.config.max_keeper_seasons,cost_basis:i.config.cost_basis,round_adjustment:i.config.round_adjustment,progression:i.config.progression,updated_at:new Date().toISOString()},{onConflict:`effective_season`}).select(`effective_season`);if(n)throw n;if(!t||!t.length)throw Error(`The database refused that write. Sign in as admin and try again.`);j(`${i.config.effective_season} keeper rules saved`),await $e(e)}catch(e){r.disabled=!1,j(e.message||`Could not save the keeper rules`,!0)}}),l()}s()}function et(e,t,n,r){let i=e.map(e=>Number(e.effective_season)),a=Math.max(r,...i.length?i:[r])+1;return`
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
        <input type="hidden" name="effective_season" value="${p(t.effective_season)}">

        <p class="kr-note">${n?`Nothing is configured for <strong>${p(t.effective_season)}</strong> yet.
             Saving adds a new rule set that takes effect from that season.`:`Editing the rule set effective from <strong>${p(t.effective_season)}</strong>.`}
          A season is governed by the newest rule set at or before it, so changing a future
          season cannot alter a keeper already recorded.</p>

        <div class="kr-fields">
          <label class="kr-field">
            <span>Maximum keeper seasons</span>
            <input name="max_keeper_seasons" type="number" min="1" max="20" inputmode="numeric"
                   value="${p(t.max_keeper_seasons)}" required>
            <small class="muted tiny">How many seasons one player may be kept in total.</small>
          </label>

          <label class="kr-field">
            <span>Rounds earlier than the basis</span>
            <input name="round_adjustment" type="number" min="0" max="20" inputmode="numeric"
                   value="${p(t.round_adjustment)}" required>
            <small class="muted tiny">0 means the keeper costs that same round.</small>
          </label>

          <label class="kr-field">
            <span>Cost progression</span>
            <select name="progression">
              ${J.map(e=>`<option value="${e.value}" ${e.value===t.progression?`selected`:``}>${p(e.label)}</option>`).join(``)}
            </select>
            <small class="muted tiny">${p(J.find(e=>e.value===t.progression)?.hint||J[0].hint)}</small>
          </label>
        </div>

        <div class="kr-field is-fixed">
          <span>Cost basis</span>
          <strong>${p(ve(_e)||`Previous season's draft round`)}</strong>
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
          <button class="btn" type="submit">${n?`Add`:`Save`} ${p(t.effective_season)} rules</button>
        </div>
      </form>
    </div>`}async function tt(t){await d(`css/notifications.css`);let n=await c();t.innerHTML=`<section class="admin-notify-panel"><div class="section-head"><div><h2>Send notification</h2><p class="muted">Delivered to the in-app inbox and any enabled phones.</p></div></div>
    <form class="card" id="notification-compose">
      <div class="form-grid two"><label>Title<input name="title" maxlength="80" required placeholder="League update"></label><label>Category<select name="category">${we.map(([e,t])=>`<option value="${e}">${p(t)}</option>`).join(``)}</select></label></div>
      <label>Message<textarea name="body" maxlength="240" rows="3" required placeholder="What does the league need to know?"></textarea><small class="muted"><span data-notify-count>0</span>/240</small></label>
      <div class="form-grid two"><label>Opens to<select name="targetUrl"><option value="#/home">Home</option><option value="#/analyzer">Team analyzer</option><option value="#/trade">Trade room</option><option value="#/sportsbook">Sportsbook</option><option value="#/wall">League wall</option><option value="#/polls">Polls</option><option value="#/finances">Fees</option><option value="#/calendar">Calendar</option><option value="#/rules">Rules</option><option value="#/notifications">Notifications</option></select></label><label>Recipients<select name="audience"><option value="all">Everyone</option><option value="members">Selected members</option></select></label></div>
      <fieldset class="notify-recipient-picker hidden"><legend>Choose members</legend>${n.map(e=>`<label><input type="checkbox" value="${e.id}"><span><strong>${p(e.display_name)}</strong>${e.team_name?`<small>${p(e.team_name)}</small>`:``}</span></label>`).join(``)}</fieldset>
      <div class="row-end"><button class="btn" type="submit">Send notification</button></div>
    </form><div data-notify-result></div></section>`;let r=t.querySelector(`#notification-compose`),i=t.querySelector(`.notify-recipient-picker`);r.elements.audience.addEventListener(`change`,()=>i.classList.toggle(`hidden`,r.elements.audience.value!==`members`)),r.elements.body.addEventListener(`input`,()=>{t.querySelector(`[data-notify-count]`).textContent=String(r.elements.body.value.length)}),r.addEventListener(`submit`,async n=>{n.preventDefault();let a=r.querySelector(`button[type="submit"]`),o=Ce({title:r.elements.title.value,body:r.elements.body.value,category:r.elements.category.value,targetUrl:r.elements.targetUrl.value,audience:r.elements.audience.value,targetMemberIds:[...i.querySelectorAll(`input:checked`)].map(e=>e.value)});if(!o.title||!o.body)return j(`Add a title and message`,!0);if(r.elements.audience.value===`members`&&!o.targetMemberIds.length)return j(`Choose at least one member`,!0);a.disabled=!0;try{let{data:n,error:a}=await l().functions.invoke(`send-notification`,{headers:e(),body:{action:`send`,...o}});if(a){let e=null;try{e=await a.context?.json()}catch{}throw Error(e?.error||e?.message||a.message||`Could not send notification`)}if(!n?.ok)throw Error(n?.error||`Notification could not be sent`);let s=Number(n.delivered)||0;t.querySelector(`[data-notify-result]`).innerHTML=`<div class="card note"><div class="card-body"><strong>Sent to the league inbox.</strong><br><span class="muted">${s} phone${s===1?``:`s`} received push delivery${n.pushConfigured?`.`:`; phone delivery needs its server keys configured.`}</span></div></div>`,r.reset(),i.classList.add(`hidden`),t.querySelector(`[data-notify-count]`).textContent=`0`,j(`Notification sent`)}catch(e){j(e.message||`Could not send notification`,!0)}finally{a.disabled=!1}})}var nt={roster_count:`Missing or unexpected rosters`,roster_ids:`Duplicate or missing roster IDs`,roster_owners:`Duplicate or missing owners`,missing_owners:`Owner directory incomplete`,empty_rosters:`Empty roster data`,duplicate_players:`Players assigned to multiple teams`,matchup_rosters:`Matchups assigned to the wrong rosters`,matchup_count:`Incomplete weekly matchups`,invalid_starters:`Duplicate or unowned starters`,wrong_week:`Wrong league week`,wrong_season:`Wrong league season`,league_format:`League settings differ from 12-team PPR / one QB`},rt=Object.freeze({app_ready:2500,largest_contentful_paint:2500,cumulative_layout_shift:.1,interaction_latency:200,route_render:1e3,route_module:800,route_content:700,long_task:200});function it(e=[]){return e.map(e=>({...e,limit:rt[e.metric]})).filter(e=>Number.isFinite(e.limit)&&Number(e.p75)>e.limit).sort((e,t)=>Number(t.p75)/t.limit-Number(e.p75)/e.limit)}var at={app_ready:`App ready`,largest_contentful_paint:`Largest paint`,cumulative_layout_shift:`Layout shift`,interaction_latency:`Interaction latency`,route_render:`Route render`,route_module:`Route module`,route_content:`Route content`,long_task:`Main-thread stall`},ot={app_ready:`Reduce startup work and competing requests.`,largest_contentful_paint:`Prioritize the first useful card and its images.`,cumulative_layout_shift:`Reserve dimensions for late content and images.`,interaction_latency:`Trim work inside tap and navigation handlers.`,route_render:`Audit the route’s total data and DOM work.`,route_module:`Split or defer route-only code.`,route_content:`Reduce data waterfalls and render smaller first paint.`,long_task:`Break up synchronous rendering on mobile.`},Y=(e,t)=>t===`score`?Number(e).toFixed(3):`${Math.round(Number(e))} ms`;async function st(e){e.innerHTML=`<div class="card"><div class="card-body muted">Loading real-user performance…</div></div>`;let[{data:t,error:n},r]=await Promise.all([b().rpc(`app_performance_summary`,{days_back:14}),Promise.resolve(b().rpc(`app_reliability_summary`)).catch(()=>({error:!0}))]);if(n){e.innerHTML=`${u(n)}<div class="card note"><div class="card-body">Run <strong>performance_metrics_schema.sql</strong> in Supabase to activate anonymous performance tracking.</div></div>`;return}let i=t||[],a=it(i);e.innerHTML=ct(r.data,r.error)+`<div class="section-head"><div><h2>Real-user performance</h2><p class="muted">Last 14 days · anonymous 25% session sample</p></div></div>
    <section class="perf-health ${a.length?`is-warn`:`is-good`}"><div><small>PERFORMANCE HEALTH</small><strong>${a.length?`${a.length} hotspot${a.length===1?``:`s`}`:`Within target`}</strong></div>${a.length?`<ol>${a.slice(0,5).map(e=>`<li><span><b>${p(e.route)} · ${p(at[e.metric]||e.metric)}</b><small>${p(ot[e.metric]||`Review this route.`)}</small></span><strong>${Y(e.p75,e.unit)}</strong></li>`).join(``)}</ol>`:`<p>No P75 metric is outside the current mobile-friendly target.</p>`}</section>
    <div class="card"><div class="card-body">
      <p class="muted tiny">Measures broad device and network conditions only. No member, team, content, full URL, or persistent browser identity is stored.</p>
      ${i.length?`<div class="table-wrap"><table><thead><tr><th>Measure</th><th>Route</th><th>Samples</th><th>Median</th><th>P75</th><th>P95</th></tr></thead><tbody>${i.map(e=>`<tr><td>${p(at[e.metric]||e.metric)}</td><td>${p(e.route)}</td><td>${Number(e.samples)||0}</td><td>${Y(e.p50,e.unit)}</td><td>${Y(e.p75,e.unit)}</td><td>${Y(e.p95,e.unit)}</td></tr>`).join(``)}</tbody></table></div>`:`<div class="empty">No sampled sessions yet. Data will appear as members use this release.</div>`}
    </div></div>`}function ct(e,t){if(t||!e)return`<section class="card"><div class="card-body"><h2>App reliability</h2><p role="status">Reliability checks are unavailable. Try again.</p></div></section>`;let n=e.issues||[],r=e.wall||{},i=e.sync||{},a=e.leagueHealth,o=a&&Date.now()-Date.parse(a.checkedAt)>(i.mode===`live`||i.mode===`kickoff`?20:150)*6e4;return`<section class="card"><div class="card-body"><h2>App reliability</h2>${a?`<p role="status"><strong>League checks: ${a.ok?`Passed`:`Needs attention`}${o?` · snapshot overdue`:``}</strong> · ${Number(a.rostersChecked)||0}/${Number(a.expectedTeams)||12} rosters · Week ${Number(a.week)||0}</p>${a.issues?.length?`<ul>${a.issues.map(e=>`<li>${p(nt[e]||`League data needs review`)}</li>`).join(``)}</ul>`:``}`:`<p>League checks: waiting for the next sync.</p>`}<p>${i.enabled?`Background sync on`:`Background sync paused`} · ${p(i.mode||`waiting for first run`)}${i.checked_at?` · checked ${p(new Date(i.checked_at).toLocaleString())}`:``}</p>${i.error?`<p role="status">Sync needs attention: ${p(i.error)}</p>`:``}<p>Wall pushes: ${Number(r.delivered)||0} delivered · ${Number(r.pending)||0} queued · ${Number(r.failed)||0} failed</p>${n.length?`<div class="table-wrap"><table><thead><tr><th>Issue</th><th>Route</th><th>Source</th><th>Release</th><th>Sessions</th></tr></thead><tbody>${n.map(e=>`<tr><td>${p(e.kind.replaceAll(`_`,` `))}</td><td>${p(e.route)}</td><td>${p(e.source)}</td><td>${p(e.app_version)}</td><td>${Number(e.samples)||0}</td></tr>`).join(``)}</tbody></table></div>`:`<p>No reported issues in the last 14 days.</p>`}<p class="muted tiny">Technical categories only. No member, message, request URL or error text is collected.</p></div></section>`}var X=e=>e.then(e=>({value:e}),e=>({error:e})),lt=e=>Number(e?.value?.count)||0;function ut(e){let t=Date.parse(e?.last_synced_at||``);return t?Date.now()-t>216e5?{tone:`warn`,label:`Sync is stale`,detail:y(e.last_synced_at)}:{tone:`good`,label:`Sleeper current`,detail:y(e.last_synced_at)}:{tone:`bad`,label:`Never synced`,detail:`Run the current-season sync.`}}function dt(e){let t=e.teams.map(e=>e.teamName).join(` ↔ `)||`Completed trade`,n=e.balanced?`Balanced`:e.winner?`${e.winner} edge`:`Review needed`;return`<article class="ops-trade-row">
    <a href="${p(e.href)}"><small>${e.week?`WEEK ${p(e.week)}`:`TRADE`}</small><strong>${p(t)}</strong><span>${p(n)}</span></a>
    ${e.breakingActive?`<button class="btn ghost small" data-ops-end-trade="${p(e.id)}">End alert</button>`:`<em>Archived</em>`}
  </article>`}function ft(e){return`<article class="ops-trade-row">
    <a href="${p(e.href)}"><small>${p(e.label)}</small><strong>${p(e.title)}</strong><span>${p(e.message||`No supporting text`)}</span></a>
    ${e.breakingActive?`<button class="btn ghost small" data-ops-end-custom="${p(e.rawId)}">End alert</button>`:`<em>Archived</em>`}
  </article>`}async function Z(t){t.innerHTML=`<div class="card"><div class="card-body muted">Checking league operations…</div></div>`;let[n,r,i,a,o,s,c,u]=await Promise.all([X(b().from(`sleeper_config`).select(`last_synced_at,last_sync_note,last_auto_checked_at,last_auto_error,auto_sync_enabled`).eq(`id`,1).maybeSingle()),X(b().from(`sportsbook_markets`).select(`id`,{count:`exact`,head:!0}).in(`status`,[`open`,`locked`])),X(b().rpc(`commissioner_operations_health`)),X(b().rpc(`sleeper_get_sync_schedule`)),X(b().rpc(`app_performance_summary`,{days_back:14})),X(ie({limit:20})),X(le({limit:10})),X(l().functions.invoke(`sync-sportsbook-feed`,{body:{action:`status`},headers:e()}))]),d=n.value?.data||{},f=ut(d),m=(s.value||[]).map(ae).filter(Boolean),h=m.filter(e=>e.breakingActive),g=c.value||[],_=h.length+g.filter(e=>e.breakingActive).length,v=i.value?.data||{},x=Number(v.push_devices)||0,S=Number(v.push_failures)||0,C=Number(v.member_review)||0,w=Number(v.unsettled_tickets)||0,T=Number(v.expired_push_devices)||0,E=Number(v.missing_profile_images)||0,te=a.value?.data||{},D=te.enabled?We(te.slots||[]):null,O=it(o.value?.data||[]),k=u.value?.data||{},A=k.lastError||u.error?.message||u.value?.error?.message||``,M=Number(k.monthlyEventObjects)||0,N=Number(v.latest_final_week)||0,P=Number(v.settlement_pending)||0,F=[[`Sleeper sync`,f.tone===`good`,f.detail],[`Sportsbook settlement`,!P,P?`${P} completed market${P===1?``:`s`} waiting`:`Caught up`],[`Power rankings`,N>0,N?`Week ${N} finalized`:`Waiting for final scores`],[`Tuesday report`,N>0,N?`Week ${N} receipt available`:`No completed week`],[`Trade import`,!!v.latest_trade_at,v.latest_trade_at?`Latest ${y(v.latest_trade_at)}`:`No completed trade receipt`],[`Schedule dispatcher`,v.cron_last_status===`succeeded`,v.cron_last_run?`${v.cron_last_status||`unknown`} · ${y(v.cron_last_run)}`:`No run recorded`]];t.innerHTML=`<div class="section-head ops-head"><div><h2>League operations</h2><p class="muted">Sync, alerts, notifications and open weekly jobs in one place.</p></div><a class="btn ghost small" href="#/notifications">Notification inbox</a></div>
    <div class="ops-command-bar"><button class="btn" type="button" data-ops-sync-now>↻ Sync Sleeper now</button><span>${D?`Next auto sync ${p(D.toLocaleString([],{weekday:`short`,hour:`numeric`,minute:`2-digit`}))}`:`No automatic sync scheduled`}</span></div>
    <div class="ops-status-grid">
      <a class="ops-status is-${f.tone}" href="#/admin"><small>LEAGUE DATA</small><strong>${p(f.label)}</strong><span>${p(f.detail)}</span></a>
      <a class="ops-status ${d.last_auto_error?`is-bad`:`is-good`}" href="#/admin"><small>AUTO SYNC</small><strong>${d.auto_sync_enabled?`Enabled`:`Paused`}</strong><span>${p(d.last_auto_error||(d.last_auto_checked_at?`Checked ${y(d.last_auto_checked_at)}`:`No check recorded`))}</span></a>
      <a class="ops-status ${S?`is-warn`:`is-good`}" href="#/notifications"><small>PUSH HEALTH</small><strong>${x}</strong><span>${S?`${S} delivery failures recorded`:`Enabled devices healthy`}</span></a>
      <a class="ops-status ${w||A?`is-warn`:`is-good`}" href="#/sportsbook"><small>SPORTSBOOK</small><strong>${w}</strong><span>${lt(r)} active markets · ${M} API objects this month</span></a>
      <a class="ops-status ${C?`is-warn`:`is-good`}" href="#/admin"><small>MEMBER REVIEW</small><strong>${C}</strong><span>Inactive or unlinked profiles</span></a>
      <a class="ops-status ${O.length?`is-warn`:`is-good`}" href="#/admin" data-open-performance><small>PERFORMANCE</small><strong>${O.length}</strong><span>${O.length?`Real-user hotspots`:`Within current targets`}</span></a>
    </div>
    <details class="ops-diagnostics"><summary>Diagnostics <span>${T+E?`${T+E} items`:`all clear`}</span></summary>
      <div><p><small>EXPIRED PUSH ENDPOINTS</small><strong>${T}</strong><span>Automatically replaced when an opted-in device returns.</span></p>
      <p><small>MISSING PROFILE IMAGES</small><strong>${E}</strong><span>Active members using the fallback mark.</span></p>
      <p><small>LAST PUSH DELIVERY</small><strong>${v.last_push_success?p(y(v.last_push_success)):`No success recorded`}</strong><span>${S?`${S} active delivery failures`:`Current endpoints are clean`}</span></p>
      <p><small>OLDEST OPEN TICKET</small><strong>${v.oldest_open_ticket?p(y(v.oldest_open_ticket)):`None`}</strong><span>${w} tickets awaiting settlement.</span></p>
      <p><small>ODDS FEED</small><strong>${k.lastSuccessAt?p(y(k.lastSuccessAt)):`No sync recorded`}</strong><span>${A?p(A):`${Number(k.activeMarkets)||0} cached markets · ${M} billed event objects this month`}</span></p></div>
    </details>
    <div class="section-head"><div><h2>Weekly automation</h2><p class="muted">One timeline for the jobs that move the league into its next week.</p></div><span class="pill ${F.every(e=>e[1])?`green`:`grey`}">${F.filter(e=>e[1]).length}/${F.length}</span></div>
    <section class="ops-automation-line">${F.map(([e,t,n])=>`<article class="${t?`is-good`:`is-warn`}"><i></i><div><strong>${p(e)}</strong><span>${p(n)}</span></div></article>`).join(``)}</section>
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
    <div class="section-head"><div><h2>Release health</h2><p class="muted">Real-user speed data remains under Performance; this desk is the fast operational check.</p></div><a class="btn ghost small" href="#/admin" data-open-performance>View performance</a></div>`,t.querySelectorAll(`[data-ops-end-trade]`).forEach(e=>e.addEventListener(`click`,async()=>{if(confirm(`End the breaking banner for this trade? The receipt will remain in Trade Analyzer.`)){e.disabled=!0;try{await oe(e.dataset.opsEndTrade),j(`Breaking coverage ended`),await Z(t)}catch(t){e.disabled=!1,j(t.message||`Could not end coverage`,!0)}}})),t.querySelector(`[data-ops-sync-now]`)?.addEventListener(`click`,async e=>{let n=e.currentTarget;n.disabled=!0,n.textContent=`Syncing…`;try{let{counts:e}=await ee();j(`Sleeper synced · ${e.rosters} rosters`),window.dispatchEvent(new CustomEvent(`dfl:quick-sync-complete`,{detail:{counts:e}})),await Z(t)}catch(e){n.disabled=!1,n.textContent=`↻ Sync Sleeper now`,j(e.message||`Sync failed`,!0)}}),t.querySelectorAll(`[data-ops-end-custom]`).forEach(e=>e.addEventListener(`click`,async()=>{if(confirm(`End this custom breaking alert?`)){e.disabled=!0;try{await re(e.dataset.opsEndCustom),j(`Custom alert ended`),await Z(t)}catch(t){e.disabled=!1,j(t.message||`Could not end custom alert`,!0)}}})),t.querySelector(`[data-ops-alert-form]`)?.addEventListener(`submit`,async e=>{e.preventDefault();let n=e.currentTarget,r=n.querySelector(`button[type="submit"]`);r.disabled=!0,r.textContent=`Launching…`;try{let e=await ue({label:n.querySelector(`#ops-alert-label`).value,title:n.querySelector(`#ops-alert-title`).value,message:n.querySelector(`#ops-alert-message`).value,targetUrl:n.querySelector(`#ops-alert-target`).value,sendPhone:n.querySelector(`[data-ops-alert-phone]`).checked});j(e.notificationError?`Banner launched · phone notification failed`:`Breaking alert launched`,!!e.notificationError),await Z(t)}catch(e){r.disabled=!1,r.textContent=`Launch alert`,j(e.message||`Could not launch custom alert`,!0)}}),t.querySelector(`[data-open-performance]`)?.addEventListener(`click`,e=>{e.preventDefault(),document.querySelector(`#admin-tabs [data-section="performance"]`)?.click()})}var pt=[{id:`members`,tab:`Members`,table:`members`,permission:`members`},{id:`rule_categories`,tab:`Rule tabs`,table:`rule_categories`,permission:`rules`}],mt=[{id:`operations`,tab:`Operations`,permission:`sleeper`,render:Z},{id:`finances`,tab:`Fees`,permission:`fees`,render:Qe},{id:`keepers`,tab:`Keeper rules`,permission:`keepers`,render:$e},{id:`sleeper`,tab:`Sleeper`,permission:`sleeper`,render:H},{id:`performance`,tab:`Performance`,permission:`sleeper`,render:st},{id:`broadcast`,tab:`Broadcast`,permission:`broadcast`,render:z},{id:`notifications`,tab:`Notifications`,permission:`broadcast`,render:tt},{id:`commissioners`,tab:`Commissioner Access`,ownerOnly:!0,render:Be}],Q=`operations`,ht=typeof CSS<`u`&&typeof CSS.supports==`function`&&CSS.supports(`-webkit-text-security`,`disc`);function gt(e,t,n=`dfl-admin-key`,r=!1){let i=`id="${e}" required
    ${t?`placeholder="${p(t)}"`:``}
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
  </div>`}function _t(e){e.querySelectorAll(`button[data-eye]`).forEach(t=>{let n=e.querySelector(`#`+t.dataset.eye);n&&t.addEventListener(`click`,()=>{let e=ht?n.classList.contains(`masked`):n.type===`password`;ht?n.classList.toggle(`masked`,!e):n.type=e?`text`:`password`,t.classList.toggle(`on`,e),t.querySelector(`.eye-slash`)?.classList.toggle(`hidden`,!e),t.setAttribute(`aria-label`,e?`Hide password`:`Show password`),n.focus()})})}function vt(e){return w()?!0:e.ownerOnly?S():A(e.permission)}async function $(e){if(!h){e.innerHTML=`<h1>Admin</h1><div class="card"><div class="card-body">Add your Supabase keys in js/config.js first.</div></div>`;return}if(!C()){yt(e);return}let t=[...pt,...mt].filter(vt);t.some(e=>e.id===Q)||(Q=t[0]?.id||``);let n=r(),i=w()?`Master admin`:`${n?.display_name||`Commissioner`}${S()?` · Owner`:``}`;e.innerHTML=`
    <div class="section-head" style="margin-top:0">
      <div><h1 style="margin:0">Admin</h1><div class="muted tiny">${p(i)}</div></div>
      <button class="btn ghost small" id="logout">Sign out</button>
    </div>

    ${t.length?`<div class="tabs" id="admin-tabs">
      ${t.map(e=>`<button data-section="${e.id}" class="${e.id===Q?`on`:``}">${p(e.tab)}</button>`).join(``)}
    </div><div id="admin-body"></div>`:`<div class="card note"><div class="card-body">Your commissioner account is active, but no Admin-screen tools have been assigned. Your permitted inline editing tools are still available on their normal pages.</div></div>`}

    ${w()?`<div class="section-head"><h2>Master password</h2></div>
    <form class="card" id="pw-form">
      <label for="new-pw">New master admin password</label>
      ${gt(`new-pw`,`at least 6 characters`)}
      <div class="row-end"><button class="btn ghost" type="submit">Change password</button></div>
    </form>`:``}
  `;let a=e.querySelector(`#admin-body`),o=()=>{if(!a)return;let e=mt.find(e=>e.id===Q&&vt(e));if(e)return e.render(a);let t=pt.find(e=>e.id===Q&&vt(e)),n=t&&m(t.table);if(!n){a.innerHTML=``;return}return L(a,n)};e.querySelector(`#admin-tabs`)?.addEventListener(`click`,t=>{let n=t.target.closest(`button[data-section]`);n&&(Q=n.dataset.section,e.querySelectorAll(`#admin-tabs button`).forEach(e=>e.classList.toggle(`on`,e.dataset.section===Q)),o())}),e.querySelector(`#logout`).addEventListener(`click`,()=>{F(),j(`Signed out of commissioner access`),$(e)}),_t(e),e.querySelector(`#pw-form`)?.addEventListener(`submit`,async t=>{t.preventDefault();let n=e.querySelector(`#new-pw`);try{await v(n.value),n.value=``,j(`Master password changed`)}catch(e){j(e.message||`Could not change password`,!0)}}),o()}function yt(e){let t=r();e.innerHTML=`
    <h1>Admin</h1>
    ${t?`<form class="card" id="commissioner-login-form">
      <div class="card-title">Commissioner access</div>
      <p class="muted">Signed in as <strong>${p(t.display_name)}</strong>. Enter your personal commissioner PIN.</p>
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
    </form>`,_t(e),e.querySelector(`#commissioner-login-form`)?.addEventListener(`submit`,async t=>{t.preventDefault();let n=t.target.querySelector(`button[type=submit]`);n.disabled=!0;try{await a(e.querySelector(`#commissioner-login-pin`).value)?(j(`Commissioner access unlocked`),$(e)):(j(`Wrong commissioner PIN or access is disabled`,!0),n.disabled=!1)}catch(e){j(e.message||`Commissioner sign in failed`,!0),n.disabled=!1}}),e.querySelector(`#login-form`).addEventListener(`submit`,async t=>{t.preventDefault();let n=t.target.querySelector(`button[type=submit]`);n.disabled=!0;try{await f(e.querySelector(`#pw`).value)?(j(`Master admin unlocked`),$(e)):(j(`Wrong master password`,!0),n.disabled=!1)}catch(e){j(e.message||`Sign in failed`,!0),n.disabled=!1}})}export{$ as render};