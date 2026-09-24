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
import { suggestTrades } from "../team-analyzer.js";
import { loadTradeAlerts, tradeAlertViewModel } from "../trade-alerts.js";

const teamName = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || ""}`;
const signed = value => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(Number(value) || 0).toFixed(1)}`;
const shapeLabel = offer => `${offer.sendA.length} FOR ${offer.sendB.length}`;
const edge = offer => {
  const high = Math.max(offer.valueToA, offer.valueToB, 1);
  return Math.round((offer.valueToA - offer.valueToB) / high * 100);
};
const tierCopy = {
  fair: { title: "Fair deals", note: "Balanced value. Both sides have a reason.", call: "FAIR SHOT" },
  aggressive: { title: "Aggressive offers", note: "You pay a premium to land your target.", call: "WORTH A TEXT" },
  steal: { title: "Steal attempts", note: "You win the value. Low-odds asks.", call: "SWING BIG" },
};

function offerPlayerRows(ids, pool) {
  return ids.map(id => {
    const player = pool.get(String(id));
    const initials = (player?.name || String(id)).split(/\s+/).map(part => part[0]).join("").slice(0, 2);
    const signal = player?.injuryStatus || (player?.trendBasis === "recent" ? player.trend === "up" ? "HOT" : player.trend === "down" ? "COLD" : "" : "");
    return `<span class="tb-player"><i>${esc(initials)}</i><span><b>${esc(player?.name || String(id))}</b><small>${esc([player?.position, player?.nflTeam, signal].filter(Boolean).join(" · "))}</small></span></span>`;
  }).join("");
}

function offerMarkup(offer, pool) {
  const valueEdge = edge(offer), call = offer.tier === "fair" ? "FAIR SHOT"
    : offer.tier === "steal" ? "LONG SHOT" : valueEdge >= 8 ? "STRONG ASK" : "WORTH A TEXT";
  return `<article class="tb-offer">
    <header><span>${shapeLabel(offer)}</span><small><strong>${esc(teamName(offer.other))}</strong> · EDGE ${signed(valueEdge).replace(".0", "")}% · ${signed(offer.weeklyDeltaA)} / wk</small><b>${call}</b></header>
    <div class="tb-offer-flow"><div><small>YOU SEND</small>${offerPlayerRows(offer.sendA, pool)}</div><i aria-hidden="true"><svg class="ico"><use href="#i-trade-steel"></use></svg></i><div><small>YOU GET</small>${offerPlayerRows(offer.sendB, pool)}</div><button type="button" aria-label="Analyze ${shapeLabel(offer)} offer" data-td-load-offer data-partner="${esc(offer.other.id)}" data-send-a="${esc(offer.sendA.join(","))}" data-send-b="${esc(offer.sendB.join(","))}">Analyze <svg class="ico" aria-hidden="true"><use href="#i-chev-right"></use></svg></button></div>
  </article>`;
}

function tierMarkup(tier, offers, pool, open, total = offers.length) {
  const copy = tierCopy[tier];
  return `<details class="tb-tier is-${tier}" data-tb-tier="${tier}"${open ? " open" : ""}>
    <summary><span class="tb-tier-mark" aria-hidden="true"></span><span><b>${copy.title} (${total})</b><small>${copy.note}</small></span><svg class="ico tb-tier-chevron" aria-hidden="true"><use href="#i-chev-right"></use></svg></summary>
    <div>${offers.length ? offers.map(offer => offerMarkup(offer, pool)).join("") : `<p class="tb-tier-empty">No ${copy.title.toLowerCase()} in this set.</p>`}</div>
  </details>`;
}

function anchorChips(ids, pool, side) {
  if (!ids.length) return `<span class="tb-anchor-empty">Any player</span>`;
  return ids.map(id => `<button type="button" data-tb-remove-anchor="${side}" data-player-id="${esc(id)}"><span>${esc(pool.get(String(id))?.name || id)}</span><i aria-hidden="true">×</i></button>`).join("");
}

function anchorOptions(players, selected, label) {
  return `<option value="">${label}</option>${players.filter(player => !selected.includes(String(player.id)))
    .map(player => `<option value="${esc(player.id)}">${esc(player.name)} · ${player.position} · ${Math.round(player.tradeValue)}</option>`).join("")}`;
}

/*
  THE LAB BELONGS BESIDE THE DESK.

  It was the last thing on the analyzer report, which meant the two halves of
  one job - "what could I trade" and "is this trade good" - sat on different
  pages. They are the same question asked in either direction, so they are now
  the same page: propose above, judge below.
*/
function tradeLab(team, teams, pool, shop) {
  const otherTeams = teams.filter(item => String(item.id) !== String(team.id));
  const allPartners = shop.partnerId === "all";
  const partner = allPartners ? null
    : otherTeams.find(item => String(item.id) === String(shop.partnerId)) || otherTeams[0];
  if (!allPartners) shop.partnerId = partner?.id || "";
  const partnerKey = allPartners ? "all" : partner?.id || "";
  const minePlayers = (team.playerIds || []).map(id => pool.get(String(id))).filter(Boolean).sort((a, b) => b.tradeValue - a.tradeValue);
  const theirPlayers = (partner?.playerIds || []).map(id => pool.get(String(id))).filter(Boolean).sort((a, b) => b.tradeValue - a.tradeValue);
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
  const anchorMinimum = Math.max(1, shop.sendAnchors.length) + Math.max(1, shop.receiveAnchors.length);
  const maxPlayers = Math.max(anchorMinimum, Math.min(8, Number(shop.maxPlayers) || 4));
  shop.maxPlayers = maxPlayers;
  const sendCount = shop.sendCount || "any", receiveCount = shop.receiveCount || "any", intent = shop.intent || "press";
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
    allOffers = otherTeams.length ? suggestTrades({ teams, teamId: team.id, partnerId: allPartners ? undefined : partner?.id,
      sendAnchorIds: shop.sendAnchors, receiveAnchorIds: shop.receiveAnchors, maxPlayers,
      pool, limit: allPartners ? 132 : 96, shapes: shapeKeys, intent }) : [];
    shop.offerCache.set(cacheKey, allOffers);
  }
  const representedTeams = new Set(allOffers.map(offer => String(offer.other.id))).size;
  const fullGroups = Object.fromEntries(Object.keys(tierCopy).map(tier => [tier, allOffers.filter(offer => offer.tier === tier)]));
  const page = shop.page || 0;
  const groups = Object.fromEntries(Object.entries(fullGroups).map(([tier, offers]) => {
    if (offers.length <= 4) return [tier, offers];
    const start = page * 4 % offers.length;
    return [tier, Array.from({ length: Math.min(4, offers.length) }, (_, index) => offers[(start + index) % offers.length])];
  }));
  shop.openTiers ||= new Set();
  const countOptions = (side, selected, minimum) => `<option value="any" ${selected === "any" ? "selected" : ""}>Any</option>${Array.from({ length: 7 }, (_, index) => index + 1)
    .filter(count => count >= minimum && count < maxPlayers)
    .map(count => `<option value="${count}" ${String(selected) === String(count) ? "selected" : ""}>${count}</option>`).join("")}`;
  return `<section class="tb-board">
    <div class="tb-head-row"><header class="tb-head"><small>DFLYZER</small><h1>Trade Board</h1><p>Pick your pressure. Send something worth answering.</p></header><a class="btn ghost small" href="#/analyzer">Analyzer</a></div>
    <section class="tb-layout-section">
      <h2 class="section-title">Build the package<span class="count">Up to 8</span></h2>
      <p class="section-copy">Choose the teams, anchor the players that matter, then set how aggressive the ask should be.</p>
      <div class="tb-workbench-card">
        <label class="tb-team-select"><span>Trading as</span><select data-td-team>${teams.map(item => `<option value="${esc(item.id)}" ${String(item.id) === String(team.id) ? "selected" : ""}>${esc(teamName(item))}</option>`).join("")}</select></label>
        <label class="tb-team-select"><span>Trade with</span><select data-ta-shop-partner><option value="all" ${allPartners ? "selected" : ""}>All teams · Shop league-wide</option>${otherTeams.map(item => `<option value="${esc(item.id)}" ${!allPartners && String(item.id) === String(partner?.id) ? "selected" : ""}>${esc(teamName(item))}</option>`).join("")}</select></label>
        <div class="tb-blueprint">
          <section><header><small>YOU CAN SEND</small><span>Optional anchors</span></header><div class="tb-anchor-chips">${anchorChips(shop.sendAnchors, pool, "send")}</div><select data-tb-add-anchor="send">${anchorOptions(minePlayers, shop.sendAnchors, "Add one of your players…")}</select></section>
          ${allPartners ? `<section class="tb-league-return"><header><small>YOU WANT</small><span>Any team</span></header><div><b>Best league-wide return</b><small>We will match your outgoing package against every roster. Pick one team above to require a specific player.</small></div></section>`
            : `<section><header><small>YOU WANT</small><span>Must be included</span></header><div class="tb-anchor-chips">${anchorChips(shop.receiveAnchors, pool, "receive")}</div><select data-tb-add-anchor="receive">${anchorOptions(theirPlayers, shop.receiveAnchors, "Add one of their players…")}</select></section>`}
        </div>
        <div class="tb-package-controls">
          <label class="tb-max"><span>Maximum package size <output data-tb-max-output>${maxPlayers}</output></span><input type="range" min="${anchorMinimum}" max="8" step="1" value="${maxPlayers}" data-tb-max><small>Up to ${maxPlayers} total players—not a required total.</small></label>
          <div class="tb-split"><label><span>You send</span><select data-tb-send-count>${countOptions("send", sendCount, Math.max(1, shop.sendAnchors.length))}</select></label><b aria-hidden="true">↔</b><label><span>You get</span><select data-tb-receive-count>${countOptions("receive", receiveCount, Math.max(1, shop.receiveAnchors.length))}</select></label></div>
        </div>
        <div class="tb-intent" aria-label="Offer intent"><span>MY INTENT</span><div class="tb-intent-options" data-intent="${intent}"><i aria-hidden="true"></i>${[["fair", "FAIR"], ["press", "PRESS"], ["swing", "SWING BIG"]].map(([value, label]) => `<button type="button" data-tb-intent="${value}" class="${intent === value ? "is-active" : ""}">${label}</button>`).join("")}</div></div>
      </div>
    </section>
    <section class="tb-layout-section">
      <h2 class="section-title">Generated offers<span class="count">${allOffers.length}${allPartners ? ` · ${representedTeams} teams` : ""}</span></h2>
      <p class="section-copy">${allPartners ? "League-wide offers are rotated across matching teams so one roster cannot flood the board." : "Open only the pressure level you want to shop."}</p>
      <div class="tb-offers-card">
        <button type="button" class="tb-generate${shop.justRefreshed ? " is-refreshed" : ""}" data-tb-generate><i class="tb-refresh-mark" aria-hidden="true"></i><span data-tb-generate-label>${shop.justRefreshed ? "OFFERS REFRESHED" : "SHOW ANOTHER BATCH"} · ${allOffers.length} FOUND</span></button>
        <div class="tb-tiers">${tierMarkup("fair", groups.fair, pool, shop.openTiers.has("fair"), fullGroups.fair.length)}${tierMarkup("aggressive", groups.aggressive, pool, shop.openTiers.has("aggressive"), fullGroups.aggressive.length)}${tierMarkup("steal", groups.steal, pool, shop.openTiers.has("steal"), fullGroups.steal.length)}</div>
        ${allOffers.length ? "" : `<div class="ta-empty">No offers match those anchors and split. Raise the maximum, choose Any, or remove an anchor.</div>`}
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
  if (!Array.isArray(result?.values)) return result;
  const last = parties.length - 1;
  return { ...result, valueToA: result.values[0], valueToB: result.values[1],
    weeklyDeltaA: result.weeklyDeltas[0], weeklyDeltaB: result.weeklyDeltas[last] };
}

const alertSigned = value => `${Number(value) > 0 ? "+" : Number(value) < 0 ? "−" : ""}${Math.abs(Number(value) || 0).toFixed(1)}`;

export function completedTradeMarkup(alerts = [], selectedTransactionId = "") {
  const views = alerts.map(tradeAlertViewModel).filter(Boolean);
  if (!views.length) return "";
  views.sort((a, b) => (String(a.transactionId) === String(selectedTransactionId) ? -1 : 0)
    - (String(b.transactionId) === String(selectedTransactionId) ? -1 : 0));
  return `<details class="ta-report-section td-completed" ${selectedTransactionId ? "open" : ""}>
    <summary class="ta-report-title"><div><small>COMPLETED DEALS</small><h2>DFLyzer trade receipts</h2></div><span class="ta-fold-hint">${views.length} saved</span><span class="ta-fold-chevron" aria-hidden="true"></span></summary>
    <div class="ta-section-body td-alert-list">${views.map(alert => {
      const call = alert.balanced ? "BALANCED" : alert.winner ? `${alert.winner} WINS` : "REVIEW NEEDED";
      return `<article class="td-alert-receipt" id="trade-${esc(alert.transactionId)}">
        <header><div><small>${alert.season ? `${esc(alert.season)} · ` : ""}${alert.week ? `WEEK ${esc(alert.week)}` : "COMPLETED"}</small><h3>${esc(call)}</h3></div><span>${alert.fairness == null ? "MODEL REVIEW" : `${alert.fairness}% balance`}</span></header>
        <div class="td-alert-packages">${alert.packages.map(pkg => `<section><small>${esc(pkg.teamName)} SENT</small>${pkg.players.map(player => `<div><span><strong>${esc(player.name)}</strong><small>${esc([player.position, player.nflTeam].filter(Boolean).join(" · "))}</small></span><b>${Math.round(player.value)}</b></div>`).join("") || `<p class="muted tiny">No rated players</p>`}</section>`).join("")}</div>
        <footer><p>${esc(alert.reason?.title || alert.limitations?.[0] || "Completed trade recorded.")}</p>${alert.lineupDeltas.slice(0, 2).map(delta => `<small>${esc(delta.teamName)} <b>${alertSigned(delta.weekly)} / wk</b></small>`).join("")}</footer>
      </article>`;
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
  const trade = { memberIds: [], sends: [new Set(), new Set()], editing: true };
  const shop = { partnerId: "", anchorPartnerId: "", sendAnchors: [], receiveAnchors: [],
    maxPlayers: 4, sendCount: "any", receiveCount: "any", intent: "press", page: 0,
    openTiers: new Set(), customOpen: false };

  return {
    markup: `${completedTradeMarkup(tradeAlerts, selectedTransactionId)}<main class="ta-report td-page" data-td-body></main>`,

    wire(view) {
      const body = view.querySelector("[data-td-body]");
      /* Whatever the ticket is currently showing, so Share renders the same
         deal the reader is looking at rather than re-deriving one. */
      let deal = null;

      const draw = () => {
        const team = data.teams.find(item => item.id === selectedId) || data.teams[0];
        body.innerHTML = `${tradeLab(team, data.teams, data.pool, shop)}
          <details class="ta-report-section td-custom"${shop.customOpen ? " open" : ""}>
            <summary class="ta-report-title"><div><small>MANUAL MODE</small><h2>Build your own package</h2></div><span class="ta-fold-hint">Up to 8 players</span><span class="ta-fold-chevron" aria-hidden="true"></span></summary>
            ${shop.customOpen ? `<div class="ta-section-body"><div data-trade-desk>${tradeDeskMarkup(team, data.teams, data.pool, trade)}</div>
            <div class="td-share"><button type="button" class="btn" data-td-share disabled>Share this ticket</button></div></div>` : ""}
          </details>`;
        const share = body.querySelector("[data-td-share]");
        mountTradeDesk(body.querySelector("[data-trade-desk]"), {
          team, teams: data.teams, pool: data.pool, state: trade, onPartnerChange: draw,
          onDeal: current => {
            deal = current;
            /* Nothing to share until both sides have somebody on them, and a
               disabled button says that better than an error would. */
            if (share) share.disabled = !current;
          },
        });
        body.querySelector(".td-custom")?.addEventListener("toggle", event => {
          const open = event.currentTarget.open;
          if (open && !shop.customOpen) { shop.customOpen = true; draw(); return; }
          shop.customOpen = open;
        });
        body.querySelectorAll("[data-tb-tier]").forEach(section => section.addEventListener("toggle", event => {
          const tier = event.currentTarget.dataset.tbTier;
          if (event.currentTarget.open) shop.openTiers.add(tier);
          else shop.openTiers.delete(tier);
        }));
        if (shop.justRefreshed) {
          const stamp = shop.refreshStamp;
          setTimeout(() => {
            if (stamp !== shop.refreshStamp) return;
            shop.justRefreshed = false;
            const button = body.querySelector("[data-tb-generate]");
            button?.classList.remove("is-refreshed");
            const label = button?.querySelector("[data-tb-generate-label]");
            if (label) label.textContent = label.textContent.replace("OFFERS REFRESHED", "SHOW ANOTHER BATCH");
          }, 1200);
        }
      };
      const refreshOffers = () => {
        shop.page = 0; shop.justRefreshed = true; shop.refreshStamp = (shop.refreshStamp || 0) + 1; draw();
      };
      const resetBlueprint = () => {
        shop.partnerId = ""; shop.anchorPartnerId = ""; shop.sendAnchors = []; shop.receiveAnchors = [];
        shop.maxPlayers = 4; shop.sendCount = "any"; shop.receiveCount = "any";
        shop.intent = "press"; shop.page = 0; shop.openTiers.clear(); shop.customOpen = false;
      };
      body.addEventListener("change", event => {
        if (event.target.matches("[data-td-team]")) {
          selectedId = event.target.value;
          trade.memberIds = []; trade.sends = [new Set(), new Set()]; trade.editing = true;
          resetBlueprint();
          draw(); return;
        }
        if (event.target.matches("[data-ta-shop-partner]")) {
          shop.partnerId = event.target.value; shop.anchorPartnerId = ""; shop.receiveAnchors = [];
          shop.openTiers.clear(); refreshOffers(); return;
        }
        const anchorSelect = event.target.closest("[data-tb-add-anchor]");
        if (anchorSelect && anchorSelect.value) {
          const side = anchorSelect.dataset.tbAddAnchor;
          const list = side === "send" ? shop.sendAnchors : shop.receiveAnchors;
          const nextSend = shop.sendAnchors.length + (side === "send" ? 1 : 0);
          const nextReceive = shop.receiveAnchors.length + (side === "receive" ? 1 : 0);
          if (Math.max(1, nextSend) + Math.max(1, nextReceive) > shop.maxPlayers) {
            toast(`This package is capped at ${shop.maxPlayers} players. Raise the slider or remove an anchor.`, true);
          } else if (!list.includes(anchorSelect.value)) {
            list.push(anchorSelect.value);
            const countKey = side === "send" ? "sendCount" : "receiveCount";
            if (shop[countKey] !== "any" && Number(shop[countKey]) < list.length) shop[countKey] = "any";
          }
          refreshOffers(); return;
        }
        if (event.target.matches("[data-tb-send-count], [data-tb-receive-count]")) {
          const isSend = event.target.matches("[data-tb-send-count]");
          if (isSend) shop.sendCount = event.target.value;
          else shop.receiveCount = event.target.value;
          const other = isSend ? "receiveCount" : "sendCount";
          if (shop.sendCount !== "any" && shop.receiveCount !== "any"
            && Number(shop.sendCount) + Number(shop.receiveCount) > shop.maxPlayers) shop[other] = "any";
          refreshOffers(); return;
        }
        if (event.target.matches("[data-tb-max]")) {
          shop.maxPlayers = Number(event.target.value);
          if (shop.sendCount !== "any" && Number(shop.sendCount) >= shop.maxPlayers) shop.sendCount = "any";
          if (shop.receiveCount !== "any" && Number(shop.receiveCount) >= shop.maxPlayers) shop.receiveCount = "any";
          if (shop.sendCount !== "any" && shop.receiveCount !== "any"
            && Number(shop.sendCount) + Number(shop.receiveCount) > shop.maxPlayers) shop.receiveCount = "any";
          refreshOffers();
        }
      });
      body.addEventListener("input", event => {
        if (!event.target.matches("[data-tb-max]")) return;
        const value = event.target.value;
        const output = body.querySelector("[data-tb-max-output]");
        if (output) output.textContent = value;
        const note = event.target.closest(".tb-max")?.querySelector("small");
        if (note) note.textContent = `Up to ${value} total players—not a required total.`;
      });
      body.addEventListener("click", async event => {
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
              remarks: tradeReasons(perspectiveOf(deal), deal.parties[0], deal.parties.at(-1),
                data.pool, deal.sends[0], deal.sends.at(-1)),
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
          const options = intent.closest(".tb-intent-options");
          if (options) options.dataset.intent = value;
          options?.querySelectorAll("[data-tb-intent]").forEach(button => button.classList.toggle("is-active", button === intent));
          const stamp = shop.intentStamp = (shop.intentStamp || 0) + 1;
          setTimeout(() => { if (stamp === shop.intentStamp) refreshOffers(); }, 260);
          return;
        }
        if (event.target.closest("[data-tb-generate]")) { shop.page += 1; draw(); return; }
        const button = event.target.closest("[data-td-load-offer]");
        if (!button) return;
        trade.memberIds = [button.dataset.partner];
        trade.sends = [
          new Set((button.dataset.sendA || "").split(",").filter(Boolean)),
          new Set((button.dataset.sendB || "").split(",").filter(Boolean)),
        ];
        shop.customOpen = true;
        draw();
        body.querySelector("[data-td-verdict]")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      draw();
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
      loadTradeAlerts({ limit: 12 }).catch(error => { console.warn("completed trade receipts unavailable", error); return []; }),
    ]);
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
