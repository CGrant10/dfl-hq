import {describe,it,expect} from 'vitest';
import {buildPowerBoards,POWER_MODEL_VERSION,validPublication} from './league-power-model.js';
const teams=Array.from({length:4},(_,i)=>({id:String(i+1),roster_id:i+1,team_name:`Team ${i+1}`,powerForecast:{complete:true,points:130-i*10}}));
const games=[[1,150,100,80,70],[2,120,130,100,90],[3,180,90,80,70],[4,145,101,139,121]].flatMap(([week,a,b,c,d])=>[
 {season:2026,week,roster1:1,score1:a,roster2:3,score2:b},
 {season:2026,week,roster1:2,score1:c,roster2:4,score2:d},
]);
const build=(extra={})=>buildPowerBoards({teams,matchups:games,season:2026,currentWeek:5,...extra});
describe('performance power, separate from standings',()=>{
 it('does not invent a preseason ranking when no projections or results exist',()=>{
  expect(build({teams:teams.map(t=>({...t,powerForecast:null})),matchups:[]})).toBeNull();
 });
 it('gives each weekly opponent equal weight and counts ties as half',()=>{
  const result=build({matchups:[{season:2026,week:1,roster1:1,score1:100,roster2:2,score2:100},{season:2026,week:1,roster1:3,score1:90,roster2:4,score2:80}],currentWeek:2});
  const row=result.boards.at(-1).rows.find(r=>r.id==='1');
  expect(row).toMatchObject({record:'0-0-1',allPlayRecord:'2-0-1',allPlayRate:2.5/3});
 });
 it('keeps scores with the stable roster when a previous owner identity differs',()=>{
  const current=teams.map((t,i)=>({...t,sleeper_user_id:`u${i+1}`}));
  const built=build({teams:current,matchups:games.map(g=>({...g,user1:'u4',user2:'u1'}))});
  expect(built.boards.at(-1).rows.find(r=>r.id==='1').weeklyScore).toBe(145);
 });
 it('does not leak live, future or other-season scores into a completed edition',()=>{
  const base=build({currentWeek:3});
  expect(build({currentWeek:3,matchups:[...games.filter(g=>g.week<3),...games.filter(g=>g.week>=3).map(g=>({...g,score1:999})),...games.map(g=>({...g,season:2025,score2:777}))]})).toEqual(base);
 });
 it('holds unknown week state at the last published boundary instead of counting Sunday partials',()=>{
  expect(build({currentWeek:0}).latestWeek).toBe(0);
  const board=build({currentWeek:3}).boards.at(-1),saved={season:2026,week:2,model_version:POWER_MODEL_VERSION,published_at:'2026-10-01T00:00:00Z',payload:board};
  const held=build({currentWeek:0,publications:[saved]});
  expect(held.latestWeek).toBe(2);
  expect(held.boards.at(-1).rows).toEqual(board.rows);
 });
 it('requires a contiguous, uniquely identified complete slate',()=>{
  expect(build({matchups:games.filter(g=>g.week!==2)}).latestWeek).toBe(1);
  expect(build({matchups:[...games,games[0]]}).latestWeek).toBe(0);
  expect(build({matchups:games.filter((_,i)=>i!==0)}).latestWeek).toBe(0);
 });
 it('accepts finalized actual zero and negative scores',()=>{
  const built=build({matchups:games.slice(0,2).map((g,i)=>({...g,score1:i?-2:0})),currentWeek:2});
  expect(built.latestWeek).toBe(1);
  expect(built.boards.at(-1).rows.find(r=>r.id==='1').weeklyScore).toBe(0);
  expect(built.boards.at(-1).rows.find(r=>r.id==='2').weeklyScore).toBe(-2);
 });
 it('disables the roster component for everyone when one forecast is unknown',()=>{
  const built=build({teams:teams.map((t,i)=>i? t:{...t,powerForecast:{complete:false,points:null}})});
  expect(built.boards.at(-1).rosterWeight).toBe(0);
  expect(built.boards.at(-1).rows.every(r=>r.forecast===null&&r.score===r.performance)).toBe(true);
 });
 it('never rewrites past weeks with today’s roster and gives week one no fake movement',()=>{
  const a=build(),b=build({teams:teams.map(t=>({...t,powerForecast:{complete:true,points:200-Number(t.id)*-10}}))});
  expect(b.boards.slice(1,-1)).toEqual(a.boards.slice(1,-1));
  expect(a.boards[1].rows.every(r=>r.previousRank===null&&r.movement===0)).toBe(true);
  expect(a.boards.at(-1).rosterWeight).toBe(.25);
  expect(a.boards[2].rows.every(r=>r.rosterWeight===0)).toBe(true);
 });
 it('freezes published scores and movement, while showing current team names',()=>{
  const a=build(),last=a.boards.at(-1),saved={season:2026,week:4,model_version:POWER_MODEL_VERSION,published_at:'2026-10-20T00:00:00Z',payload:structuredClone(last)};
  expect(validPublication(saved,teams,4)).toBe(true);
  const renamed=teams.map(t=>({...t,team_name:`New ${t.id}`,powerForecast:{complete:true,points:Number(t.id)*99}}));
  const b=build({teams:renamed,publications:[saved]}).boards.at(-1);
  expect(b.published).toBe(true);
  expect(b.rows.map(({name,...r})=>r)).toEqual(last.rows.map(({name,...r})=>r));
  expect(b.rows.every(r=>r.name===`New ${r.id}`)).toBe(true);
  const corrupt=structuredClone(saved);corrupt.payload.rows[0].score=NaN;
  expect(validPublication(corrupt,teams,4)).toBe(false);
 });
 it('uses season lineup estimates only in the explicit roster baseline',()=>{
  const built=build({teams:teams.map(t=>({...t,powerForecast:null,lineup:{weeklyPoints:Number(t.id)*10}}))});
  expect(built.boards[0]).toMatchObject({forecastSource:'season-baseline',forecastWeek:null,rosterWeight:1});
  expect(built.boards[0].rows[0].id).toBe('4');
  expect(built.boards.slice(1).every(b=>b.rosterWeight===0)).toBe(true);
 });
});
