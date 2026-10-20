/* =====================================================================
   next-move.js - one useful roster move, without inventing certainty.
   ---------------------------------------------------------------------
   The dashboard already knows three different things: starting-unit grades,
   weekly projections, and who owns every rostered player. This joins them.
   A trade target must be another team's DEPTH piece, and a waiver target must
   be genuinely unrostered. A position is only called a need below the same
   42nd-percentile line the analyzer uses for C-level units; otherwise this is
   framed as an upgrade lane, not a roster emergency.
   ===================================================================== */
import { ANALYZER_POSITIONS } from "./team-analyzer.js";
import { esc } from "./ui.js";

const num = value => Number(value) || 0;
const nameOf = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || team?.id || ""}`;
const pts = value => Number.isFinite(Number(value)) ? Number(value).toFixed(1) : "—";

function needsOf(team) {
  return ANALYZER_POSITIONS.map(position => ({ position, ...(team?.positionGrades?.[position] || {}) }))
    .filter(row => row.percentile!=null&&row.percentile!==''&&Number.isFinite(Number(row.percentile)))
    .sort((a, b) => num(a.percentile) - num(b.percentile) || num(b.leagueRank) - num(a.leagueRank));
}

function weeklyPlayer(weekly, id) {
  return weekly?.pool instanceof Map ? weekly.pool.get(String(id)) : null;
}

function projectedWeek(weekly, player) {
  const current = weeklyPlayer(weekly, player?.id);
  if(current?.isOut||current?.hasGame===false)return 0;
  if(current)return current.hasGame&&current.points!=null&&current.points!==''&&Number.isFinite(Number(current.points))?Number(current.points):null;
  const baseline=player?.expectedPerGame??player?.forwardPerGame;
  return baseline!=null&&Number.isFinite(Number(baseline))?Number(baseline):null;
}

function tradeCandidate(analysis, mine, need, weekly) {
  if (!need) return null;
  const options = [];
  for (const team of analysis.teams || []) {
    if (String(team.id) === String(mine.id)) continue;
    for (const player of team.lineup?.bench || []) {
      if (player.position !== need.position) continue;
      const current = weeklyPlayer(weekly, player.id);
      if (current?.isOut || current && !current.hasGame) continue;
      options.push({ player, team, week: projectedWeek(weekly, player) });
    }
  }
  return options.sort((a, b) => b.week - a.week || num(b.player.tradeValue) - num(a.player.tradeValue))[0] || null;
}

function waiverCandidate(analysis, need, weekly, trending) {
  if (!need || !(weekly?.pool instanceof Map)) return null;
  const owned = new Set((analysis.teams || []).flatMap(team => [...(team.playerIds||[]),...(team.reserve||[]),...(team.taxi||[])]).map(String));
  const adds = trending?.adds instanceof Map ? trending.adds : new Map();
  return [...weekly.pool.values()]
    .filter(player => player.position === need.position && !owned.has(String(player.id))
      && player.hasGame && !player.isOut && Number.isFinite(Number(player.points)) && num(player.points) > 0)
    .map(player => ({ player, adds: num(adds.get(String(player.id))) }))
    .sort((a, b) => num(b.player.points) - num(a.player.points) || b.adds - a.adds)[0] || null;
}

function internalCandidate(mine, need, weekly) {
  return (mine?.lineup?.bench || [])
    .filter(player => player.position === need.position)
    .map(player => ({ player, week: projectedWeek(weekly, player), current: weeklyPlayer(weekly, player.id) }))
    .filter(option => option.week > 0 && !option.current?.isOut && (!option.current || option.current.hasGame))
    .sort((a, b) => b.week - a.week || num(b.player.tradeValue) - num(a.player.tradeValue))[0] || null;
}

function weakestStarterWeek(mine, need, weekly) {
  const starters = mine?.positionGrades?.[need.position]?.starters || [];
  if (!starters.length) return null;
  const points=starters.map(player=>projectedWeek(weekly,player));
  return points.every(p=>p!=null&&Number.isFinite(p))?Math.min(...points):null;
}

export function buildNextMove({ analysis, weekly, trending, meSleeperId = null } = {}) {
  if (analysis?.state !== "ready" || !analysis.teams?.length || !weekly?.teams?.length || !meSleeperId) return null;
  const mine = analysis.teams.find(team => String(team.sleeper_user_id) === String(meSleeperId));
  if (!mine) return null;
  const live = weekly.teams.find(team => String(team.sleeper_user_id) === String(meSleeperId));
  const weekRank = [...weekly.teams].sort((a, b) => num(b.projection) - num(a.projection))
    .findIndex(team => String(team.sleeper_user_id) === String(meSleeperId)) + 1;
  const options=[];
  for (const weakest of needsOf(mine)) {
    const need = { ...weakest, urgent: num(weakest.percentile) < .42 };
    /* Auto-scout is for actual holes, not endless shopping. A league-average
       or better unit can still be upgraded, but it is not a "next move." */
    if (!need.urgent) continue;
    const internal = internalCandidate(mine, need, weekly);
    const starterFloor = weakestStarterWeek(mine, need, weekly);
    /* If an active reserve is already as playable as the weakest starter,
       the roster has an internal answer and does not need another player. */
    if (internal && starterFloor > 0 && internal.week >= starterFloor) continue;
    let trade = tradeCandidate(analysis, mine, need, weekly);
    let waiver = waiverCandidate(analysis, need, weekly, trending);
    const knownFloor=starterFloor!=null&&Number.isFinite(starterFloor);
    if(knownFloor&&trade&&trade.week<starterFloor+3)trade=null;
    if(knownFloor&&waiver&&Number(waiver.player.points)<starterFloor+3)waiver=null;
    if (!trade && !waiver) continue;
    const marketBest = Math.max(num(trade?.week), num(waiver?.player?.points));
    if (internal && internal.week >= marketBest * .9) continue;
    options.push({
      season: weekly.season, week: weekly.week, mine, need, live, weekRank,
      leagueSize: weekly.teams.length, trade, waiver,tradeGain:knownFloor&&trade?trade.week-starterFloor:null,
      impact:knownFloor?marketBest-starterFloor:0,
      tradeHref:trade?`#/trade?team=${encodeURIComponent(mine.id)}&partner=${encodeURIComponent(trade.team.id)}&target=${encodeURIComponent(trade.player.id)}`:null,
    });
  }
  return options.sort((a,b)=>b.impact-a.impact||a.need.percentile-b.need.percentile)[0]||null;
}

function trend(adds) {
  if (adds >= 1000) return `${Math.round(adds / 100) / 10}k adds today`;
  if (adds > 0) return `${adds} adds today`;
  return "available in your league";
}

export function nextMoveShell() {
  return `<section class="next-move is-loading" data-next-move aria-live="polite"><span>READING THE MARKET</span></section>`;
}

export function nextMoveCard(view) {
  if (!view) return "";
  const route = view.mine.sleeper_user_id
    ? `#/analyzer?owner=${encodeURIComponent(view.mine.sleeper_user_id)}` : "#/analyzer";
  const standing = view.weekRank
    ? `Projected #${view.weekRank} of ${view.leagueSize} this week at ${pts(view.live?.projection)} points.`
    : `Week ${view.week} projection is still settling.`;
  const diagnosis = view.need.urgent
    ? `${view.need.position} is the starting unit worth attacking — ${view.need.grade || "below league average"}, ranked #${view.need.leagueRank || "—"}.`
    : `No starting unit grades as an urgent need. ${view.need.position} is simply the cleanest upgrade lane.`;
  const trade = view.trade ? `<article class="nm-option is-trade">
      <small>TRADE RADAR · DEPTH PIECE</small>
      <strong>Ask ${esc(nameOf(view.trade.team))} about ${esc(view.trade.player.name)}</strong>
      <p>${esc(view.trade.player.position)} · ${pts(view.trade.week)} projected this week · value ${esc(String(view.trade.player.tradeValue || "—"))}. He sits outside their modeled starting unit.</p>
    </article>` : "";
  const waiver = view.waiver ? `<article class="nm-option is-waiver">
      <small>WAIVER WATCH · UNROSTERED</small>
      <strong>${esc(view.waiver.player.name)}</strong>
      <p>${esc(view.waiver.player.position)} · ${pts(view.waiver.player.points)} projected this week · ${esc(trend(view.waiver.adds))}.</p>
    </article>` : "";
  return `<section class="next-move">
    <header class="nm-head"><div><small>WEEK ${esc(String(view.week))} · AUTO-SCOUT</small><h2>Your next move</h2></div><span>${esc(view.need.urgent ? `${view.need.position} NEED` : `${view.need.position} UPGRADE`)}</span></header>
    <div class="nm-read"><strong>${esc(standing)}</strong><p>${esc(diagnosis)}</p></div>
    <div class="nm-grid">${trade}${waiver}</div>
    <footer><span>Live projections + roster ownership + Sleeper add trends</span><a class="btn ghost small" href="${route}">Open Team Analyzer</a></footer>
  </section>`;
}

/** Compact wrapper for the rotating Home dashboard. */
export function nextMovePanel(view) {
  const html = nextMoveCard(view);
  return html ? `<div class="hd-next-move">${html}</div>` : "";
}
