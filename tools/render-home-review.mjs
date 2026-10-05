// Browser review fixture: the production renderers with the selected mock's
// sample scores. It lives outside the app and never writes to league data.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { homeBroadcastDeck, homeThermalBoard, homeGameDayMatchup } from '../js/home-presentation.js';
import { renderStage } from '../js/broadcast-stage.js';
import { primarySeasonNavMarkup } from '../js/season-nav.js';

const players = [
  { id: '7564', name: 'Ja’Marr Chase', position: 'WR', nflTeam: 'CIN', points: 24.6, state: 'live', roster: '1' },
  { id: '6794', name: 'Justin Jefferson', position: 'WR', nflTeam: 'MIN', points: 18.4, state: 'final', roster: '2' },
  { id: '1466', name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', points: 6.8, state: 'final', roster: '1' },
  { id: '6819', name: 'Michael Pittman', position: 'WR', nflTeam: 'IND', points: 8.2, state: 'final', roster: '2' },
];
const model = { season: 2026, week: 5, starters: players, games: [{ isMine: true, sides: [
  { roster: '1', name: 'Grant', score: 124.8, identity: { display_name: 'Grant' } },
  { roster: '2', name: 'Mike', score: 118.2, identity: { display_name: 'Mike' } },
] }] };
const deck = homeBroadcastDeck([
  { key: 'fixture:news', treatment: 'announcement', headline: 'The league gets the last word.', body: 'Weekly stories from the Clubhouse.', href: '#/clubhouse', temporal: 'none' },
  { key: 'fixture:trade', treatment: 'announcement', headline: 'The latest deals, graded.', href: '#/trade', temporal: 'none' },
], { week: 5, now: new Date('2026-10-05T12:00:00Z') });
let html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
html = html.replace(/<div id="splash"[\s\S]*?<\/div><span class="sp-sweep"[^>]*><\/span><\/div>/, '');
html = html.replace('<html lang="en">', '<html lang="en" data-mode="medicine">');
html = html.replace('<main id="view" class="view" aria-live="polite"></main>', `<main id="view" class="view" data-route="home" data-pulse-system="1"><div id="home-wrap">
  <aside class="dfl-anniv dfl-anniv--editorial"><img class="dfl-anniv-art" src="assets/anniversary-ten.webp" width="2172" height="724" alt="10th anniversary season, 2017–2026"></aside>
  <section class="home-broadcast">${renderStage(deck, { editorial: true })}</section>
  <div data-home-gameday-slot><section class="gameday-card" data-gameday-card data-motion="on"><header><div><small>GAMEDAY</small><h2>Week 5 · Monday</h2></div><div class="gameday-controls"><span class="home-game-phase">Live</span><button class="linkbtn" data-gameday-watch>Watch →</button></div></header><div data-gameday-content>${homeGameDayMatchup(model)}${homeThermalBoard(model)}</div></section></div>
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
  import { homeNavigationPresentation } from './js/home-presentation.js';
  const deck = ${JSON.stringify(deck)};
  homeNavigationPresentation();
  window.reviewStage = startStage(document.querySelector('[data-bx-stage]'), deck);
  window.reviewVfx = mountScoreVfx(document.querySelector('[data-gameday-card]'));
  document.querySelector('#tabbar [data-route="home"]').classList.add('on');
  document.querySelector('#tabbar').classList.add('is-in-season');
  document.querySelectorAll('[data-score-temperature]').forEach(el => el.style.fontVariantNumeric = 'tabular-nums');
  document.querySelector('.dfl-preview-toggle').addEventListener('click', e => { e.currentTarget.dataset.mode = e.currentTarget.dataset.mode === 'commissioner' ? 'member' : 'commissioner'; });
</script></body>`);
const output = process.env.DFL_REVIEW_DIR || fileURLToPath(new URL('../../dfl-review/', import.meta.url));
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/index.html`, html);
console.log(`Production-component review fixture: ${output}/index.html`);
