// =====================================================================
// trade-desk.js - build a trade by hand and see who wins
// ---------------------------------------------------------------------
// The Trade Lab proposes deals. This is the other half: you already have
// a trade in mind, or somebody has offered you one, and the only question
// is whether to take it.
//
// It does not invent a second opinion. evaluateTrade() in team-analyzer.js
// is the same function the Lab's suggestions are scored with, and it runs
// on the league's own scoring settings - full PPR here, read from the
// synced Sleeper league rather than assumed. A trade judged here and the
// same trade suggested there cannot disagree.
//
// TWO ANSWERS, NOT ONE, because they are different questions and a single
// verdict hides the interesting case:
//
//   VALUE  - who gave up more, in asset terms. This is the "fair or not"
//            question, and it is the one that matters for a rebuild.
//   LINEUP - what it does to each side's weekly points RIGHT NOW. A
//            perfectly fair trade by value can still improve one starting
//            lineup and not the other, because value counts depth a
//            starting eleven cannot use.
//
// Rendering and event handling live here rather than in analyzer.js so a
// checkbox does not force the whole report to redraw - see update(), which
// repaints the verdict alone.
// =====================================================================

import { evaluateTrade } from "./team-analyzer.js";
import { esc } from "./ui.js";

const num = value => (Number.isFinite(Number(value)) ? Number(value) : 0);
const signed = value => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(num(value)).toFixed(1)}`;
const teamName = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || ""}`;

/* Fairness is a percentage of the larger package, so the bands are about
   how lopsided a deal is rather than how big it is. */
export function verdictFor(result) {
  if (!result) return null;
  const gap = num(result.valueToA) - num(result.valueToB);
  const fairness = num(result.fairness);
  if (fairness >= 88) return { tone: "even", headline: "Balanced", who: null };
  const who = gap > 0 ? "a" : "b";
  if (fairness >= 72) return { tone: "slight", headline: "Slight edge", who };
  if (fairness >= 55) return { tone: "clear", headline: "Clear winner", who };
  return { tone: "lopsided", headline: "Lopsided", who };
}

function playerRow(player, side, checked) {
  return `<label class="td-player ${checked ? "is-picked" : ""}">
    <input type="checkbox" data-td-pick="${side}" value="${esc(player.id)}" ${checked ? "checked" : ""}>
    <span class="td-player-copy">
      <b>${esc(player.name)}</b>
      <small>${esc(player.position)} · ${esc(player.nflTeam)} · ${Math.round(num(player.expectedPoints))} pts</small>
    </span>
    <span class="td-value">${Math.round(num(player.tradeValue))}</span>
  </label>`;
}

function sideList(team, pool, picked, side) {
  const players = (team?.playerIds || []).map(id => pool.get(String(id))).filter(Boolean)
    .sort((a, b) => num(b.tradeValue) - num(a.tradeValue));
  return `<div class="td-side">
    <div class="td-side-head">
      <small>${side === "a" ? "YOU SEND" : "YOU GET"}</small>
      <strong>${esc(teamName(team))}</strong>
    </div>
    <div class="td-list">${players.map(p => playerRow(p, side, picked.has(String(p.id)))).join("")
      || `<p class="td-empty">No rated players on this roster.</p>`}</div>
  </div>`;
}

function packageLine(ids, pool) {
  if (!ids.length) return "<em>nobody yet</em>";
  return ids.map(id => esc(pool.get(String(id))?.name || id)).join(" + ");
}

function verdictMarkup(result, teamA, teamB, pool, sendA, sendB) {
  if (!result) {
    return `<div class="td-verdict is-idle">
      <strong>Pick at least one player from each side</strong>
      <span>The verdict updates as you build the deal.</span>
    </div>`;
  }
  const v = verdictFor(result);
  const winner = v.who === "a" ? teamA : v.who === "b" ? teamB : null;
  /* Value and lineup are reported separately and never averaged: a fair
     trade that helps only one starting lineup is a real and common shape,
     and blending the two into one score would hide exactly that. */
  return `<div class="td-verdict is-${v.tone}">
    <div class="td-verdict-head">
      <div>
        <small>VERDICT</small>
        <strong>${esc(v.headline)}${winner ? ` · ${esc(teamName(winner))}` : ""}</strong>
      </div>
      <div class="td-fairness" title="100% is an even split of package value">
        <b>${num(result.fairness)}%</b><span>balance</span>
      </div>
    </div>

    <div class="td-scales">
      <div class="td-scale">
        <small>${esc(teamName(teamA))} gives</small>
        <p>${packageLine(sendA, pool)}</p>
        <span class="td-metric">value out <b>${num(result.valueToB)}</b></span>
      </div>
      <div class="td-scale">
        <small>${esc(teamName(teamB))} gives</small>
        <p>${packageLine(sendB, pool)}</p>
        <span class="td-metric">value out <b>${num(result.valueToA)}</b></span>
      </div>
    </div>

    <div class="td-impact">
      <div class="td-impact-cell ${result.weeklyDeltaA >= 0 ? "is-up" : "is-down"}">
        <small>${esc(teamName(teamA))} lineup</small>
        <b>${signed(result.weeklyDeltaA)}</b><span>pts / week</span>
      </div>
      <div class="td-impact-cell ${result.weeklyDeltaB >= 0 ? "is-up" : "is-down"}">
        <small>${esc(teamName(teamB))} lineup</small>
        <b>${signed(result.weeklyDeltaB)}</b><span>pts / week</span>
      </div>
    </div>

    <p class="td-note">Balance compares what each side gives up in asset value. The lineup figures are
      what the deal does to each starting eleven per week, which can differ - value counts depth a
      lineup cannot start.</p>
  </div>`;
}

export function tradeDeskMarkup(team, teams, pool, state) {
  const partner = teams.find(t => String(t.id) === String(state.partnerId))
    || teams.find(t => t.id !== team.id) || team;
  const picker = `<label class="ta-inline-select"><span>Trade with</span>
    <select data-td-partner aria-label="Trade partner">${teams.filter(t => t.id !== team.id)
      .map(t => `<option value="${esc(t.id)}" ${String(t.id) === String(partner.id) ? "selected" : ""}>${esc(teamName(t))}</option>`).join("")}
    </select></label>`;
  return `${picker}
    <div class="td-board">
      ${sideList(team, pool, state.sendA, "a")}
      ${sideList(partner, pool, state.sendB, "b")}
    </div>
    <p class="td-jump"><a href="#td-verdict">Jump to the verdict &darr;</a></p>
    <div id="td-verdict" data-td-verdict>${verdictMarkup(null)}</div>
    <div class="td-actions"><button type="button" class="btn ghost small" data-td-clear>Clear the board</button></div>`;
}

/**
 * Wire a rendered trade desk. Repaints only the verdict on each change, so
 * building a deal never redraws the report underneath it.
 */
export function mountTradeDesk(root, { team, teams, pool, state, onPartnerChange }) {
  if (!root) return;
  const verdictHost = root.querySelector("[data-td-verdict]");
  const partnerOf = () => teams.find(t => String(t.id) === String(state.partnerId))
    || teams.find(t => t.id !== team.id) || team;

  const update = () => {
    const partner = partnerOf();
    const sendA = [...state.sendA], sendB = [...state.sendB];
    const result = sendA.length && sendB.length
      ? evaluateTrade({ teamA: team, teamB: partner, sendA, sendB, pool })
      : null;
    verdictHost.innerHTML = verdictMarkup(result, team, partner, pool, sendA, sendB);
  };

  root.addEventListener("change", event => {
    const box = event.target.closest("[data-td-pick]");
    if (box) {
      const set = box.dataset.tdPick === "a" ? state.sendA : state.sendB;
      if (box.checked) set.add(box.value); else set.delete(box.value);
      box.closest(".td-player")?.classList.toggle("is-picked", box.checked);
      update();
      return;
    }
    if (event.target.matches("[data-td-partner]")) {
      state.partnerId = event.target.value;
      /* The other side's roster changed, so anything picked from it is gone. */
      state.sendB.clear();
      onPartnerChange?.();
    }
  });

  root.addEventListener("click", event => {
    if (!event.target.closest("[data-td-clear]")) return;
    state.sendA.clear();
    state.sendB.clear();
    root.querySelectorAll("[data-td-pick]").forEach(box => {
      box.checked = false;
      box.closest(".td-player")?.classList.remove("is-picked");
    });
    update();
  });

  update();
}
