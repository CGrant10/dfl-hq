import {describe,it,expect} from 'vitest';
import {matchupPlayerPairs,matchupLineupHtml} from './game-day-lineup-comparison.js';
const p=(id,slot,slotIndex,position=slot)=>({id,slot,slotType:slot,slotIndex,position,name:id,roster:'1',points:0,state:'upcoming'});
describe('side-by-side GameDay lineups',()=>{
 it('aligns repeated starting slots by submitted slot order, without ranking by score',()=>{
  const left=[p('rb2','RB',2),p('wr','WR',3),p('qb','QB',0),p('rb1','RB',1)];
  const right=[p('other2','RB',2),p('other1','RB',1)];
  const pairs=matchupPlayerPairs(left,right);
  expect(pairs.map(r=>r.label)).toEqual(['QB','RB 1','RB 2','WR']);
  expect(pairs[1].left.id).toBe('rb1');expect(pairs[1].right.id).toBe('other1');
  expect(pairs[2].left.id).toBe('rb2');expect(pairs[2].right.id).toBe('other2');
 });
 it('pairs FLEX slots even when one starts an RB and the other a WR',()=>{
  const pairs=matchupPlayerPairs([p('rb','FLEX',6,'RB')],[p('wr','FLEX',6,'WR')]);
  expect(pairs).toHaveLength(1);expect(pairs[0]).toMatchObject({label:'FLEX',left:{id:'rb'},right:{id:'wr'}});
 });
 it('retains empty slots and unmatched players without shifting the later positions',()=>{
  const pairs=matchupPlayerPairs([{...p('empty','RB',1),empty:true},p('wr','WR',3)],[p('rb','RB',1),p('rb2','RB',2),p('otherwr','WR',3)]);
  expect(pairs[0].left.empty).toBe(true);expect(pairs[1].left).toBeNull();expect(pairs[2].left.id).toBe('wr');
 });
 it('handles display aliases and missing lineups without fabricating players',()=>{
  expect(matchupPlayerPairs([{id:'k',slot:'Kicker'},{id:'d',slot:'Def'}],[p('k2','K',7),p('d2','DEF',8)]).map(r=>r.label)).toEqual(['K','D/ST']);
  expect(matchupPlayerPairs()).toEqual([]);
 });
 it('preserves real score keys, tap targets, unknown scores, and escaped current names',()=>{
  const game={id:'1',sides:[{roster:'1',name:'The <Bombers>',lineup:[{...p('Allen','QB',0),points:21.6}],bench:[]},{roster:'2',name:'Rivals',lineup:[{...p('Lamar','QB',0),roster:'2',points:null}],bench:[]}]};
  const html=matchupLineupHtml(game);
  expect(html).toContain('The &lt;Bombers&gt;');expect(html).toContain('21.60');expect(html).toContain('>—</span>');
  expect(html).toContain('data-gameday-score-key="2:Lamar"');expect(html).toContain('data-player-roster="2"');
  expect(html).not.toContain('data-watch-bench');
 });
 it('keeps bench players separate from starters and collapsible',()=>{
  const game={id:'1',sides:[{roster:'1',name:'A',lineup:[p('starter','QB',0)],bench:[p('reserve','Bench',1,'RB')]},{roster:'2',name:'B',lineup:[],bench:[]}]};
  const html=matchupLineupHtml(game);
  expect(html.indexOf('data-gameday-player="reserve"')).toBeGreaterThan(html.indexOf('<details'));
  expect(html).toContain('data-watch-bench="1"');expect(html).toContain('Lineup unavailable');
 });
});
