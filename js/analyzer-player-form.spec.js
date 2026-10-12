import {describe,expect,it} from 'vitest';
import {applyAnalyzerPlayerForm,completedCurrentGames,analyzerPlayerSignal} from './analyzer-player-form.js';
import {buildPlayerPool} from './team-analyzer.js';
const scoring={rec:1,rec_yd:.1,rec_td:6,bonus_rec_yd_100:1};
const row=(id='9487',over={})=>({player_id:id,season:2026,week:5,season_type:'regular',team:'JAX',stats:{gp:1,rec:6,rec_yd:124,rec_td:2,bonus_rec_yd_100:1},...over});
const form=(over={})=>{const pool=new Map([['9487',{id:'9487',name:'Parker Washington',nflTeam:'JAX',trend:'down',trendBasis:'recent'}]]);
 applyAnalyzerPlayerForm(pool,{season:2026,week:5,scoring,current:{data:[row()]},schedule:new Map([['JAX',{key:'final',afterHalftime:true}]]),...over});return pool.get('9487')};
describe('analyzer weekly player form',()=>{
 it('uses Parker’s 31.4 DFL points rather than his old multi-game cold trend',()=>{const player=form();expect(player.gameForm.points).toBeCloseTo(31.4);expect(analyzerPlayerSignal(player)).toBe('HOT · W5 · 31.4');expect(player.trend).toBe('down')});
 it('honors actual matchup scoring corrections',()=>{expect(analyzerPlayerSignal(form({matchups:[{players_points:{9487:32.4}}]}))).toBe('HOT · W5 · 32.4')});
 it('never promotes a projection or pregame zero to an actual hot/cold performance',()=>{
  expect(form({current:{data:[]},matchups:[{players_points:{9487:0}}],schedule:new Map([['JAX',{key:'upcoming'}]])}).gameForm).toBeNull();
 });
 it('shows a live score without calling a first-half player cold',()=>{
  const player=form({current:{data:[]},matchups:[{players_points:{9487:4}}],schedule:new Map([['JAX',{key:'live',afterHalftime:false}]])});
  expect(analyzerPlayerSignal(player)).toBe('W5 · 4.0');
  player.gameForm.afterHalftime=true;expect(analyzerPlayerSignal(player)).toBe('COLD · W5 · 4.0');
 });
 it('withholds cold when NFL status is unknown and heat when the score is stale',()=>{
  expect(analyzerPlayerSignal(form({current:{data:[row('9487',{stats:{gp:1,rec:2}})]},schedule:null}))).toBe('W5 · 2.0');
  expect(analyzerPlayerSignal(form({current:{data:[row()],stale:true}}))).toBe('W5 · 31.4');
 });
 it('uses the identified last completed game when the next game has not started',()=>{
  const player=form({current:{data:[]},completed:[{week:4,data:[row('9487',{week:4,stats:{gp:1,rec:2}})]}]});
  expect(analyzerPlayerSignal(player)).toBe('COLD · W4 · 2.0');
 });
 it('rejects wrong season, week, type, and no-game rows',()=>{
  const rows=[row(),row('wrong-year',{season:2025}),row('wrong-week',{week:4}),row('postseason',{season_type:'post'}),row('zero',{stats:{gp:0}})];
  expect(completedCurrentGames(rows,new Map([['JAX',{key:'final'}]]),2026,5).map(r=>r.player_id)).toEqual(['9487']);
  expect(completedCurrentGames(rows,new Map([['JAX',{key:'live'}]]),2026,5)).toEqual([]);
 });
 it('includes an individual final before Monday finishes, retaining three games per player',()=>{
  const input={rosters:[{players:['9487']}],players:{9487:{n:'Parker Washington',p:'WR',t:'JAX'}},currentStats:{9487:{gp:5,rec:22,rec_yd:352,rec_td:4,bonus_rec_yd_100:1}},
   projections:[{player_id:'9487',stats:{rec:60,rec_yd:800,rec_td:5}}],scoringSettings:scoring,
   recentStats:[1,2,3,4].map(week=>[row('9487',{week,stats:{gp:1,rec:2}})])};
  const finished=completedCurrentGames([row()],new Map([['JAX',{key:'final'}]]),2026,5);
  const p=buildPlayerPool({...input,recentStats:[...input.recentStats.slice(-3),finished]}).get('9487');
  expect(p.recentGames).toBe(3);expect(p.recentAverage).toBeCloseTo((2+2+31.4)/3);
 });
});
