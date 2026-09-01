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

import { esc, errorBox } from "../ui.js";
import { currentMember } from "../members.js";
import { loadAnalyzerData } from "../team-analyzer-data.js";
import { mountTradeDesk, tradeDeskMarkup } from "../trade-desk.js";
import { suggestTrades } from "../team-analyzer.js";

const teamName = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || ""}`;
const ordinal = value => {
  const n = Number(value), mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] || "th"}`;
};

function lead(team, count) {
  const need = team.need || "No urgent need";
  return `<header class="ta-report-lead">
    <div class="ta-lead-top">
      <div class="ta-team-intro">
        <small>TRADE DESK</small>
        <h2>${esc(teamName(team))}</h2>
        <p>${esc(team.ownerName)} · ${team.playerIds.length} rostered players</p>
      </div>
      <div class="ta-finish">
        <small>PROJECTED FINISH</small>
        <strong>${ordinal(team.rank)}</strong>
        <span>of ${count}</span>
      </div>
    </div>
    <dl class="ta-kpis">
      <div><dt>Starter grade</dt><dd>${esc(team.starterGrade)}</dd></div>
      <div><dt>Depth grade</dt><dd>${esc(team.depthGrade)}</dd></div>
      <div><dt>Best starting unit</dt><dd>${esc(team.strength || "—")}</dd></div>
      <div><dt>Shopping for</dt><dd>${esc(need)}</dd></div>
    </dl>
  </header>`;
}

const signed = value => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(Number(value) || 0).toFixed(1)}`;
const playerNames = (ids, pool) => ids.map(id => pool.get(String(id))?.name || String(id)).join(" + ");

/*
  THE LAB BELONGS BESIDE THE DESK.

  It was the last thing on the analyzer report, which meant the two halves of
  one job - "what could I trade" and "is this trade good" - sat on different
  pages. They are the same question asked in either direction, so they are now
  the same page: propose above, judge below.
*/
function tradeLab(team, teams, pool, selectedPlayerId) {
  const players = team.playerIds.map(id => pool.get(id)).filter(Boolean).sort((a, b) => b.tradeValue - a.tradeValue);
  const selected = players.find(player => player.id === selectedPlayerId) || players[0];
  const offers = selected ? suggestTrades({ teams, teamId: team.id, playerId: selected.id, pool, limit: 8 }) : [];
  const picker = `<label class="ta-inline-select"><span>Shop player</span><select data-ta-player aria-label="Player to shop">${players.map(player => `<option value="${esc(player.id)}" ${player.id === selected?.id ? "selected" : ""}>${esc(player.name)} · ${player.position} · value ${player.tradeValue}</option>`).join("")}</select></label>`;
  return `<section class="ta-report-section ta-trades">
    <div class="ta-report-title"><div><small>TRADE LAB</small><h2>Suggested deals</h2></div></div>
    <div class="ta-section-body">
      ${picker}
      <p class="ta-note">Packages only receive credit for players who improve the receiving roster. Extra names cannot inflate the result.</p>
      ${offers.length ? `<div class="ta-table-wrap"><table class="ta-table ta-trade-table"><thead><tr><th>Partner</th><th>You send</th><th>You receive</th><th>Balance</th><th>Weekly change</th></tr></thead><tbody>${offers.map(offer => `<tr><td><b>${esc(teamName(offer.other))}</b><small>${offer.sendA.length === 1 && offer.sendB.length === 1 ? "Straight up" : "Package"}</small></td><td data-label="You send">${esc(playerNames(offer.sendA, pool))}</td><td data-label="You receive"><strong>${esc(playerNames(offer.sendB, pool))}</strong></td><td data-label="Balance"><span class="ta-balance">${offer.fairness}%</span></td><td data-label="Weekly change"><b class="${offer.weeklyDeltaA >= 0 ? "positive" : "negative"}">${signed(offer.weeklyDeltaA)}</b><small>Other ${signed(offer.weeklyDeltaB)}</small></td></tr>`).join("")}</tbody></table></div>`
        : `<div class="ta-empty">No balanced offers cleared the roster-value checks for ${esc(selected?.name || "this player")}. Try another player instead of padding the deal with throw-ins.</div>`}
    </div>
  </section>`;
}

function page(data) {
  const me = currentMember();
  const routeTeam = new URLSearchParams((location.hash.split("?")[1] || "")).get("team");
  let selectedId = data.teams.find(team => String(team.id) === String(routeTeam))?.id
    || data.teams.find(team => String(team.sleeper_user_id) === String(me?.sleeper_user_id))?.id
    || data.teams[0].id;
  const trade = { partnerId: "", sendA: new Set(), sendB: new Set() };
  let shopId = "";

  return {
    markup: `<header class="page-head ta-page-head">
        <div><h1>Trade Desk</h1><p class="page-sub">${data.projectionSeason} outlook · DFL full-PPR scoring</p></div>
        <a class="btn ghost small" href="#/analyzer">Analyzer</a>
      </header>
      <div class="ta-toolbar">
        <label><span>Your team</span>
          <select data-td-team>${data.teams.map(team =>
            `<option value="${esc(team.id)}" ${team.id === selectedId ? "selected" : ""}>${esc(teamName(team))}</option>`).join("")}</select>
        </label>
        <p>Tick players on both sides. Balance compares what each side gives up; the lineup figures are what
          the deal does to each starting eleven per week.</p>
      </div>
      <main class="ta-report" data-td-body></main>`,

    wire(view) {
      const body = view.querySelector("[data-td-body]");
      const draw = () => {
        const team = data.teams.find(item => item.id === selectedId) || data.teams[0];
        body.innerHTML = `${lead(team, data.teams.length)}
          <section class="ta-report-section">
            <div class="ta-report-title"><div><small>BUILD IT</small><h2>The deal</h2></div></div>
            <div class="ta-section-body" data-trade-desk>${tradeDeskMarkup(team, data.teams, data.pool, trade)}</div>
          </section>
          ${tradeLab(team, data.teams, data.pool, shopId)}`;
        mountTradeDesk(body.querySelector("[data-trade-desk]"), {
          team, teams: data.teams, pool: data.pool, state: trade, onPartnerChange: draw,
        });
      };
      body.addEventListener("change", event => {
        if (!event.target.matches("[data-ta-player]")) return;
        shopId = event.target.value;
        draw();
      });
      view.querySelector("[data-td-team]").addEventListener("change", event => {
        selectedId = event.currentTarget.value;
        /* Both sides referred to rosters that are no longer in play. */
        trade.partnerId = ""; trade.sendA.clear(); trade.sendB.clear(); shopId = "";
        draw();
      });
      draw();
    },
  };
}

export async function render(view) {
  view.innerHTML = `<header class="page-head"><h1>Trade Desk</h1>
    <p class="page-sub">Reading every roster…</p></header>
    <div class="card"><div class="card-body muted">Building the league outlook…</div></div>`;
  try {
    const data = await loadAnalyzerData();
    if (data.state !== "ready") {
      view.innerHTML = `<header class="page-head"><h1>Trade Desk</h1></header>
        <div class="card"><div class="card-body"><strong>No populated Sleeper rosters yet.</strong>
        <p class="muted">Run a Sleeper sync after the draft, then come back here.</p></div></div>`;
      return;
    }
    const built = page(data);
    view.innerHTML = built.markup;
    built.wire(view);
  } catch (error) {
    view.innerHTML = errorBox(error);
  }
}
