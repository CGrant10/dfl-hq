import { db } from "./supabase.js";
import { loadMarketAdp, loadPlayers, loadSeasonStats } from "./sleeper.js";
import { scoringFormat } from "./dfl-scoring.js";
import { analyzeLeague, buildPlayerPool } from "./team-analyzer.js";
import { loadMemberDirectory } from "./members.js";

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
  const [leagueRes, rosterRes, memberRes] = await Promise.all([
    db().from("sleeper_leagues").select("sleeper_league_id,season,status,scoring_settings,playoff_teams,synced_at").order("season", { ascending: false }).limit(1),
    db().from("sleeper_rosters").select("season,roster_id,sleeper_user_id,players,starters,team_name,display_name,synced_at").order("season", { ascending: false }),
    loadMemberDirectory().then(data => ({ data, error: null }), error => ({ data: [], error })),
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
  const [players, statsRes, currentStatsRes, projectionRes, matchupRes] = await Promise.all([
    loadPlayers(),
    loadSeasonStats(projectionSeason - 1).catch(() => ({ data: {}, fetchedAt: 0 })),
    loadSeasonStats(projectionSeason, { maxAgeMs: 30 * 60 * 1000 }).catch(() => ({ data: {}, fetchedAt: 0 })),
    loadMarketAdp(projectionSeason, format).catch(() => ({ data: [], fetchedAt: 0 })),
    /* Power Pulse builds its weekly ranking boards from final scores. Keep
       this season-scoped and column-scoped: the board needs at most 84 small
       matchup rows, not the full multi-season history payload. */
    db().from("sleeper_matchups")
      .select("season,week,roster1,user1,score1,roster2,user2,score2")
      .eq("season", projectionSeason).lte("week", 14).order("week", { ascending: true }),
  ]);
  const pool = buildPlayerPool({
    rosters: namedRosters,
    players,
    previousStats: statsRes.data || {},
    currentStats: currentStatsRes.data || {},
    projections: projectionRes.data || [],
    scoringSettings: league.scoring_settings || {},
    scoringFormat: format,
  });
  const teams = analyzeLeague({ rosters: namedRosters, pool });
  return {
    state: teams.length ? "ready" : "empty",
    league, rosterSeason, projectionSeason, teams, pool,
    matchups: matchupRes?.error ? [] : (matchupRes?.data || []),
    projectionUpdatedAt: projectionRes.fetchedAt || 0,
    productionUpdatedAt: currentStatsRes.fetchedAt || statsRes.fetchedAt || 0,
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
