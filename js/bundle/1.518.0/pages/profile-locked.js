import{$t as e,G as t,Hr as n,I as r,Jt as i,K as a,Kt as o,Lr as s,Mr as c,Nr as l,Tt as u,U as d,Ut as f,Vt as p,Wt as m,Z as h,_r as g,_t as _,br as v,bt as y,gr as b,gt as x,ht as S,i as C,jr as ee,mr as w,mt as T,pt as E,st as D,t as O,wt as te,xt as k,yr as ne,yt as A,zn as j,zr as M}from"../app-core-wTZzOa2I.js";import{$n as N,Ct as re,Gt as ie,Kn as ae,Un as P,Ut as oe,Wt as se,Zn as ce,kt as le,qn as F,vt as ue,wt as de,xt as fe}from"../home-core-V5m994mL.js";import{t as pe}from"../fact-share-D_fcxbbE.js";import{d as me,i as he,t as ge}from"../rivalry-story-model-CNPIYkae.js";import{a as _e,l as ve,r as ye,u as be}from"../notifications-BktjZTOw.js";var{BG:xe,CARD:Se,LINE:Ce,INK:we,MUTED:Te,GOLD:Ee,ACCENT:De,OK:Oe,BRAND_RED:ke,BRAND_YELLOW:Ae}=ue,I=e=>Number.isFinite(Number(e))?Number(e):null,L=e=>I(e)==null?`—`:I(e).toFixed(1);function R(e){let t=I(e);if(t==null)return`—`;let n=[`th`,`st`,`nd`,`rd`],r=t%100;return t+(n[(r-20)%10]||n[r]||n[0])}function z(e){let t=I(e?.run);return t&&t>0?String(t):null}function je({member:e,career:t,extremes:n={},seasonCount:r=0,chipSeasons:i=[]}={}){if(!e)return null;let a=t||{},o=I(a.wins)??0,s=I(a.losses)??0,c=I(a.ties)??0,l=o+s+c,u=I(a.winPct)??(l?(o+c/2)/l:0),d=I(a.titles)??0,f=I(a.playoffs)??0,p=I(a.runnerUps)??0,m=i.length,h=[];h.push([`Championships`,String(d)]),h.push([`Playoff trips`,String(f)]),p&&h.push([`Runner-ups`,String(p)]),n.bestSeason&&h.push([`Best finish`,R(n.bestSeason.rank)]),n.highWeek&&h.push([`Nuclear week`,L(n.highWeek.score)]);let g=z(n.streak?.win);g&&h.push([`Win streak`,`${g} straight`]);let _=[];m&&_.push([`Chip Eater`,m>1?`${m}×`:String(i[0])]),n.worstSeason&&_.push([`Basement visit`,R(n.worstSeason.rank)]),n.lowWeek&&_.push([`Crime of a week`,L(n.lowWeek.score)]);let v=z(n.streak?.loss);v&&_.push([`Loss spiral`,`${v} straight`]),!m&&p&&_.push([`Almost had it`,`${p} runner-up${p===1?``:`s`}`]);let y={who:e.display_name||`DFL`,team:(e.team_name||``).trim(),seasons:b(I(r)??0),record:`${o}-${s}${c?`-${c}`:``}`,wins:o,losses:s,ties:c,games:l,winPct:u,points:Math.round(I(a.pointsFor)??0).toLocaleString(),avgFinish:I(a.avgFinish)==null?`—`:L(a.avgFinish),titles:d,playoffs:f,runnerUps:p,chips:m,trophyCase:h.slice(0,5),crimeScene:_.slice(0,5)};return y.verdict=Me(y,n),y}function Me(e,t={}){let n=I(t.streak?.loss?.run)??0,r=I(t.streak?.win?.run)??0,i=I(t.worstSeason?.rank);return e.titles>0&&e.chips>0?`Has lived at both ends of the standings. Ring on one hand, hot chip in the other.`:e.chips>=2?`Multiple trips to the basement. At this point the hot chip knows the address.`:e.titles>=3?`Dynasty credentials. Annoying as hell, but the hardware makes the argument for them.`:e.titles>=1&&e.winPct>=.55?`The shit talk has documentation: winning record, playoff damage, and a ring to point at.`:n>=6?`Once lost ${n} straight. That is not a slump; that is a subscription plan.`:i!=null&&i>=10?`Has finished ${R(i)}. The standings had to add a basement level.`:e.games>=20&&e.winPct<.4?`The résumé has seen some shit. The group chat should keep the screenshots handy.`:r>=6?`Put together ${r} straight wins once. For a while, everybody else was just schedule filler.`:e.playoffs&&!e.titles&&e.runnerUps?`Knows the route to the playoffs. Still looking for the last damn turn.`:e.winPct>=.55?`Annoyingly effective. The record gives the trash talk legal standing.`:`Dangerous enough to talk shit. Inconsistent enough that the receipts stay interesting.`}function B(e){if(!e)return``;let t=[`${e.who} — ${e.record} in ${e.seasons} DFL season${e.seasons===1?``:`s`}`];return e.titles&&t.push(`${e.titles} title${e.titles===1?``:`s`}`),e.chips&&t.push(`${e.chips}× Chip Eater`),`${t.join(` · `)}. ${e.verdict}`}function Ne(e){return fe(le(e))}async function Pe(e){let t=je(e);if(!t)return`none`;let n=Ne(t),r=t.who.toLowerCase().replace(/[^a-z0-9]+/g,`-`),i=await re(n,`dfl-${r}.png`,{title:`${t.who} · DFL HQ`,text:B(t)});return i===`none`&&await de({title:`${t.who} · DFL HQ`,text:B(t)}),i}var V=500,Fe=T.avatar.maxPx,H=E;function U(e,t,n,r){let i=v({team_name:r.currentTeam||e.team_name||e.display_name,identity:{...e,profile_image:t}},{className:`avatar ph-team-mark`});return n?`<div class="ph-avatar">
    ${i}
    <button type="button" class="ph-photo-btn" data-photo-pick
            title="${t?`Change photo`:`Add a photo`}"
            aria-label="${t?`Change photo`:`Add a photo`}">${p(`camera`,{size:14})}</button>
    <input type="file" accept="image/png,image/jpeg,image/webp" hidden data-photo-file>
  </div>`:`<div class="ph-avatar">${i}</div>`}function Ie(e){let t=[],n=e.joined_year||e.first_season;return n&&t.push(`<div><b>${l(n)}</b><small>Debut</small></div>`),Number(e.championships)>0&&t.push(`<div class="is-gold"><b>${p(`trophy`,{size:15})}${l(e.championships)}</b>
      <small>Championship${Number(e.championships)===1?``:`s`}</small></div>`),`<div class="ph-record">${t.join(``)}<div data-chip-slot></div></div>`}function W(e,t){let n=t.currentTeam||e.display_name,r=[];return t.currentTeam&&e.display_name&&t.currentTeam!==e.display_name&&r.push(l(e.display_name)),t.currentTeam&&t.currentSeason&&r.push(`${l(t.currentSeason)} team`),`<div class="ph-id">
    <h1 class="profile-name">${l(n)}</h1>
    ${r.length?`<div class="ph-handle muted">${r.join(` · `)}</div>`:``}
  </div>`}function Le(e,t,n){let r=String(e.bio||``).trim();return`<section class="card profile-head accent">
    <div class="ph-top">
      ${U(e,e.profile_image,t,n)}
      ${W(e,n)}
      ${t?`<button type="button" class="btn ghost small ph-edit" data-dfl-edit>Edit</button>`:``}
    </div>
    ${se(e)}
    ${Ie(e)}
    ${r?`<p class="dfl-bio">${l(r)}</p>`:``}
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
          ${v(n===`dfl`?{...e,profile_image:r,profile_photo_source:n,sleeper_team_image:null,sleeper_profile_image:null}:{...e,profile_image:null,profile_photo_source:n})}<span>${n===`sleeper`?`Sleeper`:`DFL upload`}</span>
        </label>`}).join(``)}
    </div></fieldset>
    ${t.needsPin?`<label class="dfl-field"><span class="u-label">Profile PIN</span><input type="password" inputmode="numeric" autocomplete="off" data-photo-pin maxlength="12" aria-label="Profile PIN"><span role="alert">Enter your profile PIN to save.</span></label>`:``}
    <p class="muted tiny ph-photo-note">
      ${r?`Photo shrunk to ${Fe}px. ${l(S(r))}.`:`Tap the camera to add a photo.`}

    </p>

    ${r?`<button type="button" class="linkbtn" data-photo-clear>Remove DFL photo</button>`:``}
    <div class="dfl-field">
      <label class="u-label" for="dfl-bio">About me</label>
      <textarea id="dfl-bio" data-bio maxlength="${V}" rows="4"
                placeholder="Bio">${l(t.bio)}</textarea>
      <span class="muted tiny"><span data-bio-count>${t.bio.length}</span>/${V}</span>
    </div>

    <div data-profile-identity-editor></div>

    <div class="row-end"><button type="button" class="btn" data-dfl-save>Save</button></div>
  </section>`}async function ze(e){let t=e.sleeper_user_id?await F().catch(()=>null):null,n=t&&!t.error?P(t,e.sleeper_user_id):null,r=[];if(e.sleeper_user_id){let{data:t}=await j().from(`sleeper_leagues`).select(`season,last_place_user_id`).eq(`last_place_user_id`,e.sleeper_user_id).order(`season`);r=(t||[]).map(e=>String(e.season))}return{career:n,extremes:n,chipSeasons:r}}function Be(e,t,r,a,o={}){let s=e.querySelector(`[data-dfl-host]`);if(!s)return;let c=!1,l=null,u=()=>({bio:String(t.bio||``).trim(),image:void 0,source:t.profile_photo_source!==`dfl`&&(t.sleeper_team_image||t.sleeper_profile_image)?`sleeper`:t.profile_image?`dfl`:`sleeper`,pin:null}),d=async()=>{let e=s.querySelector(`[data-profile-identity-editor]`);if(e)try{let n=await ze(t);e.innerHTML=oe(t,n.career,n.extremes,n.chipSeasons),ie(e,t,a)}catch{e.innerHTML=``}},f=()=>{s.innerHTML=c?Re(t,l,o):Le(t,r,o),c&&d(),o.onRepaint?.()};f(),s.addEventListener(`input`,e=>{if(l&&(e.target.matches(`[data-photo-pin]`)&&(l.pin=e.target.value),e.target.matches(`[data-bio]`))){l.bio=e.target.value;let t=s.querySelector(`[data-bio-count]`);t&&(t.textContent=String(l.bio.length))}}),s.addEventListener(`change`,async e=>{if(e.target.matches(`[data-photo-source]`)&&l){l.source=e.target.value;let n=l.image===void 0?t.profile_image:l.image;s.querySelector(`.ph-avatar`).outerHTML=U({...t,profile_photo_source:l.source},n,!0,o),s.querySelectorAll(`.ph-photo-option`).forEach(e=>e.classList.toggle(`is-selected`,e.querySelector(`[data-photo-source]`).value===l.source));return}if(!e.target.matches(`[data-photo-file]`))return;let r=e.target.files?.[0];if(r){if(!/^image\//.test(r.type)){n(`Pick an image file`,!0);return}if(r.size>H){n(`That image is over ${x(H)}`,!0);return}l||=(c=!0,u());try{l.image=await D(r,`avatar`),l.source=`dfl`,f(),n(`Photo ready (${S(l.image)}) — press Save`)}catch(e){n(e.message||`Could not read that image`,!0)}}}),s.addEventListener(`click`,async e=>{if(e.target.closest(`[data-dfl-edit]`)){c=!0,l=u(),f();return}if(e.target.closest(`[data-dfl-cancel]`)){c=!1,l=null,f();return}if(e.target.closest(`[data-photo-pick]`)){s.querySelector(`[data-photo-file]`)?.click();return}if(!l)return;if(e.target.closest(`[data-photo-clear]`)){l.image=null,l.source=`sleeper`,f();return}let r=e.target.closest(`[data-dfl-save]`);if(r){r.disabled=!0;try{if(String(m())!==String(t.id))throw Error(`Your selected member changed. Reopen Profile.`);let e={...l},{verifiedPin:r,markMemberUnlocked:o}=await g(async()=>{let{verifiedPin:e,markMemberUnlocked:t}=await import(`../app-core-wTZzOa2I.js`).then(e=>e.q);return{verifiedPin:e,markMemberUnlocked:t}},[]);if(String(m())!==String(t.id))throw Error(`Your selected member changed. Reopen Profile.`);let{data:s,error:u}=await j().rpc(`dfl_save_profile`,{p_source:e.source,p_pin:e.pin||r(t.id)||null,p_bio:e.bio,p_image:e.image===void 0||e.image===null?null:e.image,p_clear_image:e.image===null});if(u)throw u;if(String(m())!==String(t.id))return;if(!Number(s))throw Error(`Pick your name again from the top bar and retry.`);e.pin&&o?.(t.id,e.pin),n(`Profile saved`),c=!1,l=null,await i(),(await g(()=>import(`../home-core-V5m994mL.js`).then(e=>e.V),[])).clearAnalyzerDataCache?.(),window.dispatchEvent(new Event(`dfl:profile-updated`)),await a()}catch(e){e.code===`42501`&&l&&(l.needsPin=!0,f(),s.querySelector(`[data-photo-pin]`)?.focus()),n(e.message||`Could not save`,!0),r.disabled=!1}}})}var Ve=`[data-profile-notifications-slot]`;function He(e,t){if(!t.supported)return`<div class="card">
      <h3 class="card-heading">Notifications</h3>
      <p class="muted tiny">${l(t.reason)}</p>
    </div>`;let n=e.enabled&&!!e.subscription,r=Notification.permission===`denied`;return`<div class="card">
    <h3 class="card-heading">Notifications</h3>
    <p class="muted tiny">${n?`On for this device. League alerts reach this phone even when DFL HQ is closed.`:r?`Blocked in this browser's settings. Allow notifications for DFL HQ there, then come back.`:`Off for this device. Turn them on for trades, polls, fee reminders and commissioner notes.`}</p>
    <div class="row-end">
      ${n?`<a class="btn ghost small" href="#/notifications">Choose which ones</a>`:``}
      ${r&&!n?``:`<button type="button" class="btn ${n?`ghost`:``} small" data-profile-push="${n?`off`:`on`}">${n?`Turn off on this device`:`Enable notifications`}</button>`}
    </div>
  </div>`}async function G(e){let t=ve(),n={enabled:!1,subscription:null};if(t.supported)try{n=await be()}catch{}e.innerHTML=He(n,t)}async function Ue(e){let t=e.querySelector(Ve);t&&(await G(t),t.addEventListener(`click`,async e=>{let r=e.target.closest(`[data-profile-push]`);if(!r)return;let i=r.dataset.profilePush===`on`;r.disabled=!0;try{i?await _e():await ye(),n(i?`Notifications enabled on this device`:`Notifications turned off on this device`),await G(t)}catch(e){n(e.message||`Could not change notifications`,!0),r.disabled=!1}}))}async function K(t){let a=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`id`),s;try{s=await o()}catch(e){t.innerHTML=`<h1>Profile</h1>`+c(e)+`<div class="card"><div class="card-body muted">If the members table is missing, run
       <strong>members_schema.sql</strong> in Supabase.</div></div>`;return}let u=f(),d=a?s.find(e=>String(e.id)===String(a)):u;if(!d){t.innerHTML=`<h1>Profile</h1>${ee(`No profile selected.`)}`;return}let p=u&&String(u.id)===String(d.id),[m,g,_,v,y]=await Promise.all([d.sleeper_user_id?j().from(`sleeper_standings`).select(`*`).eq(`sleeper_user_id`,d.sleeper_user_id):{data:[]},j().from(`sleeper_leagues`).select(`season, champion_user_id, runner_up_user_id`),j().from(`keepers`).select(`*`),j().from(`finance_payments`).select(`*`),d.sleeper_user_id?j().from(`sleeper_users`).select(`*`).eq(`sleeper_user_id`,d.sleeper_user_id).maybeSingle():{data:null}]),b=d.sleeper_user_id?await F().catch(()=>null):null,x=b&&!b.error?P(b,d.sleeper_user_id):null,S=b&&!b.error?ae(b,d.sleeper_user_id):[],C=b&&!b.error?ce(b):null,w=d.team_name||y?.data?.team_name||``,T=(m.data||[]).sort((e,t)=>t.season-e.season),E=We(T,g.data||[],d.sleeper_user_id),D=x?{...d,championships:x.titles.length}:d;x&&(E.titles=x.titles.length,E.runnerUps=x.seconds.length);let O=(_.data||[]).filter(t=>String(e(t.team,s,{member_id:t.member_id})?.id)===String(d.id)),te=(v.data||[]).filter(t=>rt(t.owner_name,d.display_name)||String(e(t.team_name,s,{member_id:t.member_id})?.id)===String(d.id)).sort((e,t)=>t.season-e.season),k=[he(),qe(d),Je(T,g.data||[],d.sleeper_user_id,w),C?ot(S,C,s):``,Ye(O),Xe(te)].filter(Boolean);t.innerHTML=`
    <div id="profile-wrap">
      <div data-dfl-host></div>
      ${d.notes?`<div class="card"><h3 class="card-heading">Notes</h3>
                          <div class="card-body">${l(d.notes)}</div></div>`:``}
      ${Ge(E,T.length)}
      ${x?it(x):``}
      ${x&&C?at(x,C,w):``}
      ${tt(s,d)}
      ${k.length?`<h2 class="section-title">Record &amp; reference</h2>`:``}
      ${k.join(``)}
      ${p?`<details class="profile-settings" id="profile-settings"><summary><span><small>YOUR PROFILE</small><strong>Settings &amp; privacy</strong></span><em>Golf name, appearance, notifications and access</em></summary><div class="profile-settings-body">${Ze(d)}${$e()}<div data-profile-notifications-slot></div><div data-profile-privacy-slot></div><div class="profile-account-actions"><button type="button" class="btn ghost small" id="switch-member">Sign out / Switch</button></div></div></details>`:``}
    </div>
  `,p&&Ue(t),Be(t,D,p,()=>K(t),{currentTeam:w,currentSeason:y?.data?.current_season,actions:p?``:`<a class="btn ghost small" href="#/profile">Back to my profile</a>`,onRepaint:()=>{h(t)}}),t.querySelectorAll(`[data-share-rivalry-owner]`).forEach(e=>e.addEventListener(`click`,()=>{let t=S.find(t=>String(t.user)===e.dataset.shareRivalryOwner);if(!t||!C)return;let r=ge({left:C(d.sleeper_user_id).label,right:C(t.user).label,series:t});Promise.resolve(pe(r)).then(e=>{e===`failed`&&n(`Could not share the rivalry stats`,!0)})})),t.querySelector(`[data-share-profile]`)?.addEventListener(`click`,async e=>{let r=e.currentTarget;r.disabled=!0;try{await Pe({member:d,career:E,extremes:x||{},seasonCount:T.length,chipSeasons:(t.querySelector(`[data-chip-eaters="badge"]`)?.title||``).split(`,`).map(e=>e.trim()).filter(Boolean)})}catch(e){n(e?.message||`Could not build that card`,!0)}finally{r.disabled=!1}}),p&&(et(t),Qe(t,d)),me(t,d.id),r(t.querySelector(`#profile-wrap`),async()=>{await i(),K(t)}),t.addEventListener(`click`,e=>{e.target.closest(`#switch-member`)&&window.dispatchEvent(new CustomEvent(`dfl:pick-member`,{detail:{forgetMemberId:d.id}}))})}function q(e,t,n){return n==null?[]:e.filter(e=>e[t]!=null&&e[t]===n)}function We(e,t,n){let r=Y(e,`wins`),i=Y(e,`losses`),a=Y(e,`ties`),o=r+i+a,s=e.filter(e=>e.rank!=null);return{wins:r,losses:i,ties:a,winPct:o?(r+a/2)/o:0,pointsFor:Y(e,`points_for`),avgFinish:s.length?s.reduce((e,t)=>e+t.rank,0)/s.length:null,playoffs:e.filter(e=>e.made_playoffs).length,titles:q(t,`champion_user_id`,n).length,runnerUps:q(t,`runner_up_user_id`,n).length}}function Ge(e,t){return t?`
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
        <div class="career-outcomes" aria-label="Career accomplishments">
          <div><strong>${e.titles}</strong><span>Titles</span></div>
          <div><strong>${e.runnerUps}</strong><span>Runner-up</span></div>
          <div><strong>${e.playoffs}</strong><span>Playoffs</span></div>
        </div>
      </div>
      <dl class="career-support">
        <div><dt>Points scored</dt><dd>${Math.round(e.pointsFor).toLocaleString()}</dd></div>
        <div><dt>Average finish</dt><dd>${e.avgFinish?e.avgFinish.toFixed(1):`—`}</dd></div>
      </dl>
    </section>`:`<div class="card"><div class="card-title">Career</div>${ee(`No Sleeper history linked.`)}</div>`}var Ke=5;function qe(e){let t=(e.awards||``).split(`
`).map(e=>e.trim()).filter(Boolean);if(!t.length)return``;let n=t.length>=Ke;return`
    <div class="card" data-collapse="profile-awards" data-collapse-title="Awards"
         data-collapse-badge="${t.length}"${n?` data-collapse-default="folded"`:``}>
      <ul class="tidy">${t.map(e=>`<li>${l(e)}</li>`).join(``)}</ul>
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
                <td>${l(e.season)}</td>
                <td class="muted">${l(r||e.team_name||`—`)}</td>
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
    </div>`}function Ye(e){if(!e.length)return``;let t=[...s(e,`year`).entries()].sort((e,t)=>t[0]-e[0]);return`
    <div class="card" data-collapse="profile-keepers" data-collapse-default="folded"
         data-collapse-title="Keepers" data-collapse-badge="${e.length}">
      ${t.map(([e,t])=>`
        <div class="subcard">
          <strong>${l(e)}</strong>
          <ul class="tidy">
            ${t.map(e=>`<li>${l(e.player)}${e.round_cost==null?``:` <span class="muted">— round ${l(e.round_cost)}</span>`}</li>`).join(``)}
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
                  <td>${l(e.season)}</td>
                  <td class="num">${M(t)}</td>
                  <td class="num">${M(n)}</td>
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
                 autocomplete="off" placeholder="${l(e.display_name)}" value="${l(t)}">
          <button class="btn small" type="submit">Save</button>
        </div>
        <p class="muted tiny">Leave it blank to go back to <strong>${l(e.display_name)}</strong>.</p>
      </form>
    </div>`}function Qe(e,t){let r=e.querySelector(`[data-golfname]`);r&&r.addEventListener(`submit`,async t=>{t.preventDefault();let a=r.golfname.value.trim(),o=r.querySelector(`button[type=submit]`);o.disabled=!0;try{let{data:t,error:r}=await j().rpc(`dfl_set_golf_name`,{p_name:a});if(r)throw r;if(!t)throw Error(`Pick your name in the top right first.`);await i().catch(()=>{}),n(a?`Golf calls you ${a}`:`Back to your DFL name`),K(e)}catch(e){n(/function|does not exist/i.test(e.message||``)?`Run golf_identity_schema.sql in Supabase`:e.message||`Could not save that name`,!0),o.disabled=!1}})}function J(){let e=u();return e===`system`?`Following your phone, which is ${y(_())} right now.`:A(e)?`${y(e)} colours, on a dark palette.`:`Always ${y(e)} on this device.`}function $e(){let e=u();return`
    <div class="card">
      <h3 class="card-heading">Appearance</h3>
      <div class="modebar" id="mode-pick">
        ${k().map(t=>`
          <button type="button" class="mode-opt ${t.id===e?`is-on`:``}"
                  data-mode-pick="${t.id}" aria-pressed="${t.id===e}">${l(t.name)}</button>`).join(``)}
      </div>
      <p class="muted tiny" id="mode-note">${l(J())}</p>
      ${A(e)?`<p class="muted tiny">Wearing ${l(y(e))} colours.
        Change that with your favourite club at the top of this page.</p>`:``}
      ${O()}
    </div>`}function et(e){let t=e.querySelector(`#mode-pick`)?.closest(`.card`);t&&(t.addEventListener(`click`,n=>{let r=n.target.closest(`[data-mode-pick]`);if(!r)return;let i=r.dataset.modePick;te(i);let a=u();t.querySelectorAll(`[data-mode-pick]`).forEach(e=>{let t=e.dataset.modePick===a;e.classList.contains(`tt-mine`)||(e.classList.toggle(`is-on`,t),e.hasAttribute(`aria-checked`)?e.setAttribute(`aria-checked`,String(t)):e.setAttribute(`aria-pressed`,String(t)))});let o=e.querySelector(`#mode-note`);o&&(o.textContent=J())}),C(t))}function tt(e,t){let n=e.filter(e=>e.id!==t.id);return n.length?`
    <nav class="profile-member-switch" aria-label="Browse member profiles">
      <div class="profile-member-switch-head"><strong>Browse members</strong><small>${n.length} profiles</small></div>
      <div class="chiprow">
        ${n.map(e=>`<a class="chip" href="#/profile?id=${e.id}">${l(e.display_name)}</a>`).join(``)}
      </div>
    </nav>`:``}var nt=/^(—|-|n\/a|)$/i;function Y(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}function rt(e,t){return!!e&&!!t&&String(e).trim().toLowerCase()===String(t).trim().toLowerCase()}function it(e){return!e.titles.length&&!e.seconds.length?``:`
    <section class="cabinet">
      ${e.titles.length?`
        <div class="cab-row">
          <svg class="ico-sm" aria-hidden="true"><use href="#i-trophy"></use></svg>
          <b class="cab-n">${e.titles.length}</b>
          <span class="cab-l">${e.titles.length===1?`Championship`:`Championships`}</span>
          <span class="cab-years">${e.titles.map(e=>`<span class="cab-year">${l(e)}</span>`).join(``)}</span>
        </div>`:``}
      ${e.seconds.length?`
        <div class="cab-row is-second">
          <svg class="ico-sm" aria-hidden="true"><use href="#i-medal"></use></svg>
          <b class="cab-n">${e.seconds.length}</b>
          <span class="cab-l">Runner-up</span>
          <span class="cab-years">${e.seconds.map(e=>`<span class="cab-year">${l(e)}</span>`).join(``)}</span>
        </div>`:``}
    </section>`}function at(e,t,n){let r={seasons:[],scoring:[],streaks:[]},i=e=>String(n||e.team_name||``).trim();e.bestSeason&&r.seasons.push(X(`Best season`,Z(e.bestSeason.rank),i(e.bestSeason),`${e.bestSeason.season} · ${e.bestSeason.wins}-${e.bestSeason.losses}${e.bestSeason.ties?`-`+e.bestSeason.ties:``}`)),e.worstSeason&&e.bestSeason&&e.worstSeason.season!==e.bestSeason.season&&r.seasons.push(X(`Worst season`,Z(e.worstSeason.rank),i(e.worstSeason),`${e.worstSeason.season} · ${e.worstSeason.wins}-${e.worstSeason.losses}${e.worstSeason.ties?`-`+e.worstSeason.ties:``}`)),e.highWeek&&r.scoring.push(X(`Highest week`,e.highWeek.score.toFixed(2),``,`${e.highWeek.season} · Week ${e.highWeek.week}`)),e.lowWeek&&e.lowWeek!==e.highWeek&&r.scoring.push(X(`Lowest week`,e.lowWeek.score.toFixed(2),``,`${e.lowWeek.season} · Week ${e.lowWeek.week}`)),e.streak.win&&e.streak.win.run>=3&&r.streaks.push(X(`Longest win streak`,`${e.streak.win.run} weeks`,``,N(e.streak.win.from,e.streak.win.to))),e.streak.loss&&e.streak.loss.run>=3&&r.streaks.push(X(`Longest slide`,`${e.streak.loss.run} weeks`,``,N(e.streak.loss.from,e.streak.loss.to)));let a=[[`Seasons`,r.seasons],[`Scoring`,r.scoring],[`Streaks`,r.streaks]].filter(([,e])=>e.length);return a.length?`
    <h2 class="section-title">Career highlights</h2>
    <section class="card career-highlights">
      ${a.map(([e,t])=>`<div class="career-highlight-group"><h3>${e}</h3>${t.join(``)}</div>`).join(``)}
    </section>`:``}function X(e,t,n,r){let i=[r,n].filter(Boolean).join(` · `);return`
    <div class="career-moment">
      <span><b>${l(e)}</b>${i?`<small>${l(i)}</small>`:``}</span>
      <strong class="${nt.test(String(t??``).trim())?`is-empty`:``}">${l(t)}</strong>
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
                    ${i?`<a href="#/profile?id=${i.id}">${ne({team_name:n.label,ownerName:i.display_name,identity:i},{meta:e.streak?`${e.streak.won?`Won`:`Lost`} last ${e.streak.count}`:`Series history`,compact:!0})}</a>`:l(n.label)}
                    ${a?`<span class="pill warn tiny">dead level</span>`:``}
                    ${o?`<span class="pill red tiny">never beaten them</span>`:``}
                    <button type="button" class="btn ghost small" data-share-rivalry-owner="${l(e.user)}" aria-label="Share rivalry stats against ${l(n.label)}">Share rivalry stats</button>
                  </td>
                  <td>${e.wins}-${e.losses}${e.ties?`-`+e.ties:``}</td>
                  <td class="${e.differential>0?`good`:e.differential<0?`bad`:`muted`}">${e.differential>0?`+`:``}${e.differential.toFixed(1)}<small class="rival-avg">${e.averageMargin>0?`+`:``}${e.averageMargin.toFixed(1)}/game</small></td>
                  <td class="num">${e.meetings}</td>
                  <td class="muted tiny">${e.last?`${e.last.season} Wk ${e.last.week} · ${e.last.won?`won`:`lost`} ${e.last.mine.toFixed(1)}–${e.last.theirs.toFixed(1)}`:`—`}</td>
                </tr>`}).join(``)}
          </tbody>
        </table>
      </div>
      <div class="card-meta">Every meeting on record, ${l(w)} onward.</div>
    </div>`}var st=e=>t(e),ct=(e,t=null,n)=>a(e,t,n),lt=e=>d(e),Q=(e,t,n=!0)=>`<input id="${e}" name="${t}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" minlength="4" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" style="-webkit-text-security:disc" ${n?`required`:``}>`;async function ut(){let e=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`id`),t=await o(),n=f();return e?t.find(t=>String(t.id)===String(e)):n}async function dt(e){let{data:t,error:n}=await j().rpc(`profile_lock_status`,{target_member_id:Number(e)});if(n)throw n;return!!t}function ft(e){let t=String(e?.code||``),n=String(e?.message||``).toLowerCase();return t===`PGRST202`||t===`42883`||n.includes(`profile_lock_status`)&&n.includes(`not find`)}function pt(e,t,{statusUnknown:r=!1}={}){e.innerHTML=`<div id="profile-lock-gate"><div class="pin-panel"><span class="pin-mark">${p(`lock`,{size:24})}</span><h1>${r?`Unlock profile`:`Profile locked`}</h1><p class="muted">${r?`We couldn’t confirm the lock after changing views. Enter your PIN or try the check again.`:`${l(t.display_name)} keeps this one behind a PIN.`}</p><form id="profile-unlock-form" autocomplete="off"><label for="profile-unlock-pin">Profile PIN</label>${Q(`profile-unlock-pin`,`dfl-profile-unlock`).replace(`<input `,`<input class="pin-input" `)}<label class="access-trust"><input type="checkbox" data-trust-device><span><strong>Stay unlocked on this device</strong><small>Skip this PIN on this browser until you switch profiles. Use only on your own device.</small></span></label><div class="row-end"><a class="btn ghost" href="#/home">Back</a>${r?`<button class="btn ghost" type="button" id="profile-lock-retry">Retry</button>`:``}<button class="btn" type="submit">Unlock profile</button></div></form><p class="muted tiny pin-note">Forgot it? A DFL Owner can reset the lock, but nobody can read the PIN.</p></div></div>`;let i=e.querySelector(`#profile-unlock-form`),a=e.querySelector(`#profile-unlock-pin`);a?.addEventListener(`input`,()=>{a.value=a.value.replace(/\D/g,``).slice(0,6)}),e.querySelector(`#profile-lock-retry`)?.addEventListener(`click`,()=>$(e)),setTimeout(()=>a?.focus(),0),i?.addEventListener(`submit`,async r=>{r.preventDefault();let o=i.querySelector(`button[type=submit]`),s=!!i.querySelector(`[data-trust-device]`)?.checked;o.disabled=!0;try{let{data:r,error:i}=await j().rpc(`profile_verify_pin`,{target_member_id:Number(t.id),attempted_pin:a.value});if(i)throw i;if(r!==!0)throw Error(`Wrong profile PIN`);ct(t.id,a.value,{rememberDevice:s}),n(s?`Profile unlocked on this device`:`Profile unlocked`),$(e)}catch(e){n(e.message||`Could not unlock profile`,!0),o.disabled=!1,a.select()}})}function mt(e,t,n){return n?`<div class="card" data-profile-lock-settings><div class="card-title">Profile lock</div><p class="muted tiny">Optional 4–6 digit PIN for using DFL HQ as you. You can trust your personal device when you unlock.</p><form id="profile-lock-form" autocomplete="off">${t?`<label for="profile-current-pin">Current PIN</label>${Q(`profile-current-pin`,`dfl-current-pin`)}`:``}<label for="profile-new-pin">${t?`New PIN`:`Choose a PIN`}</label>${Q(`profile-new-pin`,`dfl-new-pin`)}<div class="row-end">${t?`<button type="button" class="btn danger ghost" id="profile-disable-lock">Turn lock off</button>`:``}<button type="submit" class="btn">${t?`Change PIN`:`Turn lock on`}</button></div></form></div>`:`<div class="card note"><div class="card-title">Profile lock</div><div class="card-body muted">Profile PIN setup is ready in the app. Run <strong>profile_lock_schema.sql</strong> in Supabase to turn it on.</div></div>`}function ht(e,t,r){let i=e.querySelector(`[data-profile-lock-settings]`);if(!i)return;i.querySelectorAll(`input[inputmode="numeric"]`).forEach(e=>e.addEventListener(`input`,()=>{e.value=e.value.replace(/\D/g,``).slice(0,6)}));let a=i.querySelector(`#profile-lock-form`);a?.addEventListener(`submit`,async o=>{o.preventDefault();let s=i.querySelector(`#profile-current-pin`)?.value||null,c=i.querySelector(`#profile-new-pin`)?.value||``,l=a.querySelector(`button[type=submit]`);l.disabled=!0;try{let{error:i}=await j().rpc(`profile_set_pin`,{new_pin:c,current_pin:s});if(i)throw i;ct(t.id,c),n(r?`Profile PIN changed`:`Profile lock turned on`),$(e)}catch(e){n(e.message||`Could not save profile PIN`,!0),l.disabled=!1}}),i.querySelector(`#profile-disable-lock`)?.addEventListener(`click`,async()=>{let r=i.querySelector(`#profile-current-pin`)?.value||``;if(!r){n(`Enter your current PIN first`,!0);return}if(confirm(`Turn off your Profile PIN?`))try{let{error:i}=await j().rpc(`profile_disable_pin`,{current_pin:r});if(i)throw i;lt(t.id),n(`Profile lock turned off`),$(e)}catch(e){n(e.message||`Could not turn off profile lock`,!0)}})}async function $(e){let t;try{t=await ut()}catch(t){e.innerHTML=`<h1>Profile</h1><div class="card"><div class="card-body">${l(t.message||`Could not load member`)}</div></div>`;return}if(!t)return K(e);let n=!1,r=!0;try{n=await dt(t.id)}catch(n){if(ft(n))r=!1;else if(!st(t.id)){pt(e,t,{statusUnknown:!0});return}}if(n&&!st(t.id)){pt(e,t);return}await K(e);let i=f();if(!(i&&String(i.id)===String(t.id)))return;let a=e.querySelector(`[data-profile-privacy-slot]`);a&&(a.innerHTML=mt(t,n,r),r&&ht(e,t,n))}export{$ as render};