import{$n as e,En as t,F as n,Fn as r,Gt as i,Ht as a,I as o,In as s,J as c,M as l,N as u,Nn as d,P as f,Qt as p,Sn as m,Yn as h,bn as g,j as _,jn as v,sr as y,yr as b}from"../app-core-BuUTx-Nz.js";import{Fr as x,Ir as S,Mr as C,Nr as w,dn as T,jr as E,ln as D,on as O,pn as k,un as A}from"../home-core-BJvIQi0B.js";import{a as j,c as M,d as N,f as P,i as F,l as I,n as L,s as R,u as ee}from"../keeper-rules-iB5MCYxx.js";var te=/keeper_self_status|keeper_set_self|keeper_clear_self|does not exist|not find the function|schema cache/i;async function ne(e){try{let{data:t,error:n}=await h().rpc(`keeper_self_status`,{target_season:Number(e)});if(n)throw n;return(Array.isArray(t)?t[0]:t)||null}catch(e){if(te.test(e?.message||``))return null;throw e}}async function re(e,t){if(!t)return[];let{data:n,error:r}=await h().from(`keepers`).select(`id,player_id,player_name,player_pos,player_team,round_cost,basis_round,basis_season,self_submitted,created_at`).eq(`year`,Number(e)).eq(`member_id`,t).order(`created_at`,{ascending:!1});if(r)throw r;return n||[]}function ie(e=[]){return e.filter(e=>e.standing===`eligible`&&e.keeperCost!=null)}function ae(e){return`${e.basisSeason&&e.basisRound?`${e.basisSeason} R${e.basisRound}`:`no draft round`} → R${e.keeperCost}`}function oe(e){if(!e||!e.max)return``;let t=Array.from({length:e.max},(t,n)=>`<i class="${n<e.year?`is-used`:``}"></i>`).join(``),n=e.left===0?`final season`:`${e.left} season${e.left===1?``:`s`} left`;return`<span class="ks-tenure ${e.final?`is-final`:``}">
    <span class="ks-pips" aria-hidden="true">${t}</span>
    <b>Year ${e.year}/${e.max}</b>
    <em>${m(n)}${e.firstSeason?` · kept since ${e.firstSeason}`:``}</em>
  </span>`}function se(e,t,{keeperRows:n=[],maxKeeperSeasons:r=null,memberId:i=null}={}){return e.length?`<ul class="ks-mine">${e.map(e=>{let a=I(n,{playerId:e.player_id,memberId:i,season:t,max:r});return`
    <li>
      <div class="ks-line">
        <strong>${m(e.player_name||e.player_id)}</strong>
        ${e.player_pos?`<span class="ks-pos">${m(e.player_pos)}</span>`:``}
        <span class="ks-cost">R${e.round_cost??`—`}</span>
      </div>
      ${oe(a)}
      <div class="ks-line ks-sub">
        ${e.basis_season&&e.basis_round?`<span class="ks-basis">from ${e.basis_season} R${e.basis_round}</span>`:``}
        ${e.self_submitted===!1?`<span class="ks-basis">entered by the commissioner &middot; you can change it</span>`:``}
      </div>
    </li>`}).join(``)}</ul>`:`<p class="ks-none">You have not chosen a keeper for ${t} yet.</p>`}function ce({season:e,status:t,mine:n=[],options:r=[],keeperRows:i=[],maxKeeperSeasons:a=null}){if(!t)return``;let o=t.member_id?c(t.member_id):null,s=!!t.needs_pin&&!o;if(!t.member_id)return`<section class="card keeper-self"><div class="card-body">
      <h3 class="card-heading">Your ${e} keeper</h3>
      <p class="muted">Pick your name in the top right to choose your keeper.</p>
    </div></section>`;if(t.locked)return`<section class="card keeper-self is-locked"><div class="card-body">
      <h3 class="card-heading">Your ${e} keeper</h3>
      ${se(n,e,{keeperRows:i,maxKeeperSeasons:a,memberId:t.member_id})}
      <p class="ks-locked">Keepers for ${e} are locked. Ask the commissioner if
        something is wrong.</p>
    </div></section>`;let l=Number(t.max_keepers)||1,u=Number(t.used_slots)||0;return`<section class="card keeper-self"><div class="card-body">
    <h3 class="card-heading">Your ${e} keeper</h3>
    ${se(n,e,{keeperRows:i,maxKeeperSeasons:a,memberId:t.member_id})}

    ${r.length?`
      <form class="ks-form" data-keeper-self-form autocomplete="off">
        <label for="ks-player">${u>=l&&l===1?`Change to`:`Keep`}</label>
        <select id="ks-player" name="player" required>
          <option value="">Choose a player…</option>
          ${r.map(e=>`
            <option value="${m(e.playerId)}"
                    data-name="${m(e.name||``)}"
                    data-pos="${m(e.position||``)}"
                    data-team="${m(e.nflTeam||``)}">
              ${m(e.name||e.playerId)}${e.position?` (${m(e.position)})`:``} — ${m(ae(e))}
            </option>`).join(``)}
        </select>

        ${s?`
          <label for="ks-pin">Your Profile PIN</label>
          <input id="ks-pin" name="pin" type="text" inputmode="numeric" pattern="[0-9]*"
                 minlength="4" maxlength="6" autocomplete="one-time-code"
                 autocapitalize="off" spellcheck="false" required
                 style="-webkit-text-security:disc">
`:``}

        <div class="row-end">
          ${n.length?`<button type="button" class="btn ghost small" data-keeper-self-clear>Remove</button>`:``}
          <button type="submit" class="btn">${n.length?`Change my keeper`:`Save my keeper`}</button>
        </div>
        <p class="ks-error" data-keeper-self-error></p>
      </form>
      ${l>1?`<p class="muted tiny">The league allows ${l} keepers.
        Choosing more than that replaces your oldest.</p>`:``}
    `:`
      <p class="muted tiny">None of the players on your roster can be priced automatically
        yet - the ${e-1} draft round is missing for them. The commissioner enters
        those by hand.</p>`}
  </div></section>`}function le(e,{season:t,memberId:n=null,options:r=[],onSaved:i=()=>{}}={}){if(!e)return;let a=new Map(r.map(e=>[String(e.playerId),e])),o=(e,t)=>{let n=e.querySelector(`[data-keeper-self-error]`);n?n.textContent=t:v(t,!0)};e.addEventListener(`submit`,async e=>{let r=e.target.closest(`[data-keeper-self-form]`);if(!r)return;e.preventDefault();let s=r.querySelector(`button[type="submit"]`),l=r.querySelector(`[data-keeper-self-error]`);l&&(l.textContent=``);let u=r.player?.value,d=a.get(String(u));if(!d){o(r,`Choose a player first.`);return}s.disabled=!0;try{let{error:e}=await h().rpc(`keeper_set_self`,{target_season:Number(t),pick_player_id:String(d.playerId),pick_name:d.name||null,pick_pos:d.position||null,pick_nfl_team:d.nflTeam||null,attempted_pin:r.pin?.value||c(n)||null});if(e)throw e;v(`${d.name||`Your keeper`} saved`),i()}catch(e){s.disabled=!1,o(r,e?.message||`That could not be saved.`)}}),e.addEventListener(`click`,async e=>{let r=e.target.closest(`[data-keeper-self-clear]`);if(!r)return;let a=r.closest(`[data-keeper-self-form]`);if(confirm(`Remove your ${t} keeper?`)){r.disabled=!0;try{let{error:e}=await h().rpc(`keeper_clear_self`,{target_season:Number(t),attempted_pin:a?.pin?.value||c(n)||null});if(e)throw e;v(`Your keeper was removed`),i()}catch(e){r.disabled=!1,o(a,e?.message||`That could not be removed.`)}}})}var ue=900;function de(e,t){let n=Number(e),r=Number(t);return!Number.isFinite(n)||n<=0||!Number.isFinite(r)||r<2?null:Math.ceil(n/r)}function fe(e,t){let n=e=>e==null||e===``?NaN:Number(e),r=n(e),i=n(t);return!Number.isFinite(r)||!Number.isFinite(i)?null:r-i}function z(e){return e==null?null:e===0?`0 rounds`:`${e>0?`+`:`−`}${Math.abs(e)} ${Math.abs(e)===1?`round`:`rounds`}`}function pe(e=[],{leagueSize:t,scoringFormat:n=`ppr`,season:r=null}={}){let i=`adp_${n}`,a=r?`Sleeper ADP · ${r}`:`Sleeper ADP`,o=[];for(let t of e||[]){if(!t||t.player_id==null)continue;let e=String(t.player?.position||``).toUpperCase();if(!C(e))continue;let n=Number(t.stats?.[i]);if(!Number.isFinite(n)||n<=0||n>=ue)continue;let r=Number(t.last_modified??t.updated_at);o.push({playerId:String(t.player_id),position:e,adp:n,updatedMs:Number.isFinite(r)?r:null})}o.sort((e,t)=>e.adp-t.adp||e.playerId.localeCompare(t.playerId));let s=new Map;return o.map((e,r)=>{let i=(s.get(e.position)||0)+1;return s.set(e.position,i),{playerId:e.playerId,rank:r+1,positionRank:i,adp:e.adp,projectedRound:de(e.adp,t),position:e.position,source:a,scoringFormat:n,updatedAt:e.updatedMs?new Date(e.updatedMs).toISOString():null}})}function me(e,{now:t=Date.now(),staleAfterDays:n=4}={}){let r=e?Date.parse(e):NaN;if(!Number.isFinite(r))return{updatedAt:null,ageDays:null,stale:!1,unknown:!0,label:null};let i=Math.floor((Number(t)-r)/864e5),a=new Date(r).toLocaleDateString(void 0,{month:`short`,day:`numeric`});return{updatedAt:e,ageDays:i,unknown:!1,stale:i>=n,label:i>=n?`Updated ${a} · may be stale`:`Updated ${a}`}}function B(e=[],{now:t=Date.now()}={}){let n=new Map;for(let t of e)t&&t.playerId!=null&&n.set(String(t.playerId),t);let r=e[0]||null;return{available:n.size>0,get:e=>n.get(String(e))||null,source:r?.source||null,scoringFormat:r?.scoringFormat||null,updatedAt:r?.updatedAt||null,freshness:me(r?.updatedAt||null,{now:t}),size:n.size}}var V=B([]),H=new Map,U={KNOWN:`cost-known`,NO_COST:`cost-unknown`,NO_ROUND:`no-prior-round`,UNKNOWN:`unknown-player`},W={QB:12,RB:24,WR:30,TE:12};function he(e){if(e==null||e===``)return null;let t=Number(e);return Number.isFinite(t)&&t>=1?t:null}function ge(e,t){let n=W[String(e||``).toUpperCase()],r=he(t);return!n||r==null?!1:r<=n}function _e({playerIds:e=[],players:t={},draftPicks:n=[],sleeperUserId:r=null,rules:i=null,targetSeason:a=null,keeperRows:o=[],memberId:s=null,market:c=V,production:l=H}){let u=j(a);return e.map(String).filter(e=>{let n=t[e];return!n||C(n.p)}).map(e=>{let d=t[e]||null,f=c.get(e),p=l.get?.(e)||null,m=d?.n||null,h=d?.p||``,g=d?.t||``,_=d?!g||g===`FA`:!1,v=N(n,e,{targetSeason:a}),y=n.find(t=>t&&String(t.player_id)===e&&Number(t.season)===u.draftBasisSeason)||null,b=y&&r!=null?String(y.sleeper_user_id)===String(r):null,x=ee(o,{playerId:e,memberId:s,beforeSeason:a}),S=M({config:i,targetSeason:a,basisRound:v.round,basisSeason:v.season,priorKeeperSeasons:x}),C;C=d?S.state===`eligible`?U.KNOWN:v.round==null?U.NO_ROUND:U.NO_COST:U.UNKNOWN;let w=f?.projectedRound??null,T=fe(S.calculatedRound,w);return{playerId:e,name:m,position:h,nflTeam:g,freeAgent:_,basisRound:v.round,basisSeason:v.season,basisFound:v.found,basisReason:v.reason,basisOtherSeasons:v.otherSeasons,draftedByMe:b,draftPickNo:y?Number(y.pick_no):null,priorKeeperSeasons:x,class:C,keeperCost:S.calculatedRound,keeperYear:S.keeperYear,maxKeeperYears:S.maxKeeperYears,finalKeeperYear:S.finalKeeperYear,standing:S.state,standingReason:S.reason,reviewNeeded:S.reviewNeeded,productionSeason:u.productionSeason,productionPoints:p?.points??null,productionGames:p?.games??null,positionRank:p?.positionRank??null,positionFinish:p?.label??null,strongProduction:ge(h,p?.positionRank),marketSeason:u.marketSeason,marketAdp:f?.adp??null,marketRank:f?.rank??null,marketPositionRank:f?.positionRank??null,marketProjectedRound:w,strongMarket:ge(h,f?.positionRank),roundValue:T,roundValueLabel:z(T),atFloor:S.calculatedRound!=null&&S.calculatedRound<=1}})}function ve(e=[],t=V){let n=e.some(e=>e.productionPoints!=null),r=t.available&&e.some(e=>e.marketProjectedRound!=null);return n&&r?{level:1,name:`full`,hasProduction:n,hasMarket:r}:n?{level:2,name:`no-market`,hasProduction:n,hasMarket:r}:r?{level:3,name:`no-production`,hasProduction:n,hasMarket:r}:{level:4,name:`facts-only`,hasProduction:n,hasMarket:r}}var ye=4,be=24;function G(e,t){let n=he(t);if(n==null)return 0;let r=W[String(e||``).toUpperCase()]||0;if(!r)return 0;let i=r-n+1;return i<=0?0:Math.round(i/r*be)}function K(e){return(e.roundValue==null?0:e.roundValue*ye)+G(e.position,e.positionRank)+G(e.position,e.marketPositionRank)}function xe(e=[]){let t=e=>e.standing===`unavailable`?3:e.class===U.KNOWN?0:e.class===U.UNKNOWN?2:1;return[...e].sort((e,n)=>t(e)-t(n)||(e.freeAgent===n.freeAgent?K(n)-K(e)||(e.keeperCost!=null&&n.keeperCost!=null&&e.keeperCost!==n.keeperCost?n.keeperCost-e.keeperCost:String(e.name||e.playerId).localeCompare(String(n.name||n.playerId))):e.freeAgent?1:-1))}var q={BEST_VALUE:`BEST VALUE`,BEST_PLAYER:`BEST PLAYER`,SAFE_CHOICE:`SAFE CHOICE`,VALUE_PLAY:`VALUE PLAY`,FINAL_YEAR:`FINAL-YEAR VALUE`,POOR_VALUE:`POOR VALUE`,LIMIT_REACHED:`Keeper limit reached`,NEEDS_REVIEW:`Needs review`,RETURNING:`You drafted them`,ACQUIRED:`Acquired, not drafted`,NOT_ON_NFL:`Not on an NFL roster`,UNKNOWN_ID:`Not in the Sleeper player list`};function Se(e,t=[]){if(e.class===U.UNKNOWN)return[q.UNKNOWN_ID];let n=[],r=t.filter(e=>e.standing===`eligible`),i=r.filter(e=>e.roundValue!=null).filter(e=>e.roundValue>=2&&e.strongProduction);i.length&&e.playerId===we(i,e=>-(e.roundValue*1e3+K(e)))&&n.push(q.BEST_VALUE);let a=r.filter(e=>e.marketRank!=null||e.positionRank!=null);return e.standing===`eligible`&&a.length>1&&e.playerId===we(a,Ce)&&n.push(q.BEST_PLAYER),e.standing===`eligible`&&e.strongProduction&&e.strongMarket&&e.roundValue!=null&&(e.roundValue>0||e.atFloor&&e.roundValue>=0)&&n.push(q.SAFE_CHOICE),e.standing===`eligible`&&e.roundValue!=null&&e.roundValue>=2&&!e.strongProduction&&n.push(q.VALUE_PLAY),e.standing===`eligible`&&e.finalKeeperYear&&e.roundValue!=null&&e.roundValue>0&&n.push(q.FINAL_YEAR),e.standing===`eligible`&&e.roundValue!=null&&e.roundValue<0&&!e.atFloor&&!e.strongProduction&&n.push(q.POOR_VALUE),e.standing===`unavailable`&&n.push(q.LIMIT_REACHED),e.reviewNeeded&&n.push(q.NEEDS_REVIEW),e.draftedByMe===!0&&n.push(q.RETURNING),e.draftedByMe===!1&&n.push(q.ACQUIRED),e.freeAgent&&n.push(q.NOT_ON_NFL),n}function Ce(e){if(e.marketRank!=null)return e.marketRank;let t=G(e.position,e.positionRank);return t?1e3-t:9999}function we(e,t){let n=null,r=1/0;for(let i of[...e].sort((e,t)=>String(e.playerId).localeCompare(String(t.playerId)))){let e=t(i);e<r&&(r=e,n=i)}return n?.playerId??null}function Te(e){if(e.class===U.UNKNOWN)return[{label:`Player`,value:q.UNKNOWN_ID}];let t=[];return e.productionPoints!=null&&t.push({label:`${e.productionSeason} performance`,value:`${e.productionPoints.toFixed(1)} DFL pts${e.positionFinish?` · ${e.positionFinish}`:``}`}),t.push({label:`${e.basisSeason??`Previous`} DFL draft`,value:e.basisRound==null?`Not found — needs review`:`Round ${e.basisRound}`}),e.keeperCost==null?e.standing===`unavailable`&&t.push({label:`Keeper`,value:e.standingReason}):t.push({label:`${e.marketSeason??``} keeper`.trim(),value:`Round ${e.keeperCost}${e.keeperYear!=null&&e.maxKeeperYears!=null?` · Year ${e.keeperYear} of ${e.maxKeeperYears}`:``}`}),e.marketAdp!=null&&t.push({label:`${e.marketSeason} market`,value:`ADP ${Oe(e.marketAdp)}${e.marketProjectedRound==null?``:` · Expected Round ${e.marketProjectedRound}`}`}),e.roundValueLabel&&t.push({label:`Draft value`,value:e.roundValueLabel}),t}function Ee(e){if(e.class===U.UNKNOWN)return`This id is not in the Sleeper player list, so nothing can be said about them.`;if(e.standing===`unavailable`)return e.standingReason;if(e.reviewNeeded)return`${e.basisReason} — a commissioner can enter the keeper round to record this one.`;let t=[];if(e.productionPoints!=null){let n=W[String(e.position||``).toUpperCase()]||0,r=e.positionFinish?` (${e.positionFinish})`:``;t.push(e.strongProduction?e.positionRank<=Math.ceil(n/2)?`Strong ${e.productionSeason} production${r}`:`A startable ${e.productionSeason}${r}`:`A quieter ${e.productionSeason}${r}`)}if(e.marketProjectedRound!=null&&t.push(`an expected Round ${e.marketProjectedRound} price in ${e.marketSeason}`),e.keeperCost!=null&&t.push(`a Round ${e.keeperCost} keeper cost`),!t.length)return e.standingReason;let n=t.length===1?t[0]:`${t.slice(0,-1).join(`, `)} and ${t.at(-1)}`;return e.roundValue!=null&&e.roundValue>0?`${n} — ${z(e.roundValue)} of draft value.`:e.roundValue===0?e.atFloor?`${n} — the cheapest a keeper can cost under these rules.`:`${n} — keeping them costs exactly what drafting them would.`:e.roundValue!=null&&e.roundValue<0?`${n} — ${z(e.roundValue)}: the keeper is the more expensive way to get them.`:e.marketProjectedRound==null?`${n}. No market price for ${e.marketSeason} yet, so this is not a value claim.`:`${n}.`}function De(e){return{player:e.name||`Player ${e.playerId}`,position:e.position,nflTeam:e.nflTeam,productionSeason:e.productionSeason,productionPoints:e.productionPoints,positionFinish:e.positionFinish,basisSeason:e.basisSeason,basisRound:e.basisRound,keeperSeason:e.marketSeason,keeperRound:e.keeperCost,keeperYear:e.keeperYear,maxKeeperYears:e.maxKeeperYears,marketSeason:e.marketSeason,marketAdp:e.marketAdp,expectedRound:e.marketProjectedRound,roundValue:e.roundValue,standing:e.standing}}function Oe(e){return Math.round(Number(e)*10)/10}function ke(e){let{member:t=null,sleeperUserId:n=null,roster:r=null,players:i=null,draftPicks:a=[],rules:o=null,targetSeason:s=null,keeperRows:c=[],maxKeepers:l=null,market:u=V,production:d=H}=e||{};if(!t)return{state:`no-member`};if(!n)return{state:`no-sleeper-id`,member:t};if(!r)return{state:`no-roster`,member:t,sleeperUserId:n};let f=Array.isArray(r.players)?r.players.map(String):[];if(!f.length)return{state:`no-players`,member:t,sleeperUserId:n,roster:r};let p=xe(_e({playerIds:f,players:i||{},draftPicks:a,sleeperUserId:n,rules:o,targetSeason:s,keeperRows:c,memberId:t?.id,market:u,production:d})),m=j(s),h=ve(p,u);return{state:`ready`,member:t,sleeperUserId:n,roster:r,rules:o,targetSeason:s,maxKeepers:l,keeperRows:c,context:m,positions:E,data:h,market:{available:u.available,source:u.source,scoringFormat:u.scoringFormat,updatedAt:u.updatedAt,freshness:u.freshness},candidates:p,counts:{total:p.length,costKnown:p.filter(e=>e.standing===`eligible`).length,basisKnown:p.filter(e=>e.basisRound!=null).length,noPriorRound:p.filter(e=>e.basisRound==null&&e.class!==U.UNKNOWN).length,unavailable:p.filter(e=>e.standing===`unavailable`).length,needsReview:p.filter(e=>e.reviewNeeded&&e.class!==U.UNKNOWN).length,unknownPlayer:p.filter(e=>e.class===U.UNKNOWN).length,withProduction:p.filter(e=>e.productionPoints!=null).length,withMarket:p.filter(e=>e.marketProjectedRound!=null).length},shortlist:Math.min(p.length,Math.max(3,(Number(l)||0)+2))}}async function Ae({season:t,onSaved:n=()=>{}}={}){let r=document.createElement(`div`);r.className=`overlay ke-overlay`,r.innerHTML=`
    <div class="overlay-card wide ke-card" role="dialog" aria-modal="true"
         aria-labelledby="ke-title">
      <header class="ke-head">
        <div>
          <span class="eyebrow">Record a keeper</span>
          <h2 id="ke-title">${m(t??``)} keepers</h2>
          <p class="muted tiny" data-ke-rules></p>
        </div>
        <button type="button" class="btn ghost small" data-ke-close>Close</button>
      </header>
      <div class="ke-body" data-ke-body>
        <p class="muted tiny">Loading the league…</p>
      </div>
    </div>`,document.body.appendChild(r);let i=b(r.querySelector(`.ke-card`),{initial:()=>r.querySelector(`[data-ke-search]`)||r.querySelector(`[data-ke-member]`)||r.querySelector(`[data-ke-close]`)}),a=()=>{document.removeEventListener(`keydown`,o),window.removeEventListener(`hashchange`,a),i(),r.remove()},o=e=>{e.key===`Escape`&&a()};document.addEventListener(`keydown`,o),window.addEventListener(`hashchange`,a),r.addEventListener(`click`,e=>{e.target===r&&a()}),r.querySelector(`[data-ke-close]`).addEventListener(`click`,a);let s=r.querySelector(`[data-ke-body]`),c;try{c=await Me(t)}catch(e){s.innerHTML=`<p class="muted">Could not load the league. ${m(e.message||``)}</p>`;return}let l=R(c.rules),u=P(c.rules,{targetSeason:c.season});r.querySelector(`[data-ke-rules]`).textContent=l?`${t} rules · ${l}${u?` — ${u.text}`:``}`:`No keeper rules are configured for this season`;let d={step:`member`,member:null,pick:null,search:``},f=()=>{d.step===`member`?s.innerHTML=Pe(c):d.step===`player`?s.innerHTML=Fe(c,d):s.innerHTML=Re(c,d),p()};function p(){s.querySelector(`[data-ke-back]`)?.addEventListener(`click`,()=>{d.step=d.step===`review`?`player`:`member`,d.step===`member`&&(d.pick=null),f()}),s.querySelectorAll(`[data-ke-member]`).forEach(e=>{e.addEventListener(`click`,async()=>{d.member=c.members.find(t=>String(t.id)===e.dataset.keMember)||null,d.search=``,d.step=`player`,f(),await Ne(c,d.member),d.step===`player`&&f()})});let e=s.querySelector(`[data-ke-search]`);e&&e.addEventListener(`input`,()=>{d.search=e.value;let t=s.querySelector(`[data-ke-list]`);t&&(t.innerHTML=Ie(c,d)),h()}),h();let t=s.querySelector(`[data-ke-form] input[name=round]`);if(t){let e=s.querySelector(`[data-ke-override]`),n=d.pick?.standing?.calculatedRound??null;t.addEventListener(`input`,()=>{let r=Number(t.value),i=n!=null&&Number.isFinite(r)&&r!==n;e.textContent=i?`Override — the rules calculate R${n}. This will be saved as R${r}.`:n==null?`No calculated value — the round you enter is the record.`:`Calculated R${n}. Change it only to overrule the rules.`,e.classList.toggle(`is-override`,i)})}s.querySelector(`[data-ke-form]`)?.addEventListener(`submit`,async e=>{e.preventDefault(),await g(e.currentTarget)}),s.querySelector(`[data-ke-next]`)?.addEventListener(`click`,()=>{d.step=`member`,d.member=null,d.pick=null,f()})}function h(){s.querySelectorAll(`[data-ke-player]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=c.rosters.get(String(d.member.id));d.pick=t?.candidates.find(t=>t.playerId===e.dataset.kePlayer)||null,d.pick&&(d.step=`review`,f())})})}f();async function g(t){let r=t.querySelector(`button[type=submit]`);r.disabled=!0;let i=d.pick,a=Number(t.round.value),o=i.standing.calculatedRound,l=Number.isFinite(a)&&a!==o,u={year:c.season,member_id:d.member.id,player_id:i.playerId,team:d.member.team_name||d.member.display_name,player:i.name||`Player ${i.playerId}`,player_name:i.name||null,player_pos:i.position||null,player_team:i.nflTeam||null,team_snapshot:d.member.team_name||null,basis_round:i.standing.basisRound,basis_season:i.standing.basisSeason,keeper_year:i.standing.keeperYear,calculated_round:o,round_cost:Number.isFinite(a)?a:o,round_overridden:l,rules_season:c.rules?.effective_season??null,notes:t.notes.value.trim()};try{await e(`keepers`,u),v(l?`Saved ${u.player} at R${u.round_cost} (override)`:`Saved ${u.player} at R${u.round_cost}`),c.taken.set(`${c.season}:${i.playerId}`,!0),c.existing.push(u),c.rosters.delete(String(d.member.id)),d.step=`member`,d.member=null,d.pick=null,f(),n()}catch(e){r.disabled=!1,s.querySelector(`[data-ke-error]`).textContent=je(e)}}}function je(e){if(e?.code===`23505`)return`That player is already recorded as a keeper this season.`;let t=e?.message||`Could not save that keeper`;return/member_id|player_id|column/.test(t)?`Run keeper_rules_schema.sql then keeper_basis_correction.sql in Supabase to enable keeper entry.`:t}async function Me(e){let[t,n,r]=await Promise.all([i(),h().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression`).order(`effective_season`,{ascending:!1}),h().from(`keepers`).select(`year, member_id, player_id, player_name, team, player, round_cost`)]),a=r.error?[]:r.data||[],o=new Map;for(let t of a)t.player_id!=null&&Number(t.year)===Number(e)&&o.set(`${e}:${t.player_id}`,!0);return{season:Number(e),members:t,rules:F(n.error?[]:n.data||[],e),existing:a,taken:o,rosters:new Map,players:null}}async function Ne(e,t){let n=String(t.id);if(e.rosters.has(n))return;if(!t.sleeper_user_id){e.rosters.set(n,{season:null,candidates:[],noLink:!0});return}let i=(await h().from(`sleeper_rosters`).select(`season, players, team_name`).eq(`sleeper_user_id`,t.sleeper_user_id).order(`season`,{ascending:!1}).limit(4)).data||[],a=i.find(e=>(e.players||[]).length)||i[0]||null,o=Array.isArray(a?.players)?a.players.map(String):[];if(!o.length){e.rosters.set(n,{season:a?.season??null,candidates:[],empty:!0});return}let[s,c]=await Promise.all([e.players?Promise.resolve(e.players):r().catch(()=>({})),h().from(`sleeper_draft_picks`).select(`season, player_id, round, pick_no, sleeper_user_id`).in(`player_id`,o)]);e.players=s;let l=c.error?[]:c.data||[],u=o.map(n=>{let r=s[n]||null,i=N(l,n,{targetSeason:e.season}),a=ee(e.existing,{playerId:n,memberId:t.id,beforeSeason:e.season}),o=M({config:e.rules,targetSeason:e.season,basisRound:i.round,basisSeason:i.season,priorKeeperSeasons:a});return{playerId:n,name:r?.n||null,position:r?.p||``,nflTeam:r?.t||``,basis:i,standing:o,alreadyKept:e.taken.has(`${e.season}:${n}`)}}),d={QB:0,RB:1,WR:2,TE:3};u.sort((e,t)=>(d[e.position]??9)-(d[t.position]??9)||String(e.name||e.playerId).localeCompare(String(t.name||t.playerId))),e.rosters.set(n,{season:a?.season??null,candidates:u})}function Pe(e){return`
    <p class="ke-hint">Choose the member recording a keeper.</p>
    <div class="ke-members">
      ${e.members.map(t=>{let n=e.existing.filter(n=>Number(n.year)===e.season&&String(n.member_id)===String(t.id));return`
        <button type="button" class="ke-member" data-ke-member="${t.id}">
          <span class="ke-member-main">
            <strong>${m(t.display_name)}</strong>
            ${t.team_name?`<span class="muted tiny">${m(t.team_name)}</span>`:``}
          </span>
          <span class="ke-member-state">${n.length?`${n.length} recorded`:`<span class="muted">none yet</span>`}</span>
        </button>`}).join(``)}
    </div>`}function Fe(e,t){let n=e.rosters.get(String(t.member.id));return`
    <div class="ke-step-head">
      <button type="button" class="btn ghost small" data-ke-back>← Members</button>
      <div>
        <strong>${m(t.member.display_name)}</strong>
        ${n?.season?`<span class="muted tiny"> · ${m(n.season)} roster</span>`:``}
      </div>
    </div>
    ${n?``:`<p class="muted tiny">Reading the roster…</p>`}
    ${n?.noLink?`<p class="muted">${m(t.member.display_name)} is not linked to a
      Sleeper account, so there is no roster to choose from. An admin can link it
      on the Admin page.</p>`:``}
    ${n?.empty?`<p class="muted">No synced season has any players on this roster yet.
      Run <strong>Sync Sleeper</strong> on the Admin page.</p>`:``}
    ${n?.candidates?.length?`
      <label class="ke-search">
        <span class="sr-only">Search this roster</span>
        <input type="search" data-ke-search placeholder="Search ${m(t.member.display_name)}’s roster"
               value="${m(t.search)}" autocomplete="off">
      </label>
      <div class="ke-list" data-ke-list>${Ie(e,t)}</div>`:``}`}function Ie(e,t){let n=e.rosters.get(String(t.member.id)),r=t.search.trim().toLowerCase(),i=(n?.candidates||[]).filter(e=>!r||String(e.name||``).toLowerCase().includes(r)||String(e.position||``).toLowerCase()===r||String(e.nflTeam||``).toLowerCase()===r),a=[[`Available`,i.filter(e=>e.standing.state===`eligible`&&!e.alreadyKept)],[`Needs review`,i.filter(e=>e.standing.state===`review`&&!e.alreadyKept)],[`Unavailable`,i.filter(e=>e.alreadyKept||e.standing.state===`unavailable`||e.standing.state===`no-rules`)]];return i.length?a.filter(([,e])=>e.length).map(([t,n])=>`
    <div class="ke-group">
      <div class="ke-group-head">${m(t)}<span class="count">${n.length}</span></div>
      ${n.map(n=>Le(n,t===`Unavailable`,e.season)).join(``)}
    </div>`).join(``):`<p class="muted tiny">Nobody on this roster matches that search.</p>`}function Le(e,t,n){let r=e.name||`Player ${e.playerId}`,i=[e.position,e.nflTeam].filter(Boolean).join(` · `),a=e.alreadyKept?`Already recorded this season`:e.standing.state===`eligible`?`${e.standing.basisSeason} Draft R${e.standing.basisRound} · ${n} Keeper R${e.standing.calculatedRound} · ${e.standing.finalKeeperYear?`FINAL YEAR`:`Year ${e.standing.keeperYear} of ${e.standing.maxKeeperYears}`}`:e.standing.reason;return`
    <${t?`div`:`button type="button"`} class="ke-player ${t?`is-locked`:``}"
        ${t?``:`data-ke-player="${m(e.playerId)}"`}>
      <span class="ke-player-main">
        <span class="ke-player-name">${m(r)}</span>
        ${i?`<span class="ke-player-where">${m(i)}</span>`:``}
        <span class="ke-player-line">${m(a)}</span>
      </span>
      ${e.standing.calculatedRound!=null&&!e.alreadyKept?`<span class="ke-player-round">R${e.standing.calculatedRound}</span>`:``}
    </${t?`div`:`button`}>`}function Re(e,t){let n=t.pick,r=n.standing,i=n.name||`Player ${n.playerId}`,a=r.calculatedRound;return`
    <div class="ke-step-head">
      <button type="button" class="btn ghost small" data-ke-back>← ${m(t.member.display_name)}’s roster</button>
    </div>
    <form data-ke-form class="ke-review">
      <div class="ke-review-who">
        <strong>${m(i)}</strong>
        <span class="muted tiny">${m([n.position,n.nflTeam].filter(Boolean).join(` · `))}</span>
        <span class="muted tiny">${m(t.member.display_name)}${t.member.team_name?` · ${m(t.member.team_name)}`:``} · ${e.season}</span>
      </div>

      <dl class="ke-facts">
        <div><dt>${m(r.basisSeason??`Previous season`)} DFL draft</dt><dd>${r.basisRound==null?`<span class="muted">not found</span>`:`Round ${r.basisRound}`}</dd></div>
        <div><dt>Keeper year</dt><dd>${r.keeperYear==null?`<span class="muted">—</span>`:`${r.keeperYear} of ${r.maxKeeperYears}${r.finalKeeperYear?` · final`:``}`}</dd></div>
        <div><dt>${m(e.season)} keeper cost</dt><dd>${a==null?`<span class="muted">not calculable</span>`:`Round ${a}`}</dd></div>
      </dl>

      ${r.basisRound==null?`<p class="ke-warn">${m(r.reason)}. Enter the keeper
        round yourself to record this one.${n.basis.otherSeasons.length?` For reference only, this league drafted them in
              ${m(n.basis.otherSeasons.map(e=>`${e.season} R${e.round}`).join(`, `))} —
              none of which is the ${m(r.basisSeason??``)} basis.`:``}</p>`:``}

      <label class="ke-field">
        <span>Keeper round</span>
        <input name="round" type="number" min="1" max="40" inputmode="numeric"
               value="${a??``}" required>
        <small class="muted tiny" data-ke-override>${a==null?`No calculated value — the round you enter is the record.`:`Calculated R${a}. Change it only to overrule the rules.`}</small>
      </label>

      <label class="ke-field">
        <span>Notes <span class="muted tiny">optional</span></span>
        <input name="notes" type="text" maxlength="120" autocomplete="off"
               placeholder="Why this was overruled, if it was">
      </label>

      <p class="ke-error" data-ke-error role="alert"></p>
      <div class="row-end">
        <button type="button" class="btn ghost small" data-ke-back>Back</button>
        <button type="submit" class="btn">Save keeper</button>
      </div>
    </form>`}var{BG:ze,CARD:Be,LINE:Ve,INK:He,MUTED:Ue,GOLD:We,ACCENT:Ge,BRAND_RED:Ke,BRAND_YELLOW:qe}=O;function Je({season:e,members:t=[],keeperRows:n=[],players:r={},rules:i=null}){let a=Number(e),o=(n||[]).filter(e=>Number(e.year??e.season)===a),s=new Map(t.map(e=>[String(e.id),[]])),c=new Map;for(let e of t)for(let t of[e.team_name,e.display_name,...e.team_name_aliases||[]])if(t){let n=String(t).trim().toLowerCase(),r=String(e.id);c.set(n,c.has(n)&&c.get(n)!==r?null:r)}let l=e=>{let n=String(e||``).trim().toLowerCase();if(n.length<3)return null;let r=t.filter(e=>[e.display_name,e.team_name,...e.team_name_aliases||[]].some(e=>String(e||``).trim().toLowerCase().startsWith(n)));return r.length===1?String(r[0].id):null},u=[];for(let e of o){let t=e.member_id==null?null:String(e.member_id);if(!t||!s.has(t)){let n=String(e.team||``).trim().toLowerCase();t=c.get(n)||l(n)}t&&s.has(t)?s.get(t).push(e):u.push(e)}let d=i?.max_keeper_seasons??null,f=e=>{let t=e.player_id==null?null:r[String(e.player_id)],i=e.player_pos||t?.p||``,o=e.player_team||t?.t||``;return{id:e.player_id==null?``:String(e.player_id),position:i,name:e.player_name||e.player||`—`,where:[i,o].filter(e=>e&&e!==`FA`).join(` · `),round:e.round_cost==null?null:Number(e.round_cost),legacy:e.player_id==null,overridden:e.round_overridden===!0,tenure:e.player_id==null?null:I(n,{playerId:e.player_id,memberId:e.member_id,season:a,max:d})}},p=t.map(e=>({member:e.display_name||``,team:e.team_name||``,keepers:(s.get(String(e.id))||[]).map(f)}));return{season:a,rows:p,also:u.map(f),submitted:p.filter(e=>e.keepers.length).length,total:p.length,rulesLine:R(i)}}function J(e){return e?[`DFL ${e.season} keepers — ${e.submitted} of ${e.total} submitted`,...e.rows.map(e=>{let t=e.team||e.member;return e.keepers.length?`${t}: ${e.keepers.map(e=>{let t=e.round==null?``:` (R${e.round})`,n=e.tenure?.max?` yr ${e.tenure.year}/${e.tenure.max}`:``;return`${e.name}${t}${n}`}).join(`, `)}`:`${t}: no keeper submitted`})].join(`
`):``}function Ye(e){return D(k(e))}function Xe(e){if(!e||!e.total)return T({title:`DFL HQ — Keepers`,text:J(e),url:location.href})===`copied`?`Copied to the clipboard`:`Sharing…`;try{let t=Ye(e);return A(t,`dfl-keepers-${e.season}.png`,{title:`DFL HQ — ${e.season} keepers`,text:J(e)})===`saved`?`Saved the keeper board to your downloads`:`Sharing…`}catch(t){return console.warn(`keeper board: falling back to text`,t),T({title:`DFL HQ — ${e.season} keepers`,text:J(e),url:location.href})===`copied`?`Copied to the clipboard`:`Sharing…`}}var Y=null;async function X(e){let[n,a]=await Promise.all([y(`keepers`,{order:`team`,asc:!0}),i().catch(()=>[])]),s=await h().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression`).then(e=>e.error?[]:e.data||[],()=>[]);if(!n.length){e.innerHTML=`
      <header class="page-head"><h1>Keepers</h1></header>
      <div data-advisor-host></div>
      <div id="keeper-body">
        ${g(`No keepers recorded yet.`)}
        ${l()?`<div class="row-end ke-actions">
           <button type="button" class="btn" data-keeper-entry>Add keeper</button>
           ${_(`keepers`,`Add by hand`)}
         </div>`:``}
      </div>`,o(e.querySelector(`#keeper-body`),()=>X(e)),e.addEventListener(`click`,t=>{t.target.closest(`[data-keeper-entry]`)&&Ae({season:new Date().getFullYear(),onSaved:()=>X(e)})}),Z(e);return}let c=[...new Set(n.map(e=>e.year))].sort((e,t)=>t-e);c.includes(Y)||(Y=c[0]),e.innerHTML=`
    <header class="page-head">
      <h1>Keepers</h1>
      <p class="page-sub" id="keeper-count"></p>
    </header>

    <div data-advisor-host></div>

    <h2 class="section-title">League keepers</h2>
    <div class="tabs" id="year-tabs">
      ${c.map(e=>`<button data-year="${e}" class="${e===Y?`on`:``}">${e}</button>`).join(``)}
    </div>
    <div id="keeper-body"></div>
  `;let u=e.querySelector(`#keeper-body`),d=e.querySelector(`#keeper-count`),f=()=>{let e=n.filter(e=>e.year===Y),r=t(e,`team`).size;d.textContent=e.length?`${Y} · ${e.length} keeper${e.length===1?``:`s`} across ${r} team${r===1?``:`s`}`:`${Y} · nothing recorded`;let i=F(s,Y)?.max_keeper_seasons??L.max_keeper_seasons;u.innerHTML=st(e,i,a)+`<div class="row-end ke-actions">
           <button type="button" class="btn ghost small" data-keeper-share>Share keeper board</button>
           ${l()?`<button type="button" class="btn" data-keeper-entry>Add keeper</button>
             ${_(`keepers`,`Add by hand`,{year:Y})}`:``}
         </div>`};e.querySelector(`#year-tabs`).addEventListener(`click`,t=>{let n=t.target.closest(`button[data-year]`);n&&(Y=Number(n.dataset.year),e.querySelectorAll(`#year-tabs button`).forEach(e=>e.classList.toggle(`on`,Number(e.dataset.year)===Y)),f())}),o(u,()=>X(e)),e.addEventListener(`click`,t=>{t.target.closest(`[data-keeper-entry]`)&&Ae({season:Y,onSaved:()=>X(e)})});let p=null;(async()=>{try{let e=await i(),t=n.filter(e=>e.player_id!=null).map(e=>String(e.player_id)),a=n.some(e=>e.player_id!=null&&!e.player_pos)&&t.length?await r().catch(()=>({})):{},o=await h().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression`);p={members:e,players:a,ruleSets:o.error?[]:o.data||[]}}catch{p={members:[],players:{},ruleSets:[]}}})(),e.addEventListener(`click`,e=>{if(!e.target.closest(`[data-keeper-share]`))return;if(!p){v(`Still reading the league — try again in a moment`);return}let t=Je({season:Y,members:p.members,keeperRows:n,players:p.players,rules:F(p.ruleSets,Y)});v(Xe(t))}),f(),Z(e)}async function Z(e){let t=e.querySelector(`[data-advisor-host]`);if(!t)return;let n=a();if(!n){t.innerHTML=Q($({state:`no-member`}));return}if(!n.sleeper_user_id){t.innerHTML=Q($({state:`no-sleeper-id`,member:n}),n);return}t.innerHTML=Q(`<p class="muted tiny">Reading your roster, last season and the draft board…</p>`,n);let r;try{r=await Qe(n)}catch(e){t.innerHTML=Q(`<p class="muted tiny">Could not read your roster. ${m(e.message||``)}</p>`,n);return}t.innerHTML=Q($(r),n),await Ze(t,r,n)}async function Ze(e,t,n){let r=t?.context?.targetSeason;if(!r||!e)return;let i=null;try{i=await ne(r)}catch{return}if(!i)return;e.parentElement?.querySelectorAll(`[data-keeper-self-host]`).forEach(e=>e.remove());let a=document.createElement(`div`);a.dataset.keeperSelfHost=`1`,e.insertAdjacentElement(`afterend`,a);let o=async()=>{let e=[];try{e=await re(r,i.member_id)}catch{e=[]}let n=ie(t.candidates||[]);return a.innerHTML=ce({season:r,status:i,mine:e,options:n,keeperRows:t.keeperRows||[],maxKeeperSeasons:t.rules?.max_keeper_seasons??L.max_keeper_seasons}),n},s=await o();le(a,{season:r,memberId:i.member_id,options:s,onSaved:async()=>{try{i=await ne(r)||i}catch{}await o(),X(document.getElementById(`view`)||document.body)}})}async function Qe(e){let t=e.sleeper_user_id,[n,i,a,o]=await Promise.all([h().from(`sleeper_rosters`).select(`season, players, team_name, synced_at`).eq(`sleeper_user_id`,t).order(`season`,{ascending:!1}).limit(4),h().from(`sleeper_leagues`).select(`season, max_keepers, status, scoring_settings`).order(`season`,{ascending:!1}).limit(1),h().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression, updated_at`).order(`effective_season`,{ascending:!1}),h().from(`keepers`).select(`year, member_id, player_id, player_name, team, player, round_cost`)]),c=n.data||[],l=c.find(e=>(e.players||[]).length)||c[0]||null,u=(i.data||[])[0]||null,f=i.error?null:u?.max_keepers??null,p=i.error?null:u?.scoring_settings||null,m=u?.season??null,g=j(m),_=a.error?[]:a.data||[],v=F(_,m),y=o.error?[]:o.data||[],b=Array.isArray(l?.players)?l.players.map(String):[],C=((g.draftBasisSeason==null?{data:[]}:await h().from(`sleeper_rosters`).select(`roster_id`).eq(`season`,g.draftBasisSeason)).data||[]).length||null,T=x(p),[E,D,O,k]=await Promise.all([b.length?r().catch(()=>({})):Promise.resolve({}),b.length?h().from(`sleeper_draft_picks`).select(`season, player_id, round, pick_no, sleeper_user_id`).in(`player_id`,b):Promise.resolve({data:[]}),b.length&&p?s(g.productionSeason).catch(()=>({data:{},fetchedAt:0})):Promise.resolve({data:{},fetchedAt:0}),b.length?d(g.marketSeason,T).catch(()=>({data:[],fetchedAt:0})):Promise.resolve({data:[],fetchedAt:0})]),A=O.data||{},M=p?w({stats:A,players:E,scoringSettings:p}):new Map,N=p?S({playerIds:b,stats:A,players:E,scoringSettings:p}):new Map,P=new Map;for(let e of b){let t=M.get(e),n=N.get(e);t?P.set(e,{...t,games:n?.games??null}):n?.points!=null&&P.set(e,{...n,positionRank:null,label:null})}let I=pe(k.data||[],{leagueSize:C,scoringFormat:T,season:g.marketSeason}),L=I.length?B(I):V;return{...ke({member:e,sleeperUserId:t,roster:l,players:E,draftPicks:D.error?[]:D.data||[],rules:v,targetSeason:m,keeperRows:y,maxKeepers:f,market:L,production:P.size?P:H}),needsDraftSync:!!D.error,needsRulesMigration:!!a.error,needsScoring:!p,leagueSize:C,scoringFormat:T,leagueSeason:u?.season??null,rosterSeason:l?.season??null}}function Q(e,t){return`
    <section class="card keeper-advisor" data-collapse="keeper-advisor"
             data-collapse-title="Keeper advisor"${t?` data-collapse-badge="${m(t.display_name)}"`:``}>
      ${e}
    </section>`}function $(e){if(e.state===`no-member`)return`<p class="muted">Pick your name in the top right and this will show your
      own keeper options.</p>`;if(e.state===`no-sleeper-id`)return`<p class="muted">${m(e.member.display_name)} is not linked to a Sleeper
      account yet, so there is no roster to read. An admin can link it on the
      Admin page.</p>`;if(e.state===`no-roster`)return`<p class="muted">No roster has been synced for you yet. An admin can run
      <strong>Sync Sleeper</strong> on the Admin page.</p>`;if(e.state===`no-players`)return`<p class="muted">No synced season has any players on your roster yet. An
      admin can run <strong>Sync Sleeper</strong> on the Admin page.</p>`;let{candidates:t,counts:n,rules:r,context:i,shortlist:a,market:o}=e,s=t[0]?.standing===`eligible`?t[0]:null,c=+!!s,l=t.slice(c,a),u=t.slice(a);return`
    ${$e(s,t,e)}

    ${nt(r,i)}
    ${rt(o)}

    <ol class="ka-list" start="${c+1}" ${l.length?``:`hidden`}>
      ${l.map((e,n)=>at(e,c+n+1,t)).join(``)}
    </ol>

    ${u.length?`
      <div class="ka-more" data-collapse="keeper-compare" data-collapse-default="folded"
           data-collapse-title="Compare all ${n.total}"
           data-collapse-badge="${u.length} more">
        ${ot(t,i)}
      </div>`:``}

    ${it(e).map(e=>`<p class="ka-blocker">${e}</p>`).join(``)}`}function $e(e,t,n){if(!e)return``;let r=Se(e,t),i=r.find(e=>et.has(e))||null,a=r.filter(e=>e!==i),o=Te(e);return`
    <div class="ka-lead-card">
      ${i?`<span class="ka-headline">${m(i)}</span>`:``}
      <p class="ka-lead-who"><strong>${m(e.name||`Player ${e.playerId}`)}</strong>
        <span class="ka-where">${m([e.position,e.nflTeam].filter(Boolean).join(` · `))}</span></p>
      <dl class="ka-facts">
        ${o.map(e=>`<div><dt>${m(e.label)}</dt><dd>${m(e.value)}</dd></div>`).join(``)}
      </dl>
      <p class="ka-why-long">${m(Ee(e))}</p>
      ${a.length?`<span class="ka-badges">${a.map(e=>`<span class="pill tiny ${tt.has(e)?`is-call`:``}">${m(e)}</span>`).join(``)}</span>`:``}
    </div>`}var et=new Set([q.BEST_VALUE,q.BEST_PLAYER,q.SAFE_CHOICE,q.FINAL_YEAR,q.VALUE_PLAY]),tt=new Set([...et,q.POOR_VALUE]);function nt(e,t){let n=R(e);return n?`<p class="ka-rules">${m(t.targetSeason??``)} keeper rules ·
    ${m(n)}</p>`:``}function rt(e){if(!e?.available)return``;let t=e.freshness;return`<p class="ka-source ${t?.stale?`is-stale`:``}">${m(e.source||`Market`)}
    ${e.scoringFormat?`· ${m(e.scoringFormat.replace(`_`,` `))}`:``}
    ${t?.label?`· ${m(t.label)}`:``}</p>`}function it(e){let{context:t,rules:n}=e,r=[];return e.needsRulesMigration?r.push(`Keeper rules are not switched on yet. Run
      <strong>keeper_rules_schema.sql</strong> in the Supabase SQL editor.`):n||r.push(`No keeper rules are configured for ${m(t.targetSeason??`this season`)},
      so no keeper cost is shown.`),e.needsDraftSync&&r.push(`Draft rounds are missing. Run <strong>sleeper_draft_schema.sql</strong>,
      then <strong>Sync Sleeper</strong>.`),e.needsScoring&&r.push(`This league's scoring settings have not been synced, so
      ${m(t.productionSeason)} points cannot be worked out. Run
      <strong>Sync Sleeper</strong> on the Admin page.`),r}function at(e,t,n){let r=Se(e,n),i=e.name||`Player ${e.playerId}`,a=[e.position,e.nflTeam].filter(Boolean).join(` · `),o=e.keeperCost==null?`<span class="ka-cost none" title="${e.standing===`unavailable`?`Not eligible under the configured rules`:`No ${e.basisSeason??`previous season`} draft round on record`}">—</span>`:`<span class="ka-cost">R${e.keeperCost}</span>`;return`
    <li class="ka-row ${e.class===U.UNKNOWN?`is-unknown`:``} ${e.standing===`unavailable`?`is-unavailable`:``}">
      <span class="ka-n" aria-hidden="true">${t}</span>
      <span class="ka-main">
        <span class="ka-name">${m(i)}</span>
        ${a?`<span class="ka-where">${m(a)}</span>`:``}
        <span class="ka-why">${Te(e).map(e=>`<span class="ka-fact"><b>${m(e.label)}</b> ${m(e.value)}</span>`).join(``)}</span>
        ${r.length?`<span class="ka-badges">${r.map(e=>`<span class="pill tiny ${tt.has(e)?`is-call`:``}">${m(e)}</span>`).join(``)}</span>`:``}
      </span>
      ${o}
    </li>`}function ot(e,t){let n=e.map(De),r=(e,t=0)=>e==null?`—`:Number(e).toFixed(t);return`
    <div class="ka-table-wrap">
      <table class="ka-table">
        <thead>
          <tr>
            <th>Player</th><th>Pos</th>
            <th class="num">${m(t.productionSeason)} Pts</th>
            <th>${m(t.productionSeason)} Finish</th>
            <th class="num">${m(t.draftBasisSeason)} Draft</th>
            <th class="num">${m(t.targetSeason)} Keeper</th>
            <th class="num">${m(t.marketSeason)} ADP</th>
            <th class="num">${m(t.marketSeason)} Exp.</th>
            <th class="num">Value</th>
            <th>Keeper year</th>
          </tr>
        </thead>
        <tbody>
          ${n.map(e=>`
            <tr class="${e.standing===`unavailable`?`is-unavailable`:``}">
              <td>${m(e.player)}</td>
              <td>${m(e.position)}</td>
              <td class="num">${r(e.productionPoints,1)}</td>
              <td>${m(e.positionFinish||`—`)}</td>
              <td class="num">${e.basisRound==null?`—`:`R${e.basisRound}`}</td>
              <td class="num">${e.keeperRound==null?`—`:`R${e.keeperRound}`}</td>
              <td class="num">${r(e.marketAdp,1)}</td>
              <td class="num">${e.expectedRound==null?`—`:`R${e.expectedRound}`}</td>
              <td class="num ${e.roundValue!=null&&e.roundValue>0?`is-plus`:``}">${e.roundValue==null?`—`:e.roundValue>0?`+${e.roundValue}`:e.roundValue}</td>
              <td>${e.keeperYear!=null&&e.maxKeeperYears!=null?`${e.keeperYear} of ${e.maxKeeperYears}`:`—`}</td>
            </tr>`).join(``)}
        </tbody>
      </table>
    </div>`}function st(e,r,i){let a=n(`keepers`,e);return a.length?`
    <div class="card keepcard">
      <div class="kp-head" aria-hidden="true">
        <span>Team</span><span>Keeper</span><span>Held</span><span class="kp-r">Round</span>
      </div>
      ${[...t(a,`team`).entries()].sort((e,t)=>e[0].localeCompare(t[0])).map(([e,t])=>t.map((t,n)=>`
        <div class="kp-row ${n===0?`kp-new`:``} ${f(`keepers`,t)}">
          <span class="kp-team">${n===0?m(p(e,i,{member_id:t.member_id})):``}</span>
          <span class="kp-player">
            ${m(t.player)}
            ${t.notes?`<span class="kp-note">${m(t.notes)}</span>`:``}
          </span>
          ${ct(t,r)}
          <span class="kp-cost ${t.round_cost==null?`none`:``}">${t.round_cost==null?`—`:`${m(t.round_cost)}`}</span>
          ${u(`keepers`,t,{compact:!0})}
        </div>`).join(``)).join(``)}
    </div>`:g(`No keepers for this year.`)}function ct(e,t){let n=Number(e.keeper_year),r=Number(e.year);if(!Number.isFinite(n)||n<1)return`<span class="kp-held none">—</span>`;let i=Number.isFinite(r)?r-n+1:null,a=Math.max(0,(t??L.max_keeper_seasons)-n);return`
    <span class="kp-held">
      ${i==null?``:`<span class="kp-since">${m(i)}</span>`}
      <span class="kp-left ${a===0?`is-final`:``}">${a===0?`final`:`${a} left`}</span>
    </span>`}export{X as render};