import{En as e,F as t,I as n,Lr as r,M as i,Mr as a,N as o,Nr as s,P as c,Rr as l,Tn as u,br as d,gn as f,hr as p,j as m,jr as h,mn as g,mr as _,zn as v}from"../app-core-BrJL_o-c.js";import{$t as y,Gt as b,Jt as x,Kt as S,Qt as ee,Vt as C,Wt as w,Xt as T,Yt as E,Zt as D,en as O,qi as k,qt as A,vr as j,yr as M,zt as N}from"../home-core-D2Uoa2qN.js";var P={QB:12,RB:24,WR:30,TE:12},F=[.5,.3,.2],te=[1,.5,.25],I=new Set([`907844411101487104`,`907840843644805120`]);function ne(e=[]){return e.filter(e=>e?.type===`trade`&&e?.status===`complete`&&e?.details?.status===`complete`)}function re(e){let t=new Map;for(let n of e?.details?.roster_ids||[])t.set(String(n),[]);for(let[n,r]of Object.entries(e?.details?.adds||{})){let e=String(r);t.has(e)||t.set(e,[]),t.get(e).push(String(n))}return[...t.entries()].map(([e,t])=>({rosterId:e,playerIds:t}))}function L(e,t){return String(e?.[t]?.p||e?.[t]?.position||``).toUpperCase()}function ie(e,t,n,r){let i=new Map(Object.keys(P).map(e=>[e,[]]));for(let[a,o]of Object.entries(t.get(e)||{})){let t=L(r,a);if(!i.has(t))continue;let s=k(o,n.get(e));s!=null&&i.get(t).push(s)}return new Map([...i].map(([e,t])=>(t.sort((e,t)=>t-e),[e,t[P[e]-1]??t.at(-1)??0])))}function R(e,t,n,r,i,a,o){let s=[];for(let e=Number(t);e<=Math.min(Number(t)+2,n);e++)r.has(e)&&i.has(e)&&s.push(e);if(!s.length)return null;let c=s.reduce((e,t,n)=>e+F[n],0),l=[];for(let t of e){let e=L(a,t);if(!P[e]){l.push(0);continue}let n=s.reduce((n,a,s)=>{let c=k(r.get(a)?.[t],i.get(a))||0,l=o.get(a)?.get(e)||0;return n+Math.max(0,c-l)*F[s]},0)/c;l.push(n)}l.sort((e,t)=>t-e);let u=l.reduce((e,t,n)=>e+t*(te[n]??.1),0);return Math.round(u*10)/10}function ae({trades:e=[],latestSeason:t=0,statsBySeason:n=new Map,scoringBySeason:r=new Map,players:i={}}={}){let a=new Map([...n.keys()].map(e=>[e,ie(e,n,r,i)]));return ne(e).filter(e=>!I.has(String(e?.details?.transaction_id||``))).map(e=>{let o=re(e).map(o=>({...o,outcome:R(o.playerIds,e.season,t,n,r,i,a)}));return o.length<2||o.some(e=>e.outcome==null||!e.playerIds.length)?null:(o.sort((e,t)=>t.outcome-e.outcome),{trade:e,winner:o[0],loser:o.at(-1),gap:Math.round((o[0].outcome-o.at(-1).outcome)*10)/10})}).filter(e=>e&&e.gap>0).sort((e,t)=>t.gap-e.gap)}function oe({text:e,field:t,key:n,canEdit:r=!1}={}){let i=e||`—`;return r?`<button type="button" class="name-pick" data-name-pick="${s(t)}"
    data-name-key="${s(n)}" title="Change who this was">${s(i)}</button>`:s(i)}function se(e,t,n){e&&e.addEventListener(`click`,e=>{let r=e.target.closest(`[data-name-pick]`);if(!r||r.dataset.open===`1`)return;let i=r.dataset.namePick,a=r.dataset.nameKey,o=r.textContent.trim(),c=document.createElement(`select`);c.className=`name-pick-select`,c.innerHTML=`<option value="">— nobody —</option>`+(t||[]).map(e=>`<option value="${s(e.id)}"${e.display_name===o?` selected`:``}>${s(e.display_name)}</option>`).join(``),r.dataset.open=`1`,r.replaceWith(c),c.focus();let l=()=>{c.isConnected&&(r.dataset.open=``,c.replaceWith(r))},u=!1;c.addEventListener(`change`,async()=>{if(!u){u=!0,c.disabled=!0;try{await n({field:i,key:a,memberId:c.value?Number(c.value):null})}catch(e){u=!1,c.disabled=!1,e?.message&&(c.title=e.message)}}}),c.addEventListener(`blur`,()=>{u||l()})})}var ce=/set_season_result|champion_locked|schema cache|does not exist/i,le=e=>ce.test(e?.message||``);async function z({season:e,field:t,memberId:n=null}){let r=t===`champion`,{data:i,error:a}=await v().rpc(`set_season_result`,{target_season:Number(e),champion_member_id:r?n:null,last_place_member_id:r?null:n,set_champion:r,set_last_place:!r});if(a)throw Error(le(a)?`Run season_result_override_schema.sql in Supabase first`:a.message||`That could not be saved`);return Array.isArray(i)?i[0]:i}var B={Champion:`i-trophy`,"Runner Up":`i-medal`,Award:`i-award`,Record:`i-record`,Moment:`i-moment`};function V(e){return`<svg class="ico-sm" aria-hidden="true"><use href="#${B[e]||`i-award`}"></use></svg>`}var H=`fame`,U=null;async function W(e){H=g(`history-tab`,[`fame`,`moments`,`seasons`,`alltime`,`records`],`fame`);let t=new URLSearchParams(location.hash.split(`?`)[1]||``),r=t.get(`tab`);[`fame`,`moments`,`seasons`,`alltime`,`records`].includes(r)&&(H=r);let o=Number(t.get(`season`));Number.isInteger(o)&&o>=2010&&o<=2100&&(U=o,f(`history-season`,String(U)));let s=Number(t.get(`entry`));s&&(H=`fame`),e.innerHTML=`<header class="utility-head"><small>DFL ARCHIVE</small><h1>History</h1><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Weekly archive →</a></header>`+l(`Reading the record book…`);let c=await w();if(c.error){e.innerHTML=`<header class="utility-head"><small>DFL ARCHIVE</small><h1>History</h1><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Weekly archive →</a></header>`+a(c.error);return}if(!c.manual.length&&!c.leagues.length){e.innerHTML=`<header class="utility-head"><small>DFL ARCHIVE</small><h1>History</h1><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Weekly archive →</a></header>
      <div id="hist-body">
        ${h(`No league history yet.`)}
        ${i()?`<div class="row-end">${m(`history`,`Add entry`)}</div>`:``}
      </div>`,n(e.querySelector(`#hist-body`),()=>{C(),W(e)});return}e.innerHTML=`
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
      <button data-tab="fame"    role="tab" aria-selected="${H===`fame`}"    class="${H===`fame`?`on`:``}">Hall of Fame</button>
      <button data-tab="moments" role="tab" aria-selected="${H===`moments`}" class="${H===`moments`?`on`:``}">Moments</button>
      <button data-tab="seasons" role="tab" aria-selected="${H===`seasons`}" class="${H===`seasons`?`on`:``}">Yearbook</button>
      <button data-tab="alltime" role="tab" aria-selected="${H===`alltime`}" class="${H===`alltime`?`on`:``}">All-time</button>
      <button data-tab="records" role="tab" aria-selected="${H===`records`}" class="${H===`records`?`on`:``}">Records</button>
    </div>
    <div id="hist-body"></div>
  `;let u=e.querySelector(`#hist-body`),d=t.get(`moment`)&&A(c).find(e=>j(e)===t.get(`moment`)),p=()=>{if(H===`moments`&&t.has(`moment`)&&!d){u.innerHTML=`<section class="state" role="status" data-route-focus tabindex="-1">This archive entry has changed. <a class="linkbtn" href="#/history?tab=moments">Latest moments →</a></section>`;return}if(H===`moments`&&d){u.innerHTML=`<section class="card" data-route-focus tabindex="-1">${J(d)}<a class="linkbtn" href="#/history?tab=moments">All moments →</a></section>`;return}if(H===`records`)return Se(u,c);u.innerHTML=H===`fame`?ue(c):H===`moments`?he(c):H===`seasons`?ge(c):be(c)};if(e.querySelector(`#hist-tabs`).addEventListener(`click`,t=>{let n=t.target.closest(`button[data-tab]`);n&&(H=n.dataset.tab,f(`history-tab`,H),e.querySelectorAll(`#hist-tabs button`).forEach(e=>{let t=e.dataset.tab===H;e.classList.toggle(`on`,t),e.setAttribute(`aria-selected`,String(t))}),q(n),p())}),u.addEventListener(`click`,t=>{let n=t.target.closest(`button[data-season]`);n&&(U=Number(n.dataset.season),f(`history-season`,String(U)),p(),q(e.querySelector(`#year-picker button[data-season="${U}"]`)),e.querySelector(`#hist-tabs`)?.scrollIntoView({block:`start`}))}),n(u,()=>{C(),W(e)}),se(u,c.members||[],async({field:t,key:n,memberId:r})=>{await z({season:Number(n),field:t,memberId:r}),C(),W(e)}),p(),t.get(`owner`)?M([...e.querySelectorAll(`[data-history-owner]`)].find(e=>e.dataset.historyOwner===t.get(`owner`))):t.has(`season`)&&M(e.querySelector(`.yb-champ`)),s){let t=e.querySelector(`[data-history-entry="${s}"]`);t&&(t.setAttribute(`data-route-focus`,``),t.tabIndex=-1)}q(e.querySelector(`#hist-tabs button[data-tab="${H}"]`)),H===`seasons`&&q(e.querySelector(`#year-picker button[data-season="${U}"]`))}function G(e){let t=`${s(e.label)}${e.sub&&e.sub!==e.label?`<div class="muted tiny">${s(e.sub)}</div>`:``}`;return e.memberId?`<a href="#/profile?id=${e.memberId}" class="plainlink">${t}</a>`:t}function ue(e){let n=x(e),a=t=>d({team_name:t.label,identity:(e.members||[]).find(e=>String(e.id)===String(t.memberId))||{}}),o=e.leagues.filter(e=>e.champion_user_id||e.champion_roster_id).sort((e,t)=>t.season-e.season),c=[...r(t(`history`,e.manual),`year`).entries()].sort((e,t)=>t[0]-e[0]);return`
    ${o.length?`
      <section class="archive-cabinet" aria-label="League champions">
        <header class="archive-cabinet-head"><small>THE TROPHY CASE</small><h2>Champions</h2><span>${o.length} seasons</span></header>
        <ol class="archive-seasons">
          ${o.map((e,t)=>{let r=n(e.champion_user_id,e.season,e.champion_roster_id),o=e.runner_up_user_id||e.runner_up_roster_id?n(e.runner_up_user_id,e.season,e.runner_up_roster_id):null;return`<li class="archive-season${t===0?` is-featured`:``}">
              <header class="archive-season-head"><span><strong>${s(e.season)}</strong><small>SEASON</small></span><span class="archive-title-label">${V(`Champion`)} DFL CHAMPION</span></header>
              <div class="archive-winner">${a(r)}<div>${i()?oe({text:r.label,field:`champion`,key:e.season,canEdit:!0}):G(r)}${e.champion_locked?`<small class="archive-lock">Set by hand</small>`:``}</div></div>
              ${o?`<div class="archive-runner"><small>RUNNER-UP</small><div>${a(o)}${G(o)}</div></div>`:`<div class="archive-runner"><small>RUNNER-UP</small><span>Not recorded</span></div>`}
            </li>`}).join(``)}
        </ol>
        <p class="archive-source">Sleeper playoff results · manually corrected seasons are marked. 2017–18 were played on another app; 2019’s winner was later removed from the league.</p>
      </section>`:``}

    ${c.length?c.map(([e,t])=>`
          <div class="section-head">
            <h2>${s(e)}</h2>
            ${m(`history`,`Add entry`,{year:e})}
          </div>
          <div class="card schedule">${fe(t).map(pe).join(``)}</div>`).join(``):`<div class="card"><div class="card-body muted">${o.length?`No additional stories yet.`:`No league history yet.`}</div>
           ${i()?`<div class="row-end">${m(`history`,`Add entry`)}</div>`:``}
         </div>`}
  `}var de=[`Champion`,`Runner Up`,`Award`,`Record`,`Moment`];function fe(e){let t=e=>{let t=de.indexOf(e);return t===-1?99:t};return[...e].sort((e,n)=>t(e.category)-t(n.category))}function pe(e){return`
    <div class="evrow ${c(`history`,e)}" data-history-entry="${s(e.id)}">
      <div class="evicon" aria-hidden="true">${V(e.category)}</div>
      <div class="evbody">
        <div class="evtop">
          <span class="evtitle">${s(e.winner||e.category)}</span>
          <span class="pill">${s(e.category)}</span>
        </div>
        ${e.notes?`<div class="evnote">${s(e.notes)}</div>`:``}
        ${o(`history`,e,{compact:!0})}
      </div>
    </div>`}var me={championship:`i-trophy`,title:`i-trophy`,commissioner:`i-moment`,golf:`i-golf`,arena:`i-arena`,streak:`i-record`,heartbreak:`i-medal`,blowout:`i-record`,nailbiter:`i-record`,high:`i-record`,low:`i-record`,rivalry:`i-versus`},K={championship:`Champion`,title:`The final`,commissioner:`From the commissioner`,golf:`Golf`,arena:`Arena`,streak:`Streak`,heartbreak:`Hard luck`,blowout:`Blowout`,nailbiter:`Nail-biter`,high:`Highest week`,low:`Lowest week`,rivalry:`Rivalry`};function he(e){let t=A(e);if(!t.length)return`<div class="state">
      <span class="state-title">Nothing to remember yet</span>
      <span>Sync Sleeper from the Admin page, or write the first one down.</span>
    </div>${i()?`<div class="row-end">${m(`history`,`Add a moment`)}</div>`:``}`;let n=r(t,e=>e.season??`—`),a=[...n.keys()].sort((e,t)=>(Number(t)||0)-(Number(e)||0));return`
    <p class="page-sub" style="margin-bottom:14px">
      ${t.length} moments · read off every game on record
      <span class="muted">· nothing here is invented</span>
    </p>
    ${a.map((e,t)=>{let r=n.get(e);return`
      <div class="card momentlist" data-collapse="hist-moments-${s(e)}"
           data-collapse-title="${s(e)}"
           data-collapse-badge="${r.length} moment${r.length===1?``:`s`}"
           ${t===0?``:`data-collapse-default="folded"`}>
        ${r.map(J).join(``)}
      </div>`}).join(``)}
    ${i()?`<div class="row-end">${m(`history`,`Add a moment`)}</div>`:``}
  `}function q(e){if(e)try{e.scrollIntoView({inline:`nearest`,block:`nearest`})}catch{}}function J(e){let t=e.kind===`commissioner`&&e.category?e.category:K[e.kind]||`Moment`,n=`
    <svg class="ico-sm moment-ico" aria-hidden="true"><use href="#${me[e.kind]||`i-moment`}"></use></svg>
    <span class="moment-body">
      <span class="moment-kind">${s(t)}</span>
      <strong class="moment-head">${s(e.headline)}</strong>
      ${e.detail?`<span class="moment-detail">${s(e.detail)}</span>`:``}
    </span>`;return e.href?`<a class="moment is-${s(e.kind)}" href="${s(e.href)}">${n}</a>`:`<div class="moment is-${s(e.kind)}">${n}</div>`}function ge(e){let t=[...new Set(e.standings.map(e=>e.season))].sort((e,t)=>t-e);if(!t.length)return h(`No season standings yet. Sync Sleeper from the Admin page.`);U=Number(g(`history-season`,t.map(String),String(U||``)))||U,t.includes(U)||(U=t.find(t=>e.standings.some(e=>e.season===t&&e.wins+e.losses+e.ties>0))??t[0]);let n=O(e,U),r=`<div class="tabs tabscroll" id="year-picker" role="tablist"
                       aria-label="Season">${t.map(e=>`<button data-season="${e}" role="tab" aria-selected="${e===U}"
             class="${e===U?`on`:``}">${e}</button>`).join(``)}</div>`;return n.played?`
    ${r}
    ${_e(n)}
    ${ve(n)}
    ${ye(n)}
    ${Y(n,!0)}
  `:`${r}
      <div class="state">
        <span class="state-title">${s(U)} has not been played</span>
        <span>The teams are set. The yearbook writes itself once the games start.</span>
      </div>
      ${Y(n,!1)}`}function _e(e){return e.champion?`
    <section class="yb-champ">
      <span class="yb-kicker">
        <svg class="ico-sm" aria-hidden="true"><use href="#i-trophy"></use></svg>
        ${s(e.season)} champion
      </span>
      <strong class="yb-name">${s(e.champion.label)}</strong>
      ${e.champion.sub&&e.champion.sub!==e.champion.label?`<span class="yb-sub">${s(e.champion.sub)}</span>`:``}
      ${e.runnerUp?`<span class="yb-runner">Runner-up · ${s(e.runnerUp.label)}</span>`:``}
    </section>`:`<div class="card"><div class="card-title">${s(e.season)}</div>
      <div class="card-body muted">No champion recorded for this season.</div></div>`}function ve(e){if(!e.title)return``;let t=e.title;return`
    <div class="card">
      <div class="card-title">The final · Week ${s(t.week)}</div>
      <div class="yb-final">
        <div class="yb-side">
          <b>${t.champScore.toFixed(2)}</b>
          <span>${s(e.name(t.champUser,t.season,t.champRoster).label)}</span>
        </div>
        <div class="yb-by">by ${t.margin.toFixed(2)}</div>
        <div class="yb-side is-down">
          <b>${t.runnerScore.toFixed(2)}</b>
          <span>${s(e.name(t.runnerUser,t.season,t.runnerRoster).label)}</span>
        </div>
      </div>
    </div>`}function ye(e){let t=e.moments.filter(e=>e.kind!==`championship`&&e.kind!==`title`);return t.length?`
    <h2 class="section-title">${s(e.season)} in moments</h2>
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
              <tr data-history-owner="${s(n.sleeper_user_id)}">
                <td>
                  ${t?n.rank??`—`:`—`}
                  ${t&&n.made_playoffs?`<span class="pill green tiny">P</span>`:``}
                </td>
                <td>${G(e.name(n.sleeper_user_id,e.season,n.roster_id))}</td>
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
    </div>`}function be(e){if(!e.standings.length)return h(`No career records yet. Sync Sleeper from the Admin page.`);let t=x(e),n=De(e.leagues,`champion_user_id`),i=[...r(e.standings,`sleeper_user_id`).entries()].filter(([e])=>e!=null).filter(([t])=>e.users.some(e=>e.sleeper_user_id===t)).map(([e,r])=>{let i=$(r,`wins`),a=$(r,`losses`),o=$(r,`ties`),s=i+a+o,c=r.filter(e=>e.rank!=null);return{who:t(e),wins:i,losses:a,ties:o,winPct:s?(i+o/2)/s:0,pointsFor:$(r,`points_for`),avgFinish:c.length?c.reduce((e,t)=>e+t.rank,0)/c.length:null,playoffs:r.filter(e=>e.made_playoffs).length,titles:n.get(e)||0,seasons:r.length}}).sort((e,t)=>t.winPct-e.winPct||t.titles-e.titles||t.pointsFor-e.pointsFor),a=new Set(e.standings.map(e=>e.season)).size;return`
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
                <td>${G(e.who)}</td>
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
    </div>`}var X=null;async function xe(){if(X)return X;let{data:e,error:t}=await v().from(`sleeper_transactions`).select(`season, week, type, status, details`).eq(`type`,`trade`).eq(`status`,`complete`);return X={trades:e||[],error:t||null},X}async function Se(e,t){e.innerHTML=l(`Reading every week ever played…`);let n=await xe(),r=x(t),i=ee(t.matchups);if(!i.length){e.innerHTML=h(`No weekly scores synced yet. Run a Sleeper sync from the Admin page.`);return}let a=i.filter(e=>e.score>0),o=t.matchups.filter(E),c=D(i),u=Ce(t.standings),d=N(c.map(e=>e.win).filter(Boolean),e=>e.run),f=N(c.map(e=>e.loss).filter(Boolean),e=>e.run),m=N(a,e=>e.score),g=N(a,e=>-e.score),v=N(o,e=>S(e)),C=N(o.filter(e=>S(e)>0),e=>-S(e)),w=N(o,e=>Number(e.score1)+Number(e.score2)),O=N(a.filter(e=>!e.won&&!e.tie),e=>e.score),k=e=>r(e.user,e.season,e.roster),A=(e,t)=>{let n=t(e);return r(n.user,e.season,n.roster).label};e.innerHTML=`
    
    <p class="page-sub" style="margin-bottom:14px">
      ${o.length} games · ${s(_)} onward
      <span class="muted">· ${s(_-p)} earlier seasons predate the records</span>
    </p>

    <section class="card recbook records-fold" data-collapse="hist-records-week"
             data-collapse-title="Single week" data-collapse-badge="6 records"
             data-collapse-default="folded">
      ${Z(`Highest score`,m&&m.score.toFixed(2),m&&k(m).label,m&&`${m.season} · Week ${m.week}`)}
      ${Z(`Lowest score`,g&&g.score.toFixed(2),g&&k(g).label,g&&`${g.season} · Week ${g.week}`)}
      ${Z(`Biggest blowout`,v&&S(v).toFixed(2)+` pts`,v&&A(v,y),v&&`beat ${A(v,b)} · ${v.season} Wk ${v.week}`)}
      ${Z(`Closest finish`,C&&S(C).toFixed(2)+` pts`,C&&A(C,y),C&&`over ${A(C,b)} · ${C.season} Wk ${C.week}`)}
      ${Z(`Highest combined`,w&&(Number(w.score1)+Number(w.score2)).toFixed(2),w&&`${A(w,y)} v ${A(w,b)}`,w&&`${w.season} · Week ${w.week}`)}
      ${Z(`Best losing score`,O&&O.score.toFixed(2),O&&k(O).label,O&&`lost ${O.against.toFixed(2)} · ${O.season} Wk ${O.week}`)}
    </section>

    <section class="card recbook records-fold" data-collapse="hist-records-seasons"
             data-collapse-title="Seasons &amp; streaks" data-collapse-badge="4 records"
             data-collapse-default="folded">
      ${Z(`Most points, season`,u.points&&u.points.points_for.toFixed(2),u.points&&r(u.points.sleeper_user_id,u.points.season,u.points.roster_id).label,u.points&&String(u.points.season))}
      ${Z(`Best record, season`,u.record&&`${u.record.wins}-${u.record.losses}${u.record.ties?`-`+u.record.ties:``}`,u.record&&r(u.record.sleeper_user_id,u.record.season,u.record.roster_id).label,u.record&&String(u.record.season))}
      ${Z(`Longest win streak`,d&&d.run+` weeks`,d&&r(d.user).label,d&&T(d.from,d.to))}
      ${Z(`Longest losing streak`,f&&f.run+` weeks`,f&&r(f.user).label,f&&T(f.from,f.to))}
    </section>

    ${n.error?``:we(n.trades,t)}
  `;let j=e.querySelector(`[data-fleece-board]`);j&&Te(n.trades,t).then(e=>{j.isConnected&&(j.innerHTML=e.error?`<p class="muted tiny">Historical trade outcomes could not be loaded.</p>`:Ee(e.rankings,t,e.players))})}function Z(e,t,n,r){return t?`
    <div class="rec">
      <span class="rec-label">${s(e)}</span>
      <span class="rec-who">
        ${s(n||`—`)}
        ${r?`<span class="rec-when">${s(r)}</span>`:``}
      </span>
      <span class="rec-val">${s(t)}</span>
    </div>`:``}function Ce(e){let t=(e||[]).filter(e=>e.wins+e.losses+e.ties>0);return{points:N(t,e=>Number(e.points_for)||0),record:N(t,e=>{let t=e.wins+e.losses+e.ties;return t?(e.wins+e.ties/2)/t+t/1e3:0})}}function we(e,t){let n=e.filter(e=>e.status===`complete`&&e.details?.status===`complete`);if(!n.length)return``;let r=new Map;for(let e of n)for(let t of e.details?.roster_ids||[]){let n=`${e.season}:${t}`;r.set(n,(r.get(n)||0)+1)}let i=new Map(t.standings.map(e=>[`${e.season}:${e.roster_id}`,e.sleeper_user_id])),a=new Map;for(let[e,t]of r){let n=i.get(e);n&&a.set(n,(a.get(n)||0)+t)}let o=x(t),c=[...a.entries()].map(([e,t])=>({who:o(e),n:t})).sort((e,t)=>t.n-e.n).slice(0,5);return c.length?`<section class="card records-fold records-trades" data-collapse="hist-records-trades"
                  data-collapse-title="Trades" data-collapse-badge="${n.length} completed"
                  data-collapse-default="folded">
    <div class="trade-fleece-shell" data-fleece-board>${l(`Grading the completed trades…`)}</div>
    <div class="recbook trade-leaders">
      ${c.map((e,t)=>`
        <div class="rec">
          <span class="rec-label">${t===0?`Most trades`:``}</span>
          <span class="rec-who">${s(e.who.label)}</span>
          <span class="rec-val">${e.n}</span>
        </div>`).join(``)}
    </div>
  </section>`:``}var Q=null;async function Te(t,n){return Q||(Q=(async()=>{try{let r=new Date().getFullYear()-1,i=n.leagues.filter(e=>e.scoring_settings&&(e.status===`complete`||Number(e.season)<=r)).map(e=>Number(e.season)).filter(Number.isFinite),a=Math.max(0,...i),o=new Map(n.leagues.map(e=>[Number(e.season),e.scoring_settings])),s=[...new Set(t.flatMap(e=>{let t=[];for(let n=Number(e.season);n<=Math.min(Number(e.season)+2,a);n++)o.get(n)&&t.push(n);return t}))].sort(),[c,...l]=await Promise.all([u(),...s.map(e)]);return{players:c,rankings:ae({trades:t,latestSeason:a,statsBySeason:new Map(s.map((e,t)=>[e,l[t]?.data||{}])),scoringBySeason:o,players:c}),error:null}}catch(e){return{players:{},rankings:[],error:e}}})(),Q)}function Ee(e,t,n){if(!e.length)return`<p class="muted tiny">No completed trade has enough post-trade history to grade yet.</p>`;let r=x(t),i=new Map(t.standings.map(e=>[`${e.season}:${e.roster_id}`,e.sleeper_user_id])),a=(e,t)=>r(i.get(`${e.season}:${t.rosterId}`),e.season,t.rosterId).label,o=e=>e.playerIds.map(e=>`<b class="fleece-player">${s(n[e]?.n||`Player ${e}`)}</b>`).join(``),c=(e,t)=>`<article class="fleece-card">
    <div class="fleece-top"><div class="fleece-rank">#${t+1}</div><div class="fleece-meta">Week ${s(e.trade.week||`—`)}<b>+${s(e.gap.toFixed(1))} starter-impact gap</b></div></div>
    <div class="fleece-compare">
      <div class="fleece-side is-winner"><small>BEST SIDE</small><strong>${s(a(e.trade,e.winner))}</strong><div class="fleece-assets"><em>RECEIVED</em>${o(e.winner)}</div></div>
      <span class="fleece-vs" aria-hidden="true">VS</span>
      <div class="fleece-side is-loser"><small>WORST SIDE</small><strong>${s(a(e.trade,e.loser))}</strong><div class="fleece-assets"><em>RECEIVED</em>${o(e.loser)}</div></div>
    </div>
  </article>`,l=new Map;for(let t of e){let e=Number(t.trade.season);l.has(e)||l.set(e,[]),l.get(e).push(t)}return`<div class="fleece-head"><div><strong>Biggest fleeces</strong><span>Each season ranked independently</span></div><span class="pill">TOP 5 / SEASON</span></div>
    <div class="fleece-seasons">${[...l.entries()].sort((e,t)=>t[0]-e[0]).map(([e,t])=>`
      <section class="card fleece-season" data-collapse="hist-fleeces-${s(e)}"
               data-collapse-title="${s(e)}"
               data-collapse-badge="${Math.min(5,t.length)} ranked trade${Math.min(5,t.length)===1?``:`s`}"
               data-collapse-default="folded">
        <div class="fleece-list">${t.slice(0,5).map(c).join(``)}</div>
      </section>`).join(``)}</div>
    <p class="fleece-method"><strong>Starter-impact gap</strong> measures each acquired player’s DFL points above a position-specific replacement starter in the completed trade season and up to two seasons after it. Those seasons count 50/30/20, while extra package pieces receive diminishing weight (100/50/25/10) so several bench players cannot outweigh one elite starter by volume alone. The active season and pending trades are never graded, and only transactions marked complete count.</p>`}function $(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}function De(e,t){let n=new Map;for(let r of e){let e=r[t];e&&n.set(e,(n.get(e)||0)+1)}return n}export{W as render};