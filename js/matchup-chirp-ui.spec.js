import {describe,it,expect} from 'vitest';
import {matchupChirpHtml,clubhouseChirp} from './matchup-chirp-ui.js';
describe('shared matchup commentary',()=>{
 it('escapes team names and commentary rather than creating member-authored posts',()=>{
  const html=matchupChirpHtml({kind:'final',receipt:'<img src=x> won',roast:'"Fuck" & <script>'},{href:'#/clubhouse?week=4&tab=matchups'});
  expect(html).toContain('&lt;img src=x&gt; won');expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');expect(html).toContain('DFL CHIRP · FINAL RECEIPT');
  expect(html).toContain('week=4&amp;tab=matchups');
 });
 it('uses freshly checked scores after asynchronous rivalry history arrives',()=>{
  const game={matchup_id:1,left:{uid:'a',name:'Alpha',score:0},right:{uid:'b',name:'Beta',score:0}};
  const model={season:2026,week:4,completed:false,chirpScores:new Map([['1',[{...game.left,score:100,live:1},{...game.right,score:75,live:0}]]]),chirpHistory:[]};
  expect(clubhouseChirp(game,model)).toMatchObject({kind:'live',receipt:'Alpha leads by 25.00 · still playing.'});
  expect(game.left.score).toBe(0);
 });
});
