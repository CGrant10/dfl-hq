import {describe,it,expect} from 'vitest';
import {leaguePlayers,closeGame} from './game-day-league.js';
import {savedMoments} from './game-day-moments-model.js';
const p=(id,points,state='live',afterHalftime=true)=>({id,name:id,roster:'1',points,state,afterHalftime});
const side=(roster,lineup,bench=[])=>({roster,name:`Team ${roster}`,score:50,known:true,starters:lineup,lineup,bench});
const model={leagueId:'league',season:2026,week:4,games:[{id:'1',sides:[side('1',[p('hot',16),p('edge',15),p('cold',9),p('pre',3,'live',false),p('up',0,'upcoming'),p('unknown',null),{...p('empty',0),empty:true}],[p('bench',30)]),side('2',[{...p('final',0,'final'),roster:'2'}])]}]};
describe('league player board',()=>{
 it('shows the complete sorted list, keeps unknown last and excludes empty slots',()=>{expect(leaguePlayers(model).map(p=>p.id)).toEqual(['hot','edge','cold','pre','final','up','unknown'])});
 it('uses the existing strict thermal thresholds and waits for halftime before cold',()=>{expect(leaguePlayers(model,{filter:'hot'}).map(p=>p.id)).toEqual(['hot']);expect(leaguePlayers(model,{filter:'cold'}).map(p=>p.id)).toEqual(['final','cold'])});
 it('includes benches only by choice and deduplicates by player and roster',()=>{const m={...model,games:[{id:'1',sides:[side('1',[p('hot',16)],[p('hot',16),p('bench',30)])]}]};expect(leaguePlayers(m,{includeBench:true,filter:'hot'}).map(p=>p.id)).toEqual(['bench','hot']);expect(leaguePlayers(m).map(p=>p.id)).toEqual(['hot'])});
});
describe('close matchup presentation',()=>{
 it('shows a real live gap and only actual starters still to play',()=>{const g={id:'1',sides:[{...model.games[0].sides[0],score:80},{...model.games[0].sides[1],score:89.5}]};const c=closeGame(g);expect(c.gap).toBe(9.5);expect(c.leader.roster).toBe('2');expect(c.sides[0].playing.map(p=>p.id)).not.toContain('empty');expect(c.sides[1].playing).toEqual([])});
 it('keeps ties as ties and skips wide, unknown, final and pregame scores',()=>{expect(closeGame(model.games[0]).leader).toBeNull();expect(closeGame({sides:[{...model.games[0].sides[0],score:null},model.games[0].sides[1]]})).toBeNull();expect(closeGame({sides:[{...model.games[0].sides[0],score:61},model.games[0].sides[1]]})).toBeNull();expect(closeGame({sides:[side('1',[p('a',2,'final')]),side('2',[p('b',2,'upcoming')])]})).toBeNull()});
});
describe('saved sync moments',()=>{
 const row=(id,kind,data)=>({id,kind,data,league_id:'league',season:2026,week:4,matchup_id:1,roster_id:1,player_id:'hot',captured_at:'2026-10-04T19:00:00Z'});
 it('renders historical observations, owner and real delta without claiming a touchdown',()=>{const rows=[row(1,'big',{points:25}),row(2,'surge',{delta:8}),row(3,'lead',{scores:{1:50,2:49}})];const result=savedMoments(rows,model);expect(result.map(r=>r.kind)).toEqual(['lead','surge','big']);expect(result[1].text).toContain('+8.00 fantasy points since the previous sync');expect(result[2].text).toContain('25.00 points · Team 1');expect(result.some(r=>r.text.includes('touchdown'))).toBe(false)});
 it('scopes by league/week and discards malformed unknown events',()=>{const valid=row(1,'big',{points:20});expect(savedMoments([valid,{...valid,id:2,week:5},{...valid,id:3,league_id:'other'},row(4,'surge',{delta:null}),row(5,'lead',{scores:{1:50}}),{...valid,id:6,captured_at:'bad'}],model)).toHaveLength(1)});
});
