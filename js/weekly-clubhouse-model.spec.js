import {describe,it,expect} from 'vitest';
import {buildWeeklyClubhouse,weeklyRecapLines} from './weekly-clubhouse-model.js';
const members=[{id:1,sleeper_user_id:'a',display_name:'A',team_name:'Alpha'},{id:2,sleeper_user_id:'b',display_name:'B',team_name:'Beta'},{id:3,sleeper_user_id:'c',display_name:'C',team_name:'Gamma'},{id:4,sleeper_user_id:'d',display_name:'D',team_name:'Delta'}];
const data={season:2026,week:3,completed:true,voteOpen:true,games:[{matchup_id:1,user1:'a',roster1:1,score1:140,user2:'b',roster2:2,score2:90},{matchup_id:2,user1:'c',roster1:3,score1:120,user2:'d',roster2:4,score2:119}],votes:[],wall:[],pickem:[]};
describe('weekly clubhouse awards',()=>{
 it('uses fresh totals and the actual historical starters for bench regret',()=>{
  const raw=[{roster_id:1,points:100,starters:['x'],players_points:{x:40,bench:22}},{roster_id:2,points:101,starters:['bench'],players_points:{bench:35,x:8}},{roster_id:3,points:99,starters:['x'],players_points:{x:20,bench:10}},{roster_id:4,points:110,starters:['x'],players_points:{x:30,bench:15}}];
  const model=buildWeeklyClubhouse(data,members,raw,{bench:{n:'Benched Ace'}});
  expect(model.awards.find(a=>a.key==='high-score').winners[0].name).toBe('Delta');
  expect(model.awards.find(a=>a.key==='escape').winners[0].name).toBe('Beta');
  expect(model.awards.find(a=>a.key==='bench').winners[0]).toMatchObject({memberId:1,playerName:'Benched Ace',benchPoints:22});
 });
 it('shares tied score awards and never turns a drawn matchup into a win',()=>{
  const model=buildWeeklyClubhouse({...data,games:data.games.map(g=>({...g,score1:100,score2:100}))},members);
  expect(model.awards).toHaveLength(1);expect(model.awards[0].winners).toHaveLength(4);
  expect(weeklyRecapLines(model).join(' ')).not.toContain('Won by');
 });
 it('does not label an unfinished slate with final awards',()=>{expect(buildWeeklyClubhouse({...data,completed:false},members).awards).toEqual([])});
 it('does not turn missing scores or unavailable bench data into zero-point awards',()=>{
  expect(buildWeeklyClubhouse({...data,games:[{...data.games[0],score1:null}]},members).awards).toEqual([]);
  const model=buildWeeklyClubhouse(data,members);expect(model.awards.some(a=>a.key==='bench')).toBe(false);expect(model.benchAvailable).toBe(false);
 });
 it('shows live vote counts but awards the clown only after the ballot closes',()=>{
  const votes=[{voter_id:1,nominee_id:2},{voter_id:2,nominee_id:3}],live=buildWeeklyClubhouse({...data,votes},members);
  expect(live.clown).toHaveLength(2);expect(live.awards.some(a=>a.key==='clown')).toBe(false);
  const final=buildWeeklyClubhouse({...data,votes,voteOpen:false,voteClosed:true},members);
  expect(final.awards.find(a=>a.key==='clown')).toMatchObject({detail:'1 vote · tied ballot'});
  expect(final.awards.find(a=>a.key==='clown').winners.map(w=>w.memberId)).toEqual([2,3]);
 });
 it('does not invent a clown winner when nobody votes',()=>{expect(buildWeeklyClubhouse({...data,voteOpen:false,voteClosed:true},members).awards.some(a=>a.key==='clown')).toBe(false)});
 it('adds weekly Pick’em, book and Wall receipts to the share text',()=>{
  const model=buildWeeklyClubhouse({...data,pickem:[{member_id:2,rank:1,correct:12}],sportsbook:{available:true,mostProfitable:{display_name:'B',net:0}},wall:[{id:1,body:'Old receipt',reactions:4}]},members);
  const text=weeklyRecapLines(model).join('\n');expect(text).toContain('Pick’em: B · 12 right');expect(text).toContain('Sportsbook: B · 0 SIN net');expect(text).toContain('Old receipt · 4 reactions');
 });
});
