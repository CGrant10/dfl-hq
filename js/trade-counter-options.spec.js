import {it,expect} from 'vitest';
import {chooseCounterOptions,counterCoreCost} from './trade-counter-options.js';
const pool=new Map(['star','backup','bench','target','other','upgrade'].map((id,i)=>[id,{id,tradeValue:i===0?80:20}]));
const parties=[{id:'a',playerIds:['star','backup','bench'],lineup:{starters:[{id:'star'}]}},{id:'b',playerIds:['target','other','upgrade']}];
const row=(send,get,weekly=0,penalty=0,fairness=96)=>({parties,sends:[send,get],destinations:Object.fromEntries([...send.map(id=>[id,'b']),...get.map(id=>[id,'a'])]),result:{fairness,netFairness:fairness,weeklyDeltaA:weekly,weeklyDeltaB:0,rosterImpactA:weekly,rosterImpactB:0,rosterSafeguards:[{penalty,gain:0},{penalty:0,gain:0}]}});
it('returns distinct closest, improvement and core-preserving packages with their actual grades',()=>{
 const original=row(['star'],['target'],0,0,70),nearest=row(['star'],['other']),best=row(['star','bench'],['upgrade'],3),core=row(['bench'],['other'],1);
 const options=chooseCounterOptions([nearest,best,core,nearest],original,pool);
 expect(options.map(o=>o.counterLabel)).toEqual(['Closest fair counter','Best team improvement','Keep your core']);
 expect(options[0].sends).toEqual(nearest.sends);expect(options[1].sends).toEqual(best.sends);expect(options[2].sends).toEqual(core.sends);
 expect(options.every(o=>o.counterKind==='fair')).toBe(true);
});
it('values retained handcuff coverage and never calls the closest unbalanced package fair',()=>{
 const original=row(['star'],['target'],0,0,40),bad=row(['backup'],['other'],0,2,98),good=row(['bench'],['other'],0,0,85);
 expect(counterCoreCost(bad,original,pool)).toBeGreaterThan(counterCoreCost(good,original,pool));
 const options=chooseCounterOptions([bad,good],original,pool);expect(options[0].sends).toEqual(good.sends);expect(options.every(o=>o.counterKind==='closest')).toBe(true);
 expect(chooseCounterOptions([],original,pool)).toEqual([]);
});
