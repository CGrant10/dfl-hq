import {describe,it,expect} from 'vitest';
import {teamHighlightClips} from './team-highlight-model.js';
const clip=(headline,game='401',teams='NO · PIT')=>({id:headline,game_id:game,game_label:teams,headline});
const player=(name='Chris Olave',team='NO',position='WR')=>({id:name,name,nflTeam:team,position});
const match=(rows,players)=>teamHighlightClips(rows,players,{gameIds:['401']});
describe('fantasy-roster highlight selection',()=>{
 it('includes only named roster players from games in the selected fantasy week',()=>{
  const yes=clip('Chris Olave hauls in a 34-yard touchdown'),other=clip('Tyler Shough hits a deep ball'),old=clip(yes.headline,'old');
  expect(match([yes,other,old],[player()])).toEqual([yes]);
 });
 it('matches apostrophes, accents, punctuation, possessives and suffixes',()=>{
  for(const [name,headline] of [["Ja’Marr Chase","Ja'Marr Chase's ridiculous TD catch"],['A.J. Brown','AJ Brown makes a one-handed grab'],['Marvin Harrison Jr.','Marvin Harrison scores'],['Amon-Ra St. Brown','Amon-Ra St. Brown scores again']])expect(match([clip(headline)],[player(name)])).toHaveLength(1);
 });
 it('does not match a surname alone, a different NFL team, an empty slot or all plays by a defense',()=>{
  const clips=[clip('Olave scores'),clip('Chris Olave scores','401','NYJ · BUF'),clip('New Orleans scores')];
  expect(match(clips,[player(),player('New Orleans','NO','DEF'),{...player('Empty slot'),empty:true}])).toEqual([]);
 });
 it('preserves chronological order and does not duplicate a clip featuring two roster players',()=>{
  const clips=[clip('Tyler Shough hits Chris Olave for 30 yards'),clip('Chris Olave scores the next touchdown')];
  expect(match(clips,[player(),player('Tyler Shough','NO','QB')])).toEqual(clips);
 });
 it('requires verified week game IDs and normalizes provider team aliases',()=>{
  expect(teamHighlightClips([clip('Chris Olave scores')],[player()])).toEqual([]);
  expect(match([clip('Jayden Daniels scores','401','WSH · NYG')],[player('Jayden Daniels','WAS','QB')])).toHaveLength(1);
 });
});
