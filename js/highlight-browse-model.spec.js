import {describe,it,expect} from 'vitest';
import {highlightPlayerOptions,browseHighlightClips} from './highlight-browse-model.js';
const clips=[{id:'1',game_id:'401',headline:'Chris Olave hauls in a 34-yard touchdown',game_label:'NO · PIT',kind:'touchdown'},{id:'2',game_id:'401',headline:'Tyler Shough finds Chris Olave for 49 yards',game_label:'NO · PIT',kind:'big-play'},{id:'3',game_id:'402',headline:'DK Metcalf makes a diving catch',game_label:'PIT · BUF',kind:'big-play'}];
const roster=[{id:'a',name:'Chris Olave',nflTeam:'NO',position:'WR'},{id:'b',name:'Tyler Shough',nflTeam:'NO',position:'QB'},{id:'c',name:'DK Metcalf',nflTeam:'PIT',position:'WR'}];
describe('player-first highlight browser',()=>{
 it('shows alphabetized players with accurate counts and shared-play membership',()=>{
  expect(highlightPlayerOptions(clips,roster).map(p=>[p.name,p.count,p.clipIds])).toEqual([['Chris Olave',2,['1','2']],['DK Metcalf',1,['3']],['Tyler Shough',1,['2']]]);
 });
 it('does not duplicate roster entries or attribute an NFL teammate’s plays to a player',()=>{
  expect(highlightPlayerOptions(clips,[...roster,roster[0],{...roster[0],id:'x',nflTeam:'NYJ'},{...roster[0],id:'z',empty:true}])).toHaveLength(3);
 });
 it('filters by a player without reversing the queue',()=>{
  const players=highlightPlayerOptions(clips,roster);expect(browseHighlightClips(clips,{players,player:'a'}).map(c=>c.id)).toEqual(['1','2']);
 });
 it('searches names, plays and NFL games case-insensitively, with touchdown shorthand',()=>{
  expect(browseHighlightClips(clips,{query:'OLAVE td'}).map(c=>c.id)).toEqual(['1']);
  expect(browseHighlightClips(clips,{query:'pit diving'}).map(c=>c.id)).toEqual(['3']);
  expect(browseHighlightClips(clips,{query:'Nobody Here'})).toEqual([]);
 });
 it('combines player selection and text without leaking other players’ clips',()=>{
  const players=highlightPlayerOptions(clips,roster);expect(browseHighlightClips(clips,{players,player:'a',query:'49'}).map(c=>c.id)).toEqual(['2']);
  expect(browseHighlightClips(clips,{players,player:'a',query:'Metcalf'})).toEqual([]);
 });
 it('finds a nickname-captioned play when searching the full roster name',()=>{
  const rows=[{id:'9',game_id:'401',headline:'CMC scores for the 49ers',game_label:'SF · ATL',kind:'touchdown'}],players=highlightPlayerOptions(rows,[{id:'cmc',name:'Christian McCaffrey',position:'RB',nflTeam:'SF'}]);
  expect(browseHighlightClips(rows,{players,query:'McCaffrey'})).toEqual(rows);
 });
 it('handles a removed filter, empty data and punctuation without losing the remaining reel',()=>{
  expect(browseHighlightClips(clips,{player:'removed',players:[],query:'   '})).toEqual(clips);
  expect(highlightPlayerOptions([],roster)).toEqual([]);expect(browseHighlightClips([],{})).toEqual([]);
 });
});
