import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {evaluateTrade,evaluateMultiTeamTrade,tradeSuggestionTier} from './team-analyzer.js';
const benchmark=JSON.parse(readFileSync(new URL('../tools/fixtures/dfl-trade-benchmark.json',import.meta.url),'utf8'));
describe('recorded DFL package and directed-price benchmark',()=>{
 it.each(benchmark.cases)('preserves recorded receipt $receipt prices, ownership and routes',row=>{
  const pool=new Map(row.packages.flatMap(pkg=>pkg.players.map(p=>[p.id,{...p,tradePerGame:p.expectedPoints/17,modelSource:'projection'}])));
  const teams=row.packages.map(pkg=>({id:pkg.teamId,playerIds:pkg.players.map(p=>p.id)})),sends=row.packages.map(pkg=>pkg.players.map(p=>p.id));
  const multi=evaluateMultiTeamTrade({teams,sends,destinations:row.destinations,pool});
  expect(multi.values).toEqual(row.expected.incoming);expect(multi.outgoingValues).toEqual(row.expected.outgoing);expect(multi.fairness).toBe(row.expected.balance);
  expect(multi.values.reduce((a,b)=>a+b,0)).toBe(multi.outgoingValues.reduce((a,b)=>a+b,0));
  for(let i=0;i<teams.length;i++)expect([...multi.receives[i]].sort()).toEqual(Object.keys(row.destinations).filter(id=>row.destinations[id]===teams[i].id).sort());
  if(teams.length===2){const two=evaluateTrade({teamA:teams[0],teamB:teams[1],sendA:sends[0],sendB:sends[1],pool});expect([two.valueToA,two.valueToB]).toEqual(row.expected.incoming);expect(two.fairness).toBe(row.expected.balance);expect(tradeSuggestionTier(two)).not.toBe('fair')}
 });
 it('does not silently turn the recorded split three-way deal into a circular trade',()=>{
  const row=benchmark.cases.find(r=>r.packages.length===3),pool=new Map(row.packages.flatMap(pkg=>pkg.players.map(p=>[p.id,{...p,modelSource:'projection'}]))),teams=row.packages.map(pkg=>({id:pkg.teamId,playerIds:pkg.players.map(p=>p.id)})),sends=teams.map(t=>t.playerIds);
  const routed=evaluateMultiTeamTrade({teams,sends,destinations:row.destinations,pool}),circle=evaluateMultiTeamTrade({teams,sends,pool});
  expect(routed.values).toEqual([70,96,90]);expect(circle.values).not.toEqual(routed.values);
 });
});
