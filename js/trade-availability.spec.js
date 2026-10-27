import {describe,it,expect} from 'vitest';
import {buildPlayerPool,evaluateTrade,suggestTrades,suggestMultiTeamTrades} from './team-analyzer.js';
import {tradeWeekPlayerPool} from './trade-week-forecast.js';
import {tradePackageEdits} from './trade-package-edits.js';
import {tradeReviewFixture} from '../tools/trade-review-fixture.mjs';
const now=Date.parse('2026-10-27T12:00:00Z');
describe('availability throughout the trade analyzer',()=>{
 it('never clears catalog IR just because a projection row publishes a healthy placeholder',()=>{
  const pool=buildPlayerPool({season:2026,currentWeek:8,rosters:[{players:['x']}],players:{x:{n:'Reserve',p:'WR',t:'BUF',i:'IR',s:'Active'}},weeklyProjections:[{player_id:'x',injury_status:null,player:{status:'Active'},stats:{gp:1,rec:10}}]});
  expect(pool.get('x')).toMatchObject({injuryStatus:'IR',isOut:true,automaticTradeEligible:false});
 });
 it('values a season-ending player at zero despite strong season projections, past points and a healthy weekly placeholder',()=>{
  const pool=buildPlayerPool({season:2026,currentWeek:8,now,rosters:[{players:['dead','live']}],players:{dead:{n:'Receiver',p:'WR',t:'BUF',i:'IR',s:'Inactive'},live:{n:'Healthy',p:'WR',t:'MIA'}},projections:[{player_id:'dead',stats:{rec:300,adp_ppr:1}},{player_id:'live',stats:{rec:100,adp_ppr:30}}],currentStats:{dead:{rec:90,gp:6}},weeklyProjections:[{player_id:'dead',injury_status:null,player:{status:'Active'},stats:{rec:20}}],scoringSettings:{rec:1},injuryReport:{injuries:[{injuries:[{status:'Injured Reserve',date:'2026-10-26T10:00:00Z',details:{returnDate:'2027-02-15'},athlete:{displayName:'Receiver',position:{abbreviation:'WR'},team:{abbreviation:'BUF'}}}]}]}});
  expect(pool.get('dead')).toMatchObject({currentPoints:90,outForSeason:true,tradePerGame:0,forwardPerGame:0,tradeValue:0,automaticTradeEligible:false});
  const check=evaluateTrade({teamA:{id:'a',playerIds:['live']},teamB:{id:'b',playerIds:['dead']},sendA:['live'],sendB:['dead'],pool});expect(check.valueToA).toBe(0);expect(check.valueToB).toBeGreaterThan(0);expect(check.fairness).toBe(0);
  for(const offset of [0,3,10])expect(tradeWeekPlayerPool(pool,null,offset).get('dead').expectedPoints).toBe(0);
 });
 it('excludes reserve players from all offer tiers, refinements and anchored searches while retaining healthy offers',()=>{
  const {teams,pool}=tradeReviewFixture(),dead='2-3';Object.assign(pool.get(dead),{injuryStatus:'IR',playerStatus:'Inactive'});
  for(const intent of ['fair','aggressive','steal']){
   const offers=suggestTrades({teams,teamId:'1',pool,intent,maxPlayers:4,limit:30});expect(offers.length).toBeGreaterThan(0);expect(offers.every(o=>![...o.sendA,...o.sendB].includes(dead))).toBe(true);
   expect(suggestTrades({teams,teamId:'1',pool,intent,receiveAnchorIds:[dead],partnerId:'2'})).toEqual([]);
  }
 });
 it('applies the same gate to three-way packages and automatic package additions',()=>{
  const {teams,pool}=tradeReviewFixture(),dead='2-3';Object.assign(pool.get(dead),{outForSeason:true,automaticTradeEligible:false});
  const offers=suggestMultiTeamTrades({parties:teams.slice(0,3),pool,maxPlayers:4,intent:'fair',limit:30});expect(offers.length).toBeGreaterThan(0);expect(offers.every(o=>!o.sends.flat().includes(dead))).toBe(true);
  const edits=tradePackageEdits({parties:teams.slice(0,2),sends:[['1-3'],['2-4']],destinations:{'1-3':'2','2-4':'1'}},pool);expect(edits.every(e=>!e.sends.flat().includes(dead))).toBe(true);
 });
});
