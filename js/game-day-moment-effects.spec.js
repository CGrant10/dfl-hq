import { describe, it, expect } from 'vitest';
import { playerScoreMoment,primaryScoreMoment } from './game-day-moment-effects.js';

describe('GameDay moment triggers', () => {
  it('highlights a verified six-point jump without claiming a touchdown', () => {
    expect(playerScoreMoment(8, 14)).toEqual({ kind: 'surge', label: 'Score surge' });
    expect(playerScoreMoment(8, 13.99)).toBeNull();
  });
  it('selects only the highest newly crossed performance milestone', () => {
    expect(playerScoreMoment(19.8, 20.1)).toEqual({ kind: 'milestone', points: 20, label: '20-point game' });
    expect(playerScoreMoment(19, 35)?.points).toBe(30);
    expect(playerScoreMoment(29, 42)?.points).toBe(40);
  });
  it('does not repeat a milestone on unchanged or slightly higher scores', () => {
    expect(playerScoreMoment(20, 20)).toBeNull();
    expect(playerScoreMoment(30.1, 30.5)).toBeNull();
    expect(playerScoreMoment(40, 41)).toBeNull();
  });
  it('does not celebrate a correction or invent a baseline on the first load', () => {
    for (const before of [null, undefined, '', NaN, Infinity, 'pending']) {
      expect(playerScoreMoment(before, 30)).toBeNull();
    }
    expect(playerScoreMoment(30, 19)).toBeNull();
    expect(playerScoreMoment(10, null)).toBeNull();
  });
});

it('prioritizes the biggest milestone, then the biggest verified surge',()=>{const surge={moment:{kind:'surge'},delta:15},twenty={moment:{kind:'milestone',points:20},delta:8},thirty={moment:{kind:'milestone',points:30},delta:1};expect(primaryScoreMoment([surge,twenty,thirty])).toBe(thirty);expect(primaryScoreMoment([{moment:{kind:'surge'},delta:6},surge])).toBe(surge);expect(primaryScoreMoment([])).toBeNull()});
