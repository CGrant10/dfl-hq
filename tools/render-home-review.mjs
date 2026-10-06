// Browser review fixture: the production renderers with the selected mock's
// sample scores. It lives outside the app and never writes to league data.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { homeBroadcastDeck, homeThermalBoard, homeGameDayMatchup, homeLeagueFile, homeNewspaperMasthead } from '../js/home-presentation.js';
import { renderStage } from '../js/broadcast-stage.js';
import { homeRivalryStory } from '../js/home-clubhouse.js';
import { primarySeasonNavMarkup } from '../js/season-nav.js';
import { matchupPreviewSlide, tradeAlertSlide, nextMoveSlide } from '../js/home-slides.js';
import { disclosure } from '../js/page-disclosure.js';
import { MEDICINE_GROUND, teamPalette } from '../js/team-theme.js';
import { esc } from '../js/ui.js';
import { icon } from '../js/icons.js';
import { accentOf, isChampionTitle, displayAchievement, ringCount } from '../js/identity-rules.js';
import { teamCode, teamLogo, teamGradientVars } from '../js/nfl-teams.js';
import { artworkStyle } from '../js/broadcast-artwork.js';
import { playerRows } from '../js/game-day-player-rows.js';
import { team as nflTeam } from '../js/nfl-teams.js';

// Read the actual production palette literals and assignments without loading
// the browser theme module's session/database dependencies into this fixture.
const themeSource = readFileSync(new URL('../js/theme.js', import.meta.url), 'utf8');
const paletteLiteral = themeSource.match(/const MODES = (\{[\s\S]*?\n\});/)[1];
const palettes = Function('MEDICINE_GROUND', `return (${paletteLiteral})`)(MEDICINE_GROUND);
palettes['team:KC'] = teamPalette(nflTeam('KC'));
const themeAssignments = [...themeSource.matchAll(/s\.setProperty\("([^"]+)", m\.([a-zA-Z0-9]+)\);/g)];
const reviewThemes = Object.fromEntries(Object.entries(palettes).map(([name, palette]) => [name, {
  mode: ['light', 'fairway', 'medicine-light'].includes(name) ? 'light' : name.startsWith('team:') ? 'team' : name,
  values: { ...Object.fromEntries(themeAssignments.map(([, property, field]) => [property, palette[field]])),
    '--accent-fill': palette.fill || '#E5011B', '--accent-2-fill': palette.fill2 || '#003396' },
}]));

// Evaluate only the pure production markup functions: no auth, session, or DB
// module is loaded. Review identities are readers, so management forms stay out.
const identitySource = readFileSync(new URL('../js/profile-identity.js', import.meta.url), 'utf8');
const ringsMarkup = identitySource.slice(identitySource.indexOf('function rings('), identitySource.indexOf('export function profileIdentityDisplay'));
const bylineMarkup = identitySource.slice(identitySource.indexOf('export function identityByline('), identitySource.indexOf('// -------------------------------------------------------------- editor')).replace('export ', '');
const identityByline = Function('esc', 'icon', 'isChampionTitle', 'displayAchievement', 'ringCount', 'teamCode', 'teamLogo', 'teamGradientVars', `${ringsMarkup}\n${bylineMarkup}\nreturn identityByline;`)(esc, icon, isChampionTitle, displayAchievement, ringCount, teamCode, teamLogo, teamGradientVars);
const wallSource = readFileSync(new URL('../js/member-wall.js', import.meta.url), 'utf8');
const reactionSource = readFileSync(new URL('../js/wall-reactions.js', import.meta.url), 'utf8');
const reactionMarkup = reactionSource.slice(reactionSource.indexOf('export const WALL_REACTIONS'), reactionSource.indexOf('export async function wireReactions')).replaceAll('export ', '');
const wallMarkup = wallSource.slice(wallSource.indexOf('function stamp('), wallSource.indexOf('async function mutatePost'));
const reviewWallPost = Function('esc', 'icon', 'identityByline', 'accentOf', 'artworkStyle', 'currentMember', 'isAdmin', `${reactionMarkup}\n${wallMarkup}\nreturn postHtml;`)(esc, icon, identityByline, accentOf, artworkStyle, () => null, () => false);
const wallPosts = [
  {id: 1, member_id: 'u1', created_at: '2026-10-06T12:00:00Z', body: 'That .60 still hurts. Bring the receipts next time.', reply_count: 2, members: {display_name:'Commish',profile_title:'League commissioner',favorite_team:'KC'}},
  {id: 2, member_id: 'u2', created_at: '2026-10-05T12:00:00Z', body: 'Same story every year. Mike’s lucky. A full weekend of football, a last-minute lineup change, and somehow it still comes down to a fraction of a point. Save the screenshots. We’re going to need those receipts when the rematch rolls around.', reply_count: 1, image:'assets/dfl-daily-rivalry.webp', members: {display_name:'League Vet',profile_title:'Keeper of the receipts',featured_achievement:'A decade of rivalry wins'}},
  {id: 3, member_id: 'u3', created_at: '2026-10-04T12:00:00Z', body: 'Decimal mafia never sleeps.', reply_count: 0, members: {display_name:'The Analyst'}},
].map(row => reviewWallPost(row, true)).join('');

const players = [
  { id: '7564', name: 'Ja’Marr Chase', position: 'WR', nflTeam: 'CIN', points: 24.6, state: 'final', roster: '1' },
  { id: '6794', name: 'Justin Jefferson', position: 'WR', nflTeam: 'MIN', points: 18.4, state: 'final', roster: '2' },
  { id: '1466', name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', points: 6.8, state: 'final', roster: '1' },
  { id: '6819', name: 'Michael Pittman', position: 'WR', nflTeam: 'IND', points: 8.2, state: 'final', roster: '2' },
];
const model = { season: 2026, week: 5, completed: true, starters: players, games: [{ isMine: true, sides: [
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
html = html.replace('<html lang="en">', '<html lang="en" data-mode="light">');
html = html.replace('<main id="view" class="view" aria-live="polite"></main>', `<main id="view" class="view" data-route="home" data-pulse-system="1"><div id="home-wrap">
  ${homeNewspaperMasthead({ now: new Date('2026-10-06T12:00:00Z') })}
  <section class="home-broadcast">${renderStage(deck, { editorial: true })}</section>
  <div data-home-gameday-slot><section class="gameday-card" data-gameday-card data-motion="off"><header><div><small>GAMEDAY</small><h2>Week 5 · Monday</h2></div><div class="gameday-controls"><span class="home-game-phase">Final</span><button type="button" class="home-section-action" data-gameday-watch aria-label="Watch game day" title="Watch game day"><svg class="ico-sm" aria-hidden="true"><use href="#i-play"></use></svg></button></div></header><div data-gameday-content>${homeGameDayMatchup(model)}${homeThermalBoard(model)}<details class="gameday-home-detail"><summary>Player trackers &amp; score controls</summary><div class="gameday-status"><strong>Final whistle</strong><span>2026 · Week 5</span></div><ul class="gameday-players">${playerRows(players)}</ul></details></div><details class="home-score-tools"><summary>Score controls</summary><div><button type="button" class="linkbtn" data-gameday-motion>Motion off</button><button type="button" class="btn ghost small" data-gameday-refresh>Refresh</button></div></details></section></div>
  <div data-home-lore-slot>${leagueFile}</div>
  ${disclosure('home-league', 'More from the league', 'Weekly forecasts, side games and activity', '<section class="home-week-focus"><header><small>WEEK 5 · YOUR WEEK</small><h2>Your next move</h2></header><p>Review your lineup before the next kickoff.</p><a class="linkbtn" href="#/analyzer">Review lineup</a></section>')}
  <section class="home-banter" aria-label="League banter"><div data-wall-slot><section class="block wall is-preview"><h2 class="section-title">Letters from the league<a class="section-link home-section-action home-wall-link" href="#/wall" aria-label="Open the Wall" title="Open the Wall"><span>The Wall</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></h2><div class="card wall-card"><div class="wall-posts">${wallPosts}</div></div></section></div></section>
  <section class="hero"><img class="hero-crest is-crest" src="icons/crest-512.webp" alt="DFL league crest" width="512" height="341"><p class="hero-creed">Forged by sinners.<br>Fueled by rivalries.<br>Defined by champions.</p><p class="hero-line">10th season · 12 owners</p></section>
  <p class="version-line">DFL HQ v1.305.0 · <button class="linkbtn" id="check-update">Check for updates</button></p>
</div></main>`);
html = html.replace(/(<nav class="tabbar"[^>]*>)[\s\S]*?<\/nav>/, '$1' + primarySeasonNavMarkup() + '</nav>');
html = html.replace('id="whoami-name">…', 'id="whoami-name">Grant');
html = html.replace('<div class="topbar-actions">', '<div class="topbar-actions"><button class="dfl-preview-toggle is-available" data-mode="commissioner" type="button"><span class="dfl-preview-track"><span class="dfl-preview-knob"></span></span><span>Commish</span></button><button class="notification-bell" type="button" aria-label="Notifications"><svg class="ico" aria-hidden="true"><use href="#i-bell-steel"></use></svg></button>');
const previewCss = readFileSync(new URL('../js/member-preview.js', import.meta.url), 'utf8').match(/style.textContent = `([\s\S]*?)`;/)?.[1]?.replace(/\$\{[^}]+\}/g, '500') || '';
html = html.replace('</head>', `<style>${previewCss}</style><link rel="stylesheet" href="css/profile-neutral.css"></head>`);
html = html.replace('</body>', `<div class="bottomline"><span class="bl-item"><b class="bl-label">NFL</b><span class="bl-text">CHI 17 – 27 WAS · Final</span></span><span class="bl-item"><span class="bl-text">DET 24 – 20 MIN · Final</span></span></div>
<script type="module">
  import { wireHomeNewspaperSections } from './js/home-presentation.js';
  import { startStage } from './js/broadcast-stage.js';
  import { mountScoreVfx } from './js/score-vfx.js';
  import { mountSeasonNavigation } from './js/season-nav.js';
  import { reviewTextContrast } from './tools/home-review-contrast.js';
  const deck = ${JSON.stringify(deck)};
  const themes = ${JSON.stringify(reviewThemes)};
  window.reviewSetTheme = name => {
    const theme = themes[name];
    document.documentElement.dataset.mode = theme.mode;
    document.documentElement.dataset.palette = name;
    document.body.dataset.mode = theme.mode;
    document.documentElement.style.colorScheme = theme.mode === 'light' ? 'light' : 'dark';
    for (const [property, value] of Object.entries(theme.values)) document.documentElement.style.setProperty(property, value);
  };
  window.reviewSetTheme('light');
  // Model already loaded reactions without calling the live database.
  document.querySelectorAll('[data-wall-reaction]').forEach(button => button.disabled = false);
  document.querySelectorAll('[data-reaction-status]').forEach(status => status.textContent = '');
  window.reviewTextContrast = reviewTextContrast;
  wireHomeNewspaperSections(document.querySelector('#home-wrap'));
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
