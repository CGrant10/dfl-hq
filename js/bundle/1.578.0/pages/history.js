import{Br as e,Dn as t,F as n,Fr as r,I as i,M as a,N as o,Nr as s,On as c,P as l,Pr as u,Sr as d,Vn as f,_r as p,gn as m,gr as h,j as g,ln as _,vn as v,zr as y}from"../app-core-CSXDzzqg.js";import{$t as b,Jt as x,Kt as S,Qt as C,Ut as w,Vt as T,Xt as E,Yi as D,Yt as O,Zt as k,an as A,br as j,en as M,fn as N,in as ee,nn as P,qt as F,tn as I,yr as te}from"../home-core-B9NJLvbN.js";var L=e=>e!=null&&String(e).trim()!==``&&Number.isFinite(Number(e))?Number(e):null,R=e=>Number.isInteger(Number(e))&&Number(e)>0,z=e=>Math.round(e*100);function ne(e=[]){let t=new Set;return e.filter(e=>e.completed===!0&&R(e.season)&&Number(e.season)>=2010&&Number(e.season)<=2100&&R(e.week)&&Number(e.week)<=18).map(e=>({season:Number(e.season),week:Number(e.week)})).filter(e=>{let n=`${e.season}:${e.week}`;return!t.has(n)&&(t.add(n),!0)}).sort((e,t)=>t.season-e.season||t.week-e.week)}function re(e,t,n,r){let i=new Map;if(e.archiveComplete!==!0)return i;let a=new Set(ne(t).filter(e=>e.season===n&&e.week<r).map(e=>e.week)),o=new Set;if([...a].some(t=>!(e.matchups||[]).some(e=>Number(e.season)===n&&Number(e.week)===t)))return i;for(let t of e.matchups||[]){if(Number(t.season)!==n||!a.has(Number(t.week))||!R(t.roster1)||!R(t.roster2)||Number(t.roster1)===Number(t.roster2))continue;let e=`${t.week}:${[Number(t.roster1),Number(t.roster2)].sort((e,t)=>e-t).join(`:`)}`;if(o.has(e))continue;o.add(e);let r=L(t.score1),s=L(t.score2);for(let[e,n,a]of[[t.roster1,r,s],[t.roster2,s,r]]){let t=i.get(String(e))||{wins:0,losses:0,ties:0,known:!0};n===null||a===null?t.known=!1:z(n)===z(a)?t.ties++:n>a?t.wins++:t.losses++,i.set(String(e),t)}}return i}function ie(e,{name:t=(e,t,n)=>({label:`Roster ${n}`,memberId:null}),records:n=new Map}={}){let r=[],i=new Set,a=!1;for(let o of e.games||[]){if(!R(o.matchup_id)||i.has(String(o.matchup_id))){a=!0;continue}i.add(String(o.matchup_id));let s=(r,i,a)=>({...t(r,Number(e.season),i),roster:i,score:L(a),record:n.get(String(i))||null}),c=s(o.user1,o.roster1,o.score1),l=s(o.user2,o.roster2,o.score2),u=c.score!==null&&l.score!==null&&R(o.roster1)&&R(o.roster2)&&Number(o.roster1)!==Number(o.roster2),d=u?z(c.score)-z(l.score):null,f=u&&d!==0?d>0?c:l:null,p=f?f===c?l:c:null,m=o.winner_roster_id!=null&&(!f||Number(o.winner_roster_id)!==Number(f.roster));r.push({...o,left:c,right:l,scored:u&&!m,tied:u&&!m&&d===0,winner:m?null:f,loser:m?null:p,margin:u&&!m?Math.abs(d)/100:null,total:u&&!m?(z(c.score)+z(l.score))/100:null})}let o=e.completed===!0&&r.length>0&&!a&&r.every(e=>e.scored),s=o?r.map(e=>e.margin):[],c=Math.min(...s),l=Math.max(...s),u=o?r.filter(e=>e.margin===c):[],d=o&&l>0?r.filter(e=>e.margin===l):[],f=o?N({...e,games:r.map(e=>({...e,left:{...e.left,name:e.left.label},right:{...e.right,name:e.right.label}}))})[0]:null,p=r.find(e=>e.winner),m=f?.text||(o?p?`${p.winner.label} beat ${p.loser.label} by ${p.margin.toFixed(2)}. Talk your shit. The scoreboard backs it up.`:`Nobody won. Nobody lost. Everybody gets to argue about this shit.`:null);return{season:Number(e.season),week:Number(e.week),games:r,complete:o,close:u,blowout:d,roast:m}}var B=e=>e===null?`—`:e.toFixed(2),ae=e=>e?.known?`${e.wins}–${e.losses}${e.ties?`–${e.ties}`:``}`:`—`;function oe(e,t,n){let i=t=>`<span class="archive-match-team${e.winner===t?` is-winner`:``}">${d({identity:n.find(e=>String(e.id)===String(t.memberId))||{},team_name:t.label})}<span class="archive-match-name">${r(t.label)}</span><b>${B(t.score)}</b></span>`,a=[t.close.includes(e)?e.tied?`Tied finish`:`Closest finish`:``,t.blowout.includes(e)?`Biggest beatdown`:``].filter(Boolean);return`<details class="archive-match" id="archive-match-${e.matchup_id}" data-archive-match="${e.matchup_id}"><summary><span class="archive-match-score">${i(e.left)}${i(e.right)}</span><span class="archive-match-tail"><small>${e.scored?e.tied?`Tie`:a.join(` · `)||`Final`:`Score incomplete`}</small><svg class="ico-sm" aria-hidden="true"><use href="#i-chev-right"></use></svg></span></summary><div class="archive-match-detail"><dl><div><dt>${e.tied?`Result`:`Winning margin`}</dt><dd>${e.tied?`Tie`:B(e.margin)}</dd></div><div><dt>Combined score</dt><dd>${B(e.total)}</dd></div></dl><div class="archive-entering"><span>Entering Week ${t.week}</span>${[e.left,e.right].map(e=>`<div><span>${e.memberId?`<a href="#/profile?id=${r(e.memberId)}">${r(e.label)}</a>`:r(e.label)}</span><b>${ae(e.record)}</b></div>`).join(``)}</div><a class="linkbtn archive-match-open" href="#/clubhouse?season=${t.season}&amp;week=${t.week}&amp;tab=matchups&amp;matchup=${e.matchup_id}">Open matchup <span aria-hidden="true">→</span></a></div></details>`}function se(e,{lore:t,params:n=new URLSearchParams,loadIndex:i=ee,loadWeek:a=A,active:o=()=>e.isConnected}={}){let s=!1,c=0,l=[],u=[],d=0,f=0,p=null,h=!1,g=!0,y=()=>!s&&e.isConnected&&o();e.innerHTML=`<section class="archive-week-desk" data-no-swipe aria-label="Weekly archive"><div data-archive-tools></div><div data-archive-content role="region" aria-label="Archived matchups" aria-busy="true"><p class="archive-week-state" role="status">Loading completed weeks…</p></div></section>`;let b=e.querySelector(`[data-archive-tools]`),x=e.querySelector(`[data-archive-content]`),S=()=>{if(!y()||h)return;let e=b.querySelector(`.archive-week-strip`),t=e?.querySelector(`[aria-pressed="true"]`);if(!t||!e.clientWidth)return;let n=e.getBoundingClientRect(),r=t.getBoundingClientRect(),i=r.left<n.left+22?r.left-n.left-22:r.right>n.right-22?r.right-n.right+22:0;i&&(e.scrollLeft+=i)},C=new ResizeObserver(S),w=e=>{e.target.closest(`.archive-week-strip`)&&(h=!0)};for(let e of[`pointerdown`,`wheel`,`keydown`])b.addEventListener(e,w,{passive:!0});let T=()=>_(e,{selector:`.archive-match`,active:y,getMotion:()=>m(`gameday-motion`,[`on`,`off`],`on`)===`on`}),D=T(),O=()=>`<div class="archive-season-tools"><label for="archive-season">Season<select id="archive-season">${[...new Set(u.map(e=>e.season))].map(e=>`<option value="${e}"${e===d?` selected`:``}>${e}</option>`).join(``)}</select></label><a class="linkbtn" href="#/clubhouse?season=${d}&amp;week=${f}&amp;tab=recap">Full recap →</a></div><div class="archive-week-strip tabs tabscroll" id="archive-week-picker" role="group" aria-label="Archived week">${u.filter(e=>e.season===d).sort((e,t)=>e.week-t.week).map(e=>`<button type="button" data-archive-week="${e.week}" aria-pressed="${e.week===f}" class="${e.week===f?`on`:``}">Wk ${e.week}</button>`).join(``)}</div>`,k=(e,t)=>t.length?`<button type="button" data-archive-highlight="${t[0].matchup_id}"><small>${e}${t.length>1?` · ${t.length} tied`:``}</small><strong>${B(t[0].margin)}<span> pts</span></strong><span>${t.length>1?`${t.length} matchups`:r(t[0].tied?`${t[0].left.label} & ${t[0].right.label}`:t[0].winner.label)}</span></button>`:``,j=async()=>{let e=++c;p=null,D.stop(),D=T(),x.setAttribute(`aria-busy`,`true`),x.innerHTML=`<p class="archive-week-state" role="status">Loading ${d} · Week ${f}…</p>`;try{let i=await a(d,f);if(!y()||e!==c)return;if(Number(i.season)!==d||Number(i.week)!==f||i.completed!==!0)throw Error(`Week is not complete`);let o=re(t,l,d,f);if(f===1&&t.archiveComplete===!0)for(let e of i.games)for(let t of[e.roster1,e.roster2])o.set(String(t),{wins:0,losses:0,ties:0,known:!0});p=ie(i,{name:E(t),records:o}),x.innerHTML=`<header class="archive-week-heading"><div><h2>Week ${f}</h2></div><span>${p.games.length} matchup${p.games.length===1?``:`s`}</span></header>${p.complete?`<div class="archive-week-highlights">${k(p.close[0]?.tied?`Dead heat`:`Closest finish`,p.close)}${k(`Biggest beatdown`,p.blowout)}</div><p class="archive-week-roast">${r(p.roast)}</p>`:`<p class="archive-week-state" role="status">Some scores are missing. Weekly highlights are unavailable.</p>`}<div class="archive-week-matchups">${p.games.map(e=>oe(e,p,t.members||[])).join(``)||`<p class="archive-week-state">No matchups recorded for this week.</p>`}</div>`;let s=n.get(`matchup`);if(s){n.delete(`matchup`);let e=x.querySelector(`[data-archive-match="${CSS.escape(s)}"]`);e&&(D.stop(),D=T(),e.open=!0,e.querySelector(`summary`).focus({preventScroll:!0}),e.scrollIntoView({block:`nearest`,behavior:`instant`}))}}catch{y()&&e===c&&(x.innerHTML=`<p class="archive-week-state" role="status">This week couldn’t load. <button type="button" class="linkbtn" data-archive-retry>Try again</button></p>`)}finally{y()&&e===c&&x.setAttribute(`aria-busy`,`false`)}},M=(t,n,{focus:r=!1}={})=>{let i=d!==t;if(d=t,f=n,h=g&&!!e.closest(`[data-route-returning="true"]`),g=!1,v(`history-season`,String(t)),v(`archive-week-${t}`,String(n)),i||!b.firstElementChild)b.innerHTML=O(),C.disconnect(),C.observe(b.querySelector(`.archive-week-strip`));else{for(let e of b.querySelectorAll(`[data-archive-week]`)){let t=Number(e.dataset.archiveWeek)===n;e.setAttribute(`aria-pressed`,String(t)),e.classList.toggle(`on`,t)}b.querySelector(`a`).href=`#/clubhouse?season=${t}&week=${n}&tab=recap`}let a=b.querySelector(`[data-archive-week="${n}"]`);return S(),r&&a?.focus({preventScroll:!0}),j()},N=async()=>{let e=++c;try{if(l=await i(),!y()||e!==c)return;if(u=ne(l),!u.length){x.innerHTML=`<p class="archive-week-state" role="status">No finished weeks are available yet.</p>`,x.setAttribute(`aria-busy`,`false`);return}let t=[...new Set(u.map(e=>e.season))],r=Number(n.get(`season`)),a=Number(m(`history-season`,t.map(String),String(t[0]))),o=t.includes(r)?r:a,s=u.filter(e=>e.season===o).map(e=>e.week),d=Number(n.get(`week`)),f=Number(m(`archive-week-${o}`,s.map(String),String(s[0])));if(n.has(`season`)&&!t.includes(r)||n.has(`week`)&&!s.includes(d)){x.innerHTML=`<p class="archive-week-state" role="status">That finished week is unavailable. <a class="linkbtn" href="#/history?tab=weeks">Latest completed weeks →</a></p>`,x.setAttribute(`aria-busy`,`false`);return}await M(o,s.includes(d)?d:f)}catch{y()&&e===c&&(x.innerHTML=`<p class="archive-week-state" role="status">The weekly archive couldn’t load. <button type="button" class="linkbtn" data-archive-index-retry>Try again</button></p>`,x.setAttribute(`aria-busy`,`false`))}},P=e=>{let t=e.target.closest(`button`);if(!(!t||!y())){if(t.hasAttribute(`data-archive-week`)){let e=Number(t.dataset.archiveWeek);e!==f&&M(d,e,{focus:!0})}if(t.hasAttribute(`data-archive-retry`)&&j(),t.hasAttribute(`data-archive-index-retry`)&&N(),t.hasAttribute(`data-archive-highlight`)){let e=x.querySelector(`[data-archive-match="${t.dataset.archiveHighlight}"]`);e&&(D.stop(),D=T(),e.open=!0,e.querySelector(`summary`).focus({preventScroll:!0}),e.scrollIntoView({block:`nearest`,behavior:`instant`}))}}},F=e=>{if(e.target.id===`archive-season`){let t=Number(e.target.value),n=u.filter(e=>e.season===t).map(e=>e.week),r=n.includes(f)?f:n[0];M(t,r),b.querySelector(`select`).focus({preventScroll:!0})}};return e.addEventListener(`click`,P),e.addEventListener(`change`,F),{ready:N(),stop(){s=!0,c++,C.disconnect();for(let e of[`pointerdown`,`wheel`,`keydown`])b.removeEventListener(e,w);D.stop(),e.removeEventListener(`click`,P),e.removeEventListener(`change`,F)}}}var V={QB:12,RB:24,WR:30,TE:12},ce=[.5,.3,.2],le=[1,.5,.25],ue=new Set([`907844411101487104`,`907840843644805120`]);function de(e=[]){return e.filter(e=>e?.type===`trade`&&e?.status===`complete`&&e?.details?.status===`complete`)}function fe(e){let t=new Map;for(let n of e?.details?.roster_ids||[])t.set(String(n),[]);for(let[n,r]of Object.entries(e?.details?.adds||{})){let e=String(r);t.has(e)||t.set(e,[]),t.get(e).push(String(n))}return[...t.entries()].map(([e,t])=>({rosterId:e,playerIds:t}))}function pe(e,t){return String(e?.[t]?.p||e?.[t]?.position||``).toUpperCase()}function me(e,t,n,r){let i=new Map(Object.keys(V).map(e=>[e,[]]));for(let[a,o]of Object.entries(t.get(e)||{})){let t=pe(r,a);if(!i.has(t))continue;let s=D(o,n.get(e));s!=null&&i.get(t).push(s)}return new Map([...i].map(([e,t])=>(t.sort((e,t)=>t-e),[e,t[V[e]-1]??t.at(-1)??0])))}function he(e,t,n,r,i,a,o){let s=[];for(let e=Number(t);e<=Math.min(Number(t)+2,n);e++)r.has(e)&&i.has(e)&&s.push(e);if(!s.length)return null;let c=s.reduce((e,t,n)=>e+ce[n],0),l=[];for(let t of e){let e=pe(a,t);if(!V[e]){l.push(0);continue}let n=s.reduce((n,a,s)=>{let c=D(r.get(a)?.[t],i.get(a))||0,l=o.get(a)?.get(e)||0;return n+Math.max(0,c-l)*ce[s]},0)/c;l.push(n)}l.sort((e,t)=>t-e);let u=l.reduce((e,t,n)=>e+t*(le[n]??.1),0);return Math.round(u*10)/10}function ge({trades:e=[],latestSeason:t=0,statsBySeason:n=new Map,scoringBySeason:r=new Map,players:i={}}={}){let a=new Map([...n.keys()].map(e=>[e,me(e,n,r,i)]));return de(e).filter(e=>!ue.has(String(e?.details?.transaction_id||``))).map(e=>{let o=fe(e).map(o=>({...o,outcome:he(o.playerIds,e.season,t,n,r,i,a)}));return o.length<2||o.some(e=>e.outcome==null||!e.playerIds.length)?null:(o.sort((e,t)=>t.outcome-e.outcome),{trade:e,winner:o[0],loser:o.at(-1),gap:Math.round((o[0].outcome-o.at(-1).outcome)*10)/10})}).filter(e=>e&&e.gap>0).sort((e,t)=>t.gap-e.gap)}function _e({text:e,field:t,key:n,canEdit:i=!1}={}){let a=e||`—`;return i?`<button type="button" class="name-pick" data-name-pick="${r(t)}"
    data-name-key="${r(n)}" title="Change who this was">${r(a)}</button>`:r(a)}function ve(e,t,n){e&&e.addEventListener(`click`,e=>{let i=e.target.closest(`[data-name-pick]`);if(!i||i.dataset.open===`1`)return;let a=i.dataset.namePick,o=i.dataset.nameKey,s=i.textContent.trim(),c=document.createElement(`select`);c.className=`name-pick-select`,c.innerHTML=`<option value="">— nobody —</option>`+(t||[]).map(e=>`<option value="${r(e.id)}"${e.display_name===s?` selected`:``}>${r(e.display_name)}</option>`).join(``),i.dataset.open=`1`,i.replaceWith(c),c.focus();let l=()=>{c.isConnected&&(i.dataset.open=``,c.replaceWith(i))},u=!1;c.addEventListener(`change`,async()=>{if(!u){u=!0,c.disabled=!0;try{await n({field:a,key:o,memberId:c.value?Number(c.value):null})}catch(e){u=!1,c.disabled=!1,e?.message&&(c.title=e.message)}}}),c.addEventListener(`blur`,()=>{u||l()})})}var ye=/set_season_result|champion_locked|schema cache|does not exist/i,be=e=>ye.test(e?.message||``);async function xe({season:e,field:t,memberId:n=null}){let r=t===`champion`,{data:i,error:a}=await f().rpc(`set_season_result`,{target_season:Number(e),champion_member_id:r?n:null,last_place_member_id:r?null:n,set_champion:r,set_last_place:!r});if(a)throw Error(be(a)?`Run season_result_override_schema.sql in Supabase first`:a.message||`That could not be saved`);return Array.isArray(i)?i[0]:i}var Se={Champion:`i-trophy`,"Runner Up":`i-medal`,Award:`i-award`,Record:`i-record`,Moment:`i-moment`};function Ce(e){return`<svg class="ico-sm" aria-hidden="true"><use href="#${Se[e]||`i-award`}"></use></svg>`}var H=`fame`,U=null,W=0,G=null;function we(){W++,G?.stop(),G=null}async function K(t){G?.stop(),G=null;let n=++W;H=m(`history-tab`,[`weeks`,`fame`,`moments`,`seasons`,`alltime`,`records`],`weeks`);let r=new URLSearchParams(location.hash.split(`?`)[1]||``),o=r.get(`tab`);[`weeks`,`fame`,`moments`,`seasons`,`alltime`,`records`].includes(o)&&(H=o);let c=Number(r.get(`season`));Number.isInteger(c)&&c>=2010&&c<=2100&&(U=c,v(`history-season`,String(U)));let l=Number(r.get(`entry`));l&&(H=`fame`),t.innerHTML=`<header class="utility-head archive-page-head"><h1>History</h1></header>`+e(`Reading the record book…`);let d=await S();if(n!==W||!t.isConnected)return;if(d.error){t.innerHTML=`<header class="utility-head archive-page-head"><h1>History</h1></header>`+u(d.error);return}if(!d.manual.length&&!d.leagues.length){t.innerHTML=`<header class="utility-head archive-page-head"><h1>History</h1></header>
      <div id="hist-body">
        ${s(`No league history yet.`)}
        ${a()?`<div class="row-end">${g(`history`,`Add entry`)}</div>`:``}
      </div>`,i(t.querySelector(`#hist-body`),()=>{w(),K(t)});return}t.innerHTML=`
    <header class="utility-head archive-page-head"><h1>History</h1></header>
    <!--
      History sections stay in one native horizontal strip, and .tabs has always been a horizontal
      scroller - the problem was that it did not look like one. At 375px the
      strip is wider than the screen with nothing to say so, so "Records"
      simply did not exist unless you happened to swipe. tabscroll adds the
      edge fade, the snap and the keyboard roles; scrollTabIntoView() below
      keeps the current one in shot.
    -->
    <div class="tabs tabscroll" id="hist-tabs" role="tablist" aria-label="History sections">
      <button type="button" data-tab="weeks" role="tab" aria-selected="${H===`weeks`}" class="${H===`weeks`?`on`:``}">Weeks</button>
      <button data-tab="fame"    role="tab" aria-selected="${H===`fame`}"    class="${H===`fame`?`on`:``}">Hall of Fame</button>
      <button data-tab="moments" role="tab" aria-selected="${H===`moments`}" class="${H===`moments`?`on`:``}">Moments</button>
      <button data-tab="seasons" role="tab" aria-selected="${H===`seasons`}" class="${H===`seasons`?`on`:``}">Yearbook</button>
      <button data-tab="alltime" role="tab" aria-selected="${H===`alltime`}" class="${H===`alltime`?`on`:``}">All-time</button>
      <button data-tab="records" role="tab" aria-selected="${H===`records`}" class="${H===`records`?`on`:``}">Records</button>
    </div>
    <div id="hist-body"></div>
  `;let f=t.querySelector(`#hist-body`),p=r.get(`moment`)&&O(d).find(e=>te(e)===r.get(`moment`)),h=()=>{if(G?.stop(),G=null,H===`weeks`){G=se(f,{lore:d,params:new URLSearchParams(r),active:()=>n===W&&t.isConnected});return}if(H===`moments`&&r.has(`moment`)&&!p){f.innerHTML=`<section class="state" role="status" data-route-focus tabindex="-1">This archive entry has changed. <a class="linkbtn" href="#/history?tab=moments">Latest moments →</a></section>`;return}if(H===`moments`&&p){f.innerHTML=`<section class="card" data-route-focus tabindex="-1">${Y(p)}<a class="linkbtn" href="#/history?tab=moments">All moments →</a></section>`;return}if(H===`records`)return ze(f,d);f.innerHTML=H===`fame`?Te(d):H===`moments`?je(d):H===`seasons`?Me(d):Le(d)};if(t.querySelector(`#hist-tabs`).addEventListener(`click`,e=>{let n=e.target.closest(`button[data-tab]`);n&&(H=n.dataset.tab,v(`history-tab`,H),t.querySelectorAll(`#hist-tabs button`).forEach(e=>{let t=e.dataset.tab===H;e.classList.toggle(`on`,t),e.setAttribute(`aria-selected`,String(t))}),J(n),h())}),f.addEventListener(`click`,e=>{let n=e.target.closest(`button[data-season]`);n&&(U=Number(n.dataset.season),v(`history-season`,String(U)),h(),J(t.querySelector(`#year-picker button[data-season="${U}"]`)),t.querySelector(`#hist-tabs`)?.scrollIntoView({block:`start`}))}),i(f,()=>{w(),K(t)}),ve(f,d.members||[],async({field:e,key:n,memberId:r})=>{await xe({season:Number(n),field:e,memberId:r}),w(),K(t)}),h(),G&&await G.ready,!(n!==W||!t.isConnected)){if(r.get(`owner`)?j([...t.querySelectorAll(`[data-history-owner]`)].find(e=>e.dataset.historyOwner===r.get(`owner`))):r.has(`season`)&&j(t.querySelector(`.yb-champ`)),l){let e=t.querySelector(`[data-history-entry="${l}"]`);e&&(e.setAttribute(`data-route-focus`,``),e.tabIndex=-1)}J(t.querySelector(`#hist-tabs button[data-tab="${H}"]`)),H===`seasons`&&J(t.querySelector(`#year-picker button[data-season="${U}"]`))}}function q(e){let t=`${r(e.label)}${e.sub&&e.sub!==e.label?`<div class="muted tiny">${r(e.sub)}</div>`:``}`;return e.memberId?`<a href="#/profile?id=${e.memberId}" class="plainlink">${t}</a>`:t}function Te(e){let t=E(e),i=t=>d({team_name:t.label,identity:(e.members||[]).find(e=>String(e.id)===String(t.memberId))||{}}),o=e.leagues.filter(e=>e.champion_user_id||e.champion_roster_id).sort((e,t)=>t.season-e.season),s=[...y(n(`history`,e.manual),`year`).entries()].sort((e,t)=>t[0]-e[0]);return`
    ${o.length?`
      <section class="archive-cabinet" aria-label="League champions">
        <header class="archive-cabinet-head"><h2>Champions</h2><span>${o.length} seasons</span></header>
        <ol class="archive-seasons">
          ${o.map((e,n)=>{let o=t(e.champion_user_id,e.season,e.champion_roster_id),s=e.runner_up_user_id||e.runner_up_roster_id?t(e.runner_up_user_id,e.season,e.runner_up_roster_id):null;return`<li class="archive-season${n===0?` is-featured`:``}">
              <header class="archive-season-head"><span><strong>${r(e.season)}</strong></span><span class="archive-title-label">${Ce(`Champion`)} Champion</span></header>
              <div class="archive-winner">${i(o)}<div>${a()?_e({text:o.label,field:`champion`,key:e.season,canEdit:!0}):q(o)}${e.champion_locked?`<small class="archive-lock">Set by hand</small>`:``}</div></div>
              ${s?`<div class="archive-runner"><small>Runner-up</small><div>${i(s)}${q(s)}</div></div>`:`<div class="archive-runner"><small>Runner-up</small><span>Not recorded</span></div>`}
            </li>`}).join(``)}
        </ol>
        <p class="archive-source">Sleeper playoff results · manually corrected seasons are marked. 2017–18 were played on another app; 2019’s winner was later removed from the league.</p>
      </section>`:``}

    ${s.length?s.map(([e,t])=>`
          <div class="section-head">
            <h2>${r(e)}</h2>
            ${g(`history`,`Add entry`,{year:e})}
          </div>
          <div class="card schedule">${De(t).map(Oe).join(``)}</div>`).join(``):`<div class="card"><div class="card-body muted">${o.length?`No additional stories yet.`:`No league history yet.`}</div>
           ${a()?`<div class="row-end">${g(`history`,`Add entry`)}</div>`:``}
         </div>`}
  `}var Ee=[`Champion`,`Runner Up`,`Award`,`Record`,`Moment`];function De(e){let t=e=>{let t=Ee.indexOf(e);return t===-1?99:t};return[...e].sort((e,n)=>t(e.category)-t(n.category))}function Oe(e){return`
    <div class="evrow ${l(`history`,e)}" data-history-entry="${r(e.id)}">
      <div class="evicon" aria-hidden="true">${Ce(e.category)}</div>
      <div class="evbody">
        <div class="evtop">
          <span class="evtitle">${r(e.winner||e.category)}</span>
          <span class="pill">${r(e.category)}</span>
        </div>
        ${e.notes?`<div class="evnote">${r(e.notes)}</div>`:``}
        ${o(`history`,e,{compact:!0})}
      </div>
    </div>`}var ke={championship:`i-trophy`,title:`i-trophy`,commissioner:`i-moment`,golf:`i-golf`,arena:`i-arena`,streak:`i-record`,heartbreak:`i-medal`,blowout:`i-record`,nailbiter:`i-record`,high:`i-record`,low:`i-record`,rivalry:`i-versus`},Ae={championship:`Champion`,title:`The final`,commissioner:`From the commissioner`,golf:`Golf`,arena:`Arena`,streak:`Streak`,heartbreak:`Hard luck`,blowout:`Blowout`,nailbiter:`Nail-biter`,high:`Highest week`,low:`Lowest week`,rivalry:`Rivalry`};function je(e){let t=O(e);if(!t.length)return`<div class="state">
      <span class="state-title">Nothing to remember yet</span>
      <span>Sync Sleeper from the Admin page, or write the first one down.</span>
    </div>${a()?`<div class="row-end">${g(`history`,`Add a moment`)}</div>`:``}`;let n=y(t,e=>e.season??`—`),i=[...n.keys()].sort((e,t)=>(Number(t)||0)-(Number(e)||0));return`
    <p class="page-sub" style="margin-bottom:14px">
      ${t.length} moments · read off every game on record
      <span class="muted">· nothing here is invented</span>
    </p>
    ${i.map((e,t)=>{let i=n.get(e);return`
      <div class="card momentlist" data-collapse="hist-moments-${r(e)}"
           data-collapse-title="${r(e)}"
           data-collapse-badge="${i.length} moment${i.length===1?``:`s`}"
           ${t===0?``:`data-collapse-default="folded"`}>
        ${i.map(Y).join(``)}
      </div>`}).join(``)}
    ${a()?`<div class="row-end">${g(`history`,`Add a moment`)}</div>`:``}
  `}function J(e){if(e)try{e.scrollIntoView({inline:`nearest`,block:`nearest`})}catch{}}function Y(e){let t=e.kind===`commissioner`&&e.category?e.category:Ae[e.kind]||`Moment`,n=`
    <svg class="ico-sm moment-ico" aria-hidden="true"><use href="#${ke[e.kind]||`i-moment`}"></use></svg>
    <span class="moment-body">
      <span class="moment-kind">${r(t)}</span>
      <strong class="moment-head">${r(e.headline)}</strong>
      ${e.detail?`<span class="moment-detail">${r(e.detail)}</span>`:``}
    </span>`;return e.href?`<a class="moment is-${r(e.kind)}" href="${r(e.href)}">${n}</a>`:`<div class="moment is-${r(e.kind)}">${n}</div>`}function Me(e){let t=[...new Set(e.standings.map(e=>e.season))].sort((e,t)=>t-e);if(!t.length)return s(`No season standings yet. Sync Sleeper from the Admin page.`);U=Number(m(`history-season`,t.map(String),String(U||``)))||U,t.includes(U)||(U=t.find(t=>e.standings.some(e=>e.season===t&&e.wins+e.losses+e.ties>0))??t[0]);let n=P(e,U),i=`<div class="tabs tabscroll" id="year-picker" role="tablist"
                       aria-label="Season">${t.map(e=>`<button data-season="${e}" role="tab" aria-selected="${e===U}"
             class="${e===U?`on`:``}">${e}</button>`).join(``)}</div>`;return n.played?`
    ${i}
    ${Ne(n)}
    ${Pe(n)}
    ${Fe(n)}
    ${Ie(n,!0)}
  `:`${i}
      <div class="state">
        <span class="state-title">${r(U)} has not been played</span>
        <span>The teams are set. The yearbook writes itself once the games start.</span>
      </div>
      ${Ie(n,!1)}`}function Ne(e){return e.champion?`
    <section class="yb-champ">
      <span class="yb-kicker">
        <svg class="ico-sm" aria-hidden="true"><use href="#i-trophy"></use></svg>
        ${r(e.season)} champion
      </span>
      <strong class="yb-name">${r(e.champion.label)}</strong>
      ${e.champion.sub&&e.champion.sub!==e.champion.label?`<span class="yb-sub">${r(e.champion.sub)}</span>`:``}
      ${e.runnerUp?`<span class="yb-runner">Runner-up · ${r(e.runnerUp.label)}</span>`:``}
    </section>`:`<div class="card"><div class="card-title">${r(e.season)}</div>
      <div class="card-body muted">No champion recorded for this season.</div></div>`}function Pe(e){if(!e.title)return``;let t=e.title;return`
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
    </div>`}function Fe(e){let t=e.moments.filter(e=>e.kind!==`championship`&&e.kind!==`title`);return t.length?`
    <h2 class="section-title">${r(e.season)} in moments</h2>
    <div class="card momentlist">${t.map(Y).join(``)}</div>`:``}function Ie(e,t){return`
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
                <td>${q(e.name(n.sleeper_user_id,e.season,n.roster_id))}</td>
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
    </div>`}function Le(e){if(!e.standings.length)return s(`No career records yet. Sync Sleeper from the Admin page.`);let t=E(e),n=We(e.leagues,`champion_user_id`),r=[...y(e.standings,`sleeper_user_id`).entries()].filter(([e])=>e!=null).filter(([t])=>e.users.some(e=>e.sleeper_user_id===t)).map(([e,r])=>{let i=$(r,`wins`),a=$(r,`losses`),o=$(r,`ties`),s=i+a+o,c=r.filter(e=>e.rank!=null);return{who:t(e),wins:i,losses:a,ties:o,winPct:s?(i+o/2)/s:0,pointsFor:$(r,`points_for`),avgFinish:c.length?c.reduce((e,t)=>e+t.rank,0)/c.length:null,playoffs:r.filter(e=>e.made_playoffs).length,titles:n.get(e)||0,seasons:r.length}}).sort((e,t)=>t.winPct-e.winPct||t.titles-e.titles||t.pointsFor-e.pointsFor),i=new Set(e.standings.map(e=>e.season)).size;return`
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
                <td>${q(e.who)}</td>
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
    </div>`}var X=null;async function Re(){if(X)return X;let{data:e,error:t}=await f().from(`sleeper_transactions`).select(`season, week, type, status, details`).eq(`type`,`trade`).eq(`status`,`complete`);return X={trades:e||[],error:t||null},X}async function ze(t,n){t.innerHTML=e(`Reading every week ever played…`);let i=await Re(),a=E(n),o=M(n.matchups);if(!o.length){t.innerHTML=s(`No weekly scores synced yet. Run a Sleeper sync from the Admin page.`);return}let c=o.filter(e=>e.score>0),l=n.matchups.filter(k),u=b(o),d=Be(n.standings),f=T(u.map(e=>e.win).filter(Boolean),e=>e.run),m=T(u.map(e=>e.loss).filter(Boolean),e=>e.run),g=T(c,e=>e.score),_=T(c,e=>-e.score),v=T(l,e=>x(e)),y=T(l.filter(e=>x(e)>0),e=>-x(e)),S=T(l,e=>Number(e.score1)+Number(e.score2)),w=T(c.filter(e=>!e.won&&!e.tie),e=>e.score),D=e=>a(e.user,e.season,e.roster),O=(e,t)=>{let n=t(e);return a(n.user,e.season,n.roster).label};t.innerHTML=`
    
    <p class="page-sub" style="margin-bottom:14px">
      ${l.length} games · ${r(h)} onward
      <span class="muted">· ${r(h-p)} earlier seasons predate the records</span>
    </p>

    <section class="card recbook records-fold" data-collapse="hist-records-week"
             data-collapse-title="Single week" data-collapse-badge="6 records"
             data-collapse-default="folded">
      ${Z(`Highest score`,g&&g.score.toFixed(2),g&&D(g).label,g&&`${g.season} · Week ${g.week}`)}
      ${Z(`Lowest score`,_&&_.score.toFixed(2),_&&D(_).label,_&&`${_.season} · Week ${_.week}`)}
      ${Z(`Biggest blowout`,v&&x(v).toFixed(2)+` pts`,v&&O(v,I),v&&`beat ${O(v,F)} · ${v.season} Wk ${v.week}`)}
      ${Z(`Closest finish`,y&&x(y).toFixed(2)+` pts`,y&&O(y,I),y&&`over ${O(y,F)} · ${y.season} Wk ${y.week}`)}
      ${Z(`Highest combined`,S&&(Number(S.score1)+Number(S.score2)).toFixed(2),S&&`${O(S,I)} v ${O(S,F)}`,S&&`${S.season} · Week ${S.week}`)}
      ${Z(`Best losing score`,w&&w.score.toFixed(2),w&&D(w).label,w&&`lost ${w.against.toFixed(2)} · ${w.season} Wk ${w.week}`)}
    </section>

    <section class="card recbook records-fold" data-collapse="hist-records-seasons"
             data-collapse-title="Seasons &amp; streaks" data-collapse-badge="4 records"
             data-collapse-default="folded">
      ${Z(`Most points, season`,d.points&&d.points.points_for.toFixed(2),d.points&&a(d.points.sleeper_user_id,d.points.season,d.points.roster_id).label,d.points&&String(d.points.season))}
      ${Z(`Best record, season`,d.record&&`${d.record.wins}-${d.record.losses}${d.record.ties?`-`+d.record.ties:``}`,d.record&&a(d.record.sleeper_user_id,d.record.season,d.record.roster_id).label,d.record&&String(d.record.season))}
      ${Z(`Longest win streak`,f&&f.run+` weeks`,f&&a(f.user).label,f&&C(f.from,f.to))}
      ${Z(`Longest losing streak`,m&&m.run+` weeks`,m&&a(m.user).label,m&&C(m.from,m.to))}
    </section>

    ${i.error?``:Ve(i.trades,n)}
  `;let A=t.querySelector(`[data-fleece-board]`);A&&He(i.trades,n).then(e=>{A.isConnected&&(A.innerHTML=e.error?`<p class="muted tiny">Historical trade outcomes could not be loaded.</p>`:Ue(e.rankings,n,e.players))})}function Z(e,t,n,i){return t?`
    <div class="rec">
      <span class="rec-label">${r(e)}</span>
      <span class="rec-who">
        ${r(n||`—`)}
        ${i?`<span class="rec-when">${r(i)}</span>`:``}
      </span>
      <span class="rec-val">${r(t)}</span>
    </div>`:``}function Be(e){let t=(e||[]).filter(e=>e.wins+e.losses+e.ties>0);return{points:T(t,e=>Number(e.points_for)||0),record:T(t,e=>{let t=e.wins+e.losses+e.ties;return t?(e.wins+e.ties/2)/t+t/1e3:0})}}function Ve(t,n){let i=t.filter(e=>e.status===`complete`&&e.details?.status===`complete`);if(!i.length)return``;let a=new Map;for(let e of i)for(let t of e.details?.roster_ids||[]){let n=`${e.season}:${t}`;a.set(n,(a.get(n)||0)+1)}let o=new Map(n.standings.map(e=>[`${e.season}:${e.roster_id}`,e.sleeper_user_id])),s=new Map;for(let[e,t]of a){let n=o.get(e);n&&s.set(n,(s.get(n)||0)+t)}let c=E(n),l=[...s.entries()].map(([e,t])=>({who:c(e),n:t})).sort((e,t)=>t.n-e.n).slice(0,5);return l.length?`<section class="card records-fold records-trades" data-collapse="hist-records-trades"
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
  </section>`:``}var Q=null;async function He(e,n){return Q||(Q=(async()=>{try{let r=new Date().getFullYear()-1,i=n.leagues.filter(e=>e.scoring_settings&&(e.status===`complete`||Number(e.season)<=r)).map(e=>Number(e.season)).filter(Number.isFinite),a=Math.max(0,...i),o=new Map(n.leagues.map(e=>[Number(e.season),e.scoring_settings])),s=[...new Set(e.flatMap(e=>{let t=[];for(let n=Number(e.season);n<=Math.min(Number(e.season)+2,a);n++)o.get(n)&&t.push(n);return t}))].sort(),[l,...u]=await Promise.all([t(),...s.map(c)]);return{players:l,rankings:ge({trades:e,latestSeason:a,statsBySeason:new Map(s.map((e,t)=>[e,u[t]?.data||{}])),scoringBySeason:o,players:l}),error:null}}catch(e){return{players:{},rankings:[],error:e}}})(),Q)}function Ue(e,t,n){if(!e.length)return`<p class="muted tiny">No completed trade has enough post-trade history to grade yet.</p>`;let i=E(t),a=new Map(t.standings.map(e=>[`${e.season}:${e.roster_id}`,e.sleeper_user_id])),o=(e,t)=>i(a.get(`${e.season}:${t.rosterId}`),e.season,t.rosterId).label,s=e=>e.playerIds.map(e=>`<b class="fleece-player">${r(n[e]?.n||`Player ${e}`)}</b>`).join(``),c=(e,t)=>`<article class="fleece-card">
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
    <p class="fleece-method"><strong>Starter-impact gap</strong> measures each acquired player’s DFL points above a position-specific replacement starter in the completed trade season and up to two seasons after it. Those seasons count 50/30/20, while extra package pieces receive diminishing weight (100/50/25/10) so several bench players cannot outweigh one elite starter by volume alone. The active season and pending trades are never graded, and only transactions marked complete count.</p>`}function $(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}function We(e,t){let n=new Map;for(let r of e){let e=r[t];e&&n.set(e,(n.get(e)||0)+1)}return n}export{we as leave,K as render};