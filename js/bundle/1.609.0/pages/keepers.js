import{Br as e,En as t,F as n,Gr as r,Hn as i,I as a,Ir as o,Kn as s,Kt as c,M as l,N as u,On as d,P as f,Pr as p,Qt as m,Ut as h,Y as g,er as _,fr as v,j as y,kn as b}from"../app-core-_5V0bh1m.js";import{$i as x,E as S,O as C,S as w,T,ea as E,ia as ee,ra as te,ta as ne,y as D}from"../home-core-DrNjG618.js";import{a as O,c as k,d as A,f as j,i as M,l as N,n as P,s as F,u as I}from"../keeper-rules-iB5MCYxx.js";var re=/keeper_self_status|keeper_set_self|keeper_clear_self|does not exist|not find the function|schema cache/i;async function ie(e){try{let{data:t,error:n}=await i().rpc(`keeper_self_status`,{target_season:Number(e)});if(n)throw n;return(Array.isArray(t)?t[0]:t)||null}catch(e){if(re.test(e?.message||``))return null;throw e}}async function ae(e,t){if(!t)return[];let{data:n,error:r}=await i().from(`keepers`).select(`id,player_id,player_name,player_pos,player_team,round_cost,basis_round,basis_season,self_submitted,created_at`).eq(`year`,Number(e)).eq(`member_id`,t).order(`created_at`,{ascending:!1});if(r)throw r;return n||[]}function oe(e=[]){return e.filter(e=>e.standing===`eligible`&&e.keeperCost!=null)}function se(e){return`${e.basisSeason&&e.basisRound?`${e.basisSeason} R${e.basisRound}`:`no draft round`} → R${e.keeperCost}`}function ce(e){if(!e||!e.max)return``;let t=Array.from({length:e.max},(t,n)=>`<i class="${n<e.year?`is-used`:``}"></i>`).join(``),n=e.left===0?`final season`:`${e.left} season${e.left===1?``:`s`} left`;return`<span class="ks-tenure ${e.final?`is-final`:``}">
    <span class="ks-pips" aria-hidden="true">${t}</span>
    <b>Year ${e.year}/${e.max}</b>
    <em>${o(n)}${e.firstSeason?` · kept since ${e.firstSeason}`:``}</em>
  </span>`}function le(e,t,{keeperRows:n=[],maxKeeperSeasons:r=null,memberId:i=null}={}){return e.length?`<ul class="ks-mine">${e.map(e=>{let a=N(n,{playerId:e.player_id,memberId:i,season:t,max:r});return`
    <li>
      <div class="ks-line">
        <strong>${o(e.player_name||e.player_id)}</strong>
        ${e.player_pos?`<span class="ks-pos">${o(e.player_pos)}</span>`:``}
        <span class="ks-cost">R${e.round_cost??`—`}</span>
      </div>
      ${ce(a)}
      <div class="ks-line ks-sub">
        ${e.basis_season&&e.basis_round?`<span class="ks-basis">from ${e.basis_season} R${e.basis_round}</span>`:``}
        ${e.self_submitted===!1?`<span class="ks-basis">entered by the commissioner &middot; you can change it</span>`:``}
      </div>
    </li>`}).join(``)}</ul>`:`<p class="ks-none">You have not chosen a keeper for ${t} yet.</p>`}function ue({season:e,status:t,mine:n=[],options:r=[],keeperRows:i=[],maxKeeperSeasons:a=null}){if(!t)return``;let s=t.member_id?g(t.member_id):null,c=!!t.needs_pin&&!s;if(!t.member_id)return`<section class="card keeper-self"><div class="card-body">
      <h3 class="card-heading">Your ${e} keeper</h3>
      <p class="muted">Pick your name in the top right to choose your keeper.</p>
    </div></section>`;if(t.locked)return`<section class="card keeper-self is-locked"><div class="card-body">
      <h3 class="card-heading">Your ${e} keeper</h3>
      ${le(n,e,{keeperRows:i,maxKeeperSeasons:a,memberId:t.member_id})}
      <p class="ks-locked">Keepers for ${e} are locked. Ask the commissioner if
        something is wrong.</p>
    </div></section>`;let l=Number(t.max_keepers)||1,u=Number(t.used_slots)||0;return`<section class="card keeper-self"><div class="card-body">
    <h3 class="card-heading">Your ${e} keeper</h3>
    ${le(n,e,{keeperRows:i,maxKeeperSeasons:a,memberId:t.member_id})}

    ${r.length?`
      <form class="ks-form" data-keeper-self-form autocomplete="off">
        <label for="ks-player">${u>=l&&l===1?`Change to`:`Keep`}</label>
        <select id="ks-player" name="player" required>
          <option value="">Choose a player…</option>
          ${r.map(e=>`
            <option value="${o(e.playerId)}"
                    data-name="${o(e.name||``)}"
                    data-pos="${o(e.position||``)}"
                    data-team="${o(e.nflTeam||``)}">
              ${o(e.name||e.playerId)}${e.position?` (${o(e.position)})`:``} — ${o(se(e))}
            </option>`).join(``)}
        </select>

        ${c?`
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
  </div></section>`}function de(e,{season:t,memberId:n=null,options:a=[],onSaved:o=()=>{}}={}){if(!e)return;let s=new Map(a.map(e=>[String(e.playerId),e])),c=(e,t)=>{let n=e.querySelector(`[data-keeper-self-error]`);n?n.textContent=t:r(t,!0)};e.addEventListener(`submit`,async e=>{let a=e.target.closest(`[data-keeper-self-form]`);if(!a)return;e.preventDefault();let l=a.querySelector(`button[type="submit"]`),u=a.querySelector(`[data-keeper-self-error]`);u&&(u.textContent=``);let d=a.player?.value,f=s.get(String(d));if(!f){c(a,`Choose a player first.`);return}l.disabled=!0;try{let{error:e}=await i().rpc(`keeper_set_self`,{target_season:Number(t),pick_player_id:String(f.playerId),pick_name:f.name||null,pick_pos:f.position||null,pick_nfl_team:f.nflTeam||null,attempted_pin:a.pin?.value||g(n)||null});if(e)throw e;r(`${f.name||`Your keeper`} saved`),o()}catch(e){l.disabled=!1,c(a,e?.message||`That could not be saved.`)}}),e.addEventListener(`click`,async e=>{let a=e.target.closest(`[data-keeper-self-clear]`);if(!a)return;let s=a.closest(`[data-keeper-self-form]`);if(confirm(`Remove your ${t} keeper?`)){a.disabled=!0;try{let{error:e}=await i().rpc(`keeper_clear_self`,{target_season:Number(t),attempted_pin:s?.pin?.value||g(n)||null});if(e)throw e;r(`Your keeper was removed`),o()}catch(e){a.disabled=!1,c(s,e?.message||`That could not be removed.`)}}})}var fe=900;function pe(e,t){let n=Number(e),r=Number(t);return!Number.isFinite(n)||n<=0||!Number.isFinite(r)||r<2?null:Math.ceil(n/r)}function me(e,t){let n=e=>e==null||e===``?NaN:Number(e),r=n(e),i=n(t);return!Number.isFinite(r)||!Number.isFinite(i)?null:r-i}function L(e){return e==null?null:e===0?`0 rounds`:`${e>0?`+`:`−`}${Math.abs(e)} ${Math.abs(e)===1?`round`:`rounds`}`}function he(e=[],{leagueSize:t,scoringFormat:n=`ppr`,season:r=null}={}){let i=`adp_${n}`,a=r?`Sleeper ADP · ${r}`:`Sleeper ADP`,o=[];for(let t of e||[]){if(!t||t.player_id==null)continue;let e=String(t.player?.position||``).toUpperCase();if(!E(e))continue;let n=Number(t.stats?.[i]);if(!Number.isFinite(n)||n<=0||n>=fe)continue;let r=Number(t.last_modified??t.updated_at);o.push({playerId:String(t.player_id),position:e,adp:n,updatedMs:Number.isFinite(r)?r:null})}o.sort((e,t)=>e.adp-t.adp||e.playerId.localeCompare(t.playerId));let s=new Map;return o.map((e,r)=>{let i=(s.get(e.position)||0)+1;return s.set(e.position,i),{playerId:e.playerId,rank:r+1,positionRank:i,adp:e.adp,projectedRound:pe(e.adp,t),position:e.position,source:a,scoringFormat:n,updatedAt:e.updatedMs?new Date(e.updatedMs).toISOString():null}})}function ge(e,{now:t=Date.now(),staleAfterDays:n=4}={}){let r=e?Date.parse(e):NaN;if(!Number.isFinite(r))return{updatedAt:null,ageDays:null,stale:!1,unknown:!0,label:null};let i=Math.floor((Number(t)-r)/864e5),a=new Date(r).toLocaleDateString(void 0,{month:`short`,day:`numeric`});return{updatedAt:e,ageDays:i,unknown:!1,stale:i>=n,label:i>=n?`Updated ${a} · may be stale`:`Updated ${a}`}}function R(e=[],{now:t=Date.now()}={}){let n=new Map;for(let t of e)t&&t.playerId!=null&&n.set(String(t.playerId),t);let r=e[0]||null;return{available:n.size>0,get:e=>n.get(String(e))||null,source:r?.source||null,scoringFormat:r?.scoringFormat||null,updatedAt:r?.updatedAt||null,freshness:ge(r?.updatedAt||null,{now:t}),size:n.size}}var z=R([]),B=new Map,V={KNOWN:`cost-known`,NO_COST:`cost-unknown`,NO_ROUND:`no-prior-round`,UNKNOWN:`unknown-player`},H={QB:12,RB:24,WR:30,TE:12};function U(e){if(e==null||e===``)return null;let t=Number(e);return Number.isFinite(t)&&t>=1?t:null}function _e(e,t){let n=H[String(e||``).toUpperCase()],r=U(t);return!n||r==null?!1:r<=n}function ve({playerIds:e=[],players:t={},draftPicks:n=[],sleeperUserId:r=null,rules:i=null,targetSeason:a=null,keeperRows:o=[],memberId:s=null,market:c=z,production:l=B}){let u=O(a);return e.map(String).filter(e=>{let n=t[e];return!n||E(n.p)}).map(e=>{let d=t[e]||null,f=c.get(e),p=l.get?.(e)||null,m=d?.n||null,h=d?.p||``,g=d?.t||``,_=d?!g||g===`FA`:!1,v=A(n,e,{targetSeason:a}),y=n.find(t=>t&&String(t.player_id)===e&&Number(t.season)===u.draftBasisSeason)||null,b=y&&r!=null?String(y.sleeper_user_id)===String(r):null,x=I(o,{playerId:e,memberId:s,beforeSeason:a}),S=k({config:i,targetSeason:a,basisRound:v.round,basisSeason:v.season,priorKeeperSeasons:x}),C;C=d?S.state===`eligible`?V.KNOWN:v.round==null?V.NO_ROUND:V.NO_COST:V.UNKNOWN;let w=f?.projectedRound??null,T=me(S.calculatedRound,w);return{playerId:e,name:m,position:h,nflTeam:g,freeAgent:_,basisRound:v.round,basisSeason:v.season,basisFound:v.found,basisReason:v.reason,basisOtherSeasons:v.otherSeasons,draftedByMe:b,draftPickNo:y?Number(y.pick_no):null,priorKeeperSeasons:x,class:C,keeperCost:S.calculatedRound,keeperYear:S.keeperYear,maxKeeperYears:S.maxKeeperYears,finalKeeperYear:S.finalKeeperYear,standing:S.state,standingReason:S.reason,reviewNeeded:S.reviewNeeded,productionSeason:u.productionSeason,productionPoints:p?.points??null,productionGames:p?.games??null,positionRank:p?.positionRank??null,positionFinish:p?.label??null,strongProduction:_e(h,p?.positionRank),marketSeason:u.marketSeason,marketAdp:f?.adp??null,marketRank:f?.rank??null,marketPositionRank:f?.positionRank??null,marketProjectedRound:w,strongMarket:_e(h,f?.positionRank),roundValue:T,roundValueLabel:L(T),atFloor:S.calculatedRound!=null&&S.calculatedRound<=1}})}function ye(e=[],t=z){let n=e.some(e=>e.productionPoints!=null),r=t.available&&e.some(e=>e.marketProjectedRound!=null);return n&&r?{level:1,name:`full`,hasProduction:n,hasMarket:r}:n?{level:2,name:`no-market`,hasProduction:n,hasMarket:r}:r?{level:3,name:`no-production`,hasProduction:n,hasMarket:r}:{level:4,name:`facts-only`,hasProduction:n,hasMarket:r}}var be=4,xe=24;function W(e,t){let n=U(t);if(n==null)return 0;let r=H[String(e||``).toUpperCase()]||0;if(!r)return 0;let i=r-n+1;return i<=0?0:Math.round(i/r*xe)}function G(e){return(e.roundValue==null?0:e.roundValue*be)+W(e.position,e.positionRank)+W(e.position,e.marketPositionRank)}function Se(e=[]){let t=e=>e.standing===`unavailable`?3:e.class===V.KNOWN?0:e.class===V.UNKNOWN?2:1;return[...e].sort((e,n)=>t(e)-t(n)||(e.freeAgent===n.freeAgent?G(n)-G(e)||(e.keeperCost!=null&&n.keeperCost!=null&&e.keeperCost!==n.keeperCost?n.keeperCost-e.keeperCost:String(e.name||e.playerId).localeCompare(String(n.name||n.playerId))):e.freeAgent?1:-1))}var K={BEST_VALUE:`BEST VALUE`,BEST_PLAYER:`BEST PLAYER`,SAFE_CHOICE:`SAFE CHOICE`,VALUE_PLAY:`VALUE PLAY`,FINAL_YEAR:`FINAL-YEAR VALUE`,POOR_VALUE:`POOR VALUE`,LIMIT_REACHED:`Keeper limit reached`,NEEDS_REVIEW:`Needs review`,RETURNING:`You drafted them`,ACQUIRED:`Acquired, not drafted`,NOT_ON_NFL:`Not on an NFL roster`,UNKNOWN_ID:`Not in the Sleeper player list`};function Ce(e,t=[]){if(e.class===V.UNKNOWN)return[K.UNKNOWN_ID];let n=[],r=t.filter(e=>e.standing===`eligible`),i=r.filter(e=>e.roundValue!=null).filter(e=>e.roundValue>=2&&e.strongProduction);i.length&&e.playerId===Te(i,e=>-(e.roundValue*1e3+G(e)))&&n.push(K.BEST_VALUE);let a=r.filter(e=>e.marketRank!=null||e.positionRank!=null);return e.standing===`eligible`&&a.length>1&&e.playerId===Te(a,we)&&n.push(K.BEST_PLAYER),e.standing===`eligible`&&e.strongProduction&&e.strongMarket&&e.roundValue!=null&&(e.roundValue>0||e.atFloor&&e.roundValue>=0)&&n.push(K.SAFE_CHOICE),e.standing===`eligible`&&e.roundValue!=null&&e.roundValue>=2&&!e.strongProduction&&n.push(K.VALUE_PLAY),e.standing===`eligible`&&e.finalKeeperYear&&e.roundValue!=null&&e.roundValue>0&&n.push(K.FINAL_YEAR),e.standing===`eligible`&&e.roundValue!=null&&e.roundValue<0&&!e.atFloor&&!e.strongProduction&&n.push(K.POOR_VALUE),e.standing===`unavailable`&&n.push(K.LIMIT_REACHED),e.reviewNeeded&&n.push(K.NEEDS_REVIEW),e.draftedByMe===!0&&n.push(K.RETURNING),e.draftedByMe===!1&&n.push(K.ACQUIRED),e.freeAgent&&n.push(K.NOT_ON_NFL),n}function we(e){if(e.marketRank!=null)return e.marketRank;let t=W(e.position,e.positionRank);return t?1e3-t:9999}function Te(e,t){let n=null,r=1/0;for(let i of[...e].sort((e,t)=>String(e.playerId).localeCompare(String(t.playerId)))){let e=t(i);e<r&&(r=e,n=i)}return n?.playerId??null}function Ee(e){if(e.class===V.UNKNOWN)return[{label:`Player`,value:K.UNKNOWN_ID}];let t=[];return e.productionPoints!=null&&t.push({label:`${e.productionSeason} performance`,value:`${e.productionPoints.toFixed(1)} DFL pts${e.positionFinish?` · ${e.positionFinish}`:``}`}),t.push({label:`${e.basisSeason??`Previous`} DFL draft`,value:e.basisRound==null?`Not found — needs review`:`Round ${e.basisRound}`}),e.keeperCost==null?e.standing===`unavailable`&&t.push({label:`Keeper`,value:e.standingReason}):t.push({label:`${e.marketSeason??``} keeper`.trim(),value:`Round ${e.keeperCost}${e.keeperYear!=null&&e.maxKeeperYears!=null?` · Year ${e.keeperYear} of ${e.maxKeeperYears}`:``}`}),e.marketAdp!=null&&t.push({label:`${e.marketSeason} market`,value:`ADP ${ke(e.marketAdp)}${e.marketProjectedRound==null?``:` · Expected Round ${e.marketProjectedRound}`}`}),e.roundValueLabel&&t.push({label:`Draft value`,value:e.roundValueLabel}),t}function De(e){if(e.class===V.UNKNOWN)return`This id is not in the Sleeper player list, so nothing can be said about them.`;if(e.standing===`unavailable`)return e.standingReason;if(e.reviewNeeded)return`${e.basisReason} — a commissioner can enter the keeper round to record this one.`;let t=[];if(e.productionPoints!=null){let n=H[String(e.position||``).toUpperCase()]||0,r=e.positionFinish?` (${e.positionFinish})`:``;t.push(e.strongProduction?e.positionRank<=Math.ceil(n/2)?`Strong ${e.productionSeason} production${r}`:`A startable ${e.productionSeason}${r}`:`A quieter ${e.productionSeason}${r}`)}if(e.marketProjectedRound!=null&&t.push(`an expected Round ${e.marketProjectedRound} price in ${e.marketSeason}`),e.keeperCost!=null&&t.push(`a Round ${e.keeperCost} keeper cost`),!t.length)return e.standingReason;let n=t.length===1?t[0]:`${t.slice(0,-1).join(`, `)} and ${t.at(-1)}`;return e.roundValue!=null&&e.roundValue>0?`${n} — ${L(e.roundValue)} of draft value.`:e.roundValue===0?e.atFloor?`${n} — the cheapest a keeper can cost under these rules.`:`${n} — keeping them costs exactly what drafting them would.`:e.roundValue!=null&&e.roundValue<0?`${n} — ${L(e.roundValue)}: the keeper is the more expensive way to get them.`:e.marketProjectedRound==null?`${n}. No market price for ${e.marketSeason} yet, so this is not a value claim.`:`${n}.`}function Oe(e){return{player:e.name||`Player ${e.playerId}`,position:e.position,nflTeam:e.nflTeam,productionSeason:e.productionSeason,productionPoints:e.productionPoints,positionFinish:e.positionFinish,basisSeason:e.basisSeason,basisRound:e.basisRound,keeperSeason:e.marketSeason,keeperRound:e.keeperCost,keeperYear:e.keeperYear,maxKeeperYears:e.maxKeeperYears,marketSeason:e.marketSeason,marketAdp:e.marketAdp,expectedRound:e.marketProjectedRound,roundValue:e.roundValue,standing:e.standing}}function ke(e){return Math.round(Number(e)*10)/10}function Ae(e){let{member:t=null,sleeperUserId:n=null,roster:r=null,players:i=null,draftPicks:a=[],rules:o=null,targetSeason:s=null,keeperRows:c=[],maxKeepers:l=null,market:u=z,production:d=B}=e||{};if(!t)return{state:`no-member`};if(!n)return{state:`no-sleeper-id`,member:t};if(!r)return{state:`no-roster`,member:t,sleeperUserId:n};let f=Array.isArray(r.players)?r.players.map(String):[];if(!f.length)return{state:`no-players`,member:t,sleeperUserId:n,roster:r};let p=Se(ve({playerIds:f,players:i||{},draftPicks:a,sleeperUserId:n,rules:o,targetSeason:s,keeperRows:c,memberId:t?.id,market:u,production:d})),m=O(s),h=ye(p,u);return{state:`ready`,member:t,sleeperUserId:n,roster:r,rules:o,targetSeason:s,maxKeepers:l,keeperRows:c,context:m,positions:x,data:h,market:{available:u.available,source:u.source,scoringFormat:u.scoringFormat,updatedAt:u.updatedAt,freshness:u.freshness},candidates:p,counts:{total:p.length,costKnown:p.filter(e=>e.standing===`eligible`).length,basisKnown:p.filter(e=>e.basisRound!=null).length,noPriorRound:p.filter(e=>e.basisRound==null&&e.class!==V.UNKNOWN).length,unavailable:p.filter(e=>e.standing===`unavailable`).length,needsReview:p.filter(e=>e.reviewNeeded&&e.class!==V.UNKNOWN).length,unknownPlayer:p.filter(e=>e.class===V.UNKNOWN).length,withProduction:p.filter(e=>e.productionPoints!=null).length,withMarket:p.filter(e=>e.marketProjectedRound!=null).length},shortlist:Math.min(p.length,Math.max(3,(Number(l)||0)+2))}}async function je({season:e,onSaved:t=()=>{}}={}){let n=document.createElement(`div`);n.className=`overlay ke-overlay`,n.innerHTML=`
    <div class="overlay-card wide ke-card" role="dialog" aria-modal="true"
         aria-labelledby="ke-title">
      <header class="ke-head">
        <div>
          <span class="eyebrow">Record a keeper</span>
          <h2 id="ke-title">${o(e??``)} keepers</h2>
          <p class="muted tiny" data-ke-rules></p>
        </div>
        <button type="button" class="btn ghost small" data-ke-close>Close</button>
      </header>
      <div class="ke-body" data-ke-body>
        <p class="muted tiny">Loading the league…</p>
      </div>
    </div>`,document.body.appendChild(n);let i=v(n.querySelector(`.ke-card`),{initial:()=>n.querySelector(`[data-ke-search]`)||n.querySelector(`[data-ke-member]`)||n.querySelector(`[data-ke-close]`)}),a=()=>{document.removeEventListener(`keydown`,c),window.removeEventListener(`hashchange`,a),i(),n.remove()},c=e=>{e.key===`Escape`&&a()};document.addEventListener(`keydown`,c),window.addEventListener(`hashchange`,a),n.addEventListener(`click`,e=>{e.target===n&&a()}),n.querySelector(`[data-ke-close]`).addEventListener(`click`,a);let l=n.querySelector(`[data-ke-body]`),u;try{u=await Ne(e)}catch(e){l.innerHTML=`<p class="muted">Could not load the league. ${o(e.message||``)}</p>`;return}let d=F(u.rules),f=j(u.rules,{targetSeason:u.season});n.querySelector(`[data-ke-rules]`).textContent=d?`${e} rules · ${d}${f?` — ${f.text}`:``}`:`No keeper rules are configured for this season`;let p={step:`member`,member:null,pick:null,search:``},m=()=>{p.step===`member`?l.innerHTML=Fe(u):p.step===`player`?l.innerHTML=Ie(u,p):l.innerHTML=ze(u,p),h()};function h(){l.querySelector(`[data-ke-back]`)?.addEventListener(`click`,()=>{p.step=p.step===`review`?`player`:`member`,p.step===`member`&&(p.pick=null),m()}),l.querySelectorAll(`[data-ke-member]`).forEach(e=>{e.addEventListener(`click`,async()=>{p.member=u.members.find(t=>String(t.id)===e.dataset.keMember)||null,p.search=``,p.step=`player`,m(),await Pe(u,p.member),p.step===`player`&&m()})});let e=l.querySelector(`[data-ke-search]`);e&&e.addEventListener(`input`,()=>{p.search=e.value;let t=l.querySelector(`[data-ke-list]`);t&&(t.innerHTML=Le(u,p)),g()}),g();let t=l.querySelector(`[data-ke-form] input[name=round]`);if(t){let e=l.querySelector(`[data-ke-override]`),n=p.pick?.standing?.calculatedRound??null;t.addEventListener(`input`,()=>{let r=Number(t.value),i=n!=null&&Number.isFinite(r)&&r!==n;e.textContent=i?`Override — the rules calculate R${n}. This will be saved as R${r}.`:n==null?`No calculated value — the round you enter is the record.`:`Calculated R${n}. Change it only to overrule the rules.`,e.classList.toggle(`is-override`,i)})}l.querySelector(`[data-ke-form]`)?.addEventListener(`submit`,async e=>{e.preventDefault(),await _(e.currentTarget)}),l.querySelector(`[data-ke-next]`)?.addEventListener(`click`,()=>{p.step=`member`,p.member=null,p.pick=null,m()})}function g(){l.querySelectorAll(`[data-ke-player]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=u.rosters.get(String(p.member.id));p.pick=t?.candidates.find(t=>t.playerId===e.dataset.kePlayer)||null,p.pick&&(p.step=`review`,m())})})}m();async function _(e){let n=e.querySelector(`button[type=submit]`);n.disabled=!0;let i=p.pick,a=Number(e.round.value),o=i.standing.calculatedRound,c=Number.isFinite(a)&&a!==o,d={year:u.season,member_id:p.member.id,player_id:i.playerId,team:p.member.team_name||p.member.display_name,player:i.name||`Player ${i.playerId}`,player_name:i.name||null,player_pos:i.position||null,player_team:i.nflTeam||null,team_snapshot:p.member.team_name||null,basis_round:i.standing.basisRound,basis_season:i.standing.basisSeason,keeper_year:i.standing.keeperYear,calculated_round:o,round_cost:Number.isFinite(a)?a:o,round_overridden:c,rules_season:u.rules?.effective_season??null,notes:e.notes.value.trim()};try{await s(`keepers`,d),r(c?`Saved ${d.player} at R${d.round_cost} (override)`:`Saved ${d.player} at R${d.round_cost}`),u.taken.set(`${u.season}:${i.playerId}`,!0),u.existing.push(d),u.rosters.delete(String(p.member.id)),p.step=`member`,p.member=null,p.pick=null,m(),t()}catch(e){n.disabled=!1,l.querySelector(`[data-ke-error]`).textContent=Me(e)}}}function Me(e){if(e?.code===`23505`)return`That player is already recorded as a keeper this season.`;let t=e?.message||`Could not save that keeper`;return/member_id|player_id|column/.test(t)?`Run keeper_rules_schema.sql then keeper_basis_correction.sql in Supabase to enable keeper entry.`:t}async function Ne(e){let[t,n,r]=await Promise.all([c(),i().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression`).order(`effective_season`,{ascending:!1}),i().from(`keepers`).select(`year, member_id, player_id, player_name, team, player, round_cost`)]),a=r.error?[]:r.data||[],o=new Map;for(let t of a)t.player_id!=null&&Number(t.year)===Number(e)&&o.set(`${e}:${t.player_id}`,!0);return{season:Number(e),members:t,rules:M(n.error?[]:n.data||[],e),existing:a,taken:o,rosters:new Map,players:null}}async function Pe(e,t){let n=String(t.id);if(e.rosters.has(n))return;if(!t.sleeper_user_id){e.rosters.set(n,{season:null,candidates:[],noLink:!0});return}let r=(await i().from(`sleeper_rosters`).select(`season, players, team_name`).eq(`sleeper_user_id`,t.sleeper_user_id).order(`season`,{ascending:!1}).limit(4)).data||[],a=r.find(e=>(e.players||[]).length)||r[0]||null,o=Array.isArray(a?.players)?a.players.map(String):[];if(!o.length){e.rosters.set(n,{season:a?.season??null,candidates:[],empty:!0});return}let[s,c]=await Promise.all([e.players?Promise.resolve(e.players):d().catch(()=>({})),i().from(`sleeper_draft_picks`).select(`season, player_id, round, pick_no, sleeper_user_id`).in(`player_id`,o)]);e.players=s;let l=c.error?[]:c.data||[],u=o.map(n=>{let r=s[n]||null,i=A(l,n,{targetSeason:e.season}),a=I(e.existing,{playerId:n,memberId:t.id,beforeSeason:e.season}),o=k({config:e.rules,targetSeason:e.season,basisRound:i.round,basisSeason:i.season,priorKeeperSeasons:a});return{playerId:n,name:r?.n||null,position:r?.p||``,nflTeam:r?.t||``,basis:i,standing:o,alreadyKept:e.taken.has(`${e.season}:${n}`)}}),f={QB:0,RB:1,WR:2,TE:3};u.sort((e,t)=>(f[e.position]??9)-(f[t.position]??9)||String(e.name||e.playerId).localeCompare(String(t.name||t.playerId))),e.rosters.set(n,{season:a?.season??null,candidates:u})}function Fe(e){return`
    <p class="ke-hint">Choose the member recording a keeper.</p>
    <div class="ke-members">
      ${e.members.map(t=>{let n=e.existing.filter(n=>Number(n.year)===e.season&&String(n.member_id)===String(t.id));return`
        <button type="button" class="ke-member" data-ke-member="${t.id}">
          <span class="ke-member-main">
            <strong>${o(t.display_name)}</strong>
            ${t.team_name?`<span class="muted tiny">${o(t.team_name)}</span>`:``}
          </span>
          <span class="ke-member-state">${n.length?`${n.length} recorded`:`<span class="muted">none yet</span>`}</span>
        </button>`}).join(``)}
    </div>`}function Ie(e,t){let n=e.rosters.get(String(t.member.id));return`
    <div class="ke-step-head">
      <button type="button" class="btn ghost small" data-ke-back>← Members</button>
      <div>
        <strong>${o(t.member.display_name)}</strong>
        ${n?.season?`<span class="muted tiny"> · ${o(n.season)} roster</span>`:``}
      </div>
    </div>
    ${n?``:`<p class="muted tiny">Reading the roster…</p>`}
    ${n?.noLink?`<p class="muted">${o(t.member.display_name)} is not linked to a
      Sleeper account, so there is no roster to choose from. An admin can link it
      on the Admin page.</p>`:``}
    ${n?.empty?`<p class="muted">No synced season has any players on this roster yet.
      Run <strong>Sync Sleeper</strong> on the Admin page.</p>`:``}
    ${n?.candidates?.length?`
      <label class="ke-search">
        <span class="sr-only">Search this roster</span>
        <input type="search" data-ke-search placeholder="Search ${o(t.member.display_name)}’s roster"
               value="${o(t.search)}" autocomplete="off">
      </label>
      <div class="ke-list" data-ke-list>${Le(e,t)}</div>`:``}`}function Le(e,t){let n=e.rosters.get(String(t.member.id)),r=t.search.trim().toLowerCase(),i=(n?.candidates||[]).filter(e=>!r||String(e.name||``).toLowerCase().includes(r)||String(e.position||``).toLowerCase()===r||String(e.nflTeam||``).toLowerCase()===r),a=[[`Available`,i.filter(e=>e.standing.state===`eligible`&&!e.alreadyKept)],[`Needs review`,i.filter(e=>e.standing.state===`review`&&!e.alreadyKept)],[`Unavailable`,i.filter(e=>e.alreadyKept||e.standing.state===`unavailable`||e.standing.state===`no-rules`)]];return i.length?a.filter(([,e])=>e.length).map(([t,n])=>`
    <div class="ke-group">
      <div class="ke-group-head">${o(t)}<span class="count">${n.length}</span></div>
      ${n.map(n=>Re(n,t===`Unavailable`,e.season)).join(``)}
    </div>`).join(``):`<p class="muted tiny">Nobody on this roster matches that search.</p>`}function Re(e,t,n){let r=e.name||`Player ${e.playerId}`,i=[e.position,e.nflTeam].filter(Boolean).join(` · `),a=e.alreadyKept?`Already recorded this season`:e.standing.state===`eligible`?`${e.standing.basisSeason} Draft R${e.standing.basisRound} · ${n} Keeper R${e.standing.calculatedRound} · ${e.standing.finalKeeperYear?`FINAL YEAR`:`Year ${e.standing.keeperYear} of ${e.standing.maxKeeperYears}`}`:e.standing.reason;return`
    <${t?`div`:`button type="button"`} class="ke-player ${t?`is-locked`:``}"
        ${t?``:`data-ke-player="${o(e.playerId)}"`}>
      <span class="ke-player-main">
        <span class="ke-player-name">${o(r)}</span>
        ${i?`<span class="ke-player-where">${o(i)}</span>`:``}
        <span class="ke-player-line">${o(a)}</span>
      </span>
      ${e.standing.calculatedRound!=null&&!e.alreadyKept?`<span class="ke-player-round">R${e.standing.calculatedRound}</span>`:``}
    </${t?`div`:`button`}>`}function ze(e,t){let n=t.pick,r=n.standing,i=n.name||`Player ${n.playerId}`,a=r.calculatedRound;return`
    <div class="ke-step-head">
      <button type="button" class="btn ghost small" data-ke-back>← ${o(t.member.display_name)}’s roster</button>
    </div>
    <form data-ke-form class="ke-review">
      <div class="ke-review-who">
        <strong>${o(i)}</strong>
        <span class="muted tiny">${o([n.position,n.nflTeam].filter(Boolean).join(` · `))}</span>
        <span class="muted tiny">${o(t.member.display_name)}${t.member.team_name?` · ${o(t.member.team_name)}`:``} · ${e.season}</span>
      </div>

      <dl class="ke-facts">
        <div><dt>${o(r.basisSeason??`Previous season`)} DFL draft</dt><dd>${r.basisRound==null?`<span class="muted">not found</span>`:`Round ${r.basisRound}`}</dd></div>
        <div><dt>Keeper year</dt><dd>${r.keeperYear==null?`<span class="muted">—</span>`:`${r.keeperYear} of ${r.maxKeeperYears}${r.finalKeeperYear?` · final`:``}`}</dd></div>
        <div><dt>${o(e.season)} keeper cost</dt><dd>${a==null?`<span class="muted">not calculable</span>`:`Round ${a}`}</dd></div>
      </dl>

      ${r.basisRound==null?`<p class="ke-warn">${o(r.reason)}. Enter the keeper
        round yourself to record this one.${n.basis.otherSeasons.length?` For reference only, this league drafted them in
              ${o(n.basis.otherSeasons.map(e=>`${e.season} R${e.round}`).join(`, `))} —
              none of which is the ${o(r.basisSeason??``)} basis.`:``}</p>`:``}

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
    </form>`}var{BG:Be,CARD:Ve,LINE:He,INK:Ue,MUTED:We,GOLD:Ge,ACCENT:Ke,BRAND_RED:qe,BRAND_YELLOW:Je}=D;function Ye({season:e,members:t=[],keeperRows:n=[],players:r={},rules:i=null}){let a=Number(e),o=(n||[]).filter(e=>Number(e.year??e.season)===a),s=new Map(t.map(e=>[String(e.id),[]])),c=new Map;for(let e of t)for(let t of[e.team_name,e.display_name,...e.team_name_aliases||[]])if(t){let n=String(t).trim().toLowerCase(),r=String(e.id);c.set(n,c.has(n)&&c.get(n)!==r?null:r)}let l=e=>{let n=String(e||``).trim().toLowerCase();if(n.length<3)return null;let r=t.filter(e=>[e.display_name,e.team_name,...e.team_name_aliases||[]].some(e=>String(e||``).trim().toLowerCase().startsWith(n)));return r.length===1?String(r[0].id):null},u=[];for(let e of o){let t=e.member_id==null?null:String(e.member_id);if(!t||!s.has(t)){let n=String(e.team||``).trim().toLowerCase();t=c.get(n)||l(n)}t&&s.has(t)?s.get(t).push(e):u.push(e)}let d=i?.max_keeper_seasons??null,f=e=>{let t=e.player_id==null?null:r[String(e.player_id)],i=e.player_pos||t?.p||``,o=e.player_team||t?.t||``;return{id:e.player_id==null?``:String(e.player_id),position:i,name:e.player_name||e.player||`—`,where:[i,o].filter(e=>e&&e!==`FA`).join(` · `),round:e.round_cost==null?null:Number(e.round_cost),legacy:e.player_id==null,overridden:e.round_overridden===!0,tenure:e.player_id==null?null:N(n,{playerId:e.player_id,memberId:e.member_id,season:a,max:d})}},p=t.map(e=>({member:e.display_name||``,team:e.team_name||``,keepers:(s.get(String(e.id))||[]).map(f)}));return{season:a,rows:p,also:u.map(f),submitted:p.filter(e=>e.keepers.length).length,total:p.length,rulesLine:F(i)}}function q(e){return e?[`DFL ${e.season} keepers — ${e.submitted} of ${e.total} submitted`,...e.rows.map(e=>{let t=e.team||e.member;return e.keepers.length?`${t}: ${e.keepers.map(e=>{let t=e.round==null?``:` (R${e.round})`,n=e.tenure?.max?` yr ${e.tenure.year}/${e.tenure.max}`:``;return`${e.name}${t}${n}`}).join(`, `)}`:`${t}: no keeper submitted`})].join(`
`):``}function Xe(e){return w(C(e))}function Ze(e){if(!e||!e.total)return S({title:`DFL HQ — Keepers`,text:q(e),url:location.href})===`copied`?`Copied to the clipboard`:`Sharing…`;try{let t=Xe(e);return T(t,`dfl-keepers-${e.season}.png`,{title:`DFL HQ — ${e.season} keepers`,text:q(e)})===`saved`?`Saved the keeper board to your downloads`:`Sharing…`}catch(t){return console.warn(`keeper board: falling back to text`,t),S({title:`DFL HQ — ${e.season} keepers`,text:q(e),url:location.href})===`copied`?`Copied to the clipboard`:`Sharing…`}}var J=null;async function Y(t){let[n,o]=await Promise.all([_(`keepers`,{order:`team`,asc:!0}),c().catch(()=>[])]),s=await i().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression`).then(e=>e.error?[]:e.data||[],()=>[]);if(!n.length){t.innerHTML=`
      <header class="page-head"><h1>Keepers</h1></header>
      <div data-advisor-host></div>
      <div id="keeper-body">
        ${p(`No keepers recorded yet.`)}
        ${l()?`<div class="row-end ke-actions">
           <button type="button" class="btn" data-keeper-entry>Add keeper</button>
           ${y(`keepers`,`Add by hand`)}
         </div>`:``}
      </div>`,a(t.querySelector(`#keeper-body`),()=>Y(t)),t.addEventListener(`click`,e=>{e.target.closest(`[data-keeper-entry]`)&&je({season:new Date().getFullYear(),onSaved:()=>Y(t)})}),X(t);return}let u=[...new Set(n.map(e=>e.year))].sort((e,t)=>t-e);u.includes(J)||(J=u[0]),t.innerHTML=`
    <header class="page-head">
      <h1>Keepers</h1>
      <p class="page-sub" id="keeper-count"></p>
    </header>

    <div data-advisor-host></div>

    <h2 class="section-title">League keepers</h2>
    <div class="tabs" id="year-tabs">
      ${u.map(e=>`<button data-year="${e}" class="${e===J?`on`:``}">${e}</button>`).join(``)}
    </div>
    <div id="keeper-body"></div>
  `;let f=t.querySelector(`#keeper-body`),m=t.querySelector(`#keeper-count`),h=()=>{let t=n.filter(e=>e.year===J),r=e(t,`team`).size;m.textContent=t.length?`${J} · ${t.length} keeper${t.length===1?``:`s`} across ${r} team${r===1?``:`s`}`:`${J} · nothing recorded`;let i=M(s,J)?.max_keeper_seasons??P.max_keeper_seasons;f.innerHTML=st(t,i,o)+`<div class="row-end ke-actions">
           <button type="button" class="btn ghost small" data-keeper-share>Share keeper board</button>
           ${l()?`<button type="button" class="btn" data-keeper-entry>Add keeper</button>
             ${y(`keepers`,`Add by hand`,{year:J})}`:``}
         </div>`};t.querySelector(`#year-tabs`).addEventListener(`click`,e=>{let n=e.target.closest(`button[data-year]`);n&&(J=Number(n.dataset.year),t.querySelectorAll(`#year-tabs button`).forEach(e=>e.classList.toggle(`on`,Number(e.dataset.year)===J)),h())}),a(f,()=>Y(t)),t.addEventListener(`click`,e=>{e.target.closest(`[data-keeper-entry]`)&&je({season:J,onSaved:()=>Y(t)})});let g=null;(async()=>{try{let e=await c(),t=n.filter(e=>e.player_id!=null).map(e=>String(e.player_id)),r=n.some(e=>e.player_id!=null&&!e.player_pos)&&t.length?await d().catch(()=>({})):{},a=await i().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression`);g={members:e,players:r,ruleSets:a.error?[]:a.data||[]}}catch{g={members:[],players:{},ruleSets:[]}}})(),t.addEventListener(`click`,e=>{if(!e.target.closest(`[data-keeper-share]`))return;if(!g){r(`Still reading the league — try again in a moment`);return}let t=Ye({season:J,members:g.members,keeperRows:n,players:g.players,rules:M(g.ruleSets,J)});r(Ze(t))}),h(),X(t)}async function X(e){let t=e.querySelector(`[data-advisor-host]`);if(!t)return;let n=h();if(!n){t.innerHTML=Z(Q({state:`no-member`}));return}if(!n.sleeper_user_id){t.innerHTML=Z(Q({state:`no-sleeper-id`,member:n}),n);return}t.innerHTML=Z(`<p class="muted tiny">Reading your roster, last season and the draft board…</p>`,n);let r;try{r=await $e(n)}catch(e){t.innerHTML=Z(`<p class="muted tiny">Could not read your roster. ${o(e.message||``)}</p>`,n);return}t.innerHTML=Z(Q(r),n),await Qe(t,r,n)}async function Qe(e,t,n){let r=t?.context?.targetSeason;if(!r||!e)return;let i=null;try{i=await ie(r)}catch{return}if(!i)return;e.parentElement?.querySelectorAll(`[data-keeper-self-host]`).forEach(e=>e.remove());let a=document.createElement(`div`);a.dataset.keeperSelfHost=`1`,e.insertAdjacentElement(`afterend`,a);let o=async()=>{let e=[];try{e=await ae(r,i.member_id)}catch{e=[]}let n=oe(t.candidates||[]);return a.innerHTML=ue({season:r,status:i,mine:e,options:n,keeperRows:t.keeperRows||[],maxKeeperSeasons:t.rules?.max_keeper_seasons??P.max_keeper_seasons}),n},s=await o();de(a,{season:r,memberId:i.member_id,options:s,onSaved:async()=>{try{i=await ie(r)||i}catch{}await o(),Y(document.getElementById(`view`)||document.body)}})}async function $e(e){let n=e.sleeper_user_id,[r,a,o,s]=await Promise.all([i().from(`sleeper_rosters`).select(`season, players, team_name, synced_at`).eq(`sleeper_user_id`,n).order(`season`,{ascending:!1}).limit(4),i().from(`sleeper_leagues`).select(`season, max_keepers, status, scoring_settings`).order(`season`,{ascending:!1}).limit(1),i().from(`keeper_rules`).select(`effective_season, max_keeper_seasons, cost_basis, round_adjustment, progression, updated_at`).order(`effective_season`,{ascending:!1}),i().from(`keepers`).select(`year, member_id, player_id, player_name, team, player, round_cost`)]),c=r.data||[],l=c.find(e=>(e.players||[]).length)||c[0]||null,u=(a.data||[])[0]||null,f=a.error?null:u?.max_keepers??null,p=a.error?null:u?.scoring_settings||null,m=u?.season??null,h=O(m),g=o.error?[]:o.data||[],_=M(g,m),v=s.error?[]:s.data||[],y=Array.isArray(l?.players)?l.players.map(String):[],x=((h.draftBasisSeason==null?{data:[]}:await i().from(`sleeper_rosters`).select(`roster_id`).eq(`season`,h.draftBasisSeason)).data||[]).length||null,S=te(p),[C,w,T,E]=await Promise.all([y.length?d().catch(()=>({})):Promise.resolve({}),y.length?i().from(`sleeper_draft_picks`).select(`season, player_id, round, pick_no, sleeper_user_id`).in(`player_id`,y):Promise.resolve({data:[]}),y.length&&p?b(h.productionSeason).catch(()=>({data:{},fetchedAt:0})):Promise.resolve({data:{},fetchedAt:0}),y.length?t(h.marketSeason,S).catch(()=>({data:[],fetchedAt:0})):Promise.resolve({data:[],fetchedAt:0})]),D=T.data||{},k=p?ne({stats:D,players:C,scoringSettings:p}):new Map,A=p?ee({playerIds:y,stats:D,players:C,scoringSettings:p}):new Map,j=new Map;for(let e of y){let t=k.get(e),n=A.get(e);t?j.set(e,{...t,games:n?.games??null}):n?.points!=null&&j.set(e,{...n,positionRank:null,label:null})}let N=he(E.data||[],{leagueSize:x,scoringFormat:S,season:h.marketSeason}),P=N.length?R(N):z;return{...Ae({member:e,sleeperUserId:n,roster:l,players:C,draftPicks:w.error?[]:w.data||[],rules:_,targetSeason:m,keeperRows:v,maxKeepers:f,market:P,production:j.size?j:B}),needsDraftSync:!!w.error,needsRulesMigration:!!o.error,needsScoring:!p,leagueSize:x,scoringFormat:S,leagueSeason:u?.season??null,rosterSeason:l?.season??null}}function Z(e,t){return`
    <section class="card keeper-advisor" data-collapse="keeper-advisor"
             data-collapse-title="Keeper advisor"${t?` data-collapse-badge="${o(t.display_name)}"`:``}>
      ${e}
    </section>`}function Q(e){if(e.state===`no-member`)return`<p class="muted">Pick your name in the top right and this will show your
      own keeper options.</p>`;if(e.state===`no-sleeper-id`)return`<p class="muted">${o(e.member.display_name)} is not linked to a Sleeper
      account yet, so there is no roster to read. An admin can link it on the
      Admin page.</p>`;if(e.state===`no-roster`)return`<p class="muted">No roster has been synced for you yet. An admin can run
      <strong>Sync Sleeper</strong> on the Admin page.</p>`;if(e.state===`no-players`)return`<p class="muted">No synced season has any players on your roster yet. An
      admin can run <strong>Sync Sleeper</strong> on the Admin page.</p>`;let{candidates:t,counts:n,rules:r,context:i,shortlist:a,market:s}=e,c=t[0]?.standing===`eligible`?t[0]:null,l=+!!c,u=t.slice(l,a),d=t.slice(a);return`
    ${et(c,t,e)}

    ${nt(r,i)}
    ${rt(s)}

    <ol class="ka-list" start="${l+1}" ${u.length?``:`hidden`}>
      ${u.map((e,n)=>at(e,l+n+1,t)).join(``)}
    </ol>

    ${d.length?`
      <div class="ka-more" data-collapse="keeper-compare" data-collapse-default="folded"
           data-collapse-title="Compare all ${n.total}"
           data-collapse-badge="${d.length} more">
        ${ot(t,i)}
      </div>`:``}

    ${it(e).map(e=>`<p class="ka-blocker">${e}</p>`).join(``)}`}function et(e,t,n){if(!e)return``;let r=Ce(e,t),i=r.find(e=>tt.has(e))||null,a=r.filter(e=>e!==i),s=Ee(e);return`
    <div class="ka-lead-card">
      ${i?`<span class="ka-headline">${o(i)}</span>`:``}
      <p class="ka-lead-who"><strong>${o(e.name||`Player ${e.playerId}`)}</strong>
        <span class="ka-where">${o([e.position,e.nflTeam].filter(Boolean).join(` · `))}</span></p>
      <dl class="ka-facts">
        ${s.map(e=>`<div><dt>${o(e.label)}</dt><dd>${o(e.value)}</dd></div>`).join(``)}
      </dl>
      <p class="ka-why-long">${o(De(e))}</p>
      ${a.length?`<span class="ka-badges">${a.map(e=>`<span class="pill tiny ${$.has(e)?`is-call`:``}">${o(e)}</span>`).join(``)}</span>`:``}
    </div>`}var tt=new Set([K.BEST_VALUE,K.BEST_PLAYER,K.SAFE_CHOICE,K.FINAL_YEAR,K.VALUE_PLAY]),$=new Set([...tt,K.POOR_VALUE]);function nt(e,t){let n=F(e);return n?`<p class="ka-rules">${o(t.targetSeason??``)} keeper rules ·
    ${o(n)}</p>`:``}function rt(e){if(!e?.available)return``;let t=e.freshness;return`<p class="ka-source ${t?.stale?`is-stale`:``}">${o(e.source||`Market`)}
    ${e.scoringFormat?`· ${o(e.scoringFormat.replace(`_`,` `))}`:``}
    ${t?.label?`· ${o(t.label)}`:``}</p>`}function it(e){let{context:t,rules:n}=e,r=[];return e.needsRulesMigration?r.push(`Keeper rules are not switched on yet. Run
      <strong>keeper_rules_schema.sql</strong> in the Supabase SQL editor.`):n||r.push(`No keeper rules are configured for ${o(t.targetSeason??`this season`)},
      so no keeper cost is shown.`),e.needsDraftSync&&r.push(`Draft rounds are missing. Run <strong>sleeper_draft_schema.sql</strong>,
      then <strong>Sync Sleeper</strong>.`),e.needsScoring&&r.push(`This league's scoring settings have not been synced, so
      ${o(t.productionSeason)} points cannot be worked out. Run
      <strong>Sync Sleeper</strong> on the Admin page.`),r}function at(e,t,n){let r=Ce(e,n),i=e.name||`Player ${e.playerId}`,a=[e.position,e.nflTeam].filter(Boolean).join(` · `),s=e.keeperCost==null?`<span class="ka-cost none" title="${e.standing===`unavailable`?`Not eligible under the configured rules`:`No ${e.basisSeason??`previous season`} draft round on record`}">—</span>`:`<span class="ka-cost">R${e.keeperCost}</span>`;return`
    <li class="ka-row ${e.class===V.UNKNOWN?`is-unknown`:``} ${e.standing===`unavailable`?`is-unavailable`:``}">
      <span class="ka-n" aria-hidden="true">${t}</span>
      <span class="ka-main">
        <span class="ka-name">${o(i)}</span>
        ${a?`<span class="ka-where">${o(a)}</span>`:``}
        <span class="ka-why">${Ee(e).map(e=>`<span class="ka-fact"><b>${o(e.label)}</b> ${o(e.value)}</span>`).join(``)}</span>
        ${r.length?`<span class="ka-badges">${r.map(e=>`<span class="pill tiny ${$.has(e)?`is-call`:``}">${o(e)}</span>`).join(``)}</span>`:``}
      </span>
      ${s}
    </li>`}function ot(e,t){let n=e.map(Oe),r=(e,t=0)=>e==null?`—`:Number(e).toFixed(t);return`
    <div class="ka-table-wrap">
      <table class="ka-table">
        <thead>
          <tr>
            <th>Player</th><th>Pos</th>
            <th class="num">${o(t.productionSeason)} Pts</th>
            <th>${o(t.productionSeason)} Finish</th>
            <th class="num">${o(t.draftBasisSeason)} Draft</th>
            <th class="num">${o(t.targetSeason)} Keeper</th>
            <th class="num">${o(t.marketSeason)} ADP</th>
            <th class="num">${o(t.marketSeason)} Exp.</th>
            <th class="num">Value</th>
            <th>Keeper year</th>
          </tr>
        </thead>
        <tbody>
          ${n.map(e=>`
            <tr class="${e.standing===`unavailable`?`is-unavailable`:``}">
              <td>${o(e.player)}</td>
              <td>${o(e.position)}</td>
              <td class="num">${r(e.productionPoints,1)}</td>
              <td>${o(e.positionFinish||`—`)}</td>
              <td class="num">${e.basisRound==null?`—`:`R${e.basisRound}`}</td>
              <td class="num">${e.keeperRound==null?`—`:`R${e.keeperRound}`}</td>
              <td class="num">${r(e.marketAdp,1)}</td>
              <td class="num">${e.expectedRound==null?`—`:`R${e.expectedRound}`}</td>
              <td class="num ${e.roundValue!=null&&e.roundValue>0?`is-plus`:``}">${e.roundValue==null?`—`:e.roundValue>0?`+${e.roundValue}`:e.roundValue}</td>
              <td>${e.keeperYear!=null&&e.maxKeeperYears!=null?`${e.keeperYear} of ${e.maxKeeperYears}`:`—`}</td>
            </tr>`).join(``)}
        </tbody>
      </table>
    </div>`}function st(t,r,i){let a=n(`keepers`,t);return a.length?`
    <div class="card keepcard">
      <div class="kp-head" aria-hidden="true">
        <span>Team</span><span>Keeper</span><span>Held</span><span class="kp-r">Round</span>
      </div>
      ${[...e(a,`team`).entries()].sort((e,t)=>e[0].localeCompare(t[0])).map(([e,t])=>t.map((t,n)=>`
        <div class="kp-row ${n===0?`kp-new`:``} ${f(`keepers`,t)}">
          <span class="kp-team">${n===0?o(m(e,i,{member_id:t.member_id})):``}</span>
          <span class="kp-player">
            ${o(t.player)}
            ${t.notes?`<span class="kp-note">${o(t.notes)}</span>`:``}
          </span>
          ${ct(t,r)}
          <span class="kp-cost ${t.round_cost==null?`none`:``}">${t.round_cost==null?`—`:`${o(t.round_cost)}`}</span>
          ${u(`keepers`,t,{compact:!0})}
        </div>`).join(``)).join(``)}
    </div>`:p(`No keepers for this year.`)}function ct(e,t){let n=Number(e.keeper_year),r=Number(e.year);if(!Number.isFinite(n)||n<1)return`<span class="kp-held none">—</span>`;let i=Number.isFinite(r)?r-n+1:null,a=Math.max(0,(t??P.max_keeper_seasons)-n);return`
    <span class="kp-held">
      ${i==null?``:`<span class="kp-since">${o(i)}</span>`}
      <span class="kp-left ${a===0?`is-final`:``}">${a===0?`final`:`${a} left`}</span>
    </span>`}export{Y as render};