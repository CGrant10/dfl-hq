import {it,expect} from 'vitest';
import {packageEvidence,packageValue} from './trade-player-evidence.js';
import {isPlausibleTradeSuggestion,optimalLineup} from './team-analyzer.js';
const qb=(id,value)=>({id,position:'QB',tradeValue:value,oneQbValueFactor:.35});
it('prices one starting QB and limited backup value without stacking streamer packages',()=>{
 const pool=new Map([qb('a',30),qb('b',25),qb('c',20),{id:'rb',position:'RB',tradeValue:40}].map(p=>[p.id,p]));
 expect(packageEvidence(['a'],pool).value).toBe(30);
 expect(packageEvidence(['a','b','c','rb'],pool).value).toBe(75);
 expect(packageEvidence(['c','b','a','rb','a'],pool)).toEqual(packageEvidence(['rb','a','b','c'],pool));
 expect(pool.get('b').tradeValue).toBe(25);
 expect(packageValue(['c','rb','a','b','a'],pool)).toBe(packageEvidence(['a','b','c','rb'],pool).value);
});
it('preserves elite single-QB values and other league formats',()=>{
 const pool=new Map([{...qb('allen',100),oneQbValueFactor:1},{id:'q2',position:'QB',tradeValue:45},{id:'wr',position:'WR',tradeValue:90}].map(p=>[p.id,p]));
 expect(packageEvidence(['allen','wr'],pool).value).toBe(190);
 expect(packageEvidence(['q2','wr'],pool).value).toBe(135);
});
it('rejects automatic packages that immediately cut an offered player or rely on filler',()=>{
 const base={fairness:95,weeklyDeltaA:1,weeklyDeltaB:1};
 expect(isPlausibleTradeSuggestion({...base,cutIncomingB:['junk']})).toBe(false);
 expect(isPlausibleTradeSuggestion({...base,sendA:['a','b','c','d','e'],usefulIncomingB:['a'],surplusIncomingB:['b','c','d','e']})).toBe(false);
 expect(isPlausibleTradeSuggestion({...base,sendA:['a','b','c','d','e'],usefulIncomingB:['a','b','c','d'],surplusIncomingB:['e']})).toBe(true);
});

it('does not turn a third QB into extra usable depth in a one-QB lineup',()=>{
 const rows=[qb('starter',40),qb('backup',20),qb('third',15)].map((p,i)=>({...p,expectedPoints:340-i*17}));
 const pool=new Map(rows.map(p=>[p.id,p]));
 expect(optimalLineup(['starter','backup','third'],pool).depthScore).toBe(optimalLineup(['starter','backup'],pool).depthScore);
 expect(optimalLineup(['starter','backup'],pool).starterPoints).toBe(340);
});
