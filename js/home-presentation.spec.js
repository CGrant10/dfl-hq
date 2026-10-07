import { describe, it, expect } from 'vitest';
import { homeBroadcastDeck, homeThermalLeaders, homeThermalBoard, homeGameDayMatchup, homeGameDayPhase, homeLeagueFile } from './home-presentation.js';
import { playerScoreTemperature } from './score-temperature.js';
import { leaguePlayers } from './game-day-league.js';

const player = (id, points, state = 'final', position = 'WR', afterHalftime = false) =>
  ({ id, roster: '1', name: `Player ${id}`, points, state, position, afterHalftime });

describe('selected Home presentation', () => {
  it('keeps the original broadcast slides through refresh without duplicating the opener', () => {
    const original = [{ key: 'manual', headline: 'Commissioner update' }, { key: 'slate' }];
    const deck = homeBroadcastDeck(original, { week: 5, now: new Date('2026-10-05T12:00:00Z') });
    expect(deck.slice(1)).toEqual(original);
    expect(deck[0].kicker).toContain('Week 5');
    expect(homeBroadcastDeck(deck)).toHaveLength(3);
  });
  it('uses strict boundaries and delays cold until halftime while keeping zero honest', () => {
    const starters = [player('hot', 15.01, 'live'), player('15', 15), player('10', 10),
      player('early', 0, 'live'), player('unknown', null), player('cold', 9.99, 'live', 'TE', true), player('zero', 0)];
    expect(homeThermalLeaders({ starters }).map(p => p.id)).toEqual(['hot', 'zero', 'cold']);
  });
  it('excludes every defense alias from the preview and hot/cold filters', () => {
    const defenses = ['DEF', 'DST', 'D/ST', 'Defense'].map((position, i) => player(`def${i}`, i ? 1 : 40, 'final', position));
    const offense = [player('hot', 24), player('cold', 6)];
    expect(homeThermalLeaders({ starters: [...defenses, ...offense] })).toEqual(offense);
    for (const p of defenses) expect(playerScoreTemperature(p)).toBe('neutral');
    const model = { games: [{ sides: [{ lineup: [...defenses, ...offense], bench: [] }] }] };
    expect(leaguePlayers(model, { filter: 'hot' }).map(p => p.id)).toEqual(['hot']);
    expect(leaguePlayers(model, { filter: 'cold' }).map(p => p.id)).toEqual(['cold']);
  });
  it('deduplicates starters and shows both temperatures without inventing entries', () => {
    const starters = [player('h1', 31), player('h2', 24), player('h3', 17), player('c1', 6), player('c2', 8), player('c3', 9)];
    expect(homeThermalLeaders({ starters: [...starters, starters[0]] }).map(p => p.id)).toEqual(['h1', 'h2', 'c1', 'c2']);
    expect(homeThermalLeaders({ starters: starters.slice(0, 3) })).toHaveLength(3);
    expect(homeThermalLeaders({ starters: [] })).toEqual([]);
  });
  it('renders accessible player links and actual two-decimal score emitters', () => {
    const html = homeThermalBoard({ starters: [player('hot', 24.6), player('cold', 6.8)] });
    expect(html).toContain('24.60');
    expect(html).toContain('6.80');
    expect(html).toContain('data-score-temperature="hot"');
    expect(html).toContain('data-score-temperature="cold"');
    expect(html).toContain('data-gameday-player="hot"');
    expect(html).toContain('data-player-final');
    expect(homeThermalBoard({ starters: [] })).toContain('No hot or cold starters yet.');
  });
  it('labels finished hot and cold players consistently, including zero', () => {
    const html = homeThermalBoard({completed:true,starters:[player('hot',24.6),player('zero',0),player('live',18.4,'live')]});
    expect((html.match(/data-player-final/g)||[])).toHaveLength(2);
    expect(html).toContain('data-player-phase="hot" data-player-final>Final');
    expect(html).toContain('data-player-phase="zero" data-player-final>Final');
    expect(html).toContain('data-player-phase="live">Live');
  });
  it('keeps team totals neutral and preserves real custom team photos', () => {
    const html = homeGameDayMatchup({ season: 2026, week: 5, games: [{ isMine: true, sides: [
      { roster: '1', name: 'Team', score: 124.8, identity: { display_name: 'Grant', profile_image: 'https://example.com/grant.webp' } },
      { roster: '2', name: 'Opponent', score: 118.2, identity: { display_name: 'Mike' } },
    ] }] });
    expect(html).toContain('124.80');
    expect(html).toContain('<strong>Team</strong>');
    expect(html).toContain('https://example.com/grant.webp');
    expect(html).not.toContain('data-score-temperature="hot"');
    expect(homeGameDayMatchup({ games: [] })).toBe('');
  });
  it('uses this matchup’s status even when other NFL games are live', () => {
    const upcoming = { known: true, live: 0, starters: [{ state: 'upcoming' }] };
    const model = { live: true, games: [{ isMine: true, sides: [upcoming, upcoming] }] };
    expect(homeGameDayPhase(model)).toEqual({ key: 'upcoming', label: 'Upcoming' });
    expect(homeGameDayPhase({ ...model, completed: true })).toEqual({ key: 'final', label: 'Final' });
    expect(homeGameDayPhase({ ...model, games: [{ isMine: true, sides: [upcoming, { live: 1, starters: [] }] }] }).key).toBe('live');
    expect(homeGameDayPhase({ ...model, games: [{ isMine: true, sides: [{}, {}] }] }).key).toBe('unknown');
  });
  it('labels actual points and keeps zero distinct from a missing score or status', () => {
    const model = { season: 2026, week: 5, games: [{ isMine: true, sides: [
      { roster: '1', name: 'Zero team', score: 0, remaining: 3, live: 1 },
      { roster: '2', name: 'Pending team', score: null, remaining: null },
    ] }] };
    const html = homeGameDayMatchup(model);
    expect(html).toContain('Actual scores');
    expect(html).toContain('0.00');
    expect(html).toContain('3 left · 1 playing');
    expect(html).toContain('Player status pending');
    expect(homeGameDayMatchup({ ...model, completed: true })).toContain('Final scores');
  });
  it('shows submitted-lineup projections only for the matching upcoming week', () => {
    const side = uid => ({uid,name:`Team ${uid}`,known:true,live:0,score:0,starters:[{state:'upcoming'}]});
    const model = {season:2026,week:5,games:[{isMine:true,sides:[side('a'),side('b')]}]};
    const weekly = {season:2026,week:5,teams:[{sleeper_user_id:'a',projection:124.8,lineupIsSet:true},{sleeper_user_id:'b',projection:118.2,lineupIsSet:true}]};
    expect(homeGameDayMatchup(model,weekly)).toContain('Projected scores');
    expect(homeGameDayMatchup(model,weekly)).toContain('124.8');
    expect(homeGameDayMatchup(model,weekly)).not.toContain('data-gameday-total-key');
    expect(homeGameDayMatchup(model,weekly)).toContain('Ready for kickoff');
    for(const stale of [{...weekly,week:4},{...weekly,season:2025},{...weekly,teams:weekly.teams.slice(0,1)}])expect(homeGameDayMatchup(model,stale)).toContain('Actual scores');
    weekly.teams[0].lineupIsSet=false;
    expect(homeGameDayMatchup(model,weekly)).toContain('Actual scores');
  });
  it('never replaces live or final scores with a forecast', () => {
    const sides = ['a','b'].map(uid=>({uid,name:`Team ${uid}`,known:true,live:1,score:31.25,starters:[{state:'live'}]}));
    const model = {season:2026,week:5,games:[{isMine:true,sides}]};
    const weekly = {season:2026,week:5,teams:sides.map(team=>({sleeper_user_id:team.uid,projection:100,lineupIsSet:true}))};
    expect(homeGameDayMatchup(model,weekly)).toContain('Actual scores');
    expect(homeGameDayMatchup(model,weekly)).toContain('31.25');
    expect(homeGameDayMatchup({...model,completed:true},weekly)).toContain('Final scores');
    sides.forEach(team=>{team.known=false;team.live=0;team.starters=[{state:'unknown'}]});
    expect(homeGameDayMatchup(model,weekly)).toContain('Actual scores');
  });
  it('keeps the full custom team name ahead of the owner name', () => {
    const html=homeGameDayMatchup({games:[{isMine:true,sides:[{name:'Fallback name',score:0,identity:{display_name:'Owner',team_name:'The Bayou Bombers <script>'}}]}]});
    expect(html).toContain('The Bayou Bombers &lt;script&gt;');
    expect(html).not.toContain('<strong>Owner</strong>');
  });
  it('makes the current matchup reachable with an honest personal lead and actual-total feedback',()=>{
    const html=homeGameDayMatchup({season:2026,week:5,memberId:2,games:[{isMine:true,sides:[{roster:'1',name:'The Boys',memberId:1,score:100,live:1},{roster:'2',name:'The Rivals',memberId:2,score:94,live:0}]}]});
    expect(html).toContain('You trail by 6.00');expect(html).toContain('Matchup details');expect(html).toContain('#/clubhouse?season=2026&week=5&tab=matchups');expect(html).toContain('data-gameday-total-key="2"');
  });
});

describe('DFL archive on Home', () => {
  it('adds distinct sourced stories and leaves sparse history honest', () => {
    const fact = { id: 'high&record', kind: 'high', headline: 'A record week.', detail: 'A real league score.' };
    const facts = [fact, { kind: 'high', headline: 'Another record.', detail: 'A second real score.' }, { kind: 'title', headline: 'The title season.', detail: 'A league champion.' }, { kind: 'nailbiter', headline: 'A close call.', detail: 'A recorded final.' }];
    const html = homeLeagueFile({ fact, facts });
    expect(html.match(/class="home-league-story"/g)).toHaveLength(4);
    expect(html.match(/A record week\./g)).toHaveLength(1);
    expect(html).toContain('The title season.');
    expect(html).toContain('A close call.');
    expect(html).toContain('href="#/facts?fact=high%26record"');
    expect(homeLeagueFile({ fact, facts: [fact] }).match(/class="home-league-story"/g)).toHaveLength(1);
  });
  it('offers history without inventing a rivalry when records are missing', () => {
    const html = homeLeagueFile();
    expect(html).toContain('href="#/history"');
    expect(html).not.toContain('RIVALRY FILE');
  });
  it('preserves sourced facts and rivalry receipts and escapes member content', () => {
    const html = homeLeagueFile({ fact: { headline: '<img src=x>', detail: '2019 · Decided by 0.02 points' }, rivalry: { label: 'RIVALRY FILE', headline: 'Mike has your number.', detail: '1-2 all time', href: '#/facts' } });
    expect(html).toContain('&lt;img src=x&gt;');
    expect(html).not.toContain('<img src=x>');
    expect(html).toContain('2019 · Decided by 0.02 points');
    expect(html).toContain('1-2 all time');
    expect(html).not.toContain('<details');
  });
});
