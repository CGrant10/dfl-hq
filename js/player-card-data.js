import { db } from './supabase.js';
import { loadPlayers, loadWeeklyStats } from './sleeper.js';
import { loadLeagueState } from './league-state.js';
import { loadMemberDirectory, currentMember } from './members.js';
import { loadNflInjuries } from './injury-report-data.js';
import { buildInjuryReport } from './injury-report-model.js';
import { playerCardView, resolvePlayerId } from './player-card-model.js';

export async function loadPlayerCard(selection, context = null) {
  const leagueRead=db().from('sleeper_leagues').select('season,sleeper_league_id,scoring_settings');
  const requestedSeason=Number(context?.season),scopedLeague=Number.isInteger(requestedSeason)&&requestedSeason>0?leagueRead.eq('season',requestedSeason):leagueRead;
  const [players, state, league, rosters, members, injury] = await Promise.all([
    loadPlayers(), loadLeagueState(),
    scopedLeague.order('season', { ascending: false }).limit(1),
    db().from('sleeper_rosters').select('season,roster_id,sleeper_user_id,players,team_name,display_name').order('season', { ascending: false }),
    loadMemberDirectory().catch(() => []), loadNflInjuries().catch(() => null),
  ]);
  const id = resolvePlayerId(players, selection);
  if (!id) throw Error('This player could not be identified.');
  const season = Number(context?.season || state.season), week = Number(context?.week || state.currentWeek);
  const weeks = await Promise.all(Array.from({ length: Math.min(3, week) }, (_, i) => week - i).map(async week => {
    try { return { ...await loadWeeklyStats(season, week, { maxAgeMs: 60000 }), week }; }
    catch { return { week, data: [], stale: true }; }
  }));
  const scoring = !league.error && Number(league.data?.[0]?.season) === season ? league.data[0].scoring_settings : null;
  const p = players[id];
  const analysis = { pool: new Map([[id, { id, name: p.n, position: p.p, nflTeam: p.t }]]) };
  return {...playerCardView({ id, players, rosters: rosters.error ? [] : rosters.data || [], members, season, week, scoring, weeks, context, injuries: injury ? buildInjuryReport(injury.payload, { analysis, offenseOnly: false }) : null, rostersKnown: !rosters.error && (rosters.data || []).some(r => Number(r.season) === season && r.players?.length), sleeperUserId: currentMember()?.sleeper_user_id }),leagueId:!league.error&&Number(league.data?.[0]?.season)===season?league.data[0].sleeper_league_id:null};
}
