import{Cn as e,Dn as t,Er as n,F as r,I as i,In as a,Ln as o,M as s,N as c,On as l,P as u,Sn as d,Tr as f,Xn as p,fn as m,j as h,mn as g,xn as _}from"../app-core-dUzLZdpA.js";import{Bn as v,Gn as y,Hn as b,In as x,Kn as S,Ln as C,Mr as w,Nn as T,Rn as E,Un as D,Vn as O,Wn as ee,Xr as k,jn as A,zn as j}from"../home-core-CGLKRB20.js";var M={QB:12,RB:24,WR:30,TE:12},N=[.5,.3,.2],P=[1,.5,.25],F=new Set([`907844411101487104`,`907840843644805120`]);function I(e=[]){return e.filter(e=>e?.type===`trade`&&e?.status===`complete`&&e?.details?.status===`complete`)}function te(e){let t=new Map;for(let n of e?.details?.roster_ids||[])t.set(String(n),[]);for(let[n,r]of Object.entries(e?.details?.adds||{})){let e=String(r);t.has(e)||t.set(e,[]),t.get(e).push(String(n))}return[...t.entries()].map(([e,t])=>({rosterId:e,playerIds:t}))}function L(e,t){return String(e?.[t]?.p||e?.[t]?.position||``).toUpperCase()}function ne(e,t,n,r){let i=new Map(Object.keys(M).map(e=>[e,[]]));for(let[a,o]of Object.entries(t.get(e)||{})){let t=L(r,a);if(!i.has(t))continue;let s=w(o,n.get(e));s!=null&&i.get(t).push(s)}return new Map([...i].map(([e,t])=>(t.sort((e,t)=>t-e),[e,t[M[e]-1]??t.at(-1)??0])))}function re(e,t,n,r,i,a,o){let s=[];for(let e=Number(t);e<=Math.min(Number(t)+2,n);e++)r.has(e)&&i.has(e)&&s.push(e);if(!s.length)return null;let c=s.reduce((e,t,n)=>e+N[n],0),l=[];for(let t of e){let e=L(a,t);if(!M[e]){l.push(0);continue}let n=s.reduce((n,a,s)=>{let c=w(r.get(a)?.[t],i.get(a))||0,l=o.get(a)?.get(e)||0;return n+Math.max(0,c-l)*N[s]},0)/c;l.push(n)}l.sort((e,t)=>t-e);let u=l.reduce((e,t,n)=>e+t*(P[n]??.1),0);return Math.round(u*10)/10}function ie({trades:e=[],latestSeason:t=0,statsBySeason:n=new Map,scoringBySeason:r=new Map,players:i={}}={}){let a=new Map([...n.keys()].map(e=>[e,ne(e,n,r,i)]));return I(e).filter(e=>!F.has(String(e?.details?.transaction_id||``))).map(e=>{let o=te(e).map(o=>({...o,outcome:re(o.playerIds,e.season,t,n,r,i,a)}));return o.length<2||o.some(e=>e.outcome==null||!e.playerIds.length)?null:(o.sort((e,t)=>t.outcome-e.outcome),{trade:e,winner:o[0],loser:o.at(-1),gap:Math.round((o[0].outcome-o.at(-1).outcome)*10)/10})}).filter(e=>e&&e.gap>0).sort((e,t)=>t.gap-e.gap)}function ae({text:t,field:n,key:r,canEdit:i=!1}={}){let a=t||`—`;return i?`<button type="button" class="name-pick" data-name-pick="${e(n)}"
    data-name-key="${e(r)}" title="Change who this was">${e(a)}</button>`:e(a)}function oe(t,n,r){t&&t.addEventListener(`click`,t=>{let i=t.target.closest(`[data-name-pick]`);if(!i||i.dataset.open===`1`)return;let a=i.dataset.namePick,o=i.dataset.nameKey,s=i.textContent.trim(),c=document.createElement(`select`);c.className=`name-pick-select`,c.innerHTML=`<option value="">— nobody —</option>`+(n||[]).map(t=>`<option value="${e(t.id)}"${t.display_name===s?` selected`:``}>${e(t.display_name)}</option>`).join(``),i.dataset.open=`1`,i.replaceWith(c),c.focus();let l=()=>{c.isConnected&&(i.dataset.open=``,c.replaceWith(i))},u=!1;c.addEventListener(`change`,async()=>{if(!u){u=!0,c.disabled=!0;try{await r({field:a,key:o,memberId:c.value?Number(c.value):null})}catch(e){u=!1,c.disabled=!1,e?.message&&(c.title=e.message)}}}),c.addEventListener(`blur`,()=>{u||l()})})}var se=/set_season_result|champion_locked|schema cache|does not exist/i,ce=e=>se.test(e?.message||``);async function R({season:e,field:t,memberId:n=null}){let r=t===`champion`,{data:i,error:a}=await p().rpc(`set_season_result`,{target_season:Number(e),champion_member_id:r?n:null,last_place_member_id:r?null:n,set_champion:r,set_last_place:!r});if(a)throw Error(ce(a)?`Run season_result_override_schema.sql in Supabase first`:a.message||`That could not be saved`);return Array.isArray(i)?i[0]:i}var z={Champion:`i-trophy`,"Runner Up":`i-medal`,Award:`i-award`,Record:`i-record`,Moment:`i-moment`};function B(e){return`<svg class="ico-sm" aria-hidden="true"><use href="#${z[e]||`i-award`}"></use></svg>`}var V=`fame`,H=null;async function U(e){V=m(`history-tab`,[`fame`,`moments`,`seasons`,`alltime`,`records`],`fame`);let t=Number(new URLSearchParams(location.hash.split(`?`)[1]||``).get(`entry`));t&&(V=`fame`),e.innerHTML=`<header class="utility-head"><small>DFL ARCHIVE</small><h1>History</h1><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Weekly archive →</a></header>`+l(`Reading the record book…`);let n=await x();if(n.error){e.innerHTML=`<header class="utility-head"><small>DFL ARCHIVE</small><h1>History</h1><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Weekly archive →</a></header>`+d(n.error);return}if(!n.manual.length&&!n.leagues.length){e.innerHTML=`<header class="utility-head"><small>DFL ARCHIVE</small><h1>History</h1><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Weekly archive →</a></header>
      <div id="hist-body">
        ${_(`No league history yet.`)}
        ${s()?`<div class="row-end">${h(`history`,`Add entry`)}</div>`:``}
      </div>`,i(e.querySelector(`#hist-body`),()=>{T(),U(e)});return}e.innerHTML=`
    <header class="utility-head"><small>DFL ARCHIVE</small><h1>History</h1><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Weekly archive →</a></header>
    <!--
      FIVE TABS DO NOT FIT A PHONE, and .tabs has always been a horizontal
      scroller - the problem was that it did not look like one. At 375px the
      strip is wider than the screen with nothing to say so, so "Records"
      simply did not exist unless you happened to swipe. tabscroll adds the
      edge fade, the snap and the keyboard roles; scrollTabIntoView() below
      keeps the current one in shot.
    -->
    <div class="tabs tabscroll" id="hist-tabs" role="tablist" aria-label="History sections">
      <button data-tab="fame"    role="tab" aria-selected="${V===`fame`}"    class="${V===`fame`?`on`:``}">Hall of Fame</button>
      <button data-tab="moments" role="tab" aria-selected="${V===`moments`}" class="${V===`moments`?`on`:``}">Moments</button>
      <button data-tab="seasons" role="tab" aria-selected="${V===`seasons`}" class="${V===`seasons`?`on`:``}">Yearbook</button>
      <button data-tab="alltime" role="tab" aria-selected="${V===`alltime`}" class="${V===`alltime`?`on`:``}">All-time</button>
      <button data-tab="records" role="tab" aria-selected="${V===`records`}" class="${V===`records`?`on`:``}">Records</button>
    </div>
    <div id="hist-body"></div>
  `;let r=e.querySelector(`#hist-body`),a=()=>{if(V===`records`)return xe(r,n);r.innerHTML=V===`fame`?G(n):V===`moments`?me(n):V===`seasons`?he(n):ye(n)};if(e.querySelector(`#hist-tabs`).addEventListener(`click`,t=>{let n=t.target.closest(`button[data-tab]`);n&&(V=n.dataset.tab,g(`history-tab`,V),e.querySelectorAll(`#hist-tabs button`).forEach(e=>{let t=e.dataset.tab===V;e.classList.toggle(`on`,t),e.setAttribute(`aria-selected`,String(t))}),K(n),a())}),r.addEventListener(`click`,t=>{let n=t.target.closest(`button[data-season]`);n&&(H=Number(n.dataset.season),g(`history-season`,String(H)),a(),K(e.querySelector(`#year-picker button[data-season="${H}"]`)),e.querySelector(`#hist-tabs`)?.scrollIntoView({block:`start`}))}),i(r,()=>{T(),U(e)}),oe(r,n.members||[],async({field:t,key:n,memberId:r})=>{await R({season:Number(n),field:t,memberId:r}),T(),U(e)}),a(),t){let n=e.querySelector(`[data-history-entry="${t}"]`);n&&(n.setAttribute(`data-route-focus`,``),n.tabIndex=-1)}K(e.querySelector(`#hist-tabs button[data-tab="${V}"]`)),V===`seasons`&&K(e.querySelector(`#year-picker button[data-season="${H}"]`))}function W(t){let n=`${e(t.label)}${t.sub&&t.sub!==t.label?`<div class="muted tiny">${e(t.sub)}</div>`:``}`;return t.memberId?`<a href="#/profile?id=${t.memberId}" class="plainlink">${n}</a>`:n}function G(n){let i=v(n),a=e=>k({team_name:e.label,identity:(n.members||[]).find(t=>String(t.id)===String(e.memberId))||{}}),o=n.leagues.filter(e=>e.champion_user_id||e.champion_roster_id).sort((e,t)=>t.season-e.season),c=[...t(r(`history`,n.manual),`year`).entries()].sort((e,t)=>t[0]-e[0]);return`
    ${o.length?`
      <section class="archive-cabinet" aria-label="League champions">
        <header class="archive-cabinet-head"><small>THE TROPHY CASE</small><h2>Champions</h2><span>${o.length} seasons</span></header>
        <ol class="archive-seasons">
          ${o.map((t,n)=>{let r=i(t.champion_user_id,t.season,t.champion_roster_id),o=t.runner_up_user_id||t.runner_up_roster_id?i(t.runner_up_user_id,t.season,t.runner_up_roster_id):null;return`<li class="archive-season${n===0?` is-featured`:``}">
              <header class="archive-season-head"><span><strong>${e(t.season)}</strong><small>SEASON</small></span><span class="archive-title-label">${B(`Champion`)} DFL CHAMPION</span></header>
              <div class="archive-winner">${a(r)}<div>${s()?ae({text:r.label,field:`champion`,key:t.season,canEdit:!0}):W(r)}${t.champion_locked?`<small class="archive-lock">Set by hand</small>`:``}</div></div>
              ${o?`<div class="archive-runner"><small>RUNNER-UP</small><div>${a(o)}${W(o)}</div></div>`:`<div class="archive-runner"><small>RUNNER-UP</small><span>Not recorded</span></div>`}
            </li>`}).join(``)}
        </ol>
        <p class="archive-source">Sleeper playoff results · manually corrected seasons are marked. 2017–18 were played on another app; 2019’s winner was later removed from the league.</p>
      </section>`:``}

    ${c.length?c.map(([t,n])=>`
          <div class="section-head">
            <h2>${e(t)}</h2>
            ${h(`history`,`Add entry`,{year:t})}
          </div>
          <div class="card schedule">${ue(n).map(de).join(``)}</div>`).join(``):`<div class="card"><div class="card-body muted">${o.length?`No additional stories yet.`:`No league history yet.`}</div>
           ${s()?`<div class="row-end">${h(`history`,`Add entry`)}</div>`:``}
         </div>`}
  `}var le=[`Champion`,`Runner Up`,`Award`,`Record`,`Moment`];function ue(e){let t=e=>{let t=le.indexOf(e);return t===-1?99:t};return[...e].sort((e,n)=>t(e.category)-t(n.category))}function de(t){return`
    <div class="evrow ${u(`history`,t)}" data-history-entry="${e(t.id)}">
      <div class="evicon" aria-hidden="true">${B(t.category)}</div>
      <div class="evbody">
        <div class="evtop">
          <span class="evtitle">${e(t.winner||t.category)}</span>
          <span class="pill">${e(t.category)}</span>
        </div>
        ${t.notes?`<div class="evnote">${e(t.notes)}</div>`:``}
        ${c(`history`,t,{compact:!0})}
      </div>
    </div>`}var fe={championship:`i-trophy`,title:`i-trophy`,commissioner:`i-moment`,golf:`i-golf`,arena:`i-arena`,streak:`i-record`,heartbreak:`i-medal`,blowout:`i-record`,nailbiter:`i-record`,high:`i-record`,low:`i-record`,rivalry:`i-versus`},pe={championship:`Champion`,title:`The final`,commissioner:`From the commissioner`,golf:`Golf`,arena:`Arena`,streak:`Streak`,heartbreak:`Hard luck`,blowout:`Blowout`,nailbiter:`Nail-biter`,high:`Highest week`,low:`Lowest week`,rivalry:`Rivalry`};function me(n){let r=j(n);if(!r.length)return`<div class="state">
      <span class="state-title">Nothing to remember yet</span>
      <span>Sync Sleeper from the Admin page, or write the first one down.</span>
    </div>${s()?`<div class="row-end">${h(`history`,`Add a moment`)}</div>`:``}`;let i=t(r,e=>e.season??`—`),a=[...i.keys()].sort((e,t)=>(Number(t)||0)-(Number(e)||0));return`
    <p class="page-sub" style="margin-bottom:14px">
      ${r.length} moments · read off every game on record
      <span class="muted">· nothing here is invented</span>
    </p>
    ${a.map((t,n)=>{let r=i.get(t);return`
      <div class="card momentlist" data-collapse="hist-moments-${e(t)}"
           data-collapse-title="${e(t)}"
           data-collapse-badge="${r.length} moment${r.length===1?``:`s`}"
           ${n===0?``:`data-collapse-default="folded"`}>
        ${r.map(q).join(``)}
      </div>`}).join(``)}
    ${s()?`<div class="row-end">${h(`history`,`Add a moment`)}</div>`:``}
  `}function K(e){if(e)try{e.scrollIntoView({inline:`nearest`,block:`nearest`})}catch{}}function q(t){let n=t.kind===`commissioner`&&t.category?t.category:pe[t.kind]||`Moment`,r=`
    <svg class="ico-sm moment-ico" aria-hidden="true"><use href="#${fe[t.kind]||`i-moment`}"></use></svg>
    <span class="moment-body">
      <span class="moment-kind">${e(n)}</span>
      <strong class="moment-head">${e(t.headline)}</strong>
      ${t.detail?`<span class="moment-detail">${e(t.detail)}</span>`:``}
    </span>`;return t.href?`<a class="moment is-${e(t.kind)}" href="${e(t.href)}">${r}</a>`:`<div class="moment is-${e(t.kind)}">${r}</div>`}function he(t){let n=[...new Set(t.standings.map(e=>e.season))].sort((e,t)=>t-e);if(!n.length)return _(`No season standings yet. Sync Sleeper from the Admin page.`);H=Number(m(`history-season`,n.map(String),String(H||``)))||H,n.includes(H)||(H=n.find(e=>t.standings.some(t=>t.season===e&&t.wins+t.losses+t.ties>0))??n[0]);let r=S(t,H),i=`<div class="tabs tabscroll" id="year-picker" role="tablist"
                       aria-label="Season">${n.map(e=>`<button data-season="${e}" role="tab" aria-selected="${e===H}"
             class="${e===H?`on`:``}">${e}</button>`).join(``)}</div>`;return r.played?`
    ${i}
    ${ge(r)}
    ${_e(r)}
    ${ve(r)}
    ${J(r,!0)}
  `:`${i}
      <div class="state">
        <span class="state-title">${e(H)} has not been played</span>
        <span>The teams are set. The yearbook writes itself once the games start.</span>
      </div>
      ${J(r,!1)}`}function ge(t){return t.champion?`
    <section class="yb-champ">
      <span class="yb-kicker">
        <svg class="ico-sm" aria-hidden="true"><use href="#i-trophy"></use></svg>
        ${e(t.season)} champion
      </span>
      <strong class="yb-name">${e(t.champion.label)}</strong>
      ${t.champion.sub&&t.champion.sub!==t.champion.label?`<span class="yb-sub">${e(t.champion.sub)}</span>`:``}
      ${t.runnerUp?`<span class="yb-runner">Runner-up · ${e(t.runnerUp.label)}</span>`:``}
    </section>`:`<div class="card"><div class="card-title">${e(t.season)}</div>
      <div class="card-body muted">No champion recorded for this season.</div></div>`}function _e(t){if(!t.title)return``;let n=t.title;return`
    <div class="card">
      <div class="card-title">The final · Week ${e(n.week)}</div>
      <div class="yb-final">
        <div class="yb-side">
          <b>${n.champScore.toFixed(2)}</b>
          <span>${e(t.name(n.champUser,n.season,n.champRoster).label)}</span>
        </div>
        <div class="yb-by">by ${n.margin.toFixed(2)}</div>
        <div class="yb-side is-down">
          <b>${n.runnerScore.toFixed(2)}</b>
          <span>${e(t.name(n.runnerUser,n.season,n.runnerRoster).label)}</span>
        </div>
      </div>
    </div>`}function ve(t){let n=t.moments.filter(e=>e.kind!==`championship`&&e.kind!==`title`);return n.length?`
    <h2 class="section-title">${e(t.season)} in moments</h2>
    <div class="card momentlist">${n.map(q).join(``)}</div>`:``}function J(e,t){return`
    <h2 class="section-title">${t?`Final standings`:`Teams`}</h2>
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead>
            <tr><th>#</th><th>Team</th><th>Record</th><th class="num">PF</th><th class="num">PA</th></tr>
          </thead>
          <tbody>
            ${e.standings.map(n=>`
              <tr>
                <td>
                  ${t?n.rank??`—`:`—`}
                  ${t&&n.made_playoffs?`<span class="pill green tiny">P</span>`:``}
                </td>
                <td>${W(e.name(n.sleeper_user_id,e.season,n.roster_id))}</td>
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
    </div>`}function ye(e){if(!e.standings.length)return _(`No career records yet. Sync Sleeper from the Admin page.`);let n=v(e),r=Te(e.leagues,`champion_user_id`),i=[...t(e.standings,`sleeper_user_id`).entries()].filter(([e])=>e!=null).filter(([t])=>e.users.some(e=>e.sleeper_user_id===t)).map(([e,t])=>{let i=$(t,`wins`),a=$(t,`losses`),o=$(t,`ties`),s=i+a+o,c=t.filter(e=>e.rank!=null);return{who:n(e),wins:i,losses:a,ties:o,winPct:s?(i+o/2)/s:0,pointsFor:$(t,`points_for`),avgFinish:c.length?c.reduce((e,t)=>e+t.rank,0)/c.length:null,playoffs:t.filter(e=>e.made_playoffs).length,titles:r.get(e)||0,seasons:t.length}}).sort((e,t)=>t.winPct-e.winPct||t.titles-e.titles||t.pointsFor-e.pointsFor),a=new Set(e.standings.map(e=>e.season)).size;return`
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
            ${i.map(e=>`
              <tr>
                <td>${W(e.who)}</td>
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
        ${a} season${a===1?``:`s`} of history. Tap an owner for their profile.
      </div>
    </div>`}var Y=null;async function be(){if(Y)return Y;let{data:e,error:t}=await p().from(`sleeper_transactions`).select(`season, week, type, status, details`).eq(`type`,`trade`).eq(`status`,`complete`);return Y={trades:e||[],error:t||null},Y}async function xe(t,r){t.innerHTML=l(`Reading every week ever played…`);let i=await be(),a=v(r),o=ee(r.matchups);if(!o.length){t.innerHTML=_(`No weekly scores synced yet. Run a Sleeper sync from the Admin page.`);return}let s=o.filter(e=>e.score>0),c=r.matchups.filter(O),u=D(o),d=Se(r.standings),p=A(u.map(e=>e.win).filter(Boolean),e=>e.run),m=A(u.map(e=>e.loss).filter(Boolean),e=>e.run),h=A(s,e=>e.score),g=A(s,e=>-e.score),x=A(c,e=>E(e)),S=A(c.filter(e=>E(e)>0),e=>-E(e)),w=A(c,e=>Number(e.score1)+Number(e.score2)),T=A(s.filter(e=>!e.won&&!e.tie),e=>e.score),k=e=>a(e.user,e.season,e.roster),j=(e,t)=>{let n=t(e);return a(n.user,e.season,n.roster).label};t.innerHTML=`
    
    <p class="page-sub" style="margin-bottom:14px">
      ${c.length} games · ${e(f)} onward
      <span class="muted">· ${e(f-n)} earlier seasons predate the records</span>
    </p>

    <section class="card recbook records-fold" data-collapse="hist-records-week"
             data-collapse-title="Single week" data-collapse-badge="6 records"
             data-collapse-default="folded">
      ${X(`Highest score`,h&&h.score.toFixed(2),h&&k(h).label,h&&`${h.season} · Week ${h.week}`)}
      ${X(`Lowest score`,g&&g.score.toFixed(2),g&&k(g).label,g&&`${g.season} · Week ${g.week}`)}
      ${X(`Biggest blowout`,x&&E(x).toFixed(2)+` pts`,x&&j(x,y),x&&`beat ${j(x,C)} · ${x.season} Wk ${x.week}`)}
      ${X(`Closest finish`,S&&E(S).toFixed(2)+` pts`,S&&j(S,y),S&&`over ${j(S,C)} · ${S.season} Wk ${S.week}`)}
      ${X(`Highest combined`,w&&(Number(w.score1)+Number(w.score2)).toFixed(2),w&&`${j(w,y)} v ${j(w,C)}`,w&&`${w.season} · Week ${w.week}`)}
      ${X(`Best losing score`,T&&T.score.toFixed(2),T&&k(T).label,T&&`lost ${T.against.toFixed(2)} · ${T.season} Wk ${T.week}`)}
    </section>

    <section class="card recbook records-fold" data-collapse="hist-records-seasons"
             data-collapse-title="Seasons &amp; streaks" data-collapse-badge="4 records"
             data-collapse-default="folded">
      ${X(`Most points, season`,d.points&&d.points.points_for.toFixed(2),d.points&&a(d.points.sleeper_user_id,d.points.season,d.points.roster_id).label,d.points&&String(d.points.season))}
      ${X(`Best record, season`,d.record&&`${d.record.wins}-${d.record.losses}${d.record.ties?`-`+d.record.ties:``}`,d.record&&a(d.record.sleeper_user_id,d.record.season,d.record.roster_id).label,d.record&&String(d.record.season))}
      ${X(`Longest win streak`,p&&p.run+` weeks`,p&&a(p.user).label,p&&b(p.from,p.to))}
      ${X(`Longest losing streak`,m&&m.run+` weeks`,m&&a(m.user).label,m&&b(m.from,m.to))}
    </section>

    ${i.error?``:Z(i.trades,r)}
  `;let M=t.querySelector(`[data-fleece-board]`);M&&Ce(i.trades,r).then(e=>{M.isConnected&&(M.innerHTML=e.error?`<p class="muted tiny">Historical trade outcomes could not be loaded.</p>`:we(e.rankings,r,e.players))})}function X(t,n,r,i){return n?`
    <div class="rec">
      <span class="rec-label">${e(t)}</span>
      <span class="rec-who">
        ${e(r||`—`)}
        ${i?`<span class="rec-when">${e(i)}</span>`:``}
      </span>
      <span class="rec-val">${e(n)}</span>
    </div>`:``}function Se(e){let t=(e||[]).filter(e=>e.wins+e.losses+e.ties>0);return{points:A(t,e=>Number(e.points_for)||0),record:A(t,e=>{let t=e.wins+e.losses+e.ties;return t?(e.wins+e.ties/2)/t+t/1e3:0})}}function Z(t,n){let r=t.filter(e=>e.status===`complete`&&e.details?.status===`complete`);if(!r.length)return``;let i=new Map;for(let e of r)for(let t of e.details?.roster_ids||[]){let n=`${e.season}:${t}`;i.set(n,(i.get(n)||0)+1)}let a=new Map(n.standings.map(e=>[`${e.season}:${e.roster_id}`,e.sleeper_user_id])),o=new Map;for(let[e,t]of i){let n=a.get(e);n&&o.set(n,(o.get(n)||0)+t)}let s=v(n),c=[...o.entries()].map(([e,t])=>({who:s(e),n:t})).sort((e,t)=>t.n-e.n).slice(0,5);return c.length?`<section class="card records-fold records-trades" data-collapse="hist-records-trades"
                  data-collapse-title="Trades" data-collapse-badge="${r.length} completed"
                  data-collapse-default="folded">
    <div class="trade-fleece-shell" data-fleece-board>${l(`Grading the completed trades…`)}</div>
    <div class="recbook trade-leaders">
      ${c.map((t,n)=>`
        <div class="rec">
          <span class="rec-label">${n===0?`Most trades`:``}</span>
          <span class="rec-who">${e(t.who.label)}</span>
          <span class="rec-val">${t.n}</span>
        </div>`).join(``)}
    </div>
  </section>`:``}var Q=null;async function Ce(e,t){return Q||(Q=(async()=>{try{let n=new Date().getFullYear()-1,r=t.leagues.filter(e=>e.scoring_settings&&(e.status===`complete`||Number(e.season)<=n)).map(e=>Number(e.season)).filter(Number.isFinite),i=Math.max(0,...r),s=new Map(t.leagues.map(e=>[Number(e.season),e.scoring_settings])),c=[...new Set(e.flatMap(e=>{let t=[];for(let n=Number(e.season);n<=Math.min(Number(e.season)+2,i);n++)s.get(n)&&t.push(n);return t}))].sort(),[l,...u]=await Promise.all([a(),...c.map(o)]);return{players:l,rankings:ie({trades:e,latestSeason:i,statsBySeason:new Map(c.map((e,t)=>[e,u[t]?.data||{}])),scoringBySeason:s,players:l}),error:null}}catch(e){return{players:{},rankings:[],error:e}}})(),Q)}function we(t,n,r){if(!t.length)return`<p class="muted tiny">No completed trade has enough post-trade history to grade yet.</p>`;let i=v(n),a=new Map(n.standings.map(e=>[`${e.season}:${e.roster_id}`,e.sleeper_user_id])),o=(e,t)=>i(a.get(`${e.season}:${t.rosterId}`),e.season,t.rosterId).label,s=t=>t.playerIds.map(t=>`<b class="fleece-player">${e(r[t]?.n||`Player ${t}`)}</b>`).join(``),c=(t,n)=>`<article class="fleece-card">
    <div class="fleece-top"><div class="fleece-rank">#${n+1}</div><div class="fleece-meta">Week ${e(t.trade.week||`—`)}<b>+${e(t.gap.toFixed(1))} starter-impact gap</b></div></div>
    <div class="fleece-compare">
      <div class="fleece-side is-winner"><small>BEST SIDE</small><strong>${e(o(t.trade,t.winner))}</strong><div class="fleece-assets"><em>RECEIVED</em>${s(t.winner)}</div></div>
      <span class="fleece-vs" aria-hidden="true">VS</span>
      <div class="fleece-side is-loser"><small>WORST SIDE</small><strong>${e(o(t.trade,t.loser))}</strong><div class="fleece-assets"><em>RECEIVED</em>${s(t.loser)}</div></div>
    </div>
  </article>`,l=new Map;for(let e of t){let t=Number(e.trade.season);l.has(t)||l.set(t,[]),l.get(t).push(e)}return`<div class="fleece-head"><div><strong>Biggest fleeces</strong><span>Each season ranked independently</span></div><span class="pill">TOP 5 / SEASON</span></div>
    <div class="fleece-seasons">${[...l.entries()].sort((e,t)=>t[0]-e[0]).map(([t,n])=>`
      <section class="card fleece-season" data-collapse="hist-fleeces-${e(t)}"
               data-collapse-title="${e(t)}"
               data-collapse-badge="${Math.min(5,n.length)} ranked trade${Math.min(5,n.length)===1?``:`s`}"
               data-collapse-default="folded">
        <div class="fleece-list">${n.slice(0,5).map(c).join(``)}</div>
      </section>`).join(``)}</div>
    <p class="fleece-method"><strong>Starter-impact gap</strong> measures each acquired player’s DFL points above a position-specific replacement starter in the completed trade season and up to two seasons after it. Those seasons count 50/30/20, while extra package pieces receive diminishing weight (100/50/25/10) so several bench players cannot outweigh one elite starter by volume alone. The active season and pending trades are never graded, and only transactions marked complete count.</p>`}function $(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}function Te(e,t){let n=new Map;for(let r of e){let e=r[t];e&&n.set(e,(n.get(e)||0)+1)}return n}export{U as render};