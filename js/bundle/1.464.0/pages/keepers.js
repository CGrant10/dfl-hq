import{Br as e,Cn as t,F as n,Fr as r,I as i,Kt as a,Ln as o,M as s,N as c,P as l,Qt as u,Ut as d,Vn as f,Y as p,Yn as m,j as h,jr as g,kr as _,sr as v,wn as y,xn as b}from"../app-core-CTtESypU.js";import{Ir as x,Lr as S,Mr as C,Nr as w,Pr as T,_n as E,fn as D,gn as O,hn as ee,yn as k}from"../home-core-DKIyeBE4.js";import{a as A,c as j,d as M,f as N,i as P,l as F,n as I,s as L,u as te}from"../keeper-rules-iB5MCYxx.js";var ne=/keeper_self_status|keeper_set_self|keeper_clear_self|does not exist|not find the function|schema cache/i;async function re(e){try{let{data:t,error:n}=await o().rpc(`keeper_self_status`,{target_season:Number(e)});if(n)throw n;return(Array.isArray(t)?t[0]:t)||null}catch(e){if(ne.test(e?.message||``))return null;throw e}}async function ie(e,t){if(!t)return[];let{data:n,error:r}=await o().from(`keepers`).select(`id,player_id,player_name,player_pos,player_team,round_cost,basis_round,basis_season,self_submitted,created_at`).eq(`year`,Number(e)).eq(`member_id`,t).order(`created_at`,{ascending:!1});if(r)throw r;return n||[]}function ae(e=[]){return e.filter(e=>e.standing===`eligible`&&e.keeperCost!=null)}function oe(e){return`${e.basisSeason&&e.basisRound?`${e.basisSeason} R${e.basisRound}`:`no draft round`} → R${e.keeperCost}`}function se(e){if(!e||!e.max)return``;let t=Array.from({length:e.max},(t,n)=>`<i class="${n<e.year?`is-used`:``}"></i>`).join(``),n=e.left===0?`final season`:`${e.left} season${e.left===1?``:`s`} left`;return`<span class="ks-tenure ${e.final?`is-final`:``}">
    <span class="ks-pips" aria-hidden="true">${t}</span>
    <b>Year ${e.year}/${e.max}</b>
    <em>${g(n)}${e.firstSeason?` · kept since ${e.firstSeason}`:``}</em>
  </span>`}function ce(e,t,{keeperRows:n=[],maxKeeperSeasons:r=null,memberId:i=null}={}){return e.length?`<ul class="ks-mine">${e.map(e=>{let a=F(n,{playerId:e.player_id,memberId:i,season:t,max:r});return`
    <li>
      <div class="ks-line">
        <strong>${g(e.player_name||e.player_id)}</strong>
        ${e.player_pos?`<span class="ks-pos">${g(e.player_pos)}</span>`:``}
        <span class="ks-cost">R${e.round_cost??`—`}</span>
      </div>
      ${se(a)}
      <div class="ks-line ks-sub">
        ${e.basis_season&&e.basis_round?`<span class="ks-basis">from ${e.basis_season} R${e.basis_round}</span>`:``}
        ${e.self_submitted===!1?`<span class="ks-basis">entered by the commissioner &middot; you can change it</span>`:``}
      </div>
    </li>`}).join(``)}</ul>`:`<p class="ks-none">You have not chosen a keeper for ${t} yet.</p>`}function le({season:e,status:t,mine:n=[],options:r=[],keeperRows:i=[],maxKeeperSeasons:a=null}){if(!t)return``;let o=t.member_id?p(t.member_id):null,s=!!t.needs_pin&&!o;if(!t.member_id)return`<section class="card keeper-self"><div class="card-body">
      <h3 class="card-heading">Your ${e} keeper</h3>
      <p class="muted">Pick your name in the top right to choose your keeper.</p>
    </div></section>`;if(t.locked)return`<section class="card keeper-self is-locked"><div class="card-body">
      <h3 class="card-heading">Your ${e} keeper</h3>
      ${ce(n,e,{keeperRows:i,maxKeeperSeasons:a,memberId:t.member_id})}
      <p class="ks-locked">Keepers for ${e} are locked. Ask the commissioner if
        something is wrong.</p>
    </div></section>`;let c=Number(t.max_keepers)||1,l=Number(t.used_slots)||0;return`<section class="card keeper-self"><div class="card-body">
    <h3 class="card-heading">Your ${e} keeper</h3>
    ${ce(n,e,{keeperRows:i,maxKeeperSeasons:a,memberId:t.member_id})}

    ${r.length?`
      <form class="ks-form" data-keeper-self-form autocomplete="off">
        <label for="ks-player">${l>=c&&c===1?`Change to`:`Keep`}</label>
        <select id="ks-player" name="player" required>
          <option value="">Choose a player…</option>
          ${r.map(e=>`
            <option value="${g(e.playerId)}"
                    data-name="${g(e.name||``)}"
                    data-pos="${g(e.position||``)}"
                    data-team="${g(e.nflTeam||``)}">
              ${g(e.name||e.playerId)}${e.position?` (${g(e.position)})`:``} — ${g(oe(e))}
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
      ${c>1?`<p class="muted tiny">The league allows ${c} keepers.
        Choosing more than that replaces your oldest.</p>`:``}
    `:`
      <p class="muted tiny">None of the players on your roster can be priced automatically
        yet - the ${e-1} draft round is missing for them. The commissioner enters
        those by hand.</p>`}
  </div></section>`}function ue(t,{season:n,memberId:r=null,options:i=[],onSaved:a=()=>{}}={}){if(!t)return;let s=new Map(i.map(e=>[String(e.playerId),e])),c=(t,n)=>{let r=t.querySelector(`[data-keeper-self-error]`);r?r.textContent=n:e(n,!0)};t.addEventListener(`submit`,async t=>{let i=t.target.closest(`[data-keeper-self-form]`);if(!i)return;t.preventDefault();let l=i.querySelector(`button[type="submit"]`),u=i.querySelector(`[data-keeper-self-error]`);u&&(u.textContent=``);let d=i.player?.value,f=s.get(String(d));if(!f){c(i,`Choose a player first.`);return}l.disabled=!0;try{let{error:t}=await o().rpc(`keeper_set_self`,{target_season:Number(n),pick_player_id:String(f.playerId),pick_name:f.name||null,pick_pos:f.position||null,pick_nfl_team:f.nflTeam||null,attempted_pin:i.pin?.value||p(r)||null});if(t)throw t;e(`${f.name||`Your keeper`} saved`),a()}catch(e){l.disabled=!1,c(i,e?.message||`That could not be saved.`)}}),t.addEventListener(`click`,async t=>{let i=t.target.closest(`[data-keeper-self-clear]`);if(!i)return;let s=i.closest(`[data-keeper-self-form]`);if(confirm(`Remove your ${n} keeper?`)){i.disabled=!0;try{let{error:t}=await o().rpc(`keeper_clear_self`,{target_season:Number(n),attempted_pin:s?.pin?.value||p(r)||null});if(t)throw t;e(`Your keeper was removed`),a()}catch(e){i.disabled=!1,c(s,e?.message||`That could not be removed.`)}}})}var de=900;function fe(e,t){let n=Number(e),r=Number(t);return!Number.isFinite(n)||n<=0||!Number.isFinite(r)||r<2?null:Math.ceil(n/r)}function pe(e,t){let n=e=>e==null||e===``?NaN:Number(e),r=n(e),i=n(t);return!Number.isFinite(r)||!Number.isFinite(i)?null:r-i}function R(e){return e==null?null:e===0?`0 rounds`:`${e>0?`+`:`−`}${Math.abs(e)} ${Math.abs(e)===1?`round`:`rounds`}`}function me(e=[],{leagueSize:t,scoringFormat:n=`ppr`,season:r=null}={}){let i=`adp_${n}`,a=r?`Sleeper ADP · ${r}`:`Sleeper ADP`,o=[];for(let t of e||[]){if(!t||t.player_id==null)continue;let e=String(t.player?.position||``).toUpperCase();if(!w(e))continue;let n=Number(t.stats?.[i]);if(!Number.isFinite(n)||n<=0||n>=de)continue;let r=Number(t.last_modified??t.updated_at);o.push({playerId:String(t.player_id),position:e,adp:n,updatedMs:Number.isFinite(r)?r:null})}o.sort((e,t)=>e.adp-t.adp||e.playerId.localeCompare(t.playerId));let s=new Map;return o.map((e,r)=>{let i=(s.get(e.position)||0)+1;return s.set(e.position,i),{playerId:e.playerId,rank:r+1,positionRank:i,adp:e.adp,projectedRound:fe(e.adp,t),position:e.position,source:a,scoringFormat:n,updatedAt:e.updatedMs?new Date(e.updatedMs).toISOString():null}})}function he(e,{now:t=Date.now(),staleAfterDays:n=4}={}){let r=e?Date.parse(e):NaN;if(!Number.isFinite(r))return{updatedAt:null,ageDays:null,stale:!1,unknown:!0,label:null};let i=Math.floor((Number(t)-r)/864e5),a=new Date(r).toLocaleDateString(void 0,{month:`short`,day:`numeric`});return{updatedAt:e,ageDays:i,unknown:!1,stale:i>=n,label:i>=n?`Updated ${a} · may be stale`:`Updated ${a}`}}function z(e=[],{now:t=Date.now()}={}){let n=new Map;for(let t of e)t&&t.playerId!=null&&n.set(String(t.playerId),t);let r=e[0]||null;return{available:n.size>0,get:e=>n.get(String(e))||null,source:r?.source||null,scoringFormat:r?.scoringFormat||null,updatedAt:r?.updatedAt||null,freshness:he(r?.updatedAt||null,{now:t}),size:n.size}}var B=z([]),V=new Map,H={KNOWN:`cost-known`,NO_COST:`cost-unknown`,NO_ROUND:`no-prior-round`,UNKNOWN:`unknown-player`},U={QB:12,RB:24,WR:30,TE:12};function ge(e){if(e==null||e===``)return null;let t=Number(e);return Number.isFinite(t)&&t>=1?t:null}function _e(e,t){let n=U[String(e||``).toUpperCase()],r=ge(t);return!n||r==null?!1:r<=n}function ve({playerIds:e=[],players:t={},draftPicks:n=[],sleeperUserId:r=null,rules:i=null,targetSeason:a=null,keeperRows:o=[],memberId:s=null,market:c=B,production:l=V}){let u=A(a);return e.map(String).filter(e=>{let n=t[e];return!n||w(n.p)}).map(e=>{let d=t[e]||null,f=c.get(e),p=l.get?.(e)||null,m=d?.n||null,h=d?.p||``,g=d?.t||``,_=d?!g||g===`FA`:!1,v=M(n,e,{targetSeason:a}),y=n.find(t=>t&&String(t.player_id)===e&&Number(t.season)===u.draftBasisSeason)||null,b=y&&r!=null?String(y.sleeper_user_id)===String(r):null,x=te(o,{playerId:e,memberId:s,beforeSeason:a}),S=j({config:i,targetSeason:a,basisRound:v.round,basisSeason:v.season,priorKeeperSeasons:x}),C;C=d?S.state===`eligible`?H.KNOWN:v.round==null?H.NO_ROUND:H.NO_COST:H.UNKNOWN;let w=f?.projectedRound??null,T=pe(S.calculatedRound,w);return{playerId:e,name:m,position:h,nflTeam:g,freeAgent:_,basisRound:v.round,basisSeason:v.season,basisFound:v.found,basisReason:v.reason,basisOtherSeasons:v.otherSeasons,draftedByMe:b,draftPickNo:y?Number(y.pick_no):null,priorKeeperSeasons:x,class:C,keeperCost:S.calculatedRound,keeperYear:S.keeperYear,maxKeeperYears:S.maxKeeperYears,finalKeeperYear:S.finalKeeperYear,standing:S.state,standingReason:S.reason,reviewNeeded:S.reviewNeeded,productionSeason:u.productionSeason,productionPoints:p?.points??null,productionGames:p?.games??null,positionRank:p?.positionRank??null,positionFinish:p?.label??null,strongProduction:_e(h,p?.positionRank),marketSeason:u.marketSeason,marketAdp:f?.adp??null,marketRank:f?.rank??null,marketPositionRank:f?.positionRank??null,marketProjectedRound:w,strongMarket:_e(h,f?.positionRank),roundValue:T,roundValueLabel:R(T),atFloor:S.calculatedRound!=null&&S.calculatedRound<=1}})}function ye(e=[],t=B){let n=e.some(e=>e.productionPoints!=null),r=t.available&&e.some(e=>e.marketProjectedRound!=null);return n&&r?{level:1,name:`full`,hasProduction:n,hasMarket:r}:n?{level:2,name:`no-market`,hasProduction:n,hasMarket:r}:r?{level:3,name:`no-production`,hasProduction:n,hasMarket:r}:{level:4,name:`facts-only`,hasProduction:n,hasMarket:r}}var be=4,xe=24;function W(e,t){let n=ge(t);if(n==null)return 0;let r=U[String(e||``).toUpperCase()]||0;if(!r)return 0;let i=r-n+1;return i<=0?0:Math.round(i/r*xe)}function G(e){return(e.roundValue==null?0:e.roundValue*be)+W(e.position,e.positionRank)+W(e.position,e.marketPositionRank)}function Se(e=[]){let t=e=>e.standing===`unavailable`?3:e.class===H.KNOWN?0:e.class===H.UNKNOWN?2:1;return[...e].sort((e,n)=>t(e)-t(n)||(e.freeAgent===n.freeAgent?G(n)-G(e)||(e.keeperCost!=null&&n.keeperCost!=null&&e.keeperCost!==n.keeperCost?n.keeperCost-e.keeperCost:String(e.name||e.playerId).localeCompare(String(n.name||n.playerId))):e.freeAgent?1:-1))}var K={BEST_VALUE:`BEST VALUE`,BEST_PLAYER:`BEST PLAYER`,SAFE_CHOICE:`SAFE CHOICE`,VALUE_PLAY:`VALUE PLAY`,FINAL_YEAR:`FINAL-YEAR VALUE`,POOR_VALUE:`POOR VALUE`,LIMIT_REACHED:`Keeper limit reached`,NEEDS_REVIEW:`Needs review`,RETURNING:`You drafted them`,ACQUIRED:`Acquired, not drafted`,NOT_ON_NFL:`Not on an NFL roster`,UNKNOWN_ID:`Not in the Sleeper player list`};function Ce(e,t=[]){if(e.class===H.UNKNOWN)return[K.UNKNOWN_ID];let n=[],r=t.filter(e=>e.standing===`eligible`),i=r.filter(e=>e.roundValue!=null).filter(e=>e.roundValue>=2&&e.strongProduction);i.length&&e.playerId===Te(i,e=>-(e.roundValue*1e3+G(e)))&&n.push(K.BEST_VALUE);let a=r.filter(e=>e.marketRank!=null||e.positionRank!=null);return e.standing===`eligible`&&a.length>1&&e.playerId===Te(a,we)&&n.push(K.BEST_PLAYER),e.standing===`eligible`&&e.strongProduction&&e.strongMarket&&e.roundValue!=null&&(e.roundValue>0||e.atFloor&&e.roundValue>=0)&&n.push(K.SAFE_CHOICE),e.standing===`eligible`&&e.roundValue!=null&&e.roundValue>=2&&!e.strongProduction&&n.push(K.VALUE_PLAY),e.standing===`eligible`&&e.finalKeeperYear&&e.roundValue!=null&&e.roundValue>0&&n.push(K.FINAL_YEAR),e.standing===`eligible`&&e.roundValue!=null&&e.roundValue<0&&!e.atFloor&&!e.strongProduction&&n.push(K.POOR_VALUE),e.standing===`unavailable`&&n.push(K.LIMIT_REACHED),e.reviewNeeded&&n.push(K.NEEDS_REVIEW),e.draftedByMe===!0&&n.push(K.RETURNING),e.draftedByMe===!1&&n.push(K.ACQUIRED),e.freeAgent&&n.push(K.NOT_ON_NFL),n}function we(e){if(e.marketRank!=null)return e.marketRank;let t=W(e.position,e.positionRank);return t?1e3-t:9999}function Te(e,t){let n=null,r=1/0;for(let i of[...e].sort((e,t)=>String(e.playerId).localeCompare(String(t.playerId)))){let e=t(i);e<r&&(r=e,n=i)}return n?.playerId??null}function Ee(e){if(e.class===H.UNKNOWN)return[{label:`Player`,value:K.UNKNOWN_ID}];let t=[];return e.productionPoints!=null&&t.push({label:`${e.productionSeason} performance`,value:`${e.productionPoints.toFixed(1)} DFL pts${e.positionFinish?` · ${e.positionFinish}`:``}`}),t.push({label:`${e.basisSeason??`Previous`} DFL draft`,value:e.basisRound==null?`Not found — needs review`:`Round ${e.basisRound}`}),e.keeperCost==null?e.standing===`unavailable`&&t.push({label:`Keeper`,value:e.standingReason}):t.push({label:`${e.marketSeason??``} keeper`.trim(),value:`Round ${e.keeperCost}${e.keeperYear!=null&&e.maxKeeperYears!=null?` · Year ${e.keeperYear} of ${e.maxKeeperYears}`:``}`}),e.marketAdp!=null&&t.push({label:`${e.marketSeason} market`,value:`ADP ${ke(e.marketAdp)}${e.marketProjectedRound==null?``:` · Expected Round ${e.marketProjectedRound}`}`}),e.roundValueLabel&&t.push({label:`Draft value`,value:e.roundValueLabel}),t}function De(e){if(e.class===H.UNKNOWN)return`This id is not in the Sleeper player list, so nothing can be said about them.`;if(e.standing===`unavailable`)return e.standingReason;if(e.reviewNeeded)return`${e.basisReason} — a commissioner can enter the keeper round to record this one.`;let t=[];if(e.productionPoints!=null){let n=U[String(e.position||``).toUpperCase()]||0,r=e.positionFinish?` (${e.positionFinish})`:``;t.push(e.strongProduction?e.positionRank<=Math.ceil(n/2)?`Strong ${e.productionSeason} production${r}`:`A startable ${e.productionSeason}${r}`:`A quieter ${e.productionSeason}${r}`)}if(e.marketProjectedRound!=null&&t.push(`an expected Round ${e.marketProjectedRound} price in ${e.marketSeason}`),e.keeperCost!=null&&t.push(`a Round ${e.keeperCost} keeper cost`),!t.length)return e.standingReason;let n=t.length===1?t[0]:`${t.slice(0,-1).join(`, `)} and ${t.at(-1)}`;return e.roundValue!=null&&e.roundValue>0?`${n} — ${R(e.roundValue)} of draft value.`:e.roundValue===0?e.atFloor?`${n} — the cheapest a keeper can cost under these rules.`:`${n} — keeping them costs exactly what drafting them would.`:e.roundValue!=null&&e.roundValue<0?`${n} — ${R(e.roundValue)}: the keeper is the more expensive way to get them.`:e.marketProjectedRound==null?`${n}. No market price for ${e.marketSeason} yet, so this is not a value claim.`:`${n}.`}function Oe(e){return{player:e.name||`Player ${e.playerId}`,position:e.position,nflTeam:e.nflTeam,productionSeason:e.productionSeason,productionPoints:e.productionPoints,positionFinish:e.positionFinish,basisSeason:e.basisSeason,basisRound:e.basisRound,keeperSeason:e.marketSeason,keeperRound:e.keeperCost,keeperYear:e.keeperYear,maxKeeperYears:e.maxKeeperYears,marketSeason:e.marketSeason,marketAdp:e.marketAdp,expectedRound:e.marketProjectedRound,roundValue:e.roundValue,standing:e.standing}}function ke(e){return Math.round(Number(e)*10)/10}function Ae(e){let{member:t=null,sleeperUserId:n=null,roster:r=null,players:i=null,draftPicks:a=[],rules:o=null,targetSeason:s=null,keeperRows:c=[],maxKeepers:l=null,market:u=B,production:d=V}=e||{};if(!t)return{state:`no-member`};if(!n)return{state:`no-sleeper-id`,member:t};if(!r)return{state:`no-roster`,member:t,sleeperUserId:n};let f=Array.isArray(r.players)?r.players.map(String):[];if(!f.length)return{state:`no-players`,member:t,sleeperUserId:n,roster:r};let p=Se(ve({playerIds:f,players:i||{},draftPicks:a,sleeperUserId:n,rules:o,targetSeason:s,keeperRows:c,memberId:t?.id,market:u,production:d})),m=A(s),h=ye(p,u);return{state:`ready`,member:t,sleeperUserId:n,roster:r,rules:o,targetSeason:s,maxKeepers:l,keeperRows:c,context:m,positions:C,data:h,market:{available:u.available,source:u.source,scoringFormat:u.scoringFormat,updatedAt:u.updatedAt,freshness:u.freshness},candidates:p,counts:{total:p.length,costKnown:p.filter(e=>e.standing===`eligible`).length,basisKnown:p.filter(e=>e.basisRound!=null).length,noPriorRound:p.filter(e=>e.basisRound==null&&e.class!==H.UNKNOWN).length,unavailable:p.filter(e=>e.standing===`unavailable`).length,needsReview:p.filter(e=>e.reviewNeeded&&e.class!==H.UNKNOWN).length,unknownPlayer:p.filter(e=>e.class===H.UNKNOWN).length,withProduction:p.filter(e=>e.productionPoints!=null).length,withMarket:p.filter(e=>e.marketProjectedRound!=null).length},shortlist:Math.min(p.length,Math.max(3,(Number(l)||0)+2))}}async function je({season:t,onSaved:n=()=>{}}={}){let r=document.createElement(`div`);r.className=`overlay ke-overlay`,r.innerHTML=`
    <div class="overlay-card wide ke-card" role="dialog" aria-modal="true"
         aria-labelledby="ke-title">
      <header class="ke-head">
        <div>
          <span class="eyebrow">Record a keeper</span>
          <h2 id="ke-title">${g(t??``)} keepers</h2>
          <p class="muted tiny" data-ke-rules></p>
        </div>
        <button type="button" class="btn ghost small" data-ke-close>Close</button>
      </header>
      <div class="ke-body" data-ke-body>
        <p class="muted tiny">Loading the league…</p>
      </div>
    </div>`,document.body.appendChild(r);let i=v(r.querySelector(`.ke-card`),{initial:()=>r.querySelector(`[data-ke-search]`)||r.querySelector(`[data-ke-member]`)||r.querySelector(`[data-ke-close]`)}),a=()=>{document.removeEventListener(`keydown`,o),window.removeEventListener(`hashchange`,a),i(),r.remove()},o=e=>{e.key===`Escape`&&a()};document.addEventListener(`keydown`,o),window.addEventListener(`hashchange`,a),r.addEventListener(`click`,e=>{e.target===r&&a()}),r.querySelector(`[data-ke-close]`).addEventListener(`click`,a);let s=r.querySelector(`[data-ke-body]`),c;try{c=await Ne(t)}catch(e){s.innerHTML=`<p class="muted">Could not load the league. ${g(e.message||``)}</p>`;return}let l=L(c.rules),u=N(c.rules,{targetSeason:c.season});r.querySelector(`[data-ke-rules]`).textContent=l?`${t} rules · ${l}${u?` — ${u.text}`:``}`:`No keeper rules are configured for this season`;let d={step:`member`,member:null,pick:null,search:``},p=()=>{d.step===`member`?s.innerHTML=Fe(c):d.step===`player`?s.innerHTML=Ie(c,d):s.innerHTML=ze(c,d),m()};function m(){s.querySelector(`[data-ke-back]`)?.addEventListener(`click`,()=>{d.step=d.step===`review`?`player`:`member`,d.step===`member`&&(d.pick=null),p()}),s.querySelectorAll(`[data-ke-member]`).forEach(e=>{e.addEventListener(`click`,async()=>{d.member=c.members.find(t=>String(t.id)===e.dataset.keMember)||null,d.search=``,d.step=`player`,p(),await Pe(c,d.member),d.step===`player`&&p()})});let e=s.querySelector(`[data-ke-search]`);e&&e.addEventListener(`input`,()=>{d.search=e.value;let t=s.querySelector(`[data-ke-list]`);t&&(t.innerHTML=Le(c,d)),h()}),h();let t=s.querySelector(`[data-ke-form] input[name=round]`);if(t){let e=s.querySelector(`[data-ke-override]`),n=d.pick?.standing?.calculatedRound??null;t.addEventListener(`input`,()=>{let r=Number(t.value),i=n!=null&&Number.isFinite(r)&&r!==n;e.textContent=i?`Override — the rules calculate R${n}. This will be saved as R${r}.`:n==null?`No calculated value — the round you enter is the record.`:`Calculated R${n}. Change it only to overrule the rules.`,e.classList.toggle(`is-override`,i)})}s.querySelector(`[data-ke-form]`)?.addEventListener(`submit`,async e=>{e.preventDefault(),await _(e.currentTarget)}),s.querySelector(`[data-ke-next]`)?.addEventListener(`click`,()=>{d.step=`member`,d.member=null,d.pick=null,p()})}function h(){s.querySelectorAll(`[data-ke-player]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=c.rosters.get(String(d.member.id));d.pick=t?.candidates.find(t=>t.playerId===e.dataset.kePlayer)||null,d.pick&&(d.step=`review`,p())})})}p();async function _(t){let r=t.querySelector(`button[type=submit]`);r.disabled=!0;let i=d.pick,a=Number(t.round.value),o=i.standing.calculatedRound,l=Number.isFinite(a)&&a!==o,u={year:c.season,member_id:d.member.id,player_id:i.playerId,team:d.member.team_name||d.member.display_name,player:i.name||`Player ${i.playerId}`,player_name:i.name||null,player_pos:i.position||null,player_team:i.nflTeam||null,team_snapshot:d.member.team_name||null,basis_round:i.standing.basisRound,basis_season:i.standing.basisSeason,keeper_year:i.standing.keeperYear,calculated_round:o,round_cost:Number.isFinite(a)?a:o,round_overridden:l,rules_season:c.rules?.effective_season??null,notes:t.notes.value.trim()};try{await f(`keepers`,u),e(l?`Saved ${u.player} at R${u.round_cost} (override)`:`Saved ${u.player} at R${u.round_cost}`),c.taken.set(`${c.season}:${i.playerId}`,!0),c.existing.push(u),c.rosters.delete(String(d.member.id)),d.step=`member`,d.member=null,d.pick=null,p(),n()}catch(e){r.disabled=!1,s.querySelector(`[data-ke-error]`).textContent=Me(e)}}}function Me(e){if(e?.code===`23505`)return`That player is already recorded as a keeper this season.`;let t=e?.message||`Could not save that keeper`;return/member_id|player_id|column/.test(t)?`Run keeper_rules_schema.sql then keeper_basis_correction.sql in Supabase to enable keeper entry.`:t}async function Ne(e){let[t,n,r]=await Promise.all([a(),o().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression`).order(`effective_season`,{ascending:!1}),o().from(`keepers`).select(`year, member_id, player_id, player_name, team, player, round_cost`)]),i=r.error?[]:r.data||[],s=new Map;for(let t of i)t.player_id!=null&&Number(t.year)===Number(e)&&s.set(`${e}:${t.player_id}`,!0);return{season:Number(e),members:t,rules:P(n.error?[]:n.data||[],e),existing:i,taken:s,rosters:new Map,players:null}}async function Pe(e,n){let r=String(n.id);if(e.rosters.has(r))return;if(!n.sleeper_user_id){e.rosters.set(r,{season:null,candidates:[],noLink:!0});return}let i=(await o().from(`sleeper_rosters`).select(`season, players, team_name`).eq(`sleeper_user_id`,n.sleeper_user_id).order(`season`,{ascending:!1}).limit(4)).data||[],a=i.find(e=>(e.players||[]).length)||i[0]||null,s=Array.isArray(a?.players)?a.players.map(String):[];if(!s.length){e.rosters.set(r,{season:a?.season??null,candidates:[],empty:!0});return}let[c,l]=await Promise.all([e.players?Promise.resolve(e.players):t().catch(()=>({})),o().from(`sleeper_draft_picks`).select(`season, player_id, round, pick_no, sleeper_user_id`).in(`player_id`,s)]);e.players=c;let u=l.error?[]:l.data||[],d=s.map(t=>{let r=c[t]||null,i=M(u,t,{targetSeason:e.season}),a=te(e.existing,{playerId:t,memberId:n.id,beforeSeason:e.season}),o=j({config:e.rules,targetSeason:e.season,basisRound:i.round,basisSeason:i.season,priorKeeperSeasons:a});return{playerId:t,name:r?.n||null,position:r?.p||``,nflTeam:r?.t||``,basis:i,standing:o,alreadyKept:e.taken.has(`${e.season}:${t}`)}}),f={QB:0,RB:1,WR:2,TE:3};d.sort((e,t)=>(f[e.position]??9)-(f[t.position]??9)||String(e.name||e.playerId).localeCompare(String(t.name||t.playerId))),e.rosters.set(r,{season:a?.season??null,candidates:d})}function Fe(e){return`
    <p class="ke-hint">Choose the member recording a keeper.</p>
    <div class="ke-members">
      ${e.members.map(t=>{let n=e.existing.filter(n=>Number(n.year)===e.season&&String(n.member_id)===String(t.id));return`
        <button type="button" class="ke-member" data-ke-member="${t.id}">
          <span class="ke-member-main">
            <strong>${g(t.display_name)}</strong>
            ${t.team_name?`<span class="muted tiny">${g(t.team_name)}</span>`:``}
          </span>
          <span class="ke-member-state">${n.length?`${n.length} recorded`:`<span class="muted">none yet</span>`}</span>
        </button>`}).join(``)}
    </div>`}function Ie(e,t){let n=e.rosters.get(String(t.member.id));return`
    <div class="ke-step-head">
      <button type="button" class="btn ghost small" data-ke-back>← Members</button>
      <div>
        <strong>${g(t.member.display_name)}</strong>
        ${n?.season?`<span class="muted tiny"> · ${g(n.season)} roster</span>`:``}
      </div>
    </div>
    ${n?``:`<p class="muted tiny">Reading the roster…</p>`}
    ${n?.noLink?`<p class="muted">${g(t.member.display_name)} is not linked to a
      Sleeper account, so there is no roster to choose from. An admin can link it
      on the Admin page.</p>`:``}
    ${n?.empty?`<p class="muted">No synced season has any players on this roster yet.
      Run <strong>Sync Sleeper</strong> on the Admin page.</p>`:``}
    ${n?.candidates?.length?`
      <label class="ke-search">
        <span class="sr-only">Search this roster</span>
        <input type="search" data-ke-search placeholder="Search ${g(t.member.display_name)}’s roster"
               value="${g(t.search)}" autocomplete="off">
      </label>
      <div class="ke-list" data-ke-list>${Le(e,t)}</div>`:``}`}function Le(e,t){let n=e.rosters.get(String(t.member.id)),r=t.search.trim().toLowerCase(),i=(n?.candidates||[]).filter(e=>!r||String(e.name||``).toLowerCase().includes(r)||String(e.position||``).toLowerCase()===r||String(e.nflTeam||``).toLowerCase()===r),a=[[`Available`,i.filter(e=>e.standing.state===`eligible`&&!e.alreadyKept)],[`Needs review`,i.filter(e=>e.standing.state===`review`&&!e.alreadyKept)],[`Unavailable`,i.filter(e=>e.alreadyKept||e.standing.state===`unavailable`||e.standing.state===`no-rules`)]];return i.length?a.filter(([,e])=>e.length).map(([t,n])=>`
    <div class="ke-group">
      <div class="ke-group-head">${g(t)}<span class="count">${n.length}</span></div>
      ${n.map(n=>Re(n,t===`Unavailable`,e.season)).join(``)}
    </div>`).join(``):`<p class="muted tiny">Nobody on this roster matches that search.</p>`}function Re(e,t,n){let r=e.name||`Player ${e.playerId}`,i=[e.position,e.nflTeam].filter(Boolean).join(` · `),a=e.alreadyKept?`Already recorded this season`:e.standing.state===`eligible`?`${e.standing.basisSeason} Draft R${e.standing.basisRound} · ${n} Keeper R${e.standing.calculatedRound} · ${e.standing.finalKeeperYear?`FINAL YEAR`:`Year ${e.standing.keeperYear} of ${e.standing.maxKeeperYears}`}`:e.standing.reason;return`
    <${t?`div`:`button type="button"`} class="ke-player ${t?`is-locked`:``}"
        ${t?``:`data-ke-player="${g(e.playerId)}"`}>
      <span class="ke-player-main">
        <span class="ke-player-name">${g(r)}</span>
        ${i?`<span class="ke-player-where">${g(i)}</span>`:``}
        <span class="ke-player-line">${g(a)}</span>
      </span>
      ${e.standing.calculatedRound!=null&&!e.alreadyKept?`<span class="ke-player-round">R${e.standing.calculatedRound}</span>`:``}
    </${t?`div`:`button`}>`}function ze(e,t){let n=t.pick,r=n.standing,i=n.name||`Player ${n.playerId}`,a=r.calculatedRound;return`
    <div class="ke-step-head">
      <button type="button" class="btn ghost small" data-ke-back>← ${g(t.member.display_name)}’s roster</button>
    </div>
    <form data-ke-form class="ke-review">
      <div class="ke-review-who">
        <strong>${g(i)}</strong>
        <span class="muted tiny">${g([n.position,n.nflTeam].filter(Boolean).join(` · `))}</span>
        <span class="muted tiny">${g(t.member.display_name)}${t.member.team_name?` · ${g(t.member.team_name)}`:``} · ${e.season}</span>
      </div>

      <dl class="ke-facts">
        <div><dt>${g(r.basisSeason??`Previous season`)} DFL draft</dt><dd>${r.basisRound==null?`<span class="muted">not found</span>`:`Round ${r.basisRound}`}</dd></div>
        <div><dt>Keeper year</dt><dd>${r.keeperYear==null?`<span class="muted">—</span>`:`${r.keeperYear} of ${r.maxKeeperYears}${r.finalKeeperYear?` · final`:``}`}</dd></div>
        <div><dt>${g(e.season)} keeper cost</dt><dd>${a==null?`<span class="muted">not calculable</span>`:`Round ${a}`}</dd></div>
      </dl>

      ${r.basisRound==null?`<p class="ke-warn">${g(r.reason)}. Enter the keeper
        round yourself to record this one.${n.basis.otherSeasons.length?` For reference only, this league drafted them in
              ${g(n.basis.otherSeasons.map(e=>`${e.season} R${e.round}`).join(`, `))} —
              none of which is the ${g(r.basisSeason??``)} basis.`:``}</p>`:``}

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
    </form>`}var{BG:Be,CARD:Ve,LINE:He,INK:Ue,MUTED:We,GOLD:Ge,ACCENT:Ke,BRAND_RED:qe,BRAND_YELLOW:Je}=D;function Ye({season:e,members:t=[],keeperRows:n=[],players:r={},rules:i=null}){let a=Number(e),o=(n||[]).filter(e=>Number(e.year??e.season)===a),s=new Map(t.map(e=>[String(e.id),[]])),c=new Map;for(let e of t)for(let t of[e.team_name,e.display_name,...e.team_name_aliases||[]])if(t){let n=String(t).trim().toLowerCase(),r=String(e.id);c.set(n,c.has(n)&&c.get(n)!==r?null:r)}let l=e=>{let n=String(e||``).trim().toLowerCase();if(n.length<3)return null;let r=t.filter(e=>[e.display_name,e.team_name,...e.team_name_aliases||[]].some(e=>String(e||``).trim().toLowerCase().startsWith(n)));return r.length===1?String(r[0].id):null},u=[];for(let e of o){let t=e.member_id==null?null:String(e.member_id);if(!t||!s.has(t)){let n=String(e.team||``).trim().toLowerCase();t=c.get(n)||l(n)}t&&s.has(t)?s.get(t).push(e):u.push(e)}let d=i?.max_keeper_seasons??null,f=e=>{let t=e.player_id==null?null:r[String(e.player_id)],i=e.player_pos||t?.p||``,o=e.player_team||t?.t||``;return{id:e.player_id==null?``:String(e.player_id),position:i,name:e.player_name||e.player||`—`,where:[i,o].filter(e=>e&&e!==`FA`).join(` · `),round:e.round_cost==null?null:Number(e.round_cost),legacy:e.player_id==null,overridden:e.round_overridden===!0,tenure:e.player_id==null?null:F(n,{playerId:e.player_id,memberId:e.member_id,season:a,max:d})}},p=t.map(e=>({member:e.display_name||``,team:e.team_name||``,keepers:(s.get(String(e.id))||[]).map(f)}));return{season:a,rows:p,also:u.map(f),submitted:p.filter(e=>e.keepers.length).length,total:p.length,rulesLine:L(i)}}function q(e){return e?[`DFL ${e.season} keepers — ${e.submitted} of ${e.total} submitted`,...e.rows.map(e=>{let t=e.team||e.member;return e.keepers.length?`${t}: ${e.keepers.map(e=>{let t=e.round==null?``:` (R${e.round})`,n=e.tenure?.max?` yr ${e.tenure.year}/${e.tenure.max}`:``;return`${e.name}${t}${n}`}).join(`, `)}`:`${t}: no keeper submitted`})].join(`
`):``}function Xe(e){return ee(k(e))}function Ze(e){if(!e||!e.total)return E({title:`DFL HQ — Keepers`,text:q(e),url:location.href})===`copied`?`Copied to the clipboard`:`Sharing…`;try{let t=Xe(e);return O(t,`dfl-keepers-${e.season}.png`,{title:`DFL HQ — ${e.season} keepers`,text:q(e)})===`saved`?`Saved the keeper board to your downloads`:`Sharing…`}catch(t){return console.warn(`keeper board: falling back to text`,t),E({title:`DFL HQ — ${e.season} keepers`,text:q(e),url:location.href})===`copied`?`Copied to the clipboard`:`Sharing…`}}var J=null;async function Y(n){let[c,l]=await Promise.all([m(`keepers`,{order:`team`,asc:!0}),a().catch(()=>[])]),u=await o().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression`).then(e=>e.error?[]:e.data||[],()=>[]);if(!c.length){n.innerHTML=`
      <header class="page-head"><h1>Keepers</h1></header>
      <div data-advisor-host></div>
      <div id="keeper-body">
        ${_(`No keepers recorded yet.`)}
        ${s()?`<div class="row-end ke-actions">
           <button type="button" class="btn" data-keeper-entry>Add keeper</button>
           ${h(`keepers`,`Add by hand`)}
         </div>`:``}
      </div>`,i(n.querySelector(`#keeper-body`),()=>Y(n)),n.addEventListener(`click`,e=>{e.target.closest(`[data-keeper-entry]`)&&je({season:new Date().getFullYear(),onSaved:()=>Y(n)})}),X(n);return}let d=[...new Set(c.map(e=>e.year))].sort((e,t)=>t-e);d.includes(J)||(J=d[0]),n.innerHTML=`
    <header class="page-head">
      <h1>Keepers</h1>
      <p class="page-sub" id="keeper-count"></p>
    </header>

    <div data-advisor-host></div>

    <h2 class="section-title">League keepers</h2>
    <div class="tabs" id="year-tabs">
      ${d.map(e=>`<button data-year="${e}" class="${e===J?`on`:``}">${e}</button>`).join(``)}
    </div>
    <div id="keeper-body"></div>
  `;let f=n.querySelector(`#keeper-body`),p=n.querySelector(`#keeper-count`),g=()=>{let e=c.filter(e=>e.year===J),t=r(e,`team`).size;p.textContent=e.length?`${J} · ${e.length} keeper${e.length===1?``:`s`} across ${t} team${t===1?``:`s`}`:`${J} · nothing recorded`;let n=P(u,J)?.max_keeper_seasons??I.max_keeper_seasons;f.innerHTML=st(e,n,l)+`<div class="row-end ke-actions">
           <button type="button" class="btn ghost small" data-keeper-share>Share keeper board</button>
           ${s()?`<button type="button" class="btn" data-keeper-entry>Add keeper</button>
             ${h(`keepers`,`Add by hand`,{year:J})}`:``}
         </div>`};n.querySelector(`#year-tabs`).addEventListener(`click`,e=>{let t=e.target.closest(`button[data-year]`);t&&(J=Number(t.dataset.year),n.querySelectorAll(`#year-tabs button`).forEach(e=>e.classList.toggle(`on`,Number(e.dataset.year)===J)),g())}),i(f,()=>Y(n)),n.addEventListener(`click`,e=>{e.target.closest(`[data-keeper-entry]`)&&je({season:J,onSaved:()=>Y(n)})});let v=null;(async()=>{try{let e=await a(),n=c.filter(e=>e.player_id!=null).map(e=>String(e.player_id)),r=c.some(e=>e.player_id!=null&&!e.player_pos)&&n.length?await t().catch(()=>({})):{},i=await o().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression`);v={members:e,players:r,ruleSets:i.error?[]:i.data||[]}}catch{v={members:[],players:{},ruleSets:[]}}})(),n.addEventListener(`click`,t=>{if(!t.target.closest(`[data-keeper-share]`))return;if(!v){e(`Still reading the league — try again in a moment`);return}let n=Ye({season:J,members:v.members,keeperRows:c,players:v.players,rules:P(v.ruleSets,J)});e(Ze(n))}),g(),X(n)}async function X(e){let t=e.querySelector(`[data-advisor-host]`);if(!t)return;let n=d();if(!n){t.innerHTML=Z(Q({state:`no-member`}));return}if(!n.sleeper_user_id){t.innerHTML=Z(Q({state:`no-sleeper-id`,member:n}),n);return}t.innerHTML=Z(`<p class="muted tiny">Reading your roster, last season and the draft board…</p>`,n);let r;try{r=await $e(n)}catch(e){t.innerHTML=Z(`<p class="muted tiny">Could not read your roster. ${g(e.message||``)}</p>`,n);return}t.innerHTML=Z(Q(r),n),await Qe(t,r,n)}async function Qe(e,t,n){let r=t?.context?.targetSeason;if(!r||!e)return;let i=null;try{i=await re(r)}catch{return}if(!i)return;e.parentElement?.querySelectorAll(`[data-keeper-self-host]`).forEach(e=>e.remove());let a=document.createElement(`div`);a.dataset.keeperSelfHost=`1`,e.insertAdjacentElement(`afterend`,a);let o=async()=>{let e=[];try{e=await ie(r,i.member_id)}catch{e=[]}let n=ae(t.candidates||[]);return a.innerHTML=le({season:r,status:i,mine:e,options:n,keeperRows:t.keeperRows||[],maxKeeperSeasons:t.rules?.max_keeper_seasons??I.max_keeper_seasons}),n},s=await o();ue(a,{season:r,memberId:i.member_id,options:s,onSaved:async()=>{try{i=await re(r)||i}catch{}await o(),Y(document.getElementById(`view`)||document.body)}})}async function $e(e){let n=e.sleeper_user_id,[r,i,a,s]=await Promise.all([o().from(`sleeper_rosters`).select(`season, players, team_name, synced_at`).eq(`sleeper_user_id`,n).order(`season`,{ascending:!1}).limit(4),o().from(`sleeper_leagues`).select(`season, max_keepers, status, scoring_settings`).order(`season`,{ascending:!1}).limit(1),o().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression, updated_at`).order(`effective_season`,{ascending:!1}),o().from(`keepers`).select(`year, member_id, player_id, player_name, team, player, round_cost`)]),c=r.data||[],l=c.find(e=>(e.players||[]).length)||c[0]||null,u=(i.data||[])[0]||null,d=i.error?null:u?.max_keepers??null,f=i.error?null:u?.scoring_settings||null,p=u?.season??null,m=A(p),h=a.error?[]:a.data||[],g=P(h,p),_=s.error?[]:s.data||[],v=Array.isArray(l?.players)?l.players.map(String):[],C=((m.draftBasisSeason==null?{data:[]}:await o().from(`sleeper_rosters`).select(`roster_id`).eq(`season`,m.draftBasisSeason)).data||[]).length||null,w=x(f),[E,D,O,ee]=await Promise.all([v.length?t().catch(()=>({})):Promise.resolve({}),v.length?o().from(`sleeper_draft_picks`).select(`season, player_id, round, pick_no, sleeper_user_id`).in(`player_id`,v):Promise.resolve({data:[]}),v.length&&f?y(m.productionSeason).catch(()=>({data:{},fetchedAt:0})):Promise.resolve({data:{},fetchedAt:0}),v.length?b(m.marketSeason,w).catch(()=>({data:[],fetchedAt:0})):Promise.resolve({data:[],fetchedAt:0})]),k=O.data||{},j=f?T({stats:k,players:E,scoringSettings:f}):new Map,M=f?S({playerIds:v,stats:k,players:E,scoringSettings:f}):new Map,N=new Map;for(let e of v){let t=j.get(e),n=M.get(e);t?N.set(e,{...t,games:n?.games??null}):n?.points!=null&&N.set(e,{...n,positionRank:null,label:null})}let F=me(ee.data||[],{leagueSize:C,scoringFormat:w,season:m.marketSeason}),I=F.length?z(F):B;return{...Ae({member:e,sleeperUserId:n,roster:l,players:E,draftPicks:D.error?[]:D.data||[],rules:g,targetSeason:p,keeperRows:_,maxKeepers:d,market:I,production:N.size?N:V}),needsDraftSync:!!D.error,needsRulesMigration:!!a.error,needsScoring:!f,leagueSize:C,scoringFormat:w,leagueSeason:u?.season??null,rosterSeason:l?.season??null}}function Z(e,t){return`
    <section class="card keeper-advisor" data-collapse="keeper-advisor"
             data-collapse-title="Keeper advisor"${t?` data-collapse-badge="${g(t.display_name)}"`:``}>
      ${e}
    </section>`}function Q(e){if(e.state===`no-member`)return`<p class="muted">Pick your name in the top right and this will show your
      own keeper options.</p>`;if(e.state===`no-sleeper-id`)return`<p class="muted">${g(e.member.display_name)} is not linked to a Sleeper
      account yet, so there is no roster to read. An admin can link it on the
      Admin page.</p>`;if(e.state===`no-roster`)return`<p class="muted">No roster has been synced for you yet. An admin can run
      <strong>Sync Sleeper</strong> on the Admin page.</p>`;if(e.state===`no-players`)return`<p class="muted">No synced season has any players on your roster yet. An
      admin can run <strong>Sync Sleeper</strong> on the Admin page.</p>`;let{candidates:t,counts:n,rules:r,context:i,shortlist:a,market:o}=e,s=t[0]?.standing===`eligible`?t[0]:null,c=+!!s,l=t.slice(c,a),u=t.slice(a);return`
    ${et(s,t,e)}

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

    ${it(e).map(e=>`<p class="ka-blocker">${e}</p>`).join(``)}`}function et(e,t,n){if(!e)return``;let r=Ce(e,t),i=r.find(e=>tt.has(e))||null,a=r.filter(e=>e!==i),o=Ee(e);return`
    <div class="ka-lead-card">
      ${i?`<span class="ka-headline">${g(i)}</span>`:``}
      <p class="ka-lead-who"><strong>${g(e.name||`Player ${e.playerId}`)}</strong>
        <span class="ka-where">${g([e.position,e.nflTeam].filter(Boolean).join(` · `))}</span></p>
      <dl class="ka-facts">
        ${o.map(e=>`<div><dt>${g(e.label)}</dt><dd>${g(e.value)}</dd></div>`).join(``)}
      </dl>
      <p class="ka-why-long">${g(De(e))}</p>
      ${a.length?`<span class="ka-badges">${a.map(e=>`<span class="pill tiny ${$.has(e)?`is-call`:``}">${g(e)}</span>`).join(``)}</span>`:``}
    </div>`}var tt=new Set([K.BEST_VALUE,K.BEST_PLAYER,K.SAFE_CHOICE,K.FINAL_YEAR,K.VALUE_PLAY]),$=new Set([...tt,K.POOR_VALUE]);function nt(e,t){let n=L(e);return n?`<p class="ka-rules">${g(t.targetSeason??``)} keeper rules ·
    ${g(n)}</p>`:``}function rt(e){if(!e?.available)return``;let t=e.freshness;return`<p class="ka-source ${t?.stale?`is-stale`:``}">${g(e.source||`Market`)}
    ${e.scoringFormat?`· ${g(e.scoringFormat.replace(`_`,` `))}`:``}
    ${t?.label?`· ${g(t.label)}`:``}</p>`}function it(e){let{context:t,rules:n}=e,r=[];return e.needsRulesMigration?r.push(`Keeper rules are not switched on yet. Run
      <strong>keeper_rules_schema.sql</strong> in the Supabase SQL editor.`):n||r.push(`No keeper rules are configured for ${g(t.targetSeason??`this season`)},
      so no keeper cost is shown.`),e.needsDraftSync&&r.push(`Draft rounds are missing. Run <strong>sleeper_draft_schema.sql</strong>,
      then <strong>Sync Sleeper</strong>.`),e.needsScoring&&r.push(`This league's scoring settings have not been synced, so
      ${g(t.productionSeason)} points cannot be worked out. Run
      <strong>Sync Sleeper</strong> on the Admin page.`),r}function at(e,t,n){let r=Ce(e,n),i=e.name||`Player ${e.playerId}`,a=[e.position,e.nflTeam].filter(Boolean).join(` · `),o=e.keeperCost==null?`<span class="ka-cost none" title="${e.standing===`unavailable`?`Not eligible under the configured rules`:`No ${e.basisSeason??`previous season`} draft round on record`}">—</span>`:`<span class="ka-cost">R${e.keeperCost}</span>`;return`
    <li class="ka-row ${e.class===H.UNKNOWN?`is-unknown`:``} ${e.standing===`unavailable`?`is-unavailable`:``}">
      <span class="ka-n" aria-hidden="true">${t}</span>
      <span class="ka-main">
        <span class="ka-name">${g(i)}</span>
        ${a?`<span class="ka-where">${g(a)}</span>`:``}
        <span class="ka-why">${Ee(e).map(e=>`<span class="ka-fact"><b>${g(e.label)}</b> ${g(e.value)}</span>`).join(``)}</span>
        ${r.length?`<span class="ka-badges">${r.map(e=>`<span class="pill tiny ${$.has(e)?`is-call`:``}">${g(e)}</span>`).join(``)}</span>`:``}
      </span>
      ${o}
    </li>`}function ot(e,t){let n=e.map(Oe),r=(e,t=0)=>e==null?`—`:Number(e).toFixed(t);return`
    <div class="ka-table-wrap">
      <table class="ka-table">
        <thead>
          <tr>
            <th>Player</th><th>Pos</th>
            <th class="num">${g(t.productionSeason)} Pts</th>
            <th>${g(t.productionSeason)} Finish</th>
            <th class="num">${g(t.draftBasisSeason)} Draft</th>
            <th class="num">${g(t.targetSeason)} Keeper</th>
            <th class="num">${g(t.marketSeason)} ADP</th>
            <th class="num">${g(t.marketSeason)} Exp.</th>
            <th class="num">Value</th>
            <th>Keeper year</th>
          </tr>
        </thead>
        <tbody>
          ${n.map(e=>`
            <tr class="${e.standing===`unavailable`?`is-unavailable`:``}">
              <td>${g(e.player)}</td>
              <td>${g(e.position)}</td>
              <td class="num">${r(e.productionPoints,1)}</td>
              <td>${g(e.positionFinish||`—`)}</td>
              <td class="num">${e.basisRound==null?`—`:`R${e.basisRound}`}</td>
              <td class="num">${e.keeperRound==null?`—`:`R${e.keeperRound}`}</td>
              <td class="num">${r(e.marketAdp,1)}</td>
              <td class="num">${e.expectedRound==null?`—`:`R${e.expectedRound}`}</td>
              <td class="num ${e.roundValue!=null&&e.roundValue>0?`is-plus`:``}">${e.roundValue==null?`—`:e.roundValue>0?`+${e.roundValue}`:e.roundValue}</td>
              <td>${e.keeperYear!=null&&e.maxKeeperYears!=null?`${e.keeperYear} of ${e.maxKeeperYears}`:`—`}</td>
            </tr>`).join(``)}
        </tbody>
      </table>
    </div>`}function st(e,t,i){let a=n(`keepers`,e);return a.length?`
    <div class="card keepcard">
      <div class="kp-head" aria-hidden="true">
        <span>Team</span><span>Keeper</span><span>Held</span><span class="kp-r">Round</span>
      </div>
      ${[...r(a,`team`).entries()].sort((e,t)=>e[0].localeCompare(t[0])).map(([e,n])=>n.map((n,r)=>`
        <div class="kp-row ${r===0?`kp-new`:``} ${l(`keepers`,n)}">
          <span class="kp-team">${r===0?g(u(e,i,{member_id:n.member_id})):``}</span>
          <span class="kp-player">
            ${g(n.player)}
            ${n.notes?`<span class="kp-note">${g(n.notes)}</span>`:``}
          </span>
          ${ct(n,t)}
          <span class="kp-cost ${n.round_cost==null?`none`:``}">${n.round_cost==null?`—`:`${g(n.round_cost)}`}</span>
          ${c(`keepers`,n,{compact:!0})}
        </div>`).join(``)).join(``)}
    </div>`:_(`No keepers for this year.`)}function ct(e,t){let n=Number(e.keeper_year),r=Number(e.year);if(!Number.isFinite(n)||n<1)return`<span class="kp-held none">—</span>`;let i=Number.isFinite(r)?r-n+1:null,a=Math.max(0,(t??I.max_keeper_seasons)-n);return`
    <span class="kp-held">
      ${i==null?``:`<span class="kp-since">${g(i)}</span>`}
      <span class="kp-left ${a===0?`is-final`:``}">${a===0?`final`:`${a} left`}</span>
    </span>`}export{Y as render};