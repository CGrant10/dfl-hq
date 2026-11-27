import{$ as e,Ct as t,Dt as n,Et as r,G as i,Gt as a,Hr as o,Ir as s,J as c,Jt as l,Kt as u,Lr as d,R as f,Rr as p,Sr as m,St as h,Tr as g,Ut as _,Wn as v,Wr as y,Xt as b,_t as x,gt as S,ht as C,i as w,lt as T,q as E,qr as D,t as O,tn as ee,vt as k,wr as A,xr as j,xt as M,yr as te,yt as ne}from"../app-core-DJ1rYCZP.js";import{$t as N,A as re,E as ie,G as ae,K as oe,Kt as se,S as ce,T as le,Ut as P,W as ue,Zt as de,qt as F,y as fe}from"../home-core-BZBvVLYy.js";import{t as pe}from"../fact-share-CD4i-hPt.js";import{d as me,i as he,t as ge}from"../rivalry-story-model-BR_iiVf4.js";import{a as _e,l as ve,r as ye,u as be}from"../notifications-STON-K5I.js";var{BG:xe,CARD:Se,LINE:Ce,INK:we,MUTED:Te,GOLD:Ee,ACCENT:De,OK:Oe,BRAND_RED:ke,BRAND_YELLOW:Ae}=fe,I=e=>Number.isFinite(Number(e))?Number(e):null,L=e=>I(e)==null?`—`:I(e).toFixed(1);function R(e){let t=I(e);if(t==null)return`—`;let n=[`th`,`st`,`nd`,`rd`],r=t%100;return t+(n[(r-20)%10]||n[r]||n[0])}function z(e){let t=I(e?.run);return t&&t>0?String(t):null}function je({member:e,career:t,extremes:n={},seasonCount:r=0,chipSeasons:i=[]}={}){if(!e)return null;let a=t||{},o=I(a.wins)??0,s=I(a.losses)??0,c=I(a.ties)??0,l=o+s+c,u=I(a.winPct)??(l?(o+c/2)/l:0),d=I(a.titles)??0,f=I(a.playoffs)??0,p=I(a.runnerUps)??0,m=i.length,h=[];h.push([`Championships`,String(d)]),h.push([`Playoff trips`,String(f)]),p&&h.push([`Runner-ups`,String(p)]),n.bestSeason&&h.push([`Best finish`,R(n.bestSeason.rank)]),n.highWeek&&h.push([`Nuclear week`,L(n.highWeek.score)]);let g=z(n.streak?.win);g&&h.push([`Win streak`,`${g} straight`]);let _=[];m&&_.push([`Chip Eater`,m>1?`${m}×`:String(i[0])]),n.worstSeason&&_.push([`Basement visit`,R(n.worstSeason.rank)]),n.lowWeek&&_.push([`Crime of a week`,L(n.lowWeek.score)]);let v=z(n.streak?.loss);v&&_.push([`Loss spiral`,`${v} straight`]),!m&&p&&_.push([`Almost had it`,`${p} runner-up${p===1?``:`s`}`]);let y={who:e.display_name||`DFL`,team:(e.team_name||``).trim(),seasons:j(I(r)??0),record:`${o}-${s}${c?`-${c}`:``}`,wins:o,losses:s,ties:c,games:l,winPct:u,points:Math.round(I(a.pointsFor)??0).toLocaleString(),avgFinish:I(a.avgFinish)==null?`—`:L(a.avgFinish),titles:d,playoffs:f,runnerUps:p,chips:m,trophyCase:h.slice(0,5),crimeScene:_.slice(0,5)};return y.verdict=Me(y,n),y}function Me(e,t={}){let n=I(t.streak?.loss?.run)??0,r=I(t.streak?.win?.run)??0,i=I(t.worstSeason?.rank);return e.titles>0&&e.chips>0?`Has lived at both ends of the standings. Ring on one hand, hot chip in the other.`:e.chips>=2?`Multiple trips to the basement. At this point the hot chip knows the address.`:e.titles>=3?`Dynasty credentials. Annoying as hell, but the hardware makes the argument for them.`:e.titles>=1&&e.winPct>=.55?`The shit talk has documentation: winning record, playoff damage, and a ring to point at.`:n>=6?`Once lost ${n} straight. That is not a slump; that is a subscription plan.`:i!=null&&i>=10?`Has finished ${R(i)}. The standings had to add a basement level.`:e.games>=20&&e.winPct<.4?`The résumé has seen some shit. The group chat should keep the screenshots handy.`:r>=6?`Put together ${r} straight wins once. For a while, everybody else was just schedule filler.`:e.playoffs&&!e.titles&&e.runnerUps?`Knows the route to the playoffs. Still looking for the last damn turn.`:e.winPct>=.55?`Annoyingly effective. The record gives the trash talk legal standing.`:`Dangerous enough to talk shit. Inconsistent enough that the receipts stay interesting.`}function B(e){if(!e)return``;let t=[`${e.who} — ${e.record} in ${e.seasons} DFL season${e.seasons===1?``:`s`}`];return e.titles&&t.push(`${e.titles} title${e.titles===1?``:`s`}`),e.chips&&t.push(`${e.chips}× Chip Eater`),`${t.join(` · `)}. ${e.verdict}`}function Ne(e){return ce(re(e))}async function Pe(e){let t=je(e);if(!t)return`none`;let n=Ne(t),r=t.who.toLowerCase().replace(/[^a-z0-9]+/g,`-`),i=await le(n,`dfl-${r}.png`,{title:`${t.who} · DFL HQ`,text:B(t)});return i===`none`&&await ie({title:`${t.who} · DFL HQ`,text:B(t)}),i}var V=500,Fe=S.avatar.maxPx,H=C;function U(e,t,n,r){let i=g({team_name:r.currentTeam||e.team_name||e.display_name,identity:{...e,profile_image:t}},{className:`avatar ph-team-mark`});return n?`<div class="ph-avatar">
    ${i}
    <button type="button" class="ph-photo-btn" data-photo-pick
            title="${t?`Change photo`:`Add a photo`}"
            aria-label="${t?`Change photo`:`Add a photo`}">${_(`camera`,{size:14})}</button>
    <input type="file" accept="image/png,image/jpeg,image/webp" hidden data-photo-file>
  </div>`:`<div class="ph-avatar">${i}</div>`}function Ie(e){let t=[],n=e.joined_year||e.first_season;return n&&t.push(`<div><b>${p(n)}</b><small>Debut</small></div>`),`<div class="ph-record">${t.join(``)}<div data-chip-slot></div></div>`}function W(e,t){let n=t.currentTeam||e.display_name,r=[];return t.currentTeam&&e.display_name&&t.currentTeam!==e.display_name&&r.push(p(e.display_name)),t.currentTeam&&t.currentSeason&&r.push(`${p(t.currentSeason)} team`),`<div class="ph-id">
    <h1 class="profile-name">${p(n)}</h1>
    ${r.length?`<div class="ph-handle muted">${r.join(` · `)}</div>`:``}
  </div>`}function Le(e,t,n){let r=String(e.bio||``).trim();return`<section class="card profile-head accent">
    <div class="ph-top">
      ${U(e,e.profile_image,t,n)}
      ${W(e,n)}
      ${t?`<button type="button" class="btn ghost small ph-edit" data-dfl-edit>Edit</button>`:``}
    </div>
    ${ae(e)}
    ${Ie(e)}
    ${r?`<p class="dfl-bio">${p(r)}</p>`:``}
    ${n.actions?`<div class="row ph-actions">${n.actions}</div>`:``}
  </section>`}function Re(e,t,n){let r=t.image===void 0?e.profile_image:t.image;return`<section class="card profile-head accent is-editing">
    <div class="ph-top">
      ${U({...e,profile_photo_source:t.source},r,!0,n)}
      ${W(e,n)}
      <button type="button" class="btn ghost small ph-edit" data-dfl-cancel>Cancel</button>
    </div>

    <fieldset class="ph-photo-choice"><legend>Profile photo</legend><div>
      ${[`sleeper`,`dfl`].map(n=>{let i=n===`dfl`?!!r:!!(e.sleeper_team_image||e.sleeper_profile_image),a=t.source===n;return`<label class="ph-photo-option${a?` is-selected`:``}${i?``:` is-unavailable`}">
          <input type="radio" name="profile-photo-source" data-photo-source="${n}" value="${n}"${a?` checked`:``}${i?``:` disabled`}>
          ${g(n===`dfl`?{...e,profile_image:r,profile_photo_source:n,sleeper_team_image:null,sleeper_profile_image:null}:{...e,profile_image:null,profile_photo_source:n})}<span>${n===`sleeper`?`Sleeper`:`DFL upload`}</span>
        </label>`}).join(``)}
    </div></fieldset>
    ${t.needsPin?`<label class="dfl-field"><span class="u-label">Profile PIN</span><input type="password" inputmode="numeric" autocomplete="off" data-photo-pin maxlength="12" aria-label="Profile PIN"><span role="alert">Enter your profile PIN to save.</span></label>`:``}
    <p class="muted tiny ph-photo-note">
      ${r?`Photo shrunk to ${Fe}px. ${p(x(r))}.`:`Tap the camera to add a photo.`}

    </p>

    ${r?`<button type="button" class="linkbtn" data-photo-clear>Remove DFL photo</button>`:``}
    <div class="dfl-field">
      <label class="u-label" for="dfl-bio">About me</label>
      <textarea id="dfl-bio" data-bio maxlength="${V}" rows="4"
                placeholder="Bio">${p(t.bio)}</textarea>
      <span class="muted tiny"><span data-bio-count>${t.bio.length}</span>/${V}</span>
    </div>

    <div data-profile-identity-editor></div>

    <div class="row-end"><button type="button" class="btn" data-dfl-save>Save</button></div>
  </section>`}async function ze(e){let t=e.sleeper_user_id?await F().catch(()=>null):null,n=t&&!t.error?P(t,e.sleeper_user_id):null,r=[];if(e.sleeper_user_id){let{data:t}=await v().from(`sleeper_leagues`).select(`season,last_place_user_id`).eq(`last_place_user_id`,e.sleeper_user_id).order(`season`);r=(t||[]).map(e=>String(e.season))}return{career:n,extremes:n,chipSeasons:r}}function Be(e,t,n,r,i={}){let a=e.querySelector(`[data-dfl-host]`);if(!a)return;let o=!1,s=null,c=()=>({bio:String(t.bio||``).trim(),image:void 0,source:t.profile_photo_source!==`dfl`&&(t.sleeper_team_image||t.sleeper_profile_image)?`sleeper`:t.profile_image?`dfl`:`sleeper`,pin:null}),l=async()=>{let e=a.querySelector(`[data-profile-identity-editor]`);if(e)try{let n=await ze(t);e.innerHTML=ue(t,n.career,n.extremes,n.chipSeasons),oe(e,t,r)}catch{e.innerHTML=``}},d=()=>{a.innerHTML=o?Re(t,s,i):Le(t,n,i),o&&l(),i.onRepaint?.()};d(),a.addEventListener(`input`,e=>{if(s&&(e.target.matches(`[data-photo-pin]`)&&(s.pin=e.target.value),e.target.matches(`[data-bio]`))){s.bio=e.target.value;let t=a.querySelector(`[data-bio-count]`);t&&(t.textContent=String(s.bio.length))}}),a.addEventListener(`change`,async e=>{if(e.target.matches(`[data-photo-source]`)&&s){s.source=e.target.value;let n=s.image===void 0?t.profile_image:s.image;a.querySelector(`.ph-avatar`).outerHTML=U({...t,profile_photo_source:s.source},n,!0,i),a.querySelectorAll(`.ph-photo-option`).forEach(e=>e.classList.toggle(`is-selected`,e.querySelector(`[data-photo-source]`).value===s.source));return}if(!e.target.matches(`[data-photo-file]`))return;let n=e.target.files?.[0];if(n){if(!/^image\//.test(n.type)){D(`Pick an image file`,!0);return}if(n.size>H){D(`That image is over ${k(H)}`,!0);return}s||=(o=!0,c());try{s.image=await T(n,`avatar`),s.source=`dfl`,d(),D(`Photo ready (${x(s.image)}) — press Save`)}catch(e){D(e.message||`Could not read that image`,!0)}}}),a.addEventListener(`click`,async e=>{if(e.target.closest(`[data-dfl-edit]`)){o=!0,s=c(),d();return}if(e.target.closest(`[data-dfl-cancel]`)){o=!1,s=null,d();return}if(e.target.closest(`[data-photo-pick]`)){a.querySelector(`[data-photo-file]`)?.click();return}if(!s)return;if(e.target.closest(`[data-photo-clear]`)){s.image=null,s.source=`sleeper`,d();return}let n=e.target.closest(`[data-dfl-save]`);if(n){n.disabled=!0;try{if(String(u())!==String(t.id))throw Error(`Your selected member changed. Reopen Profile.`);let e={...s},{verifiedPin:n,markMemberUnlocked:i}=await m(async()=>{let{verifiedPin:e,markMemberUnlocked:t}=await import(`../app-core-DJ1rYCZP.js`).then(e=>e.Y);return{verifiedPin:e,markMemberUnlocked:t}},[]);if(String(u())!==String(t.id))throw Error(`Your selected member changed. Reopen Profile.`);let{data:a,error:c}=await v().rpc(`dfl_save_profile`,{p_source:e.source,p_pin:e.pin||n(t.id)||null,p_bio:e.bio,p_image:e.image===void 0||e.image===null?null:e.image,p_clear_image:e.image===null});if(c)throw c;if(String(u())!==String(t.id))return;if(!Number(a))throw Error(`Pick your name again from the top bar and retry.`);e.pin&&i?.(t.id,e.pin),D(`Profile saved`),o=!1,s=null,await b(),(await m(()=>import(`../home-core-BZBvVLYy.js`).then(e=>e.yi),[])).clearAnalyzerDataCache?.(),window.dispatchEvent(new Event(`dfl:profile-updated`)),await r()}catch(e){e.code===`42501`&&s&&(s.needsPin=!0,d(),a.querySelector(`[data-photo-pin]`)?.focus()),D(e.message||`Could not save`,!0),n.disabled=!1}}})}var Ve=`[data-profile-notifications-slot]`;function He(e,t){if(!t.supported)return`<div class="card">
      <h3 class="card-heading">Notifications</h3>
      <p class="muted tiny">${p(t.reason)}</p>
    </div>`;let n=e.enabled&&!!e.subscription,r=Notification.permission===`denied`;return`<div class="card">
    <h3 class="card-heading">Notifications</h3>
    <p class="muted tiny">${n?`On for this device. League alerts reach this phone even when DFL HQ is closed.`:r?`Blocked in this browser's settings. Allow notifications for DFL HQ there, then come back.`:`Off for this device. Turn them on for trades, polls, fee reminders and commissioner notes.`}</p>
    <div class="row-end">
      ${n?`<a class="btn ghost small" href="#/notifications">Choose which ones</a>`:``}
      ${r&&!n?``:`<button type="button" class="btn ${n?`ghost`:``} small" data-profile-push="${n?`off`:`on`}">${n?`Turn off on this device`:`Enable notifications`}</button>`}
    </div>
  </div>`}async function G(e){let t=ve(),n={enabled:!1,subscription:null};if(t.supported)try{n=await be()}catch{}e.innerHTML=He(n,t)}async function Ue(e){let t=e.querySelector(Ve);t&&(await G(t),t.addEventListener(`click`,async e=>{let n=e.target.closest(`[data-profile-push]`);if(!n)return;let r=n.dataset.profilePush===`on`;n.disabled=!0;try{r?await _e():await ye(),D(r?`Notifications enabled on this device`:`Notifications turned off on this device`),await G(t)}catch(e){D(e.message||`Could not change notifications`,!0),n.disabled=!1}}))}async function K(t){let n=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`id`),r;try{r=await l()}catch(e){t.innerHTML=`<h1>Profile</h1>`+d(e)+`<div class="card"><div class="card-body muted">If the members table is missing, run
       <strong>members_schema.sql</strong> in Supabase.</div></div>`;return}let i=a(),o=n?r.find(e=>String(e.id)===String(n)):i;if(!o){t.innerHTML=`<h1>Profile</h1>${s(`No profile selected.`)}`;return}let c=i&&String(i.id)===String(o.id),[u,m,h,g,_]=await Promise.all([o.sleeper_user_id?v().from(`sleeper_standings`).select(`*`).eq(`sleeper_user_id`,o.sleeper_user_id):{data:[]},v().from(`sleeper_leagues`).select(`season, champion_user_id, runner_up_user_id`),v().from(`keepers`).select(`*`),v().from(`finance_payments`).select(`*`),o.sleeper_user_id?v().from(`sleeper_users`).select(`*`).eq(`sleeper_user_id`,o.sleeper_user_id).maybeSingle():{data:null}]),y=o.sleeper_user_id?await F().catch(()=>null):null,x=y&&!y.error?P(y,o.sleeper_user_id):null,S=y&&!y.error?se(y,o.sleeper_user_id):[],C=y&&!y.error?de(y):null,w=o.team_name||_?.data?.team_name||``,T=(u.data||[]).sort((e,t)=>t.season-e.season),E=We(T,m.data||[],o.sleeper_user_id),O=x?{...o,championships:x.titles.length}:o;x&&(E.titles=x.titles.length,E.runnerUps=x.seconds.length);let k=(h.data||[]).filter(e=>String(ee(e.team,r,{member_id:e.member_id})?.id)===String(o.id)),A=(g.data||[]).filter(e=>rt(e.owner_name,o.display_name)||String(ee(e.team_name,r,{member_id:e.member_id})?.id)===String(o.id)).sort((e,t)=>t.season-e.season),j=[he(),qe(o),Je(T,m.data||[],o.sleeper_user_id,w),C?ot(S,C,r):``,Ye(k),Xe(A)].filter(Boolean);t.innerHTML=`
    <div id="profile-wrap">
      <div data-dfl-host></div>
      ${o.notes?`<div class="card"><h3 class="card-heading">Notes</h3>
                          <div class="card-body">${p(o.notes)}</div></div>`:``}
      ${Ge(E,T.length,!!x)}
      ${x?it(x):``}
      ${x&&C?at(x,C,w):``}
      ${tt(r,o)}
      ${j.length?`<h2 class="section-title">Record &amp; reference</h2>`:``}
      ${j.join(``)}
      ${c?`<details class="profile-settings" id="profile-settings"><summary><span><small>YOUR PROFILE</small><strong>Settings &amp; privacy</strong></span><em>Golf name, appearance, notifications and access</em></summary><div class="profile-settings-body">${Ze(o)}${$e()}<div data-profile-notifications-slot></div><div data-profile-privacy-slot></div><div class="profile-account-actions"><button type="button" class="btn ghost small" id="switch-member">Sign out / Switch</button></div></div></details>`:``}
    </div>
  `,c&&Ue(t),Be(t,O,c,()=>K(t),{currentTeam:w,currentSeason:_?.data?.current_season,actions:c?``:`<a class="btn ghost small" href="#/profile">Back to my profile</a>`,onRepaint:()=>{e(t)}}),t.querySelectorAll(`[data-share-rivalry-owner]`).forEach(e=>e.addEventListener(`click`,()=>{let t=S.find(t=>String(t.user)===e.dataset.shareRivalryOwner);if(!t||!C)return;let n=ge({left:C(o.sleeper_user_id).label,right:C(t.user).label,series:t});Promise.resolve(pe(n)).then(e=>{e===`failed`&&D(`Could not share the rivalry stats`,!0)})})),t.querySelector(`[data-share-profile]`)?.addEventListener(`click`,async e=>{let n=e.currentTarget;n.disabled=!0;try{await Pe({member:o,career:E,extremes:x||{},seasonCount:T.length,chipSeasons:(t.querySelector(`[data-chip-eaters="badge"]`)?.title||``).split(`,`).map(e=>e.trim()).filter(Boolean)})}catch(e){D(e?.message||`Could not build that card`,!0)}finally{n.disabled=!1}}),c&&(et(t),Qe(t,o)),me(t,o.id),f(t.querySelector(`#profile-wrap`),async()=>{await b(),K(t)}),t.addEventListener(`click`,e=>{e.target.closest(`#switch-member`)&&window.dispatchEvent(new CustomEvent(`dfl:pick-member`,{detail:{forgetMemberId:o.id}}))})}function q(e,t,n){return n==null?[]:e.filter(e=>e[t]!=null&&e[t]===n)}function We(e,t,n){let r=Y(e,`wins`),i=Y(e,`losses`),a=Y(e,`ties`),o=r+i+a,s=e.filter(e=>e.rank!=null);return{wins:r,losses:i,ties:a,winPct:o?(r+a/2)/o:0,pointsFor:Y(e,`points_for`),avgFinish:s.length?s.reduce((e,t)=>e+t.rank,0)/s.length:null,playoffs:e.filter(e=>e.made_playoffs).length,titles:q(t,`champion_user_id`,n).length,runnerUps:q(t,`runner_up_user_id`,n).length}}function Ge(e,t,n=!1){return t?`
    <section class="card profile-career-card">
      <div class="card-title-row">
        <div class="card-title">Career</div>
        <button type="button" class="btn ghost small" data-share-profile>Share card</button>
      </div>
      <div class="career-overview">
        <div class="career-record">
          <span>All-time record</span>
          <strong>${e.wins}<i>–</i>${e.losses}${e.ties?`<i>–</i>${e.ties}`:``}</strong>
          <small>${t} season${t===1?``:`s`} · ${(e.winPct*100).toFixed(1)}% win rate</small>
        </div>
        <div class="career-outcomes${n?` is-playoffs`:``}" aria-label="Career accomplishments">
          ${n?``:`<div><strong>${e.titles}</strong><span>Titles</span></div><div><strong>${e.runnerUps}</strong><span>Runner-up</span></div>`}
          <div><strong>${e.playoffs}</strong><span>Playoffs</span></div>
        </div>
      </div>
      <dl class="career-support">
        <div><dt>Points scored</dt><dd>${Math.round(e.pointsFor).toLocaleString()}</dd></div>
        <div><dt>Average finish</dt><dd>${e.avgFinish?e.avgFinish.toFixed(1):`—`}</dd></div>
      </dl>
    </section>`:`<div class="card"><div class="card-title">Career</div>${s(`No Sleeper history linked.`)}</div>`}var Ke=5;function qe(e){let t=(e.awards||``).split(`
`).map(e=>e.trim()).filter(Boolean);if(!t.length)return``;let n=t.length>=Ke;return`
    <div class="card" data-collapse="profile-awards" data-collapse-title="Awards"
         data-collapse-badge="${t.length}"${n?` data-collapse-default="folded"`:``}>
      <ul class="tidy">${t.map(e=>`<li>${p(e)}</li>`).join(``)}</ul>
    </div>`}function Je(e,t,n,r){if(!e.length)return``;let i=new Set(q(t,`champion_user_id`,n).map(e=>e.season)),a=new Set(q(t,`runner_up_user_id`,n).map(e=>e.season));return`
    <div class="card" data-collapse="profile-history" data-collapse-default="folded"
         data-collapse-title="League history"
         data-collapse-badge="${e.length} season${e.length===1?``:`s`}">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr>
            <th>Season</th><th>Team</th><th>Record</th>
            <th class="num">Points</th><th>Finish</th>
          </tr></thead>
          <tbody>
            ${e.map(e=>`
              <tr>
                <td>${p(e.season)}</td>
                <td class="muted">${p(r||e.team_name||`—`)}</td>
                <td>${e.wins}-${e.losses}${e.ties?`-`+e.ties:``}</td>
                <td class="num">${Math.round(e.points_for).toLocaleString()}</td>
                <td>
                  ${e.rank??`—`}
                  ${i.has(e.season)?`<span class="pill green">champion</span>`:``}
                  ${a.has(e.season)?`<span class="pill">runner up</span>`:``}
                  ${!i.has(e.season)&&e.made_playoffs?`<span class="pill grey">playoffs</span>`:``}
                </td>
              </tr>`).join(``)}
          </tbody>
        </table>
      </div>
    </div>`}function Ye(e){if(!e.length)return``;let t=[...o(e,`year`).entries()].sort((e,t)=>t[0]-e[0]);return`
    <div class="card" data-collapse="profile-keepers" data-collapse-default="folded"
         data-collapse-title="Keepers" data-collapse-badge="${e.length}">
      ${t.map(([e,t])=>`
        <div class="subcard">
          <strong>${p(e)}</strong>
          <ul class="tidy">
            ${t.map(e=>`<li>${p(e.player)}${e.round_cost==null?``:` <span class="muted">— round ${p(e.round_cost)}</span>`}</li>`).join(``)}
          </ul>
        </div>`).join(``)}
    </div>`}function Xe(e){if(!e.length)return``;let t=e.filter(e=>Number(e.amount_paid||0)<Number(e.amount_due||0)).length;return`
    <div class="card" data-collapse="profile-dues" data-collapse-default="folded"
         data-collapse-title="Financial status"
         data-collapse-badge="${t?`${t} due`:`Settled`}">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Season</th><th class="num">Due</th><th class="num">Paid</th><th>Status</th></tr></thead>
          <tbody>
            ${e.map(e=>{let t=Number(e.amount_due||0),n=Number(e.amount_paid||0),r=n>=t&&t>0?[`Paid`,`green`]:n>0?[`Partial`,`warn`]:[`Unpaid`,`red`];return`
                <tr>
                  <td>${p(e.season)}</td>
                  <td class="num">${y(t)}</td>
                  <td class="num">${y(n)}</td>
                  <td><span class="pill ${r[1]}">${r[0]}</span></td>
                </tr>`}).join(``)}
          </tbody>
        </table>
      </div>
    </div>`}function Ze(e){let t=String(e.golf_name||``).trim();return`
    <div class="card">
      <div class="card-title">Your golf name</div>
      <p class="muted tiny">What the scorecards, the leaderboard and the shared
        cards call you. Your DFL name, your Sleeper account and all of your
        fantasy history are untouched.</p>
      <form class="golfname-form" data-golfname>
        <label for="golf-name-input">Golf name</label>
        <div class="golfname-row">
          <input id="golf-name-input" name="golfname" type="text" maxlength="40"
                 autocomplete="off" placeholder="${p(e.display_name)}" value="${p(t)}">
          <button class="btn small" type="submit">Save</button>
        </div>
        <p class="muted tiny">Leave it blank to go back to <strong>${p(e.display_name)}</strong>.</p>
      </form>
    </div>`}function Qe(e,t){let n=e.querySelector(`[data-golfname]`);n&&n.addEventListener(`submit`,async t=>{t.preventDefault();let r=n.golfname.value.trim(),i=n.querySelector(`button[type=submit]`);i.disabled=!0;try{let{data:t,error:n}=await v().rpc(`dfl_set_golf_name`,{p_name:r});if(n)throw n;if(!t)throw Error(`Pick your name in the top right first.`);await b().catch(()=>{}),D(r?`Golf calls you ${r}`:`Back to your DFL name`),K(e)}catch(e){D(/function|does not exist/i.test(e.message||``)?`Run golf_identity_schema.sql in Supabase`:e.message||`Could not save that name`,!0),i.disabled=!1}})}function J(){let e=n();return e===`system`?`Following your phone, which is ${h(ne())} right now.`:M(e)?`${h(e)} colours, on a dark palette.`:`Always ${h(e)} on this device.`}function $e(){let e=n();return`
    <div class="card">
      <h3 class="card-heading">Appearance</h3>
      <div class="modebar" id="mode-pick">
        ${t().map(t=>`
          <button type="button" class="mode-opt ${t.id===e?`is-on`:``}"
                  data-mode-pick="${t.id}" aria-pressed="${t.id===e}">${p(t.name)}</button>`).join(``)}
      </div>
      <p class="muted tiny" id="mode-note">${p(J())}</p>
      ${M(e)?`<p class="muted tiny">Wearing ${p(h(e))} colours.
        Change that with your favourite club at the top of this page.</p>`:``}
      ${O()}
    </div>`}function et(e){let t=e.querySelector(`#mode-pick`)?.closest(`.card`);t&&(t.addEventListener(`click`,i=>{let a=i.target.closest(`[data-mode-pick]`);if(!a)return;let o=a.dataset.modePick;r(o);let s=n();t.querySelectorAll(`[data-mode-pick]`).forEach(e=>{let t=e.dataset.modePick===s;e.classList.contains(`tt-mine`)||(e.classList.toggle(`is-on`,t),e.hasAttribute(`aria-checked`)?e.setAttribute(`aria-checked`,String(t)):e.setAttribute(`aria-pressed`,String(t)))});let c=e.querySelector(`#mode-note`);c&&(c.textContent=J())}),w(t))}function tt(e,t){let n=e.filter(e=>e.id!==t.id);return n.length?`
    <nav class="profile-member-switch" aria-label="Browse member profiles">
      <div class="profile-member-switch-head"><strong>Browse members</strong><small>${n.length} profiles</small></div>
      <div class="chiprow">
        ${n.map(e=>`<a class="chip" href="#/profile?id=${e.id}">${p(e.display_name)}</a>`).join(``)}
      </div>
    </nav>`:``}var nt=/^(—|-|n\/a|)$/i;function Y(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}function rt(e,t){return!!e&&!!t&&String(e).trim().toLowerCase()===String(t).trim().toLowerCase()}function it(e){return!e.titles.length&&!e.seconds.length?``:`
    <section class="cabinet" aria-label="Trophy cabinet">
      ${e.titles.length?`
        <div class="cab-row">
          <svg class="ico-sm" aria-hidden="true"><use href="#i-trophy"></use></svg>
          <b class="cab-n">${e.titles.length}</b>
          <span class="cab-l">${e.titles.length===1?`Championship`:`Championships`}</span>
          <span class="cab-years">${e.titles.map(e=>`<span class="cab-year">${p(e)}</span>`).join(``)}</span>
        </div>`:``}
      ${e.seconds.length?`
        <div class="cab-row is-second">
          <svg class="ico-sm" aria-hidden="true"><use href="#i-medal"></use></svg>
          <b class="cab-n">${e.seconds.length}</b>
          <span class="cab-l">Runner-up</span>
          <span class="cab-years">${e.seconds.map(e=>`<span class="cab-year">${p(e)}</span>`).join(``)}</span>
        </div>`:``}
    </section>`}function at(e,t,n){let r={seasons:[],scoring:[],streaks:[]},i=e=>String(n||e.team_name||``).trim();e.bestSeason&&r.seasons.push(X(`Best season`,Z(e.bestSeason.rank),i(e.bestSeason),`${e.bestSeason.season} · ${e.bestSeason.wins}-${e.bestSeason.losses}${e.bestSeason.ties?`-`+e.bestSeason.ties:``}`)),e.worstSeason&&e.bestSeason&&e.worstSeason.season!==e.bestSeason.season&&r.seasons.push(X(`Worst season`,Z(e.worstSeason.rank),i(e.worstSeason),`${e.worstSeason.season} · ${e.worstSeason.wins}-${e.worstSeason.losses}${e.worstSeason.ties?`-`+e.worstSeason.ties:``}`)),e.highWeek&&r.scoring.push(X(`Highest week`,e.highWeek.score.toFixed(2),``,`${e.highWeek.season} · Week ${e.highWeek.week}`)),e.lowWeek&&e.lowWeek!==e.highWeek&&r.scoring.push(X(`Lowest week`,e.lowWeek.score.toFixed(2),``,`${e.lowWeek.season} · Week ${e.lowWeek.week}`)),e.streak.win&&e.streak.win.run>=3&&r.streaks.push(X(`Longest win streak`,`${e.streak.win.run} weeks`,``,N(e.streak.win.from,e.streak.win.to))),e.streak.loss&&e.streak.loss.run>=3&&r.streaks.push(X(`Longest slide`,`${e.streak.loss.run} weeks`,``,N(e.streak.loss.from,e.streak.loss.to)));let a=[[`Seasons`,r.seasons],[`Scoring`,r.scoring],[`Streaks`,r.streaks]].filter(([,e])=>e.length);return a.length?`
    <h2 class="section-title">Career highlights</h2>
    <section class="card career-highlights">
      ${a.map(([e,t])=>`<div class="career-highlight-group"><h3>${e}</h3>${t.join(``)}</div>`).join(``)}
    </section>`:``}function X(e,t,n,r){let i=[r,n].filter(Boolean).join(` · `);return`
    <div class="career-moment">
      <span><b>${p(e)}</b>${i?`<small>${p(i)}</small>`:``}</span>
      <strong class="${nt.test(String(t??``).trim())?`is-empty`:``}">${p(t)}</strong>
    </div>`}function Z(e){if(e==null)return`—`;let t=e%100;return t>=11&&t<=13?`${e}th`:e+([`th`,`st`,`nd`,`rd`][e%10]||`th`)}function ot(e,t,n){if(!e.length)return``;let r=new Map(n.map(e=>[e.sleeper_user_id,e]));return`
    <div class="card" data-collapse="profile-h2h" data-collapse-default="folded"
         data-collapse-title="Head to head"
         data-collapse-badge="${e.length} opponent${e.length===1?``:`s`}">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr>
            <th>Opponent</th><th>Record</th><th>Point edge</th><th class="num">Met</th><th>Last</th>
          </tr></thead>
          <tbody>
            ${e.map(e=>{let n=t(e.user),i=r.get(e.user),a=e.meetings>=8&&e.wins===e.losses,o=e.meetings>=5&&e.wins===0;return`
                <tr>
                  <td class="profile-rival-team">
                    ${i?`<a href="#/profile?id=${i.id}">${A({team_name:n.label,ownerName:i.display_name,identity:i},{meta:e.streak?`${e.streak.won?`Won`:`Lost`} last ${e.streak.count}`:`Series history`,compact:!0})}</a>`:p(n.label)}
                    ${a?`<span class="pill warn tiny">dead level</span>`:``}
                    ${o?`<span class="pill red tiny">never beaten them</span>`:``}
                    <button type="button" class="btn ghost small" data-share-rivalry-owner="${p(e.user)}" aria-label="Share rivalry stats against ${p(n.label)}">Share rivalry stats</button>
                  </td>
                  <td>${e.wins}-${e.losses}${e.ties?`-`+e.ties:``}</td>
                  <td class="${e.differential>0?`good`:e.differential<0?`bad`:`muted`}">${e.differential>0?`+`:``}${e.differential.toFixed(1)}<small class="rival-avg">${e.averageMargin>0?`+`:``}${e.averageMargin.toFixed(1)}/game</small></td>
                  <td class="num">${e.meetings}</td>
                  <td class="muted tiny">${e.last?`${e.last.season} Wk ${e.last.week} · ${e.last.won?`won`:`lost`} ${e.last.mine.toFixed(1)}–${e.last.theirs.toFixed(1)}`:`—`}</td>
                </tr>`}).join(``)}
          </tbody>
        </table>
      </div>
      <div class="card-meta">Every meeting on record, ${p(te)} onward.</div>
    </div>`}var st=e=>E(e),ct=(e,t=null,n)=>c(e,t,n),lt=e=>i(e),Q=(e,t,n=!0)=>`<input id="${e}" name="${t}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" minlength="4" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" style="-webkit-text-security:disc" ${n?`required`:``}>`;async function ut(){let e=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`id`),t=await l(),n=a();return e?t.find(t=>String(t.id)===String(e)):n}async function dt(e){let{data:t,error:n}=await v().rpc(`profile_lock_status`,{target_member_id:Number(e)});if(n)throw n;return!!t}function ft(e){let t=String(e?.code||``),n=String(e?.message||``).toLowerCase();return t===`PGRST202`||t===`42883`||n.includes(`profile_lock_status`)&&n.includes(`not find`)}function pt(e,t,{statusUnknown:n=!1}={}){e.innerHTML=`<div id="profile-lock-gate"><div class="pin-panel"><span class="pin-mark">${_(`lock`,{size:24})}</span><h1>${n?`Unlock profile`:`Profile locked`}</h1><p class="muted">${n?`We couldn’t confirm the lock after changing views. Enter your PIN or try the check again.`:`${p(t.display_name)} keeps this one behind a PIN.`}</p><form id="profile-unlock-form" autocomplete="off"><label for="profile-unlock-pin">Profile PIN</label>${Q(`profile-unlock-pin`,`dfl-profile-unlock`).replace(`<input `,`<input class="pin-input" `)}<label class="access-trust"><input type="checkbox" data-trust-device><span><strong>Stay unlocked on this device</strong><small>Skip this PIN on this browser until you switch profiles. Use only on your own device.</small></span></label><div class="row-end"><a class="btn ghost" href="#/home">Back</a>${n?`<button class="btn ghost" type="button" id="profile-lock-retry">Retry</button>`:``}<button class="btn" type="submit">Unlock profile</button></div></form><p class="muted tiny pin-note">Forgot it? A DFL Owner can reset the lock, but nobody can read the PIN.</p></div></div>`;let r=e.querySelector(`#profile-unlock-form`),i=e.querySelector(`#profile-unlock-pin`);i?.addEventListener(`input`,()=>{i.value=i.value.replace(/\D/g,``).slice(0,6)}),e.querySelector(`#profile-lock-retry`)?.addEventListener(`click`,()=>$(e)),setTimeout(()=>i?.focus(),0),r?.addEventListener(`submit`,async n=>{n.preventDefault();let a=r.querySelector(`button[type=submit]`),o=!!r.querySelector(`[data-trust-device]`)?.checked;a.disabled=!0;try{let{data:n,error:r}=await v().rpc(`profile_verify_pin`,{target_member_id:Number(t.id),attempted_pin:i.value});if(r)throw r;if(n!==!0)throw Error(`Wrong profile PIN`);ct(t.id,i.value,{rememberDevice:o}),D(o?`Profile unlocked on this device`:`Profile unlocked`),$(e)}catch(e){D(e.message||`Could not unlock profile`,!0),a.disabled=!1,i.select()}})}function mt(e,t,n){return n?`<div class="card" data-profile-lock-settings><div class="card-title">Profile lock</div><p class="muted tiny">Optional 4–6 digit PIN for using DFL HQ as you. You can trust your personal device when you unlock.</p><form id="profile-lock-form" autocomplete="off">${t?`<label for="profile-current-pin">Current PIN</label>${Q(`profile-current-pin`,`dfl-current-pin`)}`:``}<label for="profile-new-pin">${t?`New PIN`:`Choose a PIN`}</label>${Q(`profile-new-pin`,`dfl-new-pin`)}<div class="row-end">${t?`<button type="button" class="btn danger ghost" id="profile-disable-lock">Turn lock off</button>`:``}<button type="submit" class="btn">${t?`Change PIN`:`Turn lock on`}</button></div></form></div>`:`<div class="card note"><div class="card-title">Profile lock</div><div class="card-body muted">Profile PIN setup is ready in the app. Run <strong>profile_lock_schema.sql</strong> in Supabase to turn it on.</div></div>`}function ht(e,t,n){let r=e.querySelector(`[data-profile-lock-settings]`);if(!r)return;r.querySelectorAll(`input[inputmode="numeric"]`).forEach(e=>e.addEventListener(`input`,()=>{e.value=e.value.replace(/\D/g,``).slice(0,6)}));let i=r.querySelector(`#profile-lock-form`);i?.addEventListener(`submit`,async a=>{a.preventDefault();let o=r.querySelector(`#profile-current-pin`)?.value||null,s=r.querySelector(`#profile-new-pin`)?.value||``,c=i.querySelector(`button[type=submit]`);c.disabled=!0;try{let{error:r}=await v().rpc(`profile_set_pin`,{new_pin:s,current_pin:o});if(r)throw r;ct(t.id,s),D(n?`Profile PIN changed`:`Profile lock turned on`),$(e)}catch(e){D(e.message||`Could not save profile PIN`,!0),c.disabled=!1}}),r.querySelector(`#profile-disable-lock`)?.addEventListener(`click`,async()=>{let n=r.querySelector(`#profile-current-pin`)?.value||``;if(!n){D(`Enter your current PIN first`,!0);return}if(confirm(`Turn off your Profile PIN?`))try{let{error:r}=await v().rpc(`profile_disable_pin`,{current_pin:n});if(r)throw r;lt(t.id),D(`Profile lock turned off`),$(e)}catch(e){D(e.message||`Could not turn off profile lock`,!0)}})}async function $(e){let t;try{t=await ut()}catch(t){e.innerHTML=`<h1>Profile</h1><div class="card"><div class="card-body">${p(t.message||`Could not load member`)}</div></div>`;return}if(!t)return K(e);let n=!1,r=!0;try{n=await dt(t.id)}catch(n){if(ft(n))r=!1;else if(!st(t.id)){pt(e,t,{statusUnknown:!0});return}}if(n&&!st(t.id)){pt(e,t);return}await K(e);let i=a();if(!(i&&String(i.id)===String(t.id)))return;let o=e.querySelector(`[data-profile-privacy-slot]`);o&&(o.innerHTML=mt(t,n,r),r&&ht(e,t,n))}export{$ as render};