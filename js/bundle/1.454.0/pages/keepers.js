import{Cn as e,Dn as t,F as n,Gt as r,Ht as i,I as a,In as o,J as s,Ln as c,M as l,Mn as u,N as d,P as f,Pn as p,Qt as m,Xn as h,br as g,cr as _,er as v,j as y,xn as b}from"../app-core-BFfaEpUk.js";import{Dr as x,Mr as S,Or as C,dn as w,fn as T,jr as ee,kr as te,mn as E,sn as D,un as O}from"../home-core-By1jLF6S.js";import{a as k,c as A,d as j,f as M,i as N,l as P,n as F,s as I,u as L}from"../keeper-rules-iB5MCYxx.js";var ne=/keeper_self_status|keeper_set_self|keeper_clear_self|does not exist|not find the function|schema cache/i;async function re(e){try{let{data:t,error:n}=await h().rpc(`keeper_self_status`,{target_season:Number(e)});if(n)throw n;return(Array.isArray(t)?t[0]:t)||null}catch(e){if(ne.test(e?.message||``))return null;throw e}}async function ie(e,t){if(!t)return[];let{data:n,error:r}=await h().from(`keepers`).select(`id,player_id,player_name,player_pos,player_team,round_cost,basis_round,basis_season,self_submitted,created_at`).eq(`year`,Number(e)).eq(`member_id`,t).order(`created_at`,{ascending:!1});if(r)throw r;return n||[]}function ae(e=[]){return e.filter(e=>e.standing===`eligible`&&e.keeperCost!=null)}function oe(e){return`${e.basisSeason&&e.basisRound?`${e.basisSeason} R${e.basisRound}`:`no draft round`} → R${e.keeperCost}`}function se(t){if(!t||!t.max)return``;let n=Array.from({length:t.max},(e,n)=>`<i class="${n<t.year?`is-used`:``}"></i>`).join(``),r=t.left===0?`final season`:`${t.left} season${t.left===1?``:`s`} left`;return`<span class="ks-tenure ${t.final?`is-final`:``}">
    <span class="ks-pips" aria-hidden="true">${n}</span>
    <b>Year ${t.year}/${t.max}</b>
    <em>${e(r)}${t.firstSeason?` · kept since ${t.firstSeason}`:``}</em>
  </span>`}function ce(t,n,{keeperRows:r=[],maxKeeperSeasons:i=null,memberId:a=null}={}){return t.length?`<ul class="ks-mine">${t.map(t=>{let o=P(r,{playerId:t.player_id,memberId:a,season:n,max:i});return`
    <li>
      <div class="ks-line">
        <strong>${e(t.player_name||t.player_id)}</strong>
        ${t.player_pos?`<span class="ks-pos">${e(t.player_pos)}</span>`:``}
        <span class="ks-cost">R${t.round_cost??`—`}</span>
      </div>
      ${se(o)}
      <div class="ks-line ks-sub">
        ${t.basis_season&&t.basis_round?`<span class="ks-basis">from ${t.basis_season} R${t.basis_round}</span>`:``}
        ${t.self_submitted===!1?`<span class="ks-basis">entered by the commissioner &middot; you can change it</span>`:``}
      </div>
    </li>`}).join(``)}</ul>`:`<p class="ks-none">You have not chosen a keeper for ${n} yet.</p>`}function le({season:t,status:n,mine:r=[],options:i=[],keeperRows:a=[],maxKeeperSeasons:o=null}){if(!n)return``;let c=n.member_id?s(n.member_id):null,l=!!n.needs_pin&&!c;if(!n.member_id)return`<section class="card keeper-self"><div class="card-body">
      <h3 class="card-heading">Your ${t} keeper</h3>
      <p class="muted">Pick your name in the top right to choose your keeper.</p>
    </div></section>`;if(n.locked)return`<section class="card keeper-self is-locked"><div class="card-body">
      <h3 class="card-heading">Your ${t} keeper</h3>
      ${ce(r,t,{keeperRows:a,maxKeeperSeasons:o,memberId:n.member_id})}
      <p class="ks-locked">Keepers for ${t} are locked. Ask the commissioner if
        something is wrong.</p>
    </div></section>`;let u=Number(n.max_keepers)||1,d=Number(n.used_slots)||0;return`<section class="card keeper-self"><div class="card-body">
    <h3 class="card-heading">Your ${t} keeper</h3>
    ${ce(r,t,{keeperRows:a,maxKeeperSeasons:o,memberId:n.member_id})}

    ${i.length?`
      <form class="ks-form" data-keeper-self-form autocomplete="off">
        <label for="ks-player">${d>=u&&u===1?`Change to`:`Keep`}</label>
        <select id="ks-player" name="player" required>
          <option value="">Choose a player…</option>
          ${i.map(t=>`
            <option value="${e(t.playerId)}"
                    data-name="${e(t.name||``)}"
                    data-pos="${e(t.position||``)}"
                    data-team="${e(t.nflTeam||``)}">
              ${e(t.name||t.playerId)}${t.position?` (${e(t.position)})`:``} — ${e(oe(t))}
            </option>`).join(``)}
        </select>

        ${l?`
          <label for="ks-pin">Your Profile PIN</label>
          <input id="ks-pin" name="pin" type="text" inputmode="numeric" pattern="[0-9]*"
                 minlength="4" maxlength="6" autocomplete="one-time-code"
                 autocapitalize="off" spellcheck="false" required
                 style="-webkit-text-security:disc">
`:``}

        <div class="row-end">
          ${r.length?`<button type="button" class="btn ghost small" data-keeper-self-clear>Remove</button>`:``}
          <button type="submit" class="btn">${r.length?`Change my keeper`:`Save my keeper`}</button>
        </div>
        <p class="ks-error" data-keeper-self-error></p>
      </form>
      ${u>1?`<p class="muted tiny">The league allows ${u} keepers.
        Choosing more than that replaces your oldest.</p>`:``}
    `:`
      <p class="muted tiny">None of the players on your roster can be priced automatically
        yet - the ${t-1} draft round is missing for them. The commissioner enters
        those by hand.</p>`}
  </div></section>`}function ue(e,{season:t,memberId:n=null,options:r=[],onSaved:i=()=>{}}={}){if(!e)return;let a=new Map(r.map(e=>[String(e.playerId),e])),o=(e,t)=>{let n=e.querySelector(`[data-keeper-self-error]`);n?n.textContent=t:u(t,!0)};e.addEventListener(`submit`,async e=>{let r=e.target.closest(`[data-keeper-self-form]`);if(!r)return;e.preventDefault();let c=r.querySelector(`button[type="submit"]`),l=r.querySelector(`[data-keeper-self-error]`);l&&(l.textContent=``);let d=r.player?.value,f=a.get(String(d));if(!f){o(r,`Choose a player first.`);return}c.disabled=!0;try{let{error:e}=await h().rpc(`keeper_set_self`,{target_season:Number(t),pick_player_id:String(f.playerId),pick_name:f.name||null,pick_pos:f.position||null,pick_nfl_team:f.nflTeam||null,attempted_pin:r.pin?.value||s(n)||null});if(e)throw e;u(`${f.name||`Your keeper`} saved`),i()}catch(e){c.disabled=!1,o(r,e?.message||`That could not be saved.`)}}),e.addEventListener(`click`,async e=>{let r=e.target.closest(`[data-keeper-self-clear]`);if(!r)return;let a=r.closest(`[data-keeper-self-form]`);if(confirm(`Remove your ${t} keeper?`)){r.disabled=!0;try{let{error:e}=await h().rpc(`keeper_clear_self`,{target_season:Number(t),attempted_pin:a?.pin?.value||s(n)||null});if(e)throw e;u(`Your keeper was removed`),i()}catch(e){r.disabled=!1,o(a,e?.message||`That could not be removed.`)}}})}var de=900;function fe(e,t){let n=Number(e),r=Number(t);return!Number.isFinite(n)||n<=0||!Number.isFinite(r)||r<2?null:Math.ceil(n/r)}function pe(e,t){let n=e=>e==null||e===``?NaN:Number(e),r=n(e),i=n(t);return!Number.isFinite(r)||!Number.isFinite(i)?null:r-i}function R(e){return e==null?null:e===0?`0 rounds`:`${e>0?`+`:`−`}${Math.abs(e)} ${Math.abs(e)===1?`round`:`rounds`}`}function me(e=[],{leagueSize:t,scoringFormat:n=`ppr`,season:r=null}={}){let i=`adp_${n}`,a=r?`Sleeper ADP · ${r}`:`Sleeper ADP`,o=[];for(let t of e||[]){if(!t||t.player_id==null)continue;let e=String(t.player?.position||``).toUpperCase();if(!C(e))continue;let n=Number(t.stats?.[i]);if(!Number.isFinite(n)||n<=0||n>=de)continue;let r=Number(t.last_modified??t.updated_at);o.push({playerId:String(t.player_id),position:e,adp:n,updatedMs:Number.isFinite(r)?r:null})}o.sort((e,t)=>e.adp-t.adp||e.playerId.localeCompare(t.playerId));let s=new Map;return o.map((e,r)=>{let i=(s.get(e.position)||0)+1;return s.set(e.position,i),{playerId:e.playerId,rank:r+1,positionRank:i,adp:e.adp,projectedRound:fe(e.adp,t),position:e.position,source:a,scoringFormat:n,updatedAt:e.updatedMs?new Date(e.updatedMs).toISOString():null}})}function he(e,{now:t=Date.now(),staleAfterDays:n=4}={}){let r=e?Date.parse(e):NaN;if(!Number.isFinite(r))return{updatedAt:null,ageDays:null,stale:!1,unknown:!0,label:null};let i=Math.floor((Number(t)-r)/864e5),a=new Date(r).toLocaleDateString(void 0,{month:`short`,day:`numeric`});return{updatedAt:e,ageDays:i,unknown:!1,stale:i>=n,label:i>=n?`Updated ${a} · may be stale`:`Updated ${a}`}}function z(e=[],{now:t=Date.now()}={}){let n=new Map;for(let t of e)t&&t.playerId!=null&&n.set(String(t.playerId),t);let r=e[0]||null;return{available:n.size>0,get:e=>n.get(String(e))||null,source:r?.source||null,scoringFormat:r?.scoringFormat||null,updatedAt:r?.updatedAt||null,freshness:he(r?.updatedAt||null,{now:t}),size:n.size}}var B=z([]),V=new Map,H={KNOWN:`cost-known`,NO_COST:`cost-unknown`,NO_ROUND:`no-prior-round`,UNKNOWN:`unknown-player`},U={QB:12,RB:24,WR:30,TE:12};function ge(e){if(e==null||e===``)return null;let t=Number(e);return Number.isFinite(t)&&t>=1?t:null}function _e(e,t){let n=U[String(e||``).toUpperCase()],r=ge(t);return!n||r==null?!1:r<=n}function ve({playerIds:e=[],players:t={},draftPicks:n=[],sleeperUserId:r=null,rules:i=null,targetSeason:a=null,keeperRows:o=[],memberId:s=null,market:c=B,production:l=V}){let u=k(a);return e.map(String).filter(e=>{let n=t[e];return!n||C(n.p)}).map(e=>{let d=t[e]||null,f=c.get(e),p=l.get?.(e)||null,m=d?.n||null,h=d?.p||``,g=d?.t||``,_=d?!g||g===`FA`:!1,v=j(n,e,{targetSeason:a}),y=n.find(t=>t&&String(t.player_id)===e&&Number(t.season)===u.draftBasisSeason)||null,b=y&&r!=null?String(y.sleeper_user_id)===String(r):null,x=L(o,{playerId:e,memberId:s,beforeSeason:a}),S=A({config:i,targetSeason:a,basisRound:v.round,basisSeason:v.season,priorKeeperSeasons:x}),C;C=d?S.state===`eligible`?H.KNOWN:v.round==null?H.NO_ROUND:H.NO_COST:H.UNKNOWN;let w=f?.projectedRound??null,T=pe(S.calculatedRound,w);return{playerId:e,name:m,position:h,nflTeam:g,freeAgent:_,basisRound:v.round,basisSeason:v.season,basisFound:v.found,basisReason:v.reason,basisOtherSeasons:v.otherSeasons,draftedByMe:b,draftPickNo:y?Number(y.pick_no):null,priorKeeperSeasons:x,class:C,keeperCost:S.calculatedRound,keeperYear:S.keeperYear,maxKeeperYears:S.maxKeeperYears,finalKeeperYear:S.finalKeeperYear,standing:S.state,standingReason:S.reason,reviewNeeded:S.reviewNeeded,productionSeason:u.productionSeason,productionPoints:p?.points??null,productionGames:p?.games??null,positionRank:p?.positionRank??null,positionFinish:p?.label??null,strongProduction:_e(h,p?.positionRank),marketSeason:u.marketSeason,marketAdp:f?.adp??null,marketRank:f?.rank??null,marketPositionRank:f?.positionRank??null,marketProjectedRound:w,strongMarket:_e(h,f?.positionRank),roundValue:T,roundValueLabel:R(T),atFloor:S.calculatedRound!=null&&S.calculatedRound<=1}})}function ye(e=[],t=B){let n=e.some(e=>e.productionPoints!=null),r=t.available&&e.some(e=>e.marketProjectedRound!=null);return n&&r?{level:1,name:`full`,hasProduction:n,hasMarket:r}:n?{level:2,name:`no-market`,hasProduction:n,hasMarket:r}:r?{level:3,name:`no-production`,hasProduction:n,hasMarket:r}:{level:4,name:`facts-only`,hasProduction:n,hasMarket:r}}var be=4,xe=24;function W(e,t){let n=ge(t);if(n==null)return 0;let r=U[String(e||``).toUpperCase()]||0;if(!r)return 0;let i=r-n+1;return i<=0?0:Math.round(i/r*xe)}function G(e){return(e.roundValue==null?0:e.roundValue*be)+W(e.position,e.positionRank)+W(e.position,e.marketPositionRank)}function Se(e=[]){let t=e=>e.standing===`unavailable`?3:e.class===H.KNOWN?0:e.class===H.UNKNOWN?2:1;return[...e].sort((e,n)=>t(e)-t(n)||(e.freeAgent===n.freeAgent?G(n)-G(e)||(e.keeperCost!=null&&n.keeperCost!=null&&e.keeperCost!==n.keeperCost?n.keeperCost-e.keeperCost:String(e.name||e.playerId).localeCompare(String(n.name||n.playerId))):e.freeAgent?1:-1))}var K={BEST_VALUE:`BEST VALUE`,BEST_PLAYER:`BEST PLAYER`,SAFE_CHOICE:`SAFE CHOICE`,VALUE_PLAY:`VALUE PLAY`,FINAL_YEAR:`FINAL-YEAR VALUE`,POOR_VALUE:`POOR VALUE`,LIMIT_REACHED:`Keeper limit reached`,NEEDS_REVIEW:`Needs review`,RETURNING:`You drafted them`,ACQUIRED:`Acquired, not drafted`,NOT_ON_NFL:`Not on an NFL roster`,UNKNOWN_ID:`Not in the Sleeper player list`};function Ce(e,t=[]){if(e.class===H.UNKNOWN)return[K.UNKNOWN_ID];let n=[],r=t.filter(e=>e.standing===`eligible`),i=r.filter(e=>e.roundValue!=null).filter(e=>e.roundValue>=2&&e.strongProduction);i.length&&e.playerId===Te(i,e=>-(e.roundValue*1e3+G(e)))&&n.push(K.BEST_VALUE);let a=r.filter(e=>e.marketRank!=null||e.positionRank!=null);return e.standing===`eligible`&&a.length>1&&e.playerId===Te(a,we)&&n.push(K.BEST_PLAYER),e.standing===`eligible`&&e.strongProduction&&e.strongMarket&&e.roundValue!=null&&(e.roundValue>0||e.atFloor&&e.roundValue>=0)&&n.push(K.SAFE_CHOICE),e.standing===`eligible`&&e.roundValue!=null&&e.roundValue>=2&&!e.strongProduction&&n.push(K.VALUE_PLAY),e.standing===`eligible`&&e.finalKeeperYear&&e.roundValue!=null&&e.roundValue>0&&n.push(K.FINAL_YEAR),e.standing===`eligible`&&e.roundValue!=null&&e.roundValue<0&&!e.atFloor&&!e.strongProduction&&n.push(K.POOR_VALUE),e.standing===`unavailable`&&n.push(K.LIMIT_REACHED),e.reviewNeeded&&n.push(K.NEEDS_REVIEW),e.draftedByMe===!0&&n.push(K.RETURNING),e.draftedByMe===!1&&n.push(K.ACQUIRED),e.freeAgent&&n.push(K.NOT_ON_NFL),n}function we(e){if(e.marketRank!=null)return e.marketRank;let t=W(e.position,e.positionRank);return t?1e3-t:9999}function Te(e,t){let n=null,r=1/0;for(let i of[...e].sort((e,t)=>String(e.playerId).localeCompare(String(t.playerId)))){let e=t(i);e<r&&(r=e,n=i)}return n?.playerId??null}function Ee(e){if(e.class===H.UNKNOWN)return[{label:`Player`,value:K.UNKNOWN_ID}];let t=[];return e.productionPoints!=null&&t.push({label:`${e.productionSeason} performance`,value:`${e.productionPoints.toFixed(1)} DFL pts${e.positionFinish?` · ${e.positionFinish}`:``}`}),t.push({label:`${e.basisSeason??`Previous`} DFL draft`,value:e.basisRound==null?`Not found — needs review`:`Round ${e.basisRound}`}),e.keeperCost==null?e.standing===`unavailable`&&t.push({label:`Keeper`,value:e.standingReason}):t.push({label:`${e.marketSeason??``} keeper`.trim(),value:`Round ${e.keeperCost}${e.keeperYear!=null&&e.maxKeeperYears!=null?` · Year ${e.keeperYear} of ${e.maxKeeperYears}`:``}`}),e.marketAdp!=null&&t.push({label:`${e.marketSeason} market`,value:`ADP ${ke(e.marketAdp)}${e.marketProjectedRound==null?``:` · Expected Round ${e.marketProjectedRound}`}`}),e.roundValueLabel&&t.push({label:`Draft value`,value:e.roundValueLabel}),t}function De(e){if(e.class===H.UNKNOWN)return`This id is not in the Sleeper player list, so nothing can be said about them.`;if(e.standing===`unavailable`)return e.standingReason;if(e.reviewNeeded)return`${e.basisReason} — a commissioner can enter the keeper round to record this one.`;let t=[];if(e.productionPoints!=null){let n=U[String(e.position||``).toUpperCase()]||0,r=e.positionFinish?` (${e.positionFinish})`:``;t.push(e.strongProduction?e.positionRank<=Math.ceil(n/2)?`Strong ${e.productionSeason} production${r}`:`A startable ${e.productionSeason}${r}`:`A quieter ${e.productionSeason}${r}`)}if(e.marketProjectedRound!=null&&t.push(`an expected Round ${e.marketProjectedRound} price in ${e.marketSeason}`),e.keeperCost!=null&&t.push(`a Round ${e.keeperCost} keeper cost`),!t.length)return e.standingReason;let n=t.length===1?t[0]:`${t.slice(0,-1).join(`, `)} and ${t.at(-1)}`;return e.roundValue!=null&&e.roundValue>0?`${n} — ${R(e.roundValue)} of draft value.`:e.roundValue===0?e.atFloor?`${n} — the cheapest a keeper can cost under these rules.`:`${n} — keeping them costs exactly what drafting them would.`:e.roundValue!=null&&e.roundValue<0?`${n} — ${R(e.roundValue)}: the keeper is the more expensive way to get them.`:e.marketProjectedRound==null?`${n}. No market price for ${e.marketSeason} yet, so this is not a value claim.`:`${n}.`}function Oe(e){return{player:e.name||`Player ${e.playerId}`,position:e.position,nflTeam:e.nflTeam,productionSeason:e.productionSeason,productionPoints:e.productionPoints,positionFinish:e.positionFinish,basisSeason:e.basisSeason,basisRound:e.basisRound,keeperSeason:e.marketSeason,keeperRound:e.keeperCost,keeperYear:e.keeperYear,maxKeeperYears:e.maxKeeperYears,marketSeason:e.marketSeason,marketAdp:e.marketAdp,expectedRound:e.marketProjectedRound,roundValue:e.roundValue,standing:e.standing}}function ke(e){return Math.round(Number(e)*10)/10}function Ae(e){let{member:t=null,sleeperUserId:n=null,roster:r=null,players:i=null,draftPicks:a=[],rules:o=null,targetSeason:s=null,keeperRows:c=[],maxKeepers:l=null,market:u=B,production:d=V}=e||{};if(!t)return{state:`no-member`};if(!n)return{state:`no-sleeper-id`,member:t};if(!r)return{state:`no-roster`,member:t,sleeperUserId:n};let f=Array.isArray(r.players)?r.players.map(String):[];if(!f.length)return{state:`no-players`,member:t,sleeperUserId:n,roster:r};let p=Se(ve({playerIds:f,players:i||{},draftPicks:a,sleeperUserId:n,rules:o,targetSeason:s,keeperRows:c,memberId:t?.id,market:u,production:d})),m=k(s),h=ye(p,u);return{state:`ready`,member:t,sleeperUserId:n,roster:r,rules:o,targetSeason:s,maxKeepers:l,keeperRows:c,context:m,positions:x,data:h,market:{available:u.available,source:u.source,scoringFormat:u.scoringFormat,updatedAt:u.updatedAt,freshness:u.freshness},candidates:p,counts:{total:p.length,costKnown:p.filter(e=>e.standing===`eligible`).length,basisKnown:p.filter(e=>e.basisRound!=null).length,noPriorRound:p.filter(e=>e.basisRound==null&&e.class!==H.UNKNOWN).length,unavailable:p.filter(e=>e.standing===`unavailable`).length,needsReview:p.filter(e=>e.reviewNeeded&&e.class!==H.UNKNOWN).length,unknownPlayer:p.filter(e=>e.class===H.UNKNOWN).length,withProduction:p.filter(e=>e.productionPoints!=null).length,withMarket:p.filter(e=>e.marketProjectedRound!=null).length},shortlist:Math.min(p.length,Math.max(3,(Number(l)||0)+2))}}async function je({season:t,onSaved:n=()=>{}}={}){let r=document.createElement(`div`);r.className=`overlay ke-overlay`,r.innerHTML=`
    <div class="overlay-card wide ke-card" role="dialog" aria-modal="true"
         aria-labelledby="ke-title">
      <header class="ke-head">
        <div>
          <span class="eyebrow">Record a keeper</span>
          <h2 id="ke-title">${e(t??``)} keepers</h2>
          <p class="muted tiny" data-ke-rules></p>
        </div>
        <button type="button" class="btn ghost small" data-ke-close>Close</button>
      </header>
      <div class="ke-body" data-ke-body>
        <p class="muted tiny">Loading the league…</p>
      </div>
    </div>`,document.body.appendChild(r);let i=g(r.querySelector(`.ke-card`),{initial:()=>r.querySelector(`[data-ke-search]`)||r.querySelector(`[data-ke-member]`)||r.querySelector(`[data-ke-close]`)}),a=()=>{document.removeEventListener(`keydown`,o),window.removeEventListener(`hashchange`,a),i(),r.remove()},o=e=>{e.key===`Escape`&&a()};document.addEventListener(`keydown`,o),window.addEventListener(`hashchange`,a),r.addEventListener(`click`,e=>{e.target===r&&a()}),r.querySelector(`[data-ke-close]`).addEventListener(`click`,a);let s=r.querySelector(`[data-ke-body]`),c;try{c=await Ne(t)}catch(t){s.innerHTML=`<p class="muted">Could not load the league. ${e(t.message||``)}</p>`;return}let l=I(c.rules),d=M(c.rules,{targetSeason:c.season});r.querySelector(`[data-ke-rules]`).textContent=l?`${t} rules · ${l}${d?` — ${d.text}`:``}`:`No keeper rules are configured for this season`;let f={step:`member`,member:null,pick:null,search:``},p=()=>{f.step===`member`?s.innerHTML=Fe(c):f.step===`player`?s.innerHTML=Ie(c,f):s.innerHTML=ze(c,f),m()};function m(){s.querySelector(`[data-ke-back]`)?.addEventListener(`click`,()=>{f.step=f.step===`review`?`player`:`member`,f.step===`member`&&(f.pick=null),p()}),s.querySelectorAll(`[data-ke-member]`).forEach(e=>{e.addEventListener(`click`,async()=>{f.member=c.members.find(t=>String(t.id)===e.dataset.keMember)||null,f.search=``,f.step=`player`,p(),await Pe(c,f.member),f.step===`player`&&p()})});let e=s.querySelector(`[data-ke-search]`);e&&e.addEventListener(`input`,()=>{f.search=e.value;let t=s.querySelector(`[data-ke-list]`);t&&(t.innerHTML=Le(c,f)),h()}),h();let t=s.querySelector(`[data-ke-form] input[name=round]`);if(t){let e=s.querySelector(`[data-ke-override]`),n=f.pick?.standing?.calculatedRound??null;t.addEventListener(`input`,()=>{let r=Number(t.value),i=n!=null&&Number.isFinite(r)&&r!==n;e.textContent=i?`Override — the rules calculate R${n}. This will be saved as R${r}.`:n==null?`No calculated value — the round you enter is the record.`:`Calculated R${n}. Change it only to overrule the rules.`,e.classList.toggle(`is-override`,i)})}s.querySelector(`[data-ke-form]`)?.addEventListener(`submit`,async e=>{e.preventDefault(),await _(e.currentTarget)}),s.querySelector(`[data-ke-next]`)?.addEventListener(`click`,()=>{f.step=`member`,f.member=null,f.pick=null,p()})}function h(){s.querySelectorAll(`[data-ke-player]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=c.rosters.get(String(f.member.id));f.pick=t?.candidates.find(t=>t.playerId===e.dataset.kePlayer)||null,f.pick&&(f.step=`review`,p())})})}p();async function _(e){let t=e.querySelector(`button[type=submit]`);t.disabled=!0;let r=f.pick,i=Number(e.round.value),a=r.standing.calculatedRound,o=Number.isFinite(i)&&i!==a,l={year:c.season,member_id:f.member.id,player_id:r.playerId,team:f.member.team_name||f.member.display_name,player:r.name||`Player ${r.playerId}`,player_name:r.name||null,player_pos:r.position||null,player_team:r.nflTeam||null,team_snapshot:f.member.team_name||null,basis_round:r.standing.basisRound,basis_season:r.standing.basisSeason,keeper_year:r.standing.keeperYear,calculated_round:a,round_cost:Number.isFinite(i)?i:a,round_overridden:o,rules_season:c.rules?.effective_season??null,notes:e.notes.value.trim()};try{await v(`keepers`,l),u(o?`Saved ${l.player} at R${l.round_cost} (override)`:`Saved ${l.player} at R${l.round_cost}`),c.taken.set(`${c.season}:${r.playerId}`,!0),c.existing.push(l),c.rosters.delete(String(f.member.id)),f.step=`member`,f.member=null,f.pick=null,p(),n()}catch(e){t.disabled=!1,s.querySelector(`[data-ke-error]`).textContent=Me(e)}}}function Me(e){if(e?.code===`23505`)return`That player is already recorded as a keeper this season.`;let t=e?.message||`Could not save that keeper`;return/member_id|player_id|column/.test(t)?`Run keeper_rules_schema.sql then keeper_basis_correction.sql in Supabase to enable keeper entry.`:t}async function Ne(e){let[t,n,i]=await Promise.all([r(),h().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression`).order(`effective_season`,{ascending:!1}),h().from(`keepers`).select(`year, member_id, player_id, player_name, team, player, round_cost`)]),a=i.error?[]:i.data||[],o=new Map;for(let t of a)t.player_id!=null&&Number(t.year)===Number(e)&&o.set(`${e}:${t.player_id}`,!0);return{season:Number(e),members:t,rules:N(n.error?[]:n.data||[],e),existing:a,taken:o,rosters:new Map,players:null}}async function Pe(e,t){let n=String(t.id);if(e.rosters.has(n))return;if(!t.sleeper_user_id){e.rosters.set(n,{season:null,candidates:[],noLink:!0});return}let r=(await h().from(`sleeper_rosters`).select(`season, players, team_name`).eq(`sleeper_user_id`,t.sleeper_user_id).order(`season`,{ascending:!1}).limit(4)).data||[],i=r.find(e=>(e.players||[]).length)||r[0]||null,a=Array.isArray(i?.players)?i.players.map(String):[];if(!a.length){e.rosters.set(n,{season:i?.season??null,candidates:[],empty:!0});return}let[s,c]=await Promise.all([e.players?Promise.resolve(e.players):o().catch(()=>({})),h().from(`sleeper_draft_picks`).select(`season, player_id, round, pick_no, sleeper_user_id`).in(`player_id`,a)]);e.players=s;let l=c.error?[]:c.data||[],u=a.map(n=>{let r=s[n]||null,i=j(l,n,{targetSeason:e.season}),a=L(e.existing,{playerId:n,memberId:t.id,beforeSeason:e.season}),o=A({config:e.rules,targetSeason:e.season,basisRound:i.round,basisSeason:i.season,priorKeeperSeasons:a});return{playerId:n,name:r?.n||null,position:r?.p||``,nflTeam:r?.t||``,basis:i,standing:o,alreadyKept:e.taken.has(`${e.season}:${n}`)}}),d={QB:0,RB:1,WR:2,TE:3};u.sort((e,t)=>(d[e.position]??9)-(d[t.position]??9)||String(e.name||e.playerId).localeCompare(String(t.name||t.playerId))),e.rosters.set(n,{season:i?.season??null,candidates:u})}function Fe(t){return`
    <p class="ke-hint">Choose the member recording a keeper.</p>
    <div class="ke-members">
      ${t.members.map(n=>{let r=t.existing.filter(e=>Number(e.year)===t.season&&String(e.member_id)===String(n.id));return`
        <button type="button" class="ke-member" data-ke-member="${n.id}">
          <span class="ke-member-main">
            <strong>${e(n.display_name)}</strong>
            ${n.team_name?`<span class="muted tiny">${e(n.team_name)}</span>`:``}
          </span>
          <span class="ke-member-state">${r.length?`${r.length} recorded`:`<span class="muted">none yet</span>`}</span>
        </button>`}).join(``)}
    </div>`}function Ie(t,n){let r=t.rosters.get(String(n.member.id));return`
    <div class="ke-step-head">
      <button type="button" class="btn ghost small" data-ke-back>← Members</button>
      <div>
        <strong>${e(n.member.display_name)}</strong>
        ${r?.season?`<span class="muted tiny"> · ${e(r.season)} roster</span>`:``}
      </div>
    </div>
    ${r?``:`<p class="muted tiny">Reading the roster…</p>`}
    ${r?.noLink?`<p class="muted">${e(n.member.display_name)} is not linked to a
      Sleeper account, so there is no roster to choose from. An admin can link it
      on the Admin page.</p>`:``}
    ${r?.empty?`<p class="muted">No synced season has any players on this roster yet.
      Run <strong>Sync Sleeper</strong> on the Admin page.</p>`:``}
    ${r?.candidates?.length?`
      <label class="ke-search">
        <span class="sr-only">Search this roster</span>
        <input type="search" data-ke-search placeholder="Search ${e(n.member.display_name)}’s roster"
               value="${e(n.search)}" autocomplete="off">
      </label>
      <div class="ke-list" data-ke-list>${Le(t,n)}</div>`:``}`}function Le(t,n){let r=t.rosters.get(String(n.member.id)),i=n.search.trim().toLowerCase(),a=(r?.candidates||[]).filter(e=>!i||String(e.name||``).toLowerCase().includes(i)||String(e.position||``).toLowerCase()===i||String(e.nflTeam||``).toLowerCase()===i),o=[[`Available`,a.filter(e=>e.standing.state===`eligible`&&!e.alreadyKept)],[`Needs review`,a.filter(e=>e.standing.state===`review`&&!e.alreadyKept)],[`Unavailable`,a.filter(e=>e.alreadyKept||e.standing.state===`unavailable`||e.standing.state===`no-rules`)]];return a.length?o.filter(([,e])=>e.length).map(([n,r])=>`
    <div class="ke-group">
      <div class="ke-group-head">${e(n)}<span class="count">${r.length}</span></div>
      ${r.map(e=>Re(e,n===`Unavailable`,t.season)).join(``)}
    </div>`).join(``):`<p class="muted tiny">Nobody on this roster matches that search.</p>`}function Re(t,n,r){let i=t.name||`Player ${t.playerId}`,a=[t.position,t.nflTeam].filter(Boolean).join(` · `),o=t.alreadyKept?`Already recorded this season`:t.standing.state===`eligible`?`${t.standing.basisSeason} Draft R${t.standing.basisRound} · ${r} Keeper R${t.standing.calculatedRound} · ${t.standing.finalKeeperYear?`FINAL YEAR`:`Year ${t.standing.keeperYear} of ${t.standing.maxKeeperYears}`}`:t.standing.reason;return`
    <${n?`div`:`button type="button"`} class="ke-player ${n?`is-locked`:``}"
        ${n?``:`data-ke-player="${e(t.playerId)}"`}>
      <span class="ke-player-main">
        <span class="ke-player-name">${e(i)}</span>
        ${a?`<span class="ke-player-where">${e(a)}</span>`:``}
        <span class="ke-player-line">${e(o)}</span>
      </span>
      ${t.standing.calculatedRound!=null&&!t.alreadyKept?`<span class="ke-player-round">R${t.standing.calculatedRound}</span>`:``}
    </${n?`div`:`button`}>`}function ze(t,n){let r=n.pick,i=r.standing,a=r.name||`Player ${r.playerId}`,o=i.calculatedRound;return`
    <div class="ke-step-head">
      <button type="button" class="btn ghost small" data-ke-back>← ${e(n.member.display_name)}’s roster</button>
    </div>
    <form data-ke-form class="ke-review">
      <div class="ke-review-who">
        <strong>${e(a)}</strong>
        <span class="muted tiny">${e([r.position,r.nflTeam].filter(Boolean).join(` · `))}</span>
        <span class="muted tiny">${e(n.member.display_name)}${n.member.team_name?` · ${e(n.member.team_name)}`:``} · ${t.season}</span>
      </div>

      <dl class="ke-facts">
        <div><dt>${e(i.basisSeason??`Previous season`)} DFL draft</dt><dd>${i.basisRound==null?`<span class="muted">not found</span>`:`Round ${i.basisRound}`}</dd></div>
        <div><dt>Keeper year</dt><dd>${i.keeperYear==null?`<span class="muted">—</span>`:`${i.keeperYear} of ${i.maxKeeperYears}${i.finalKeeperYear?` · final`:``}`}</dd></div>
        <div><dt>${e(t.season)} keeper cost</dt><dd>${o==null?`<span class="muted">not calculable</span>`:`Round ${o}`}</dd></div>
      </dl>

      ${i.basisRound==null?`<p class="ke-warn">${e(i.reason)}. Enter the keeper
        round yourself to record this one.${r.basis.otherSeasons.length?` For reference only, this league drafted them in
              ${e(r.basis.otherSeasons.map(e=>`${e.season} R${e.round}`).join(`, `))} —
              none of which is the ${e(i.basisSeason??``)} basis.`:``}</p>`:``}

      <label class="ke-field">
        <span>Keeper round</span>
        <input name="round" type="number" min="1" max="40" inputmode="numeric"
               value="${o??``}" required>
        <small class="muted tiny" data-ke-override>${o==null?`No calculated value — the round you enter is the record.`:`Calculated R${o}. Change it only to overrule the rules.`}</small>
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
    </form>`}var{BG:Be,CARD:Ve,LINE:He,INK:Ue,MUTED:We,GOLD:Ge,ACCENT:Ke,BRAND_RED:qe,BRAND_YELLOW:Je}=D;function Ye({season:e,members:t=[],keeperRows:n=[],players:r={},rules:i=null}){let a=Number(e),o=(n||[]).filter(e=>Number(e.year??e.season)===a),s=new Map(t.map(e=>[String(e.id),[]])),c=new Map;for(let e of t)for(let t of[e.team_name,e.display_name,...e.team_name_aliases||[]])if(t){let n=String(t).trim().toLowerCase(),r=String(e.id);c.set(n,c.has(n)&&c.get(n)!==r?null:r)}let l=e=>{let n=String(e||``).trim().toLowerCase();if(n.length<3)return null;let r=t.filter(e=>[e.display_name,e.team_name,...e.team_name_aliases||[]].some(e=>String(e||``).trim().toLowerCase().startsWith(n)));return r.length===1?String(r[0].id):null},u=[];for(let e of o){let t=e.member_id==null?null:String(e.member_id);if(!t||!s.has(t)){let n=String(e.team||``).trim().toLowerCase();t=c.get(n)||l(n)}t&&s.has(t)?s.get(t).push(e):u.push(e)}let d=i?.max_keeper_seasons??null,f=e=>{let t=e.player_id==null?null:r[String(e.player_id)],i=e.player_pos||t?.p||``,o=e.player_team||t?.t||``;return{id:e.player_id==null?``:String(e.player_id),position:i,name:e.player_name||e.player||`—`,where:[i,o].filter(e=>e&&e!==`FA`).join(` · `),round:e.round_cost==null?null:Number(e.round_cost),legacy:e.player_id==null,overridden:e.round_overridden===!0,tenure:e.player_id==null?null:P(n,{playerId:e.player_id,memberId:e.member_id,season:a,max:d})}},p=t.map(e=>({member:e.display_name||``,team:e.team_name||``,keepers:(s.get(String(e.id))||[]).map(f)}));return{season:a,rows:p,also:u.map(f),submitted:p.filter(e=>e.keepers.length).length,total:p.length,rulesLine:I(i)}}function q(e){return e?[`DFL ${e.season} keepers — ${e.submitted} of ${e.total} submitted`,...e.rows.map(e=>{let t=e.team||e.member;return e.keepers.length?`${t}: ${e.keepers.map(e=>{let t=e.round==null?``:` (R${e.round})`,n=e.tenure?.max?` yr ${e.tenure.year}/${e.tenure.max}`:``;return`${e.name}${t}${n}`}).join(`, `)}`:`${t}: no keeper submitted`})].join(`
`):``}function Xe(e){return O(E(e))}function Ze(e){if(!e||!e.total)return T({title:`DFL HQ — Keepers`,text:q(e),url:location.href})===`copied`?`Copied to the clipboard`:`Sharing…`;try{let t=Xe(e);return w(t,`dfl-keepers-${e.season}.png`,{title:`DFL HQ — ${e.season} keepers`,text:q(e)})===`saved`?`Saved the keeper board to your downloads`:`Sharing…`}catch(t){return console.warn(`keeper board: falling back to text`,t),T({title:`DFL HQ — ${e.season} keepers`,text:q(e),url:location.href})===`copied`?`Copied to the clipboard`:`Sharing…`}}var J=null;async function Y(e){let[n,i]=await Promise.all([_(`keepers`,{order:`team`,asc:!0}),r().catch(()=>[])]),s=await h().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression`).then(e=>e.error?[]:e.data||[],()=>[]);if(!n.length){e.innerHTML=`
      <header class="page-head"><h1>Keepers</h1></header>
      <div data-advisor-host></div>
      <div id="keeper-body">
        ${b(`No keepers recorded yet.`)}
        ${l()?`<div class="row-end ke-actions">
           <button type="button" class="btn" data-keeper-entry>Add keeper</button>
           ${y(`keepers`,`Add by hand`)}
         </div>`:``}
      </div>`,a(e.querySelector(`#keeper-body`),()=>Y(e)),e.addEventListener(`click`,t=>{t.target.closest(`[data-keeper-entry]`)&&je({season:new Date().getFullYear(),onSaved:()=>Y(e)})}),X(e);return}let c=[...new Set(n.map(e=>e.year))].sort((e,t)=>t-e);c.includes(J)||(J=c[0]),e.innerHTML=`
    <header class="page-head">
      <h1>Keepers</h1>
      <p class="page-sub" id="keeper-count"></p>
    </header>

    <div data-advisor-host></div>

    <h2 class="section-title">League keepers</h2>
    <div class="tabs" id="year-tabs">
      ${c.map(e=>`<button data-year="${e}" class="${e===J?`on`:``}">${e}</button>`).join(``)}
    </div>
    <div id="keeper-body"></div>
  `;let d=e.querySelector(`#keeper-body`),f=e.querySelector(`#keeper-count`),p=()=>{let e=n.filter(e=>e.year===J),r=t(e,`team`).size;f.textContent=e.length?`${J} · ${e.length} keeper${e.length===1?``:`s`} across ${r} team${r===1?``:`s`}`:`${J} · nothing recorded`;let a=N(s,J)?.max_keeper_seasons??F.max_keeper_seasons;d.innerHTML=st(e,a,i)+`<div class="row-end ke-actions">
           <button type="button" class="btn ghost small" data-keeper-share>Share keeper board</button>
           ${l()?`<button type="button" class="btn" data-keeper-entry>Add keeper</button>
             ${y(`keepers`,`Add by hand`,{year:J})}`:``}
         </div>`};e.querySelector(`#year-tabs`).addEventListener(`click`,t=>{let n=t.target.closest(`button[data-year]`);n&&(J=Number(n.dataset.year),e.querySelectorAll(`#year-tabs button`).forEach(e=>e.classList.toggle(`on`,Number(e.dataset.year)===J)),p())}),a(d,()=>Y(e)),e.addEventListener(`click`,t=>{t.target.closest(`[data-keeper-entry]`)&&je({season:J,onSaved:()=>Y(e)})});let m=null;(async()=>{try{let e=await r(),t=n.filter(e=>e.player_id!=null).map(e=>String(e.player_id)),i=n.some(e=>e.player_id!=null&&!e.player_pos)&&t.length?await o().catch(()=>({})):{},a=await h().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression`);m={members:e,players:i,ruleSets:a.error?[]:a.data||[]}}catch{m={members:[],players:{},ruleSets:[]}}})(),e.addEventListener(`click`,e=>{if(!e.target.closest(`[data-keeper-share]`))return;if(!m){u(`Still reading the league — try again in a moment`);return}let t=Ye({season:J,members:m.members,keeperRows:n,players:m.players,rules:N(m.ruleSets,J)});u(Ze(t))}),p(),X(e)}async function X(t){let n=t.querySelector(`[data-advisor-host]`);if(!n)return;let r=i();if(!r){n.innerHTML=Z(Q({state:`no-member`}));return}if(!r.sleeper_user_id){n.innerHTML=Z(Q({state:`no-sleeper-id`,member:r}),r);return}n.innerHTML=Z(`<p class="muted tiny">Reading your roster, last season and the draft board…</p>`,r);let a;try{a=await $e(r)}catch(t){n.innerHTML=Z(`<p class="muted tiny">Could not read your roster. ${e(t.message||``)}</p>`,r);return}n.innerHTML=Z(Q(a),r),await Qe(n,a,r)}async function Qe(e,t,n){let r=t?.context?.targetSeason;if(!r||!e)return;let i=null;try{i=await re(r)}catch{return}if(!i)return;e.parentElement?.querySelectorAll(`[data-keeper-self-host]`).forEach(e=>e.remove());let a=document.createElement(`div`);a.dataset.keeperSelfHost=`1`,e.insertAdjacentElement(`afterend`,a);let o=async()=>{let e=[];try{e=await ie(r,i.member_id)}catch{e=[]}let n=ae(t.candidates||[]);return a.innerHTML=le({season:r,status:i,mine:e,options:n,keeperRows:t.keeperRows||[],maxKeeperSeasons:t.rules?.max_keeper_seasons??F.max_keeper_seasons}),n},s=await o();ue(a,{season:r,memberId:i.member_id,options:s,onSaved:async()=>{try{i=await re(r)||i}catch{}await o(),Y(document.getElementById(`view`)||document.body)}})}async function $e(e){let t=e.sleeper_user_id,[n,r,i,a]=await Promise.all([h().from(`sleeper_rosters`).select(`season, players, team_name, synced_at`).eq(`sleeper_user_id`,t).order(`season`,{ascending:!1}).limit(4),h().from(`sleeper_leagues`).select(`season, max_keepers, status, scoring_settings`).order(`season`,{ascending:!1}).limit(1),h().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression, updated_at`).order(`effective_season`,{ascending:!1}),h().from(`keepers`).select(`year, member_id, player_id, player_name, team, player, round_cost`)]),s=n.data||[],l=s.find(e=>(e.players||[]).length)||s[0]||null,u=(r.data||[])[0]||null,d=r.error?null:u?.max_keepers??null,f=r.error?null:u?.scoring_settings||null,m=u?.season??null,g=k(m),_=i.error?[]:i.data||[],v=N(_,m),y=a.error?[]:a.data||[],b=Array.isArray(l?.players)?l.players.map(String):[],x=((g.draftBasisSeason==null?{data:[]}:await h().from(`sleeper_rosters`).select(`roster_id`).eq(`season`,g.draftBasisSeason)).data||[]).length||null,C=ee(f),[w,T,E,D]=await Promise.all([b.length?o().catch(()=>({})):Promise.resolve({}),b.length?h().from(`sleeper_draft_picks`).select(`season, player_id, round, pick_no, sleeper_user_id`).in(`player_id`,b):Promise.resolve({data:[]}),b.length&&f?c(g.productionSeason).catch(()=>({data:{},fetchedAt:0})):Promise.resolve({data:{},fetchedAt:0}),b.length?p(g.marketSeason,C).catch(()=>({data:[],fetchedAt:0})):Promise.resolve({data:[],fetchedAt:0})]),O=E.data||{},A=f?te({stats:O,players:w,scoringSettings:f}):new Map,j=f?S({playerIds:b,stats:O,players:w,scoringSettings:f}):new Map,M=new Map;for(let e of b){let t=A.get(e),n=j.get(e);t?M.set(e,{...t,games:n?.games??null}):n?.points!=null&&M.set(e,{...n,positionRank:null,label:null})}let P=me(D.data||[],{leagueSize:x,scoringFormat:C,season:g.marketSeason}),F=P.length?z(P):B;return{...Ae({member:e,sleeperUserId:t,roster:l,players:w,draftPicks:T.error?[]:T.data||[],rules:v,targetSeason:m,keeperRows:y,maxKeepers:d,market:F,production:M.size?M:V}),needsDraftSync:!!T.error,needsRulesMigration:!!i.error,needsScoring:!f,leagueSize:x,scoringFormat:C,leagueSeason:u?.season??null,rosterSeason:l?.season??null}}function Z(t,n){return`
    <section class="card keeper-advisor" data-collapse="keeper-advisor"
             data-collapse-title="Keeper advisor"${n?` data-collapse-badge="${e(n.display_name)}"`:``}>
      ${t}
    </section>`}function Q(t){if(t.state===`no-member`)return`<p class="muted">Pick your name in the top right and this will show your
      own keeper options.</p>`;if(t.state===`no-sleeper-id`)return`<p class="muted">${e(t.member.display_name)} is not linked to a Sleeper
      account yet, so there is no roster to read. An admin can link it on the
      Admin page.</p>`;if(t.state===`no-roster`)return`<p class="muted">No roster has been synced for you yet. An admin can run
      <strong>Sync Sleeper</strong> on the Admin page.</p>`;if(t.state===`no-players`)return`<p class="muted">No synced season has any players on your roster yet. An
      admin can run <strong>Sync Sleeper</strong> on the Admin page.</p>`;let{candidates:n,counts:r,rules:i,context:a,shortlist:o,market:s}=t,c=n[0]?.standing===`eligible`?n[0]:null,l=+!!c,u=n.slice(l,o),d=n.slice(o);return`
    ${et(c,n,t)}

    ${nt(i,a)}
    ${rt(s)}

    <ol class="ka-list" start="${l+1}" ${u.length?``:`hidden`}>
      ${u.map((e,t)=>at(e,l+t+1,n)).join(``)}
    </ol>

    ${d.length?`
      <div class="ka-more" data-collapse="keeper-compare" data-collapse-default="folded"
           data-collapse-title="Compare all ${r.total}"
           data-collapse-badge="${d.length} more">
        ${ot(n,a)}
      </div>`:``}

    ${it(t).map(e=>`<p class="ka-blocker">${e}</p>`).join(``)}`}function et(t,n,r){if(!t)return``;let i=Ce(t,n),a=i.find(e=>tt.has(e))||null,o=i.filter(e=>e!==a),s=Ee(t);return`
    <div class="ka-lead-card">
      ${a?`<span class="ka-headline">${e(a)}</span>`:``}
      <p class="ka-lead-who"><strong>${e(t.name||`Player ${t.playerId}`)}</strong>
        <span class="ka-where">${e([t.position,t.nflTeam].filter(Boolean).join(` · `))}</span></p>
      <dl class="ka-facts">
        ${s.map(t=>`<div><dt>${e(t.label)}</dt><dd>${e(t.value)}</dd></div>`).join(``)}
      </dl>
      <p class="ka-why-long">${e(De(t))}</p>
      ${o.length?`<span class="ka-badges">${o.map(t=>`<span class="pill tiny ${$.has(t)?`is-call`:``}">${e(t)}</span>`).join(``)}</span>`:``}
    </div>`}var tt=new Set([K.BEST_VALUE,K.BEST_PLAYER,K.SAFE_CHOICE,K.FINAL_YEAR,K.VALUE_PLAY]),$=new Set([...tt,K.POOR_VALUE]);function nt(t,n){let r=I(t);return r?`<p class="ka-rules">${e(n.targetSeason??``)} keeper rules ·
    ${e(r)}</p>`:``}function rt(t){if(!t?.available)return``;let n=t.freshness;return`<p class="ka-source ${n?.stale?`is-stale`:``}">${e(t.source||`Market`)}
    ${t.scoringFormat?`· ${e(t.scoringFormat.replace(`_`,` `))}`:``}
    ${n?.label?`· ${e(n.label)}`:``}</p>`}function it(t){let{context:n,rules:r}=t,i=[];return t.needsRulesMigration?i.push(`Keeper rules are not switched on yet. Run
      <strong>keeper_rules_schema.sql</strong> in the Supabase SQL editor.`):r||i.push(`No keeper rules are configured for ${e(n.targetSeason??`this season`)},
      so no keeper cost is shown.`),t.needsDraftSync&&i.push(`Draft rounds are missing. Run <strong>sleeper_draft_schema.sql</strong>,
      then <strong>Sync Sleeper</strong>.`),t.needsScoring&&i.push(`This league's scoring settings have not been synced, so
      ${e(n.productionSeason)} points cannot be worked out. Run
      <strong>Sync Sleeper</strong> on the Admin page.`),i}function at(t,n,r){let i=Ce(t,r),a=t.name||`Player ${t.playerId}`,o=[t.position,t.nflTeam].filter(Boolean).join(` · `),s=t.keeperCost==null?`<span class="ka-cost none" title="${t.standing===`unavailable`?`Not eligible under the configured rules`:`No ${t.basisSeason??`previous season`} draft round on record`}">—</span>`:`<span class="ka-cost">R${t.keeperCost}</span>`;return`
    <li class="ka-row ${t.class===H.UNKNOWN?`is-unknown`:``} ${t.standing===`unavailable`?`is-unavailable`:``}">
      <span class="ka-n" aria-hidden="true">${n}</span>
      <span class="ka-main">
        <span class="ka-name">${e(a)}</span>
        ${o?`<span class="ka-where">${e(o)}</span>`:``}
        <span class="ka-why">${Ee(t).map(t=>`<span class="ka-fact"><b>${e(t.label)}</b> ${e(t.value)}</span>`).join(``)}</span>
        ${i.length?`<span class="ka-badges">${i.map(t=>`<span class="pill tiny ${$.has(t)?`is-call`:``}">${e(t)}</span>`).join(``)}</span>`:``}
      </span>
      ${s}
    </li>`}function ot(t,n){let r=t.map(Oe),i=(e,t=0)=>e==null?`—`:Number(e).toFixed(t);return`
    <div class="ka-table-wrap">
      <table class="ka-table">
        <thead>
          <tr>
            <th>Player</th><th>Pos</th>
            <th class="num">${e(n.productionSeason)} Pts</th>
            <th>${e(n.productionSeason)} Finish</th>
            <th class="num">${e(n.draftBasisSeason)} Draft</th>
            <th class="num">${e(n.targetSeason)} Keeper</th>
            <th class="num">${e(n.marketSeason)} ADP</th>
            <th class="num">${e(n.marketSeason)} Exp.</th>
            <th class="num">Value</th>
            <th>Keeper year</th>
          </tr>
        </thead>
        <tbody>
          ${r.map(t=>`
            <tr class="${t.standing===`unavailable`?`is-unavailable`:``}">
              <td>${e(t.player)}</td>
              <td>${e(t.position)}</td>
              <td class="num">${i(t.productionPoints,1)}</td>
              <td>${e(t.positionFinish||`—`)}</td>
              <td class="num">${t.basisRound==null?`—`:`R${t.basisRound}`}</td>
              <td class="num">${t.keeperRound==null?`—`:`R${t.keeperRound}`}</td>
              <td class="num">${i(t.marketAdp,1)}</td>
              <td class="num">${t.expectedRound==null?`—`:`R${t.expectedRound}`}</td>
              <td class="num ${t.roundValue!=null&&t.roundValue>0?`is-plus`:``}">${t.roundValue==null?`—`:t.roundValue>0?`+${t.roundValue}`:t.roundValue}</td>
              <td>${t.keeperYear!=null&&t.maxKeeperYears!=null?`${t.keeperYear} of ${t.maxKeeperYears}`:`—`}</td>
            </tr>`).join(``)}
        </tbody>
      </table>
    </div>`}function st(r,i,a){let o=n(`keepers`,r);return o.length?`
    <div class="card keepcard">
      <div class="kp-head" aria-hidden="true">
        <span>Team</span><span>Keeper</span><span>Held</span><span class="kp-r">Round</span>
      </div>
      ${[...t(o,`team`).entries()].sort((e,t)=>e[0].localeCompare(t[0])).map(([t,n])=>n.map((n,r)=>`
        <div class="kp-row ${r===0?`kp-new`:``} ${f(`keepers`,n)}">
          <span class="kp-team">${r===0?e(m(t,a,{member_id:n.member_id})):``}</span>
          <span class="kp-player">
            ${e(n.player)}
            ${n.notes?`<span class="kp-note">${e(n.notes)}</span>`:``}
          </span>
          ${ct(n,i)}
          <span class="kp-cost ${n.round_cost==null?`none`:``}">${n.round_cost==null?`—`:`${e(n.round_cost)}`}</span>
          ${d(`keepers`,n,{compact:!0})}
        </div>`).join(``)).join(``)}
    </div>`:b(`No keepers for this year.`)}function ct(t,n){let r=Number(t.keeper_year),i=Number(t.year);if(!Number.isFinite(r)||r<1)return`<span class="kp-held none">—</span>`;let a=Number.isFinite(i)?i-r+1:null,o=Math.max(0,(n??F.max_keeper_seasons)-r);return`
    <span class="kp-held">
      ${a==null?``:`<span class="kp-since">${e(a)}</span>`}
      <span class="kp-left ${o===0?`is-final`:``}">${o===0?`final`:`${o} left`}</span>
    </span>`}export{Y as render};