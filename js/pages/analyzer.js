import { db } from "../supabase.js";
import { esc, errorBox } from "../ui.js";
import { currentMember } from "../members.js";
import { loadMarketAdp, loadPlayers, loadSeasonStats } from "../sleeper.js";
import { scoringFormat } from "../dfl-scoring.js";
import { ANALYZER_POSITIONS, analyzeLeague, buildPlayerPool, compareTeams, suggestTrades } from "../team-analyzer.js";

const ordinal = value => {
  const n = Number(value), mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] || "th"}`;
};
const signed = value => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(Number(value) || 0).toFixed(1)}`;
const teamName = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || ""}`;
const playerNames = (ids, pool) => ids.map(id => pool.get(String(id))?.name || String(id)).join(" + ");

async function analyzerData() {
  const [leagueRes, rosterRes, memberRes] = await Promise.all([
    db().from("sleeper_leagues").select("season,status,scoring_settings,synced_at").order("season", { ascending: false }).limit(1),
    db().from("sleeper_rosters").select("season,roster_id,sleeper_user_id,players,starters,team_name,display_name,synced_at").order("season", { ascending: false }),
    db().from("members").select("id,display_name,team_name,sleeper_user_id,active"),
  ]);
  const error = leagueRes.error || rosterRes.error || memberRes.error;
  if (error) throw error;
  const league = leagueRes.data?.[0] || null;
  const allRosters = rosterRes.data || [];
  const seasons = [...new Set(allRosters.map(row => Number(row.season)).filter(Number.isFinite))].sort((a, b) => b - a);
  const rosterSeason = seasons.find(season => allRosters.filter(row => Number(row.season) === season && row.players?.length).length >= 2);
  const rosters = allRosters.filter(row => Number(row.season) === rosterSeason && row.players?.length);
  if (!league || !rosters.length) return { state: "empty", league, rosterSeason };

  const members = memberRes.data || [];
  const bySleeper = new Map(members.filter(member => member.sleeper_user_id).map(member => [String(member.sleeper_user_id), member]));
  const namedRosters = rosters.map(roster => {
    const member = bySleeper.get(String(roster.sleeper_user_id));
    return {
      ...roster,
      ownerName: roster.display_name || member?.display_name || "Unassigned owner",
      team_name: roster.team_name || member?.team_name || roster.display_name || member?.display_name || `Team ${roster.roster_id}`,
    };
  });
  const projectionSeason = Number(league.season) || rosterSeason;
  const format = scoringFormat(league.scoring_settings);
  const [players, statsRes, projectionRes] = await Promise.all([
    loadPlayers(),
    loadSeasonStats(projectionSeason - 1).catch(() => ({ data: {}, fetchedAt: 0 })),
    loadMarketAdp(projectionSeason, format).catch(() => ({ data: [], fetchedAt: 0 })),
  ]);
  const pool = buildPlayerPool({
    rosters: namedRosters,
    players,
    previousStats: statsRes.data || {},
    projections: projectionRes.data || [],
    scoringSettings: league.scoring_settings || {},
    scoringFormat: format,
  });
  const teams = analyzeLeague({ rosters: namedRosters, pool });
  return {
    state: teams.length ? "ready" : "empty",
    league, rosterSeason, projectionSeason, teams, pool,
    projectionUpdatedAt: projectionRes.fetchedAt || 0,
    productionUpdatedAt: statsRes.fetchedAt || 0,
  };
}

function hero(team, count) {
  return `<section class="ta-hero admin-card"><div><small>PROJECTED FINISH</small><strong>${ordinal(team.rank)}</strong><span>of ${count} teams</span></div><div class="ta-grade"><small>TEAM GRADE</small><b>${esc(team.grade)}</b></div><div class="ta-hero-stats"><span><b>${team.lineup.weeklyPoints}</b><small>Expected weekly points</small></span><span><b>${esc(team.strength || "—")}</b><small>Biggest strength</small></span><span><b>${esc(team.weakness || "—")}</b><small>Biggest need</small></span></div></section>`;
}

function positions(team) {
  return `<section><h2 class="section-title">Top to bottom</h2><div class="ta-position-grid">${ANALYZER_POSITIONS.map(position => {
    const group = team.positionGrades[position];
    return `<article class="ta-position-card"><header><span>${position}</span><b>${esc(group.grade)}</b></header><div>${group.players.map((player, index) => `<p><strong>${esc(player.name)}</strong><small>${index < ({ QB: 1, RB: 2, WR: 2, TE: 1 })[position] ? "Starter" : "Depth"} · ${player.expectedPoints.toFixed(1)} expected</small></p>`).join("") || `<p class="muted">No ${position} available</p>`}</div></article>`;
  }).join("")}</div></section>`;
}

function rankings(teams, selectedId) {
  return `<section><h2 class="section-title">League projection</h2><div class="ta-rankings">${teams.map(team => `<button type="button" data-ta-team="${esc(team.id)}" class="${String(team.id) === String(selectedId) ? "is-current" : ""}"><span>${team.rank}</span><div><strong>${esc(teamName(team))}</strong><small>${esc(team.ownerName)} · ${team.lineup.weeklyPoints} weekly</small></div><b>${esc(team.grade)}</b></button>`).join("")}</div></section>`;
}

function comparison(team, opponent, teams) {
  const result = compareTeams(team, opponent);
  return `<section class="ta-compare"><div class="ta-section-head"><div><small>TEAM COMPARISON</small><h2>${esc(teamName(team))} vs.</h2></div><select data-ta-compare aria-label="Team to compare">${teams.filter(other => other.id !== team.id).map(other => `<option value="${esc(other.id)}" ${other.id === opponent.id ? "selected" : ""}>${esc(teamName(other))}</option>`).join("")}</select></div><div class="ta-versus"><div><b>${esc(team.grade)}</b><strong>${esc(teamName(team))}</strong><small>${team.lineup.weeklyPoints} weekly</small></div><span>${result.weeklyEdge === 0 ? "EVEN" : `${result.weeklyEdge > 0 ? "←" : "→"} ${Math.abs(result.weeklyEdge).toFixed(1)} PTS`}</span><div><b>${esc(opponent.grade)}</b><strong>${esc(teamName(opponent))}</strong><small>${opponent.lineup.weeklyPoints} weekly</small></div></div><div class="ta-compare-rows">${result.positions.map(row => `<div><span class="${row.winner === "a" ? "wins" : ""}">${esc(row.a.grade)}</span><strong>${row.position}</strong><span class="${row.winner === "b" ? "wins" : ""}">${esc(row.b.grade)}</span></div>`).join("")}</div></section>`;
}

function tradeLab(team, teams, pool, selectedPlayerId) {
  const players = team.playerIds.map(id => pool.get(id)).filter(Boolean).sort((a, b) => b.tradeValue - a.tradeValue);
  const selected = players.find(player => player.id === selectedPlayerId) || players[0];
  const offers = selected ? suggestTrades({ teams, teamId: team.id, playerId: selected.id, pool, limit: 6 }) : [];
  return `<section class="ta-trades"><div class="ta-section-head"><div><small>TRADE LAB</small><h2>Shop a player</h2></div><select data-ta-player aria-label="Player to shop">${players.map(player => `<option value="${esc(player.id)}" ${player.id === selected?.id ? "selected" : ""}>${esc(player.name)} · ${player.position}</option>`).join("")}</select></div><p class="ta-note">Offers are scored by usable lineup value. Extra players only count when they are better than the roster spots they would replace.</p><div class="ta-offers">${offers.map(offer => `<article class="ta-offer"><header><span>${offer.sendA.length === 1 && offer.sendB.length === 1 ? "STRAIGHT UP" : "PACKAGE"}</span><b>${offer.fairness}% balanced</b></header><div class="ta-offer-sides"><div><small>YOU SEND</small><strong>${esc(playerNames(offer.sendA, pool))}</strong></div><span>⇄</span><div><small>YOU RECEIVE</small><strong>${esc(playerNames(offer.sendB, pool))}</strong></div></div><footer><span>With ${esc(teamName(offer.other))}</span><span>You ${signed(offer.weeklyDeltaA)} / week · Them ${signed(offer.weeklyDeltaB)} / week</span></footer></article>`).join("") || `<div class="ta-empty">No balanced offers cleared the roster-value checks for ${esc(selected?.name || "this player")}. Try another player rather than padding the deal with throw-ins.</div>`}</div></section>`;
}

function page(data) {
  const me = currentMember();
  const requestedId = new URLSearchParams((location.hash.split("?")[1] || "")).get("team");
  let selectedId = data.teams.find(team => String(team.id) === String(requestedId))?.id || data.teams.find(team => String(team.sleeper_user_id) === String(me?.sleeper_user_id))?.id || data.teams[0].id;
  let compareId = data.teams.find(team => team.id !== selectedId)?.id || selectedId;
  let playerId = "";
  return {
    markup: `<header class="page-head ta-page-head"><div><h1>Team Analyzer</h1><p class="page-sub">${data.projectionSeason} outlook · ${data.rosterSeason} rosters · DFL scoring</p></div><a class="btn ghost small" href="#/keepers">Keepers</a></header><div class="ta-toolbar"><label><span>Analyze team</span><select data-ta-team-select>${data.teams.map(team => `<option value="${esc(team.id)}" ${team.id === selectedId ? "selected" : ""}>${esc(teamName(team))}</option>`).join("")}</select></label><p>Built from last season’s production and current Sleeper expectations. Projections are estimates, not guarantees.</p></div><div data-ta-body></div>`,
    wire(view) {
      const body = view.querySelector("[data-ta-body]");
      const draw = () => {
        const team = data.teams.find(item => item.id === selectedId) || data.teams[0];
        const opponent = data.teams.find(item => item.id === compareId && item.id !== team.id) || data.teams.find(item => item.id !== team.id) || team;
        compareId = opponent.id;
        const selected = team.playerIds.map(id => data.pool.get(id)).find(player => player?.id === playerId);
        if (!selected) playerId = team.playerIds.map(id => data.pool.get(id)).filter(Boolean).sort((a, b) => b.tradeValue - a.tradeValue)[0]?.id || "";
        body.innerHTML = `${hero(team, data.teams.length)}${positions(team)}${comparison(team, opponent, data.teams)}${tradeLab(team, data.teams, data.pool, playerId)}${rankings(data.teams, team.id)}<p class="ta-method">Method: current projections lead the forecast, last season supplies production context, and lineups are optimized as 1 QB, 2 RB, 2 WR, 1 TE and 1 flex. Bench depth is discounted. Trade packages receive a roster tax.</p>`;
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
    const data = await analyzerData();
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
