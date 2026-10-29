import {describe,it,expect} from 'vitest';
import {tradeEditSnapshot,restoreTradeEdit,replaceTradePlayer} from './trade-editor.js';
const parties=[{id:'1',playerIds:['a','b','e']},{id:'2',playerIds:['c','f']},{id:'3',playerIds:['d','g']}];
const fixture=()=>({memberIds:['2','3'],sends:[new Set(['a','b']),new Set(['c']),new Set(['d'])],destinations:{a:'2',b:'3',c:'1',d:'2'},filters:{0:'WR'}});
describe('trade editing integrity',()=>{
 it('replaces one player at the same package position without changing anyone else or its recipient',()=>{
  const s=fixture();expect(replaceTradePlayer(parties,s,0,'a','e')).toBe(true);
  expect(s.sends.map(ids=>[...ids])).toEqual([['e','b'],['c'],['d']]);expect(s.destinations).toEqual({e:'2',b:'3',c:'1',d:'2'});expect(s.filters).toEqual({0:'WR'});
 });
 it('keeps an unassigned three-team route unassigned when replacing a player',()=>{
  const s=fixture();s.destinations.a='';replaceTradePlayer(parties,s,0,'a','e');expect(s.destinations.e).toBe('');
 });
 it('cannot select another team’s player, a duplicate or replace an absent selection',()=>{
  const s=fixture(),before=tradeEditSnapshot(parties,s);
  for(const [side,a,b] of [[0,'a','c'],[0,'a','b'],[0,'e','a'],[4,'a','e']])expect(replaceTradePlayer(parties,s,side,a,b)).toBe(false);
  expect(tradeEditSnapshot(parties,s)).toEqual(before);
 });
 it('Undo restores packages and exact three-way destinations after removal or clear',()=>{
  const s=fixture(),saved=tradeEditSnapshot(parties,s);s.sends.forEach(ids=>ids.clear());s.destinations={};
  expect(restoreTradeEdit(parties,s,saved)).toBe(true);expect(tradeEditSnapshot(parties,s)).toEqual(saved);
 });
 it('does not overwrite a draft with Undo from changed participants or changed ownership',()=>{
  const s=fixture(),saved=tradeEditSnapshot(parties,s);s.sends[0].delete('a');const before=tradeEditSnapshot(parties,s);
  expect(restoreTradeEdit([...parties].reverse(),s,saved)).toBe(false);
  expect(restoreTradeEdit([{...parties[0],playerIds:['b','e']},...parties.slice(1)],s,saved)).toBe(false);
  expect(tradeEditSnapshot(parties,s)).toEqual(before);
 });
 it('snapshots do not change when the active draft changes',()=>{
  const s=fixture(),saved=tradeEditSnapshot(parties,s);s.sends[0].delete('a');s.destinations.a='3';expect(saved.sends[0]).toEqual(['a','b']);expect(saved.destinations.a).toBe('2');
 });
 it('Undo rejects duplicate players and packages above the eight-player limit',()=>{
  const s=fixture(),saved=tradeEditSnapshot(parties,s);saved.sends[0].push('a');expect(restoreTradeEdit(parties,s,saved)).toBe(false);
  saved.sends[0]=Array(9).fill('a');expect(restoreTradeEdit(parties,s,saved)).toBe(false);
 });
});
