import{Br as e,Dn as t,F as n,Fr as r,I as i,M as a,N as o,Nr as s,On as c,P as l,Pr as u,Sr as d,Vn as f,_r as p,gn as m,gr as h,j as g,vn as _,zr as v}from"../app-core-dF-WnX0G.js";import{$t as y,Bt as b,Gt as x,Jt as S,Kt as C,Qt as w,Rt as T,Ut as E,Wt as D,Xt as O,Yt as k,Zt as ee,_r as A,qi as j,qt as M,vr as N}from"../home-core-ConfTc-O.js";var P={QB:12,RB:24,WR:30,TE:12},F=[.5,.3,.2],te=[1,.5,.25],I=new Set([`907844411101487104`,`907840843644805120`]);function L(e=[]){return e.filter(e=>e?.type===`trade`&&e?.status===`complete`&&e?.details?.status===`complete`)}function R(e){let t=new Map;for(let n of e?.details?.roster_ids||[])t.set(String(n),[]);for(let[n,r]of Object.entries(e?.details?.adds||{})){let e=String(r);t.has(e)||t.set(e,[]),t.get(e).push(String(n))}return[...t.entries()].map(([e,t])=>({rosterId:e,playerIds:t}))}function z(e,t){return String(e?.[t]?.p||e?.[t]?.position||``).toUpperCase()}function ne(e,t,n,r){let i=new Map(Object.keys(P).map(e=>[e,[]]));for(let[a,o]of Object.entries(t.get(e)||{})){let t=z(r,a);if(!i.has(t))continue;let s=j(o,n.get(e));s!=null&&i.get(t).push(s)}return new Map([...i].map(([e,t])=>(t.sort((e,t)=>t-e),[e,t[P[e]-1]??t.at(-1)??0])))}function re(e,t,n,r,i,a,o){let s=[];for(let e=Number(t);e<=Math.min(Number(t)+2,n);e++)r.has(e)&&i.has(e)&&s.push(e);if(!s.length)return null;let c=s.reduce((e,t,n)=>e+F[n],0),l=[];for(let t of e){let e=z(a,t);if(!P[e]){l.push(0);continue}let n=s.reduce((n,a,s)=>{let c=j(r.get(a)?.[t],i.get(a))||0,l=o.get(a)?.get(e)||0;return n+Math.max(0,c-l)*F[s]},0)/c;l.push(n)}l.sort((e,t)=>t-e);let u=l.reduce((e,t,n)=>e+t*(te[n]??.1),0);return Math.round(u*10)/10}function ie({trades:e=[],latestSeason:t=0,statsBySeason:n=new Map,scoringBySeason:r=new Map,players:i={}}={}){let a=new Map([...n.keys()].map(e=>[e,ne(e,n,r,i)]));return L(e).filter(e=>!I.has(String(e?.details?.transaction_id||``))).map(e=>{let o=R(e).map(o=>({...o,outcome:re(o.playerIds,e.season,t,n,r,i,a)}));return o.length<2||o.some(e=>e.outcome==null||!e.playerIds.length)?null:(o.sort((e,t)=>t.outcome-e.outcome),{trade:e,winner:o[0],loser:o.at(-1),gap:Math.round((o[0].outcome-o.at(-1).outcome)*10)/10})}).filter(e=>e&&e.gap>0).sort((e,t)=>t.gap-e.gap)}function ae({text:e,field:t,key:n,canEdit:i=!1}={}){let a=e||`—`;return i?`<button type="button" class="name-pick" data-name-pick="${r(t)}"
    data-name-key="${r(n)}" title="Change who this was">${r(a)}</button>`:r(a)}function oe(e,t,n){e&&e.addEventListener(`click`,e=>{let i=e.target.closest(`[data-name-pick]`);if(!i||i.dataset.open===`1`)return;let a=i.dataset.namePick,o=i.dataset.nameKey,s=i.textContent.trim(),c=document.createElement(`select`);c.className=`name-pick-select`,c.innerHTML=`<option value="">— nobody —</option>`+(t||[]).map(e=>`<option value="${r(e.id)}"${e.display_name===s?` selected`:``}>${r(e.display_name)}</option>`).join(``),i.dataset.open=`1`,i.replaceWith(c),c.focus();let l=()=>{c.isConnected&&(i.dataset.open=``,c.replaceWith(i))},u=!1;c.addEventListener(`change`,async()=>{if(!u){u=!0,c.disabled=!0;try{await n({field:a,key:o,memberId:c.value?Number(c.value):null})}catch(e){u=!1,c.disabled=!1,e?.message&&(c.title=e.message)}}}),c.addEventListener(`blur`,()=>{u||l()})})}var se=/set_season_result|champion_locked|schema cache|does not exist/i,ce=e=>se.test(e?.message||``);async function B({season:e,field:t,memberId:n=null}){let r=t===`champion`,{data:i,error:a}=await f().rpc(`set_season_result`,{target_season:Number(e),champion_member_id:r?n:null,last_place_member_id:r?null:n,set_champion:r,set_last_place:!r});if(a)throw Error(ce(a)?`Run season_result_override_schema.sql in Supabase first`:a.message||`That could not be saved`);return Array.isArray(i)?i[0]:i}var V={Champion:`i-trophy`,"Runner Up":`i-medal`,Award:`i-award`,Record:`i-record`,Moment:`i-moment`};function H(e){return`<svg class="ico-sm" aria-hidden="true"><use href="#${V[e]||`i-award`}"></use></svg>`}var U=`fame`,W=null;async function G(t){U=m(`history-tab`,[`fame`,`moments`,`seasons`,`alltime`,`records`],`fame`);let n=new URLSearchParams(location.hash.split(`?`)[1]||``),r=n.get(`tab`);[`fame`,`moments`,`seasons`,`alltime`,`records`].includes(r)&&(U=r);let o=Number(n.get(`season`));Number.isInteger(o)&&o>=2010&&o<=2100&&(W=o,_(`history-season`,String(W)));let c=Number(n.get(`entry`));c&&(U=`fame`),t.innerHTML=`<header class="utility-head archive-page-head"><h1>History</h1><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Weekly archive →</a></header>`+e(`Reading the record book…`);let l=await E();if(l.error){t.innerHTML=`<header class="utility-head archive-page-head"><h1>History</h1><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Weekly archive →</a></header>`+u(l.error);return}if(!l.manual.length&&!l.leagues.length){t.innerHTML=`<header class="utility-head archive-page-head"><h1>History</h1><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Weekly archive →</a></header>
      <div id="hist-body">
        ${s(`No league history yet.`)}
        ${a()?`<div class="row-end">${g(`history`,`Add entry`)}</div>`:``}
      </div>`,i(t.querySelector(`#hist-body`),()=>{b(),G(t)});return}t.innerHTML=`
    <header class="utility-head archive-page-head"><h1>History</h1><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Weekly archive →</a></header>
    <!--
      FIVE TABS DO NOT FIT A PHONE, and .tabs has always been a horizontal
      scroller - the problem was that it did not look like one. At 375px the
      strip is wider than the screen with nothing to say so, so "Records"
      simply did not exist unless you happened to swipe. tabscroll adds the
      edge fade, the snap and the keyboard roles; scrollTabIntoView() below
      keeps the current one in shot.
    -->
    <div class="tabs tabscroll" id="hist-tabs" role="tablist" aria-label="History sections">
      <button data-tab="fame"    role="tab" aria-selected="${U===`fame`}"    class="${U===`fame`?`on`:``}">Hall of Fame</button>
      <button data-tab="moments" role="tab" aria-selected="${U===`moments`}" class="${U===`moments`?`on`:``}">Moments</button>
      <button data-tab="seasons" role="tab" aria-selected="${U===`seasons`}" class="${U===`seasons`?`on`:``}">Yearbook</button>
      <button data-tab="alltime" role="tab" aria-selected="${U===`alltime`}" class="${U===`alltime`?`on`:``}">All-time</button>
      <button data-tab="records" role="tab" aria-selected="${U===`records`}" class="${U===`records`?`on`:``}">Records</button>
    </div>
    <div id="hist-body"></div>
  `;let d=t.querySelector(`#hist-body`),f=n.get(`moment`)&&C(l).find(e=>A(e)===n.get(`moment`)),p=()=>{if(U===`moments`&&n.has(`moment`)&&!f){d.innerHTML=`<section class="state" role="status" data-route-focus tabindex="-1">This archive entry has changed. <a class="linkbtn" href="#/history?tab=moments">Latest moments →</a></section>`;return}if(U===`moments`&&f){d.innerHTML=`<section class="card" data-route-focus tabindex="-1">${J(f)}<a class="linkbtn" href="#/history?tab=moments">All moments →</a></section>`;return}if(U===`records`)return Se(d,l);d.innerHTML=U===`fame`?le(l):U===`moments`?he(l):U===`seasons`?ge(l):be(l)};if(t.querySelector(`#hist-tabs`).addEventListener(`click`,e=>{let n=e.target.closest(`button[data-tab]`);n&&(U=n.dataset.tab,_(`history-tab`,U),t.querySelectorAll(`#hist-tabs button`).forEach(e=>{let t=e.dataset.tab===U;e.classList.toggle(`on`,t),e.setAttribute(`aria-selected`,String(t))}),q(n),p())}),d.addEventListener(`click`,e=>{let n=e.target.closest(`button[data-season]`);n&&(W=Number(n.dataset.season),_(`history-season`,String(W)),p(),q(t.querySelector(`#year-picker button[data-season="${W}"]`)),t.querySelector(`#hist-tabs`)?.scrollIntoView({block:`start`}))}),i(d,()=>{b(),G(t)}),oe(d,l.members||[],async({field:e,key:n,memberId:r})=>{await B({season:Number(n),field:e,memberId:r}),b(),G(t)}),p(),n.get(`owner`)?N([...t.querySelectorAll(`[data-history-owner]`)].find(e=>e.dataset.historyOwner===n.get(`owner`))):n.has(`season`)&&N(t.querySelector(`.yb-champ`)),c){let e=t.querySelector(`[data-history-entry="${c}"]`);e&&(e.setAttribute(`data-route-focus`,``),e.tabIndex=-1)}q(t.querySelector(`#hist-tabs button[data-tab="${U}"]`)),U===`seasons`&&q(t.querySelector(`#year-picker button[data-season="${W}"]`))}function K(e){let t=`${r(e.label)}${e.sub&&e.sub!==e.label?`<div class="muted tiny">${r(e.sub)}</div>`:``}`;return e.memberId?`<a href="#/profile?id=${e.memberId}" class="plainlink">${t}</a>`:t}function le(e){let t=M(e),i=t=>d({team_name:t.label,identity:(e.members||[]).find(e=>String(e.id)===String(t.memberId))||{}}),o=e.leagues.filter(e=>e.champion_user_id||e.champion_roster_id).sort((e,t)=>t.season-e.season),s=[...v(n(`history`,e.manual),`year`).entries()].sort((e,t)=>t[0]-e[0]);return`
    ${o.length?`
      <section class="archive-cabinet" aria-label="League champions">
        <header class="archive-cabinet-head"><small>THE TROPHY CASE</small><h2>Champions</h2><span>${o.length} seasons</span></header>
        <ol class="archive-seasons">
          ${o.map((e,n)=>{let o=t(e.champion_user_id,e.season,e.champion_roster_id),s=e.runner_up_user_id||e.runner_up_roster_id?t(e.runner_up_user_id,e.season,e.runner_up_roster_id):null;return`<li class="archive-season${n===0?` is-featured`:``}">
              <header class="archive-season-head"><span><strong>${r(e.season)}</strong><small>SEASON</small></span><span class="archive-title-label">${H(`Champion`)} DFL CHAMPION</span></header>
              <div class="archive-winner">${i(o)}<div>${a()?ae({text:o.label,field:`champion`,key:e.season,canEdit:!0}):K(o)}${e.champion_locked?`<small class="archive-lock">Set by hand</small>`:``}</div></div>
              ${s?`<div class="archive-runner"><small>RUNNER-UP</small><div>${i(s)}${K(s)}</div></div>`:`<div class="archive-runner"><small>RUNNER-UP</small><span>Not recorded</span></div>`}
            </li>`}).join(``)}
        </ol>
        <p class="archive-source">Sleeper playoff results · manually corrected seasons are marked. 2017–18 were played on another app; 2019’s winner was later removed from the league.</p>
      </section>`:``}

    ${s.length?s.map(([e,t])=>`
          <div class="section-head">
            <h2>${r(e)}</h2>
            ${g(`history`,`Add entry`,{year:e})}
          </div>
          <div class="card schedule">${de(t).map(fe).join(``)}</div>`).join(``):`<div class="card"><div class="card-body muted">${o.length?`No additional stories yet.`:`No league history yet.`}</div>
           ${a()?`<div class="row-end">${g(`history`,`Add entry`)}</div>`:``}
         </div>`}
  `}var ue=[`Champion`,`Runner Up`,`Award`,`Record`,`Moment`];function de(e){let t=e=>{let t=ue.indexOf(e);return t===-1?99:t};return[...e].sort((e,n)=>t(e.category)-t(n.category))}function fe(e){return`
    <div class="evrow ${l(`history`,e)}" data-history-entry="${r(e.id)}">
      <div class="evicon" aria-hidden="true">${H(e.category)}</div>
      <div class="evbody">
        <div class="evtop">
          <span class="evtitle">${r(e.winner||e.category)}</span>
          <span class="pill">${r(e.category)}</span>
        </div>
        ${e.notes?`<div class="evnote">${r(e.notes)}</div>`:``}
        ${o(`history`,e,{compact:!0})}
      </div>
    </div>`}var pe={championship:`i-trophy`,title:`i-trophy`,commissioner:`i-moment`,golf:`i-golf`,arena:`i-arena`,streak:`i-record`,heartbreak:`i-medal`,blowout:`i-record`,nailbiter:`i-record`,high:`i-record`,low:`i-record`,rivalry:`i-versus`},me={championship:`Champion`,title:`The final`,commissioner:`From the commissioner`,golf:`Golf`,arena:`Arena`,streak:`Streak`,heartbreak:`Hard luck`,blowout:`Blowout`,nailbiter:`Nail-biter`,high:`Highest week`,low:`Lowest week`,rivalry:`Rivalry`};function he(e){let t=C(e);if(!t.length)return`<div class="state">
      <span class="state-title">Nothing to remember yet</span>
      <span>Sync Sleeper from the Admin page, or write the first one down.</span>
    </div>${a()?`<div class="row-end">${g(`history`,`Add a moment`)}</div>`:``}`;let n=v(t,e=>e.season??`—`),i=[...n.keys()].sort((e,t)=>(Number(t)||0)-(Number(e)||0));return`
    <p class="page-sub" style="margin-bottom:14px">
      ${t.length} moments · read off every game on record
      <span class="muted">· nothing here is invented</span>
    </p>
    ${i.map((e,t)=>{let i=n.get(e);return`
      <div class="card momentlist" data-collapse="hist-moments-${r(e)}"
           data-collapse-title="${r(e)}"
           data-collapse-badge="${i.length} moment${i.length===1?``:`s`}"
           ${t===0?``:`data-collapse-default="folded"`}>
        ${i.map(J).join(``)}
      </div>`}).join(``)}
    ${a()?`<div class="row-end">${g(`history`,`Add a moment`)}</div>`:``}
  `}function q(e){if(e)try{e.scrollIntoView({inline:`nearest`,block:`nearest`})}catch{}}function J(e){let t=e.kind===`commissioner`&&e.category?e.category:me[e.kind]||`Moment`,n=`
    <svg class="ico-sm moment-ico" aria-hidden="true"><use href="#${pe[e.kind]||`i-moment`}"></use></svg>
    <span class="moment-body">
      <span class="moment-kind">${r(t)}</span>
      <strong class="moment-head">${r(e.headline)}</strong>
      ${e.detail?`<span class="moment-detail">${r(e.detail)}</span>`:``}
    </span>`;return e.href?`<a class="moment is-${r(e.kind)}" href="${r(e.href)}">${n}</a>`:`<div class="moment is-${r(e.kind)}">${n}</div>`}function ge(e){let t=[...new Set(e.standings.map(e=>e.season))].sort((e,t)=>t-e);if(!t.length)return s(`No season standings yet. Sync Sleeper from the Admin page.`);W=Number(m(`history-season`,t.map(String),String(W||``)))||W,t.includes(W)||(W=t.find(t=>e.standings.some(e=>e.season===t&&e.wins+e.losses+e.ties>0))??t[0]);let n=y(e,W),i=`<div class="tabs tabscroll" id="year-picker" role="tablist"
                       aria-label="Season">${t.map(e=>`<button data-season="${e}" role="tab" aria-selected="${e===W}"
             class="${e===W?`on`:``}">${e}</button>`).join(``)}</div>`;return n.played?`
    ${i}
    ${_e(n)}
    ${ve(n)}
    ${ye(n)}
    ${Y(n,!0)}
  `:`${i}
      <div class="state">
        <span class="state-title">${r(W)} has not been played</span>
        <span>The teams are set. The yearbook writes itself once the games start.</span>
      </div>
      ${Y(n,!1)}`}function _e(e){return e.champion?`
    <section class="yb-champ">
      <span class="yb-kicker">
        <svg class="ico-sm" aria-hidden="true"><use href="#i-trophy"></use></svg>
        ${r(e.season)} champion
      </span>
      <strong class="yb-name">${r(e.champion.label)}</strong>
      ${e.champion.sub&&e.champion.sub!==e.champion.label?`<span class="yb-sub">${r(e.champion.sub)}</span>`:``}
      ${e.runnerUp?`<span class="yb-runner">Runner-up · ${r(e.runnerUp.label)}</span>`:``}
    </section>`:`<div class="card"><div class="card-title">${r(e.season)}</div>
      <div class="card-body muted">No champion recorded for this season.</div></div>`}function ve(e){if(!e.title)return``;let t=e.title;return`
    <div class="card">
      <div class="card-title">The final · Week ${r(t.week)}</div>
      <div class="yb-final">
        <div class="yb-side">
          <b>${t.champScore.toFixed(2)}</b>
          <span>${r(e.name(t.champUser,t.season,t.champRoster).label)}</span>
        </div>
        <div class="yb-by">by ${t.margin.toFixed(2)}</div>
        <div class="yb-side is-down">
          <b>${t.runnerScore.toFixed(2)}</b>
          <span>${r(e.name(t.runnerUser,t.season,t.runnerRoster).label)}</span>
        </div>
      </div>
    </div>`}function ye(e){let t=e.moments.filter(e=>e.kind!==`championship`&&e.kind!==`title`);return t.length?`
    <h2 class="section-title">${r(e.season)} in moments</h2>
    <div class="card momentlist">${t.map(J).join(``)}</div>`:``}function Y(e,t){return`
    <h2 class="section-title">${t?`Final standings`:`Teams`}</h2>
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead>
            <tr><th>#</th><th>Team</th><th>Record</th><th class="num">PF</th><th class="num">PA</th></tr>
          </thead>
          <tbody>
            ${e.standings.map(n=>`
              <tr data-history-owner="${r(n.sleeper_user_id)}">
                <td>
                  ${t?n.rank??`—`:`—`}
                  ${t&&n.made_playoffs?`<span class="pill green tiny">P</span>`:``}
                </td>
                <td>${K(e.name(n.sleeper_user_id,e.season,n.roster_id))}</td>
                <td>${n.wins}-${n.losses}${n.ties?`-`+n.ties:``}</td>
                <td class="num">${Math.round(n.points_for).toLocaleString()}</td>
                <td class="num">${Math.round(n.points_against).toLocaleString()}</td>
              </tr>`).join(``)}
          </tbody>
        </table>
      </div>
      <div class="card-meta">
        ${t?`P marks a playoff berth · ${e.games} games over ${e.weeks} weeks.`:`This season has not been played yet.`}
      </div>
    </div>`}function be(e){if(!e.standings.length)return s(`No career records yet. Sync Sleeper from the Admin page.`);let t=M(e),n=De(e.leagues,`champion_user_id`),r=[...v(e.standings,`sleeper_user_id`).entries()].filter(([e])=>e!=null).filter(([t])=>e.users.some(e=>e.sleeper_user_id===t)).map(([e,r])=>{let i=$(r,`wins`),a=$(r,`losses`),o=$(r,`ties`),s=i+a+o,c=r.filter(e=>e.rank!=null);return{who:t(e),wins:i,losses:a,ties:o,winPct:s?(i+o/2)/s:0,pointsFor:$(r,`points_for`),avgFinish:c.length?c.reduce((e,t)=>e+t.rank,0)/c.length:null,playoffs:r.filter(e=>e.made_playoffs).length,titles:n.get(e)||0,seasons:r.length}}).sort((e,t)=>t.winPct-e.winPct||t.titles-e.titles||t.pointsFor-e.pointsFor),i=new Set(e.standings.map(e=>e.season)).size;return`
    <div class="card">
      <div class="card-title">All-time records</div>
      <div class="tblwrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Owner</th><th>Record</th><th class="num">Win %</th>
              <th class="num">Titles</th><th class="num">Playoffs</th>
              <th class="num">Avg finish</th><th class="num">Points</th>
            </tr>
          </thead>
          <tbody>
            ${r.map(e=>`
              <tr>
                <td>${K(e.who)}</td>
                <td>${e.wins}-${e.losses}${e.ties?`-`+e.ties:``}</td>
                <td class="num">${(e.winPct*100).toFixed(1)}%</td>
                <td class="num">${e.titles||`—`}</td>
                <td class="num">${e.playoffs}</td>
                <td class="num">${e.avgFinish?e.avgFinish.toFixed(1):`—`}</td>
                <td class="num">${Math.round(e.pointsFor).toLocaleString()}</td>
              </tr>`).join(``)}
          </tbody>
        </table>
      </div>
      <div class="card-meta">
        ${i} season${i===1?``:`s`} of history. Tap an owner for their profile.
      </div>
    </div>`}var X=null;async function xe(){if(X)return X;let{data:e,error:t}=await f().from(`sleeper_transactions`).select(`season, week, type, status, details`).eq(`type`,`trade`).eq(`status`,`complete`);return X={trades:e||[],error:t||null},X}async function Se(t,n){t.innerHTML=e(`Reading every week ever played…`);let i=await xe(),a=M(n),o=ee(n.matchups);if(!o.length){t.innerHTML=s(`No weekly scores synced yet. Run a Sleeper sync from the Admin page.`);return}let c=o.filter(e=>e.score>0),l=n.matchups.filter(S),u=O(o),d=Ce(n.standings),f=T(u.map(e=>e.win).filter(Boolean),e=>e.run),m=T(u.map(e=>e.loss).filter(Boolean),e=>e.run),g=T(c,e=>e.score),_=T(c,e=>-e.score),v=T(l,e=>x(e)),y=T(l.filter(e=>x(e)>0),e=>-x(e)),b=T(l,e=>Number(e.score1)+Number(e.score2)),C=T(c.filter(e=>!e.won&&!e.tie),e=>e.score),E=e=>a(e.user,e.season,e.roster),A=(e,t)=>{let n=t(e);return a(n.user,e.season,n.roster).label};t.innerHTML=`
    
    <p class="page-sub" style="margin-bottom:14px">
      ${l.length} games · ${r(h)} onward
      <span class="muted">· ${r(h-p)} earlier seasons predate the records</span>
    </p>

    <section class="card recbook records-fold" data-collapse="hist-records-week"
             data-collapse-title="Single week" data-collapse-badge="6 records"
             data-collapse-default="folded">
      ${Z(`Highest score`,g&&g.score.toFixed(2),g&&E(g).label,g&&`${g.season} · Week ${g.week}`)}
      ${Z(`Lowest score`,_&&_.score.toFixed(2),_&&E(_).label,_&&`${_.season} · Week ${_.week}`)}
      ${Z(`Biggest blowout`,v&&x(v).toFixed(2)+` pts`,v&&A(v,w),v&&`beat ${A(v,D)} · ${v.season} Wk ${v.week}`)}
      ${Z(`Closest finish`,y&&x(y).toFixed(2)+` pts`,y&&A(y,w),y&&`over ${A(y,D)} · ${y.season} Wk ${y.week}`)}
      ${Z(`Highest combined`,b&&(Number(b.score1)+Number(b.score2)).toFixed(2),b&&`${A(b,w)} v ${A(b,D)}`,b&&`${b.season} · Week ${b.week}`)}
      ${Z(`Best losing score`,C&&C.score.toFixed(2),C&&E(C).label,C&&`lost ${C.against.toFixed(2)} · ${C.season} Wk ${C.week}`)}
    </section>

    <section class="card recbook records-fold" data-collapse="hist-records-seasons"
             data-collapse-title="Seasons &amp; streaks" data-collapse-badge="4 records"
             data-collapse-default="folded">
      ${Z(`Most points, season`,d.points&&d.points.points_for.toFixed(2),d.points&&a(d.points.sleeper_user_id,d.points.season,d.points.roster_id).label,d.points&&String(d.points.season))}
      ${Z(`Best record, season`,d.record&&`${d.record.wins}-${d.record.losses}${d.record.ties?`-`+d.record.ties:``}`,d.record&&a(d.record.sleeper_user_id,d.record.season,d.record.roster_id).label,d.record&&String(d.record.season))}
      ${Z(`Longest win streak`,f&&f.run+` weeks`,f&&a(f.user).label,f&&k(f.from,f.to))}
      ${Z(`Longest losing streak`,m&&m.run+` weeks`,m&&a(m.user).label,m&&k(m.from,m.to))}
    </section>

    ${i.error?``:we(i.trades,n)}
  `;let j=t.querySelector(`[data-fleece-board]`);j&&Te(i.trades,n).then(e=>{j.isConnected&&(j.innerHTML=e.error?`<p class="muted tiny">Historical trade outcomes could not be loaded.</p>`:Ee(e.rankings,n,e.players))})}function Z(e,t,n,i){return t?`
    <div class="rec">
      <span class="rec-label">${r(e)}</span>
      <span class="rec-who">
        ${r(n||`—`)}
        ${i?`<span class="rec-when">${r(i)}</span>`:``}
      </span>
      <span class="rec-val">${r(t)}</span>
    </div>`:``}function Ce(e){let t=(e||[]).filter(e=>e.wins+e.losses+e.ties>0);return{points:T(t,e=>Number(e.points_for)||0),record:T(t,e=>{let t=e.wins+e.losses+e.ties;return t?(e.wins+e.ties/2)/t+t/1e3:0})}}function we(t,n){let i=t.filter(e=>e.status===`complete`&&e.details?.status===`complete`);if(!i.length)return``;let a=new Map;for(let e of i)for(let t of e.details?.roster_ids||[]){let n=`${e.season}:${t}`;a.set(n,(a.get(n)||0)+1)}let o=new Map(n.standings.map(e=>[`${e.season}:${e.roster_id}`,e.sleeper_user_id])),s=new Map;for(let[e,t]of a){let n=o.get(e);n&&s.set(n,(s.get(n)||0)+t)}let c=M(n),l=[...s.entries()].map(([e,t])=>({who:c(e),n:t})).sort((e,t)=>t.n-e.n).slice(0,5);return l.length?`<section class="card records-fold records-trades" data-collapse="hist-records-trades"
                  data-collapse-title="Trades" data-collapse-badge="${i.length} completed"
                  data-collapse-default="folded">
    <div class="trade-fleece-shell" data-fleece-board>${e(`Grading the completed trades…`)}</div>
    <div class="recbook trade-leaders">
      ${l.map((e,t)=>`
        <div class="rec">
          <span class="rec-label">${t===0?`Most trades`:``}</span>
          <span class="rec-who">${r(e.who.label)}</span>
          <span class="rec-val">${e.n}</span>
        </div>`).join(``)}
    </div>
  </section>`:``}var Q=null;async function Te(e,n){return Q||(Q=(async()=>{try{let r=new Date().getFullYear()-1,i=n.leagues.filter(e=>e.scoring_settings&&(e.status===`complete`||Number(e.season)<=r)).map(e=>Number(e.season)).filter(Number.isFinite),a=Math.max(0,...i),o=new Map(n.leagues.map(e=>[Number(e.season),e.scoring_settings])),s=[...new Set(e.flatMap(e=>{let t=[];for(let n=Number(e.season);n<=Math.min(Number(e.season)+2,a);n++)o.get(n)&&t.push(n);return t}))].sort(),[l,...u]=await Promise.all([t(),...s.map(c)]);return{players:l,rankings:ie({trades:e,latestSeason:a,statsBySeason:new Map(s.map((e,t)=>[e,u[t]?.data||{}])),scoringBySeason:o,players:l}),error:null}}catch(e){return{players:{},rankings:[],error:e}}})(),Q)}function Ee(e,t,n){if(!e.length)return`<p class="muted tiny">No completed trade has enough post-trade history to grade yet.</p>`;let i=M(t),a=new Map(t.standings.map(e=>[`${e.season}:${e.roster_id}`,e.sleeper_user_id])),o=(e,t)=>i(a.get(`${e.season}:${t.rosterId}`),e.season,t.rosterId).label,s=e=>e.playerIds.map(e=>`<b class="fleece-player">${r(n[e]?.n||`Player ${e}`)}</b>`).join(``),c=(e,t)=>`<article class="fleece-card">
    <div class="fleece-top"><div class="fleece-rank">#${t+1}</div><div class="fleece-meta">Week ${r(e.trade.week||`—`)}<b>+${r(e.gap.toFixed(1))} starter-impact gap</b></div></div>
    <div class="fleece-compare">
      <div class="fleece-side is-winner"><small>BEST SIDE</small><strong>${r(o(e.trade,e.winner))}</strong><div class="fleece-assets"><em>RECEIVED</em>${s(e.winner)}</div></div>
      <span class="fleece-vs" aria-hidden="true">VS</span>
      <div class="fleece-side is-loser"><small>WORST SIDE</small><strong>${r(o(e.trade,e.loser))}</strong><div class="fleece-assets"><em>RECEIVED</em>${s(e.loser)}</div></div>
    </div>
  </article>`,l=new Map;for(let t of e){let e=Number(t.trade.season);l.has(e)||l.set(e,[]),l.get(e).push(t)}return`<div class="fleece-head"><div><strong>Biggest fleeces</strong><span>Each season ranked independently</span></div><span class="pill">TOP 5 / SEASON</span></div>
    <div class="fleece-seasons">${[...l.entries()].sort((e,t)=>t[0]-e[0]).map(([e,t])=>`
      <section class="card fleece-season" data-collapse="hist-fleeces-${r(e)}"
               data-collapse-title="${r(e)}"
               data-collapse-badge="${Math.min(5,t.length)} ranked trade${Math.min(5,t.length)===1?``:`s`}"
               data-collapse-default="folded">
        <div class="fleece-list">${t.slice(0,5).map(c).join(``)}</div>
      </section>`).join(``)}</div>
    <p class="fleece-method"><strong>Starter-impact gap</strong> measures each acquired player’s DFL points above a position-specific replacement starter in the completed trade season and up to two seasons after it. Those seasons count 50/30/20, while extra package pieces receive diminishing weight (100/50/25/10) so several bench players cannot outweigh one elite starter by volume alone. The active season and pending trades are never graded, and only transactions marked complete count.</p>`}function $(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}function De(e,t){let n=new Map;for(let r of e){let e=r[t];e&&n.set(e,(n.get(e)||0)+1)}return n}export{G as render};