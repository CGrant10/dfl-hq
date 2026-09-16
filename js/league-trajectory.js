// =====================================================================
// league-trajectory.js - the season line inside Home's Power Pulse
// ---------------------------------------------------------------------
// We have weekly final scores, current rosters and current projections. We
// do NOT have a trustworthy archive of every old projection, so the chart
// never pretends that we do. Solid lines rank what had actually happened by
// each week, tempered by the current roster model. Dashed lines are the
// forecast from the latest completed week through Week 14.
// =====================================================================

import { esc } from "./ui.js";

const DEFAULT_WEEKS = 14;
const PALETTE = [
  "#f0b429", "#40c7a7", "#5da9ff", "#f26b8a", "#a98bff", "#ff8c42",
  "#44c2e8", "#b7cf45", "#ef6fbd", "#8ca8c8", "#d89bff", "#e4c65b",
];

const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const key = value => value == null ? "" : String(value);
const label = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || ""}`;

function teamForSide(row, side, byUser, byRoster) {
  return byUser.get(key(row?.[`user${side}`])) || byRoster.get(key(row?.[`roster${side}`])) || null;
}

function rankValues(teams, valueOf) {
  return [...teams].sort((a, b) => valueOf(b) - valueOf(a) || num(a.rank) - num(b.rank))
    .map((team, index) => ({ id: key(team.id), rank: index + 1 }));
}

/* A normal-CDF approximation for the chance that one projected weekly score
   beats another. Both teams carry the league's measured 22.9-point weekly
   spread, so the difference has sqrt(2) times that variance. */
function erf(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + .3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x);
  return sign * y;
}

function winChance(mean, opponent, weeklySd) {
  if (!Number.isFinite(mean) || !Number.isFinite(opponent)) return .5;
  return .5 * (1 + erf((mean - opponent) / (2 * weeklySd)));
}

/**
 * Build a rank path from completed matchups and the live roster model.
 * Solid weekly power rank = 50% roster, 35% scoring pace, 15% record.
 * The finish forecast keeps results already earned and models only the weeks
 * that remain. Nothing here rewrites a completed game.
 */
export function buildLeagueTrajectory({ teams = [], matchups = [], weeks = DEFAULT_WEEKS, weeklySd = 22.9 } = {}) {
  const live = teams.filter(team => team?.id != null && Number.isFinite(Number(team?.lineup?.weeklyPoints)));
  if (live.length < 2) return null;

  const byId = new Map(live.map(team => [key(team.id), team]));
  const byUser = new Map(live.filter(team => team.sleeper_user_id != null).map(team => [key(team.sleeper_user_id), team]));
  const byRoster = new Map(live.filter(team => team.roster_id != null).map(team => [key(team.roster_id), team]));
  const state = new Map(live.map(team => [key(team.id), { wins: 0, losses: 0, ties: 0, points: 0, games: 0 }]));
  const paths = new Map(live.map(team => [key(team.id), [{ week: 0, rank: num(team.rank) || 1, projected: false }]]));

  const rows = matchups.filter(row => row?.score1 != null && row?.score2 != null
    && Number(row?.week) > 0 && Number(row?.week) <= weeks
    && Number.isFinite(Number(row?.score1)) && Number.isFinite(Number(row?.score2)));
  const playedWeeks = [...new Set(rows.map(row => Number(row.week)))].sort((a, b) => a - b);

  const rosterRanks = new Map(rankValues(live, team => num(team.lineup.weeklyPoints)).map(row => [row.id, row.rank]));
  const rosterStrength = team => live.length === 1 ? 1 : 1 - ((rosterRanks.get(key(team.id)) - 1) / (live.length - 1));

  for (const week of playedWeeks) {
    for (const row of rows.filter(item => Number(item.week) === week)) {
      const a = teamForSide(row, 1, byUser, byRoster), b = teamForSide(row, 2, byUser, byRoster);
      if (!a || !b || key(a.id) === key(b.id)) continue;
      const sa = num(row.score1), sb = num(row.score2);
      const aa = state.get(key(a.id)), bb = state.get(key(b.id));
      aa.points += sa; aa.games += 1;
      bb.points += sb; bb.games += 1;
      if (sa > sb) { aa.wins += 1; bb.losses += 1; }
      else if (sb > sa) { bb.wins += 1; aa.losses += 1; }
      else { aa.ties += 1; bb.ties += 1; }
    }

    const ppg = live.map(team => {
      const record = state.get(key(team.id));
      return record.games ? record.points / record.games : 0;
    });
    const low = Math.min(...ppg), high = Math.max(...ppg);
    const power = team => {
      const record = state.get(key(team.id));
      const pace = record.games ? record.points / record.games : 0;
      const scoring = high === low ? .5 : (pace - low) / (high - low);
      const result = record.games ? (record.wins + record.ties * .5) / record.games : .5;
      return rosterStrength(team) * .5 + scoring * .35 + result * .15;
    };
    for (const ranked of rankValues(live, power)) paths.get(ranked.id).push({ week, rank: ranked.rank, projected: false });
  }

  const latestWeek = playedWeeks.at(-1) || 0;
  const remaining = Math.max(0, weeks - latestWeek);
  const expected = team => {
    const record = state.get(key(team.id));
    const mean = num(team.lineup.weeklyPoints);
    const opponents = live.filter(other => key(other.id) !== key(team.id));
    const weeklyWinRate = opponents.reduce((sum, other) => sum + winChance(mean, num(other.lineup.weeklyPoints), weeklySd), 0) / opponents.length;
    return {
      wins: record.wins + record.ties * .5 + weeklyWinRate * remaining,
      points: record.points + mean * remaining,
    };
  };
  const finishes = [...live].sort((a, b) => {
    const av = expected(a), bv = expected(b);
    return bv.wins - av.wins || bv.points - av.points || num(a.rank) - num(b.rank);
  });
  const finishRank = new Map(finishes.map((team, index) => [key(team.id), index + 1]));

  for (const team of live) {
    const points = paths.get(key(team.id));
    const current = points.at(-1)?.rank || num(team.rank) || 1;
    const finish = finishRank.get(key(team.id)) || current;
    for (let week = latestWeek + 1; week <= weeks; week += 1) {
      const progress = remaining ? (week - latestWeek) / remaining : 1;
      points.push({ week, rank: current + (finish - current) * progress, projected: true });
    }
  }

  return {
    weeks,
    latestWeek,
    series: live.map((team, index) => {
      const points = paths.get(key(team.id));
      const current = points.filter(point => !point.projected).at(-1)?.rank || num(team.rank) || 1;
      return {
        id: key(team.id), name: label(team), color: PALETTE[index % PALETTE.length],
        preseasonRank: num(team.rank) || 1, currentRank: current,
        projectedRank: finishRank.get(key(team.id)) || current, points,
      };
    }),
  };
}

const pathFor = (points, x, y) => points.map((point, index) => `${index ? "L" : "M"}${x(point.week).toFixed(1)},${y(point.rank).toFixed(1)}`).join(" ");
const movement = (from, to) => from === to ? "even" : to < from ? `up ${from - to}` : `down ${to - from}`;

/** Compact, responsive SVG for the bottom half of Power Pulse. */
export function leagueTrajectoryChart(trajectory, focusId = null) {
  if (!trajectory?.series?.length) return "";
  const width = 920, height = 310, left = 34, right = 24, top = 18, bottom = 34;
  const innerWidth = width - left - right, innerHeight = height - top - bottom;
  const count = trajectory.series.length;
  const x = week => left + (week / trajectory.weeks) * innerWidth;
  const y = rank => top + ((rank - 1) / Math.max(1, count - 1)) * innerHeight;
  const focus = trajectory.series.find(team => key(team.id) === key(focusId)) || trajectory.series[0];
  const actualEnd = x(trajectory.latestWeek);
  const axes = Array.from({ length: count }, (_, index) => index + 1).map(rank =>
    `<g class="pp-traj-grid"><line x1="${left}" y1="${y(rank)}" x2="${width - right}" y2="${y(rank)}"/><text x="${left - 8}" y="${y(rank) + 4}">${rank}</text></g>`).join("");
  const ticks = Array.from({ length: Math.floor(trajectory.weeks / 2) + 1 }, (_, i) => i * 2).map(week =>
    `<text class="pp-traj-tick" x="${x(week)}" y="${height - 9}">${week ? `W${week}` : "PRE"}</text>`).join("");
  const lines = [...trajectory.series].sort((a, b) => (key(a.id) === key(focus.id) ? 1 : 0) - (key(b.id) === key(focus.id) ? 1 : 0)).map(team => {
    const solid = team.points.filter(point => !point.projected);
    const future = team.points.filter(point => point.projected);
    if (future.length && solid.length) future.unshift(solid.at(-1));
    const selected = key(team.id) === key(focus.id);
    return `<g class="pp-traj-team ${selected ? "is-focus" : ""}" style="color:${team.color}">
      <path class="pp-traj-line" d="${pathFor(solid, x, y)}"/>
      ${future.length > 1 ? `<path class="pp-traj-line is-projected" d="${pathFor(future, x, y)}"/>` : ""}
      <circle class="pp-traj-dot" cx="${x(trajectory.weeks)}" cy="${y(team.projectedRank)}" r="${selected ? 4.5 : 3}"/>
    </g>`;
  }).join("");
  const legend = trajectory.series.map(team => `<li class="${key(team.id) === key(focus.id) ? "is-focus" : ""}">
    <i style="--pp-team:${team.color}"></i><span>${esc(team.name)}</span><b>#${team.currentRank} <em>→</em> #${team.projectedRank}</b>
  </li>`).join("");

  return `<section class="pp-trajectory" aria-labelledby="pp-trajectory-title">
    <header><div><small id="pp-trajectory-title">LEAGUE TRAJECTORY</small><strong>Rise &amp; fall</strong></div>
      <p><b>${esc(focus.name)}</b> is ${movement(focus.preseasonRank, focus.currentRank)} · projected #${focus.projectedRank}</p></header>
    <div class="pp-traj-key"><span><i></i>Completed weeks</span><span><i class="is-dashed"></i>Projected path</span></div>
    <div class="pp-traj-frame">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="pp-traj-svg-title pp-traj-svg-desc">
        <title id="pp-traj-svg-title">${esc(String(trajectory.weeks))}-week league power trajectory</title>
        <desc id="pp-traj-svg-desc">${esc(focus.name)} moved from rank ${focus.preseasonRank} to ${focus.currentRank} and is projected to finish rank ${focus.projectedRank}. Solid lines are completed weeks. Dashed lines are projections.</desc>
        ${trajectory.latestWeek < trajectory.weeks ? `<rect class="pp-traj-future" x="${actualEnd}" y="${top}" width="${width - right - actualEnd}" height="${innerHeight}"/>` : ""}
        ${axes}${ticks}
        ${trajectory.latestWeek ? `<line class="pp-traj-now" x1="${actualEnd}" y1="${top}" x2="${actualEnd}" y2="${height - bottom}"/><text class="pp-traj-now-label" x="${actualEnd + 7}" y="${top + 12}">NOW</text>` : ""}
        ${lines}
      </svg>
    </div>
    <ol class="pp-traj-legend">${legend}</ol>
    <p class="pp-traj-note">Weekly rank: 50% current lineup strength, 35% scoring pace, 15% record. The dashed finish keeps earned results and models only the remaining weeks.</p>
  </section>`;
}
