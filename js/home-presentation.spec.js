import { describe, it, expect } from 'vitest';
import { homeBroadcastDeck, homeThermalLeaders, homeThermalBoard, homeGameDayMatchup, homeLeagueFile } from './home-presentation.js';
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
    expect(html).toContain('Grant');
    expect(html).toContain('https://example.com/grant.webp');
    expect(html).not.toContain('data-score-temperature="hot"');
    expect(homeGameDayMatchup({ games: [] })).toBe('');
  });
});

describe('DFL archive on Home', () => {
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
