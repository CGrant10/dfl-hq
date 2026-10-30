import{En as e,F as t,I as n,Lr as r,M as i,Mr as a,N as o,Nr as s,P as c,Rr as l,Tn as u,br as d,gn as f,hr as ee,j as p,jr as m,mn as h,mr as g,zn as _}from"../app-core-B3H4je2Z.js";import{$n as v,Hn as y,Jn as b,Qn as x,Wn as S,Xn as C,Yn as w,Zn as T,er as E,kr as D,nr as O,qn as k,rr as A,tr as j}from"../home-core-_cKU4Y9u.js";var M={QB:12,RB:24,WR:30,TE:12},N=[.5,.3,.2],P=[1,.5,.25],F=new Set([`907844411101487104`,`907840843644805120`]);function te(e=[]){return e.filter(e=>e?.type===`trade`&&e?.status===`complete`&&e?.details?.status===`complete`)}function ne(e){let t=new Map;for(let n of e?.details?.roster_ids||[])t.set(String(n),[]);for(let[n,r]of Object.entries(e?.details?.adds||{})){let e=String(r);t.has(e)||t.set(e,[]),t.get(e).push(String(n))}return[...t.entries()].map(([e,t])=>({rosterId:e,playerIds:t}))}function I(e,t){return String(e?.[t]?.p||e?.[t]?.position||``).toUpperCase()}function re(e,t,n,r){let i=new Map(Object.keys(M).map(e=>[e,[]]));for(let[a,o]of Object.entries(t.get(e)||{})){let t=I(r,a);if(!i.has(t))continue;let s=D(o,n.get(e));s!=null&&i.get(t).push(s)}return new Map([...i].map(([e,t])=>(t.sort((e,t)=>t-e),[e,t[M[e]-1]??t.at(-1)??0])))}function ie(e,t,n,r,i,a,o){let s=[];for(let e=Number(t);e<=Math.min(Number(t)+2,n);e++)r.has(e)&&i.has(e)&&s.push(e);if(!s.length)return null;let c=s.reduce((e,t,n)=>e+N[n],0),l=[];for(let t of e){let e=I(a,t);if(!M[e]){l.push(0);continue}let n=s.reduce((n,a,s)=>{let c=D(r.get(a)?.[t],i.get(a))||0,l=o.get(a)?.get(e)||0;return n+Math.max(0,c-l)*N[s]},0)/c;l.push(n)}l.sort((e,t)=>t-e);let u=l.reduce((e,t,n)=>e+t*(P[n]??.1),0);return Math.round(u*10)/10}function ae({trades:e=[],latestSeason:t=0,statsBySeason:n=new Map,scoringBySeason:r=new Map,players:i={}}={}){let a=new Map([...n.keys()].map(e=>[e,re(e,n,r,i)]));return te(e).filter(e=>!F.has(String(e?.details?.transaction_id||``))).map(e=>{let o=ne(e).map(o=>({...o,outcome:ie(o.playerIds,e.season,t,n,r,i,a)}));return o.length<2||o.some(e=>e.outcome==null||!e.playerIds.length)?null:(o.sort((e,t)=>t.outcome-e.outcome),{trade:e,winner:o[0],loser:o.at(-1),gap:Math.round((o[0].outcome-o.at(-1).outcome)*10)/10})}).filter(e=>e&&e.gap>0).sort((e,t)=>t.gap-e.gap)}function oe({text:e,field:t,key:n,canEdit:r=!1}={}){let i=e||`—`;return r?`<button type="button" class="name-pick" data-name-pick="${s(t)}"
    data-name-key="${s(n)}" title="Change who this was">${s(i)}</button>`:s(i)}function se(e,t,n){e&&e.addEventListener(`click`,e=>{let r=e.target.closest(`[data-name-pick]`);if(!r||r.dataset.open===`1`)return;let i=r.dataset.namePick,a=r.dataset.nameKey,o=r.textContent.trim(),c=document.createElement(`select`);c.className=`name-pick-select`,c.innerHTML=`<option value="">— nobody —</option>`+(t||[]).map(e=>`<option value="${s(e.id)}"${e.display_name===o?` selected`:``}>${s(e.display_name)}</option>`).join(``),r.dataset.open=`1`,r.replaceWith(c),c.focus();let l=()=>{c.isConnected&&(r.dataset.open=``,c.replaceWith(r))},u=!1;c.addEventListener(`change`,async()=>{if(!u){u=!0,c.disabled=!0;try{await n({field:i,key:a,memberId:c.value?Number(c.value):null})}catch(e){u=!1,c.disabled=!1,e?.message&&(c.title=e.message)}}}),c.addEventListener(`blur`,()=>{u||l()})})}var ce=/set_season_result|champion_locked|schema cache|does not exist/i,L=e=>ce.test(e?.message||``);async function R({season:e,field:t,memberId:n=null}){let r=t===`champion`,{data:i,error:a}=await _().rpc(`set_season_result`,{target_season:Number(e),champion_member_id:r?n:null,last_place_member_id:r?null:n,set_champion:r,set_last_place:!r});if(a)throw Error(L(a)?`Run season_result_override_schema.sql in Supabase first`:a.message||`That could not be saved`);return Array.isArray(i)?i[0]:i}var z={Champion:`i-trophy`,"Runner Up":`i-medal`,Award:`i-award`,Record:`i-record`,Moment:`i-moment`};function B(e){return`<svg class="ico-sm" aria-hidden="true"><use href="#${z[e]||`i-award`}"></use></svg>`}var V=`fame`,H=null;async function U(e){V=h(`history-tab`,[`fame`,`moments`,`seasons`,`alltime`,`records`],`fame`);let t=Number(new URLSearchParams(location.hash.split(`?`)[1]||``).get(`entry`));t&&(V=`fame`),e.innerHTML=`<header class="utility-head"><small>DFL ARCHIVE</small><h1>History</h1><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Weekly archive →</a></header>`+l(`Reading the record book…`);let r=await k();if(r.error){e.innerHTML=`<header class="utility-head"><small>DFL ARCHIVE</small><h1>History</h1><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Weekly archive →</a></header>`+a(r.error);return}if(!r.manual.length&&!r.leagues.length){e.innerHTML=`<header class="utility-head"><small>DFL ARCHIVE</small><h1>History</h1><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Weekly archive →</a></header>
      <div id="hist-body">
        ${m(`No league history yet.`)}
        ${i()?`<div class="row-end">${p(`history`,`Add entry`)}</div>`:``}
      </div>`,n(e.querySelector(`#hist-body`),()=>{S(),U(e)});return}e.innerHTML=`
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
  `;let o=e.querySelector(`#hist-body`),s=()=>{if(V===`records`)return xe(o,r);o.innerHTML=V===`fame`?G(r):V===`moments`?me(r):V===`seasons`?he(r):ye(r)};if(e.querySelector(`#hist-tabs`).addEventListener(`click`,t=>{let n=t.target.closest(`button[data-tab]`);n&&(V=n.dataset.tab,f(`history-tab`,V),e.querySelectorAll(`#hist-tabs button`).forEach(e=>{let t=e.dataset.tab===V;e.classList.toggle(`on`,t),e.setAttribute(`aria-selected`,String(t))}),K(n),s())}),o.addEventListener(`click`,t=>{let n=t.target.closest(`button[data-season]`);n&&(H=Number(n.dataset.season),f(`history-season`,String(H)),s(),K(e.querySelector(`#year-picker button[data-season="${H}"]`)),e.querySelector(`#hist-tabs`)?.scrollIntoView({block:`start`}))}),n(o,()=>{S(),U(e)}),se(o,r.members||[],async({field:t,key:n,memberId:r})=>{await R({season:Number(n),field:t,memberId:r}),S(),U(e)}),s(),t){let n=e.querySelector(`[data-history-entry="${t}"]`);n&&(n.setAttribute(`data-route-focus`,``),n.tabIndex=-1)}K(e.querySelector(`#hist-tabs button[data-tab="${V}"]`)),V===`seasons`&&K(e.querySelector(`#year-picker button[data-season="${H}"]`))}function W(e){let t=`${s(e.label)}${e.sub&&e.sub!==e.label?`<div class="muted tiny">${s(e.sub)}</div>`:``}`;return e.memberId?`<a href="#/profile?id=${e.memberId}" class="plainlink">${t}</a>`:t}function G(e){let n=T(e),a=t=>d({team_name:t.label,identity:(e.members||[]).find(e=>String(e.id)===String(t.memberId))||{}}),o=e.leagues.filter(e=>e.champion_user_id||e.champion_roster_id).sort((e,t)=>t.season-e.season),c=[...r(t(`history`,e.manual),`year`).entries()].sort((e,t)=>t[0]-e[0]);return`
    ${o.length?`
      <section class="archive-cabinet" aria-label="League champions">
        <header class="archive-cabinet-head"><small>THE TROPHY CASE</small><h2>Champions</h2><span>${o.length} seasons</span></header>
        <ol class="archive-seasons">
          ${o.map((e,t)=>{let r=n(e.champion_user_id,e.season,e.champion_roster_id),o=e.runner_up_user_id||e.runner_up_roster_id?n(e.runner_up_user_id,e.season,e.runner_up_roster_id):null;return`<li class="archive-season${t===0?` is-featured`:``}">
              <header class="archive-season-head"><span><strong>${s(e.season)}</strong><small>SEASON</small></span><span class="archive-title-label">${B(`Champion`)} DFL CHAMPION</span></header>
              <div class="archive-winner">${a(r)}<div>${i()?oe({text:r.label,field:`champion`,key:e.season,canEdit:!0}):W(r)}${e.champion_locked?`<small class="archive-lock">Set by hand</small>`:``}</div></div>
              ${o?`<div class="archive-runner"><small>RUNNER-UP</small><div>${a(o)}${W(o)}</div></div>`:`<div class="archive-runner"><small>RUNNER-UP</small><span>Not recorded</span></div>`}
            </li>`}).join(``)}
        </ol>
        <p class="archive-source">Sleeper playoff results · manually corrected seasons are marked. 2017–18 were played on another app; 2019’s winner was later removed from the league.</p>
      </section>`:``}

    ${c.length?c.map(([e,t])=>`
          <div class="section-head">
            <h2>${s(e)}</h2>
            ${p(`history`,`Add entry`,{year:e})}
          </div>
          <div class="card schedule">${ue(t).map(de).join(``)}</div>`).join(``):`<div class="card"><div class="card-body muted">${o.length?`No additional stories yet.`:`No league history yet.`}</div>
           ${i()?`<div class="row-end">${p(`history`,`Add entry`)}</div>`:``}
         </div>`}
  `}var le=[`Champion`,`Runner Up`,`Award`,`Record`,`Moment`];function ue(e){let t=e=>{let t=le.indexOf(e);return t===-1?99:t};return[...e].sort((e,n)=>t(e.category)-t(n.category))}function de(e){return`
    <div class="evrow ${c(`history`,e)}" data-history-entry="${s(e.id)}">
      <div class="evicon" aria-hidden="true">${B(e.category)}</div>
      <div class="evbody">
        <div class="evtop">
          <span class="evtitle">${s(e.winner||e.category)}</span>
          <span class="pill">${s(e.category)}</span>
        </div>
        ${e.notes?`<div class="evnote">${s(e.notes)}</div>`:``}
        ${o(`history`,e,{compact:!0})}
      </div>
    </div>`}var fe={championship:`i-trophy`,title:`i-trophy`,commissioner:`i-moment`,golf:`i-golf`,arena:`i-arena`,streak:`i-record`,heartbreak:`i-medal`,blowout:`i-record`,nailbiter:`i-record`,high:`i-record`,low:`i-record`,rivalry:`i-versus`},pe={championship:`Champion`,title:`The final`,commissioner:`From the commissioner`,golf:`Golf`,arena:`Arena`,streak:`Streak`,heartbreak:`Hard luck`,blowout:`Blowout`,nailbiter:`Nail-biter`,high:`Highest week`,low:`Lowest week`,rivalry:`Rivalry`};function me(e){let t=C(e);if(!t.length)return`<div class="state">
      <span class="state-title">Nothing to remember yet</span>
      <span>Sync Sleeper from the Admin page, or write the first one down.</span>
    </div>${i()?`<div class="row-end">${p(`history`,`Add a moment`)}</div>`:``}`;let n=r(t,e=>e.season??`—`),a=[...n.keys()].sort((e,t)=>(Number(t)||0)-(Number(e)||0));return`
    <p class="page-sub" style="margin-bottom:14px">
      ${t.length} moments · read off every game on record
      <span class="muted">· nothing here is invented</span>
    </p>
    ${a.map((e,t)=>{let r=n.get(e);return`
      <div class="card momentlist" data-collapse="hist-moments-${s(e)}"
           data-collapse-title="${s(e)}"
           data-collapse-badge="${r.length} moment${r.length===1?``:`s`}"
           ${t===0?``:`data-collapse-default="folded"`}>
        ${r.map(q).join(``)}
      </div>`}).join(``)}
    ${i()?`<div class="row-end">${p(`history`,`Add a moment`)}</div>`:``}
  `}function K(e){if(e)try{e.scrollIntoView({inline:`nearest`,block:`nearest`})}catch{}}function q(e){let t=e.kind===`commissioner`&&e.category?e.category:pe[e.kind]||`Moment`,n=`
    <svg class="ico-sm moment-ico" aria-hidden="true"><use href="#${fe[e.kind]||`i-moment`}"></use></svg>
    <span class="moment-body">
      <span class="moment-kind">${s(t)}</span>
      <strong class="moment-head">${s(e.headline)}</strong>
      ${e.detail?`<span class="moment-detail">${s(e.detail)}</span>`:``}
    </span>`;return e.href?`<a class="moment is-${s(e.kind)}" href="${s(e.href)}">${n}</a>`:`<div class="moment is-${s(e.kind)}">${n}</div>`}function he(e){let t=[...new Set(e.standings.map(e=>e.season))].sort((e,t)=>t-e);if(!t.length)return m(`No season standings yet. Sync Sleeper from the Admin page.`);H=Number(h(`history-season`,t.map(String),String(H||``)))||H,t.includes(H)||(H=t.find(t=>e.standings.some(e=>e.season===t&&e.wins+e.losses+e.ties>0))??t[0]);let n=A(e,H),r=`<div class="tabs tabscroll" id="year-picker" role="tablist"
                       aria-label="Season">${t.map(e=>`<button data-season="${e}" role="tab" aria-selected="${e===H}"
             class="${e===H?`on`:``}">${e}</button>`).join(``)}</div>`;return n.played?`
    ${r}
    ${ge(n)}
    ${_e(n)}
    ${ve(n)}
    ${J(n,!0)}
  `:`${r}
      <div class="state">
        <span class="state-title">${s(H)} has not been played</span>
        <span>The teams are set. The yearbook writes itself once the games start.</span>
      </div>
      ${J(n,!1)}`}function ge(e){return e.champion?`
    <section class="yb-champ">
      <span class="yb-kicker">
        <svg class="ico-sm" aria-hidden="true"><use href="#i-trophy"></use></svg>
        ${s(e.season)} champion
      </span>
      <strong class="yb-name">${s(e.champion.label)}</strong>
      ${e.champion.sub&&e.champion.sub!==e.champion.label?`<span class="yb-sub">${s(e.champion.sub)}</span>`:``}
      ${e.runnerUp?`<span class="yb-runner">Runner-up · ${s(e.runnerUp.label)}</span>`:``}
    </section>`:`<div class="card"><div class="card-title">${s(e.season)}</div>
      <div class="card-body muted">No champion recorded for this season.</div></div>`}function _e(e){if(!e.title)return``;let t=e.title;return`
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
    </div>`}function ve(e){let t=e.moments.filter(e=>e.kind!==`championship`&&e.kind!==`title`);return t.length?`
    <h2 class="section-title">${s(e.season)} in moments</h2>
    <div class="card momentlist">${t.map(q).join(``)}</div>`:``}function J(e,t){return`
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
    </div>`}function ye(e){if(!e.standings.length)return m(`No career records yet. Sync Sleeper from the Admin page.`);let t=T(e),n=Te(e.leagues,`champion_user_id`),i=[...r(e.standings,`sleeper_user_id`).entries()].filter(([e])=>e!=null).filter(([t])=>e.users.some(e=>e.sleeper_user_id===t)).map(([e,r])=>{let i=$(r,`wins`),a=$(r,`losses`),o=$(r,`ties`),s=i+a+o,c=r.filter(e=>e.rank!=null);return{who:t(e),wins:i,losses:a,ties:o,winPct:s?(i+o/2)/s:0,pointsFor:$(r,`points_for`),avgFinish:c.length?c.reduce((e,t)=>e+t.rank,0)/c.length:null,playoffs:r.filter(e=>e.made_playoffs).length,titles:n.get(e)||0,seasons:r.length}}).sort((e,t)=>t.winPct-e.winPct||t.titles-e.titles||t.pointsFor-e.pointsFor),a=new Set(e.standings.map(e=>e.season)).size;return`
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
    </div>`}var Y=null;async function be(){if(Y)return Y;let{data:e,error:t}=await _().from(`sleeper_transactions`).select(`season, week, type, status, details`).eq(`type`,`trade`).eq(`status`,`complete`);return Y={trades:e||[],error:t||null},Y}async function xe(e,t){e.innerHTML=l(`Reading every week ever played…`);let n=await be(),r=T(t),i=j(t.matchups);if(!i.length){e.innerHTML=m(`No weekly scores synced yet. Run a Sleeper sync from the Admin page.`);return}let a=i.filter(e=>e.score>0),o=t.matchups.filter(x),c=E(i),u=Se(t.standings),d=y(c.map(e=>e.win).filter(Boolean),e=>e.run),f=y(c.map(e=>e.loss).filter(Boolean),e=>e.run),p=y(a,e=>e.score),h=y(a,e=>-e.score),_=y(o,e=>w(e)),S=y(o.filter(e=>w(e)>0),e=>-w(e)),C=y(o,e=>Number(e.score1)+Number(e.score2)),D=y(a.filter(e=>!e.won&&!e.tie),e=>e.score),k=e=>r(e.user,e.season,e.roster),A=(e,t)=>{let n=t(e);return r(n.user,e.season,n.roster).label};e.innerHTML=`
    
    <p class="page-sub" style="margin-bottom:14px">
      ${o.length} games · ${s(g)} onward
      <span class="muted">· ${s(g-ee)} earlier seasons predate the records</span>
    </p>

    <section class="card recbook records-fold" data-collapse="hist-records-week"
             data-collapse-title="Single week" data-collapse-badge="6 records"
             data-collapse-default="folded">
      ${X(`Highest score`,p&&p.score.toFixed(2),p&&k(p).label,p&&`${p.season} · Week ${p.week}`)}
      ${X(`Lowest score`,h&&h.score.toFixed(2),h&&k(h).label,h&&`${h.season} · Week ${h.week}`)}
      ${X(`Biggest blowout`,_&&w(_).toFixed(2)+` pts`,_&&A(_,O),_&&`beat ${A(_,b)} · ${_.season} Wk ${_.week}`)}
      ${X(`Closest finish`,S&&w(S).toFixed(2)+` pts`,S&&A(S,O),S&&`over ${A(S,b)} · ${S.season} Wk ${S.week}`)}
      ${X(`Highest combined`,C&&(Number(C.score1)+Number(C.score2)).toFixed(2),C&&`${A(C,O)} v ${A(C,b)}`,C&&`${C.season} · Week ${C.week}`)}
      ${X(`Best losing score`,D&&D.score.toFixed(2),D&&k(D).label,D&&`lost ${D.against.toFixed(2)} · ${D.season} Wk ${D.week}`)}
    </section>

    <section class="card recbook records-fold" data-collapse="hist-records-seasons"
             data-collapse-title="Seasons &amp; streaks" data-collapse-badge="4 records"
             data-collapse-default="folded">
      ${X(`Most points, season`,u.points&&u.points.points_for.toFixed(2),u.points&&r(u.points.sleeper_user_id,u.points.season,u.points.roster_id).label,u.points&&String(u.points.season))}
      ${X(`Best record, season`,u.record&&`${u.record.wins}-${u.record.losses}${u.record.ties?`-`+u.record.ties:``}`,u.record&&r(u.record.sleeper_user_id,u.record.season,u.record.roster_id).label,u.record&&String(u.record.season))}
      ${X(`Longest win streak`,d&&d.run+` weeks`,d&&r(d.user).label,d&&v(d.from,d.to))}
      ${X(`Longest losing streak`,f&&f.run+` weeks`,f&&r(f.user).label,f&&v(f.from,f.to))}
    </section>

    ${n.error?``:Z(n.trades,t)}
  `;let M=e.querySelector(`[data-fleece-board]`);M&&Ce(n.trades,t).then(e=>{M.isConnected&&(M.innerHTML=e.error?`<p class="muted tiny">Historical trade outcomes could not be loaded.</p>`:we(e.rankings,t,e.players))})}function X(e,t,n,r){return t?`
    <div class="rec">
      <span class="rec-label">${s(e)}</span>
      <span class="rec-who">
        ${s(n||`—`)}
        ${r?`<span class="rec-when">${s(r)}</span>`:``}
      </span>
      <span class="rec-val">${s(t)}</span>
    </div>`:``}function Se(e){let t=(e||[]).filter(e=>e.wins+e.losses+e.ties>0);return{points:y(t,e=>Number(e.points_for)||0),record:y(t,e=>{let t=e.wins+e.losses+e.ties;return t?(e.wins+e.ties/2)/t+t/1e3:0})}}function Z(e,t){let n=e.filter(e=>e.status===`complete`&&e.details?.status===`complete`);if(!n.length)return``;let r=new Map;for(let e of n)for(let t of e.details?.roster_ids||[]){let n=`${e.season}:${t}`;r.set(n,(r.get(n)||0)+1)}let i=new Map(t.standings.map(e=>[`${e.season}:${e.roster_id}`,e.sleeper_user_id])),a=new Map;for(let[e,t]of r){let n=i.get(e);n&&a.set(n,(a.get(n)||0)+t)}let o=T(t),c=[...a.entries()].map(([e,t])=>({who:o(e),n:t})).sort((e,t)=>t.n-e.n).slice(0,5);return c.length?`<section class="card records-fold records-trades" data-collapse="hist-records-trades"
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
  </section>`:``}var Q=null;async function Ce(t,n){return Q||(Q=(async()=>{try{let r=new Date().getFullYear()-1,i=n.leagues.filter(e=>e.scoring_settings&&(e.status===`complete`||Number(e.season)<=r)).map(e=>Number(e.season)).filter(Number.isFinite),a=Math.max(0,...i),o=new Map(n.leagues.map(e=>[Number(e.season),e.scoring_settings])),s=[...new Set(t.flatMap(e=>{let t=[];for(let n=Number(e.season);n<=Math.min(Number(e.season)+2,a);n++)o.get(n)&&t.push(n);return t}))].sort(),[c,...l]=await Promise.all([u(),...s.map(e)]);return{players:c,rankings:ae({trades:t,latestSeason:a,statsBySeason:new Map(s.map((e,t)=>[e,l[t]?.data||{}])),scoringBySeason:o,players:c}),error:null}}catch(e){return{players:{},rankings:[],error:e}}})(),Q)}function we(e,t,n){if(!e.length)return`<p class="muted tiny">No completed trade has enough post-trade history to grade yet.</p>`;let r=T(t),i=new Map(t.standings.map(e=>[`${e.season}:${e.roster_id}`,e.sleeper_user_id])),a=(e,t)=>r(i.get(`${e.season}:${t.rosterId}`),e.season,t.rosterId).label,o=e=>e.playerIds.map(e=>`<b class="fleece-player">${s(n[e]?.n||`Player ${e}`)}</b>`).join(``),c=(e,t)=>`<article class="fleece-card">
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
    <p class="fleece-method"><strong>Starter-impact gap</strong> measures each acquired player’s DFL points above a position-specific replacement starter in the completed trade season and up to two seasons after it. Those seasons count 50/30/20, while extra package pieces receive diminishing weight (100/50/25/10) so several bench players cannot outweigh one elite starter by volume alone. The active season and pending trades are never graded, and only transactions marked complete count.</p>`}function $(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}function Te(e,t){let n=new Map;for(let r of e){let e=r[t];e&&n.set(e,(n.get(e)||0)+1)}return n}export{U as render};