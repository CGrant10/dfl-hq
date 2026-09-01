import { esc, errorBox } from "../ui.js";
import { currentMember } from "../members.js";
import { ANALYZER_UNITS, compareTeams, suggestTrades } from "../team-analyzer.js";
import { loadAnalyzerData } from "../team-analyzer-data.js";

const ordinal = value => {
  const n = Number(value), mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] || "th"}`;
};
const signed = value => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(Number(value) || 0).toFixed(1)}`;
const teamName = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || ""}`;
const playerNames = (ids, pool) => ids.map(id => pool.get(String(id))?.name || String(id)).join(" + ");

const stat = (value, digits = 1) => value == null || !Number.isFinite(Number(value)) ? "—" : Number(value).toFixed(digits);
const rankText = (rank, total) => rank ? `#${rank}${total ? ` / ${total}` : ""}` : "—";
const gradeTone = value => String(value || "").startsWith("A") ? "elite" : String(value || "").startsWith("B") ? "good" : String(value || "").startsWith("C") ? "average" : "weak";
const trendLabel = trend => ({ up: "Trending up", down: "Trending down", steady: "Steady", new: "New outlook" }[trend] || "Steady");

function reportHeader(team, count, pool) {
  const assets = team.playerIds.map(id => pool.get(id)).filter(Boolean).sort((a, b) => b.tradeValue - a.tradeValue);
  const averageValue = assets.length ? Math.round(assets.reduce((sum, player) => sum + player.tradeValue, 0) / assets.length) : 0;
  const gradeCard = (label, value, note, primary = false) => `<div class="ta-grade-card ${primary ? "is-primary" : ""} is-${gradeTone(value)}"><small>${label}</small><strong>${esc(value)}</strong><span>${esc(note)}</span></div>`;
  return `<header class="ta-report-lead"><div class="ta-lead-top"><div class="ta-team-intro"><small>TEAM REPORT</small><h2>${esc(teamName(team))}</h2><p>${esc(team.ownerName)} · ${team.playerIds.length} rostered players · ${team.lineup.source === "set" ? "set lineup" : "optimized lineup"}</p></div><div class="ta-finish"><small>STARTER PROJECTION</small><strong>${ordinal(team.rank)}</strong><span>of ${count} · ${stat(team.lineup.weeklyPoints)} weekly</span></div></div><div class="ta-grade-stack">${gradeCard("Starter grade", team.starterGrade, "Average of five units", true)}${gradeCard("Depth grade", team.depthGrade, `${stat(team.lineup.depthScore)} depth score`)}${gradeCard("Overall roster", team.overallGrade, `${ordinal(team.overallRank)} roster profile`)}</div><dl class="ta-kpis"><div><dt>Season starter pts</dt><dd>${stat(team.lineup.starterPoints)}</dd></div><div><dt>Best starting unit</dt><dd>${esc(team.strength || "—")}</dd></div><div><dt>Starting need</dt><dd>${esc(team.need || "No urgent need")}</dd></div><div><dt>Avg. player value</dt><dd>${averageValue}</dd></div></dl><div class="ta-top-asset"><small>TOP ASSET</small><strong>${esc(assets[0]?.name || "—")}</strong><span>${assets[0] ? `${assets[0].position}${assets[0].positionRank ? ` · ${rankText(assets[0].positionRank, assets[0].positionCount)}` : ""} · value ${assets[0].tradeValue}` : "No rated player"}</span></div></header>`;
}

function sectionHead(kicker, title, aside = "") {
  return `<div class="ta-report-title"><div><small>${kicker}</small><h2>${title}</h2></div>${aside}</div>`;
}

function positionReport(team) {
  return `<section class="ta-report-section">${sectionHead("STARTING UNIT GRADES", "Position report", `<span class="ta-inline-note">Five equally weighted starting units · depth shown separately</span>`)}<div class="ta-table-wrap"><table class="ta-table ta-position-table"><thead><tr><th>Pos</th><th>Grade</th><th>League</th><th>Starter score</th><th>Starting unit / depth</th></tr></thead><tbody>${ANALYZER_UNITS.map(position => {
    const group = team.positionGrades[position];
    const names = [...group.starters.map(player => ({ player, role: "Starts" })), ...group.depth.map(player => ({ player, role: "Depth" }))];
    return `<tr><td><b class="ta-pos">${position}</b></td><td><span class="ta-unit-grade is-${gradeTone(group.grade)}"><strong>${esc(group.grade)}</strong><i><span style="width:${Math.round(group.percentile * 100)}%"></span></i></span></td><td>${rankText(group.leagueRank, group.leagueSize)}</td><td><strong>${stat(group.score)}</strong></td><td><div class="ta-player-run">${names.map(({ player, role }) => `<span class="${role === "Depth" ? "is-depth" : ""}"><b>${esc(player.name)}</b><small>${role} · ${stat(player.expectedPoints)} pts · ${rankText(player.positionRank, player.positionCount)}</small></span>`).join("") || `<span class="muted">No ${position}</span>`}</div></td></tr>`;
  }).join("")}</tbody></table></div></section>`;
}

function rosterReport(team, pool) {
  const starters = new Set(team.lineup.starters.map(player => player.id));
  const flexId = team.lineup.flexId;
  const ordered = [...team.lineup.starters, ...team.lineup.bench];
  return `<section class="ta-report-section">${sectionHead("FULL ROSTER", "Player outlook", `<span class="ta-inline-note">Projection leads · prior production is pace-adjusted for games played</span>`)}<div class="ta-table-wrap"><table class="ta-table ta-roster-table"><thead><tr><th>Player</th><th>Role</th><th>Expected</th><th>Per game</th><th>Trend</th><th>Projection</th><th>Prior pace</th><th>Pos rank</th><th>Value</th></tr></thead><tbody>${ordered.map((player, index) => {
    const starting = starters.has(player.id);
    const role = starting ? (player.id === flexId ? "Flex" : "Starter") : "Bench";
    const divider = index === team.lineup.starters.length && team.lineup.bench.length ? `<tr class="ta-roster-divider"><td colspan="9">DEPTH · GRADED SEPARATELY FROM THE STARTING LINEUP</td></tr>` : "";
    return `${divider}<tr class="${starting ? "is-starter" : "is-bench"}"><td><div class="ta-player"><b>${esc(player.name)}</b><small>${esc(player.position)} · ${esc(player.nflTeam)}</small></div></td><td><span class="ta-role">${role}</span></td><td><strong class="ta-expected">${stat(player.expectedPoints)}</strong></td><td>${stat(player.expectedPerGame, 2)}</td><td><span class="ta-trend is-${esc(player.trend)}">${esc(trendLabel(player.trend))}</span></td><td>${stat(player.projectedPoints)}</td><td>${stat(player.priorPace)}</td><td><strong>${rankText(player.positionRank, player.positionCount)}</strong></td><td><b class="ta-value">${player.tradeValue}</b></td></tr>`;
  }).join("")}</tbody></table></div></section>`;
}

function comparison(team, opponent, teams) {
  const result = compareTeams(team, opponent);
  const metrics = [
    ["Projected finish", ordinal(team.rank), ordinal(opponent.rank), team.rank < opponent.rank ? "a" : team.rank > opponent.rank ? "b" : ""],
    ["Starter grade", team.starterGrade, opponent.starterGrade, team.starterPercentile > opponent.starterPercentile ? "a" : team.starterPercentile < opponent.starterPercentile ? "b" : ""],
    ["Depth grade", team.depthGrade, opponent.depthGrade, team.depthPercentile > opponent.depthPercentile ? "a" : team.depthPercentile < opponent.depthPercentile ? "b" : ""],
    ["Overall roster", `${team.overallGrade} · ${ordinal(team.overallRank)}`, `${opponent.overallGrade} · ${ordinal(opponent.overallRank)}`, team.overallPercentile > opponent.overallPercentile ? "a" : team.overallPercentile < opponent.overallPercentile ? "b" : ""],
    ["Weekly points", stat(team.lineup.weeklyPoints), stat(opponent.lineup.weeklyPoints), result.weeklyEdge > 0 ? "a" : result.weeklyEdge < 0 ? "b" : ""],
    ["Starter points", stat(team.lineup.starterPoints), stat(opponent.lineup.starterPoints), team.lineup.starterPoints > opponent.lineup.starterPoints ? "a" : team.lineup.starterPoints < opponent.lineup.starterPoints ? "b" : ""],
    ...result.positions.map(row => [`${row.position} unit`, `${row.a.grade} · ${rankText(row.a.leagueRank)}`, `${row.b.grade} · ${rankText(row.b.leagueRank)}`, row.winner || ""]),
  ];
  const picker = `<label class="ta-inline-select"><span>Compare with</span><select data-ta-compare aria-label="Team to compare">${teams.filter(other => other.id !== team.id).map(other => `<option value="${esc(other.id)}" ${other.id === opponent.id ? "selected" : ""}>${esc(teamName(other))}</option>`).join("")}</select></label>`;
  return `<section class="ta-report-section">${sectionHead("HEAD TO HEAD", "Team comparison", picker)}<div class="ta-compare-summary"><strong>${result.weeklyEdge === 0 ? "Even weekly projection" : `${teamName(result.weeklyEdge > 0 ? team : opponent)} leads by ${Math.abs(result.weeklyEdge).toFixed(1)} per week`}</strong><span>Positive lineup value is highlighted below.</span></div><div class="ta-table-wrap"><table class="ta-table ta-comparison-table"><thead><tr><th>Measure</th><th>${esc(teamName(team))}</th><th>${esc(teamName(opponent))}</th></tr></thead><tbody>${metrics.map(([label, a, b, winner]) => `<tr><td>${esc(label)}</td><td class="${winner === "a" ? "wins" : ""}">${esc(String(a))}</td><td class="${winner === "b" ? "wins" : ""}">${esc(String(b))}</td></tr>`).join("")}</tbody></table></div></section>`;
}

function rankings(teams, selectedId) {
  return `<section class="ta-report-section">${sectionHead("LEAGUE OUTLOOK", "Projected table", `<span class="ta-inline-note">Finish follows weekly points · grades balance all units, depth and value</span>`)}<div class="ta-table-wrap"><table class="ta-table ta-league-table"><thead><tr><th>Rank</th><th>Team</th><th>Weekly</th><th>Starters</th><th>Depth</th><th>Overall</th><th>Best unit</th><th>Need</th></tr></thead><tbody>${teams.map(team => `<tr class="${String(team.id) === String(selectedId) ? "is-current" : ""}"><td><b>${team.rank}</b></td><td><button type="button" data-ta-team="${esc(team.id)}"><strong>${esc(teamName(team))}</strong><small>${esc(team.ownerName)}</small></button></td><td>${stat(team.lineup.weeklyPoints)}</td><td><strong>${esc(team.starterGrade)}</strong></td><td>${esc(team.depthGrade)}</td><td><strong>${esc(team.overallGrade)}</strong> · #${team.overallRank}</td><td>${esc(team.strength || "—")}</td><td>${esc(team.need || "No urgent need")}</td></tr>`).join("")}</tbody></table></div></section>`;
}

function tradeLab(team, teams, pool, selectedPlayerId) {
  const players = team.playerIds.map(id => pool.get(id)).filter(Boolean).sort((a, b) => b.tradeValue - a.tradeValue);
  const selected = players.find(player => player.id === selectedPlayerId) || players[0];
  const offers = selected ? suggestTrades({ teams, teamId: team.id, playerId: selected.id, pool, limit: 8 }) : [];
  const picker = `<label class="ta-inline-select"><span>Shop player</span><select data-ta-player aria-label="Player to shop">${players.map(player => `<option value="${esc(player.id)}" ${player.id === selected?.id ? "selected" : ""}>${esc(player.name)} · ${player.position} · value ${player.tradeValue}</option>`).join("")}</select></label>`;
  return `<section class="ta-report-section ta-trades">${sectionHead("TRADE LAB", "Possible deals", picker)}<p class="ta-note">Packages only receive credit for players who improve the receiving roster. Extra names cannot inflate the result.</p>${offers.length ? `<div class="ta-table-wrap"><table class="ta-table ta-trade-table"><thead><tr><th>Partner</th><th>You send</th><th>You receive</th><th>Balance</th><th>Weekly change</th></tr></thead><tbody>${offers.map(offer => `<tr><td><b>${esc(teamName(offer.other))}</b><small>${offer.sendA.length === 1 && offer.sendB.length === 1 ? "Straight up" : "Package"}</small></td><td>${esc(playerNames(offer.sendA, pool))}</td><td><strong>${esc(playerNames(offer.sendB, pool))}</strong></td><td><span class="ta-balance">${offer.fairness}%</span></td><td><b class="${offer.weeklyDeltaA >= 0 ? "positive" : "negative"}">${signed(offer.weeklyDeltaA)}</b><small>Other ${signed(offer.weeklyDeltaB)}</small></td></tr>`).join("")}</tbody></table></div>` : `<div class="ta-empty">No balanced offers cleared the roster-value checks for ${esc(selected?.name || "this player")}. Try another player instead of padding the deal with throw-ins.</div>`}</section>`;
}

function page(data) {
  const me = currentMember();
  const routeParams = new URLSearchParams((location.hash.split("?")[1] || ""));
  const requestedId = routeParams.get("team"), requestedOwner = routeParams.get("owner");
  let selectedId = data.teams.find(team => requestedOwner && String(team.sleeper_user_id) === String(requestedOwner))?.id || data.teams.find(team => String(team.id) === String(requestedId))?.id || data.teams.find(team => String(team.sleeper_user_id) === String(me?.sleeper_user_id))?.id || data.teams[0].id;
  let compareId = data.teams.find(team => team.id !== selectedId)?.id || selectedId;
  let playerId = "";
  return {
    markup: `<header class="page-head ta-page-head"><div><h1>Team Analyzer</h1><p class="page-sub">${data.projectionSeason} outlook · ${data.rosterSeason} rosters · DFL scoring</p></div><a class="btn ghost small" href="#/keepers">Keepers</a></header><div class="ta-toolbar"><label><span>Reading team</span><select data-ta-team-select>${data.teams.map(team => `<option value="${esc(team.id)}" ${team.id === selectedId ? "selected" : ""}>${esc(teamName(team))}</option>`).join("")}</select></label><p>One continuous report using current expectations, last season’s production and the league’s actual scoring.</p></div><main class="ta-report" data-ta-body></main>`,
    wire(view) {
      const body = view.querySelector("[data-ta-body]");
      const draw = () => {
        const team = data.teams.find(item => item.id === selectedId) || data.teams[0];
        const opponent = data.teams.find(item => item.id === compareId && item.id !== team.id) || data.teams.find(item => item.id !== team.id) || team;
        compareId = opponent.id;
        const selected = team.playerIds.map(id => data.pool.get(id)).find(player => player?.id === playerId);
        if (!selected) playerId = team.playerIds.map(id => data.pool.get(id)).filter(Boolean).sort((a, b) => b.tradeValue - a.tradeValue)[0]?.id || "";
        body.innerHTML = `${reportHeader(team, data.teams.length, data.pool)}${positionReport(team)}${rosterReport(team, data.pool)}${comparison(team, opponent, data.teams)}${rankings(data.teams, team.id)}${tradeLab(team, data.teams, data.pool, playerId)}<p class="ta-method">Method: projected finish uses total points from the submitted legal offensive lineup (1 QB, 2 RB, 2 WR, 1 TE and 1 flex), with an optimized lineup used only when the submitted starters are incomplete. Starter grade equally averages the league-relative QB, RB, WR, TE and flex units shown above, so one high-scoring position cannot hide several weaker units. Depth receives its own grade. Overall roster grade blends starters (72%), depth (18%) and top-12 roster value (10%). Position needs are league-relative and only appear for a genuinely weak starting unit. Player forecasts favor current projections and pace-adjust prior production. Estimates are not guarantees.</p>`;
        view.querySelector("[data-ta-team-select]").value = team.id;
      };
      view.querySelector("[data-ta-team-select]").addEventListener("change", event => { selectedId = event.currentTarget.value; playerId = ""; draw(); });
      body.addEventListener("click", event => { const button = event.target.closest("[data-ta-team]"); if (!button) return; selectedId = button.dataset.taTeam; playerId = ""; draw(); view.scrollTo?.({ top: 0, behavior: "smooth" }); });
      body.addEventListener("change", event => {
        if (event.target.matches("[data-ta-compare]")) { compareId = event.target.value; draw(); }
        if (event.target.matches("[data-ta-player]")) { playerId = event.target.value; draw(); }
      });
      draw();
    },
  };
}

export async function render(view) {
  view.innerHTML = `<header class="page-head"><h1>Team Analyzer</h1><p class="page-sub">Reading every roster, last season and current expectations…</p></header><div class="card"><div class="card-body muted">Building the league outlook…</div></div>`;
  try {
    const data = await loadAnalyzerData();
    if (data.state !== "ready") {
      view.innerHTML = `<header class="page-head"><h1>Team Analyzer</h1></header><div class="card"><div class="card-body"><strong>No populated Sleeper rosters yet.</strong><p class="muted">Run a Sleeper sync after the draft, then come back here.</p></div></div>`;
      return;
    }
    const built = page(data);
    view.innerHTML = built.markup;
    built.wire(view);
  } catch (error) {
    view.innerHTML = errorBox(error);
  }
}
