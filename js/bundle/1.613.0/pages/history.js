import{A as e,An as t,D as n,E as r,F as i,Hr as a,I as o,Ir as s,Kt as c,L as l,Lr as u,N as d,P as f,R as p,Rr as m,Tr as h,Ur as g,Wn as _,br as v,dn as y,jn as b,k as x,xn as S,yn as C,yr as w}from"../app-core-DJ1rYCZP.js";import{$t as T,Ht as E,Jt as D,Qt as O,Wt as k,Xt as A,Yt as j,Zt as M,an as ee,br as te,en as N,ia as P,nn as F,on as ne,pn as re,qt as ie,rn as I,tn as ae,xr as L}from"../home-core-BZBvVLYy.js";var R=e=>e!=null&&String(e).trim()!==``&&Number.isFinite(Number(e))?Number(e):null,z=e=>Number.isInteger(Number(e))&&Number(e)>0,B=e=>Math.round(e*100);function oe(e=[]){let t=new Set;return e.filter(e=>e.completed===!0&&z(e.season)&&Number(e.season)>=2010&&Number(e.season)<=2100&&z(e.week)&&Number(e.week)<=18).map(e=>({season:Number(e.season),week:Number(e.week)})).filter(e=>{let n=`${e.season}:${e.week}`;return!t.has(n)&&(t.add(n),!0)}).sort((e,t)=>t.season-e.season||t.week-e.week)}function se(e,t,n,r){let i=new Map;if(e.archiveComplete!==!0)return i;let a=new Set(oe(t).filter(e=>e.season===n&&e.week<r).map(e=>e.week)),o=new Set;if([...a].some(t=>!(e.matchups||[]).some(e=>Number(e.season)===n&&Number(e.week)===t)))return i;for(let t of e.matchups||[]){if(Number(t.season)!==n||!a.has(Number(t.week))||!z(t.roster1)||!z(t.roster2)||Number(t.roster1)===Number(t.roster2))continue;let e=`${t.week}:${[Number(t.roster1),Number(t.roster2)].sort((e,t)=>e-t).join(`:`)}`;if(o.has(e))continue;o.add(e);let r=R(t.score1),s=R(t.score2);for(let[e,n,a]of[[t.roster1,r,s],[t.roster2,s,r]]){let t=i.get(String(e))||{wins:0,losses:0,ties:0,known:!0};n===null||a===null?t.known=!1:B(n)===B(a)?t.ties++:n>a?t.wins++:t.losses++,i.set(String(e),t)}}return i}function ce(e,{name:t=(e,t,n)=>({label:`Roster ${n}`,memberId:null}),records:n=new Map}={}){let r=[],i=new Set,a=!1;for(let o of e.games||[]){if(!z(o.matchup_id)||i.has(String(o.matchup_id))){a=!0;continue}i.add(String(o.matchup_id));let s=(r,i,a)=>({...t(r,Number(e.season),i),roster:i,score:R(a),record:n.get(String(i))||null}),c=s(o.user1,o.roster1,o.score1),l=s(o.user2,o.roster2,o.score2),u=c.score!==null&&l.score!==null&&z(o.roster1)&&z(o.roster2)&&Number(o.roster1)!==Number(o.roster2),d=u?B(c.score)-B(l.score):null,f=u&&d!==0?d>0?c:l:null,p=f?f===c?l:c:null,m=o.winner_roster_id!=null&&(!f||Number(o.winner_roster_id)!==Number(f.roster));r.push({...o,left:c,right:l,scored:u&&!m,tied:u&&!m&&d===0,winner:m?null:f,loser:m?null:p,margin:u&&!m?Math.abs(d)/100:null,total:u&&!m?(B(c.score)+B(l.score))/100:null})}let o=e.completed===!0&&r.length>0&&!a&&r.every(e=>e.scored),s=o?r.map(e=>e.margin):[],c=Math.min(...s),l=Math.max(...s),u=o?r.filter(e=>e.margin===c):[],d=o&&l>0?r.filter(e=>e.margin===l):[],f=o?re({...e,games:r.map(e=>({...e,left:{...e.left,name:e.left.label},right:{...e.right,name:e.right.label}}))})[0]:null,p=r.find(e=>e.winner),m=f?.text||(o?p?`${p.winner.label} beat ${p.loser.label} by ${p.margin.toFixed(2)}. Talk your shit. The scoreboard backs it up.`:`Nobody won. Nobody lost. Everybody gets to argue about this shit.`:null);return{season:Number(e.season),week:Number(e.week),games:r,complete:o,close:u,blowout:d,roast:m}}var V=e=>e===null?`—`:e.toFixed(2),le=e=>e?.known?`${e.wins}–${e.losses}${e.ties?`–${e.ties}`:``}`:`—`;function ue(e,t,n){let r=t=>`<span class="archive-match-team${e.winner===t?` is-winner`:``}">${h({identity:n.find(e=>String(e.id)===String(t.memberId))||{},team_name:t.label})}<span class="archive-match-name">${m(t.label)}</span><b>${V(t.score)}</b></span>`,i=[t.close.includes(e)?e.tied?`Tied finish`:`Closest finish`:``,t.blowout.includes(e)?`Biggest beatdown`:``].filter(Boolean);return`<details class="archive-match" id="archive-match-${e.matchup_id}" data-archive-match="${e.matchup_id}"><summary><span class="archive-match-score">${r(e.left)}${r(e.right)}</span><span class="archive-match-tail"><small>${e.scored?e.tied?`Tie`:i.join(` · `)||`Final`:`Score incomplete`}</small><svg class="ico-sm" aria-hidden="true"><use href="#i-chev-right"></use></svg></span></summary><div class="archive-match-detail"><dl><div><dt>${e.tied?`Result`:`Winning margin`}</dt><dd>${e.tied?`Tie`:V(e.margin)}</dd></div><div><dt>Combined score</dt><dd>${V(e.total)}</dd></div></dl><div class="archive-entering"><span>Entering Week ${t.week}</span>${[e.left,e.right].map(e=>`<div><span>${e.memberId?`<a href="#/profile?id=${m(e.memberId)}">${m(e.label)}</a>`:m(e.label)}</span><b>${le(e.record)}</b></div>`).join(``)}</div><a class="linkbtn archive-match-open" href="#/clubhouse?season=${t.season}&amp;week=${t.week}&amp;tab=matchups&amp;matchup=${e.matchup_id}">Open matchup <span aria-hidden="true">→</span></a></div></details>`}function de(t,{lore:r,params:i=new URLSearchParams,loadIndex:a=ee,loadWeek:o=ne,active:s=()=>t.isConnected}={}){let l=t.closest?.(`#view`),u=l?.dataset.routeVisitId?x(l,`archive-week`):null,d=c(),f=u?n(d,u):null,p=!1,h=0,g=[],_=[],v=0,b=0,w=null,T=!1,E=!0,D=()=>!p&&t.isConnected&&s();t.innerHTML=`<section class="archive-week-desk" data-no-swipe aria-label="Weekly archive"><div data-archive-tools></div><div data-archive-content role="region" aria-label="Archived matchups" aria-busy="true"><p class="archive-week-state" role="status">Loading completed weeks…</p></div></section>`;let O=t.querySelector(`[data-archive-tools]`),k=t.querySelector(`[data-archive-content]`),A=()=>{if(!D()||T)return;let e=O.querySelector(`.archive-week-strip`),t=e?.querySelector(`[aria-pressed="true"]`);if(!t||!e.clientWidth)return;let n=e.getBoundingClientRect(),r=t.getBoundingClientRect(),i=r.left<n.left+22?r.left-n.left-22:r.right>n.right-22?r.right-n.right+22:0;i&&(e.scrollLeft+=i)},j=new ResizeObserver(A),te=e=>{e.target.closest(`.archive-week-strip`)&&(T=!0)};for(let e of[`pointerdown`,`wheel`,`keydown`])O.addEventListener(e,te,{passive:!0});let N=()=>y(t,{selector:`.archive-match`,active:D,getMotion:()=>C(`gameday-motion`,[`on`,`off`],`on`)===`on`}),P=N(),F=()=>`<div class="archive-season-tools"><label for="archive-season">Season<select id="archive-season">${[...new Set(_.map(e=>e.season))].map(e=>`<option value="${e}"${e===v?` selected`:``}>${e}</option>`).join(``)}</select></label><a class="linkbtn" href="#/clubhouse?season=${v}&amp;week=${b}&amp;tab=recap">Full recap →</a></div><div class="archive-week-strip tabs tabscroll" id="archive-week-picker" role="group" aria-label="Archived week">${_.filter(e=>e.season===v).sort((e,t)=>e.week-t.week).map(e=>`<button type="button" data-archive-week="${e.week}" aria-pressed="${e.week===b}" class="${e.week===b?`on`:``}">Wk ${e.week}</button>`).join(``)}</div>`,re=(e,t)=>t.length?`<button type="button" data-archive-highlight="${t[0].matchup_id}"><small>${e}${t.length>1?` · ${t.length} tied`:``}</small><strong>${V(t[0].margin)}<span> pts</span></strong><span>${t.length>1?`${t.length} matchups`:m(t[0].tied?`${t[0].left.label} & ${t[0].right.label}`:t[0].winner.label)}</span></button>`:``,ie=async()=>{let e=++h;w=null,P.stop(),P=N(),k.setAttribute(`aria-busy`,`true`),k.innerHTML=`<p class="archive-week-state" role="status">Loading ${v} · Week ${b}…</p>`;try{let t=await o(v,b);if(!D()||e!==h)return;if(Number(t.season)!==v||Number(t.week)!==b||t.completed!==!0)throw Error(`Week is not complete`);let n=se(r,g,v,b);if(b===1&&r.archiveComplete===!0)for(let e of t.games)for(let t of[e.roster1,e.roster2])n.set(String(t),{wins:0,losses:0,ties:0,known:!0});w=ce(t,{name:M(r),records:n}),k.innerHTML=`<header class="archive-week-heading"><div><h2>Week ${b}</h2></div><span>${w.games.length} matchup${w.games.length===1?``:`s`}</span></header>${w.complete?`<div class="archive-week-highlights">${re(w.close[0]?.tied?`Dead heat`:`Closest finish`,w.close)}${re(`Biggest beatdown`,w.blowout)}</div><p class="archive-week-roast">${m(w.roast)}</p>`:`<p class="archive-week-state" role="status">Some scores are missing. Weekly highlights are unavailable.</p>`}<div class="archive-week-matchups">${w.games.map(e=>ue(e,w,r.members||[])).join(``)||`<p class="archive-week-state">No matchups recorded for this week.</p>`}</div>`;let a=i.get(`matchup`);if(a){i.delete(`matchup`);let e=k.querySelector(`[data-archive-match="${CSS.escape(a)}"]`);e&&(P.stop(),P=N(),e.open=!0,e.querySelector(`summary`).focus({preventScroll:!0}),e.scrollIntoView({block:`nearest`,behavior:`instant`}))}}catch{D()&&e===h&&(k.innerHTML=`<p class="archive-week-state" role="status">This week couldn’t load. <button type="button" class="linkbtn" data-archive-retry>Try again</button></p>`)}finally{D()&&e===h&&k.setAttribute(`aria-busy`,`false`)}},I=(n,r,{focus:i=!1}={})=>{let a=v!==n;if(v=n,b=r,T=E&&!!t.closest(`[data-route-returning="true"]`),E=!1,u&&e(d,u,{season:n,week:r}),S(`history-season`,String(n)),S(`archive-week-${n}`,String(r)),a||!O.firstElementChild)O.innerHTML=F(),j.disconnect(),j.observe(O.querySelector(`.archive-week-strip`));else{for(let e of O.querySelectorAll(`[data-archive-week]`)){let t=Number(e.dataset.archiveWeek)===r;e.setAttribute(`aria-pressed`,String(t)),e.classList.toggle(`on`,t)}O.querySelector(`a`).href=`#/clubhouse?season=${n}&week=${r}&tab=recap`}let o=O.querySelector(`[data-archive-week="${r}"]`);return A(),i&&o?.focus({preventScroll:!0}),ie()},ae=async()=>{let e=++h;try{if(g=await a(),!D()||e!==h)return;if(_=oe(g),!_.length){k.innerHTML=`<p class="archive-week-state" role="status">No finished weeks are available yet.</p>`,k.setAttribute(`aria-busy`,`false`);return}let t=[...new Set(_.map(e=>e.season))],n=Number(i.get(`season`)),r=u?t.includes(f?.season)?f.season:t[0]:Number(C(`history-season`,t.map(String),String(t[0]))),o=t.includes(n)?n:r,s=_.filter(e=>e.season===o).map(e=>e.week),c=Number(i.get(`week`)),l=u?f?.season===o&&s.includes(f.week)?f.week:s[0]:Number(C(`archive-week-${o}`,s.map(String),String(s[0])));if(i.has(`season`)&&!t.includes(n)||i.has(`week`)&&!s.includes(c)){k.innerHTML=`<p class="archive-week-state" role="status">That finished week is unavailable. <a class="linkbtn" href="#/history?tab=weeks">Latest completed weeks →</a></p>`,k.setAttribute(`aria-busy`,`false`);return}await I(o,s.includes(c)?c:l)}catch{D()&&e===h&&(k.innerHTML=`<p class="archive-week-state" role="status">The weekly archive couldn’t load. <button type="button" class="linkbtn" data-archive-index-retry>Try again</button></p>`,k.setAttribute(`aria-busy`,`false`))}},L=e=>{let t=e.target.closest(`button`);if(!(!t||!D())){if(t.hasAttribute(`data-archive-week`)){let e=Number(t.dataset.archiveWeek);e!==b&&I(v,e,{focus:!0})}if(t.hasAttribute(`data-archive-retry`)&&ie(),t.hasAttribute(`data-archive-index-retry`)&&ae(),t.hasAttribute(`data-archive-highlight`)){let e=k.querySelector(`[data-archive-match="${t.dataset.archiveHighlight}"]`);e&&(P.stop(),P=N(),e.open=!0,e.querySelector(`summary`).focus({preventScroll:!0}),e.scrollIntoView({block:`nearest`,behavior:`instant`}))}}},R=e=>{if(e.target.id===`archive-season`){let t=Number(e.target.value),n=_.filter(e=>e.season===t).map(e=>e.week),r=n.includes(b)?b:n[0];I(t,r),O.querySelector(`select`).focus({preventScroll:!0})}};return t.addEventListener(`click`,L),t.addEventListener(`change`,R),{ready:ae(),stop(){p=!0,h++,j.disconnect();for(let e of[`pointerdown`,`wheel`,`keydown`])O.removeEventListener(e,te);P.stop(),t.removeEventListener(`click`,L),t.removeEventListener(`change`,R)}}}var H={QB:12,RB:24,WR:30,TE:12},fe=[.5,.3,.2],pe=[1,.5,.25],me=new Set([`907844411101487104`,`907840843644805120`]);function he(e=[]){return e.filter(e=>e?.type===`trade`&&e?.status===`complete`&&e?.details?.status===`complete`)}function ge(e){let t=new Map;for(let n of e?.details?.roster_ids||[])t.set(String(n),[]);for(let[n,r]of Object.entries(e?.details?.adds||{})){let e=String(r);t.has(e)||t.set(e,[]),t.get(e).push(String(n))}return[...t.entries()].map(([e,t])=>({rosterId:e,playerIds:t}))}function _e(e,t){return String(e?.[t]?.p||e?.[t]?.position||``).toUpperCase()}function ve(e,t,n,r){let i=new Map(Object.keys(H).map(e=>[e,[]]));for(let[a,o]of Object.entries(t.get(e)||{})){let t=_e(r,a);if(!i.has(t))continue;let s=P(o,n.get(e));s!=null&&i.get(t).push(s)}return new Map([...i].map(([e,t])=>(t.sort((e,t)=>t-e),[e,t[H[e]-1]??t.at(-1)??0])))}function ye(e,t,n,r,i,a,o){let s=[];for(let e=Number(t);e<=Math.min(Number(t)+2,n);e++)r.has(e)&&i.has(e)&&s.push(e);if(!s.length)return null;let c=s.reduce((e,t,n)=>e+fe[n],0),l=[];for(let t of e){let e=_e(a,t);if(!H[e]){l.push(0);continue}let n=s.reduce((n,a,s)=>{let c=P(r.get(a)?.[t],i.get(a))||0,l=o.get(a)?.get(e)||0;return n+Math.max(0,c-l)*fe[s]},0)/c;l.push(n)}l.sort((e,t)=>t-e);let u=l.reduce((e,t,n)=>e+t*(pe[n]??.1),0);return Math.round(u*10)/10}function be({trades:e=[],latestSeason:t=0,statsBySeason:n=new Map,scoringBySeason:r=new Map,players:i={}}={}){let a=new Map([...n.keys()].map(e=>[e,ve(e,n,r,i)]));return he(e).filter(e=>!me.has(String(e?.details?.transaction_id||``))).map(e=>{let o=ge(e).map(o=>({...o,outcome:ye(o.playerIds,e.season,t,n,r,i,a)}));return o.length<2||o.some(e=>e.outcome==null||!e.playerIds.length)?null:(o.sort((e,t)=>t.outcome-e.outcome),{trade:e,winner:o[0],loser:o.at(-1),gap:Math.round((o[0].outcome-o.at(-1).outcome)*10)/10})}).filter(e=>e&&e.gap>0).sort((e,t)=>t.gap-e.gap)}function xe({text:e,field:t,key:n,canEdit:r=!1}={}){let i=e||`—`;return r?`<button type="button" class="name-pick" data-ui-name data-name-pick="${m(t)}"
    data-name-key="${m(n)}" title="Change ${m(i)}">${m(i)}</button>`:`<span data-ui-name title="${m(i)}">${m(i)}</span>`}function Se(e,t,n){e&&e.addEventListener(`click`,e=>{let r=e.target.closest(`[data-name-pick]`);if(!r||r.dataset.open===`1`)return;let i=r.dataset.namePick,a=r.dataset.nameKey,o=r.textContent.trim(),s=document.createElement(`select`);s.className=`name-pick-select`,s.innerHTML=`<option value="">— nobody —</option>`+(t||[]).map(e=>`<option value="${m(e.id)}"${e.display_name===o?` selected`:``}>${m(e.display_name)}</option>`).join(``),r.dataset.open=`1`,r.replaceWith(s),s.focus();let c=()=>{s.isConnected&&(r.dataset.open=``,s.replaceWith(r))},l=!1;s.addEventListener(`change`,async()=>{if(!l){l=!0,s.disabled=!0;try{await n({field:i,key:a,memberId:s.value?Number(s.value):null})}catch(e){l=!1,s.disabled=!1,e?.message&&(s.title=e.message)}}}),s.addEventListener(`blur`,()=>{l||c()})})}var Ce=/set_season_result|champion_locked|schema cache|does not exist/i,we=e=>Ce.test(e?.message||``);async function Te({season:e,field:t,memberId:n=null}){let r=t===`champion`,{data:i,error:a}=await _().rpc(`set_season_result`,{target_season:Number(e),champion_member_id:r?n:null,last_place_member_id:r?null:n,set_champion:r,set_last_place:!r});if(a)throw Error(we(a)?`Run season_result_override_schema.sql in Supabase first`:a.message||`That could not be saved`);return Array.isArray(i)?i[0]:i}var Ee={Champion:`i-trophy`,"Runner Up":`i-medal`,Award:`i-award`,Record:`i-record`,Moment:`i-moment`};function De(e){return`<svg class="ico-sm" aria-hidden="true"><use href="#${Ee[e]||`i-award`}"></use></svg>`}var U=`fame`,W=null,G=0,K=null,q=()=>{};function Oe(){q(),window.removeEventListener(`pagehide`,q),q=()=>{},G++,K?.stop(),K=null}async function J(t){K?.stop(),K=null;let i=++G,a=r(t,`history`),o=x(t,`history`),l=c(),m=a===`restore`?n(l,o):null;a===`fresh`?(U=`weeks`,W=null):m&&(U=m.tab||`weeks`,W=m.season),window.removeEventListener(`pagehide`,q),q=()=>{t.isConnected&&e(l,o,{tab:U,season:W})},window.addEventListener(`pagehide`,q);let h=new URLSearchParams(location.hash.split(`?`)[1]||``),_=h.get(`tab`);[`weeks`,`fame`,`moments`,`seasons`,`alltime`,`records`].includes(_)&&(U=_);let v=Number(h.get(`season`));Number.isInteger(v)&&v>=2010&&v<=2100&&(W=v,S(`history-season`,String(W)));let y=Number(h.get(`entry`));y&&(U=`fame`),t.innerHTML=`<header class="utility-head archive-page-head"><h1>History</h1></header>`+g(`Reading the record book…`);let b=await ie();if(i!==G||!t.isConnected)return;if(b.error){t.innerHTML=`<header class="utility-head archive-page-head"><h1>History</h1></header>`+u(b.error);return}if(!b.manual.length&&!b.leagues.length){t.innerHTML=`<header class="utility-head archive-page-head"><h1>History</h1></header>
      <div id="hist-body">
        ${s(`No league history yet.`)}
        ${f()?`<div class="row-end">${d(`history`,`Add entry`)}</div>`:``}
      </div>`,p(t.querySelector(`#hist-body`),()=>{k(),J(t)});return}t.innerHTML=`
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
      <button type="button" data-tab="weeks" role="tab" aria-selected="${U===`weeks`}" class="${U===`weeks`?`on`:``}">Weeks</button>
      <button data-tab="fame"    role="tab" aria-selected="${U===`fame`}"    class="${U===`fame`?`on`:``}">Hall of Fame</button>
      <button data-tab="moments" role="tab" aria-selected="${U===`moments`}" class="${U===`moments`?`on`:``}">Moments</button>
      <button data-tab="seasons" role="tab" aria-selected="${U===`seasons`}" class="${U===`seasons`?`on`:``}">Yearbook</button>
      <button data-tab="alltime" role="tab" aria-selected="${U===`alltime`}" class="${U===`alltime`?`on`:``}">All-time</button>
      <button data-tab="records" role="tab" aria-selected="${U===`records`}" class="${U===`records`?`on`:``}">Records</button>
    </div>
    <div id="hist-body"></div>
  `;let C=t.querySelector(`#hist-body`),w=h.get(`moment`)&&A(b).find(e=>te(e)===h.get(`moment`)),T=()=>{if(K?.stop(),K=null,U===`weeks`){K=de(C,{lore:b,params:new URLSearchParams(h),active:()=>i===G&&t.isConnected});return}if(U===`moments`&&h.has(`moment`)&&!w){C.innerHTML=`<section class="state" role="status" data-route-focus tabindex="-1">This archive entry has changed. <a class="linkbtn" href="#/history?tab=moments">Latest moments →</a></section>`;return}if(U===`moments`&&w){C.innerHTML=`<section class="card" data-route-focus tabindex="-1">${Ie(w)}<a class="linkbtn" href="#/history?tab=moments">All moments →</a></section>`;return}if(U===`records`)return We(C,b);C.innerHTML=U===`fame`?ke(b):U===`moments`?Fe(b):U===`seasons`?Le(b):He(b)};if(t.querySelector(`#hist-tabs`).addEventListener(`click`,e=>{let n=e.target.closest(`button[data-tab]`);n&&(U=n.dataset.tab,S(`history-tab`,U),t.querySelectorAll(`#hist-tabs button`).forEach(e=>{let t=e.dataset.tab===U;e.classList.toggle(`on`,t),e.setAttribute(`aria-selected`,String(t))}),X(n),T())}),C.addEventListener(`click`,e=>{let n=e.target.closest(`button[data-season]`);n&&(W=Number(n.dataset.season),S(`history-season`,String(W)),T(),X(t.querySelector(`#year-picker button[data-season="${W}"]`)),t.querySelector(`#hist-tabs`)?.scrollIntoView({block:`start`}))}),p(C,()=>{k(),J(t)}),Se(C,b.members||[],async({field:e,key:n,memberId:r})=>{await Te({season:Number(n),field:e,memberId:r}),k(),J(t)}),T(),K&&await K.ready,!(i!==G||!t.isConnected)){if(h.get(`owner`)?L([...t.querySelectorAll(`[data-history-owner]`)].find(e=>e.dataset.historyOwner===h.get(`owner`))):h.has(`season`)&&L(t.querySelector(`.yb-champ`)),y){let e=t.querySelector(`[data-history-entry="${y}"]`);e&&(e.setAttribute(`data-route-focus`,``),e.tabIndex=-1)}X(t.querySelector(`#hist-tabs button[data-tab="${U}"]`)),U===`seasons`&&X(t.querySelector(`#year-picker button[data-season="${W}"]`))}}function Y(e){let t=`${m(e.label)}${e.sub&&e.sub!==e.label?`<div class="muted tiny">${m(e.sub)}</div>`:``}`;return e.memberId?`<a href="#/profile?id=${e.memberId}" class="plainlink">${t}</a>`:t}function ke(e){let t=M(e),n=t=>h({team_name:t.label,identity:(e.members||[]).find(e=>String(e.id)===String(t.memberId))||{}}),r=e.leagues.filter(e=>e.champion_user_id||e.champion_roster_id).sort((e,t)=>t.season-e.season),i=[...a(l(`history`,e.manual),`year`).entries()].sort((e,t)=>t[0]-e[0]);return`
    ${r.length?`
      <section class="archive-cabinet" aria-label="League champions">
        <header class="archive-cabinet-head"><h2>Champions</h2><span>${r.length} seasons</span></header>
        <ol class="archive-seasons">
          ${r.map((e,r)=>{let i=t(e.champion_user_id,e.season,e.champion_roster_id),a=e.runner_up_user_id||e.runner_up_roster_id?t(e.runner_up_user_id,e.season,e.runner_up_roster_id):null;return`<li class="archive-season${r===0?` is-featured`:``}">
              <header class="archive-season-head"><span><strong>${m(e.season)}</strong></span><span class="archive-title-label">${De(`Champion`)} Champion</span></header>
              <div class="archive-winner">${n(i)}<div>${f()?xe({text:i.label,field:`champion`,key:e.season,canEdit:!0}):Y(i)}${e.champion_locked?`<small class="archive-lock">Set by hand</small>`:``}</div></div>
              ${a?`<div class="archive-runner"><small>Runner-up</small><div>${n(a)}${Y(a)}</div></div>`:`<div class="archive-runner"><small>Runner-up</small><span>Not recorded</span></div>`}
            </li>`}).join(``)}
        </ol>
        <p class="archive-source">Sleeper playoff results · manually corrected seasons are marked. 2017–18 were played on another app; 2019’s winner was later removed from the league.</p>
      </section>`:``}

    ${i.length?i.map(([e,t])=>`
          <div class="section-head">
            <h2>${m(e)}</h2>
            ${d(`history`,`Add entry`,{year:e})}
          </div>
          <div class="card schedule">${je(t).map(Me).join(``)}</div>`).join(``):`<div class="card"><div class="card-body muted">${r.length?`No additional stories yet.`:`No league history yet.`}</div>
           ${f()?`<div class="row-end">${d(`history`,`Add entry`)}</div>`:``}
         </div>`}
  `}var Ae=[`Champion`,`Runner Up`,`Award`,`Record`,`Moment`];function je(e){let t=e=>{let t=Ae.indexOf(e);return t===-1?99:t};return[...e].sort((e,n)=>t(e.category)-t(n.category))}function Me(e){return`
    <div class="evrow ${o(`history`,e)}" data-history-entry="${m(e.id)}">
      <div class="evicon" aria-hidden="true">${De(e.category)}</div>
      <div class="evbody">
        <div class="evtop">
          <span class="evtitle">${m(e.winner||e.category)}</span>
          <span class="pill">${m(e.category)}</span>
        </div>
        ${e.notes?`<div class="evnote">${m(e.notes)}</div>`:``}
        ${i(`history`,e,{compact:!0})}
      </div>
    </div>`}var Ne={championship:`i-trophy`,title:`i-trophy`,commissioner:`i-moment`,golf:`i-golf`,arena:`i-arena`,streak:`i-record`,heartbreak:`i-medal`,blowout:`i-record`,nailbiter:`i-record`,high:`i-record`,low:`i-record`,rivalry:`i-versus`},Pe={championship:`Champion`,title:`The final`,commissioner:`From the commissioner`,golf:`Golf`,arena:`Arena`,streak:`Streak`,heartbreak:`Hard luck`,blowout:`Blowout`,nailbiter:`Nail-biter`,high:`Highest week`,low:`Lowest week`,rivalry:`Rivalry`};function Fe(e){let t=A(e);if(!t.length)return`<div class="state">
      <span class="state-title">Nothing to remember yet</span>
      <span>Sync Sleeper from the Admin page, or write the first one down.</span>
    </div>${f()?`<div class="row-end">${d(`history`,`Add a moment`)}</div>`:``}`;let n=a(t,e=>e.season??`—`),r=[...n.keys()].sort((e,t)=>(Number(t)||0)-(Number(e)||0));return`
    <p class="page-sub" style="margin-bottom:14px">
      ${t.length} moments · read off every game on record
      <span class="muted">· nothing here is invented</span>
    </p>
    ${r.map((e,t)=>{let r=n.get(e);return`
      <div class="card momentlist" data-collapse="hist-moments-${m(e)}"
           data-collapse-title="${m(e)}"
           data-collapse-badge="${r.length} moment${r.length===1?``:`s`}"
           ${t===0?``:`data-collapse-default="folded"`}>
        ${r.map(Ie).join(``)}
      </div>`}).join(``)}
    ${f()?`<div class="row-end">${d(`history`,`Add a moment`)}</div>`:``}
  `}function X(e){if(e)try{e.scrollIntoView({inline:`nearest`,block:`nearest`})}catch{}}function Ie(e){let t=e.kind===`commissioner`&&e.category?e.category:Pe[e.kind]||`Moment`,n=`
    <svg class="ico-sm moment-ico" aria-hidden="true"><use href="#${Ne[e.kind]||`i-moment`}"></use></svg>
    <span class="moment-body">
      <span class="moment-kind">${m(t)}</span>
      <strong class="moment-head">${m(e.headline)}</strong>
      ${e.detail?`<span class="moment-detail">${m(e.detail)}</span>`:``}
    </span>`;return e.href?`<a class="moment is-${m(e.kind)}" href="${m(e.href)}">${n}</a>`:`<div class="moment is-${m(e.kind)}">${n}</div>`}function Le(e){let t=[...new Set(e.standings.map(e=>e.season))].sort((e,t)=>t-e);if(!t.length)return s(`No season standings yet. Sync Sleeper from the Admin page.`);t.includes(W)||(W=t.find(t=>e.standings.some(e=>e.season===t&&e.wins+e.losses+e.ties>0))??t[0]);let n=I(e,W),r=`<div class="tabs tabscroll" id="year-picker" role="tablist"
                       aria-label="Season">${t.map(e=>`<button data-season="${e}" role="tab" aria-selected="${e===W}"
             class="${e===W?`on`:``}">${e}</button>`).join(``)}</div>`;return n.played?`
    ${r}
    ${Re(n)}
    ${ze(n)}
    ${Be(n)}
    ${Ve(n,!0)}
  `:`${r}
      <div class="state">
        <span class="state-title">${m(W)} has not been played</span>
        <span>The teams are set. The yearbook writes itself once the games start.</span>
      </div>
      ${Ve(n,!1)}`}function Re(e){return e.champion?`
    <section class="yb-champ">
      <span class="yb-kicker">
        <svg class="ico-sm" aria-hidden="true"><use href="#i-trophy"></use></svg>
        ${m(e.season)} champion
      </span>
      <strong class="yb-name">${m(e.champion.label)}</strong>
      ${e.champion.sub&&e.champion.sub!==e.champion.label?`<span class="yb-sub">${m(e.champion.sub)}</span>`:``}
      ${e.runnerUp?`<span class="yb-runner">Runner-up · ${m(e.runnerUp.label)}</span>`:``}
    </section>`:`<div class="card"><div class="card-title">${m(e.season)}</div>
      <div class="card-body muted">No champion recorded for this season.</div></div>`}function ze(e){if(!e.title)return``;let t=e.title;return`
    <div class="card">
      <div class="card-title">The final · Week ${m(t.week)}</div>
      <div class="yb-final">
        <div class="yb-side">
          <b>${t.champScore.toFixed(2)}</b>
          <span>${m(e.name(t.champUser,t.season,t.champRoster).label)}</span>
        </div>
        <div class="yb-by">by ${t.margin.toFixed(2)}</div>
        <div class="yb-side is-down">
          <b>${t.runnerScore.toFixed(2)}</b>
          <span>${m(e.name(t.runnerUser,t.season,t.runnerRoster).label)}</span>
        </div>
      </div>
    </div>`}function Be(e){let t=e.moments.filter(e=>e.kind!==`championship`&&e.kind!==`title`);return t.length?`
    <h2 class="section-title">${m(e.season)} in moments</h2>
    <div class="card momentlist">${t.map(Ie).join(``)}</div>`:``}function Ve(e,t){return`
    <h2 class="section-title">${t?`Final standings`:`Teams`}</h2>
    <div class="card">
      <div class="tblwrap">
        <table class="tbl">
          <thead>
            <tr><th>#</th><th>Team</th><th>Record</th><th class="num">PF</th><th class="num">PA</th></tr>
          </thead>
          <tbody>
            ${e.standings.map(n=>`
              <tr data-history-owner="${m(n.sleeper_user_id)}">
                <td>
                  ${t?n.rank??`—`:`—`}
                  ${t&&n.made_playoffs?`<span class="pill green tiny">P</span>`:``}
                </td>
                <td>${Y(e.name(n.sleeper_user_id,e.season,n.roster_id))}</td>
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
    </div>`}function He(e){if(!e.standings.length)return s(`No career records yet. Sync Sleeper from the Admin page.`);let t=M(e),n=Xe(e.leagues,`champion_user_id`),r=[...a(e.standings,`sleeper_user_id`).entries()].filter(([e])=>e!=null).filter(([t])=>e.users.some(e=>e.sleeper_user_id===t)).map(([e,r])=>{let i=$(r,`wins`),a=$(r,`losses`),o=$(r,`ties`),s=i+a+o,c=r.filter(e=>e.rank!=null);return{who:t(e),wins:i,losses:a,ties:o,winPct:s?(i+o/2)/s:0,pointsFor:$(r,`points_for`),avgFinish:c.length?c.reduce((e,t)=>e+t.rank,0)/c.length:null,playoffs:r.filter(e=>e.made_playoffs).length,titles:n.get(e)||0,seasons:r.length}}).sort((e,t)=>t.winPct-e.winPct||t.titles-e.titles||t.pointsFor-e.pointsFor),i=new Set(e.standings.map(e=>e.season)).size;return`
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
                <td>${Y(e.who)}</td>
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
    </div>`}var Z=null;async function Ue(){if(Z)return Z;let{data:e,error:t}=await _().from(`sleeper_transactions`).select(`season, week, type, status, details`).eq(`type`,`trade`).eq(`status`,`complete`);return Z={trades:e||[],error:t||null},Z}async function We(e,t){e.innerHTML=g(`Reading every week ever played…`);let n=await Ue(),r=M(t),i=ae(t.matchups);if(!i.length){e.innerHTML=s(`No weekly scores synced yet. Run a Sleeper sync from the Admin page.`);return}let a=i.filter(e=>e.score>0),o=t.matchups.filter(O),c=N(i),l=Ge(t.standings),u=E(c.map(e=>e.win).filter(Boolean),e=>e.run),d=E(c.map(e=>e.loss).filter(Boolean),e=>e.run),f=E(a,e=>e.score),p=E(a,e=>-e.score),h=E(o,e=>j(e)),_=E(o.filter(e=>j(e)>0),e=>-j(e)),y=E(o,e=>Number(e.score1)+Number(e.score2)),b=E(a.filter(e=>!e.won&&!e.tie),e=>e.score),x=e=>r(e.user,e.season,e.roster),S=(e,t)=>{let n=t(e);return r(n.user,e.season,n.roster).label};e.innerHTML=`
    
    <p class="page-sub" style="margin-bottom:14px">
      ${o.length} games · ${m(w)} onward
      <span class="muted">· ${m(w-v)} earlier seasons predate the records</span>
    </p>

    <section class="card recbook records-fold" data-collapse="hist-records-week"
             data-collapse-title="Single week" data-collapse-badge="6 records"
             data-collapse-default="folded">
      ${Q(`Highest score`,f&&f.score.toFixed(2),f&&x(f).label,f&&`${f.season} · Week ${f.week}`)}
      ${Q(`Lowest score`,p&&p.score.toFixed(2),p&&x(p).label,p&&`${p.season} · Week ${p.week}`)}
      ${Q(`Biggest blowout`,h&&j(h).toFixed(2)+` pts`,h&&S(h,F),h&&`beat ${S(h,D)} · ${h.season} Wk ${h.week}`)}
      ${Q(`Closest finish`,_&&j(_).toFixed(2)+` pts`,_&&S(_,F),_&&`over ${S(_,D)} · ${_.season} Wk ${_.week}`)}
      ${Q(`Highest combined`,y&&(Number(y.score1)+Number(y.score2)).toFixed(2),y&&`${S(y,F)} v ${S(y,D)}`,y&&`${y.season} · Week ${y.week}`)}
      ${Q(`Best losing score`,b&&b.score.toFixed(2),b&&x(b).label,b&&`lost ${b.against.toFixed(2)} · ${b.season} Wk ${b.week}`)}
    </section>

    <section class="card recbook records-fold" data-collapse="hist-records-seasons"
             data-collapse-title="Seasons &amp; streaks" data-collapse-badge="4 records"
             data-collapse-default="folded">
      ${Q(`Most points, season`,l.points&&l.points.points_for.toFixed(2),l.points&&r(l.points.sleeper_user_id,l.points.season,l.points.roster_id).label,l.points&&String(l.points.season))}
      ${Q(`Best record, season`,l.record&&`${l.record.wins}-${l.record.losses}${l.record.ties?`-`+l.record.ties:``}`,l.record&&r(l.record.sleeper_user_id,l.record.season,l.record.roster_id).label,l.record&&String(l.record.season))}
      ${Q(`Longest win streak`,u&&u.run+` weeks`,u&&r(u.user).label,u&&T(u.from,u.to))}
      ${Q(`Longest losing streak`,d&&d.run+` weeks`,d&&r(d.user).label,d&&T(d.from,d.to))}
    </section>

    ${n.error?``:Ke(n.trades,t)}
  `;let C=e.querySelector(`[data-fleece-board]`);C&&Je(n.trades,t).then(e=>{C.isConnected&&(C.innerHTML=e.error?`<p class="muted tiny">Historical trade outcomes could not be loaded.</p>`:Ye(e.rankings,t,e.players))})}function Q(e,t,n,r){return t?`
    <div class="rec">
      <span class="rec-label">${m(e)}</span>
      <span class="rec-who">
        ${m(n||`—`)}
        ${r?`<span class="rec-when">${m(r)}</span>`:``}
      </span>
      <span class="rec-val">${m(t)}</span>
    </div>`:``}function Ge(e){let t=(e||[]).filter(e=>e.wins+e.losses+e.ties>0);return{points:E(t,e=>Number(e.points_for)||0),record:E(t,e=>{let t=e.wins+e.losses+e.ties;return t?(e.wins+e.ties/2)/t+t/1e3:0})}}function Ke(e,t){let n=e.filter(e=>e.status===`complete`&&e.details?.status===`complete`);if(!n.length)return``;let r=new Map;for(let e of n)for(let t of e.details?.roster_ids||[]){let n=`${e.season}:${t}`;r.set(n,(r.get(n)||0)+1)}let i=new Map(t.standings.map(e=>[`${e.season}:${e.roster_id}`,e.sleeper_user_id])),a=new Map;for(let[e,t]of r){let n=i.get(e);n&&a.set(n,(a.get(n)||0)+t)}let o=M(t),s=[...a.entries()].map(([e,t])=>({who:o(e),n:t})).sort((e,t)=>t.n-e.n).slice(0,5);return s.length?`<section class="card records-fold records-trades" data-collapse="hist-records-trades"
                  data-collapse-title="Trades" data-collapse-badge="${n.length} completed"
                  data-collapse-default="folded">
    <div class="trade-fleece-shell" data-fleece-board>${g(`Grading the completed trades…`)}</div>
    <div class="recbook trade-leaders">
      ${s.map((e,t)=>`
        <div class="rec">
          <span class="rec-label">${t===0?`Most trades`:``}</span>
          <span class="rec-who">${m(e.who.label)}</span>
          <span class="rec-val">${e.n}</span>
        </div>`).join(``)}
    </div>
  </section>`:``}var qe=null;async function Je(e,n){return qe||(qe=(async()=>{try{let r=new Date().getFullYear()-1,i=n.leagues.filter(e=>e.scoring_settings&&(e.status===`complete`||Number(e.season)<=r)).map(e=>Number(e.season)).filter(Number.isFinite),a=Math.max(0,...i),o=new Map(n.leagues.map(e=>[Number(e.season),e.scoring_settings])),s=[...new Set(e.flatMap(e=>{let t=[];for(let n=Number(e.season);n<=Math.min(Number(e.season)+2,a);n++)o.get(n)&&t.push(n);return t}))].sort(),[c,...l]=await Promise.all([t(),...s.map(b)]);return{players:c,rankings:be({trades:e,latestSeason:a,statsBySeason:new Map(s.map((e,t)=>[e,l[t]?.data||{}])),scoringBySeason:o,players:c}),error:null}}catch(e){return{players:{},rankings:[],error:e}}})(),qe)}function Ye(e,t,n){if(!e.length)return`<p class="muted tiny">No completed trade has enough post-trade history to grade yet.</p>`;let r=M(t),i=new Map(t.standings.map(e=>[`${e.season}:${e.roster_id}`,e.sleeper_user_id])),a=(e,t)=>r(i.get(`${e.season}:${t.rosterId}`),e.season,t.rosterId).label,o=e=>e.playerIds.map(e=>`<b class="fleece-player">${m(n[e]?.n||`Player ${e}`)}</b>`).join(``),s=(e,t)=>`<article class="fleece-card">
    <div class="fleece-top"><div class="fleece-rank">#${t+1}</div><div class="fleece-meta">Week ${m(e.trade.week||`—`)}<b>+${m(e.gap.toFixed(1))} starter-impact gap</b></div></div>
    <div class="fleece-compare">
      <div class="fleece-side is-winner"><small>BEST SIDE</small><strong>${m(a(e.trade,e.winner))}</strong><div class="fleece-assets"><em>RECEIVED</em>${o(e.winner)}</div></div>
      <span class="fleece-vs" aria-hidden="true">VS</span>
      <div class="fleece-side is-loser"><small>WORST SIDE</small><strong>${m(a(e.trade,e.loser))}</strong><div class="fleece-assets"><em>RECEIVED</em>${o(e.loser)}</div></div>
    </div>
  </article>`,c=new Map;for(let t of e){let e=Number(t.trade.season);c.has(e)||c.set(e,[]),c.get(e).push(t)}return`<div class="fleece-head"><div><strong>Biggest fleeces</strong><span>Each season ranked independently</span></div><span class="pill">TOP 5 / SEASON</span></div>
    <div class="fleece-seasons">${[...c.entries()].sort((e,t)=>t[0]-e[0]).map(([e,t])=>`
      <section class="card fleece-season" data-collapse="hist-fleeces-${m(e)}"
               data-collapse-title="${m(e)}"
               data-collapse-badge="${Math.min(5,t.length)} ranked trade${Math.min(5,t.length)===1?``:`s`}"
               data-collapse-default="folded">
        <div class="fleece-list">${t.slice(0,5).map(s).join(``)}</div>
      </section>`).join(``)}</div>
    <p class="fleece-method"><strong>Starter-impact gap</strong> measures each acquired player’s DFL points above a position-specific replacement starter in the completed trade season and up to two seasons after it. Those seasons count 50/30/20, while extra package pieces receive diminishing weight (100/50/25/10) so several bench players cannot outweigh one elite starter by volume alone. The active season and pending trades are never graded, and only transactions marked complete count.</p>`}function $(e,t){return e.reduce((e,n)=>e+Number(n[t]||0),0)}function Xe(e,t){let n=new Map;for(let r of e){let e=r[t];e&&n.set(e,(n.get(e)||0)+1)}return n}export{Oe as leave,J as render};