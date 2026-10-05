// Browser review fixture: the production renderers with the selected mock's
// sample scores. It lives outside the app and never writes to league data.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { homeBroadcastDeck, homeThermalBoard, homeGameDayMatchup, homeLeagueFile } from '../js/home-presentation.js';
import { renderStage } from '../js/broadcast-stage.js';
import { homeRivalryStory } from '../js/home-clubhouse.js';
import { primarySeasonNavMarkup } from '../js/season-nav.js';
import { matchupPreviewSlide, tradeAlertSlide, nextMoveSlide } from '../js/home-slides.js';
import { disclosure } from '../js/page-disclosure.js';

const players = [
  { id: '7564', name: 'Ja’Marr Chase', position: 'WR', nflTeam: 'CIN', points: 24.6, state: 'live', roster: '1' },
  { id: '6794', name: 'Justin Jefferson', position: 'WR', nflTeam: 'MIN', points: 18.4, state: 'final', roster: '2' },
  { id: '1466', name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', points: 6.8, state: 'final', roster: '1' },
  { id: '6819', name: 'Michael Pittman', position: 'WR', nflTeam: 'IND', points: 8.2, state: 'final', roster: '2' },
];
const model = { season: 2026, week: 5, starters: players, games: [{ isMine: true, sides: [
  { roster: '1', name: 'Grant', record: '3 – 1', score: 124.8, identity: { display_name: 'Grant' } },
  { roster: '2', name: 'Mike', record: '2 – 2', score: 118.2, identity: { display_name: 'Mike' } },
] }] };
const rivalry = homeRivalryStory({ uid: 'u1', members: [{ sleeper_user_id: 'u2', display_name: 'Mike' }], lore: { matchups: [
  { user1: 'u1', user2: 'u2', score1: 120.5, score2: 109.3, season: 2024, week: 5 },
  { user1: 'u2', user2: 'u1', score1: 126.2, score2: 111.8, season: 2025, week: 5 },
] } });
const leagueFile = homeLeagueFile({ rivalry, fact: { headline: 'The smallest margin still gets the win.', detail: 'Archive stories rotate here from the DFL matchup records.' } });
const deck = homeBroadcastDeck([
  { id: 'fixture:news', treatment: 'announcement', kicker: 'League news', headline: 'The league gets the last word.', subtitle: 'The weekly recap is here.', body: 'Weekly awards, matchup conversations and the stories everyone will be talking about.', href: '#/clubhouse', temporal: 'recent' },
  { id: 'fixture:champion', treatment: 'champion', kicker: '2025 · League champion', headline: 'Klutch Sports Group', subtitle: 'The defending champion returns for the anniversary season.', temporal: 'historical' },
  tradeAlertSlide({ season: 2026, week: 5, fairness: 64, winner: 'Dream Enders', balanced: false, reason: { title: 'Dream Enders takes the better back.' }, lineupDeltas: [{ teamName: 'Dream Enders', weekly: 4.2 }], href: '#/trade?id=7' }),
  nextMoveSlide({ week: 5, need: { position: 'WR', urgent: true }, mine: { sleeper_user_id: 'u1' }, trade: { team: { name: 'Klutch Sports Group' }, player: { name: 'Justin Jefferson' } }, waiver: null }),
  matchupPreviewSlide({ pairing: { mine: { sleeper_user_id: 'me', name: 'Klutch Sports Group' }, theirs: { sleeper_user_id: 'them', name: 'Dream Enders' } }, weekly: { teams: [{ sleeper_user_id: 'me', projection: 124.8 }, { sleeper_user_id: 'them', projection: 118.2 }] }, meSleeperId: 'me', season: 2026, week: 5 }),
  { id: 'fixture:golf', treatment: 'scoreboard', kicker: 'Round 2 · 2v2', headline: 'Anniversary golf weekend', sides: [{ name: 'Grant & Mike', score: '6', identity: { display_name: 'Grant' } }, { name: 'Nick & Chris', score: '4', identity: { display_name: 'Nick' } }], scoreLabel: 'Holes', moodText: 'Down to the wire', whereText: 'Through 16 · Team Grant leads by two', temporal: 'live' },
  { id: 'fixture:slate', treatment: 'slate', kicker: '2026 · Week 5', fixtures: [{ key: 'fixture:matchup', a: { name: 'Klutch Sports Group', score: '124.80', status: '3 still playing', identity: { display_name: 'Grant' } }, b: { name: 'Dream Enders', score: '118.20', status: 'Final', identity: { display_name: 'Mike' } } }], temporal: 'live', href: '#/clubhouse' },
  { id: 'fixture:event', treatment: 'event', kicker: 'League calendar', headline: 'Anniversary golf weekend', subtitle: 'The next chapter starts on the first tee.', body: 'Saturday, October 10 · 9:00 AM', temporal: 'upcoming', href: '#/calendar' },
  { id: 'fixture:hero', treatment: 'hero', kicker: 'Ten seasons of DFL', headline: 'Draft. Golf. Repeat.', subtitle: 'A decade of matchups, rivalries and receipts.', temporal: 'none' },
  { id: 'fixture:image', treatment: 'announcement', kicker: 'League highlight', headline: 'Under the lights.', body: 'Follow the matchup stories from kickoff to the final whistle.', background: 'image', image: 'assets/home-broadcast-stadium.webp', href: '#/clubhouse', temporal: 'live' },
  { id: 'fixture:injury', treatment: 'injuries', available: true, page: 1, pages: 3, total: 6, players: [{ sleeperId: '7564', name: 'Ja’Marr Chase', position: 'WR', nflTeam: 'CIN', owner: 'Klutch Sports Group', tag: 'Questionable', availability: 'Game-time decision', tone: 'questionable' }, { sleeperId: '1466', name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', owner: 'Dream Enders', tag: 'Out', availability: 'Will not play', tone: 'out' }], temporal: 'none' },
], { week: 5, now: new Date('2026-10-05T12:00:00Z') });
let html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
html = html.replace(/<div id="splash"[\s\S]*?<\/div><span class="sp-sweep"[^>]*><\/span><\/div>/, '');
html = html.replace('<html lang="en">', '<html lang="en" data-mode="medicine">');
html = html.replace('<main id="view" class="view" aria-live="polite"></main>', `<main id="view" class="view" data-route="home" data-pulse-system="1"><div id="home-wrap">
  <aside class="dfl-anniv dfl-anniv--editorial"><img class="dfl-anniv-art" src="assets/anniversary-ten.webp" width="2172" height="724" alt="10th anniversary season, 2017–2026"></aside>
  <section class="home-broadcast">${renderStage(deck, { editorial: true })}</section>
  <div data-home-gameday-slot><section class="gameday-card" data-gameday-card data-motion="on"><header><div><small>GAMEDAY</small><h2>Week 5 · Monday</h2></div><div class="gameday-controls"><span class="home-game-phase">Live</span><button type="button" class="home-section-action" data-gameday-watch aria-label="Watch game day" title="Watch game day"><svg class="ico-sm" aria-hidden="true"><use href="#i-play"></use></svg></button></div></header><div data-gameday-content>${homeGameDayMatchup(model)}${homeThermalBoard(model)}</div></section></div>
  <div data-home-lore-slot>${leagueFile}</div>
  <section class="home-banter" aria-label="League banter"><div data-wall-slot><section class="block wall is-preview"><h2 class="section-title">The Wall<a class="section-link home-section-action" href="#/wall" aria-label="Open the Wall" title="Open the Wall"><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></h2><div class="card wall-card"><p class="wall-empty muted">Nothing yet. Be the first idiot.</p></div></section></div></section>
  ${disclosure('home-league', 'More from the league', 'Weekly forecasts, side games and activity', '<section class="home-week-focus"><header><small>WEEK 5 · YOUR WEEK</small><h2>Your next move</h2></header><p>Review your lineup before the next kickoff.</p><a class="linkbtn" href="#/analyzer">Review lineup</a></section>')}
</div></main>`);
html = html.replace(/(<nav class="tabbar"[^>]*>)[\s\S]*?<\/nav>/, '$1' + primarySeasonNavMarkup() + '</nav>');
html = html.replace('id="whoami-name">…', 'id="whoami-name">Grant');
html = html.replace('<div class="topbar-actions">', '<div class="topbar-actions"><button class="dfl-preview-toggle is-available" data-mode="commissioner" type="button"><span class="dfl-preview-track"><span class="dfl-preview-knob"></span></span><span>Commish</span></button><button class="notification-bell" type="button" aria-label="Notifications"><svg class="ico" aria-hidden="true"><use href="#i-bell-steel"></use></svg></button>');
const previewCss = readFileSync(new URL('../js/member-preview.js', import.meta.url), 'utf8').match(/style.textContent = `([\s\S]*?)`;/)?.[1]?.replace(/\$\{[^}]+\}/g, '500') || '';
html = html.replace('</head>', `<style>${previewCss}</style></head>`);
html = html.replace('</body>', `<div class="bottomline"><span class="bl-item"><b class="bl-label">NFL</b><span class="bl-text">CHI 17 – 27 WAS · Final</span></span><span class="bl-item"><span class="bl-text">DET 24 – 20 MIN · Final</span></span></div>
<script type="module">
  import { startStage } from './js/broadcast-stage.js';
  import { mountScoreVfx } from './js/score-vfx.js';
  import { mountSeasonNavigation } from './js/season-nav.js';
  const deck = ${JSON.stringify(deck)};
  window.reviewDeck = deck;
  window.reviewStage = startStage(document.querySelector('[data-bx-stage]'), deck);
  window.reviewVfx = mountScoreVfx(document.querySelector('[data-gameday-card]'));
  mountSeasonNavigation();
  document.querySelector('#tabbar [data-route="home"]').classList.add('on');
  document.querySelector('#tabbar').classList.add('is-in-season');
  document.querySelectorAll('[data-score-temperature]').forEach(el => el.style.fontVariantNumeric = 'tabular-nums');
  document.querySelector('.dfl-preview-toggle').addEventListener('click', e => { e.currentTarget.dataset.mode = e.currentTarget.dataset.mode === 'commissioner' ? 'member' : 'commissioner'; });
</script></body>`);
const output = process.env.DFL_REVIEW_DIR || fileURLToPath(new URL('../../dfl-review/', import.meta.url));
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/index.html`, html);
console.log(`Production-component review fixture: ${output}/index.html`);
