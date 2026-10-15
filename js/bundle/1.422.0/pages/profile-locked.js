import{$t as e,Bt as t,Ct as n,En as r,Er as i,G as a,Gt as o,Ht as s,I as c,Jt as l,K as u,On as d,Sn as f,U as p,X as m,Yn as h,bn as g,bt as _,ft as v,gt as y,ht as b,i as x,jn as S,mt as C,ot as w,pt as T,t as E,vt as D,wr as O,wt as k,xn as ee,yt as A}from"../app-core-B4sYdNnq.js";import{Bn as te,Fn as ne,Hn as j,In as M,Mn as N,Qt as re,an as ie,cn as ae,dt as oe,ft as se,ln as ce,nn as le,pn as ue,rn as de,un as fe,ut as pe}from"../home-core-C_OeSWmx.js";import{t as me}from"../fact-share-CIHJ8L5T.js";import{c as he,t as ge}from"../weekly-clubhouse-ui-Clfh5OZb.js";import{a as _e,l as ve,r as ye,u as be}from"../notifications-DHsy34Ns.js";var{BG:xe,CARD:Se,LINE:Ce,INK:we,MUTED:Te,GOLD:Ee,ACCENT:De,OK:Oe,BRAND_RED:ke,BRAND_YELLOW:Ae}=ie,P=e=>Number.isFinite(Number(e))?Number(e):null,F=e=>P(e)==null?`—`:P(e).toFixed(1);function I(e){let t=P(e);if(t==null)return`—`;let n=[`th`,`st`,`nd`,`rd`],r=t%100;return t+(n[(r-20)%10]||n[r]||n[0])}function L(e){let t=P(e?.run);return t&&t>0?String(t):null}function je({member:e,career:t,extremes:n={},seasonCount:r=0,chipSeasons:a=[]}={}){if(!e)return null;let o=t||{},s=P(o.wins)??0,c=P(o.losses)??0,l=P(o.ties)??0,u=s+c+l,d=P(o.winPct)??(u?(s+l/2)/u:0),f=P(o.titles)??0,p=P(o.playoffs)??0,m=P(o.runnerUps)??0,h=a.length,g=[];g.push([`Championships`,String(f)]),g.push([`Playoff trips`,String(p)]),m&&g.push([`Runner-ups`,String(m)]),n.bestSeason&&g.push([`Best finish`,I(n.bestSeason.rank)]),n.highWeek&&g.push([`Nuclear week`,F(n.highWeek.score)]);let _=L(n.streak?.win);_&&g.push([`Win streak`,`${_} straight`]);let v=[];h&&v.push([`Chip Eater`,h>1?`${h}×`:String(a[0])]),n.worstSeason&&v.push([`Basement visit`,I(n.worstSeason.rank)]),n.lowWeek&&v.push([`Crime of a week`,F(n.lowWeek.score)]);let y=L(n.streak?.loss);y&&v.push([`Loss spiral`,`${y} straight`]),!h&&m&&v.push([`Almost had it`,`${m} runner-up${m===1?``:`s`}`]);let b={who:e.display_name||`DFL`,team:(e.team_name||``).trim(),seasons:i(P(r)??0),record:`${s}-${c}${l?`-${l}`:``}`,wins:s,losses:c,ties:l,games:u,winPct:d,points:Math.round(P(o.pointsFor)??0).toLocaleString(),avgFinish:P(o.avgFinish)==null?`—`:F(o.avgFinish),titles:f,playoffs:p,runnerUps:m,chips:h,trophyCase:g.slice(0,5),crimeScene:v.slice(0,5)};return b.verdict=Me(b,n),b}function Me(e,t={}){let n=P(t.streak?.loss?.run)??0,r=P(t.streak?.win?.run)??0,i=P(t.worstSeason?.rank);return e.titles>0&&e.chips>0?`Has lived at both ends of the standings. Ring on one hand, hot chip in the other.`:e.chips>=2?`Multiple trips to the basement. At this point the hot chip knows the address.`:e.titles>=3?`Dynasty credentials. Annoying as hell, but the hardware makes the argument for them.`:e.titles>=1&&e.winPct>=.55?`The shit talk has documentation: winning record, playoff damage, and a ring to point at.`:n>=6?`Once lost ${n} straight. That is not a slump; that is a subscription plan.`:i!=null&&i>=10?`Has finished ${I(i)}. The standings had to add a basement level.`:e.games>=20&&e.winPct<.4?`The résumé has seen some shit. The group chat should keep the screenshots handy.`:r>=6?`Put together ${r} straight wins once. For a while, everybody else was just schedule filler.`:e.playoffs&&!e.titles&&e.runnerUps?`Knows the route to the playoffs. Still looking for the last damn turn.`:e.winPct>=.55?`Annoyingly effective. The record gives the trash talk legal standing.`:`Dangerous enough to talk shit. Inconsistent enough that the receipts stay interesting.`}function R(e){if(!e)return``;let t=[`${e.who} — ${e.record} in ${e.seasons} DFL season${e.seasons===1?``:`s`}`];return e.titles&&t.push(`${e.titles} title${e.titles===1?``:`s`}`),e.chips&&t.push(`${e.chips}× Chip Eater`),`${t.join(` · `)}. ${e.verdict}`}function Ne(e){return ae(ue(e))}async function Pe(e){let t=je(e);if(!t)return`none`;let n=Ne(t),r=t.who.toLowerCase().replace(/[^a-z0-9]+/g,`-`),i=await ce(n,`dfl-${r}.png`,{title:`${t.who} · DFL HQ`,text:R(t)});return i===`none`&&await fe({title:`${t.who} · DFL HQ`,text:R(t)}),i}var z=500,Fe=T.avatar.maxPx,B=v;function V(e,n,r,i){let a=de({team_name:i.currentTeam||e.team_name||e.display_name,identity:{...e,profile_image:n}},{className:`avatar ph-team-mark`});return r?`<div class="ph-avatar">
    ${a}
    <button type="button" class="ph-photo-btn" data-photo-pick
            title="${n?`Change photo`:`Add a photo`}"
            aria-label="${n?`Change photo`:`Add a photo`}">${t(`camera`,{size:14})}</button>
    <input type="file" accept="image/png,image/jpeg,image/webp" hidden data-photo-file>
  </div>`:`<div class="ph-avatar">${a}</div>`}function Ie(e){let n=[],r=e.joined_year||e.first_season;return r&&n.push(`<div><b>${f(r)}</b><small>Debut</small></div>`),Number(e.championships)>0&&n.push(`<div class="is-gold"><b>${t(`trophy`,{size:15})}${f(e.championships)}</b>
      <small>Championship${Number(e.championships)===1?``:`s`}</small></div>`),`<div class="ph-record">${n.join(``)}<div data-chip-slot></div></div>`}function H(e,t){let n=t.currentTeam||e.display_name,r=[];return t.currentTeam&&e.display_name&&t.currentTeam!==e.display_name&&r.push(f(e.display_name)),t.currentTeam&&t.currentSeason&&r.push(`${f(t.currentSeason)} team`),`<div class="ph-id">
    <h1 class="profile-name">${f(n)}</h1>
    ${r.length?`<div class="ph-handle muted">${r.join(` · `)}</div>`:``}
  </div>`}function Le(e,t,n){let r=String(e.bio||``).trim();return`<section class="card profile-head accent">
    <div class="ph-top">
      ${V(e,e.profile_image,t,n)}
      ${H(e,n)}
      ${t?`<button type="button" class="btn ghost small ph-edit" data-dfl-edit>Edit</button>`:``}
    </div>
    ${oe(e)}
    ${Ie(e)}
    ${r?`<p class="dfl-bio">${f(r)}</p>`:``}
    ${n.actions?`<div class="row ph-actions">${n.actions}</div>`:``}
  </section>`}function Re(e,t,n){let r=t.image===void 0?e.profile_image:t.image;return`<section class="card profile-head accent is-editing">
    <div class="ph-top">
      ${V(e,r,!0,n)}
      ${H(e,n)}
      <button type="button" class="btn ghost small ph-edit" data-dfl-cancel>Cancel</button>
    </div>

    <p class="muted tiny ph-photo-note">
      ${r?`Photo shrunk to ${Fe}px. ${f(C(r))}.`:`Tap the camera to add a photo.`}
      ${r?`<button type="button" class="linkbtn" data-photo-clear>Remove photo</button>`:``}
    </p>

    <div class="dfl-field">
      <label class="u-label" for="dfl-bio">About me</label>
      <textarea id="dfl-bio" data-bio maxlength="${z}" rows="4"
                placeholder="Bio">${f(t.bio)}</textarea>
      <span class="muted tiny"><span data-bio-count>${t.bio.length}</span>/${z}</span>
    </div>

    <div data-profile-identity-editor></div>

    <div class="row-end"><button type="button" class="btn" data-dfl-save>Save</button></div>
  </section>`}async function ze(e){let t=e.sleeper_user_id?await M().catch(()=>null):null,n=t&&!t.error?N(t,e.sleeper_user_id):null,r=[];if(e.sleeper_user_id){let{data:t}=await h().from(`sleeper_leagues`).select(`season,last_place_user_id`).eq(`last_place_user_id`,e.sleeper_user_id).order(`season`);r=(t||[]).map(e=>String(e.season))}return{career:n,extremes:n,chipSeasons:r}}function Be(e,t,n,r,i={}){let a=e.querySelector(`[data-dfl-host]`);if(!a)return;let o=!1,s=null,c=()=>({bio:String(t.bio||``).trim(),image:void 0}),l=async()=>{let e=a.querySelector(`[data-profile-identity-editor]`);if(e)try{let n=await ze(t);e.innerHTML=pe(t,n.career,n.extremes,n.chipSeasons),se(e,t,r)}catch{e.innerHTML=``}},u=()=>{a.innerHTML=o?Re(t,s,i):Le(t,n,i),o&&l(),i.onRepaint?.()};u(),a.addEventListener(`input`,e=>{if(s&&e.target.matches(`[data-bio]`)){s.bio=e.target.value;let t=a.querySelector(`[data-bio-count]`);t&&(t.textContent=String(s.bio.length))}}),a.addEventListener(`change`,async e=>{if(!e.target.matches(`[data-photo-file]`))return;let t=e.target.files?.[0];if(t){if(!/^image\//.test(t.type)){S(`Pick an image file`,!0);return}if(t.size>B){S(`That image is over ${b(B)}`,!0);return}s||=(o=!0,c());try{s.image=await w(t,`avatar`),u(),S(`Photo ready (${C(s.image)}) — press Save`)}catch(e){S(e.message||`Could not read that image`,!0)}}}),a.addEventListener(`click`,async e=>{if(e.target.closest(`[data-dfl-edit]`)){o=!0,s=c(),u();return}if(e.target.closest(`[data-dfl-cancel]`)){o=!1,s=null,u();return}if(e.target.closest(`[data-photo-pick]`)){a.querySelector(`[data-photo-file]`)?.click();return}if(!s)return;if(e.target.closest(`[data-photo-clear]`)){s.image=null,u();return}let t=e.target.closest(`[data-dfl-save]`);if(t){t.disabled=!0;try{let{data:e,error:t}=await h().rpc(`dfl_update_profile`,{p_bio:s.bio,p_image:s.image===void 0||s.image===null?null:s.image,p_clear_image:s.image===null});if(t)throw t;if(!Number(e))throw Error(`Pick your name again from the top bar and retry.`);S(`Profile saved`),o=!1,s=null,await r()}catch(e){S(e.message||`Could not save`,!0),t.disabled=!1}}})}var Ve=`[data-profile-notifications-slot]`;function He(e,t){if(!t.supported)return`<div class="card">
      <h3 class="card-heading">Notifications</h3>
      <p class="muted tiny">${f(t.reason)}</p>
    </div>`;let n=e.enabled&&!!e.subscription,r=Notification.permission===`denied`;return`<div class="card">
    <h3 class="card-heading">Notifications</h3>
    <p class="muted tiny">${n?`On for this device. League alerts reach this phone even when DFL HQ is closed.`:r?`Blocked in this browser's settings. Allow notifications for DFL HQ there, then come back.`:`Off for this device. Turn them on for trades, polls, fee reminders and commissioner notes.`}</p>
    <div class="row-end">
      ${n?`<a class="btn ghost small" href="#/notifications">Choose which ones</a>`:``}
      ${r&&!n?``:`<button type="button" class="btn ${n?`ghost`:``} small" data-profile-push="${n?`off`:`on`}">${n?`Turn off on this device`:`Enable notifications`}</button>`}
    </div>
  </div>`}async function U(e){let t=ve(),n={enabled:!1,subscription:null};if(t.supported)try{n=await be()}catch{}e.innerHTML=He(n,t)}async function Ue(e){let t=e.querySelector(Ve);t&&(await U(t),t.addEventListener(`click`,async e=>{let n=e.target.closest(`[data-profile-push]`);if(!n)return;let r=n.dataset.profilePush===`on`;n.disabled=!0;try{r?await _e():await ye(),S(r?`Notifications enabled on this device`:`Notifications turned off on this device`),await U(t)}catch(e){S(e.message||`Could not change notifications`,!0),n.disabled=!1}}))}async function W(t){let n=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`id`),r;try{r=await o()}catch(e){t.innerHTML=`<h1>Profile</h1>`+ee(e)+`<div class="card"><div class="card-body muted">If the members table is missing, run
       <strong>members_schema.sql</strong> in Supabase.</div></div>`;return}let i=s(),a=n?r.find(e=>String(e.id)===String(n)):i;if(!a){t.innerHTML=`<h1>Profile</h1>${g(`No profile selected.`)}`;return}let u=i&&String(i.id)===String(a.id),[d,p,_,v,y]=await Promise.all([a.sleeper_user_id?h().from(`sleeper_standings`).select(`*`).eq(`sleeper_user_id`,a.sleeper_user_id):{data:[]},h().from(`sleeper_leagues`).select(`season, champion_user_id, runner_up_user_id`),h().from(`keepers`).select(`*`),h().from(`finance_payments`).select(`*`),a.sleeper_user_id?h().from(`sleeper_users`).select(`*`).eq(`sleeper_user_id`,a.sleeper_user_id).maybeSingle():{data:null}]),b=a.sleeper_user_id?await M().catch(()=>null):null,x=b&&!b.error?N(b,a.sleeper_user_id):null,C=b&&!b.error?ne(b,a.sleeper_user_id):[],w=b&&!b.error?te(b):null,T=a.team_name||y?.data?.team_name||``,E=(d.data||[]).sort((e,t)=>t.season-e.season),D=We(E,p.data||[],a.sleeper_user_id),O=x?{...a,championships:x.titles.length}:a;x&&(D.titles=x.titles.length,D.runnerUps=x.seconds.length);let k=(_.data||[]).filter(t=>String(e(t.team,r,{member_id:t.member_id})?.id)===String(a.id)),A=(v.data||[]).filter(t=>rt(t.owner_name,a.display_name)||String(e(t.team_name,r,{member_id:t.member_id})?.id)===String(a.id)).sort((e,t)=>t.season-e.season),j=[ge(),qe(a),Je(E,p.data||[],a.sleeper_user_id,T),w?ot(C,w,r):``,Ye(k),Xe(A)].filter(Boolean);t.innerHTML=`
    <div id="profile-wrap">
      <div data-dfl-host></div>
      ${a.notes?`<div class="card"><h3 class="card-heading">Notes</h3>
                          <div class="card-body">${f(a.notes)}</div></div>`:``}
      ${Ge(D,E.length)}
      ${x?it(x):``}
      ${x&&w?at(x,w,T):``}
      ${tt(r,a)}
      ${j.length?`<h2 class="section-title">Record &amp; reference</h2>`:``}
      ${j.join(``)}
      ${u?`<details class="profile-settings" id="profile-settings"><summary><span><small>YOUR PROFILE</small><strong>Settings &amp; privacy</strong></span><em>Golf name, appearance, notifications and access</em></summary><div class="profile-settings-body">${Ze(a)}${$e()}<div data-profile-notifications-slot></div><div data-profile-privacy-slot></div><div class="profile-account-actions"><button type="button" class="btn ghost small" id="switch-member">Sign out / Switch</button></div></div></details>`:``}
    </div>
  `,u&&Ue(t),Be(t,O,u,()=>W(t),{currentTeam:T,currentSeason:y?.data?.current_season,actions:u?``:`<a class="btn ghost small" href="#/profile">Back to my profile</a>`,onRepaint:()=>{m(t)}}),t.querySelectorAll(`[data-share-rivalry-owner]`).forEach(e=>e.addEventListener(`click`,()=>{let t=C.find(t=>String(t.user)===e.dataset.shareRivalryOwner);if(!t||!w)return;let n=re({left:w(a.sleeper_user_id).label,right:w(t.user).label,series:t});Promise.resolve(me(n)).then(e=>{e===`failed`&&S(`Could not share the rivalry stats`,!0)})})),t.querySelector(`[data-share-profile]`)?.addEventListener(`click`,async e=>{let n=e.currentTarget;n.disabled=!0;try{await Pe({member:a,career:D,extremes:x||{},seasonCount:E.length,chipSeasons:(t.querySelector(`[data-chip-eaters="badge"]`)?.title||``).split(`,`).map(e=>e.trim()).filter(Boolean)})}catch(e){S(e?.message||`Could not build that card`,!0)}finally{n.disabled=!1}}),u&&(et(t),Qe(t,a)),he(t,a.id),c(t.querySelector(`#profile-wrap`),async()=>{await l(),W(t)}),t.addEventListener(`click`,e=>{e.target.closest(`#switch-member`)&&window.dispatchEvent(new CustomEvent(`dfl:pick-member`,{detail:{forgetMemberId:a.id}}))})}function G(e,t,n){return n==null?[]:e.filter(e=>e[t]!=null&&e[t]===n)}function We(e,t,n){let r=q(e,`wins`),i=q(e,`losses`),a=q(e,`ties`),o=r+i+a,s=e.filter(e=>e.rank!=null);return{wins:r,losses:i,ties:a,winPct:o?(r+a/2)/o:0,pointsFor:q(e,`points_for`),avgFinish:s.length?s.reduce((e,t)=>e+t.rank,0)/s.length:null,playoffs:e.filter(e=>e.made_playoffs).length,titles:G(t,`champion_user_id`,n).length,runnerUps:G(t,`runner_up_user_id`,n).length}}function Ge(e,t){return t?`
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
    </section>`:`<div class="card"><div class="card-title">Career</div>${g(`No Sleeper history linked.`)}</div>`}var Ke=5;function qe(e){let t=(e.awards||``).split(`
`).map(e=>e.trim()).filter(Boolean);if(!t.length)return``;let n=t.length>=Ke;return`
    <div class="card" data-collapse="profile-awards" data-collapse-title="Awards"
         data-collapse-badge="${t.length}"${n?` data-collapse-default="folded"`:``}>
      <ul class="tidy">${t.map(e=>`<li>${f(e)}</li>`).join(``)}</ul>
    </div>`}function Je(e,t,n,r){if(!e.length)return``;let i=new Set(G(t,`champion_user_id`,n).map(e=>e.season)),a=new Set(G(t,`runner_up_user_id`,n).map(e=>e.season));return`
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
                <td>${f(e.season)}</td>
                <td class="muted">${f(r||e.team_name||`—`)}</td>
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
    </div>`}function Ye(e){if(!e.length)return``;let t=[...r(e,`year`).entries()].sort((e,t)=>t[0]-e[0]);return`
    <div class="card" data-collapse="profile-keepers" data-collapse-default="folded"
         data-collapse-title="Keepers" data-collapse-badge="${e.length}">
      ${t.map(([e,t])=>`
        <div class="subcard">
          <strong>${f(e)}</strong>
          <ul class="tidy">
            ${t.map(e=>`<li>${f(e.player)}${e.round_cost==null?``:` <span class="muted">— round ${f(e.round_cost)}</span>`}</li>`).join(``)}
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
                  <td>${f(e.season)}</td>
                  <td class="num">${d(t)}</td>
                  <td class="num">${d(n)}</td>
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
                 autocomplete="off" placeholder="${f(e.display_name)}" value="${f(t)}">
          <button class="btn small" type="submit">Save</button>
        </div>
        <p class="muted tiny">Leave it blank to go back to <strong>${f(e.display_name)}</strong>.</p>
      </form>
    </div>`}function Qe(e,t){let n=e.querySelector(`[data-golfname]`);n&&n.addEventListener(`submit`,async t=>{t.preventDefault();let r=n.golfname.value.trim(),i=n.querySelector(`button[type=submit]`);i.disabled=!0;try{let{data:t,error:n}=await h().rpc(`dfl_set_golf_name`,{p_name:r});if(n)throw n;if(!t)throw Error(`Pick your name in the top right first.`);await l().catch(()=>{}),S(r?`Golf calls you ${r}`:`Back to your DFL name`),W(e)}catch(e){S(/function|does not exist/i.test(e.message||``)?`Run golf_identity_schema.sql in Supabase`:e.message||`Could not save that name`,!0),i.disabled=!1}})}function K(){let e=k();return e===`system`?`Following your phone, which is ${A(y())} right now.`:D(e)?`${A(e)} colours, on a dark palette.`:`Always ${A(e)} on this device.`}function $e(){let e=k();return`
    <div class="card">
      <h3 class="card-heading">Appearance</h3>
      <div class="modebar" id="mode-pick">
        ${_().map(t=>`
          <button type="button" class="mode-opt ${t.id===e?`is-on`:``}"
                  data-mode-pick="${t.id}" aria-pressed="${t.id===e}">${f(t.name)}</button>`).join(``)}
      </div>
      <p class="muted tiny" id="mode-note">${f(K())}</p>
      ${D(e)?`<p class="muted tiny">Wearing ${f(A(e))} colours.
        Change that with your favourite club at the top of this page.</p>`:``}
      ${E()}
    </div>`}function et(e){let t=e.querySelector(`#mode-pick`)?.closest(`.card`);t&&(t.addEventListener(`click`,r=>{let i=r.target.closest(`[data-mode-pick]`);if(!i)return;let a=i.dataset.modePick;n(a);let o=k();t.querySelectorAll(`[data-mode-pick]`).forEach(e=>{let t=e.dataset.modePick===o;e.classList.contains(`tt-mine`)||(e.classList.toggle(`is-on`,t),e.hasAttribute(`aria-checked`)?e.setAttribute(`aria-checked`,String(t)):e.setAttribute(`aria-pressed`,String(t)))});let s=e.querySelector(`#mode-note`);s&&(s.textContent=K())}),x(t))}function tt(e,t){let n=e.filter(e=>e.id!==t.id);return n.length?`
    <nav class="profile-member-switch" aria-label="Browse member profiles">
      <div class="profile-member-switch-head"><strong>Browse members</strong><small>${n.length} profiles</small></div>
      <div class="chiprow">
        ${n.map(e=>`<a class="chip" href="#/profile?id=${e.id}">${f(e.display_name)}</a>`).join(``)}
      </div>
    </nav>`:``}var nt=/^(—|-|n\/a|)$/i;function q(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}function rt(e,t){return!!e&&!!t&&String(e).trim().toLowerCase()===String(t).trim().toLowerCase()}function it(e){return!e.titles.length&&!e.seconds.length?``:`
    <section class="cabinet">
      ${e.titles.length?`
        <div class="cab-row">
          <svg class="ico-sm" aria-hidden="true"><use href="#i-trophy"></use></svg>
          <b class="cab-n">${e.titles.length}</b>
          <span class="cab-l">${e.titles.length===1?`Championship`:`Championships`}</span>
          <span class="cab-years">${e.titles.map(e=>`<span class="cab-year">${f(e)}</span>`).join(``)}</span>
        </div>`:``}
      ${e.seconds.length?`
        <div class="cab-row is-second">
          <svg class="ico-sm" aria-hidden="true"><use href="#i-medal"></use></svg>
          <b class="cab-n">${e.seconds.length}</b>
          <span class="cab-l">Runner-up</span>
          <span class="cab-years">${e.seconds.map(e=>`<span class="cab-year">${f(e)}</span>`).join(``)}</span>
        </div>`:``}
    </section>`}function at(e,t,n){let r={seasons:[],scoring:[],streaks:[]},i=e=>String(n||e.team_name||``).trim();e.bestSeason&&r.seasons.push(J(`Best season`,Y(e.bestSeason.rank),i(e.bestSeason),`${e.bestSeason.season} · ${e.bestSeason.wins}-${e.bestSeason.losses}${e.bestSeason.ties?`-`+e.bestSeason.ties:``}`)),e.worstSeason&&e.bestSeason&&e.worstSeason.season!==e.bestSeason.season&&r.seasons.push(J(`Worst season`,Y(e.worstSeason.rank),i(e.worstSeason),`${e.worstSeason.season} · ${e.worstSeason.wins}-${e.worstSeason.losses}${e.worstSeason.ties?`-`+e.worstSeason.ties:``}`)),e.highWeek&&r.scoring.push(J(`Highest week`,e.highWeek.score.toFixed(2),``,`${e.highWeek.season} · Week ${e.highWeek.week}`)),e.lowWeek&&e.lowWeek!==e.highWeek&&r.scoring.push(J(`Lowest week`,e.lowWeek.score.toFixed(2),``,`${e.lowWeek.season} · Week ${e.lowWeek.week}`)),e.streak.win&&e.streak.win.run>=3&&r.streaks.push(J(`Longest win streak`,`${e.streak.win.run} weeks`,``,j(e.streak.win.from,e.streak.win.to))),e.streak.loss&&e.streak.loss.run>=3&&r.streaks.push(J(`Longest slide`,`${e.streak.loss.run} weeks`,``,j(e.streak.loss.from,e.streak.loss.to)));let a=[[`Seasons`,r.seasons],[`Scoring`,r.scoring],[`Streaks`,r.streaks]].filter(([,e])=>e.length);return a.length?`
    <h2 class="section-title">Career highlights</h2>
    <section class="card career-highlights">
      ${a.map(([e,t])=>`<div class="career-highlight-group"><h3>${e}</h3>${t.join(``)}</div>`).join(``)}
    </section>`:``}function J(e,t,n,r){let i=[r,n].filter(Boolean).join(` · `);return`
    <div class="career-moment">
      <span><b>${f(e)}</b>${i?`<small>${f(i)}</small>`:``}</span>
      <strong class="${nt.test(String(t??``).trim())?`is-empty`:``}">${f(t)}</strong>
    </div>`}function Y(e){if(e==null)return`—`;let t=e%100;return t>=11&&t<=13?`${e}th`:e+([`th`,`st`,`nd`,`rd`][e%10]||`th`)}function ot(e,t,n){if(!e.length)return``;let r=new Map(n.map(e=>[e.sleeper_user_id,e]));return`
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
                    ${i?`<a href="#/profile?id=${i.id}">${le({team_name:n.label,ownerName:i.display_name,identity:i},{meta:e.streak?`${e.streak.won?`Won`:`Lost`} last ${e.streak.count}`:`Series history`,compact:!0})}</a>`:f(n.label)}
                    ${a?`<span class="pill warn tiny">dead level</span>`:``}
                    ${o?`<span class="pill red tiny">never beaten them</span>`:``}
                    <button type="button" class="btn ghost small" data-share-rivalry-owner="${f(e.user)}" aria-label="Share rivalry stats against ${f(n.label)}">Share rivalry stats</button>
                  </td>
                  <td>${e.wins}-${e.losses}${e.ties?`-`+e.ties:``}</td>
                  <td class="${e.differential>0?`good`:e.differential<0?`bad`:`muted`}">${e.differential>0?`+`:``}${e.differential.toFixed(1)}<small class="rival-avg">${e.averageMargin>0?`+`:``}${e.averageMargin.toFixed(1)}/game</small></td>
                  <td class="num">${e.meetings}</td>
                  <td class="muted tiny">${e.last?`${e.last.season} Wk ${e.last.week} · ${e.last.won?`won`:`lost`} ${e.last.mine.toFixed(1)}–${e.last.theirs.toFixed(1)}`:`—`}</td>
                </tr>`}).join(``)}
          </tbody>
        </table>
      </div>
      <div class="card-meta">Every meeting on record, ${f(O)} onward.</div>
    </div>`}var X=e=>a(e),st=(e,t=null,n)=>u(e,t,n),ct=e=>p(e),Z=(e,t,n=!0)=>`<input id="${e}" name="${t}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" minlength="4" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" style="-webkit-text-security:disc" ${n?`required`:``}>`;async function lt(){let e=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`id`),t=await o(),n=s();return e?t.find(t=>String(t.id)===String(e)):n}async function ut(e){let{data:t,error:n}=await h().rpc(`profile_lock_status`,{target_member_id:Number(e)});if(n)throw n;return!!t}function dt(e){let t=String(e?.code||``),n=String(e?.message||``).toLowerCase();return t===`PGRST202`||t===`42883`||n.includes(`profile_lock_status`)&&n.includes(`not find`)}function Q(e,n,{statusUnknown:r=!1}={}){e.innerHTML=`<div id="profile-lock-gate"><div class="pin-panel"><span class="pin-mark">${t(`lock`,{size:24})}</span><h1>${r?`Unlock profile`:`Profile locked`}</h1><p class="muted">${r?`We couldn’t confirm the lock after changing views. Enter your PIN or try the check again.`:`${f(n.display_name)} keeps this one behind a PIN.`}</p><form id="profile-unlock-form" autocomplete="off"><label for="profile-unlock-pin">Profile PIN</label>${Z(`profile-unlock-pin`,`dfl-profile-unlock`).replace(`<input `,`<input class="pin-input" `)}<label class="access-trust"><input type="checkbox" data-trust-device><span><strong>Stay unlocked on this device</strong><small>Skip this PIN on this browser until you switch profiles. Use only on your own device.</small></span></label><div class="row-end"><a class="btn ghost" href="#/home">Back</a>${r?`<button class="btn ghost" type="button" id="profile-lock-retry">Retry</button>`:``}<button class="btn" type="submit">Unlock profile</button></div></form><p class="muted tiny pin-note">Forgot it? A DFL Owner can reset the lock, but nobody can read the PIN.</p></div></div>`;let i=e.querySelector(`#profile-unlock-form`),a=e.querySelector(`#profile-unlock-pin`);a?.addEventListener(`input`,()=>{a.value=a.value.replace(/\D/g,``).slice(0,6)}),e.querySelector(`#profile-lock-retry`)?.addEventListener(`click`,()=>$(e)),setTimeout(()=>a?.focus(),0),i?.addEventListener(`submit`,async t=>{t.preventDefault();let r=i.querySelector(`button[type=submit]`),o=!!i.querySelector(`[data-trust-device]`)?.checked;r.disabled=!0;try{let{data:t,error:r}=await h().rpc(`profile_verify_pin`,{target_member_id:Number(n.id),attempted_pin:a.value});if(r)throw r;if(t!==!0)throw Error(`Wrong profile PIN`);st(n.id,a.value,{rememberDevice:o}),S(o?`Profile unlocked on this device`:`Profile unlocked`),$(e)}catch(e){S(e.message||`Could not unlock profile`,!0),r.disabled=!1,a.select()}})}function ft(e,t,n){return n?`<div class="card" data-profile-lock-settings><div class="card-title">Profile lock</div><p class="muted tiny">Optional 4–6 digit PIN for using DFL HQ as you. You can trust your personal device when you unlock.</p><form id="profile-lock-form" autocomplete="off">${t?`<label for="profile-current-pin">Current PIN</label>${Z(`profile-current-pin`,`dfl-current-pin`)}`:``}<label for="profile-new-pin">${t?`New PIN`:`Choose a PIN`}</label>${Z(`profile-new-pin`,`dfl-new-pin`)}<div class="row-end">${t?`<button type="button" class="btn danger ghost" id="profile-disable-lock">Turn lock off</button>`:``}<button type="submit" class="btn">${t?`Change PIN`:`Turn lock on`}</button></div></form></div>`:`<div class="card note"><div class="card-title">Profile lock</div><div class="card-body muted">Profile PIN setup is ready in the app. Run <strong>profile_lock_schema.sql</strong> in Supabase to turn it on.</div></div>`}function pt(e,t,n){let r=e.querySelector(`[data-profile-lock-settings]`);if(!r)return;r.querySelectorAll(`input[inputmode="numeric"]`).forEach(e=>e.addEventListener(`input`,()=>{e.value=e.value.replace(/\D/g,``).slice(0,6)}));let i=r.querySelector(`#profile-lock-form`);i?.addEventListener(`submit`,async a=>{a.preventDefault();let o=r.querySelector(`#profile-current-pin`)?.value||null,s=r.querySelector(`#profile-new-pin`)?.value||``,c=i.querySelector(`button[type=submit]`);c.disabled=!0;try{let{error:r}=await h().rpc(`profile_set_pin`,{new_pin:s,current_pin:o});if(r)throw r;st(t.id,s),S(n?`Profile PIN changed`:`Profile lock turned on`),$(e)}catch(e){S(e.message||`Could not save profile PIN`,!0),c.disabled=!1}}),r.querySelector(`#profile-disable-lock`)?.addEventListener(`click`,async()=>{let n=r.querySelector(`#profile-current-pin`)?.value||``;if(!n){S(`Enter your current PIN first`,!0);return}if(confirm(`Turn off your Profile PIN?`))try{let{error:r}=await h().rpc(`profile_disable_pin`,{current_pin:n});if(r)throw r;ct(t.id),S(`Profile lock turned off`),$(e)}catch(e){S(e.message||`Could not turn off profile lock`,!0)}})}async function $(e){let t;try{t=await lt()}catch(t){e.innerHTML=`<h1>Profile</h1><div class="card"><div class="card-body">${f(t.message||`Could not load member`)}</div></div>`;return}if(!t)return W(e);let n=!1,r=!0;try{n=await ut(t.id)}catch(n){if(dt(n))r=!1;else if(!X(t.id)){Q(e,t,{statusUnknown:!0});return}}if(n&&!X(t.id)){Q(e,t);return}await W(e);let i=s();if(!(i&&String(i.id)===String(t.id)))return;let a=e.querySelector(`[data-profile-privacy-slot]`);a&&(a.innerHTML=ft(t,n,r),r&&pt(e,t,n))}export{$ as render};