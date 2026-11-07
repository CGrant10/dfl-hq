import {describe,it,expect} from 'vitest';
import {replayGameEntries,replayGameMarkup} from './replay-games.js';
const event=(id,a,b)=>({id,date:'2026-11-08T18:00:00Z',competitions:[{status:{type:{state:'post',shortDetail:'Final'}},competitors:[{homeAway:'away',team:{id:'1',abbreviation:a},score:'0'},{homeAway:'home',team:{id:'2',abbreviation:b},score:'24'}]}]});
const context={season:2026,week:9,nflPayload:{season:{year:2026,type:2},week:{number:9},events:[event('1','CIN','BAL'),event('2','PIT','NO')]}};
describe('Replay matchup identity',()=>{
 it('uses current verified scores including zero, retaining games without clips',()=>{const games=replayGameEntries([{game_id:'1',game_label:'CIN · BAL'}],context);expect(games.map(g=>g.id)).toEqual(['1','2']);expect(games[0].sides.map(s=>s.score)).toEqual([0,24]);expect(games[1].status).toBe('Final')});
 it('never gives archived clips the current week’s score',()=>{const games=replayGameEntries([{game_id:'3',game_label:'BUF · KC'}],context);expect(games.at(-1)).toMatchObject({id:'3',status:'Replay',sides:[{code:'BUF',score:null},{code:'KC',score:null}]})});
 it('rejects a mismatched board and deduplicates archived game entries',()=>{const clips=[{game_id:'1',game_label:'CIN · BAL'},{game_id:'1',game_label:'CIN · BAL'}],games=replayGameEntries(clips,{...context,week:8});expect(games).toHaveLength(1);expect(games[0].sides.every(s=>s.score===null)).toBe(true)});
 it('does not fabricate team names or scores for unavailable clip metadata',()=>{const games=replayGameEntries([{game_id:'9',game_label:'Game unavailable'},{game_id:'<bad>',game_label:'Bad'}],null);expect(games).toHaveLength(1);expect(games[0].sides).toEqual([]);expect(replayGameMarkup(games,'9')).not.toContain('undefined')});
 it('escapes labels and uses a single selected keyboard target',()=>{const games=[{id:'1',label:'A < B',status:'Replay',sides:[]},{id:'2',label:'CIN @ BAL',status:'Final',sides:[]}],html=replayGameMarkup(games,'2');expect(html).toContain('A &lt; B');expect(html.match(/tabindex="0"/g)).toHaveLength(1);expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)});
});
