import{$t as e,Bt as t,Cn as n,Ct as r,Dn as i,Dr as a,G as o,Gt as s,Ht as c,I as l,Jt as u,K as d,Mn as f,Sn as p,Tr as m,U as h,X as g,Xn as _,bt as v,ft as y,gt as b,ht as x,i as S,kn as C,mt as w,ot as T,pt as E,t as D,vt as O,wt as k,xn as A,yt as j}from"../app-core-CPA6ZiKj.js";import{Hn as ee,Ln as te,Pn as M,Qt as ne,Rn as N,Wn as P,cn as re,dn as ie,dt as ae,fn as oe,ft as se,gn as ce,nn as le,pn as ue,pt as de,rn as fe}from"../home-core-CagouYEB.js";import{t as pe}from"../fact-share-BycODxSj.js";import{c as me,t as he}from"../weekly-clubhouse-ui-BE3v5z8_.js";import{a as ge,l as _e,r as ve,u as ye}from"../notifications-hFi8agrb.js";var{BG:be,CARD:xe,LINE:Se,INK:Ce,MUTED:we,GOLD:Te,ACCENT:Ee,OK:De,BRAND_RED:Oe,BRAND_YELLOW:ke}=re,F=e=>Number.isFinite(Number(e))?Number(e):null,I=e=>F(e)==null?`—`:F(e).toFixed(1);function L(e){let t=F(e);if(t==null)return`—`;let n=[`th`,`st`,`nd`,`rd`],r=t%100;return t+(n[(r-20)%10]||n[r]||n[0])}function R(e){let t=F(e?.run);return t&&t>0?String(t):null}function Ae({member:e,career:t,extremes:n={},seasonCount:r=0,chipSeasons:i=[]}={}){if(!e)return null;let o=t||{},s=F(o.wins)??0,c=F(o.losses)??0,l=F(o.ties)??0,u=s+c+l,d=F(o.winPct)??(u?(s+l/2)/u:0),f=F(o.titles)??0,p=F(o.playoffs)??0,m=F(o.runnerUps)??0,h=i.length,g=[];g.push([`Championships`,String(f)]),g.push([`Playoff trips`,String(p)]),m&&g.push([`Runner-ups`,String(m)]),n.bestSeason&&g.push([`Best finish`,L(n.bestSeason.rank)]),n.highWeek&&g.push([`Nuclear week`,I(n.highWeek.score)]);let _=R(n.streak?.win);_&&g.push([`Win streak`,`${_} straight`]);let v=[];h&&v.push([`Chip Eater`,h>1?`${h}×`:String(i[0])]),n.worstSeason&&v.push([`Basement visit`,L(n.worstSeason.rank)]),n.lowWeek&&v.push([`Crime of a week`,I(n.lowWeek.score)]);let y=R(n.streak?.loss);y&&v.push([`Loss spiral`,`${y} straight`]),!h&&m&&v.push([`Almost had it`,`${m} runner-up${m===1?``:`s`}`]);let b={who:e.display_name||`DFL`,team:(e.team_name||``).trim(),seasons:a(F(r)??0),record:`${s}-${c}${l?`-${l}`:``}`,wins:s,losses:c,ties:l,games:u,winPct:d,points:Math.round(F(o.pointsFor)??0).toLocaleString(),avgFinish:F(o.avgFinish)==null?`—`:I(o.avgFinish),titles:f,playoffs:p,runnerUps:m,chips:h,trophyCase:g.slice(0,5),crimeScene:v.slice(0,5)};return b.verdict=je(b,n),b}function je(e,t={}){let n=F(t.streak?.loss?.run)??0,r=F(t.streak?.win?.run)??0,i=F(t.worstSeason?.rank);return e.titles>0&&e.chips>0?`Has lived at both ends of the standings. Ring on one hand, hot chip in the other.`:e.chips>=2?`Multiple trips to the basement. At this point the hot chip knows the address.`:e.titles>=3?`Dynasty credentials. Annoying as hell, but the hardware makes the argument for them.`:e.titles>=1&&e.winPct>=.55?`The shit talk has documentation: winning record, playoff damage, and a ring to point at.`:n>=6?`Once lost ${n} straight. That is not a slump; that is a subscription plan.`:i!=null&&i>=10?`Has finished ${L(i)}. The standings had to add a basement level.`:e.games>=20&&e.winPct<.4?`The résumé has seen some shit. The group chat should keep the screenshots handy.`:r>=6?`Put together ${r} straight wins once. For a while, everybody else was just schedule filler.`:e.playoffs&&!e.titles&&e.runnerUps?`Knows the route to the playoffs. Still looking for the last damn turn.`:e.winPct>=.55?`Annoyingly effective. The record gives the trash talk legal standing.`:`Dangerous enough to talk shit. Inconsistent enough that the receipts stay interesting.`}function z(e){if(!e)return``;let t=[`${e.who} — ${e.record} in ${e.seasons} DFL season${e.seasons===1?``:`s`}`];return e.titles&&t.push(`${e.titles} title${e.titles===1?``:`s`}`),e.chips&&t.push(`${e.chips}× Chip Eater`),`${t.join(` · `)}. ${e.verdict}`}function Me(e){return ie(ce(e))}async function Ne(e){let t=Ae(e);if(!t)return`none`;let n=Me(t),r=t.who.toLowerCase().replace(/[^a-z0-9]+/g,`-`),i=await oe(n,`dfl-${r}.png`,{title:`${t.who} · DFL HQ`,text:z(t)});return i===`none`&&await ue({title:`${t.who} · DFL HQ`,text:z(t)}),i}var B=500,Pe=E.avatar.maxPx,V=y;function H(e,n,r,i){let a=fe({team_name:i.currentTeam||e.team_name||e.display_name,identity:{...e,profile_image:n}},{className:`avatar ph-team-mark`});return r?`<div class="ph-avatar">
    ${a}
    <button type="button" class="ph-photo-btn" data-photo-pick
            title="${n?`Change photo`:`Add a photo`}"
            aria-label="${n?`Change photo`:`Add a photo`}">${t(`camera`,{size:14})}</button>
    <input type="file" accept="image/png,image/jpeg,image/webp" hidden data-photo-file>
  </div>`:`<div class="ph-avatar">${a}</div>`}function Fe(e){let r=[],i=e.joined_year||e.first_season;return i&&r.push(`<div><b>${n(i)}</b><small>Debut</small></div>`),Number(e.championships)>0&&r.push(`<div class="is-gold"><b>${t(`trophy`,{size:15})}${n(e.championships)}</b>
      <small>Championship${Number(e.championships)===1?``:`s`}</small></div>`),`<div class="ph-record">${r.join(``)}<div data-chip-slot></div></div>`}function U(e,t){let r=t.currentTeam||e.display_name,i=[];return t.currentTeam&&e.display_name&&t.currentTeam!==e.display_name&&i.push(n(e.display_name)),t.currentTeam&&t.currentSeason&&i.push(`${n(t.currentSeason)} team`),`<div class="ph-id">
    <h1 class="profile-name">${n(r)}</h1>
    ${i.length?`<div class="ph-handle muted">${i.join(` · `)}</div>`:``}
  </div>`}function Ie(e,t,r){let i=String(e.bio||``).trim();return`<section class="card profile-head accent">
    <div class="ph-top">
      ${H(e,e.profile_image,t,r)}
      ${U(e,r)}
      ${t?`<button type="button" class="btn ghost small ph-edit" data-dfl-edit>Edit</button>`:``}
    </div>
    ${se(e)}
    ${Fe(e)}
    ${i?`<p class="dfl-bio">${n(i)}</p>`:``}
    ${r.actions?`<div class="row ph-actions">${r.actions}</div>`:``}
  </section>`}function Le(e,t,r){let i=t.image===void 0?e.profile_image:t.image;return`<section class="card profile-head accent is-editing">
    <div class="ph-top">
      ${H(e,i,!0,r)}
      ${U(e,r)}
      <button type="button" class="btn ghost small ph-edit" data-dfl-cancel>Cancel</button>
    </div>

    <p class="muted tiny ph-photo-note">
      ${i?`Photo shrunk to ${Pe}px. ${n(w(i))}.`:`Tap the camera to add a photo.`}
      ${i?`<button type="button" class="linkbtn" data-photo-clear>Remove photo</button>`:``}
    </p>

    <div class="dfl-field">
      <label class="u-label" for="dfl-bio">About me</label>
      <textarea id="dfl-bio" data-bio maxlength="${B}" rows="4"
                placeholder="Bio">${n(t.bio)}</textarea>
      <span class="muted tiny"><span data-bio-count>${t.bio.length}</span>/${B}</span>
    </div>

    <div data-profile-identity-editor></div>

    <div class="row-end"><button type="button" class="btn" data-dfl-save>Save</button></div>
  </section>`}async function Re(e){let t=e.sleeper_user_id?await N().catch(()=>null):null,n=t&&!t.error?M(t,e.sleeper_user_id):null,r=[];if(e.sleeper_user_id){let{data:t}=await _().from(`sleeper_leagues`).select(`season,last_place_user_id`).eq(`last_place_user_id`,e.sleeper_user_id).order(`season`);r=(t||[]).map(e=>String(e.season))}return{career:n,extremes:n,chipSeasons:r}}function ze(e,t,n,r,i={}){let a=e.querySelector(`[data-dfl-host]`);if(!a)return;let o=!1,s=null,c=()=>({bio:String(t.bio||``).trim(),image:void 0}),l=async()=>{let e=a.querySelector(`[data-profile-identity-editor]`);if(e)try{let n=await Re(t);e.innerHTML=ae(t,n.career,n.extremes,n.chipSeasons),de(e,t,r)}catch{e.innerHTML=``}},u=()=>{a.innerHTML=o?Le(t,s,i):Ie(t,n,i),o&&l(),i.onRepaint?.()};u(),a.addEventListener(`input`,e=>{if(s&&e.target.matches(`[data-bio]`)){s.bio=e.target.value;let t=a.querySelector(`[data-bio-count]`);t&&(t.textContent=String(s.bio.length))}}),a.addEventListener(`change`,async e=>{if(!e.target.matches(`[data-photo-file]`))return;let t=e.target.files?.[0];if(t){if(!/^image\//.test(t.type)){f(`Pick an image file`,!0);return}if(t.size>V){f(`That image is over ${x(V)}`,!0);return}s||=(o=!0,c());try{s.image=await T(t,`avatar`),u(),f(`Photo ready (${w(s.image)}) — press Save`)}catch(e){f(e.message||`Could not read that image`,!0)}}}),a.addEventListener(`click`,async e=>{if(e.target.closest(`[data-dfl-edit]`)){o=!0,s=c(),u();return}if(e.target.closest(`[data-dfl-cancel]`)){o=!1,s=null,u();return}if(e.target.closest(`[data-photo-pick]`)){a.querySelector(`[data-photo-file]`)?.click();return}if(!s)return;if(e.target.closest(`[data-photo-clear]`)){s.image=null,u();return}let t=e.target.closest(`[data-dfl-save]`);if(t){t.disabled=!0;try{let{data:e,error:t}=await _().rpc(`dfl_update_profile`,{p_bio:s.bio,p_image:s.image===void 0||s.image===null?null:s.image,p_clear_image:s.image===null});if(t)throw t;if(!Number(e))throw Error(`Pick your name again from the top bar and retry.`);f(`Profile saved`),o=!1,s=null,await r()}catch(e){f(e.message||`Could not save`,!0),t.disabled=!1}}})}var Be=`[data-profile-notifications-slot]`;function Ve(e,t){if(!t.supported)return`<div class="card">
      <h3 class="card-heading">Notifications</h3>
      <p class="muted tiny">${n(t.reason)}</p>
    </div>`;let r=e.enabled&&!!e.subscription,i=Notification.permission===`denied`;return`<div class="card">
    <h3 class="card-heading">Notifications</h3>
    <p class="muted tiny">${r?`On for this device. League alerts reach this phone even when DFL HQ is closed.`:i?`Blocked in this browser's settings. Allow notifications for DFL HQ there, then come back.`:`Off for this device. Turn them on for trades, polls, fee reminders and commissioner notes.`}</p>
    <div class="row-end">
      ${r?`<a class="btn ghost small" href="#/notifications">Choose which ones</a>`:``}
      ${i&&!r?``:`<button type="button" class="btn ${r?`ghost`:``} small" data-profile-push="${r?`off`:`on`}">${r?`Turn off on this device`:`Enable notifications`}</button>`}
    </div>
  </div>`}async function W(e){let t=_e(),n={enabled:!1,subscription:null};if(t.supported)try{n=await ye()}catch{}e.innerHTML=Ve(n,t)}async function He(e){let t=e.querySelector(Be);t&&(await W(t),t.addEventListener(`click`,async e=>{let n=e.target.closest(`[data-profile-push]`);if(!n)return;let r=n.dataset.profilePush===`on`;n.disabled=!0;try{r?await ge():await ve(),f(r?`Notifications enabled on this device`:`Notifications turned off on this device`),await W(t)}catch(e){f(e.message||`Could not change notifications`,!0),n.disabled=!1}}))}async function G(t){let r=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`id`),i;try{i=await s()}catch(e){t.innerHTML=`<h1>Profile</h1>`+p(e)+`<div class="card"><div class="card-body muted">If the members table is missing, run
       <strong>members_schema.sql</strong> in Supabase.</div></div>`;return}let a=c(),o=r?i.find(e=>String(e.id)===String(r)):a;if(!o){t.innerHTML=`<h1>Profile</h1>${A(`No profile selected.`)}`;return}let d=a&&String(a.id)===String(o.id),[m,h,v,y,b]=await Promise.all([o.sleeper_user_id?_().from(`sleeper_standings`).select(`*`).eq(`sleeper_user_id`,o.sleeper_user_id):{data:[]},_().from(`sleeper_leagues`).select(`season, champion_user_id, runner_up_user_id`),_().from(`keepers`).select(`*`),_().from(`finance_payments`).select(`*`),o.sleeper_user_id?_().from(`sleeper_users`).select(`*`).eq(`sleeper_user_id`,o.sleeper_user_id).maybeSingle():{data:null}]),x=o.sleeper_user_id?await N().catch(()=>null):null,S=x&&!x.error?M(x,o.sleeper_user_id):null,C=x&&!x.error?te(x,o.sleeper_user_id):[],w=x&&!x.error?ee(x):null,T=o.team_name||b?.data?.team_name||``,E=(m.data||[]).sort((e,t)=>t.season-e.season),D=Ue(E,h.data||[],o.sleeper_user_id),O=S?{...o,championships:S.titles.length}:o;S&&(D.titles=S.titles.length,D.runnerUps=S.seconds.length);let k=(v.data||[]).filter(t=>String(e(t.team,i,{member_id:t.member_id})?.id)===String(o.id)),j=(y.data||[]).filter(t=>nt(t.owner_name,o.display_name)||String(e(t.team_name,i,{member_id:t.member_id})?.id)===String(o.id)).sort((e,t)=>t.season-e.season),P=[he(),Ke(o),qe(E,h.data||[],o.sleeper_user_id,T),w?at(C,w,i):``,Je(k),Ye(j)].filter(Boolean);t.innerHTML=`
    <div id="profile-wrap">
      <div data-dfl-host></div>
      ${o.notes?`<div class="card"><h3 class="card-heading">Notes</h3>
                          <div class="card-body">${n(o.notes)}</div></div>`:``}
      ${We(D,E.length)}
      ${S?rt(S):``}
      ${S&&w?it(S,w,T):``}
      ${et(i,o)}
      ${P.length?`<h2 class="section-title">Record &amp; reference</h2>`:``}
      ${P.join(``)}
      ${d?`<details class="profile-settings" id="profile-settings"><summary><span><small>YOUR PROFILE</small><strong>Settings &amp; privacy</strong></span><em>Golf name, appearance, notifications and access</em></summary><div class="profile-settings-body">${Xe(o)}${Qe()}<div data-profile-notifications-slot></div><div data-profile-privacy-slot></div><div class="profile-account-actions"><button type="button" class="btn ghost small" id="switch-member">Sign out / Switch</button></div></div></details>`:``}
    </div>
  `,d&&He(t),ze(t,O,d,()=>G(t),{currentTeam:T,currentSeason:b?.data?.current_season,actions:d?``:`<a class="btn ghost small" href="#/profile">Back to my profile</a>`,onRepaint:()=>{g(t)}}),t.querySelectorAll(`[data-share-rivalry-owner]`).forEach(e=>e.addEventListener(`click`,()=>{let t=C.find(t=>String(t.user)===e.dataset.shareRivalryOwner);if(!t||!w)return;let n=ne({left:w(o.sleeper_user_id).label,right:w(t.user).label,series:t});Promise.resolve(pe(n)).then(e=>{e===`failed`&&f(`Could not share the rivalry stats`,!0)})})),t.querySelector(`[data-share-profile]`)?.addEventListener(`click`,async e=>{let n=e.currentTarget;n.disabled=!0;try{await Ne({member:o,career:D,extremes:S||{},seasonCount:E.length,chipSeasons:(t.querySelector(`[data-chip-eaters="badge"]`)?.title||``).split(`,`).map(e=>e.trim()).filter(Boolean)})}catch(e){f(e?.message||`Could not build that card`,!0)}finally{n.disabled=!1}}),d&&($e(t),Ze(t,o)),me(t,o.id),l(t.querySelector(`#profile-wrap`),async()=>{await u(),G(t)}),t.addEventListener(`click`,e=>{e.target.closest(`#switch-member`)&&window.dispatchEvent(new CustomEvent(`dfl:pick-member`,{detail:{forgetMemberId:o.id}}))})}function K(e,t,n){return n==null?[]:e.filter(e=>e[t]!=null&&e[t]===n)}function Ue(e,t,n){let r=J(e,`wins`),i=J(e,`losses`),a=J(e,`ties`),o=r+i+a,s=e.filter(e=>e.rank!=null);return{wins:r,losses:i,ties:a,winPct:o?(r+a/2)/o:0,pointsFor:J(e,`points_for`),avgFinish:s.length?s.reduce((e,t)=>e+t.rank,0)/s.length:null,playoffs:e.filter(e=>e.made_playoffs).length,titles:K(t,`champion_user_id`,n).length,runnerUps:K(t,`runner_up_user_id`,n).length}}function We(e,t){return t?`
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
    </section>`:`<div class="card"><div class="card-title">Career</div>${A(`No Sleeper history linked.`)}</div>`}var Ge=5;function Ke(e){let t=(e.awards||``).split(`
`).map(e=>e.trim()).filter(Boolean);if(!t.length)return``;let r=t.length>=Ge;return`
    <div class="card" data-collapse="profile-awards" data-collapse-title="Awards"
         data-collapse-badge="${t.length}"${r?` data-collapse-default="folded"`:``}>
      <ul class="tidy">${t.map(e=>`<li>${n(e)}</li>`).join(``)}</ul>
    </div>`}function qe(e,t,r,i){if(!e.length)return``;let a=new Set(K(t,`champion_user_id`,r).map(e=>e.season)),o=new Set(K(t,`runner_up_user_id`,r).map(e=>e.season));return`
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
                <td>${n(e.season)}</td>
                <td class="muted">${n(i||e.team_name||`—`)}</td>
                <td>${e.wins}-${e.losses}${e.ties?`-`+e.ties:``}</td>
                <td class="num">${Math.round(e.points_for).toLocaleString()}</td>
                <td>
                  ${e.rank??`—`}
                  ${a.has(e.season)?`<span class="pill green">champion</span>`:``}
                  ${o.has(e.season)?`<span class="pill">runner up</span>`:``}
                  ${!a.has(e.season)&&e.made_playoffs?`<span class="pill grey">playoffs</span>`:``}
                </td>
              </tr>`).join(``)}
          </tbody>
        </table>
      </div>
    </div>`}function Je(e){if(!e.length)return``;let t=[...i(e,`year`).entries()].sort((e,t)=>t[0]-e[0]);return`
    <div class="card" data-collapse="profile-keepers" data-collapse-default="folded"
         data-collapse-title="Keepers" data-collapse-badge="${e.length}">
      ${t.map(([e,t])=>`
        <div class="subcard">
          <strong>${n(e)}</strong>
          <ul class="tidy">
            ${t.map(e=>`<li>${n(e.player)}${e.round_cost==null?``:` <span class="muted">— round ${n(e.round_cost)}</span>`}</li>`).join(``)}
          </ul>
        </div>`).join(``)}
    </div>`}function Ye(e){if(!e.length)return``;let t=e.filter(e=>Number(e.amount_paid||0)<Number(e.amount_due||0)).length;return`
    <div class="card" data-collapse="profile-dues" data-collapse-default="folded"
         data-collapse-title="Financial status"
         data-collapse-badge="${t?`${t} due`:`Settled`}">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Season</th><th class="num">Due</th><th class="num">Paid</th><th>Status</th></tr></thead>
          <tbody>
            ${e.map(e=>{let t=Number(e.amount_due||0),r=Number(e.amount_paid||0),i=r>=t&&t>0?[`Paid`,`green`]:r>0?[`Partial`,`warn`]:[`Unpaid`,`red`];return`
                <tr>
                  <td>${n(e.season)}</td>
                  <td class="num">${C(t)}</td>
                  <td class="num">${C(r)}</td>
                  <td><span class="pill ${i[1]}">${i[0]}</span></td>
                </tr>`}).join(``)}
          </tbody>
        </table>
      </div>
    </div>`}function Xe(e){let t=String(e.golf_name||``).trim();return`
    <div class="card">
      <div class="card-title">Your golf name</div>
      <p class="muted tiny">What the scorecards, the leaderboard and the shared
        cards call you. Your DFL name, your Sleeper account and all of your
        fantasy history are untouched.</p>
      <form class="golfname-form" data-golfname>
        <label for="golf-name-input">Golf name</label>
        <div class="golfname-row">
          <input id="golf-name-input" name="golfname" type="text" maxlength="40"
                 autocomplete="off" placeholder="${n(e.display_name)}" value="${n(t)}">
          <button class="btn small" type="submit">Save</button>
        </div>
        <p class="muted tiny">Leave it blank to go back to <strong>${n(e.display_name)}</strong>.</p>
      </form>
    </div>`}function Ze(e,t){let n=e.querySelector(`[data-golfname]`);n&&n.addEventListener(`submit`,async t=>{t.preventDefault();let r=n.golfname.value.trim(),i=n.querySelector(`button[type=submit]`);i.disabled=!0;try{let{data:t,error:n}=await _().rpc(`dfl_set_golf_name`,{p_name:r});if(n)throw n;if(!t)throw Error(`Pick your name in the top right first.`);await u().catch(()=>{}),f(r?`Golf calls you ${r}`:`Back to your DFL name`),G(e)}catch(e){f(/function|does not exist/i.test(e.message||``)?`Run golf_identity_schema.sql in Supabase`:e.message||`Could not save that name`,!0),i.disabled=!1}})}function q(){let e=k();return e===`system`?`Following your phone, which is ${j(b())} right now.`:O(e)?`${j(e)} colours, on a dark palette.`:`Always ${j(e)} on this device.`}function Qe(){let e=k();return`
    <div class="card">
      <h3 class="card-heading">Appearance</h3>
      <div class="modebar" id="mode-pick">
        ${v().map(t=>`
          <button type="button" class="mode-opt ${t.id===e?`is-on`:``}"
                  data-mode-pick="${t.id}" aria-pressed="${t.id===e}">${n(t.name)}</button>`).join(``)}
      </div>
      <p class="muted tiny" id="mode-note">${n(q())}</p>
      ${O(e)?`<p class="muted tiny">Wearing ${n(j(e))} colours.
        Change that with your favourite club at the top of this page.</p>`:``}
      ${D()}
    </div>`}function $e(e){let t=e.querySelector(`#mode-pick`)?.closest(`.card`);t&&(t.addEventListener(`click`,n=>{let i=n.target.closest(`[data-mode-pick]`);if(!i)return;let a=i.dataset.modePick;r(a);let o=k();t.querySelectorAll(`[data-mode-pick]`).forEach(e=>{let t=e.dataset.modePick===o;e.classList.contains(`tt-mine`)||(e.classList.toggle(`is-on`,t),e.hasAttribute(`aria-checked`)?e.setAttribute(`aria-checked`,String(t)):e.setAttribute(`aria-pressed`,String(t)))});let s=e.querySelector(`#mode-note`);s&&(s.textContent=q())}),S(t))}function et(e,t){let r=e.filter(e=>e.id!==t.id);return r.length?`
    <nav class="profile-member-switch" aria-label="Browse member profiles">
      <div class="profile-member-switch-head"><strong>Browse members</strong><small>${r.length} profiles</small></div>
      <div class="chiprow">
        ${r.map(e=>`<a class="chip" href="#/profile?id=${e.id}">${n(e.display_name)}</a>`).join(``)}
      </div>
    </nav>`:``}var tt=/^(—|-|n\/a|)$/i;function J(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}function nt(e,t){return!!e&&!!t&&String(e).trim().toLowerCase()===String(t).trim().toLowerCase()}function rt(e){return!e.titles.length&&!e.seconds.length?``:`
    <section class="cabinet">
      ${e.titles.length?`
        <div class="cab-row">
          <svg class="ico-sm" aria-hidden="true"><use href="#i-trophy"></use></svg>
          <b class="cab-n">${e.titles.length}</b>
          <span class="cab-l">${e.titles.length===1?`Championship`:`Championships`}</span>
          <span class="cab-years">${e.titles.map(e=>`<span class="cab-year">${n(e)}</span>`).join(``)}</span>
        </div>`:``}
      ${e.seconds.length?`
        <div class="cab-row is-second">
          <svg class="ico-sm" aria-hidden="true"><use href="#i-medal"></use></svg>
          <b class="cab-n">${e.seconds.length}</b>
          <span class="cab-l">Runner-up</span>
          <span class="cab-years">${e.seconds.map(e=>`<span class="cab-year">${n(e)}</span>`).join(``)}</span>
        </div>`:``}
    </section>`}function it(e,t,n){let r={seasons:[],scoring:[],streaks:[]},i=e=>String(n||e.team_name||``).trim();e.bestSeason&&r.seasons.push(Y(`Best season`,X(e.bestSeason.rank),i(e.bestSeason),`${e.bestSeason.season} · ${e.bestSeason.wins}-${e.bestSeason.losses}${e.bestSeason.ties?`-`+e.bestSeason.ties:``}`)),e.worstSeason&&e.bestSeason&&e.worstSeason.season!==e.bestSeason.season&&r.seasons.push(Y(`Worst season`,X(e.worstSeason.rank),i(e.worstSeason),`${e.worstSeason.season} · ${e.worstSeason.wins}-${e.worstSeason.losses}${e.worstSeason.ties?`-`+e.worstSeason.ties:``}`)),e.highWeek&&r.scoring.push(Y(`Highest week`,e.highWeek.score.toFixed(2),``,`${e.highWeek.season} · Week ${e.highWeek.week}`)),e.lowWeek&&e.lowWeek!==e.highWeek&&r.scoring.push(Y(`Lowest week`,e.lowWeek.score.toFixed(2),``,`${e.lowWeek.season} · Week ${e.lowWeek.week}`)),e.streak.win&&e.streak.win.run>=3&&r.streaks.push(Y(`Longest win streak`,`${e.streak.win.run} weeks`,``,P(e.streak.win.from,e.streak.win.to))),e.streak.loss&&e.streak.loss.run>=3&&r.streaks.push(Y(`Longest slide`,`${e.streak.loss.run} weeks`,``,P(e.streak.loss.from,e.streak.loss.to)));let a=[[`Seasons`,r.seasons],[`Scoring`,r.scoring],[`Streaks`,r.streaks]].filter(([,e])=>e.length);return a.length?`
    <h2 class="section-title">Career highlights</h2>
    <section class="card career-highlights">
      ${a.map(([e,t])=>`<div class="career-highlight-group"><h3>${e}</h3>${t.join(``)}</div>`).join(``)}
    </section>`:``}function Y(e,t,r,i){let a=[i,r].filter(Boolean).join(` · `);return`
    <div class="career-moment">
      <span><b>${n(e)}</b>${a?`<small>${n(a)}</small>`:``}</span>
      <strong class="${tt.test(String(t??``).trim())?`is-empty`:``}">${n(t)}</strong>
    </div>`}function X(e){if(e==null)return`—`;let t=e%100;return t>=11&&t<=13?`${e}th`:e+([`th`,`st`,`nd`,`rd`][e%10]||`th`)}function at(e,t,r){if(!e.length)return``;let i=new Map(r.map(e=>[e.sleeper_user_id,e]));return`
    <div class="card" data-collapse="profile-h2h" data-collapse-default="folded"
         data-collapse-title="Head to head"
         data-collapse-badge="${e.length} opponent${e.length===1?``:`s`}">
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr>
            <th>Opponent</th><th>Record</th><th>Point edge</th><th class="num">Met</th><th>Last</th>
          </tr></thead>
          <tbody>
            ${e.map(e=>{let r=t(e.user),a=i.get(e.user),o=e.meetings>=8&&e.wins===e.losses,s=e.meetings>=5&&e.wins===0;return`
                <tr>
                  <td class="profile-rival-team">
                    ${a?`<a href="#/profile?id=${a.id}">${le({team_name:r.label,ownerName:a.display_name,identity:a},{meta:e.streak?`${e.streak.won?`Won`:`Lost`} last ${e.streak.count}`:`Series history`,compact:!0})}</a>`:n(r.label)}
                    ${o?`<span class="pill warn tiny">dead level</span>`:``}
                    ${s?`<span class="pill red tiny">never beaten them</span>`:``}
                    <button type="button" class="btn ghost small" data-share-rivalry-owner="${n(e.user)}" aria-label="Share rivalry stats against ${n(r.label)}">Share rivalry stats</button>
                  </td>
                  <td>${e.wins}-${e.losses}${e.ties?`-`+e.ties:``}</td>
                  <td class="${e.differential>0?`good`:e.differential<0?`bad`:`muted`}">${e.differential>0?`+`:``}${e.differential.toFixed(1)}<small class="rival-avg">${e.averageMargin>0?`+`:``}${e.averageMargin.toFixed(1)}/game</small></td>
                  <td class="num">${e.meetings}</td>
                  <td class="muted tiny">${e.last?`${e.last.season} Wk ${e.last.week} · ${e.last.won?`won`:`lost`} ${e.last.mine.toFixed(1)}–${e.last.theirs.toFixed(1)}`:`—`}</td>
                </tr>`}).join(``)}
          </tbody>
        </table>
      </div>
      <div class="card-meta">Every meeting on record, ${n(m)} onward.</div>
    </div>`}var ot=e=>o(e),st=(e,t=null,n)=>d(e,t,n),ct=e=>h(e),Z=(e,t,n=!0)=>`<input id="${e}" name="${t}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" minlength="4" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" style="-webkit-text-security:disc" ${n?`required`:``}>`;async function lt(){let e=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`id`),t=await s(),n=c();return e?t.find(t=>String(t.id)===String(e)):n}async function ut(e){let{data:t,error:n}=await _().rpc(`profile_lock_status`,{target_member_id:Number(e)});if(n)throw n;return!!t}function dt(e){let t=String(e?.code||``),n=String(e?.message||``).toLowerCase();return t===`PGRST202`||t===`42883`||n.includes(`profile_lock_status`)&&n.includes(`not find`)}function Q(e,r,{statusUnknown:i=!1}={}){e.innerHTML=`<div id="profile-lock-gate"><div class="pin-panel"><span class="pin-mark">${t(`lock`,{size:24})}</span><h1>${i?`Unlock profile`:`Profile locked`}</h1><p class="muted">${i?`We couldn’t confirm the lock after changing views. Enter your PIN or try the check again.`:`${n(r.display_name)} keeps this one behind a PIN.`}</p><form id="profile-unlock-form" autocomplete="off"><label for="profile-unlock-pin">Profile PIN</label>${Z(`profile-unlock-pin`,`dfl-profile-unlock`).replace(`<input `,`<input class="pin-input" `)}<label class="access-trust"><input type="checkbox" data-trust-device><span><strong>Stay unlocked on this device</strong><small>Skip this PIN on this browser until you switch profiles. Use only on your own device.</small></span></label><div class="row-end"><a class="btn ghost" href="#/home">Back</a>${i?`<button class="btn ghost" type="button" id="profile-lock-retry">Retry</button>`:``}<button class="btn" type="submit">Unlock profile</button></div></form><p class="muted tiny pin-note">Forgot it? A DFL Owner can reset the lock, but nobody can read the PIN.</p></div></div>`;let a=e.querySelector(`#profile-unlock-form`),o=e.querySelector(`#profile-unlock-pin`);o?.addEventListener(`input`,()=>{o.value=o.value.replace(/\D/g,``).slice(0,6)}),e.querySelector(`#profile-lock-retry`)?.addEventListener(`click`,()=>$(e)),setTimeout(()=>o?.focus(),0),a?.addEventListener(`submit`,async t=>{t.preventDefault();let n=a.querySelector(`button[type=submit]`),i=!!a.querySelector(`[data-trust-device]`)?.checked;n.disabled=!0;try{let{data:t,error:n}=await _().rpc(`profile_verify_pin`,{target_member_id:Number(r.id),attempted_pin:o.value});if(n)throw n;if(t!==!0)throw Error(`Wrong profile PIN`);st(r.id,o.value,{rememberDevice:i}),f(i?`Profile unlocked on this device`:`Profile unlocked`),$(e)}catch(e){f(e.message||`Could not unlock profile`,!0),n.disabled=!1,o.select()}})}function ft(e,t,n){return n?`<div class="card" data-profile-lock-settings><div class="card-title">Profile lock</div><p class="muted tiny">Optional 4–6 digit PIN for using DFL HQ as you. You can trust your personal device when you unlock.</p><form id="profile-lock-form" autocomplete="off">${t?`<label for="profile-current-pin">Current PIN</label>${Z(`profile-current-pin`,`dfl-current-pin`)}`:``}<label for="profile-new-pin">${t?`New PIN`:`Choose a PIN`}</label>${Z(`profile-new-pin`,`dfl-new-pin`)}<div class="row-end">${t?`<button type="button" class="btn danger ghost" id="profile-disable-lock">Turn lock off</button>`:``}<button type="submit" class="btn">${t?`Change PIN`:`Turn lock on`}</button></div></form></div>`:`<div class="card note"><div class="card-title">Profile lock</div><div class="card-body muted">Profile PIN setup is ready in the app. Run <strong>profile_lock_schema.sql</strong> in Supabase to turn it on.</div></div>`}function pt(e,t,n){let r=e.querySelector(`[data-profile-lock-settings]`);if(!r)return;r.querySelectorAll(`input[inputmode="numeric"]`).forEach(e=>e.addEventListener(`input`,()=>{e.value=e.value.replace(/\D/g,``).slice(0,6)}));let i=r.querySelector(`#profile-lock-form`);i?.addEventListener(`submit`,async a=>{a.preventDefault();let o=r.querySelector(`#profile-current-pin`)?.value||null,s=r.querySelector(`#profile-new-pin`)?.value||``,c=i.querySelector(`button[type=submit]`);c.disabled=!0;try{let{error:r}=await _().rpc(`profile_set_pin`,{new_pin:s,current_pin:o});if(r)throw r;st(t.id,s),f(n?`Profile PIN changed`:`Profile lock turned on`),$(e)}catch(e){f(e.message||`Could not save profile PIN`,!0),c.disabled=!1}}),r.querySelector(`#profile-disable-lock`)?.addEventListener(`click`,async()=>{let n=r.querySelector(`#profile-current-pin`)?.value||``;if(!n){f(`Enter your current PIN first`,!0);return}if(confirm(`Turn off your Profile PIN?`))try{let{error:r}=await _().rpc(`profile_disable_pin`,{current_pin:n});if(r)throw r;ct(t.id),f(`Profile lock turned off`),$(e)}catch(e){f(e.message||`Could not turn off profile lock`,!0)}})}async function $(e){let t;try{t=await lt()}catch(t){e.innerHTML=`<h1>Profile</h1><div class="card"><div class="card-body">${n(t.message||`Could not load member`)}</div></div>`;return}if(!t)return G(e);let r=!1,i=!0;try{r=await ut(t.id)}catch(n){if(dt(n))i=!1;else if(!ot(t.id)){Q(e,t,{statusUnknown:!0});return}}if(r&&!ot(t.id)){Q(e,t);return}await G(e);let a=c();if(!(a&&String(a.id)===String(t.id)))return;let o=e.querySelector(`[data-profile-privacy-slot]`);o&&(o.innerHTML=ft(t,r,i),i&&pt(e,t,r))}export{$ as render};