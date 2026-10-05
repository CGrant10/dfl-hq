import { scorePlayer } from './dfl-scoring.js';
import { spotlightStats } from './player-spotlight-model.js';

export function resolvePlayerId(players, { id = '', name = '', team = '' } = {}) {
  if (id && players[String(id)]) return String(id);
  const norm = value => String(value || '').trim().toLowerCase();
  const matches = Object.entries(players).filter(([, p]) => norm(p.n) === norm(name) && (!team || norm(p.t) === norm(team)));
  return matches.length === 1 ? matches[0][0] : null;
}

export function playerCardView({ id, players = {}, rosters = [], members = [], season, week, scoring = null, weeks = [], context = null, injuries = null, rostersKnown = true, sleeperUserId = null }) {
  const raw = players[id];
  if (!raw) return null;
  const player = { id: String(id), name: raw.n, position: raw.p, nflTeam: raw.t, injuryStatus: raw.i || '' };
  const ownerRow = rosters.find(r => Number(r.season) === Number(season) && (r.players || []).map(String).includes(String(id)));
  const member = members.find(m => String(m.sleeper_user_id) === String(ownerRow?.sleeper_user_id));
  const owner = ownerRow ? { id: String(ownerRow.roster_id), memberId: member?.id, name: ownerRow.team_name || member?.team_name || member?.display_name || ownerRow.display_name || `Roster ${ownerRow.roster_id}` } : null;
  const myRosterId = sleeperUserId ? rosters.find(r => Number(r.season) === Number(season) && String(r.sleeper_user_id) === String(sleeperUserId))?.roster_id : null;
  const recent = weeks.map(bundle => {
    const row = (bundle.data || []).find(r => String(r.player_id) === String(id) && Number(r.season) === Number(season) && Number(r.week) === Number(bundle.week) && r.season_type === 'regular');
    const points = scoring && row?.stats && Object.keys(row.stats).length ? scorePlayer(row.stats, scoring) : null;
    return { week: bundle.week, points, stale: !!bundle.stale };
  }).sort((a, b) => a.week - b.week);
  const stats = spotlightStats(player, weeks.find(w => w.week === week)?.data || [], { season, week });
  const report = injuries?.items?.find(p => String(p.sleeperId) === String(id));
  return { player, owner, myRosterId, ownerLabel: owner?.name || (rostersKnown ? 'Free agent in DFL' : 'Roster status unavailable'), season, week, recent, stats, points: context?.points ?? recent.find(r => r.week === week)?.points ?? null, state: context?.state || '', afterHalftime: !!context?.afterHalftime, injury: report ? { tag: report.tag, availability: report.availability, body: report.body } : { tag: raw.i || 'No tag', availability: raw.i ? 'Latest Sleeper tag' : 'No injury tag in Sleeper', body: '' } };
}
