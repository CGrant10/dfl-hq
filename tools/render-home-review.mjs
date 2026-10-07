// Browser review fixture: the production renderers with the selected mock's
// sample scores. It lives outside the app and never writes to league data.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildLeaguePowerRankings } from '../js/league-trajectory.js';
import { homeBroadcastDeck, homeThermalBoard, homeGameDayMatchup, homeLeagueFile, homeLeagueTools, homeNewspaperMasthead } from '../js/home-presentation.js';
import { renderStage } from '../js/broadcast-stage.js';
import { homeRivalryStory } from '../js/home-clubhouse.js';
import { primarySeasonNavMarkup } from '../js/season-nav.js';
import { matchupPreviewSlide, tradeAlertSlide, nextMoveSlide } from '../js/home-slides.js';
import { disclosure } from '../js/page-disclosure.js';
import { MEDICINE_GROUND, teamPalette } from '../js/team-theme.js';
import { activityLine } from '../js/activity.js';
import { playerIdentity } from '../js/player-presentation.js';
import { playerLiveState } from '../js/live-score.js';
import { teamPortrait } from '../js/team-presentation.js';
import { HOME_OUTLOOK_POSITIONS } from '../js/home-week-outlook.js';
import { pickemState } from '../js/pickem-state.js';
import { esc, money, fmtShort } from '../js/ui.js';
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
  {id: 2, member_id: 'u2', created_at: '2026-10-05T12:00:00Z', body: 'Same story every year. Mike’s lucky. A full weekend of football, a last-minute lineup change, and somehow it still comes down to a fraction of a point. Save the screenshots. We’re going to need those receipts when the rematch rolls around.', reply_count: 1, image:'assets/dfl-daily-rivalry.webp', image_fit:'cover', image_zoom:2, image_position_x:0, image_position_y:0, members: {display_name:'League Vet',profile_title:'Keeper of the receipts',featured_achievement:'A decade of rivalry wins'}},
  {id: 3, member_id: 'u3', created_at: '2026-10-04T12:00:00Z', body: 'Decimal mafia never sleeps.', reply_count: 0, image:'images/share/editorial-paper.webp', members: {display_name:'The Analyst'}},
].map(row => reviewWallPost(row, true)).join('');

// Include the real expanded Home sections, without booting database modules.
const homeSource = readFileSync(new URL('../js/pages/home.js', import.meta.url), 'utf8');
const rankMarkup = homeSource.slice(homeSource.indexOf('function rankMove('), homeSource.indexOf('function wireHomeRankings(')).replaceAll('export ', '');
const weeklyMarkup = homeSource.slice(homeSource.indexOf('function outlookPlayerRow('), homeSource.indexOf('function wireHomeWeekHub(')).replaceAll('export ', '');
const tradeMarkup = homeSource.slice(homeSource.indexOf('function tradePackageLine('), homeSource.indexOf('async function weekAheadSlide(')).replaceAll('export ', '');
const feedMarkup = homeSource.slice(homeSource.indexOf('function snapshot('), homeSource.indexOf('function wireHomeLeagueFeed('));
const renderHomeReview = Function('esc', 'money', 'fmtShort', 'teamPortrait', 'playerIdentity', 'playerLiveState', 'HOME_OUTLOOK_POSITIONS', 'activityLine', 'visible', 'hiddenClass', 'editControls', 'addControl', 'adminRow', `${rankMarkup}\n${weeklyMarkup}\n${tradeMarkup}\n${feedMarkup}\nreturn {homeRankingsCard,homeWeeklyDigest,homeWeeklyFocus,homeTradeWire,homeLeagueFeed,snapshot};`)(esc, money, fmtShort, teamPortrait, playerIdentity, playerLiveState, HOME_OUTLOOK_POSITIONS, activityLine, (_table, rows) => rows, () => '', () => '', () => '', () => '');
const pickemSource = readFileSync(new URL('../js/sportsbook-pickem.js', import.meta.url), 'utf8');
const homePickem = Function('pickemState', 'fmt', `${pickemSource.slice(pickemSource.indexOf('export function homePickemMarkup(')).replace('export ', '')}\nreturn homePickemMarkup;`)(pickemState, value => new Date(value).toLocaleDateString('en-US'));
const homeReviewWiring = homeSource.slice(homeSource.indexOf('function wireHomeRankings('), homeSource.indexOf('function outlookPlayerRow('))
  + homeSource.slice(homeSource.indexOf('function wireHomeWeekHub('), homeSource.indexOf('export function leave('))
  + homeSource.slice(homeSource.indexOf('function wireHomeLeagueFeed('), homeSource.indexOf('function identity('));
const forecastPlayer = {id:'7564',name:'Ja’Marr Chase',position:'WR',nflTeam:'CIN',ownerName:'Grant',points:24.6,scoreSource:'actual',complete:true,opponent:'BAL'};
const outlook = {week:5,predictions:[{winner:{name:'Grant',projection:124.8},loser:{name:'Mike',projection:118.2},margin:6.6,confidence:'LEAN',isMine:true}],leaders:Object.fromEntries(HOME_OUTLOOK_POSITIONS.map(position => [position,[{...forecastPlayer,position}]])),startSit:{teamName:'Grant',lineupIsSet:true,swaps:[{start:{...forecastPlayer,scoreSource:'projected',complete:false,gameStatus:'upcoming',points:18.4,nflTeam:'MIN',opponent:'DET',name:'Justin Jefferson'},sit:{...forecastPlayer,scoreSource:'projected',complete:false,gameStatus:'upcoming',points:14.2,nflTeam:'IND',opponent:'TEN',name:'Michael Pittman'},gain:4.2},{start:{...forecastPlayer,scoreSource:'projected',complete:false,gameStatus:'upcoming',points:17.8,position:'TE',nflTeam:'KC',opponent:'DEN',name:'Travis Kelce'},sit:{...forecastPlayer,scoreSource:'projected',complete:false,gameStatus:'upcoming',points:15.4,position:'TE',nflTeam:'BAL',opponent:'CIN',name:'Mark Andrews'},gain:2.4}],alarms:[{player:{name:'Questionable starter'},reason:'Check injury status before kickoff.'}]}};
const briefing = {title:'Weekly briefing',headline:'Every point counts this week.',matchup:'Grant faces Mike in the rematch.',playoff:'Win to hold your spot',playoffDetail:'The middle of the table is getting crowded.',lineup:'Keep your starters ready for kickoff.',action:'Check the injury report before locking your lineup.'};
const rankingTeams = ['Grant','Jack-HAMMER','Mike','Klutch Sports Group'].map((team_name,i)=>({id:String(i+1),roster_id:i+1,sleeper_user_id:`fixture${i+1}`,team_name,identity:{display_name:team_name},rank:i+1,lineup:{weeklyPoints:100}}));
const rankingGames = [[1,3,150,100,2,4,80,70],[1,2,120,130,3,4,100,90],[1,4,180,90,2,3,80,70],[1,3,145.38,101.08,2,4,139.2,121.12]].flatMap((r,i)=>[0,4].map(n=>({season:2026,week:i+1,roster1:r[n],score1:r[n+2],roster2:r[n+1],score2:r[n+3]})));
const rankings = {weeks:14,focus:{id:'1'},allTeams:rankingTeams,powerRankings:buildLeaguePowerRankings({teams:rankingTeams,matchups:rankingGames,currentWeek:5})};
const weeklyHome = `<div data-home-report-slot>${renderHomeReview.homeWeeklyDigest(outlook,briefing,{title:'A finish for the archive',season:2026,week:4,highlights:[{title:'Closest game',detail:'A fraction of a point separated the league.'}]},[{impact:'up',name:'Ja’Marr Chase',detail:'Ready for kickoff'}])}</div>`;
const pickemHome = `<div data-home-pickem-slot>${homePickem({available:true,week:5,locksAt:'2099-10-10T16:00:00Z',games:[{provider_event_id:'1'}]},esc)}</div>`;
const expandedHome = `  ${renderHomeReview.snapshot({leagues:[],members:[{display_name:'Grant'},{display_name:'Mike'}],standings:[],dues:[{season:2026,amount_due:100,amount_paid:80}],polls:[]})}
  <div data-home-trade-slot>${renderHomeReview.homeTradeWire([{week:5,href:'#/trade?id=7',teams:[{teamName:'Dream Enders'},{teamName:'Klutch Sports Group'}],packages:[{teamName:'Dream Enders',players:[{name:'Justin Jefferson'}]},{teamName:'Klutch Sports Group',players:[{name:'Travis Kelce'}]}],outcome:{grade:'Close call',tone:'close',closeness:64,detail:'Both teams fill a need heading into the next kickoff.'}}])}</div>
  <div data-home-feed-slot>${renderHomeReview.homeLeagueFeed([{title:'Anniversary golf weekend',content:'The next chapter starts on the first tee. Watch the calendar for the league schedule.',created_at:'2026-10-05T12:00:00Z'}],[{display_name:'Grant',member_id:'u1',action:'insert',entity:'wall post',label:'Wall post',last_at:'2026-10-06T12:00:00Z'}])}</div>`;

const players = [
  { id: '7564', name: 'Ja’Marr Chase', position: 'WR', nflTeam: 'CIN', points: 24.6, state: 'final', roster: '1' },
  { id: '6794', name: 'Justin Jefferson', position: 'WR', nflTeam: 'MIN', points: 18.4, state: 'final', roster: '2' },
  { id: '1466', name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', points: 6.8, state: 'final', roster: '1' },
  { id: '6819', name: 'Michael Pittman', position: 'WR', nflTeam: 'IND', points: 0, state: 'final', roster: '2' },
];
const model = { season: 2026, week: 5, completed: true, starters: players, games: [{ isMine: true, sides: [
  { roster: '1', name: 'Grant', record: '3 – 1', score: 124.8, identity: { display_name: 'Klutch Sports Group' } },
  { roster: '2', name: 'Mike', record: '2 – 2', score: 118.2, identity: { display_name: 'The Bayou Bombers' } },
] }] };
const rivalry = homeRivalryStory({ uid: 'u1', members: [{ sleeper_user_id: 'u2', display_name: 'Mike' }], lore: { matchups: [
  { user1: 'u1', user2: 'u2', score1: 120.5, score2: 109.3, season: 2024, week: 5 },
  { user1: 'u2', user2: 'u1', score1: 126.2, score2: 111.8, season: 2025, week: 5 },
] } });
const leagueFile = homeLeagueFile({ rivalry, fact: { kind:'nailbiter', headline: 'The smallest margin still gets the win.', detail: 'Archive stories rotate here from the DFL matchup records.' }, facts:[{kind:'title',headline:'Jack-HAMMER’s championship season.',detail:'A title remembered in the league record book.'},{kind:'high',headline:'The week the scoreboard caught fire.',detail:'A record score from the DFL archive.'},{kind:'nailbiter',headline:'Another close call.',detail:'A finish separated by a fraction of a point.'}] });
const deck = homeBroadcastDeck([
  { id: 'fixture:news', treatment: 'announcement', kicker: 'League news', headline: 'The league gets the last word.', subtitle: 'The weekly recap is here.', body: 'Weekly awards, matchup conversations and the stories everyone will be talking about.', href: '#/clubhouse', temporal: 'recent' },
  { id: 'fixture:champion', treatment: 'champion', kicker: '2025 · League champion', headline: 'Klutch Sports Group', subtitle: 'The defending champion returns for the anniversary season.', temporal: 'historical' },
  { id: 'fixture:chip', treatment: 'champion', variant: 'chip', kicker: '2025 · Chip Eater', headline: 'Dream Enders', subtitle: 'Last place. One very hot chip.', temporal: 'historical', href: '#/history' },
  { id: 'fixture:champion-art', treatment: 'champion', kicker: '2024 · League champion', headline: 'Jack-HAMMER', subtitle: 'A season to remember.', image: 'assets/dfl-daily-champion.webp', background: 'image', imageFit: 'contain', imageX: 50, imageY: 100, imageZoom: 1, temporal: 'historical', href: '#/history' },
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
  <div class="home-frontpage">
  <section class="home-broadcast">${renderStage(deck, { editorial: true })}</section>
  <div data-home-gameday-slot><section class="gameday-card" data-gameday-card data-motion="off"><header><div><small>Game day</small><h2>Week 5 · Monday</h2></div><div class="gameday-controls"><span class="home-game-phase">Final</span><button type="button" class="home-section-action" data-gameday-watch aria-label="Watch game day" title="Watch game day"><svg class="ico-sm" aria-hidden="true"><use href="#i-play"></use></svg></button></div></header><div data-gameday-content>${homeGameDayMatchup(model)}${homeThermalBoard(model)}<details class="gameday-home-detail"><summary>Player trackers &amp; score controls</summary><div class="gameday-status"><strong>Final whistle</strong><span>2026 · Week 5</span></div><ul class="gameday-players">${playerRows(players)}</ul></details></div><details class="home-score-tools"><summary>Score controls</summary><div><button type="button" class="linkbtn" data-gameday-motion>Motion off</button><button type="button" class="btn ghost small" data-gameday-refresh>Refresh</button></div></details></section></div>
  </div>
  <section class="home-week-desk" aria-label="Your week">
    <div data-home-focus-slot>${renderHomeReview.homeWeeklyFocus(outlook,briefing)}</div>
    ${pickemHome}
    ${homeLeagueTools()}
    ${disclosure('home-week','Plan your week','Projections, player outlook and Start / Sit',weeklyHome)}
  </section>
  <section class="home-league-desk" aria-label="Around the league">
    <div data-home-rankings-slot>${renderHomeReview.homeRankingsCard(rankings)}</div>
    <section class="home-weekly-clubhouse card"><div><small>LEAGUE NEWS</small><h2>Anniversary golf weekend</h2><p>The next chapter starts on the first tee.</p></div><button type="button" class="linkbtn home-text-action" data-open-home-news><span>Read league news</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></button></section>
    ${disclosure('home-league','More from the league','News, trades and league updates',expandedHome)}
  </section>
  <div data-home-lore-slot>${leagueFile}</div>
  <section class="home-banter" aria-label="League banter"><div data-wall-slot><section class="block wall is-preview"><h2 class="section-title">League talk<a class="section-link home-section-action home-wall-link" href="#/wall" aria-label="Open the Wall" title="Open the Wall"><span>The Wall</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></h2><div class="card wall-card"><div class="wall-posts">${wallPosts}</div></div></section></div></section>
  <section class="hero"><img class="hero-crest is-crest" src="icons/crest-512.webp" alt="DFL league crest" width="512" height="341"><p class="hero-creed">Forged by sinners.<br>Fueled by rivalries.<br>Defined by champions.</p><p class="hero-line">10th season · 12 owners</p></section>
  <p class="version-line">DFL HQ v1.324.0 · <button class="linkbtn" id="check-update">Check for updates</button></p>
</div></main>`);
html = html.replace(/(<nav class="tabbar"[^>]*>)[\s\S]*?<\/nav>/, '$1' + primarySeasonNavMarkup() + '</nav>');
html = html.replace('id="whoami-name">…', 'id="whoami-name">Grant');
html = html.replace('<div class="topbar-actions">', '<div class="topbar-actions"><button class="dfl-preview-toggle is-available" data-mode="commissioner" type="button"><span class="dfl-preview-track"><span class="dfl-preview-knob"></span></span><span>Commish</span></button><button class="notification-bell" type="button" aria-label="Notifications"><svg class="ico" aria-hidden="true"><use href="#i-bell-steel"></use></svg><span id="notification-count" class="notification-count">99+</span></button>');
const previewCss = readFileSync(new URL('../js/member-preview.js', import.meta.url), 'utf8').match(/style.textContent = `([\s\S]*?)`;/)?.[1]?.replace(/\$\{[^}]+\}/g, '500') || '';
html = html.replace('</head>', `<style>${previewCss}</style><link rel="stylesheet" href="css/profile-neutral.css"><link rel="stylesheet" href="css/sportsbook.css"><link rel="stylesheet" href="css/team-analyzer.css"></head>`);
// Compare the actual page header templates; fixture bankroll is only review data.
const sportsbookHeader = readFileSync(new URL('../js/pages/sportsbook.js',import.meta.url),'utf8').match(/<header class="sb-masthead page-identity">[\s\S]*?<\/header>/)[0].replace('${esc(sportsbookWeekCaption(leagueWeek))}','Week 5').replace('${num(wallet?.balance)}','100');
const tradeHeader = readFileSync(new URL('../js/pages/trade.js',import.meta.url),'utf8').match(/<div class="tb-head-row page-identity">[\s\S]*?<\/div>/)[0];
html = html.replace('</body>', `<script type="module">
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
  window.reviewEmptyWeek = ${JSON.stringify({focus:renderHomeReview.homeWeeklyFocus(null),forecast:renderHomeReview.homeWeeklyDigest(null)})};
  ${homeReviewWiring}
  wireHomeRankings(document.querySelector('#home-wrap'));
  wireHomeWeekHub(document.querySelector('#home-wrap'));
  wireHomeLeagueFeed(document.querySelector('#home-wrap'));
  wireHomeNewspaperSections(document.querySelector('#home-wrap'));
  window.reviewDeck = deck;
  window.reviewHeaderSources = ${JSON.stringify({sportsbook:sportsbookHeader,trade:tradeHeader})};
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
