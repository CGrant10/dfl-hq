import {describe,it,expect} from 'vitest';
import {tradeIntentionContext,intentionPlayerAllowed,offerManagerFit,INTENTION_MAX_AGE} from './trade-intentions-model.js';
import {suggestTrades,suggestMultiTeamTrades} from './team-analyzer.js';
import {compareTradeSuggestions,prioritizeTradeSuggestions} from './trade-suggestion-quality.js';
const now=Date.UTC(2026,9,21),teams=[{id:'a',playerIds:['a1','a2']},{id:'b',playerIds:['b1','b2']}];
const row={member_id:1,roster_id:'a',season:2026,league_id:'league',players:{a1:'available',a2:'keeping',gone:'available'},needs:['WR'],updated_at:new Date(now).toISOString()};
const build=rows=>tradeIntentionContext(rows,teams,{season:2026,leagueId:'league',now});
describe('manager intentions',()=>{
 it('uses only owned players and the current league/season',()=>{
  expect(build([row])).toEqual({a:{players:{a1:'available',a2:'keeping'},needs:['WR']}});
  expect(build([{...row,season:2025},{...row,league_id:'old'}])).toEqual({});
 });
 it('never treats unset or expired labels as a manager statement',()=>{
  expect(build([{...row,updated_at:new Date(now-INTENTION_MAX_AGE-1).toISOString()}])).toEqual({});
  expect(build([{...row,updated_at:'bad'}])).toEqual({});
  expect(build([{...row,updated_at:new Date(now+3600000).toISOString()}])).toEqual({});
  expect(build([{...row,needs:['WR','WR','BOGUS'],players:{a1:'invented'}}]).a).toEqual({needs:['WR'],players:{}});
 });
 it('respects keeping unless that exact player was explicitly requested',()=>{
  const context=build([row]);expect(intentionPlayerAllowed(teams[0],'a2',context)).toBe(false);
  expect(intentionPlayerAllowed(teams[0],'a2',context,['a2'])).toBe(true);
  expect(intentionPlayerAllowed(teams[0],'a1',context)).toBe(true);
  expect(intentionPlayerAllowed(teams[1],'b1',context)).toBe(true);
 });
 it('counts need fit only when the incoming player actually starts',()=>{
  const pool=new Map([['b1',{position:'WR'}]]),context=build([row]);
  expect(offerManagerFit(teams,[['a1'],['b1']],[['b1'],['a1']],[[],[]],pool,context).notes).not.toContain('Matches your stated needs');
  expect(offerManagerFit(teams,[['a1'],['b1']],[['b1'],['a1']],[['b1'],[]],pool,context).notes).toContain('Matches your stated needs');
 });
 it('does not give larger packages extra listing credit',()=>{
  const context={a:{players:{a1:'available',a2:'available'},needs:[]}};
  expect(offerManagerFit(teams,[['a1'],[]],[[],[]],[],new Map(),context).score).toBe(offerManagerFit(teams,[['a1','a2'],[]],[[],[]],[],new Map(),context).score);
 });
 it('uses willingness only within comparable lineup, price and risk bands',()=>{
  const base={utility:{group:4,score:22},fairness:95,sendA:['a'],sendB:['b']},matched={...base,managerFit:{score:4}};
  expect(compareTradeSuggestions(matched,base)).toBeLessThan(0);
  for(const better of [{...base,utility:{group:5,score:22}},{...base,utility:{group:4,score:42}},{...base,fairness:100}])expect(compareTradeSuggestions(matched,better)).toBeGreaterThan(0);
  expect(prioritizeTradeSuggestions([base,matched],1,(rows,n)=>rows.slice(0,n))).toEqual([matched]);
 });
 it('keeps trade evaluation identical and routes anchored keeping exceptions honestly',()=>{
  const pool=new Map(teams.flatMap(t=>t.playerIds.map(id=>[id,{id,name:id,position:'WR',expectedPoints:272,tradePerGame:16,tradeValue:36,modelSource:'projection'}])));
  const query={teams,pool,teamId:'a',partnerId:'b',shapes:['1-1'],intent:'fair',limit:40};
  const baseline=suggestTrades(query),context={b:{players:{b1:'keeping',b2:'available'},needs:[]}};
  const restricted=suggestTrades({...query,intentions:context});
  expect(baseline.length).toBeGreaterThan(0);expect(restricted.length).toBeGreaterThan(0);
  expect(restricted.every(o=>!o.sendB.includes('b1'))).toBe(true);
  for(const offer of restricted){const old=baseline.find(o=>o.sendA.join()===offer.sendA.join()&&o.sendB.join()===offer.sendB.join());expect(old).toBeTruthy();expect([offer.tier,offer.fairness,offer.valueToA,offer.valueToB]).toEqual([old.tier,old.fairness,old.valueToA,old.valueToB]);}
  const anchored=suggestTrades({...query,intentions:context,receiveAnchorIds:['b1']});expect(anchored.length).toBeGreaterThan(0);expect(anchored.every(o=>o.managerFit.notes.includes('Requested player · Keeping'))).toBe(true);
 });
 it('respects every manager in a three-way search without removing players from roster evaluation',()=>{
  const parties=[...teams,{id:'c',playerIds:['c1','c2']}],pool=new Map(parties.flatMap(t=>t.playerIds.map(id=>[id,{id,name:id,position:'WR',expectedPoints:272,tradePerGame:16,tradeValue:36,modelSource:'projection'}])));
  const before=structuredClone(parties),offers=suggestMultiTeamTrades({parties,pool,intentions:{b:{players:{b1:'keeping'},needs:[]}},intent:'fair',limit:30});
  expect(offers.length).toBeGreaterThan(0);expect(offers.every(o=>!o.sends[1].includes('b1'))).toBe(true);expect(parties).toEqual(before);
 });
});
