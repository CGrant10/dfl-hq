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
import { REGULAR_SEASON_WEEKS } from "../season-outlook.js";

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

async function remainingSchedule(analysis, firstWeek) {
  const leagueId = analysis?.league?.sleeper_league_id;
  const weeks = Array.from({ length: Math.max(0, REGULAR_SEASON_WEEKS - firstWeek + 1) }, (_, index) => firstWeek + index);
  if (!leagueId || !weeks.length) return new Map();
  const slates = await Promise.all(weeks.map(async week => ({ week, rows: await sleeper.matchups(leagueId, week).catch(() => []) })));
  const rosterTeam = new Map(analysis.teams.map(team => [key(team.roster_id), team]));
  const result = new Map();
  slates.forEach(({ week, rows }) => {
    const groups = new Map();
    rows.forEach(row => { const id = key(row.matchup_id); if (!groups.has(id)) groups.set(id, []); groups.get(id).push(row); });
    groups.forEach(pair => {
      if (pair.length !== 2) return;
      const a = rosterTeam.get(key(pair[0].roster_id)), b = rosterTeam.get(key(pair[1].roster_id));
      if (!a || !b) return;
      [[a, b], [b, a]].forEach(([team, opponent]) => {
        const id = key(team.sleeper_user_id); if (!result.has(id)) result.set(id, []);
        result.get(id).push({ week, name: opponent.team_name || opponent.ownerName || "Unknown" });
      });
    });
  });
  return result;
}

function gameCard(game) {
  if (!game) return `<section class="stakes-game"><small>GAME OF THE WEEK</small><strong>Slate pending</strong><span>Sleeper has not published the next matchups yet.</span></section>`;
  return `<section class="stakes-game"><small>GAME OF THE WEEK</small><div><strong>${esc(game.a.name)}</strong><b>VS</b><strong>${esc(game.b.name)}</strong></div><span>${game.aProjection.toFixed(1)} – ${game.bProjection.toFixed(1)} projected · ${game.spread.toFixed(1)} point spread</span></section>`;
}

function teamRow(row, mine, berths, opponents = []) {
  const identity = row.identity || {};
  const movement = row.rank ? row.rank - row.projectedSeed : 0;
  return `<article class="stakes-team ${mine ? "is-mine" : ""}">
    <div class="stakes-seed"><small>SEED</small><strong>${row.projectedSeed}</strong><em class="${movement > 0 ? "is-up" : movement < 0 ? "is-down" : ""}">${movement ? `${movement > 0 ? "▲" : "▼"}${Math.abs(movement)}` : "—"}</em></div>
    ${teamPortrait({ identity, team_name: row.name }, { className: "stakes-logo" })}
    <div class="stakes-team-copy"><strong>${esc(row.name)}</strong><span>${row.wins}-${row.losses}${row.ties ? `-${row.ties}` : ""} · ${Math.round(row.playoffOdds * 100)}% playoffs</span></div>
    <em class="stakes-status is-${row.status}">${esc(stakeLine(row))}</em>
    <details><summary>Path + remaining opponents</summary><p>${esc(scenarioLine(row, berths))}</p><ol class="stakes-opponents">${opponents.map(game => `<li><b>W${game.week}</b><span>${esc(game.name)}</span></li>`).join("") || `<li><span>Schedule pending</span></li>`}</ol></details>
  </article>`;
}

function gamesThatMatter(fixtures, stakes, mineId) {
  const mine = stakes.projected.find(row => key(row.sleeperUserId) === key(mineId));
  if (!mine) return [];
  return fixtures.filter(game => key(game.a.sleeper_user_id) !== key(mineId) && key(game.b.sleeper_user_id) !== key(mineId)).map(game => {
    const a = stakes.projected.find(row => key(row.sleeperUserId) === key(game.a.sleeper_user_id));
    const b = stakes.projected.find(row => key(row.sleeperUserId) === key(game.b.sleeper_user_id));
    return { ...game, relevance: Math.min(Math.abs((a?.projectedSeed || 99) - mine.projectedSeed), Math.abs((b?.projectedSeed || 99) - mine.projectedSeed)) };
  }).sort((a, b) => a.relevance - b.relevance).slice(0, 3);
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
    const [fixtures, schedule] = await Promise.all([fixturesFor(analysis, weekly, week), remainingSchedule(analysis, week)]);
    const pulse = powerPulseView({ analysis, standings: standingsResult.data || [], currentWeek: week });
    const stakes = buildLeagueStakes({ teams: analysis.teams, standings: standingsResult.data || [], projections: pulse?.projections,
      fixtures, season: analysis.projectionSeason, week, playoffTeams: Number(analysis.league?.playoff_teams) || 8 });
    const me = currentMember();
    const mine = members.find(member => key(member.id) === key(me?.id));
    const leverageGames = gamesThatMatter(fixtures, stakes, mine?.sleeper_user_id);
    view.querySelector(".stakes-page").innerHTML = `<header class="page-head"><div><small>${esc(season)} · WEEK ${esc(week)}</small><h1>Playoff Race</h1><p>${stakes.berths} postseason spots. Projections combine record, points and rest-of-season roster strength.</p></div><span class="pill">LIVE MODEL</span></header>
      ${gameCard(stakes.gameOfWeek)}
      ${leverageGames.length ? `<div class="section-title"><span>GAMES THAT MOVE YOUR PATH</span><span class="count">WEEK ${week}</span></div><section class="stakes-leverage">${leverageGames.map(game => `<article><strong>${esc(game.a.name)}</strong><b>VS</b><strong>${esc(game.b.name)}</strong><span>${Number(game.a.projection).toFixed(1)} – ${Number(game.b.projection).toFixed(1)} projected</span></article>`).join("")}</section>` : ""}
      <div class="section-title"><span>PROJECTED FIELD</span><span class="count">TOP ${stakes.berths} ADVANCE</span></div>
      <section class="stakes-board">${stakes.projected.map(row => teamRow(row, key(row.sleeperUserId) === key(mine?.sleeper_user_id), stakes.berths, schedule.get(key(row.sleeperUserId)) || [])).join("")}</section>
      <p class="stakes-note">Clinched and eliminated labels only appear when the remaining schedule makes them mathematically certain. Everything else is a projection, not a promise.</p>`;
  } catch (error) {
    view.querySelector(".stakes-page").innerHTML = `<header class="page-head"><h1>Playoff Race</h1></header>${errorBox(error)}`;
  }
}
