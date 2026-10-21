import{Br as e,Hn as t,Kt as n,Ln as r,jr as i}from"./app-core-C8YxUaSl.js";import{mn as a}from"./home-core-Bdt3h-ii.js";import{n as o,r as s}from"./golf-people-DoTjUb7d.js";var c=4e3,l=null,u=null,d=!1;function f(){let e=new URLSearchParams(location.hash.split(`?`)[1]||``);return e.get(`team`)?null:e.get(`id`)}async function p(e){let[t,i,a,s]=await Promise.all([r().from(`golf_outings`).select(`*`).eq(`id`,e).maybeSingle(),r().from(`golf_teams`).select(`*`).eq(`outing_id`,e).order(`sort_order`),r().from(`golf_participants`).select(`*`).eq(`outing_id`,e).order(`sort_order`),n().catch(()=>[])]),c=t.error||i.error||a.error;if(c)throw c;return{outing:t.data,teams:i.data||[],parts:a.data||[],byId:new Map((s||[]).map(e=>[String(e.id),e])),names:o(s)}}var m=(e,t)=>e.byId.get(String(t))?.display_name||`Unknown`,h=(e,t)=>s(t,e.names);function g(e){return[...e.teams].sort((e,t)=>e.draft_order-t.draft_order||e.sort_order-t.sort_order||e.id-t.id)}function _(e){return e.parts.filter(e=>e.pick_number!=null).sort((e,t)=>e.pick_number-t.pick_number)}var v=e=>e.parts.filter(e=>e.team_id==null);function y(e){let t=g(e);if(!t.length||!v(e).length)return null;let n=_(e).length,r=Math.floor(n/t.length),i=n%t.length;return(r%2==0?t:[...t].reverse())[i]}var b=e=>e.teams.length>0&&e.teams.every(e=>e.captain_member_id!=null);async function x(){let e=f();if(!u||!e)return;let n=t(),r=e=>{u.innerHTML=n?e:``},a;try{a=await p(e)}catch(e){r(`<div class="card"><div class="card-body muted">Could not load the draft.
      <span class="tiny">${i(e.message||String(e))}</span></div></div>`);return}if(!(!u||!a.outing)){if(!a.teams.length||a.parts.length<2){u.innerHTML=``;return}if(!Object.prototype.hasOwnProperty.call(a.teams[0],`captain_member_id`)){r(`<div class="card"><div class="card-body muted">Captains and the draft board need one migration:
      run <strong>golf_draft_schema.sql</strong> in the Supabase SQL editor.</div></div>`);return}if(a.outing.team_mode===`random`){u.innerHTML=``;return}u.innerHTML=b(a)?w(a,n):C(a,n)}}async function S(){if(d)return;let e=window.scrollY;await x(),window.scrollTo(0,e)}function C(e,t){let n=new Set(e.teams.map(e=>String(e.captain_member_id)).filter(e=>e!==`null`)),r=g(e),o=(o,s)=>{let c=o.captain_member_id,l=e.parts.filter(e=>e.member_id!=null).filter(e=>!n.has(String(e.member_id))||String(e.member_id)===String(c)).map(t=>`<option value="${t.member_id}" ${String(t.member_id)===String(c)?`selected`:``}>
                     ${i(h(e,t))}</option>`).join(``);return`
      <div class="gd-seat" style="--racer:${i(a(o.color,o.sort_order))}">
        <span class="gd-pos">${s+1}</span>
        <span class="gd-team">${i(o.name||`Team`)}</span>
        ${t?`
          <select class="gd-cap" data-captain="${o.id}" aria-label="Captain of ${i(o.name||`team`)}">
            <option value="">— pick a captain —</option>${l}
          </select>
          <span class="gd-move">
            <button type="button" class="btn ghost small" data-bump="${o.id}" data-dir="-1" ${s===0?`disabled`:``} aria-label="Move up">↑</button>
            <button type="button" class="btn ghost small" data-bump="${o.id}" data-dir="1" ${s===r.length-1?`disabled`:``} aria-label="Move down">↓</button>
          </span>`:`<span class="gd-capname">${c?i(m(e,c)):`no captain yet`}</span>`}
      </div>`},s=e.teams.filter(e=>e.captain_member_id!=null).length;return`
    <section class="card gd-card">
      <div class="card-title-row">
        <div>
          <div class="card-title">Captains and draft order</div>
          <p class="muted tiny">${t?`Name a captain for every team and put them in picking order.`:`${s} of ${e.teams.length} captains named. The board opens when they all are.`}</p>
        </div>
        ${t?`<span class="admin-badge">Organizer</span>`:``}
      </div>
      <div class="gd-seats">${r.map(o).join(``)}</div>
      ${t?`<p class="muted tiny">Order one is the first pick of round one. The draft snakes, so they pick last in round two.</p>`:``}
    </section>`}function w(e,t){let n=y(e),r=_(e),o=v(e),s=g(e),c=s.length?Math.floor(r.length/s.length)+1:1,l=e=>e.pick_number==null?``:`<small>${i(e.pick_number)}</small>`,u=r.length>0,d=t=>{let r=e.parts.filter(e=>String(e.team_id)===String(t.id)),o=r.find(e=>String(e.member_id)===String(t.captain_member_id)),s=r.filter(e=>e!==o).sort((e,t)=>(e.pick_number??1/0)-(t.pick_number??1/0));return`
      <div class="gd-roster ${n&&String(n.id)===String(t.id)?`is-up`:``}"
           style="--racer:${i(a(t.color,t.sort_order))}">
        <div class="gd-roster-head">
          <span class="gd-team">${i(t.name||`Team`)}</span>
          <span class="gd-count">${r.length}</span>
        </div>
        <div class="gd-picks">
          <span class="gd-pick is-cap">${i(m(e,t.captain_member_id))}<small>C</small></span>
          ${s.map(t=>`<span class="gd-pick ${u&&t.pick_number==null?`is-added`:``}">${i(h(e,t))}${l(t)}</span>`).join(``)}
        </div>
      </div>`},f=!n;return`
    <section class="card gd-card" data-collapse="golf-draft" data-collapse-title="The draft"
             data-collapse-badge="${f?`Complete`:`Round ${c}`}"${f?` data-collapse-default="folded"`:``}>
      <div class="card-title-row">
        <div>
          <div class="card-title">The draft</div>
          <p class="muted tiny">${f?`Every player is on a team.`:`Round ${c} · ${o.length} player${o.length===1?``:`s`} left`}</p>
        </div>
        <span class="admin-badge">${f?`Complete`:`Live`}</span>
      </div>

      ${f?``:`
        <div class="gd-clock" style="--racer:${i(a(n.color,n.sort_order))}">
          <span class="gd-clock-lbl">On the clock</span>
          <span class="gd-clock-team">${i(n.name||`Team`)}</span>
          <span class="gd-clock-cap">${i(m(e,n.captain_member_id))} · pick ${r.length+1}</span>
        </div>

        ${t?`
          <div class="gd-pool">
            ${o.map(t=>`
              <button type="button" class="gd-take" data-take="${t.id}">
                ${i(h(e,t))}
              </button>`).join(``)}
          </div>
          <p class="muted tiny">Tap the player ${i(m(e,n.captain_member_id))} calls.</p>`:`<div class="gd-pool is-watching">
            ${o.map(t=>`<span class="gd-take is-flat">${i(h(e,t))}</span>`).join(``)}
          </div>`}
      `}

      <div class="gd-rosters">${s.map(d).join(``)}</div>

      ${t&&r.length?`
        <div class="arena-admin">
          <button type="button" class="btn ghost small" id="gd-undo">Undo pick ${r.length}
            (${i(h(e,r[r.length-1]))})</button>
        </div>`:``}
    </section>`}async function T(e,t){let{data:n,error:r}=await e.select(`id`);if(r)throw r;if(!n||!n.length)throw Error(`The database refused to ${t}. Sign in as admin and try again.`);return n}async function E(e,t,n){let i=e.teams.find(e=>String(e.id)===String(t))?.captain_member_id;if(await T(r().from(`golf_teams`).update({captain_member_id:n||null}).eq(`id`,t),`set that captain`),i&&String(i)!==String(n)){let t=e.parts.find(e=>String(e.member_id)===String(i));t&&await r().from(`golf_participants`).update({team_id:null,pick_number:null,picked_at:null}).eq(`id`,t.id)}if(n){let i=e.parts.find(e=>String(e.member_id)===String(n));i&&await r().from(`golf_participants`).update({team_id:Number(t),pick_number:null,picked_at:null}).eq(`id`,i.id)}}async function D(e,t,n){let i=g(e),a=i.findIndex(e=>String(e.id)===String(t)),o=a+n;if(a<0||o<0||o>=i.length)return;let s=i[a],c=i[o];await T(r().from(`golf_teams`).update({draft_order:o}).eq(`id`,s.id),`reorder the teams`),await r().from(`golf_teams`).update({draft_order:a}).eq(`id`,c.id)}async function O(e,t){let n=y(e);if(!n)return;let i=_(e).length+1;await T(r().from(`golf_participants`).update({team_id:n.id,pick_number:i,picked_at:new Date().toISOString()}).eq(`id`,t).is(`team_id`,null),`record that pick`)}async function k(e){let t=_(e),n=t[t.length-1];n&&await T(r().from(`golf_participants`).update({team_id:null,pick_number:null,picked_at:null}).eq(`id`,n.id),`undo that pick`)}function A(){u.addEventListener(`change`,async e=>{let t=e.target.closest(`[data-captain]`);t&&await j(async e=>E(e,t.dataset.captain,t.value?Number(t.value):null))}),u.addEventListener(`click`,async e=>{let t=e.target.closest(`[data-bump]`),n=e.target.closest(`[data-take]`),r=e.target.closest(`#gd-undo`);if(t)return j(async e=>D(e,t.dataset.bump,Number(t.dataset.dir)));if(n)return n.disabled=!0,j(async e=>O(e,n.dataset.take));if(r)return r.disabled=!0,j(async e=>k(e))})}async function j(t){let n=f();if(!(!n||d)){d=!0;try{await t(await p(n))}catch(t){e(t.message||`That did not save`,!0)}finally{d=!1,await x()}}}function M(){clearInterval(l),l=null,u=null}function N(){let e=()=>{let e=document.querySelector(`#golf-outing .golf-draft-page`);if(!e){u&&M();return}e!==u&&(u=e,A(),x(),clearInterval(l),l=setInterval(()=>{if(!document.body.contains(u))return M();S()},c))};new MutationObserver(e).observe(document.body,{childList:!0,subtree:!0}),e()}document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,N):N();