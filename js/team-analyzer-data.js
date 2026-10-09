import { db } from "./supabase.js";
import { sleeper, loadMarketAdp, loadPlayers, loadSeasonStats, loadTrendingPlayers, loadWeeklyProjections, loadWeeklyStats } from "./sleeper.js";
import { loadLeagueState } from "./league-state.js";
import { scoringFormat } from "./dfl-scoring.js";
import { analyzeLeague, buildPlayerPool } from "./team-analyzer.js";
import { loadLatestLeagueResults, reconcileLeagueResults } from './league-results.js';
import { loadMemberDirectory } from "./members.js";
import {currentAnalyzerLeague,currentAnalyzerRoster,matchesDflStartingSlots,DFL_STARTING_SLOTS} from './analyzer-league-context.js';
import {loadExpertRankings} from './expert-rankings-data.js';

const ANALYZER_CACHE_MS = 60 * 1000;
let analyzerValue = null;
let analyzerExpiresAt = 0;
let analyzerInFlight = null;
let analyzerEpoch = 0;

/**
 * The shared wire behind Team Analyzer and Home's Power Pulse.
 *
 * Keeping this in one place matters: Home must never show a different power
 * order from the full report. Sleeper's large player/projection payloads are
 * cached by sleeper.js, and Home calls this only after its useful shell has
 * already painted.
 */
async function fetchAnalyzerData() {
  const [leagueRes, rosterRes, memberRes, leagueState, standingRes] = await Promise.all([
    db().from("sleeper_leagues").select("sleeper_league_id,season,status,scoring_settings,playoff_teams,synced_at").order("season", { ascending: false }).limit(1),
    db().from("sleeper_rosters").select("season,roster_id,sleeper_user_id,players,starters,team_name,display_name,synced_at").order("season", { ascending: false }),
    loadMemberDirectory().then(data => ({ data, error: null }), error => ({ data: [], error })),
    loadLeagueState().catch(() => null),
    db().from("sleeper_standings").select("season,sleeper_user_id,wins,losses,ties,rank,points_for"),
  ]);
  const error = leagueRes.error || rosterRes.error || memberRes.error;
  if (error) throw error;
  const storedLeague = leagueRes.data?.[0] || null;
  const allRosters = rosterRes.data || [];
  const seasons = [...new Set(allRosters.map(row => Number(row.season)).filter(Number.isFinite))].sort((a, b) => b - a);
  const rosterSeason = seasons.find(season => allRosters.filter(row => Number(row.season) === season && row.players?.length).length >= 2);
  const rosters = allRosters.filter(row => Number(row.season) === rosterSeason && row.players?.length);
  if (!storedLeague || !rosters.length) return { state: "empty", league:storedLeague, rosterSeason };

  const [liveLeagueRes,liveUsersRes]=await Promise.allSettled([
    sleeper.league(storedLeague.sleeper_league_id),sleeper.users(storedLeague.sleeper_league_id),
  ]);
  const liveLeague=liveLeagueRes.status==='fulfilled'?liveLeagueRes.value:null;
  const liveUsers=liveUsersRes.status==='fulfilled'&&Array.isArray(liveUsersRes.value)?liveUsersRes.value:[];
  const league=currentAnalyzerLeague(storedLeague,liveLeague);
  if(!matchesDflStartingSlots(league.roster_positions))throw new Error('Sleeper’s starting lineup differs from the supported DFL format. Review the league settings before analyzing trades.');
  if(Number(league.total_rosters)>0&&rosters.length!==Number(league.total_rosters))throw new Error('The synced roster count does not match the current league. Refresh the Sleeper sync before analyzing trades.');
  if(Number(rosterSeason)!==Number(league.season))throw new Error('Current-season rosters are not available. Refresh the Sleeper sync before analyzing trades.');
  const currentNamesComplete=rosters.every(r=>liveUsers.some(u=>String(u.user_id)===String(r.sleeper_user_id)));

  const members = memberRes.data || [];
  const bySleeper = new Map(members.filter(member => member.sleeper_user_id).map(member => [String(member.sleeper_user_id), member]));
  const namedRosters = rosters.map(roster => {
    const member = bySleeper.get(String(roster.sleeper_user_id));
    return currentAnalyzerRoster(roster,member,liveUsers);
  });
  const projectionSeason = Number(league.season) || rosterSeason;
  const format = scoringFormat(league.scoring_settings);
  const liveWeek = Number(leagueState?.season) === projectionSeason
    ? Math.max(0, Math.min(18, Number(leagueState?.currentWeek) || 0)) : 0;
  // Exclude the ongoing week: partial totals are not a full game sample.
  const completedWeeks = Array.from({length:Math.max(0,liveWeek-1)},(_,i)=>i+1);
  const liveSignals = liveWeek ? Promise.all([
    loadWeeklyProjections(projectionSeason, liveWeek).catch(() => ({ data: [], fetchedAt: 0, stale: true })),
    Promise.all(completedWeeks.map(week => loadWeeklyStats(projectionSeason, week)
      .catch(() => ({ data: [], fetchedAt: 0, stale: true })))),
    loadTrendingPlayers().catch(() => ({ adds: new Map(), drops: new Map(), fetchedAt: 0 })),
  ]) : Promise.resolve([{ data: [], fetchedAt: 0 }, [], { adds: new Map(), drops: new Map(), fetchedAt: 0 }]);
  const [players, statsRes, currentStatsRes, projectionRes, matchupRes, [weeklyProjectionRes, recentStatsRes, trending], latestResults,expertRankings] = await Promise.all([
    loadPlayers(),
    loadSeasonStats(projectionSeason - 1).catch(() => ({ data: {}, fetchedAt: 0, stale: true })),
    loadSeasonStats(projectionSeason, { maxAgeMs: 30 * 60 * 1000 }).catch(() => ({ data: {}, fetchedAt: 0, stale: true })),
    loadMarketAdp(projectionSeason, format).catch(() => ({ data: [], fetchedAt: 0, stale: true })),
    /* Power Pulse builds its weekly ranking boards from final scores. Keep
       this season-scoped and column-scoped: the board needs at most 84 small
       matchup rows, not the full multi-season history payload. */
    db().from("sleeper_matchups")
      .select("season,week,roster1,user1,score1,roster2,user2,score2")
      .eq("season", projectionSeason).lte("week", 14).order("week", { ascending: true }),
    liveSignals,
    liveWeek > 1 ? loadLatestLeagueResults(league.sleeper_league_id, projectionSeason, liveWeek).catch(() => null) : null,
    loadExpertRankings({season:projectionSeason,scoring:format}),
  ]);
  const pool = buildPlayerPool({
    rosters: namedRosters,
    players,
    previousStats: statsRes.data || {},
    currentStats: currentStatsRes.data || {},
    projections: projectionRes.data || [],
    weeklyProjections: weeklyProjectionRes.data || [],
    recentStats: recentStatsRes.slice(-3).map(result => result.data || []),
    seasonWeeklyStats: recentStatsRes.map(result => result.data || []),
    dataSignals: {projections:projectionRes,production:currentStatsRes,availability:weeklyProjectionRes,
      weeklyResults:{stale:recentStatsRes.some(r=>r.stale)}},
    trending,
    scoringSettings: league.scoring_settings || {},
    currentWeek: liveWeek,
    scoringFormat: format,
    expertRankings,
  });
  const teams = analyzeLeague({ rosters: namedRosters, pool });
  const results = reconcileLeagueResults({ season: projectionSeason, teams,
    standings: standingRes?.error ? [] : standingRes.data || [],
    matchups: matchupRes?.error ? [] : matchupRes.data || [], snapshot: latestResults });
  return {
    state: teams.length ? "ready" : "empty",
    league, rosterSeason, projectionSeason, teams, pool, members,
    leagueFormat:{teams:rosters.length,scoring:format,startingSlots:(league.roster_positions||DFL_STARTING_SLOTS).filter(p=>p!=='BN'),verified:league!==storedLeague},
    teamNamesSource:currentNamesComplete?'Current Sleeper':liveUsers.length?'Current Sleeper (partial)':'Synced roster',
    ...results,
    projectionUpdatedAt: projectionRes.fetchedAt || 0,
    productionUpdatedAt: currentStatsRes.fetchedAt || statsRes.fetchedAt || 0,
    availabilityUpdatedAt: weeklyProjectionRes.fetchedAt || 0,
    weeklyResultsUpdatedAt: recentStatsRes.length ? Math.min(...recentStatsRes.map(r=>r.fetchedAt||0)) : 0,
    liveSignalsUpdatedAt: weeklyProjectionRes.fetchedAt || 0,
    staleSources: [projectionRes.stale?'Season projections':null,currentStatsRes.stale?'Production':null,
      weeklyProjectionRes.stale?'Availability':null,recentStatsRes.some(r=>r.stale)?'Weekly results':null,
      league===storedLeague?'League settings':null,!currentNamesComplete?'Team names':null].filter(Boolean),
    completedWeeks: completedWeeks.length,
    expertConsensus: {...expertRankings,players:undefined,matched:[...pool.values()].filter(p=>p.expertWeight>0).length,total:pool.size},
    liveWeek,
  };
}

/** Drop the shared model after a Sleeper sync changes rosters or matchups. */
export function clearAnalyzerDataCache() {
  analyzerEpoch += 1;
  analyzerValue = null;
  analyzerExpiresAt = 0;
  analyzerInFlight = null;
}

/**
 * Share one analyzer build across Home, Analyzer, Trade and trade alerts.
 * A one-minute result cache makes quick route changes instant; `force` is for
 * the sync pipeline, where a newly completed trade must never use old rosters.
 */
export function loadAnalyzerData({ force = false } = {}) {
  const now = Date.now();
  if (!force && analyzerValue && now < analyzerExpiresAt) return Promise.resolve(analyzerValue);
  if (!force && analyzerInFlight) return analyzerInFlight;

  const requestEpoch = analyzerEpoch;
  const request = fetchAnalyzerData().then((value) => {
    if (requestEpoch === analyzerEpoch) {
      analyzerValue = value;
      analyzerExpiresAt = Date.now() + ANALYZER_CACHE_MS;
    }
    return value;
  });
  analyzerInFlight = request;
  return request.finally(() => {
    if (analyzerInFlight === request) analyzerInFlight = null;
  });
}
