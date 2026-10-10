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
import { suggestMultiTeamTrades, suggestTrades } from "../team-analyzer.js";
import { loadTradeAlerts, tradeAlertViewModel } from "../trade-alerts.js";
import { playerIdentity, playerPortrait } from "../player-presentation.js";
import { teamIdentity, teamPortrait } from "../team-presentation.js";
import { recommendationOutcomes, tradeModelHealth, tradeModelHealthMarkup } from "../trade-model-health.js";
import { loadSharedTradeRecommendations, saveTradeRecommendation } from "../trade-accountability.js";
import { readViewMemory, writeViewMemory } from '../view-memory.js';
import { tradeDraft, restoreTradeDraft } from '../trade-draft.js';
import {tradePerspective,reconcileTradeDestinations} from '../trade-routing.js';
import {evaluateTradeDeal,readTradeProposals,writeTradeProposals,savedTradeProposal,restoreTradeProposal,applyTradeDeal} from '../trade-workspace.js';
import {proposalsMarkup,tradeDataContext} from '../trade-workspace-ui.js';
import { mountTradePlayerPickers, focusTradePicker } from '../trade-player-picker.js';

const teamName = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || ""}`;
const signed = value => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(Number(value) || 0).toFixed(1)}`;
const shapeLabel = offer => `${offer.sendA.length} FOR ${offer.sendB.length}`;
const edge = offer => {
  const high = Math.max(offer.valueToA, offer.valueToB, 1);
  return Math.round((offer.valueToA - offer.valueToB) / high * 100);
};
const tierCopy = {
  fair: { title: "Fair", call: "FAIR SHOT" },
  aggressive: { title: "Aggressive", call: "WORTH A TEXT" },
  steal: { title: "Steal", call: "SWING BIG" },
};
const OFFER_BATCH_SIZE = 6;
let saveDraft = null;
export function leave() { saveDraft?.(); saveDraft = null; }

function offerPlayerRows(ids, pool) {
  return ids.map(id => {
    const player = pool.get(String(id));
    const signal = player?.injuryStatus || (player?.trendBasis === "recent" ? player.trend === "up" ? "HOT" : player.trend === "down" ? "COLD" : "" : "");
    return `<span class="tb-player">${playerIdentity(player || { id, name: String(id) }, { detail: [player?.position, player?.nflTeam].filter(Boolean).join(" · "), signal, interactive: true })}</span>`;
  }).join("");
}

function offerMarkup(offer, pool) {
  if (offer.parties) return `<article class="tb-offer tb-multi-offer"><header><span>${offer.parties.length}-TEAM TRADE</span><b>${offer.fairness}% BALANCE</b></header><div class="tb-multi-flow">${offer.parties.map((party, index) => `<section>${teamIdentity(party, { meta: `SENDS TO ${teamName(offer.parties[(index + 1) % offer.parties.length])}`, compact: true })}${offerPlayerRows(offer.sends[index], pool)}<small>LINEUP ${signed(offer.weeklyDeltas[index])} · DEPTH ${signed(offer.depthDeltas[index])}</small></section>`).join("")}</div><button type="button" class="btn ghost small" data-td-load-offer data-partner="${esc(offer.other.id)}" data-parties="${esc(JSON.stringify(offer.parties.slice(1).map(p => p.id)))}" data-sends="${esc(JSON.stringify(offer.sends))}">Analyze trade</button></article>`;
  const valueEdge = edge(offer), call = offer.tier === "fair" ? "FAIR SHOT"
    : offer.tier === "steal" ? "LONG SHOT" : valueEdge >= 8 ? "STRONG ASK" : "WORTH A TEXT";
  const depth = Number(offer.depthDeltaA) || 0;
  return `<article class="tb-offer">
    <header><span>${shapeLabel(offer)}</span><small class="tb-offer-owner">${teamPortrait(offer.other, { className: "tb-team-mark" })}<span><strong>${esc(teamName(offer.other))}</strong><i>${esc(offer.other.ownerName || "Roster owner")} · LINEUP ${signed(offer.weeklyDeltaA)} · DEPTH ${signed(depth)}</i></span></small><b>${call}</b></header>
    <div class="tb-offer-flow"><div><small>YOU SEND</small>${offerPlayerRows(offer.sendA, pool)}</div><i aria-hidden="true"><svg class="ico"><use href="#i-trade-steel"></use></svg></i><div><small>YOU GET</small>${offerPlayerRows(offer.sendB, pool)}</div><button type="button" aria-label="Analyze ${shapeLabel(offer)} offer" data-td-load-offer data-partner="${esc(offer.other.id)}" data-send-a="${esc(offer.sendA.join(","))}" data-send-b="${esc(offer.sendB.join(","))}" data-weekly-delta="${Number(offer.weeklyDeltaA) || 0}">Analyze <svg class="ico" aria-hidden="true"><use href="#i-chev-right"></use></svg></button></div>
  </article>`;
}

function tierMarkup(tier, offers, pool, open, total = offers.length) {
  const copy = tierCopy[tier];
  return `<details class="tb-tier is-${tier}" data-tb-tier="${tier}"${open ? " open" : ""}>
    <summary><span class="tb-tier-mark" aria-hidden="true"></span><span><b>${copy.title} (${total})</b></span><svg class="ico tb-tier-chevron" aria-hidden="true"><use href="#i-chev-right"></use></svg></summary>
    <div>${offers.length ? offers.map(offer => offerMarkup(offer, pool)).join("") : `<p class="tb-tier-empty">No ${copy.title.toLowerCase()} in this set.</p>`}</div>
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
function tradeBoardHeader(mode='offers'){
 return `<div class="tb-head-row page-identity"><header class="tb-head"><small>DFLYZER</small><h1>${mode==='manual'?'Check a trade':'Trade Board'}</h1></header><a class="btn ghost small" href="#/analyzer">Analyzer</a></div><div class="td-entry-actions" aria-label="Trade tools"><button type="button" data-td-mode="offers" aria-pressed="${mode==='offers'}">Find offers</button><button type="button" data-td-mode="manual" aria-pressed="${mode==='manual'}">Check a trade</button><button type="button" data-td-compare aria-label="Compare saved deals">Saved deals</button></div>`;
}

function tradeLab(team, teams, pool, shop) {
  if(shop.mode==='manual')return `<section class="tb-board">${tradeBoardHeader('manual')}</section>`;
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
  const maxPlayers = Math.max(anchorMinimum, Math.min(8, Number(shop.maxPlayers) || 4));
  shop.maxPlayers = maxPlayers;
  const sendCount = shop.sendCount || "any", receiveCount = shop.receiveCount || "any", intent = shop.intent || "aggressive";
  const shapeKeys = [];
  for (let send = 1; send < maxPlayers; send++) {
    for (let receive = 1; send + receive <= maxPlayers; receive++) {
      if (send < shop.sendAnchors.length || receive < shop.receiveAnchors.length) continue;
      if (sendCount !== "any" && send !== Number(sendCount)) continue;
      if (receiveCount !== "any" && receive !== Number(receiveCount)) continue;
      shapeKeys.push(`${send}-${receive}`);
    }
  }
  shop.offerCache ||= new Map();
  const cacheKey = [team.id, partnerKey, shop.sendAnchors.join(","), shop.receiveAnchors.join(","), maxPlayers, sendCount, receiveCount, intent].map(String).join("|");
  let allOffers = shop.offerCache.get(cacheKey);
  if (!allOffers) {
    allOffers = multi ? suggestMultiTeamTrades({ parties, pool, maxPlayers, sendAnchorIds: shop.sendAnchors, receiveAnchorIds: shop.receiveAnchors, sendCount, receiveCount, intent }) : otherTeams.length ? suggestTrades({ teams, teamId: team.id, partnerId: allPartners ? undefined : partner?.id,
      sendAnchorIds: shop.sendAnchors, receiveAnchorIds: shop.receiveAnchors, maxPlayers,
      pool, limit: allPartners ? 132 : 96, shapes: shapeKeys, intent }) : [];
    shop.offerCache.set(cacheKey, allOffers);
  }
  const tierOffers = allOffers.filter(offer => offer.tier === intent);
  const representedTeams = new Set(tierOffers.map(offer => String(offer.other.id))).size;
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
    ${tradeBoardHeader(shop.mode)}
    <section class="tb-layout-section">
      <div class="tb-setup-head"><h2 class="section-title">Build the package<span class="count">Up to 8</span></h2><button type="button" class="linkbtn" data-tb-view-offers>View offers ↓</button></div>
      <div class="tb-workbench-card">
        <div class="tb-team-choices">
          <label class="tb-team-select tb-identity-select"><span>Trading as</span><span class="tb-team-choice" aria-hidden="true">${teamPortrait(team)}<strong>${esc(teamName(team))}</strong><i>⌄</i></span><select aria-label="Trading as" data-td-team>${teams.map(item => `<option value="${esc(item.id)}" ${String(item.id) === String(team.id) ? "selected" : ""}>${esc(teamName(item))}</option>`).join("")}</select></label>
          <label class="tb-team-select tb-identity-select"><span>Trade with</span><span class="tb-team-choice" aria-hidden="true">${teamPortrait(partner || {team_name:"DFL",ownerName:"All teams"})}<strong>${esc(allPartners ? "All league teams" : teamName(partner))}</strong><i>⌄</i></span><select aria-label="Trade with" data-ta-shop-partner><option value="all" ${allPartners ? "selected" : ""}>All teams · Shop league-wide</option>${otherTeams.map(item => `<option value="${esc(item.id)}" ${!allPartners && String(item.id) === String(partner?.id) ? "selected" : ""}>${esc(teamName(item))}</option>`).join("")}</select></label>
        </div>
        <div class="tb-members">${shop.memberIds.map((id, index) => `<div class="td-member-control"><label class="tb-team-select"><span>Member ${index + 3}</span><select data-tb-member="${index}">${otherTeams.filter(t => String(t.id) !== String(partner?.id) && (!shop.memberIds.includes(t.id) || String(t.id) === String(id))).map(t => `<option value="${esc(t.id)}" ${String(t.id) === String(id) ? "selected" : ""}>${esc(teamName(t))}</option>`).join("")}</select></label><button type="button" class="td-remove-member" data-tb-remove-member="${index}" aria-label="Remove ${esc(teamName(parties[index + 2]))}">×</button></div>`).join("")}${parties.length < Math.min(8, teams.length) ? `<button type="button" class="btn ghost small" data-tb-add-member>+ Add member</button>` : ""}</div>
        ${multi ? `<div class="tb-trade-route"><button type="button" class="btn ghost small" data-td-mode="manual">Choose destinations</button></div>` : ""}
        <div class="tb-blueprint tb-player-pickers">
          <section><header><small>YOU OFFER</small></header><div class="tb-anchor-chips">${anchorChips(shop.sendAnchors, pool, "send")}</div><select aria-label="Add one of your players to send" data-tb-add-anchor="send">${anchorOptions(minePlayers, shop.sendAnchors, "Add player…")}</select></section>
          ${allPartners ? `<section class="tb-league-return"><header><small>YOU WANT</small><span>Any team</span></header><div class="tb-anchor-chips"><span class="tb-anchor-empty">Best league-wide return</span></div><select aria-label="Choose a player you want from any team" data-tb-league-target><option value="">Add player…</option>${otherTeams.map(owner => `<optgroup label="${esc(teamName(owner))}">${anchorOptions((owner.playerIds || []).map(id => pool.get(String(id))).filter(Boolean).sort((a,b) => b.tradeValue-a.tradeValue), [], null)}</optgroup>`).join('')}</select></section>`
            : `<section><header><small>YOU WANT</small></header><div class="tb-anchor-chips">${anchorChips(shop.receiveAnchors, pool, "receive")}</div><select aria-label="Add a player you want to receive" data-tb-add-anchor="receive">${anchorOptions(theirPlayers, shop.receiveAnchors, "Add player…")}</select></section>`}
        </div>
        <details class="tb-refine"${shop.refineOpen?' open':''}><summary><span>Package size &amp; counts</span><small>Up to ${maxPlayers} players</small></summary><div class="tb-identity-rail">${teamIdentity(team, { meta: "TRADING AS", compact: true })}<b aria-hidden="true">↔</b>${allPartners ? `<div class="dfl-team is-compact"><span class="dfl-team-mark"><i>ALL</i></span><span class="dfl-team-copy"><strong>All league teams</strong><small>SHOPPING WITH</small></span></div>` : teamIdentity(returnTeam, { meta: multi ? "RETURN FROM" : "TRADE WITH", compact: true })}</div>
        <div class="tb-package-controls">
          <label class="tb-max"><span>Maximum package size <output data-tb-max-output>${maxPlayers}</output></span><input type="range" min="${anchorMinimum}" max="8" step="1" value="${maxPlayers}" data-tb-max></label>
          <div class="tb-split"><label><span>You send</span><select data-tb-send-count>${countOptions("send", sendCount, Math.max(1, shop.sendAnchors.length))}</select></label><b aria-hidden="true">↔</b><label><span>You get</span><select data-tb-receive-count>${countOptions("receive", receiveCount, Math.max(1, shop.receiveAnchors.length))}</select></label></div>
        </div>
        </details><div class="tb-intent" aria-label="Offer type"><span>SHOW ME</span><div class="tb-intent-options" data-intent="${intent}"><i aria-hidden="true"></i>${[["fair", "Fair"], ["aggressive", "Aggressive"], ["steal", "Steal"]].map(([value, label]) => `<button type="button" data-tb-intent="${value}" class="${intent === value ? "is-active" : ""}">${label}</button>`).join("")}</div></div>
      </div>
    </section>
    <section class="tb-layout-section" data-tb-offers tabindex="-1">
      <h2 class="section-title">Generated offers<span class="count">Showing ${visibleOffers.length} of ${tierOffers.length}${allPartners ? ` · ${representedTeams} teams` : ""}</span></h2>
      <div class="tb-offers-card">
        <div class="tb-tiers">${tierMarkup(intent, visibleOffers, pool, shop.openTiers.has(intent), tierOffers.length)}</div>
        ${tierOffers.length ? "" : `<div class="ta-empty">No ${tierCopy[intent].title.toLowerCase()} offers found. Try another type or different players.</div>`}
        <div class="tb-offer-actions">
          <button type="button" class="tb-generate${shop.justRefreshed ? " is-refreshed" : ""}" data-tb-generate ${remainingOffers ? "" : "disabled"}><i class="tb-refresh-mark" aria-hidden="true"></i><span data-tb-generate-label data-default-label="${esc(moreLabel)}">${shop.justRefreshed ? "Offers refreshed" : esc(moreLabel)}</span></button>
          ${remainingOffers > OFFER_BATCH_SIZE ? `<button type="button" class="tb-show-all" data-tb-show-all>Show all ${tierOffers.length}</button>` : ""}
        </div>
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

const alertSigned = value => `${Number(value) > 0 ? "+" : Number(value) < 0 ? "−" : ""}${Math.abs(Number(value) || 0).toFixed(1)}`;

export function completedTradeMarkup(alerts = [], selectedTransactionId = "") {
  const views = alerts.map(tradeAlertViewModel).filter(Boolean);
  if (!views.length) return "";
  views.sort((a, b) => (String(a.transactionId) === String(selectedTransactionId) ? -1 : 0)
    - (String(b.transactionId) === String(selectedTransactionId) ? -1 : 0));
  return `<details class="ta-report-section td-completed" ${selectedTransactionId ? "open" : ""}>
    <summary class="ta-report-title"><div><small>COMPLETED DEALS</small><h2>DFLyzer trade receipts</h2></div><span class="ta-fold-hint">${views.length} saved</span><span class="ta-fold-chevron" aria-hidden="true"></span></summary>
    <div class="ta-section-body td-alert-list">${views.map((alert, receiptIndex) => {
      const call = alert.balanced ? "BALANCED" : alert.winner ? `${alert.winner} WINS` : "REVIEW NEEDED";
      const open = selectedTransactionId ? String(alert.transactionId) === String(selectedTransactionId) : receiptIndex === 0;
      const impacts = alert.lineupDeltas.map((delta, index) => ({ ...delta, depth:alert.depthDeltas?.[index]?.weekly })).filter(delta => delta.weekly != null);
      return `<details class="td-alert-receipt" id="trade-${esc(alert.transactionId)}" data-receipt-tone="${esc(alert.outcome?.tone || 'review')}"${open ? " open" : ""}>
        <summary class="td-receipt-summary"><div><small>${alert.season ? `${esc(alert.season)} · ` : ""}${alert.week ? `WEEK ${esc(alert.week)}` : "COMPLETED"}</small><h3>${esc(call)}</h3><p>${alert.teams.map(team => esc(team.teamName)).join(' <span aria-hidden="true">↔</span> ')}</p></div><span class="td-receipt-chevron" aria-hidden="true"></span></summary>
        <div class="td-receipt-body"><div class="td-receipt-status"><span>${alert.fairness == null ? "MODEL REVIEW" : "VALUE BALANCE"}</span>${alert.fairness == null ? "" : `<strong>${alert.fairness}%</strong>`}</div>
        <div class="td-alert-packages">${alert.packages.map(pkg => `<section aria-label="${esc(pkg.teamName)} sent">${teamIdentity({ team_name: pkg.teamName }, { meta: `SENT · ${pkg.players.length} PLAYER${pkg.players.length === 1 ? '' : 'S'}`, compact: true })}<div class="td-receipt-column-head" aria-hidden="true"><span>Player</span><span>Value</span></div>${pkg.players.map(player => `<div class="td-receipt-player"><button type="button" class="player-card-trigger td-receipt-player-action" data-player-card="${esc(player.id)}" aria-label="View ${esc(player.name)} player card">${playerIdentity(player)}</button><span class="td-receipt-value"><span class="sr-only">Trade value </span><b>${Math.round(player.value)}</b></span></div>`).join("") || `<p class="muted tiny">No rated players</p>`}</section>`).join("")}</div>
        <footer class="td-receipt-footer"><p>${esc(alert.reason?.title || alert.limitations?.[0] || "Completed trade recorded.")}</p>${alert.fairness == null || !impacts.length ? "" : `<table class="td-receipt-impact" role="table"><caption>Roster impact · pts/wk</caption><thead><tr role="row"><th scope="col">Team</th><th scope="col">Lineup</th><th scope="col">Depth</th></tr></thead><tbody>${impacts.map(delta => `<tr role="row"><th scope="row">${esc(delta.teamName)}</th><td><span class="td-receipt-impact-label" aria-hidden="true">Lineup</span>${alertSigned(delta.weekly)}</td><td><span class="td-receipt-impact-label" aria-hidden="true">Depth</span>${delta.depth == null ? '—' : alertSigned(delta.depth)}</td></tr>`).join("")}</tbody></table>`}</footer></div>
      </details>`;
    }).join("")}</div>
  </details>`;
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
  const shop = { partnerId: "", memberIds: [], anchorPartnerId: "", sendAnchors: [], receiveAnchors: [],
    maxPlayers: 4, sendCount: "any", receiveCount: "any", intent: "aggressive", visibleCount: OFFER_BATCH_SIZE,
    openTiers: new Set(["aggressive"]), mode:"offers", customOpen: false, sharedAudit: [] };
  const draftKey = `trade:${data.projectionSeason}`;
  const saved = restoreTradeDraft(readViewMemory(me?.id, draftKey), data.teams, routeTeam);
  if (saved) { selectedId = saved.selectedId; Object.assign(trade, saved.trade); Object.assign(shop, saved.shop); }
  const target = params.get('target'), partner = data.teams.find(t => String(t.id) === params.get('partner'));
  if (target && partner && String(partner.id) !== String(selectedId) && partner.playerIds.map(String).includes(target)) {
    shop.partnerId = partner.id; shop.memberIds = []; shop.anchorPartnerId = partner.id;
    shop.receiveAnchors = [target]; shop.sendAnchors = []; shop.sendCount = 'any'; shop.receiveCount = 'any';shop.mode='offers';shop.customOpen=false;shop.refineOpen=true;
  }
  saveDraft = () => writeViewMemory(me?.id, draftKey, tradeDraft({ selectedId, trade, shop }));

  return {
    markup: `<main class="ta-report td-page" data-td-body></main>${completedTradeMarkup(tradeAlerts, selectedTransactionId)}`,

    wire(view) {
      const body = view.querySelector("[data-td-body]");
      /* Whatever the ticket is currently showing, so Share renders the same
         deal the reader is looking at rather than re-deriving one. */
      let deal = null,proposals=readTradeProposals(me?.id,data.projectionSeason),proposalsOpen=false,transactionScrolled=false;
      body.addEventListener('toggle',event=>{
        if(event.target.matches('.td-proposals'))proposalsOpen=event.target.open;
        if(event.target.matches('.tb-refine')){shop.refineOpen=event.target.open;saveDraft?.();}
      },true);

      const draw = () => {
        if (!view.isConnected) return;
        // Native toggle events can arrive after an immediate control redraw.
        // Read the current DOM first so an open disclosure never snaps closed.
        const refine=body.querySelector('.tb-refine'),comparison=body.querySelector('.td-proposals');
        if(refine)shop.refineOpen=refine.open;
        if(comparison)proposalsOpen=comparison.open;
        const team = data.teams.find(item => item.id === selectedId) || data.teams[0];
        body.dataset.mode=shop.mode||"offers";
        body.innerHTML = `${tradeLab(team, data.teams, data.pool, shop)}
          <details class="ta-report-section td-custom"${shop.customOpen ? " open" : ""}>
            <summary class="ta-report-title"><div><small>MANUAL MODE</small><h2>Build your own package</h2></div><span class="ta-fold-hint">Up to 8 players</span><span class="ta-fold-chevron" aria-hidden="true"></span></summary>
            ${shop.customOpen ? `<div class="ta-section-body"><label class="tb-team-select td-working-as"><span>Trading as</span><select data-td-team>${data.teams.map(t=>`<option value="${esc(t.id)}" ${String(t.id)===String(selectedId)?'selected':''}>${esc(teamName(t))}</option>`).join('')}</select></label><div data-trade-desk>${tradeDeskMarkup(team, data.teams, data.pool, trade)}</div>
            <div class="td-share"><button type="button" class="btn" data-td-share disabled>Share this ticket</button></div></div>` : ""}
          </details>
          <div data-td-proposals-slot>${proposalsMarkup(proposals,data.teams,data.pool,proposalsOpen)}</div>${tradeDataContext(data,data.pool)}
          <div data-td-health>${tradeModelHealthMarkup({ ...tradeModelHealth(data.pool), accountability: recommendationOutcomes(data.pool, localStorage,
            shop.sharedAudit.filter(row => !row.season || Number(row.season) === Number(data.projectionSeason))) }, esc, true)}</div>`;
        const share = body.querySelector("[data-td-share]");
        mountTradePlayerPickers(body, data.pool, data.teams);
        mountTradeDesk(body.querySelector("[data-trade-desk]"), {
          team, teams: data.teams, pool: data.pool, state: trade, lockedIds:[...shop.sendAnchors,...shop.receiveAnchors], onPartnerChange: (focus={}) => {draw();if(focus.memberIndex!=null)body.querySelector(`[data-td-member="${focus.memberIndex}"]`)?.focus();else body.querySelector("[data-td-verdict]")?.scrollIntoView({behavior:"instant",block:"start"});},
          onDeal: current => {
            deal = current;
            saveDraft?.();
            /* Nothing to share until both sides have somebody on them, and a
               disabled button says that better than an error would. */
            if (share) share.disabled = !current;
          },
        });
        body.querySelector(".td-custom")?.addEventListener("toggle", event => {
          const open = event.currentTarget.open;
          if (open && !shop.customOpen) { shop.customOpen = true;shop.mode="manual"; draw(); return; }
          shop.customOpen = open;
          saveDraft?.();
        });
        body.querySelectorAll("[data-tb-tier]").forEach(section => section.addEventListener("toggle", event => {
          const tier = event.currentTarget.dataset.tbTier;
          if (event.currentTarget.open) shop.openTiers.add(tier);
          else shop.openTiers.delete(tier);
          saveDraft?.();
        }));
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
      const resetBlueprint = () => {
        shop.partnerId = ""; shop.memberIds = []; shop.anchorPartnerId = ""; shop.sendAnchors = []; shop.receiveAnchors = [];
        shop.maxPlayers = 4; shop.sendCount = "any"; shop.receiveCount = "any";
        shop.intent = "aggressive"; shop.visibleCount = OFFER_BATCH_SIZE; shop.openTiers=new Set(["aggressive"]); shop.customOpen = false;shop.mode="offers";
      };
      body.addEventListener("change", event => {
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
          if (Math.max(1, nextSend) + Math.max(1, nextReceive) + shop.memberIds.length > shop.maxPlayers) {
            toast(`This package is capped at ${shop.maxPlayers} players. Raise the slider or remove an anchor.`, true);
          } else if (!list.includes(anchorSelect.value)) {
            list.push(anchorSelect.value);
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
      });
      body.addEventListener("click", async event => {
        if (event.target.closest("[data-tb-view-offers]")) {
          const offers = body.querySelector("[data-tb-offers]");
          offers?.scrollIntoView({ block: "start", behavior: "instant" });
          offers?.focus({ preventScroll: true });
          return;
        }
        const modeButton=event.target.closest('[data-td-mode]');
        if(modeButton){if(modeButton.dataset.tdMode==='manual'&&!trade.sends.some(ids=>ids.size)&&shop.partnerId&&shop.partnerId!=='all'){trade.memberIds=[shop.partnerId,...shop.memberIds];trade.sends=[new Set(shop.sendAnchors),...trade.memberIds.map((_,i)=>new Set(i===trade.memberIds.length-1?shop.receiveAnchors:[]))];trade.destinations={};}shop.mode=modeButton.dataset.tdMode;shop.customOpen=shop.mode==='manual';draw();body.querySelector(shop.customOpen?'.td-working-as select':'[data-td-mode="offers"]')?.focus({preventScroll:true});return;}
        if(event.target.closest('[data-td-compare]')){proposalsOpen=true;const slot=body.querySelector('[data-td-proposals-slot]');slot.innerHTML=proposalsMarkup(proposals,data.teams,data.pool,true);slot.scrollIntoView({block:'start',behavior:'instant'});return;}
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
          shareButton.disabled = true;
          try {
            await shareDeal({
              ...deal,
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
            shareButton.disabled = false;
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
          if (value === shop.intent) return;
          shop.intent = value;
          shop.openTiers=new Set([value]);
          const options = intent.closest(".tb-intent-options");
          if (options) options.dataset.intent = value;
          options?.querySelectorAll("[data-tb-intent]").forEach(button => button.classList.toggle("is-active", button === intent));
          const stamp = shop.intentStamp = (shop.intentStamp || 0) + 1;
          setTimeout(() => { if (stamp === shop.intentStamp) refreshOffers(); }, 260);
          return;
        }
        if (event.target.closest("[data-tb-show-all]")) { shop.visibleCount = Number.MAX_SAFE_INTEGER; draw(); return; }
        if (event.target.closest("[data-tb-generate]")) { shop.visibleCount += OFFER_BATCH_SIZE; draw(); return; }
        const button = event.target.closest("[data-td-load-offer]");
        if (!button) return;
        const auditInput = { season: data.projectionSeason, week: data.liveWeek, teamId: selectedId, partnerId: button.dataset.partner,
          sendA: (button.dataset.sendA || "").split(",").filter(Boolean), sendB: (button.dataset.sendB || "").split(",").filter(Boolean),
          weeklyDelta: button.dataset.weeklyDelta };
        if (!button.dataset.parties) void saveTradeRecommendation(auditInput, data.pool).catch(error => console.warn("trade recommendation audit unavailable", error));
        trade.memberIds = button.dataset.parties ? JSON.parse(button.dataset.parties) : [button.dataset.partner];
        trade.sends = button.dataset.sends ? JSON.parse(button.dataset.sends).map(ids => new Set(ids)) : [
          new Set((button.dataset.sendA || "").split(",").filter(Boolean)),
          new Set((button.dataset.sendB || "").split(",").filter(Boolean)),
        ];
        const owner=data.teams.find(t=>String(t.id)===String(selectedId)),parties=[owner,...trade.memberIds.map(id=>data.teams.find(t=>String(t.id)===String(id)))];
        trade.destinations=reconcileTradeDestinations(parties,trade.sends,{});
        trade.editing = false;
        shop.mode='manual';shop.customOpen = true;
        draw();
        body.querySelector("[data-td-verdict]")?.scrollIntoView({ behavior: "instant", block: "start" });
      });
      draw();
      void loadSharedTradeRecommendations().then(rows => { shop.sharedAudit = rows;const health=body.querySelector('[data-td-health]');if(health)health.innerHTML=tradeModelHealthMarkup({...tradeModelHealth(data.pool),accountability:recommendationOutcomes(data.pool,localStorage,rows.filter(row=>!row.season||Number(row.season)===Number(data.projectionSeason)))},esc,true); })
        .catch(error => console.warn("shared trade accountability unavailable", error));
    },
  };
}

export async function render(view) {
  view.innerHTML = `<header class="page-head"><h1>Trade Analyzer</h1>
    <p class="page-sub">Reading every roster…</p></header>
    <div class="card"><div class="card-body muted">Building the league outlook…</div></div>`;
  try {
    const [data, tradeAlerts] = await Promise.all([
      loadAnalyzerData(),
      loadTradeAlerts({ limit: 50 }).catch(error => { console.warn("completed trade receipts unavailable", error); return []; }),
    ]);
    if (!view.isConnected) return;
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
    view.innerHTML = errorBox(error);
  }
}
