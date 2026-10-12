import {describe,it,expect} from 'vitest';
import {buildPlayerPool,evaluateTrade,evaluateMultiTeamTrade,tradeSuggestionTier} from './team-analyzer.js';
import {expertValueIndex,expertSourceMarkup} from './expert-rankings-model.js';

// A full NFL forecast universe, including unrostered alternatives. Deliberately
// distinct positional scoring curves expose the missing shared-flex demand.
function fixture({flexPosition='WR',scoring={rec:1}}={}){
 const players={},projections=[];
 for(const position of ['QB','RB','WR','TE'])for(let i=0;i<60;i++){
  const id=`${position}${i+1}`;
  const pace=position==='QB'?24-i*.15:position===flexPosition?25-i*.3:position==='TE'?16-i*.25:22-i*.5;
  players[id]={n:id,p:position,t:'DET'};
  projections.push({player_id:id,stats:{rec:Math.max(.1,pace)*17}});
 }
 const rosters=Array.from({length:12},(_,i)=>({players:projections.filter((_,j)=>j%12===i&&j%60<36).map(p=>p.player_id)}));
 return {players,projections,rosters,scoringSettings:scoring};
}

describe('12-team PPR positional and shared-flex prices',()=>{
 it('allocates exactly twelve shared flex slots and deepens replacement only where they are used',()=>{
  const pool=buildPlayerPool(fixture()),wr=pool.get('WR21'),rb=pool.get('RB21'),te=pool.get('TE8');
  expect(wr).toMatchObject({leagueSize:12,startingSlots:2,flexDemand:12,replacementRank:48});
  expect(rb).toMatchObject({startingSlots:2,flexDemand:0,replacementRank:36});
  expect(te).toMatchObject({startingSlots:1,flexDemand:0,replacementRank:18});
  expect(pool.get('QB1')).toMatchObject({startingSlots:1,flexDemand:0,replacementRank:18});
  expect(wr.replacementPerGame).toBeCloseTo(25-47*.3);
 });
 it.each(['RB','TE'])('allows %s to win flex slots based on scoring rather than a fixed WR multiplier',flexPosition=>{
  const pool=buildPlayerPool(fixture({flexPosition}));
  const demand=Object.fromEntries(['RB','WR','TE'].map(p=>[p,pool.get(`${p}1`).flexDemand]));
  expect(Object.values(demand).reduce((a,b)=>a+b,0)).toBe(12);
  expect(demand[flexPosition]).toBe(12);
  expect(pool.get(`${flexPosition}1`).replacementRank).toBe((flexPosition==='TE'?18:36)+12);
 });
 it('uses unrostered forecasts for replacement and does not create extra demand from duplicate roster entries',()=>{
  const input=fixture(),base=buildPlayerPool(input);
  input.rosters=input.rosters.map(r=>({...r,players:[...r.players,...r.players]}));
  const duplicate=buildPlayerPool(input);
  expect(base.has('WR48')).toBe(false);
  expect(duplicate.get('WR21').tradeValue).toBe(base.get('WR21').tradeValue);
  expect(duplicate.get('WR21').replacementPerGame).toBe(base.get('WR21').replacementPerGame);
 });
 it('keeps elite TE premiums while useful receivers beat modest one-slot TE assets',()=>{
  const pool=buildPlayerPool(fixture());
  expect(pool.get('TE1').tradeValue).toBeGreaterThan(pool.get('TE12').tradeValue*2);
  expect(pool.get('WR21').tradeValue).toBeGreaterThan(pool.get('TE8').tradeValue);
 });
 it('uses current overall PPR consensus across positions in both two-team and directed group totals',()=>{
  const input=fixture();input.players.TE8.n='Juwan Johnson';input.players.WR21.n='Mike Evans';
  const expertRankings={usable:true,status:'Fresh',source:'FantasyPros',experts:8,updatedAt:1,players:[
   {name:'Juwan Johnson',position:'TE',team:'DET',rank:108,positionRank:11,minRank:94,maxRank:123,stdDev:10.41},
   {name:'Mike Evans',position:'WR',team:'DET',rank:50,positionRank:25,minRank:46,maxRank:61,stdDev:5.88},
  ]};
  const plain=buildPlayerPool(input),pool=buildPlayerPool({...input,expertRankings});
  for(const id of ['TE8','WR21']){
   const p=pool.get(id);
   expect(p.expertWeight).toBe(.5);
   expect(p.tradeValue).toBe(Math.round(p.modelTradeValue*.5+expertValueIndex(p.expert.rank)*.5));
   expect(p.tradePerGame).toBe(plain.get(id).tradePerGame);
  }
  const teams=[{id:'a',playerIds:['TE8']},{id:'b',playerIds:['WR21']},{id:'c',playerIds:['RB21']}];
  const two=evaluateTrade({teamA:teams[0],teamB:teams[1],sendA:['TE8'],sendB:['WR21'],pool});
  expect(two.valueToA).toBe(pool.get('WR21').tradeValue);
  expect(two.fairness).toBeLessThan(88);expect(tradeSuggestionTier(two)).not.toBe('fair');
  const multi=evaluateMultiTeamTrade({teams,sends:[['TE8'],['WR21'],['RB21']],destinations:{TE8:'c',WR21:'a',RB21:'b'},pool});
  expect(multi.routeValues.WR21).toBe(two.valueToA);
  expect(multi.values[0]).toBe(two.valueToA);
  const stale=buildPlayerPool({...input,expertRankings:{...expertRankings,usable:false,status:'Stale'}});
  expect(stale.get('TE8').tradeValue).toBe(plain.get('TE8').tradeValue);
  expect(stale.get('WR21').expertWeight).toBe(0);
 });
 it('attributes the actual weight and continues to disclose stale-source exclusion',()=>{
  expect(expertSourceMarkup({status:'Fresh'})).toContain('50%');
  expect(expertSourceMarkup({status:'Stale'})).toContain('Excluded from player values');
 });
});
