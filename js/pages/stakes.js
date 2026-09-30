import { db } from "../supabase.js";
import { esc, errorBox } from "../ui.js";
import { currentMember, loadMemberDirectory } from "../members.js";
import { loadAnalyzerData } from "../team-analyzer-data.js";
import { loadLeagueState } from "../league-state.js";
import { loadWeeklyProjections, loadWeeklyStats, sleeper } from "../sleeper.js";
import { buildClubhouseWeekly } from "../home-clubhouse.js";
import { powerPulseView } from "../power-pulse.js";
import { buildLeagueStakes, scenarioLine, stakeLine } from "../league-stakes.js";
import { teamPortrait } from "../team-presentation.js";

const key = value => value == null ? "" : String(value);

async function fixturesFor(analysis, weekly, week) {
  const leagueId = analysis?.league?.sleeper_league_id;
  if (!leagueId) return [];
  const raw = await sleeper.matchups(leagueId, week).catch(() => []);
  const groups = new Map();
  (raw || []).forEach(row => {
    if (row?.matchup_id == null) return;
    const id = key(row.matchup_id);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(row);
  });
  const side = row => {
    const team = analysis.teams.find(item => key(item.roster_id) === key(row.roster_id));
    const forecast = weekly?.teams?.find(item => key(item.sleeper_user_id) === key(team?.sleeper_user_id));
    return team ? { ...team, name: team.team_name || team.ownerName || "Unnamed", projection: Number(forecast?.projection) || 0 } : null;
  };
  return [...groups.values()].filter(pair => pair.length === 2).map(pair => ({ a: side(pair[0]), b: side(pair[1]) })).filter(game => game.a && game.b);
}

function gameCard(game) {
  if (!game) return `<section class="stakes-game"><small>GAME OF THE WEEK</small><strong>Slate pending</strong><span>Sleeper has not published the next matchups yet.</span></section>`;
  return `<section class="stakes-game"><small>GAME OF THE WEEK</small><div><strong>${esc(game.a.name)}</strong><b>VS</b><strong>${esc(game.b.name)}</strong></div><span>${game.aProjection.toFixed(1)} – ${game.bProjection.toFixed(1)} projected · ${game.spread.toFixed(1)} point spread</span></section>`;
}

function teamRow(row, mine, berths) {
  const identity = row.identity || {};
  return `<article class="stakes-team ${mine ? "is-mine" : ""}">
    <div class="stakes-seed"><small>SEED</small><strong>${row.projectedSeed}</strong></div>
    ${teamPortrait({ identity, team_name: row.name }, { className: "stakes-logo" })}
    <div class="stakes-team-copy"><strong>${esc(row.name)}</strong><span>${row.wins}-${row.losses}${row.ties ? `-${row.ties}` : ""} · ${Math.round(row.playoffOdds * 100)}% playoffs</span></div>
    <em class="stakes-status is-${row.status}">${esc(stakeLine(row))}</em>
    <details><summary>What they need</summary><p>${esc(scenarioLine(row, berths))}</p></details>
  </article>`;
}

export async function render(view) {
  view.innerHTML = `<div class="stakes-page"><header class="page-head"><div><small>LEAGUE INTELLIGENCE</small><h1>Playoff Race</h1><p>Projected field, cutline pressure and the games that move it.</p></div></header><div class="state is-loading">Building the playoff board…</div></div>`;
  try {
    const [analysis, state, standingsResult, members] = await Promise.all([
      loadAnalyzerData(), loadLeagueState(),
      db().from("sleeper_standings").select("season,sleeper_user_id,wins,losses,ties,rank,points_for"),
      loadMemberDirectory(),
    ]);
    if (analysis?.state !== "ready") throw new Error("Run a Sleeper sync to build the playoff race.");
    if (standingsResult.error) throw standingsResult.error;
    const season = Number(state?.season) || analysis.projectionSeason;
    const week = Number(state?.currentWeek) || 1;
    const [projections, actual] = await Promise.all([loadWeeklyProjections(season, week), loadWeeklyStats(season, week)]);
    const weekly = buildClubhouseWeekly({ analysis, rows: projections?.data || [], actualRows: actual?.data || [], season, week });
    const fixtures = await fixturesFor(analysis, weekly, week);
    const pulse = powerPulseView({ analysis, standings: standingsResult.data || [], currentWeek: week });
    const stakes = buildLeagueStakes({ teams: analysis.teams, standings: standingsResult.data || [], projections: pulse?.projections,
      fixtures, season: analysis.projectionSeason, week, playoffTeams: Number(analysis.league?.playoff_teams) || 8 });
    const me = currentMember();
    const mine = members.find(member => key(member.id) === key(me?.id));
    view.querySelector(".stakes-page").innerHTML = `<header class="page-head"><div><small>${esc(season)} · WEEK ${esc(week)}</small><h1>Playoff Race</h1><p>${stakes.berths} postseason spots. Projections combine record, points and rest-of-season roster strength.</p></div><span class="pill">LIVE MODEL</span></header>
      ${gameCard(stakes.gameOfWeek)}
      <div class="section-title"><span>PROJECTED FIELD</span><span class="count">TOP ${stakes.berths} ADVANCE</span></div>
      <section class="stakes-board">${stakes.projected.map(row => teamRow(row, key(row.sleeperUserId) === key(mine?.sleeper_user_id), stakes.berths)).join("")}</section>
      <p class="stakes-note">Clinched and eliminated labels only appear when the remaining schedule makes them mathematically certain. Everything else is a projection, not a promise.</p>`;
  } catch (error) {
    view.querySelector(".stakes-page").innerHTML = `<header class="page-head"><h1>Playoff Race</h1></header>${errorBox(error)}`;
  }
}
