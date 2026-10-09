import { playerScorePhase } from './game-day-player-rows.js';
import { matchupPhase, matchupSummary } from './clubhouse-matchup-model.js';
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
    <div class="home-newspaper-date"><time datetime="${esc(`${year}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`)}">${esc(now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }))}</time></div>
    <div class="home-newspaper-name"><h1>The clubhouse</h1><p class="home-newspaper-edition">${anniversary ? '10th season' : `Season ${season}`} · Est. ${esc(founded)}</p></div>
  </header>`;
}

export function homeSectionLinks() {
  return `<nav class="home-newspaper-sections" aria-label="Home sections"><button type="button" data-home-jump="scores">Matchup</button><button type="button" data-home-jump="lead">Broadcast</button><button type="button" data-home-jump="week">Your week</button><button type="button" data-home-jump="league">League</button><button type="button" data-home-jump="archive">Archive</button></nav>`;
}

/** Current stories lead; the archive gets one dated, rotating feature. */
export function homeBroadcastDeck(deck = [], { week = null, now = new Date() } = {}) {
  const day = now.toLocaleDateString(undefined, { weekday: 'long' });
  const opener = {
    key: 'home:clubhouse-opener', treatment: 'announcement', homeFeature: true,
    headline: 'Bring the', subtitle: 'receipts.',
    body: 'Ten years. Same grudges. New scores.',
    kicker: week ? `Week ${week}` : day,
    href: '#/clubhouse', actionLabel: 'Clubhouse', temporal: 'none',
    background: 'default',
  };
  const stories = deck.filter(item => item && item.key !== opener.key);
  const archive = stories.filter(item => !item.pinned && !item.featured && item.source !== 'manual'
    && ['past', 'record', 'fact'].includes(item.kind));
  const date = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const feature = archive.length ? archive[Math.floor(date / 86400000) % archive.length] : null;
  const brand = stories.find(item => item.kind === 'season') || stories.find(item => item.kind === 'identity');
  return [opener, ...stories.filter(item => {
    if (item.pinned || item.featured || item.source === 'manual') return true;
    if (archive.includes(item)) return item === feature;
    if (['season', 'identity'].includes(item.kind)) return item === brand;
    return true;
  })];
}

/** Direct entry to the same tools and saved state used by their full pages. */
export function homeLeagueTools() {
  return `<nav class="home-league-tools" aria-label="League tools">
    <a class="home-tool-card" href="#/trade"><small>DFLYZER</small><strong>Trade Board</strong><span>Build a package. See the verdict.</span><b>Build a trade <svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></b></a>
    <a class="home-tool-card" href="#/sportsbook"><small>DFL SPORTSBOOK</small><strong>The Book</strong><span>Markets, Pick’em and your tickets.</span><b>Open the book <svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></b></a>
  </nav>`;
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

/** A league-wide live game does not make this member's matchup live. */
export function homeGameDayPhase(model) {
  const game = model?.games?.find(item => item.isMine);
  if (!game) return model?.completed ? { key: 'final', label: 'Final' }
    : model?.live ? { key: 'live', label: 'NFL live' } : { key: 'unknown', label: 'Status pending' };
  const sides = game.sides.map(team => ({ ...team, starters: team.starters || [] }));
  return matchupPhase(sides[0] || { starters: [] }, sides[1] || { starters: [] }, model.completed);
}

export function homeGameDayMatchup(model, weekly = null) {
  const game = model?.games?.find(item => item.isMine);
  if (!game) return '';
  const forecasts = Number(weekly?.season) === Number(model.season) && Number(weekly?.week) === Number(model.week)
    ? game.sides.map(team => weekly.teams?.find(item => team.uid != null && item.sleeper_user_id != null && String(item.sleeper_user_id) === String(team.uid))) : [];
  const projected = homeGameDayPhase(model).key === 'upcoming' && forecasts.length === 2
    && forecasts.every(team => team?.lineupIsSet && Number.isFinite(team.projection));
  const scoreLabel = projected ? 'Projected' : model.completed ? 'Final' : 'Actual';
  const teams = game.sides.map((team, index) => {
    const row = model.standings?.find(item => Number(item.season) === Number(model.season) && String(item.sleeper_user_id) === String(team.uid));
    const known = row?.wins != null && row?.losses != null && [row.wins,row.losses].every(value => Number.isFinite(Number(value)) && Number(value) >= 0);
    const record = team.record || (known ? `${row.wins} – ${row.losses}${Number(row.ties) > 0 ? ` – ${row.ties}` : ''}` : '');
    const remaining = model.completed ? 'Final' : Number.isInteger(team.remaining) && team.remaining >= 0
      ? `${team.remaining} left${team.live > 0 ? ` · ${team.live} playing` : ''}` : 'Player status pending';
    return `<span class="gameday-faceoff-team" data-gameday-team="${esc(team.roster)}">
    ${teamPortrait({ team_name: team.name, identity: team.identity }, { className: 'gameday-faceoff-mark' })}
    <span class="home-team-name"><small class="home-team-record">${esc(record)}</small><strong>${esc(team.identity?.team_name || team.name || team.identity?.display_name)}</strong><small class="home-team-progress">${esc(remaining)}</small></span>
    <span class="home-team-total"${projected ? '' : ` data-gameday-total-key="${esc(team.roster)}"`}><small>${scoreLabel}</small>${projected ? `<strong class="home-projected-total">${forecasts[index].projection.toFixed(1)}</strong>` : thermalScore(team.score, 'neutral')}</span>
  </span>`;
  }).join('<i aria-hidden="true">vs</i>');
  const summary=matchupSummary(game.sides[0],game.sides[1],{completed:model.completed,memberId:model.memberId,compact:true});
  return `<p class="home-matchup-score-label sr-only">${scoreLabel} scores · points</p><a class="gameday-matchup${projected ? ' is-projected' : ''}" href="#/clubhouse?season=${esc(model.season)}&week=${esc(model.week)}&tab=matchups">${teams}<span class="home-matchup-entry"><span>${esc(summary)}</span><strong>Matchup details <svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></strong></span><span class="sr-only">Open matchup. ${scoreLabel} scores in points.</span></a>`;
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
    <header><h2 class="section-title">Player leaders</h2><button type="button" class="home-section-action home-leaders-link" data-gameday-board="all" aria-label="View all player leaders" title="View all player leaders"><span>Week ${esc(model?.week || '—')} leaders</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></button></header>
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
    <header><h2 class="section-title" id="home-league-file-title">The archive<span class="count">${stories.length}</span></h2><a class="home-section-action" href="#/history" aria-label="Explore league history" title="Explore league history"><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></header>
    <nav class="home-archive-paths" aria-label="League archives"><a class="btn ghost small" href="#/clubhouse?archive=1&amp;tab=recap">Week-by-week recaps</a><a class="btn ghost small" href="#/facts?archive=weekly">This week in DFL history</a></nav>
    <div class="home-league-stories">${stories.map(story => `<a class="home-league-story" href="${esc(story.href)}"><img class="home-story-art" src="assets/dfl-daily-${story.art}.webp" alt="" loading="lazy"><div><small>${esc(story.label)}</small><h3>${esc(story.headline)}</h3><p>${esc(story.detail)}</p></div><svg class="home-story-chevron" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a>`).join('')}</div>
  </section>`;
}

/** Section links scroll within Home without replacing the router hash. */
export function wireHomeNewspaperSections(root) {
  root.querySelectorAll('[data-home-jump]').forEach(button => button.addEventListener('click', () => {
    const selectors = { lead: '.home-broadcast', scores: '[data-home-gameday-slot]', week: '.home-week-desk', league: '.home-league-desk', archive: '[data-home-lore-slot]' };
    root.querySelector(selectors[button.dataset.homeJump])?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));
}
