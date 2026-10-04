import {describe,it,expect} from 'vitest';
import {gameDayReel,matchupEntrance,matchupReactionScope} from './game-day-experience-model.js';
const members=[{id:1,sleeper_user_id:'a',team_name:'A'},{id:2,sleeper_user_id:'b',team_name:'B'}];
const game={id:'3',sides:[{uid:'a',name:'A'},{uid:'b',name:'B'}]};
const model={leagueId:'123',season:2026,week:4,leaders:[{id:'player',roster:'1',name:'Player',owner:'A',points:21.5}],games:[game]};
const fixture=(season,week,score1,score2)=>({season,week,user1:'a',user2:'b',roster1:1,roster2:2,score1,score2});
describe('GameDay experience facts',()=>{
 it('excludes current/future and unplayed fixtures from the entrance record',()=>{
  const history=[fixture(2025,4,101,100),fixture(2026,3,130,100),fixture(2026,4,0,0),fixture(2026,5,10,100),fixture(2024,4,0,0),fixture(2023,4,null,200)];
  const intro=matchupEntrance(model,game,history);expect(intro.record).toContain('2–0');expect(intro.banter).toContain('A has taken the last 2');
 });
 it('keeps a first meeting honest when no scored history exists',()=>{expect(matchupEntrance(model,game,[fixture(2026,4,120,110)]).record).toBe('First recorded meeting')});
 it('uses real historical margins and highest-scoring losses; ignores missing and future scores',()=>{
  const history=[fixture(2025,4,160,159.5),fixture(2024,7,150,10),fixture(2026,3,110,120),fixture(2026,4,250,240),fixture(2023,3,null,300),fixture(2027,1,400,350),fixture(2022,2,0,0)];
  const slides=gameDayReel(model,history,members);expect(slides.find(s=>s.key==='record:high').headline).toBe('160.00 points');expect(slides.find(s=>s.key==='record:close').headline).toBe('Won by 0.50');expect(slides.find(s=>s.key==='record:blowout').headline).toBe('140.00-point gap');expect(slides.find(s=>s.key==='record:heartbreak').headline).toBe('159.50 and lost');expect(slides[0].kind).toBe('This week');expect(slides[0].player.id).toBe('player');
 });
 it('does not call ties wins, blowouts, or heartbreaks',()=>{const slides=gameDayReel({...model,leaders:[]},[fixture(2025,1,100,100)],members);expect(slides.map(s=>s.key)).toEqual(['record:high'])});
 it('separates reaction scopes by league, year, week, and matchup',()=>{expect(matchupReactionScope(model,game)).toEqual({league_id:'123',season:2026,week:4,matchup_id:3});expect(matchupReactionScope({...model,leagueId:null},game)).toBeNull();expect(matchupReactionScope({...model,week:5},game)).not.toEqual(matchupReactionScope(model,game))});
});
