import {describe,it,expect} from 'vitest';
import {matchupBanter} from './matchup-banter.js';
const model={season:2026,week:4,games:[{id:'1',isMine:true,sides:[{uid:'a',name:'Alpha'},{uid:'b',name:'Beta'}]}]};
describe('weekly matchup banter',()=>{
 it('uses past streaks and excludes current and future results',()=>{const history=[{season:2025,week:2,user1:'a',user2:'b',score1:120,score2:100},{season:2026,week:1,user1:'b',user2:'a',score1:99,score2:110},{season:2026,week:4,user1:'a',user2:'b',score1:0,score2:200},{season:2026,week:5,user1:'a',user2:'b',score1:0,score2:200}];expect(matchupBanter(model,history)[0].text).toContain('Alpha has taken the last 2')});
 it('keeps copy stable through score refreshes and rotates by week',()=>{expect(matchupBanter(model)).toEqual(matchupBanter({...model,live:true}));expect(matchupBanter({...model,week:5})[0].text).not.toBe(matchupBanter(model)[0].text)});
 it('does not invent a rivalry record when history is unavailable',()=>{expect(matchupBanter(model)[0].text).toContain('Fresh week, fresh bragging rights');expect(matchupBanter(model)[0].text).not.toContain('series')});
});
