import { esc } from './ui.js';
import { playerIdentity } from './player-presentation.js';
import { teamPortrait } from './team-presentation.js';
import { isDefensePlayer, playerScoreTemperature, thermalScore } from './score-temperature.js';

/** Keep the existing deck and its refresh behavior behind the illustrated opener. */
export function homeBroadcastDeck(deck = [], { week = null, now = new Date() } = {}) {
  const day = now.toLocaleDateString(undefined, { weekday: 'long' });
  const opener = {
    key: 'home:clubhouse-opener', treatment: 'announcement', homeFeature: true,
    headline: 'Own the week.', subtitle: 'Bring receipts.',
    body: 'League history, rivalries, and this week’s receipts.',
    bodyLines: ['League history, rivalries,', 'and this week’s receipts.'],
    kicker: `${week ? `Week ${week} · ` : ''}${day}`,
    href: '#/clubhouse', actionLabel: 'Clubhouse', temporal: 'none',
    background: 'default',
  };
  return [opener, ...deck.filter(item => item?.key !== opener.key)];
}

/** A starter-only sample of both temperatures, without filling gaps with fake stats. */
export function homeThermalLeaders(model) {
  const seen = new Set();
  const starters = (model?.starters || []).filter(player => {
    const key = `${player.roster}:${player.id}`;
    if (player.empty || isDefensePlayer(player) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const compareName = (a, b) => String(a.name).localeCompare(String(b.name));
  const hot = starters.filter(p => playerScoreTemperature(p) === 'hot')
    .sort((a, b) => Number(b.points) - Number(a.points) || compareName(a, b));
  const cold = starters.filter(p => playerScoreTemperature(p) === 'cold')
    .sort((a, b) => Number(a.points) - Number(b.points) || compareName(a, b));
  const hotCount = Math.min(hot.length, Math.max(2, 4 - cold.length));
  return [...hot.slice(0, hotCount), ...cold.slice(0, 4 - hotCount)];
}

export function homeGameDayMatchup(model) {
  const game = model?.games?.find(item => item.isMine);
  if (!game) return '';
  const teams = game.sides.map(team => {
    const row = model.standings?.find(item => Number(item.season) === Number(model.season) && String(item.sleeper_user_id) === String(team.uid));
    const known = row?.wins != null && row?.losses != null && [row.wins,row.losses].every(value => Number.isFinite(Number(value)) && Number(value) >= 0);
    const record = team.record || (known ? `${row.wins} – ${row.losses}${Number(row.ties) > 0 ? ` – ${row.ties}` : ''}` : '');
    return `<span class="gameday-faceoff-team" data-gameday-team="${esc(team.roster)}">
    ${teamPortrait({ team_name: team.name, identity: team.identity }, { className: 'gameday-faceoff-mark' })}
    <span class="home-team-name"><strong>${esc(team.identity?.display_name || team.name)}</strong>${record ? `<small>${esc(record)}</small>` : ''}</span>
    ${thermalScore(team.score, 'neutral')}
  </span>`;
  }).join('<i aria-hidden="true">vs</i>');
  return `<a class="gameday-matchup" href="#/clubhouse?season=${esc(model.season)}&week=${esc(model.week)}&tab=matchups">${teams}<span class="sr-only">Open matchup</span></a>`;
}

export function homeThermalBoard(model) {
  const players = homeThermalLeaders(model);
  const rows = players.map(player => {
    const temperature = playerScoreTemperature(player);
    const shortName = String(player.name || '').trim().split(/\s+/);
    const name = shortName.length > 1 ? `${shortName[0][0]}. ${shortName.slice(1).join(' ')}` : player.name;
    const icon = temperature === 'hot' ? 'fire' : 'snow';
    return `<li class="gameday-player" data-gameday-row="home:${esc(`${player.roster}:${player.id}`)}">
      <svg class="home-player-temperature is-${temperature}" aria-hidden="true"><use href="#i-${icon}"></use></svg>
      <button type="button" class="gameday-player-tap" data-gameday-player="${esc(player.id)}" data-player-roster="${esc(player.roster)}" aria-label="View ${esc(player.name)} game stats">
        ${playerIdentity({ ...player, name }, { detail: [player.position, player.nflTeam].filter(Boolean).join(' · ') })}
      </button>
      <span class="gameday-player-score" data-gameday-score-key="${esc(`${player.roster}:${player.id}`)}">
        ${thermalScore(player.points, temperature)}
        ${player.state === 'final' && temperature === 'cold' ? '<small data-player-final>Final</small>' : ''}
      </span>
      <svg class="home-player-chevron" aria-hidden="true"><use href="#home-ui-chevron-right"></use></svg>
    </li>`;
  }).join('');
  return `<section class="home-thermal-leaders" aria-label="Player leaders">
    <header><h2>Player leaders</h2><button type="button" class="home-section-action" data-gameday-board="all" aria-label="View all player leaders" title="View all player leaders"><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></button></header>
    ${players.length ? `<ul class="gameday-players">${rows}</ul>` : '<p class="home-thermal-empty">No hot or cold starters yet.</p>'}
  </section>`;
}

/** Existing fact and rivalry models supply the receipts; sparse history stays honest. */
export function homeLeagueFile({ fact = null, rivalry = null } = {}) {
  const stories = [
    fact ? { label: 'FROM THE DFL ARCHIVE', headline: fact.headline, detail: fact.detail, href: '#/facts' }
      : { label: 'FROM THE DFL ARCHIVE', headline: 'Every season leaves receipts.', detail: 'Champions, records and the matchups we still talk about.', href: '#/history' },
    rivalry,
  ].filter(Boolean);
  return `<section class="home-league-file" aria-labelledby="home-league-file-title">
    <header><h2 id="home-league-file-title">The DFL file</h2><a class="home-section-action" href="#/history" aria-label="Explore league history" title="Explore league history"><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></header>
    <div class="home-league-stories">${stories.map(story => `<a class="home-league-story" href="${esc(story.href)}"><div><small>${esc(story.label)}</small><h3>${esc(story.headline)}</h3><p>${esc(story.detail)}</p></div><svg class="home-story-chevron" aria-hidden="true"><use href="#home-ui-chevron-right"></use></svg></a>`).join('')}</div>
  </section>`;
}
