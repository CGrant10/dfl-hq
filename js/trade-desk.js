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

import { evaluateMultiTeamTrade, evaluateTrade } from "./team-analyzer.js";
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

/* The recommendation is from team A's point of view. Value carries a little
   more weight than one projected week, while a material lineup swing can
   still move a close deal. The thresholds deliberately leave a negotiation
   band instead of pretending every small model difference is decisive. */
export function recommendationFor(result) {
  if (!result) return null;
  const valueGap = num(result.valueToA) - num(result.valueToB);
  const valueBase = Math.max(num(result.valueToA), num(result.valueToB), 1);
  const valueEdge = valueGap / valueBase * 100;
  const signal = valueEdge * .55 + num(result.weeklyDeltaA) * 8;
  if (signal >= 7) return { action: "ACCEPT", tone: "accept", signal, valueEdge };
  if (signal <= -7) return { action: "PASS", tone: "pass", signal, valueEdge };
  return { action: "NEGOTIATE", tone: "negotiate", signal, valueEdge };
}

function playerRow(player, side, checked) {
  const search = `${player.name} ${player.position} ${player.nflTeam}`.toLowerCase();
  return `<label class="td-player ${checked ? "is-picked" : ""}" data-td-player-row data-search="${esc(search)}">
    <input type="checkbox" data-td-pick="${side}" value="${esc(player.id)}" ${checked ? "checked" : ""}>
    <span class="td-player-copy">
      <b>${esc(player.name)}</b>
      <small>${esc(player.position)} · ${esc(player.nflTeam)} · ${Math.round(num(player.expectedPoints))} pts</small>
    </span>
    <span class="td-value">${Math.round(num(player.tradeValue))}</span>
  </label>`;
}

function sideList(team, pool, picked, side, label) {
  const players = (team?.playerIds || []).map(id => pool.get(String(id))).filter(Boolean)
    .sort((a, b) => num(b.tradeValue) - num(a.tradeValue));
  return `<div class="td-side">
    <div class="td-side-head">
      <div><small>${esc(label || (side === "a" ? "YOU SEND" : "YOU GET"))}</small>
      <strong>${esc(teamName(team))}</strong></div>
      <span class="td-picked-count" data-td-count="${side}">${picked.size} picked</span>
    </div>
    <label class="td-search"><span class="sr-only">Search ${esc(teamName(team))}</span><input type="search" data-td-filter="${side}" placeholder="Search players" autocomplete="off"></label>
    <div class="td-list">${players.map(p => playerRow(p, side, picked.has(String(p.id)))).join("")
      || `<p class="td-empty">No rated players on this roster.</p>`}</div>
  </div>`;
}

function packageLine(ids, pool) {
  if (!ids.length) return "<em>nobody yet</em>";
  return ids.map(id => esc(pool.get(String(id))?.name || id)).join(" + ");
}

function tradeReasons(result, teamA, teamB, pool, sendA, sendB) {
  const incoming = sendB.map(id => pool.get(String(id))).filter(Boolean);
  const outgoing = sendA.map(id => pool.get(String(id))).filter(Boolean);
  const need = teamA?.need;
  const fillsNeed = need && incoming.some(player => player.position === need);
  const givesStrength = teamA?.strength && outgoing.some(player => player.position === teamA.strength);
  const valueGap = num(result.valueToA) - num(result.valueToB);
  const reasons = [];
  if (Math.abs(valueGap) < 4) reasons.push({ tone: "neutral", title: "The asset value is close", copy: `Only ${Math.abs(valueGap).toFixed(1)} value points separate the packages.` });
  else if (valueGap > 0) reasons.push({ tone: "good", title: "You gain asset value", copy: `The incoming package grades ${Math.abs(valueGap).toFixed(1)} value points higher after roster cuts.` });
  else reasons.push({ tone: "bad", title: "You give up more value", copy: `Your outgoing package grades ${Math.abs(valueGap).toFixed(1)} value points higher after roster cuts.` });
  if (result.weeklyDeltaA >= .25) reasons.push({ tone: "good", title: "Your starting lineup improves", copy: `The best legal lineup projects ${signed(result.weeklyDeltaA)} points per week after the trade.` });
  else if (result.weeklyDeltaA <= -.25) reasons.push({ tone: "bad", title: "Your starting lineup gets weaker", copy: `The best legal lineup projects ${signed(result.weeklyDeltaA)} points per week after the trade.` });
  else reasons.push({ tone: "neutral", title: "Your weekly lineup barely moves", copy: "The deal is mainly about asset shape and depth, not an immediate scoring jump." });
  if (fillsNeed) reasons.push({ tone: "good", title: `It addresses your ${need} need`, copy: `The incoming side includes ${incoming.filter(player => player.position === need).map(player => player.name).join(" and ")}.` });
  if (givesStrength) reasons.push({ tone: "warn", title: `You are trading from your best unit`, copy: `One of the outgoing players comes from ${teamA.strength}, currently your strongest position group.` });
  if (sendB.length < sendA.length) reasons.push({ tone: "good", title: "You consolidate the package", copy: "Fewer incoming players can be easier to fit into a starting lineup and roster." });
  else if (sendB.length > sendA.length) reasons.push({ tone: "warn", title: "The package needs roster room", copy: "Extra incoming pieces only count when they beat the players they would displace." });
  if (result.weeklyDeltaB > .35) reasons.push({ tone: "neutral", title: `${teamName(teamB)} has a reason to listen`, copy: `Their lineup also gains ${signed(result.weeklyDeltaB)} projected points per week.` });
  return reasons.slice(0, 4);
}

function verdictMarkup(result, teamA, teamB, pool, sendA, sendB) {
  if (!result) {
    return `<div class="td-verdict is-idle">
      <strong>Pick at least one player from each side</strong>
      <span>The verdict updates as you build the deal.</span>
    </div>`;
  }
  const v = verdictFor(result);
  const recommendation = recommendationFor(result);
  const winner = v.who === "a" ? teamA : v.who === "b" ? teamB : null;
  const reasons = tradeReasons(result, teamA, teamB, pool, sendA, sendB);
  /* Value and lineup are reported separately and never averaged: a fair
     trade that helps only one starting lineup is a real and common shape,
     and blending the two into one score would hide exactly that. */
  return `<div class="td-verdict is-${v.tone}">
    <div class="td-verdict-head">
      <div class="td-call-copy">
        <small>RECOMMENDATION FOR ${esc(teamName(teamA))}</small>
        <div><span class="td-call is-${recommendation.tone}">${recommendation.action}</span><strong>${esc(v.headline)}${winner ? ` · ${esc(teamName(winner))}` : ""}</strong></div>
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

    <div class="td-reasoning">
      <h3>Why the model makes this call</h3>
      <div class="td-reason-list">${reasons.map(reason => `<article class="td-reason is-${reason.tone}"><i aria-hidden="true"></i><div><strong>${esc(reason.title)}</strong><p>${esc(reason.copy)}</p></div></article>`).join("")}</div>
    </div>

  </div>`;
}

function multiTeamVerdictMarkup(result, parties, pool, sends) {
  if (!result) return `<div class="td-verdict is-idle"><strong>Pick a player from each team</strong></div>`;
  const last = parties.length - 1;
  const perspective = { ...result, valueToA: result.values[0], valueToB: result.values[1], weeklyDeltaA: result.weeklyDeltas[0], weeklyDeltaB: result.weeklyDeltas[last] };
  const v = verdictFor(perspective), recommendation = recommendationFor(perspective);
  const winnerIndex = result.values.reduce((best, value, index, values) => value > values[best] ? index : best, 0);
  const winner = parties[winnerIndex];
  const reasons = tradeReasons(perspective, parties[0], parties[last], pool, sends[0], sends[last]);
  const packages = parties.map((from, index) => ({ from, to: parties[(index + 1) % parties.length], ids: sends[index], value: result.values[(index + 1) % parties.length] }));
  return `<div class="td-verdict is-${v.tone}">
    <div class="td-verdict-head"><div class="td-call-copy"><small>RECOMMENDATION FOR ${esc(teamName(parties[0]))}</small><div><span class="td-call is-${recommendation.tone}">${recommendation.action}</span><strong>${esc(v.headline)} · ${esc(teamName(winner))}</strong></div></div><div class="td-fairness"><b>${num(result.fairness)}%</b><span>balance</span></div></div>
    <div class="td-scales is-multi">${packages.map(item => `<div class="td-scale"><small>${esc(teamName(item.from))} → ${esc(teamName(item.to))}</small><p>${packageLine(item.ids, pool)}</p><span class="td-metric">value <b>${num(item.value)}</b></span></div>`).join("")}</div>
    <div class="td-impact is-multi">${parties.map((party, index) => `<div class="td-impact-cell ${result.weeklyDeltas[index] >= 0 ? "is-up" : "is-down"}"><small>${esc(teamName(party))} lineup</small><b>${signed(result.weeklyDeltas[index])}</b><span>pts / week</span></div>`).join("")}</div>
    <div class="td-reasoning"><h3>Why the model makes this call</h3><div class="td-reason-list">${reasons.map(reason => `<article class="td-reason is-${reason.tone}"><i aria-hidden="true"></i><div><strong>${esc(reason.title)}</strong><p>${esc(reason.copy)}</p></div></article>`).join("")}</div></div>
  </div>`;
}

export function tradeDeskMarkup(team, teams, pool, state) {
  state.memberIds ||= state.partnerId ? [state.partnerId] : [];
  state.sends ||= [state.sendA || new Set(), state.sendB || new Set()];
  const available = teams.filter(item => item.id !== team.id);
  const validIds = state.memberIds.filter((id, index, ids) => available.some(item => String(item.id) === String(id)) && ids.findIndex(other => String(other) === String(id)) === index);
  if (!validIds.length && available[0]) validIds.push(available[0].id);
  state.memberIds = validIds;
  const parties = [team, ...validIds.map(id => teams.find(item => String(item.id) === String(id))).filter(Boolean)];
  while (state.sends.length < parties.length) state.sends.push(new Set());
  state.sends.length = parties.length;
  const selectors = validIds.map((id, index) => {
    const usedElsewhere = new Set(validIds.filter((_, otherIndex) => otherIndex !== index).map(String));
    return `<div class="td-member-control"><label class="ta-inline-select"><span>${index === 0 ? "Trade with" : `Member ${index + 2}`}</span><select data-td-member="${index}">${available.filter(item => !usedElsewhere.has(String(item.id))).map(item => `<option value="${esc(item.id)}" ${String(item.id) === String(id) ? "selected" : ""}>${esc(teamName(item))}</option>`).join("")}</select></label>${index ? `<button type="button" class="td-remove-member" data-td-remove-member="${index}" aria-label="Remove ${esc(teamName(parties[index + 1]))}">×</button>` : ""}</div>`;
  }).join("");
  const add = parties.length < teams.length ? `<button type="button" class="btn ghost small td-add-member" data-td-add-member>+ Add member</button>` : "";
  const multi = parties.length > 2;
  return `<div class="td-party-controls">${selectors}${add}</div>
    <div class="td-board ${multi ? "is-multi" : ""}" style="--td-party-count:${parties.length}">
      ${parties.map((party, index) => sideList(party, pool, state.sends[index], String(index), multi ? `${teamName(party)} → ${teamName(parties[(index + 1) % parties.length])}` : index ? "YOU GET" : "YOU SEND")).join("")}
    </div>
    <p class="td-jump"><a href="#td-verdict">Jump to the verdict &darr;</a></p>
    <div id="td-verdict" data-td-verdict>${multi ? multiTeamVerdictMarkup(null) : verdictMarkup(null)}</div>
    <div class="td-actions"><button type="button" class="btn ghost small" data-td-clear>Clear the board</button></div>`;
}

/**
 * Wire a rendered trade desk. Repaints only the verdict on each change, so
 * building a deal never redraws the report underneath it.
 */
export function mountTradeDesk(root, { team, teams, pool, state, onPartnerChange }) {
  if (!root) return;
  const verdictHost = root.querySelector("[data-td-verdict]");
  const partiesOf = () => [team, ...state.memberIds.map(id => teams.find(item => String(item.id) === String(id))).filter(Boolean)];

  const update = () => {
    const parties = partiesOf(), sends = state.sends.map(set => [...set]);
    if (parties.length > 2) {
      const result = sends.every(ids => ids.length) ? evaluateMultiTeamTrade({ teams: parties, sends, pool }) : null;
      verdictHost.innerHTML = multiTeamVerdictMarkup(result, parties, pool, sends);
    } else {
      const [partner] = parties.slice(1), [sendA, sendB] = sends;
      const result = sendA.length && sendB.length ? evaluateTrade({ teamA: team, teamB: partner, sendA, sendB, pool }) : null;
      verdictHost.innerHTML = verdictMarkup(result, team, partner, pool, sendA, sendB);
    }
  };

  root.addEventListener("change", event => {
    const box = event.target.closest("[data-td-pick]");
    if (box) {
      const set = state.sends[Number(box.dataset.tdPick)];
      if (box.checked) set.add(box.value); else set.delete(box.value);
      box.closest(".td-player")?.classList.toggle("is-picked", box.checked);
      const count = root.querySelector(`[data-td-count="${box.dataset.tdPick}"]`);
      if (count) count.textContent = `${set.size} picked`;
      update();
      return;
    }
    if (event.target.matches("[data-td-member]")) {
      const index = Number(event.target.dataset.tdMember);
      state.memberIds[index] = event.target.value;
      state.sends[index + 1] = new Set();
      onPartnerChange?.();
    }
  });

  root.addEventListener("input", event => {
    const filter = event.target.closest("[data-td-filter]");
    if (!filter) return;
    const term = filter.value.trim().toLowerCase();
    const list = filter.closest(".td-side")?.querySelector(".td-list");
    list?.querySelectorAll("[data-td-player-row]").forEach(row => {
      row.hidden = Boolean(term) && !String(row.dataset.search || "").includes(term);
    });
  });

  root.addEventListener("click", event => {
    if (event.target.closest("[data-td-add-member]")) {
      const used = new Set([String(team.id), ...state.memberIds.map(String)]);
      const next = teams.find(item => !used.has(String(item.id)));
      if (next) { state.memberIds.push(next.id); state.sends.push(new Set()); onPartnerChange?.(); }
      return;
    }
    const remove = event.target.closest("[data-td-remove-member]");
    if (remove) {
      const index = Number(remove.dataset.tdRemoveMember);
      state.memberIds.splice(index, 1); state.sends.splice(index + 1, 1); onPartnerChange?.();
      return;
    }
    if (!event.target.closest("[data-td-clear]")) return;
    state.sends.forEach(set => set.clear());
    root.querySelectorAll("[data-td-pick]").forEach(box => {
      box.checked = false;
      box.closest(".td-player")?.classList.remove("is-picked");
    });
    root.querySelectorAll("[data-td-count]").forEach(count => { count.textContent = "0 picked"; });
    update();
  });

  update();
}
