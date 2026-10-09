import { describe, expect, it } from 'vitest';
import { gameDayOpeningWeek, gameDayWeekStarted } from './game-day-disclosure.js';

const kickoff = Date.parse('2026-10-09T00:15:00Z');
const nfl = (...events) => ({ payload: { events } });
const game = (date, state = 'pre') => ({ date, status: { type: { state } } });

describe('GameDay weekly opening', () => {
  it('opens at the first kickoff, independently of the user’s players or timezone', () => {
    const schedule = nfl(game('2026-10-11T17:00:00Z'), game('2026-10-08T20:15:00-04:00'));
    expect(gameDayWeekStarted(schedule, { now: kickoff - 1 })).toBe(false);
    expect(gameDayWeekStarted(schedule, { now: kickoff })).toBe(true);
  });
  it('uses confirmed live status even when the listed kickoff is delayed or missing', () => {
    expect(gameDayWeekStarted(nfl(game(null, 'in')), { now: kickoff - 1 })).toBe(true);
    expect(gameDayWeekStarted(nfl({ status: { type: { completed: true } } }))).toBe(true);
  });
  it('stays open by default between Thursday and Sunday games and after the final', () => {
    const schedule = nfl(game('2026-10-09T00:15:00Z', 'post'), game('2026-10-11T17:00:00Z'));
    expect(gameDayWeekStarted(schedule, { now: Date.parse('2026-10-10T12:00:00Z') })).toBe(true);
    expect(gameDayWeekStarted(null, { completed: true })).toBe(true);
  });
  it('does not invent a kickoff from an empty or invalid schedule', () => {
    for (const schedule of [null, nfl(), nfl(game('bad', 'unknown')), { payload: { events: {} } }]) {
      expect(gameDayWeekStarted(schedule)).toBeNull();
    }
    expect(gameDayWeekStarted(nfl(game('bad', 'pre')))).toBe(false);
  });
  it('uses the active NFL week when the synced score slate is an earlier week', () => {
    const saved = { season: 2026, week: 5 };
    expect(gameDayOpeningWeek(saved, { season: 2026, currentWeek: 6 })).toBe(6);
    expect(gameDayOpeningWeek(saved, { season: 2026, currentWeek: '6' })).toBe(6);
    for (const state of [null, { season: 2025, currentWeek: 6 }, { season: 2026, currentWeek: 4 },
      { season: 2026, currentWeek: 19 }, { season: 2026, currentWeek: 5.5 }]) {
      expect(gameDayOpeningWeek(saved, state)).toBe(5);
    }
  });
});
