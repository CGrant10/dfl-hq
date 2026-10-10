import { describe, expect, it } from 'vitest';
import { filterTradePlayers } from './trade-player-picker.js';
const rows = [
  { player:{ id:'1', name:'Amon-Ra St. Brown', position:'WR', nflTeam:'DET' }, owner:'The Bayou Bombers' },
  { player:{ id:'2', name:'Josh Allen', position:'QB', nflTeam:'BUF' }, owner:'Klutch Sports' },
  { player:{ id:'3', name:'Ja’Marr Chase', position:'WR', nflTeam:'CIN' }, owner:'The Bayou Bombers' },
  { player:{ id:'4', name:'José Test', position:'RB', nflTeam:'DET' }, owner:'Other team' },
];
describe('trade roster search', () => {
  it('matches names despite punctuation and accents', () => {
    expect(filterTradePlayers(rows,'amon ra st brown')).toEqual([rows[0]]);
    expect(filterTradePlayers(rows,'ja marr')).toEqual([rows[2]]);
    expect(filterTradePlayers(rows,'jose')).toEqual([rows[3]]);
  });
  it('combines owner, NFL team and position without leaking another position', () => {
    expect(filterTradePlayers(rows,'bayou det','WR')).toEqual([rows[0]]);
    expect(filterTradePlayers(rows,'det','QB')).toEqual([]);
    expect(filterTradePlayers(rows,'','QB')).toEqual([rows[1]]);
  });
  it('keeps available-player order and handles no results', () => {
    expect(filterTradePlayers(rows,'  ')).toEqual(rows);
    expect(filterTradePlayers([], 'Allen')).toEqual([]);
    expect(filterTradePlayers(rows,'unknown')).toEqual([]);
  });
});
