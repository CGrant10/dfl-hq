import {tradeAssessment} from '../trade-assessment.js';
import {sleeperAction} from '../sleeper-links.js';
import {createTradeNegotiation} from '../trade-negotiation-ui.js';
import {tradeLineupFitLabel} from '../trade-suggestion-quality.js';
import {createTradeConnection} from '../trade-connected-motion.js';
import {tradeDecisionMarkup} from '../trade-decision-ui.js';
import {loadTradeWeekSchedules} from '../trade-weekly-outlook.js';
import {lineupPreviewsFor} from '../trade-workspace.js';
import {mountAnalyzerLiveRefresh} from "../analyzer-live-refresh.js";
import {recheckTradeOffer} from '../trade-offer-recheck.js';
import {offerPlayerLimit} from '../trade-package-limits.js';
// =====================================================================
// pages/trade.js - the Trade Desk, on its own page
// ---------------------------------------------------------------------
// It was a section inside the analyzer report, which put a decision with
// a clock on it two taps behind a page you read at leisure. A trade offer
// arrives and you want to answer it now.
//
// It borrows the report's shell deliberately - the same .ta-report card,
// the same lead block, the same section headers - because it is the same
// tool family and a second visual language would just make the app feel
// assembled from parts. Only the desk itself is different.
//
// The evaluation is unchanged: evaluateTrade() via trade-desk.js, on the
// league's own full-PPR scoring.
// =====================================================================

import { esc, errorBox, toast } from "../ui.js";
import { currentMember } from "../members.js";
import { loadAnalyzerData } from "../team-analyzer-data.js";
import { mountTradeDesk, recommendationFor, tradeDeskMarkup, tradeReasons, verdictFor } from "../trade-desk.js";
import { shareDeal } from "../trade-card.js";
import {createTradeOfferSearch} from '../trade-offer-search.js';
import {createTradeOfferCatalog} from '../trade-offer-catalog.js';
import { loadTradeAlerts,loadTradeAlertByTransaction } from "../trade-alerts.js";
import { playerPortrait } from "../player-presentation.js";
import { teamIdentity, teamPortrait } from "../team-presentation.js";
import { recommendationOutcomes, tradeModelHealth, tradeModelHealthMarkup } from "../trade-model-health.js";
import { loadSharedTradeRecommendations, saveTradeRecommendation } from "../trade-accountability.js";
import { readViewMemory, writeViewMemory } from '../view-memory.js';
import { tradeDraft, restoreTradeDraft } from '../trade-draft.js';
import {tradePerspective,tradeTransfers} from '../trade-routing.js';
import {evaluateTradeDeal,readTradeProposals,writeTradeProposals,savedTradeProposal,restoreTradeProposal,applyTradeDeal} from '../trade-workspace.js';
import {proposalsMarkup,tradeDataContext,tradeOfferEmptyCopy,closestTradeOffers} from '../trade-workspace-ui.js';
import { mountTradePlayerPickers, focusTradePicker } from '../trade-player-picker.js';

import {completedTradeMarkup} from '../trade-receipt-ui.js';
export {completedTradeMarkup} from '../trade-receipt-ui.js';

const teamName = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || ""}`;
const signed = value => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(Number(value) || 0).toFixed(1)}`;
const shapeLabel = offer => `${offer.sendA.length} FOR ${offer.sendB.length}`;
const offerKey=offer=>JSON.stringify([offer.parties?.map(p=>String(p.id))||[String(offer.other?.id??'')],offer.sends||[offer.sendA,offer.sendB],offer.destinations||null]);
const tierCopy = {
  fair: { title: "Fair", call: "FAIR SHOT" },
  aggressive: { title: "Aggressive", call: "WORTH A TEXT" },
  steal: { title: "Steal", call: "SWING BIG" },
};
const OFFER_BATCH_SIZE = 6;
let saveDraft = null;
let stopOffers = null, stopRefresh = null, renderEpoch = 0;
export function leave() { renderEpoch++;stopRefresh?.();stopRefresh=null;saveDraft?.(); saveDraft = null; stopOffers?.(); stopOffers=null; }

function offerPlayerRows(ids, pool, routing=null) {
  return ids.map(id => {
    const player = pool.get(String(id)) || {id,name:String(id)};
    const recipient=routing?.parties.find(t=>String(t.id)===String(routing.destinations?.[id]));
    return `<span class="tb-player"><button type="button" class="tb-player-link" data-player-card="${esc(id)}" aria-label="View ${esc(player.name)} player card">${playerPortrait(player)}<span><strong>${esc(player.name)}</strong><small>${esc([player.position,player.nflTeam].filter(Boolean).join(' · '))}</small>${routing?`<small class="tb-player-destination">→ ${esc(recipient?teamName(recipient):'Choose recipient')}</small>`:''}</span></button></span>`;
  }).join("");
}

function offerPackage(ids,pool,label,routing=null){
 const sorted=[...ids].sort((a,b)=>(pool.get(String(b))?.tradeValue||0)-(pool.get(String(a))?.tradeValue||0));
 return `<section class="tb-package"><small>${label}</small>${offerPlayerRows(sorted,pool,routing)}</section>`;
}

function offerSummary(offer,pool){
 const p=tradePerspective(offer),a=tradeAssessment(p),deltas=offer.windowDeltas||offer.weeklyDeltas||[a.weeklyA,a.weeklyB];
 const window=offer.windowWeeks?.length?`Weeks ${offer.windowWeeks[0]}–${offer.windowWeeks.at(-1)}`:'Rest of season';
 return `<div class="tb-offer-summary" aria-label="Trade balance, lineup impact and risk"><strong class="tb-offer-fit">${esc(tradeLineupFitLabel(deltas))}</strong><dl><div><dt>Price balance</dt><dd>${Math.round(a.fairness)}%</dd></div><div><dt>You · pts/wk</dt><dd class="${deltas[0]<0?'is-down':'is-up'}">${signed(deltas[0])}</dd></div><div><dt>${offer.parties?'Group balance':'Them · pts/wk'}</dt><dd>${offer.parties?offer.fairness+'%':signed(deltas[1])}</dd></div></dl><span class="tb-offer-horizon">${esc(window)} · projected</span>${a.flags.length?`<span class="tb-offer-risk">${esc(a.flags.join(' · '))}</span>`:''}${p.requiredDropsA?.length?`<span class="tb-offer-risk">Drop: ${esc(p.requiredDropsA.map(id=>pool.get(String(id))?.name||id).join(', '))}</span>`:''}${p.openSlotsA?`<span class="tb-offer-risk">${p.openSlotsA} open roster spot${p.openSlotsA===1?'':'s'}</span>`:''}</div>`;
}

function offerMarkup(offer, pool) {
  if (offer.parties) return `<article class="tb-offer tb-multi-offer" data-offer-key="${esc(offerKey(offer))}"><header><span>${offer.parties.length}-TEAM</span><b>${offer.fairness}% BALANCE</b></header><div class="tb-multi-flow">${offer.parties.map((party, index) => `<section>${teamIdentity(party, { compact: true })}${offerPackage(offer.sends[index], pool,"SENDS",offer)}<small>LINEUP ${signed(offer.weeklyDeltas[index])}</small></section>`).join("")}</div>${offerSummary(offer,pool)}<button type="button" class="tb-offer-analyze" data-td-load-offer data-partner="${esc(offer.other.id)}" data-parties="${esc(JSON.stringify(offer.parties.slice(1).map(p => p.id)))}" data-sends="${esc(JSON.stringify(offer.sends))}" data-destinations="${esc(JSON.stringify(offer.destinations))}">Analyze trade <span aria-hidden="true">→</span></button></article>`;
  const call = tradeAssessment(offer).price.headline.toUpperCase();
  return `<article class="tb-offer" data-offer-key="${esc(offerKey(offer))}">
    <header><small class="tb-offer-owner">${teamPortrait(offer.other, { className: "tb-team-mark" })}<strong>${esc(teamName(offer.other))}</strong></small><span>${shapeLabel(offer)}</span><b>${call}</b></header>
    <div class="tb-offer-flow">${offerPackage(offer.sendA,pool,'YOU SEND')}${offerPackage(offer.sendB,pool,'YOU GET')}</div>
    ${offerSummary(offer,pool)}
    <button type="button" class="tb-offer-analyze" aria-label="Analyze ${shapeLabel(offer)} offer" data-td-load-offer data-partner="${esc(offer.other.id)}" data-send-a="${esc(offer.sendA.join(','))}" data-send-b="${esc(offer.sendB.join(','))}" data-weekly-delta="${Number(offer.weeklyDeltaA)||0}">Analyze trade <span aria-hidden="true">→</span></button>
  </article>`;
}

function tierMarkup(tier, offers, pool, open, total = offers.length) {
  const copy = tierCopy[tier];
  return `<details class="tb-tier is-${tier}" data-tb-tier="${tier}"${open ? " open" : ""}>
    <summary><span class="tb-tier-mark" aria-hidden="true"></span><span><b>${copy.title} (${total})</b></span><svg class="ico tb-tier-chevron" aria-hidden="true"><use href="#i-chev-right"></use></svg></summary>
    <div>${offers.map(offer => offerMarkup(offer, pool)).join("")}</div>
  </details>`;
}

function anchorChips(ids, pool, side) {
  if (!ids.length) return `<span class="tb-anchor-empty">Any player</span>`;
  return ids.map(id => {
    const player = pool.get(String(id)) || {name:String(id)};
    return `<button type="button" aria-label="Remove ${esc(player.name)}" data-tb-remove-anchor="${side}" data-player-id="${esc(id)}">${playerPortrait(player)}<span>${esc(player.name)}</span><i aria-hidden="true">×</i></button>`;
  }).join("");
}

function anchorOptions(players, selected, label) {
  return `${label == null ? "" : `<option value="">${label}</option>`}${players.filter(player => !selected.includes(String(player.id)))
    .map(player => `<option value="${esc(player.id)}">${esc(player.name)} · ${player.position} · ${Math.round(player.tradeValue)}</option>`).join("")}`;
}

/*
  THE LAB BELONGS BESIDE THE DESK.

  It was the last thing on the analyzer report, which meant the two halves of
  one job - "what could I trade" and "is this trade good" - sat on different
  pages. They are the same question asked in either direction, so they are now
  the same page: propose above, judge below.
*/
function tradeBoardHeader(mode='offers',leagueId=null){
 return `<div class="tb-head-row page-identity"><header class="tb-head"><small>DFLYZER</small><h1>${mode==='room'?'Deal Room':mode==='manual'?'Check a trade':'Trade Board'}</h1></header><div class="td-external-tools">${sleeperAction(leagueId,'trades',{label:'Sleeper'})}<a class="btn ghost small" href="#/trade?receipts=1">Receipts</a></div></div><div class="td-entry-actions" aria-label="Trade tools"><button type="button" data-td-mode="offers" aria-pressed="${mode==='offers'}">Find offers</button><button type="button" data-td-mode="manual" aria-pressed="${mode==='manual'}">Check a trade</button><button type="button" data-td-mode="room" aria-pressed="${mode==='room'}">Deal room</button><button type="button" data-td-compare aria-label="Compare saved deals">Saved deals</button></div>`;
}

function tradeLab(team, teams, pool, shop) {
  if(shop.mode==='room')return `<section class="tb-board">${tradeBoardHeader('room',shop.leagueId)}</section>`;
  if(shop.mode==='manual')return `<section class="tb-board">${tradeBoardHeader('manual',shop.leagueId)}</section>`;
  const otherTeams = teams.filter(item => String(item.id) !== String(team.id));
  const allPartners = shop.partnerId === "all";
  const partner = allPartners ? null
    : otherTeams.find(item => String(item.id) === String(shop.partnerId)) || otherTeams[0];
  if (!allPartners) shop.partnerId = partner?.id || "";
  let partnerKey = allPartners ? "all" : partner?.id || "";
  const minePlayers = (team.playerIds || []).map(id => pool.get(String(id))).filter(Boolean).sort((a, b) => b.tradeValue - a.tradeValue);
  shop.memberIds = (shop.memberIds || []).filter((id, index, ids) => otherTeams.some(t => String(t.id) === String(id)) && String(id) !== String(partner?.id) && ids.indexOf(id) === index);
  if (allPartners) shop.memberIds = [];
  const parties = [team, partner, ...shop.memberIds.map(id => otherTeams.find(t => String(t.id) === String(id)))].filter(Boolean);
  const multi = parties.length > 2;
  const returnTeam = multi ? parties.at(-1) : partner;
  const theirPlayers = (returnTeam?.playerIds || []).map(id => pool.get(String(id))).filter(Boolean).sort((a, b) => b.tradeValue - a.tradeValue);
  partnerKey = [partnerKey, ...shop.memberIds].join("/");
  shop.sendAnchors = (shop.sendAnchors || []).filter(id => minePlayers.some(player => String(player.id) === String(id)));
  if (String(shop.anchorPartnerId) !== String(partnerKey)) {
    /* A new partner must start unanchored. Auto-selecting their most valuable
       player forced every batch to invent a blockbuster before the user had
       asked for one, which made the "fair" tier look ridiculous. */
    shop.receiveAnchors = [];
    shop.anchorPartnerId = partnerKey;
  } else {
    shop.receiveAnchors = (shop.receiveAnchors || []).filter(id => theirPlayers.some(player => String(player.id) === String(id)));
  }
  const anchorMinimum = Math.max(1, shop.sendAnchors.length) + Math.max(1, shop.receiveAnchors.length) + Math.max(0, parties.length - 2);
  const maxPlayers = offerPlayerLimit(shop.maxPlayers, shop.sendAnchors, shop.receiveAnchors, parties.length);
  shop.maxPlayers = maxPlayers;
  const sendCount = shop.sendCount || "any", receiveCount = shop.receiveCount || "any", intent = shop.intent || "fair";
  const shapeKeys = [];
  for (let send = 1; send < maxPlayers; send++) {
    for (let receive = 1; send + receive <= maxPlayers; receive++) {
      if (send < shop.sendAnchors.length || receive < shop.receiveAnchors.length) continue;
      if (sendCount !== "any" && send !== Number(sendCount)) continue;
      if (receiveCount !== "any" && receive !== Number(receiveCount)) continue;
      shapeKeys.push(`${send}-${receive}`);
    }
  }
  const cacheKey = [shop.horizon||'season',shop.scheduleStamp||0,shop.goal||"best",team.id, partnerKey, shop.sendAnchors.join(","), shop.receiveAnchors.join(","), maxPlayers, sendCount, receiveCount].map(String).join("|");
  const query={teamId:team.id,partnerId: allPartners ? undefined : partner?.id,partyIds:multi?parties.map(t=>t.id):null,
    goal:shop.goal||"best",horizon:shop.horizon||'season',weekSchedules:shop.weekSchedules||[],maxPlayers,sendAnchorIds:shop.sendAnchors,receiveAnchorIds:shop.receiveAnchors,sendCount,receiveCount,intent,
    limit:allPartners?132:96,shapes:shapeKeys};
  const result=shop.findOffers(cacheKey,query);
  const intentCount = tier => result.countErrors?.[tier] ? '?' : result.counts?.[tier] ?? '…';
  const intentLabel = (tier, label) => result.countErrors?.[tier] ? `${label}: count unavailable. Tap to retry.`
    : result.counts?.[tier] == null ? `${label}: finding offers` : `${label}: ${result.counts[tier]} generated offers`;
  const allOffers=result.offers||[],searching=result.state==='loading',failed=result.state==='error';
  const tierOffers = allOffers.filter(offer => offer.tier === intent);
  const closestOffers=closestTradeOffers(allOffers,intent),closestTier=closestOffers[0]?.tier;
  const representedTeams = new Set(tierOffers.map(offer => String(offer.other?.id??''))).size;
  /* Keep earlier results on screen. The old four-card carousel reported the
     full generated count but silently replaced one batch with the next, so a
     user could never inspect all of the offers the model said it found. */
  const visibleCount = Math.min(tierOffers.length, Math.max(OFFER_BATCH_SIZE, Number(shop.visibleCount) || OFFER_BATCH_SIZE));
  const visibleOffers = tierOffers.slice(0, visibleCount);
  const remainingOffers = Math.max(0, tierOffers.length - visibleOffers.length);
  const nextOfferCount = Math.min(OFFER_BATCH_SIZE, remainingOffers);
  const moreLabel = remainingOffers
    ? `Show ${nextOfferCount} more · ${remainingOffers} remaining`
    : `All ${tierOffers.length} offers shown`;
  shop.openTiers ||= new Set();
  const countOptions = (side, selected, minimum) => `<option value="any" ${selected === "any" ? "selected" : ""}>Any</option>${Array.from({ length: 7 }, (_, index) => index + 1)
    .filter(count => count >= minimum && count < maxPlayers - shop.memberIds.length)
    .map(count => `<option value="${count}" ${String(selected) === String(count) ? "selected" : ""}>${count}</option>`).join("")}`;
  return `<section class="tb-board">
    ${tradeBoardHeader(shop.mode,shop.leagueId)}
    <details class="tb-workbench-card tb-setup" aria-label="Trade workbench"${shop.setupOpen?' open':''}>
      <summary class="tb-setup-summary"><span><small>TRADE SEARCH</small><strong>${esc(teamName(team))} <i aria-hidden="true"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 5h12m-3-3 3 3-3 3M14 11H2m3-3-3 3 3 3"/></svg></i><span class="sr-only"> with </span> ${esc(allPartners?'All teams':multi?`${parties.length-1} teams`:teamName(partner))}</strong><em>${shop.sendAnchors.length||'Any'} to send · ${shop.receiveAnchors.length||'Any'} to get · Up to ${maxPlayers} players</em></span><b>Edit search</b></summary><div class="tb-setup-body">
        <div class="tb-team-choices">
          <label class="tb-team-select tb-identity-select"><span>Trading as</span><span class="tb-team-choice" aria-hidden="true">${teamPortrait(team)}<strong>${esc(teamName(team))}</strong><i>⌄</i></span><select aria-label="Trading as" data-td-team>${teams.map(item => `<option value="${esc(item.id)}" ${String(item.id) === String(team.id) ? "selected" : ""}>${esc(teamName(item))}</option>`).join("")}</select></label>
          <label class="tb-team-select tb-identity-select"><span>Trade with</span><span class="tb-team-choice" aria-hidden="true">${teamPortrait(partner || {team_name:"DFL",ownerName:"All teams"})}<strong>${esc(allPartners ? "All league teams" : teamName(partner))}</strong><i>⌄</i></span><select aria-label="Trade with" data-ta-shop-partner><option value="all" ${allPartners ? "selected" : ""}>All teams · Shop league-wide</option>${otherTeams.map(item => `<option value="${esc(item.id)}" ${!allPartners && String(item.id) === String(partner?.id) ? "selected" : ""}>${esc(teamName(item))}</option>`).join("")}</select></label>
        </div>
        <div class="tb-blueprint tb-player-pickers">
          <section><header><small>PLAYERS I’LL MOVE</small></header><div class="tb-anchor-chips">${anchorChips(shop.sendAnchors, pool, "send")}</div><select aria-label="Add one of your players to send" data-tb-add-anchor="send">${anchorOptions(minePlayers, shop.sendAnchors, "Add player…")}</select></section>
          ${allPartners ? `<section class="tb-league-return"><header><small>PLAYERS I WANT</small><span>Any team</span></header><div class="tb-anchor-chips"><span class="tb-anchor-empty">Best league-wide return</span></div><select aria-label="Choose a player you want from any team" data-tb-league-target><option value="">Add player…</option>${otherTeams.map(owner => `<optgroup label="${esc(teamName(owner))}">${anchorOptions((owner.playerIds || []).map(id => pool.get(String(id))).filter(Boolean).sort((a,b) => b.tradeValue-a.tradeValue), [], null)}</optgroup>`).join('')}</select></section>`
            : `<section><header><small>PLAYERS I WANT</small></header><div class="tb-anchor-chips">${anchorChips(shop.receiveAnchors, pool, "receive")}</div><select aria-label="Add a player you want to receive" data-tb-add-anchor="receive">${anchorOptions(theirPlayers, shop.receiveAnchors, "Add player…")}</select></section>`}
        </div>
        <details class="tb-refine"${shop.refineOpen?' open':''}><summary><span class="tb-refine-action">More controls<i aria-hidden="true"></i></span><small class="tb-refine-settings"><span>Up to <b data-tb-max-summary>${maxPlayers}</b> total</span><span>Send ${sendCount === 'any' ? 'any' : Number(sendCount)} · Get ${receiveCount === 'any' ? 'any' : Number(receiveCount)}</span></small></summary>
        <div class="tb-members">${shop.memberIds.map((id, index) => `<div class="td-member-control"><label class="tb-team-select"><span>Member ${index + 3}</span><select data-tb-member="${index}">${otherTeams.filter(t => String(t.id) !== String(partner?.id) && (!shop.memberIds.includes(t.id) || String(t.id) === String(id))).map(t => `<option value="${esc(t.id)}" ${String(t.id) === String(id) ? "selected" : ""}>${esc(teamName(t))}</option>`).join("")}</select></label><button type="button" class="td-remove-member" data-tb-remove-member="${index}" aria-label="Remove ${esc(teamName(parties[index + 2]))}">×</button></div>`).join("")}${parties.length < Math.min(8, teams.length) ? `<button type="button" class="btn ghost small" data-tb-add-member>+ Add member</button>` : ""}</div>
        ${multi ? `<div class="tb-trade-route"><button type="button" class="btn ghost small" data-td-mode="manual">Choose destinations</button></div>` : ""}
<div class="tb-package-controls">
          <label class="tb-max"><span>Maximum package size <output data-tb-max-output>${maxPlayers}</output></span><input type="range" min="${anchorMinimum}" max="8" step="1" value="${maxPlayers}" data-tb-max></label>
          <div class="tb-split"><label><span>You send</span><select data-tb-send-count>${countOptions("send", sendCount, Math.max(1, shop.sendAnchors.length))}</select></label><b aria-hidden="true">↔</b><label><span>You get</span><select data-tb-receive-count>${countOptions("receive", receiveCount, Math.max(1, shop.receiveAnchors.length))}</select></label></div>
        </div>
        <label class="tb-goal"><span>Trade goal</span><select data-tb-goal>${[['best','Best fit'],['starter','Upgrade a starter'],['consolidate','Depth for a stud'],['RB','Add RB help'],['WR','Add WR help'],['TE','Add TE help'],['QB','Add QB help']].map(([value,label])=>`<option value="${value}"${(shop.goal||'best')===value?' selected':''}>${label}</option>`).join('')}</select></label>
        ${!shop.sendAnchors.length&&!shop.receiveAnchors.length&&['RB','WR','TE','QB'].includes(team.need)?`<button type="button" class="btn ghost small tb-need-action" data-tb-shop-need="${esc(team.need)}">Find ${esc(team.need)} help across the league <span aria-hidden="true">→</span></button>`:''}
        <label class="tb-goal"><span>Plan for</span><select data-tb-horizon${shop.scheduleLoading?' disabled':''}><option value="season"${shop.horizon!=='next4'?' selected':''}>Rest of season</option><option value="next4"${shop.horizon==='next4'?' selected':''}>Next 4 weeks</option></select></label>
        ${shop.scheduleLoading?'<p class="tb-search-status" role="status">Checking upcoming schedules…</p>':shop.scheduleError?'<p class="tb-search-status" role="status">Upcoming schedules unavailable. Using rest of season.</p><button type="button" class="btn ghost small" data-tb-retry-schedules>Retry schedules</button>':''}
        </details>
      <button type="button" class="btn tb-browse-offers" data-tb-view-offers>View offers <span aria-hidden="true">→</span></button></div>
    </details>
    <div class="tb-intent" aria-label="Offer type"><span>SHOW ME</span><div class="tb-intent-options" data-intent="${intent}"><i aria-hidden="true"></i>${[["fair", "Fair"], ["aggressive", "Aggressive"], ["steal", "Steal"]].map(([value, label]) => `<button type="button" data-tb-intent="${value}" aria-pressed="${intent === value}" aria-label="${intentLabel(value,label)}" class="${intent === value ? "is-active" : ""}"><span>${label}</span><span class="tb-intent-count" data-tb-intent-count>(${intentCount(value)})</span></button>`).join("")}</div></div>
    <section class="tb-layout-section" data-tb-offers tabindex="-1">
      <h2 class="section-title">Generated offers<span class="count">${searching?'Finding offers…':failed?'Try again':closestOffers.length?`${closestOffers.length} alternatives`:`Showing ${visibleOffers.length} of ${tierOffers.length}${allPartners ? ` · ${representedTeams} teams` : ""}`}</span></h2>
      <div class="tb-offers-card" aria-busy="${searching}">
        ${searching?'<p class="tb-search-status" role="status">Finding offers…</p><div class="tb-search-placeholder" aria-hidden="true"><i></i><i></i><i></i></div>':failed?'<p class="tb-search-status" role="status">Couldn’t find offers.</p><button type="button" class="btn ghost small" data-tb-retry>Try again</button>':`
        ${tierOffers.length || !closestOffers.length ? `<div class="tb-tiers">${tierMarkup(intent, visibleOffers, pool, true, tierOffers.length)}</div>` : ""}
        ${tierOffers.length ? "" : `<div class="ta-empty" role="status">${tradeOfferEmptyCopy(intent, shop.receiveAnchors.map(id=>pool.get(String(id))?.position),allOffers)}</div>`}
        ${closestOffers.length ? `<div data-tb-closest><p class="tb-search-status">Closest available</p><div class="tb-tiers">${tierMarkup(closestTier,closestOffers,pool,true)}</div><button type="button" class="btn ghost small" data-tb-intent="${closestTier}">See all ${tierCopy[closestTier].title} offers</button></div>` : ""}
        ${closestOffers.length ? "" : `
        <div class="tb-offer-actions">
          <button type="button" class="tb-generate${shop.justRefreshed ? " is-refreshed" : ""}" data-tb-generate ${remainingOffers ? "" : "disabled"}><i class="tb-refresh-mark" aria-hidden="true"></i><span data-tb-generate-label data-default-label="${esc(moreLabel)}">${shop.justRefreshed ? "Offers refreshed" : esc(moreLabel)}</span></button>
          ${remainingOffers > OFFER_BATCH_SIZE ? `<button type="button" class="tb-show-all" data-tb-show-all>Show all ${tierOffers.length}</button>` : ""}
        </div>
        `}
        `}
      </div>
    </section>
  </section>`;
}

/*
  A MULTI-TEAM RESULT REPORTED FROM THE FIRST PARTY'S POINT OF VIEW.

  verdictFor() and recommendationFor() both read valueToA/valueToB and
  weeklyDeltaA/B, which a three-way does not have - it has arrays. trade-desk
  does exactly this remap for the ticket; the share card has to agree with the
  ticket, so it uses the same one rather than a second interpretation.
*/
function perspectiveOf({ result, parties }) {
  return tradePerspective(result);
}



function page(data, tradeAlerts = []) {
  const me = currentMember();
  const params = new URLSearchParams((location.hash.split("?")[1] || ""));
  const routeTeam = params.get("team");
  const selectedTransactionId = params.get("tx") || "";
  let selectedId = data.teams.find(team => String(team.id) === String(routeTeam))?.id
    || data.teams.find(team => String(team.sleeper_user_id) === String(me?.sleeper_user_id))?.id
    || data.teams[0].id;
  const trade = { memberIds: [], sends: [new Set(), new Set()], editing: true, destinations:{} };
  const shop = { leagueId:data.league?.sleeper_league_id,partnerId: "all", memberIds: [], anchorPartnerId: "", sendAnchors: [], receiveAnchors: [],
    setupOpen:true,goal:"best",horizon:'season',maxPlayers: 8, sendCount: "any", receiveCount: "any", intent: "fair", visibleCount: OFFER_BATCH_SIZE,
    openTiers: new Set(["fair"]), mode:"offers", customOpen: false, sharedAudit: [] };
  const draftKey = `trade:${data.projectionSeason}`;
  const saved = restoreTradeDraft(readViewMemory(me?.id, draftKey), data.teams, routeTeam);
  if (saved) { selectedId = saved.selectedId; Object.assign(trade, saved.trade); Object.assign(shop, saved.shop); }
  // A new visit shops the whole league. Keep the manual draft separately;
  // an explicit incoming target link can still narrow the search below.
  Object.assign(shop,{partnerId:"all",memberIds:[],anchorPartnerId:"all",receiveAnchors:[],mode:"offers",customOpen:false,intent:"fair",openTiers:new Set(["fair"])});
  if(params.get('room')==='1')shop.mode='room';
  const target = params.get('target'), partner = data.teams.find(t => String(t.id) === params.get('partner'));
  if (target && partner && String(partner.id) !== String(selectedId) && partner.playerIds.map(String).includes(target)) {
    shop.partnerId = partner.id; shop.memberIds = []; shop.anchorPartnerId = partner.id;
    shop.receiveAnchors = [target]; shop.sendAnchors = []; shop.sendCount = 'any'; shop.receiveCount = 'any';shop.mode='offers';shop.customOpen=false;shop.refineOpen=true;shop.setupOpen=true;
  }
  saveDraft = () => writeViewMemory(me?.id, draftKey, tradeDraft({ selectedId, trade, shop }));

  return {
    markup: `<div class="ta-report td-page" data-td-body></div>${completedTradeMarkup(tradeAlerts, selectedTransactionId)}`,

    wire(view) {
      stopOffers?.();
      const body = view.querySelector("[data-td-body]");
      let catalog,activeOfferKey=null;
      const connection=createTradeConnection();
      let stopped=false;
      const current=()=>!stopped&&view.isConnected;
      stopOffers=()=>{stopped=true;shop.intentStamp=(shop.intentStamp||0)+1;connection.stop();catalog.stop();negotiation.stop();};
      const negotiation=createTradeNegotiation({member:me,getData:()=>data,getDeal:()=>deal,
        onEdit:next=>{if(next){selectedId=next.parties[0].id;applyTradeDeal(trade,next);}shop.mode='manual';shop.customOpen=true;draw();body.querySelector('.td-custom')?.scrollIntoView({block:'start',behavior:'instant'});body.querySelector('.td-working-as select')?.focus({preventScroll:true});},
        onRoom:()=>{shop.mode='room';shop.customOpen=false;draw();body.querySelector('[data-tr-host]')?.scrollIntoView({block:'start',behavior:'instant'});}});
      const wireOfferTiers=scope=>{scope.querySelectorAll(".tb-supporting").forEach(d=>{d.open=!!shop.openPackages?.has(d.dataset.pageDetail)});scope.querySelectorAll('[data-tb-tier]').forEach(section=>section.addEventListener('toggle',()=>{
        if(!current()||!body.contains(section))return;
        const tier=section.dataset.tbTier;
        if(section.open)shop.openTiers.add(tier);else shop.openTiers.delete(tier);
        saveDraft?.();
      }));};
      const paintOffers=({countsOnly=false}={})=>{
        if(!current()||shop.mode!=='offers')return;
        const old=body.querySelector('[data-tb-offers]');if(!old)return;
        const focused=old.contains(document.activeElement);
        const template=document.createElement('template');
        template.innerHTML=tradeLab(data.teams.find(t=>String(t.id)===String(selectedId))||data.teams[0],data.teams,data.pool,shop);
        template.content.querySelectorAll('.tb-intent-options [data-tb-intent]').forEach(next=>{
          const button=body.querySelector(`[data-tb-intent="${next.dataset.tbIntent}"]`);
          if(!button)return;
          button.querySelector('[data-tb-intent-count]').textContent=next.querySelector('[data-tb-intent-count]').textContent;
          button.setAttribute('aria-label',next.getAttribute('aria-label'));
        });
        if(countsOnly)return;
        const next=template.content.querySelector('[data-tb-offers]');
        old.replaceWith(next);wireOfferTiers(next);
        if(focused)next.focus({preventScroll:true});
      };
      const newCatalog=()=>createTradeOfferCatalog({search:createTradeOfferSearch({teams:data.teams,pool:data.pool}),
        onChange:({tier})=>{if(current())paintOffers({countsOnly:tier!==shop.intent});}});
      catalog=newCatalog();
      shop.findOffers=(key,query)=>shop.offerState={key,...(shop.horizon==='next4'&&shop.scheduleLoading?{state:'loading',offers:[],counts:{}}:catalog.read(key,query))};
      /* Whatever the ticket is currently showing, so Share renders the same
         deal the reader is looking at rather than re-deriving one. */
      let deal = null,proposals=readTradeProposals(me?.id,data.projectionSeason),proposalsOpen=false,transactionScrolled=false;
      body.addEventListener('toggle',event=>{
        if(event.target.matches('.tb-supporting')&&body.contains(event.target)){shop.openPackages||=new Set();if(event.target.open)shop.openPackages.add(event.target.dataset.pageDetail);else shop.openPackages.delete(event.target.dataset.pageDetail);}
        if(event.target.matches('.td-proposals'))proposalsOpen=event.target.open;
        if(event.target.matches('.tb-setup')){shop.setupOpen=event.target.open;saveDraft?.();}
        if(event.target.matches('.tb-refine')){shop.refineOpen=event.target.open;saveDraft?.();}
      },true);

      let sharing = false;
      const draw = () => {
        if (!current()) return;connection.cancel();
        if(shop.mode!=='offers'){shop.offerState=null;catalog.cancel();}
        // Native toggle events can arrive after an immediate control redraw.
        // Read the current DOM first so an open disclosure never snaps closed.

        const setup=body.querySelector(".tb-setup");if(setup)shop.setupOpen=setup.open;
        const refine=body.querySelector('.tb-refine'),comparison=body.querySelector('.td-proposals');
        if(refine)shop.refineOpen=refine.open;
        if(comparison)proposalsOpen=comparison.open;
        const team = data.teams.find(item => item.id === selectedId) || data.teams[0];
        const openPackages=new Set([...body.querySelectorAll(".tb-supporting[open]")].map(d=>d.dataset.pageDetail));if(body.querySelector(".tb-supporting"))shop.openPackages=openPackages;
        body.dataset.mode=shop.mode||"offers";
        body.innerHTML = `${tradeLab(team, data.teams, data.pool, shop)}
          ${shop.mode==='room'?'<div data-tr-host></div>':''}
          <details class="ta-report-section td-custom"${shop.customOpen ? " open" : ""}>
            <summary class="ta-report-title"><div><small>MANUAL MODE</small><h2>Build your own package</h2></div><span class="ta-fold-hint">Up to 8 players</span><span class="ta-fold-chevron" aria-hidden="true"></span></summary>
            ${shop.customOpen ? `<div class="ta-section-body"><label class="tb-team-select td-working-as"><span>Trading as</span><select data-td-team>${data.teams.map(t=>`<option value="${esc(t.id)}" ${String(t.id)===String(selectedId)?'selected':''}>${esc(teamName(t))}</option>`).join('')}</select></label><div data-trade-desk>${tradeDeskMarkup(team, data.teams, data.pool, trade)}</div>
            <div class="td-share"><button type="button" class="btn" data-td-negotiate disabled>${negotiation.editing()?.status==='pending'?'Review counter':'Save / send offer'}</button><button type="button" class="btn ghost" data-td-share disabled>Share this ticket</button>${negotiation.editing()?'<button type="button" class="btn ghost small" data-td-unlink-room>Start a separate offer</button>':''}</div></div>` : ""}
          </details>
          <div data-td-proposals-slot>${proposalsMarkup(proposals,data.teams,data.pool,proposalsOpen)}</div>${tradeDataContext(data,data.pool)}
          <div data-td-health>${tradeModelHealthMarkup({ ...tradeModelHealth(data.pool), accountability: recommendationOutcomes(data.pool, localStorage,
            shop.sharedAudit.filter(row => !row.season || Number(row.season) === Number(data.projectionSeason))) }, esc, true)}</div>`;
        const share = body.querySelector("[data-td-share]");
        const send = body.querySelector('[data-td-negotiate]');
        negotiation.mount(body.querySelector('[data-tr-host]'));
        mountTradePlayerPickers(body, data.pool, data.teams);
        mountTradeDesk(body.querySelector("[data-trade-desk]"), {
          team, teams: data.teams, pool: data.pool, state: trade, lockedIds:[...shop.sendAnchors,...shop.receiveAnchors], onPartnerChange: (focus={}) => {draw();if(focus.memberIndex!=null)body.querySelector(`[data-td-member="${focus.memberIndex}"]`)?.focus();else body.querySelector("[data-td-verdict]")?.scrollIntoView({behavior:"instant",block:"start"});},
          onDeal: current => {
            deal = current;
            if(activeOfferKey&&current){const header=body.querySelector('[data-td-verdict] .td-ticket-head');if(header&&!header.querySelector('[data-offer-return]'))header.insertAdjacentHTML('afterbegin','<button type="button" class="linkbtn td-offer-return" data-td-mode="offers" data-offer-return>← Back to offers</button>');}
            saveDraft?.();
            /* Nothing to share until both sides have somebody on them, and a
               disabled button says that better than an error would. */
            if (share) share.disabled = !current || sharing;
            if (send) send.disabled = !current || sharing;
          },
        });
        body.querySelector(".td-custom")?.addEventListener("toggle", event => {
          const open = event.currentTarget.open;
          if (open && !shop.customOpen) { shop.customOpen = true;shop.mode="manual"; draw(); return; }
          shop.customOpen = open;
          saveDraft?.();
        });
        wireOfferTiers(body);
        if (shop.justRefreshed) {
          const stamp = shop.refreshStamp;
          setTimeout(() => {
            if (stamp !== shop.refreshStamp) return;
            shop.justRefreshed = false;
            const button = body.querySelector("[data-tb-generate]");
            button?.classList.remove("is-refreshed");
            const label = button?.querySelector("[data-tb-generate-label]");
            if (label) label.textContent = label.dataset.defaultLabel || "Show more offers";
          }, 1200);
        }
        if(selectedTransactionId&&!transactionScrolled){transactionScrolled=true;requestAnimationFrame(()=>document.getElementById('trade-'+selectedTransactionId)?.scrollIntoView({block:'start',behavior:'instant'}));}
        saveDraft?.();
      };
      const refreshOffers = () => {
        shop.visibleCount = OFFER_BATCH_SIZE; shop.justRefreshed = true; shop.refreshStamp = (shop.refreshStamp || 0) + 1; draw();
      };
      const loadSchedules=async()=>{
        if(shop.scheduleLoading)return;
        shop.scheduleLoading=true;shop.scheduleError=false;draw();
        const scheduleKey=`${data.projectionSeason}:${data.liveWeek}`;
        const rows=await loadTradeWeekSchedules(data.projectionSeason,data.liveWeek);
        if(!current())return;
        if(scheduleKey!==`${data.projectionSeason}:${data.liveWeek}`){shop.scheduleLoading=false;void loadSchedules();return;}
        shop.scheduleLoading=false;shop.scheduleStamp=(shop.scheduleStamp||0)+1;
        if(!rows.length||rows.some(row=>!row.schedule)){shop.scheduleError=true;shop.horizon='season';shop.weekSchedules=[];}
        else{shop.weekSchedules=rows;shop.weekScheduleKey=scheduleKey;shop.horizon='next4';}
        refreshOffers();
      };
      const resetBlueprint = () => {
        shop.partnerId = "all"; shop.memberIds = []; shop.anchorPartnerId = ""; shop.sendAnchors = []; shop.receiveAnchors = [];
        shop.maxPlayers = 8; shop.sendCount = "any"; shop.receiveCount = "any";
        shop.intent = "fair"; shop.visibleCount = OFFER_BATCH_SIZE; shop.openTiers=new Set(["fair"]); shop.customOpen = false;shop.mode="offers";
      };
      body.addEventListener("change", event => {
        if(event.target.matches('[data-tb-horizon]')){shop.horizon=event.target.value;if(shop.horizon==='next4'&&!shop.weekSchedules?.length)void loadSchedules();else refreshOffers();return;}
        if(event.target.matches('[data-tb-goal]')){shop.goal=event.target.value;refreshOffers();return;}
        if (event.target.matches("[data-tb-member]")) {
          shop.memberIds[Number(event.target.dataset.tbMember)] = event.target.value;
          shop.anchorPartnerId = ""; refreshOffers(); return;
        }
        if (event.target.matches("[data-td-team]")) {
          selectedId = event.target.value;
          trade.memberIds = []; trade.sends = [new Set(), new Set()];trade.destinations={};trade.filters={};trade.rosterOpen={}; trade.editing = true;
          const mode=shop.mode;resetBlueprint();shop.mode=mode;shop.customOpen=mode==='manual';
          draw(); body.querySelector("[data-td-team]")?.focus({preventScroll:true}); return;
        }
        if (event.target.matches("[data-ta-shop-partner]")) {
          shop.partnerId = event.target.value; shop.anchorPartnerId = ""; shop.receiveAnchors = [];
          shop.openTiers=new Set([shop.intent]); refreshOffers(); body.querySelector("[data-ta-shop-partner]")?.focus({preventScroll:true}); return;
        }
        if (event.target.matches("[data-tb-league-target]") && event.target.value) {
          const targetId = event.target.value;
          const owner = data.teams.find(item => String(item.id) !== String(selectedId)
            && (item.playerIds || []).some(id => String(id) === targetId));
          if (!owner) { toast("That player is no longer on an available roster. Choose another player.", true); return; }
          shop.partnerId = owner.id;
          shop.memberIds = [];
          shop.anchorPartnerId = String(owner.id);
          shop.receiveAnchors = [targetId];
          refreshOffers();
          focusTradePicker(body.querySelector('[data-tb-add-anchor="receive"]'));
          return;
        }
        const anchorSelect = event.target.closest("[data-tb-add-anchor]");
        if (anchorSelect && anchorSelect.value) {
          const side = anchorSelect.dataset.tbAddAnchor;
          const list = side === "send" ? shop.sendAnchors : shop.receiveAnchors;
          const nextSend = shop.sendAnchors.length + (side === "send" ? 1 : 0);
          const nextReceive = shop.receiveAnchors.length + (side === "receive" ? 1 : 0);
          if (Math.max(1, nextSend) + Math.max(1, nextReceive) + shop.memberIds.length > 8) {
            toast("Offers support up to 8 total players. Remove an anchor to add another.", true);
          } else if (!list.includes(anchorSelect.value)) {
            list.push(anchorSelect.value);
            shop.maxPlayers = offerPlayerLimit(shop.maxPlayers, shop.sendAnchors, shop.receiveAnchors, shop.memberIds.length + 2);
            const countKey = side === "send" ? "sendCount" : "receiveCount";
            if (shop[countKey] !== "any" && Number(shop[countKey]) < list.length) shop[countKey] = "any";
          }
          refreshOffers(); focusTradePicker(body.querySelector(`[data-tb-add-anchor="${side}"]`)); return;
        }
        if (event.target.matches("[data-tb-send-count], [data-tb-receive-count]")) {
          const isSend = event.target.matches("[data-tb-send-count]");
          if (isSend) shop.sendCount = event.target.value;
          else shop.receiveCount = event.target.value;
          const other = isSend ? "receiveCount" : "sendCount";
          if (shop.sendCount !== "any" && shop.receiveCount !== "any"
            && Number(shop.sendCount) + Number(shop.receiveCount) + shop.memberIds.length > shop.maxPlayers) shop[other] = "any";
          refreshOffers(); return;
        }
        if (event.target.matches("[data-tb-max]")) {
          shop.maxPlayers = Number(event.target.value);
          if (shop.sendCount !== "any" && Number(shop.sendCount) >= shop.maxPlayers) shop.sendCount = "any";
          if (shop.receiveCount !== "any" && Number(shop.receiveCount) >= shop.maxPlayers) shop.receiveCount = "any";
          if (shop.sendCount !== "any" && shop.receiveCount !== "any"
            && Number(shop.sendCount) + Number(shop.receiveCount) + shop.memberIds.length > shop.maxPlayers) shop.receiveCount = "any";
          refreshOffers();
        }
      });
      body.addEventListener("input", event => {
        if (!event.target.matches("[data-tb-max]")) return;
        const value = event.target.value;
        const output = body.querySelector("[data-tb-max-output]");
        if (output) output.textContent = value;
        const summary = body.querySelector("[data-tb-max-summary]");
        if (summary) summary.textContent = value;
      });
      body.addEventListener("click", async event => {
        if(event.target.closest('[data-td-negotiate]')){
          if(!deal||sharing)return;const original=deal;sharing=true;event.target.closest('button').disabled=true;
          try{
            const fresh=await loadAnalyzerData({force:true,freshTrade:true});if(!current())return;
            if(deal!==original)throw Error('The package changed. Review it again.');
            if(fresh.state!=='ready'||fresh.projectionSeason!==data.projectionSeason)throw Error('Current rosters are unavailable. Refresh the trade page.');
            const review=recheckTradeOffer(original,data.pool,fresh.teams,fresh.pool);
            data=fresh;catalog.stop();catalog=newCatalog();shop.offerState=null;
            if(review.status==='invalid'){draw();throw Error('A player changed teams. Rebuild this offer.');}
            applyTradeDeal(trade,review.deal);draw();
            if(review.status==='changed')throw Error('Player status or value changed. Review the updated offer.');
            await negotiation.compose();
          }catch(e){toast(e.message||'Could not review offer.',true);}
          finally{sharing=false;const button=body.querySelector('[data-td-negotiate]');if(button)button.disabled=!deal;}
          return;
        }
        if(event.target.closest('[data-td-unlink-room]')){negotiation.clearEdit();draw();return;}
        if(event.target.closest('[data-tb-shop-need]')){const button=event.target.closest('[data-tb-shop-need]');shop.partnerId='all';shop.memberIds=[];shop.anchorPartnerId='';shop.goal=button.dataset.tbShopNeed;shop.intent='fair';shop.openTiers=new Set(['fair']);refreshOffers();return;}
        if(event.target.closest('[data-tb-retry-schedules]')){void loadSchedules();return;}
        if(event.target.closest('[data-tb-retry]')){catalog.retry(shop.offerState?.key,shop.intent);shop.offerState=null;refreshOffers();return;}
        if (event.target.closest("[data-tb-view-offers]")) {
          const setup=body.querySelector(".tb-setup");if(setup)setup.open=false;shop.setupOpen=false;saveDraft?.();
          const offers = body.querySelector(".tb-intent");
          offers?.scrollIntoView({ block: "start", behavior: "instant" });
          offers?.querySelector(`[data-tb-intent="${shop.intent}"]`)?.focus({ preventScroll: true });
          return;
        }
        const modeButton=event.target.closest('[data-td-mode]');
        if(modeButton){if(modeButton.dataset.tdMode==='offers')negotiation.clearEdit();if(modeButton.dataset.tdMode==='manual'&&!trade.sends.some(ids=>ids.size)&&shop.partnerId&&shop.partnerId!=='all'){trade.memberIds=[shop.partnerId,...shop.memberIds];trade.sends=[new Set(shop.sendAnchors),...trade.memberIds.map((_,i)=>new Set(i===trade.memberIds.length-1?shop.receiveAnchors:[]))];trade.destinations={};}const origins=connection.capture(body.querySelector('[data-td-verdict]'));shop.mode=modeButton.dataset.tdMode;shop.customOpen=shop.mode==='manual';draw();const returning=!shop.customOpen&&activeOfferKey?body.querySelector(`[data-offer-key="${CSS.escape(activeOfferKey)}"]`):null;if(returning){returning.scrollIntoView({block:'center',behavior:'instant'});connection.play(origins,returning);returning.querySelector('[data-td-load-offer]')?.focus({preventScroll:true})}else body.querySelector(shop.customOpen?'.td-working-as select':`[data-td-mode="${shop.mode}"]`)?.focus({preventScroll:true});return;}
        if(event.target.closest('[data-td-compare]')){if(shop.mode==='room'){shop.mode='offers';draw();}proposalsOpen=true;const slot=body.querySelector('[data-td-proposals-slot]');slot.innerHTML=proposalsMarkup(proposals,data.teams,data.pool,true);slot.scrollIntoView({block:'start',behavior:'instant'});return;}
        if(event.target.closest('[data-td-save-proposal]')){
          if(!deal)return;const row=savedTradeProposal(deal),fingerprint=r=>JSON.stringify([r.teamIds,r.sends,r.destinations]),existing=proposals.findIndex(r=>fingerprint(r)===fingerprint(row));
          if(existing<0&&proposals.length>=3){toast('Three deals are saved. Remove one from Compare saved deals before saving another.',true);return;}
          const next=existing<0?[...proposals,row]:proposals.map((r,i)=>i===existing?{...row,id:r.id}:r);
          if(!writeTradeProposals(me?.id,data.projectionSeason,next)){toast('This browser could not save the proposal. Try again.',true);return;}
          proposals=next;proposalsOpen=true;body.querySelector('[data-td-proposals-slot]').innerHTML=proposalsMarkup(proposals,data.teams,data.pool,true);toast('Saved for comparison on this device');return;
        }
        const removeProposal=event.target.closest('[data-td-delete-proposal]');
        if(removeProposal){const next=proposals.filter(r=>r.id!==removeProposal.dataset.tdDeleteProposal);if(writeTradeProposals(me?.id,data.projectionSeason,next)){proposals=next;body.querySelector('[data-td-proposals-slot]').innerHTML=proposalsMarkup(proposals,data.teams,data.pool,true);}else toast('Could not remove the saved proposal. Try again.',true);return;}
        const loadProposal=event.target.closest('[data-td-load-proposal]');
        if(loadProposal){const restored=restoreTradeProposal(proposals.find(r=>r.id===loadProposal.dataset.tdLoadProposal),data.teams,data.pool);if(!restored){toast('Those rosters changed. Build a new proposal.',true);return;}selectedId=restored.parties[0].id;applyTradeDeal(trade,restored);shop.mode='manual';shop.customOpen=true;draw();body.querySelector('[data-td-verdict]')?.scrollIntoView({block:'start',behavior:'instant'});return;}
        if (event.target.closest("[data-tb-add-member]")) {
          const team = data.teams.find(t => String(t.id) === String(selectedId));
          if (shop.partnerId === "all") shop.partnerId = data.teams.find(t => String(t.id) !== String(team.id))?.id;
          const used = new Set([team.id, shop.partnerId, ...shop.memberIds].map(String));
          const next = data.teams.find(t => !used.has(String(t.id)));
          if(next){
            const oldIds=[String(selectedId),...trade.memberIds.map(String)],oldSends=trade.sends;
            const hadPicks=oldSends.some(ids=>ids.size),returnOwner=shop.memberIds.at(-1)||shop.partnerId;
            shop.memberIds.push(next.id);
            shop.maxPlayers=Math.min(8,Math.max(shop.maxPlayers,shop.memberIds.length+2));
            shop.anchorPartnerId='';trade.memberIds=[shop.partnerId,...shop.memberIds];
            trade.sends=[selectedId,...trade.memberIds].map(id=>new Set(oldSends[oldIds.indexOf(String(id))]||[]));
            if(!hadPicks){
              trade.sends[0]=new Set(shop.sendAnchors);
              const returnIndex=trade.memberIds.findIndex(id=>String(id)===String(returnOwner))+1;
              if(returnIndex>0)trade.sends[returnIndex]=new Set(shop.receiveAnchors);
              trade.destinations=Object.fromEntries([
                ...shop.sendAnchors.map(id=>[id,String(shop.partnerId)]),
                ...shop.receiveAnchors.map(id=>[id,String(selectedId)]),
              ]);
            }
            trade.editing=true;shop.mode='manual';shop.customOpen=true;draw();
            body.querySelectorAll('[data-td-member]')[trade.memberIds.length-1]?.focus();
          }
          return;
        }
        const removeMember = event.target.closest("[data-tb-remove-member]");
        if (removeMember) { shop.memberIds.splice(Number(removeMember.dataset.tbRemoveMember), 1); shop.anchorPartnerId = ""; refreshOffers(); body.querySelector("[data-tb-add-member]")?.focus(); return; }
        const shareButton = event.target.closest("[data-td-share]");
        if (shareButton) {
          if (!deal) return;
          const original = deal;
          sharing = true;
          shareButton.disabled = true;
          try {
            const fresh = await loadAnalyzerData({force:true,freshTrade:true});
            if(!view.isConnected)return;
            if(deal!==original){toast('The package changed. Share the updated ticket.',true);return;}
            if(fresh.state!=='ready'||fresh.projectionSeason!==data.projectionSeason)throw new Error('Current rosters are unavailable. Refresh the trade page.');
            const review=recheckTradeOffer(original,data.pool,fresh.teams,fresh.pool);
            data=fresh;catalog.stop();catalog=newCatalog();shop.offerState=null;
            if(review.status==='invalid'){
              const restored=restoreTradeDraft(tradeDraft({selectedId,trade,shop}),fresh.teams,selectedId);
              if(restored){Object.assign(trade,restored.trade);Object.assign(shop,restored.shop);}
              draw();toast('A player changed teams. Review the updated package before sharing.',true);return;
            }
            applyTradeDeal(trade,review.deal);draw();
            if(review.status==='changed'){toast('Player status or value changed. Review the updated ticket before sharing.',true);return;}
            await shareDeal({
              ...review.deal,
              pool: data.pool,
              verdict: verdictFor(perspectiveOf(deal)),
              recommendation: recommendationFor(perspectiveOf(deal)),
              remarks: tradeReasons(perspectiveOf(deal), deal.parties[0], deal.parties.length>2?{team_name:'Other members'}:deal.parties[1],
                data.pool, deal.sends[0], deal.receives?.[0]||deal.sends.at(-1)),
              member: me,
            });
          } catch (error) {
            toast(error?.message || "Could not build that card", true);
          } finally {
            sharing = false;
            const currentShare=body.querySelector("[data-td-share]");
            if(currentShare)currentShare.disabled=!deal;
          }
          return;
        }
        const removeAnchor = event.target.closest("[data-tb-remove-anchor]");
        if (removeAnchor) {
          const side = removeAnchor.dataset.tbRemoveAnchor;
          const key = side === "send" ? "sendAnchors" : "receiveAnchors";
          shop[key] = shop[key].filter(id => String(id) !== String(removeAnchor.dataset.playerId));
          refreshOffers(); return;
        }
        const intent = event.target.closest("[data-tb-intent]");
        if (intent) {
          const value = intent.dataset.tbIntent;
          if (value === shop.intent) {
            if(shop.offerState?.countErrors?.[value]){catalog.retry(shop.offerState.key,value);refreshOffers();}
            return;
          }
          shop.intent = value;
          catalog.retry(shop.offerState?.key,value);shop.offerState=null;
          shop.openTiers=new Set([value]);
          const options = body.querySelector(".tb-intent-options");
          if (options) options.dataset.intent = value;
          options?.querySelectorAll("[data-tb-intent]").forEach(button => {button.classList.toggle("is-active", button.dataset.tbIntent === value);button.setAttribute('aria-pressed',String(button.dataset.tbIntent === value));});
          const offers=body.querySelector('[data-tb-offers]');if(offers){offers.inert=true;offers.setAttribute('aria-busy','true');}
          const stamp = shop.intentStamp = (shop.intentStamp || 0) + 1;
          setTimeout(() => { if (current()&&stamp === shop.intentStamp) refreshOffers(); }, 260);
          return;
        }
        if (event.target.closest("[data-tb-show-all]")) { shop.visibleCount = Number.MAX_SAFE_INTEGER; draw(); return; }
        if (event.target.closest("[data-tb-generate]")) { shop.visibleCount += OFFER_BATCH_SIZE; draw(); return; }
        const button = event.target.closest("[data-td-load-offer]");
        if (!button) return;
        negotiation.clearEdit();const sourceCard=button.closest(".tb-offer"),origins=connection.capture(sourceCard);activeOfferKey=sourceCard?.dataset.offerKey||null;
        const auditInput = { season: data.projectionSeason, week: data.liveWeek, teamId: selectedId, partnerId: button.dataset.partner,
          sendA: (button.dataset.sendA || "").split(",").filter(Boolean), sendB: (button.dataset.sendB || "").split(",").filter(Boolean),
          weeklyDelta: button.dataset.weeklyDelta };
        if(!button.dataset.parties){
          const parties=[data.teams.find(t=>String(t.id)===String(selectedId)),data.teams.find(t=>String(t.id)===button.dataset.partner)];
          const auditDeal=evaluateTradeDeal(parties,[auditInput.sendA,auditInput.sendB],data.pool),preview=auditDeal&&lineupPreviewsFor(auditDeal,data.pool)[0];
          if(preview){const after=[...preview.after.map(s=>s.player),...preview.benchAfter].filter(Boolean);auditInput.lineupAudit={version:2,before:parties[0].playerIds.filter(id=>data.pool.has(id)),after:after.map(p=>p.id),positions:Object.fromEntries([...parties[0].playerIds.map(id=>data.pool.get(id)),...after].filter(Boolean).map(p=>[p.id,p.position]))};}
        }
        if (!button.dataset.parties) void saveTradeRecommendation(auditInput, data.pool).catch(error => console.warn("trade recommendation audit unavailable", error));
        trade.memberIds = button.dataset.parties ? JSON.parse(button.dataset.parties) : [button.dataset.partner];
        trade.sends = button.dataset.sends ? JSON.parse(button.dataset.sends).map(ids => new Set(ids)) : [
          new Set((button.dataset.sendA || "").split(",").filter(Boolean)),
          new Set((button.dataset.sendB || "").split(",").filter(Boolean)),
        ];
        const owner=data.teams.find(t=>String(t.id)===String(selectedId)),parties=[owner,...trade.memberIds.map(id=>data.teams.find(t=>String(t.id)===String(id)))];
        trade.destinations=button.dataset.destinations?JSON.parse(button.dataset.destinations):tradeTransfers(parties,trade.sends)?.destinations||{};
        trade.editing = false;
        shop.mode='manual';shop.customOpen = true;
        draw();
        const target=body.querySelector("[data-td-verdict]");target?.scrollIntoView({behavior:"instant",block:"start"});connection.play(origins,target);const heading=target?.querySelector("h2");if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
      });
      if(shop.horizon==='next4'&&!shop.weekSchedules?.length)void loadSchedules();else draw();
      stopRefresh?.();
      stopRefresh=mountAnalyzerLiveRefresh({view,initial:data,load:()=>loadAnalyzerData({liveRefresh:true}),active:current,canApply:()=>!sharing&&!document.querySelector('dialog[open]')&&!(body.contains(document.activeElement)&&document.activeElement.matches('input:not([type=checkbox]):not([type=radio]),textarea,select')),
        apply:next=>{
          const saved=restoreTradeDraft(tradeDraft({selectedId,trade,shop}),next.teams,selectedId);
          if(!saved || next.projectionSeason!==data.projectionSeason)return;
          catalog.stop();
          data=next;selectedId=saved.selectedId;Object.assign(trade,saved.trade);Object.assign(shop,saved.shop);
          catalog=newCatalog();shop.offerState=null;
          if(shop.horizon==='next4'&&shop.weekScheduleKey!==`${data.projectionSeason}:${data.liveWeek}`){shop.weekSchedules=[];void loadSchedules();}else draw();
        }});
      void loadSharedTradeRecommendations().then(rows => { shop.sharedAudit = rows;const health=body.querySelector('[data-td-health]');if(health)health.innerHTML=tradeModelHealthMarkup({...tradeModelHealth(data.pool),accountability:recommendationOutcomes(data.pool,localStorage,rows.filter(row=>!row.season||Number(row.season)===Number(data.projectionSeason)))},esc,true); })
        .catch(error => console.warn("shared trade accountability unavailable", error));
    },
  };
}

export async function render(view) {
  leave();const epoch=++renderEpoch;
  view.innerHTML = `<header class="page-head"><h1>Trade Analyzer</h1>
    <p class="page-sub">Reading every roster…</p></header>
    <div class="card"><div class="card-body muted">Building the league outlook…</div></div>`;
  try {
    const params=new URLSearchParams(location.hash.split('?')[1]||''),tx=params.get('tx');
    if(tx||params.get('receipts')==='1'){
      const alerts=tx?[await loadTradeAlertByTransaction(tx)].filter(Boolean):await loadTradeAlerts({limit:100});
      if(!view.isConnected||epoch!==renderEpoch)return;
      view.innerHTML=`<header class="page-identity tb-head-row td-receipt-page-head"><div><small>DFLYZER</small><h1>${tx?'Trade receipt':'Trade receipts'}</h1></div><a class="btn ghost small" href="${tx?'#/trade?receipts=1':'#/trade'}">${tx?'All receipts':'Trade board'}</a></header>${alerts.length?completedTradeMarkup(alerts,tx||'',{standalone:true}):'<section class="state"><h2>Receipt unavailable</h2><a class="btn ghost small" href="#/trade?receipts=1">Trade receipts</a></section>'}`;
      return;
    }
    const [data, tradeAlerts] = await Promise.all([
      loadAnalyzerData(),
      loadTradeAlerts({ limit: 50 }).catch(error => { console.warn("completed trade receipts unavailable", error); return []; }),
    ]);
    if (!view.isConnected || epoch!==renderEpoch) return;
    if (data.state !== "ready") {
      view.innerHTML = `<header class="page-head"><h1>Trade Analyzer</h1></header>
        <div class="card"><div class="card-body"><strong>No populated Sleeper rosters yet.</strong>
        <p class="muted">Run a Sleeper sync after the draft, then come back here.</p></div></div>`;
      return;
    }
    const built = page(data, tradeAlerts);
    view.innerHTML = built.markup;
    built.wire(view);
  } catch (error) {
    if(epoch!==renderEpoch||!view.isConnected)return;
    view.innerHTML = errorBox(error);
  }
}
