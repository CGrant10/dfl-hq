import { playerScorePhase } from './game-day-player-rows.js';
import { esc } from './ui.js';
import { playerIdentity } from './player-presentation.js';
import { teamPortrait } from './team-presentation.js';
import { isDefensePlayer, playerScoreTemperature, thermalScore } from './score-temperature.js';

/** The front page is dated at render time, rather than frozen to the mock. */
export function homeNewspaperMasthead({ now = new Date(), founded = 2017 } = {}) {
  const year = now.getFullYear();
  const season = year - founded + 1;
  const anniversary = season > 0 && season % 10 === 0;
  return `<header class="home-newspaper-masthead">
    <div class="home-newspaper-name"><img class="home-wordmark-light" src="assets/dfl-daily-wordmark.webp" width="1300" height="423" alt="DFL Daily"><img class="home-wordmark-dark" src="assets/dfl-daily-wordmark-medicine.webp" width="1300" height="434" alt="DFL Daily"><p class="home-newspaper-edition"><img class="home-newspaper-anniversary" src="assets/dfl-daily-ten.webp" width="732" height="768" alt="DFL 10th anniversary"><span>${anniversary ? 'Anniversary edition' : 'The league edition'} · ${esc(founded)} – ${esc(year)}</span></p></div>
    <div class="home-newspaper-date"><time datetime="${esc(`${year}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`)}"><span>${esc(now.toLocaleDateString('en-US', { weekday: 'long' }))}</span><strong>${esc(now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }))}<br>${esc(year)}</strong></time><small>The DFL<br>back page</small></div>
  </header><nav class="home-newspaper-sections" aria-label="Home sections"><button type="button" data-home-jump="lead" aria-current="location">The lead</button><button type="button" data-home-jump="scores">Scores</button><button type="button" data-home-jump="week">Your week</button><button type="button" data-home-jump="league">League</button><button type="button" data-home-jump="archive">Archive</button></nav>`;
}

/** Keep the existing deck and its refresh behavior behind the illustrated opener. */
export function homeBroadcastDeck(deck = [], { week = null, now = new Date() } = {}) {
  const day = now.toLocaleDateString(undefined, { weekday: 'long' });
  const opener = {
    key: 'home:clubhouse-opener', treatment: 'announcement', homeFeature: true,
    headline: 'Bring the', subtitle: 'receipts.',
    headlineArt: 'assets/dfl-daily-headline.webp',
    body: 'Ten years. Same grudges. New scores.',
    kicker: week ? `Week ${week}` : day,
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
  const rows = players.map((player, index) => {
    const temperature = playerScoreTemperature(player);
    const shortName = String(player.name || '').trim().split(/\s+/);
    const name = shortName.length > 1 ? `${shortName[0][0]}. ${shortName.slice(1).join(' ')}` : player.name;
    const icon = temperature === 'hot' ? 'fire' : 'snow';
    return `<li class="gameday-player" data-gameday-row="home:${esc(`${player.roster}:${player.id}`)}">
      <span class="home-player-rank" aria-hidden="true">${index + 1}</span>
      <svg class="home-player-temperature is-${temperature}" aria-hidden="true"><use href="#i-${icon}"></use></svg>
      <button type="button" class="gameday-player-tap" data-gameday-player="${esc(player.id)}" data-player-roster="${esc(player.roster)}" aria-label="View ${esc(player.name)} game stats">
        ${playerIdentity({ ...player, name }, { detail: [player.position, player.nflTeam].filter(Boolean).join(' · ') })}
      </button>
      <span class="gameday-player-score" data-gameday-score-key="${esc(`${player.roster}:${player.id}`)}">
        ${thermalScore(player.points, temperature)}
        <small data-player-phase="${esc(player.id)}"${player.state === 'final' ? ' data-player-final' : ''}>${esc(playerScorePhase(player))}</small>
      </span>
      <svg class="home-player-chevron" aria-hidden="true"><use href="#home-ui-chevron-right"></use></svg>
    </li>`;
  }).join('');
  return `<section class="home-thermal-leaders" aria-label="Player leaders">
    <header><h2>Player leaders</h2><button type="button" class="home-section-action home-leaders-link" data-gameday-board="all" aria-label="View all player leaders" title="View all player leaders"><span>Week ${esc(model?.week || '—')} leaders</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></button></header>
    ${players.length ? `<ul class="gameday-players">${rows}</ul>` : '<p class="home-thermal-empty">No hot or cold starters yet.</p>'}
  </section>`;
}

/** Existing fact and rivalry models supply the receipts; sparse history stays honest. */
export function homeLeagueFile({ fact = null, rivalry = null, facts = [] } = {}) {
  const labels = { title: 'TITLE FILE', high: 'RECORD BOOK', low: 'ROUGH WEEKS', nailbiter: 'CLOSE CALLS', blowout: 'BIG WINS', streak: 'STREAK WATCH', volume: 'LEAGUE HISTORY' };
  const artFor = kind => kind === 'title' ? 'champion' : kind === 'low' ? 'chip-eater' : ['streak','nailbiter'].includes(kind) ? 'rivalry' : 'archive';
  const factHref = item => item.id ? `#/facts?fact=${encodeURIComponent(item.id)}` : '#/facts';
  const stories = [
    fact ? { label: 'FROM THE DFL ARCHIVE', headline: fact.headline, detail: fact.detail, href: factHref(fact), art: artFor(fact.kind) }
      : { label: 'FROM THE DFL ARCHIVE', headline: 'Every season leaves receipts.', detail: 'Champions, records and the matchups we still talk about.', href: '#/history', art: 'archive' },
    rivalry ? { ...rivalry, art: 'rivalry' } : null,
  ].filter(Boolean);
  const seen = new Set(stories.map(story => story.headline));
  const kinds = new Set([fact?.kind].filter(Boolean));
  // Prefer league-wide records and different kinds of stories, then fill any
  // remaining places from real facts. Sparse archives stay sparse.
  const pool = [...facts.filter(item => !item.userIds?.length), ...facts.filter(item => item.userIds?.length)];
  for (const diverse of [true, false]) {
    for (const item of pool) {
      if (stories.length >= 4) break;
      if (!item.headline || seen.has(item.headline) || diverse && kinds.has(item.kind)) continue;
      stories.push({ label: labels[item.kind] || 'FROM THE DFL ARCHIVE', headline: item.headline, detail: item.detail, href: factHref(item), art: artFor(item.kind) });
      seen.add(item.headline); kinds.add(item.kind);
    }
  }
  return `<section class="home-league-file" aria-labelledby="home-league-file-title">
    <header><h2 id="home-league-file-title">The archive</h2><a class="home-section-action" href="#/history" aria-label="Explore league history" title="Explore league history"><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></header>
    <div class="home-league-stories">${stories.map(story => `<a class="home-league-story" href="${esc(story.href)}"><img class="home-story-art" src="assets/dfl-daily-${story.art}.webp" alt="" loading="lazy"><div><small>${esc(story.label)}</small><h3>${esc(story.headline)}</h3><p>${esc(story.detail)}</p></div><svg class="home-story-chevron" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a>`).join('')}</div>
  </section>`;
}

/** Section links scroll within Home without replacing the router hash. */
export function wireHomeNewspaperSections(root) {
  root.querySelectorAll('[data-home-jump]').forEach(button => button.addEventListener('click', () => {
    const selectors = { lead: '.home-broadcast', scores: '[data-home-gameday-slot]', week: '.home-week-desk', league: '.home-league-desk', archive: '[data-home-lore-slot]' };
    root.querySelector(selectors[button.dataset.homeJump])?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    root.querySelectorAll('[data-home-jump]').forEach(item => item.removeAttribute('aria-current'));
    button.setAttribute('aria-current', 'location');
  }));
}
