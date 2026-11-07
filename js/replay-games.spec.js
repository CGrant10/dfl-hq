import {describe,it,expect} from 'vitest';
import {nflObservedGame} from './nfl-game-center-model.js';
import {replayGameEntries,replayGameMarkup,replayGameObservation} from './replay-games.js';
const event=(id,a,b)=>({id,date:'2026-11-08T18:00:00Z',competitions:[{status:{type:{state:'post',shortDetail:'Final'}},competitors:[{homeAway:'away',team:{id:'1',abbreviation:a},score:'0'},{homeAway:'home',team:{id:'2',abbreviation:b},score:'24'}]}]});
const context={season:2026,week:9,nflPayload:{season:{year:2026,type:2},week:{number:9},events:[event('1','CIN','BAL'),event('2','PIT','NO')]}};
describe('Replay matchup identity',()=>{
 it('uses current verified scores including zero, retaining games without clips',()=>{const games=replayGameEntries([{game_id:'1',game_label:'CIN · BAL'}],context);expect(games.map(g=>g.id)).toEqual(['1','2']);expect(games[0].sides.map(s=>s.score)).toEqual([0,24]);expect(games[1].status).toBe('Final')});
 it('never gives archived clips the current week’s score',()=>{const games=replayGameEntries([{game_id:'3',game_label:'BUF · KC'}],context);expect(games.at(-1)).toMatchObject({id:'3',status:'Replay',sides:[{code:'BUF',score:null},{code:'KC',score:null}]})});
 it('rejects a mismatched board and deduplicates archived game entries',()=>{const clips=[{game_id:'1',game_label:'CIN · BAL'},{game_id:'1',game_label:'CIN · BAL'}],games=replayGameEntries(clips,{...context,week:8});expect(games).toHaveLength(1);expect(games[0].sides.every(s=>s.score===null)).toBe(true)});
 it('does not fabricate team names or scores for unavailable clip metadata',()=>{const games=replayGameEntries([{game_id:'9',game_label:'Game unavailable'},{game_id:'<bad>',game_label:'Bad'}],null);expect(games).toHaveLength(1);expect(games[0].sides).toEqual([]);expect(replayGameMarkup(games,'9')).not.toContain('undefined')});
 it('escapes labels and uses a single selected keyboard target',()=>{const games=[{id:'1',label:'A < B',status:'Replay',sides:[]},{id:'2',label:'CIN @ BAL',status:'Final',sides:[]}],html=replayGameMarkup(games,'2');expect(html).toContain('A &lt; B');expect(html.match(/tabindex="0"/g)).toHaveLength(1);expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)});
});

describe('Observed replay score freshness',()=>{
 const game={id:'1',state:'in',lastPlay:{id:'9'},sides:[{code:'CIN',score:14},{code:'BAL',score:14}]};
 const header={id:'1',season:{year:2026,type:2},competitions:[{status:{type:{state:'in',shortDetail:'Q4 1:00'}},competitors:[{team:{abbreviation:'CIN'},score:'27'},{team:{abbreviation:'BAL'},score:'24'}]}]};
 it('keeps a compact verified observation and advances a lagging board',()=>{const observation=replayGameObservation({header,boxscore:{players:['not retained']},drives:{previous:[{plays:[{id:'2'},{id:'10'}]}]},scoringPlays:[{id:'7'}]});expect(observation).toEqual({header,drives:{current:{plays:[{id:'10'}]}}});expect(nflObservedGame(game,observation,2026).sides.map(s=>s.score)).toEqual([27,24])});
 it('cannot replace a newer board or a different season',()=>{const observation=replayGameObservation({header,drives:{current:{plays:[{id:'10'}]}}});expect(nflObservedGame({...game,lastPlay:{id:'11'}},observation,2026).sides.map(s=>s.score)).toEqual([14,14]);expect(nflObservedGame(game,observation,2025)).toBe(game)});
});
