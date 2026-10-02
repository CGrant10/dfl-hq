import { it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { transformWithOxc } from 'vite';
const source=(await transformWithOxc(readFileSync('supabase/functions/sync-sleeper/index.ts','utf8'),'sync-sleeper.ts')).code.replace(/^import .*;$/gm,'');
const {matchupClose,ensureMatchupMarkets}=new Function('Deno',source+'\nreturn {matchupClose,ensureMatchupMarkets};')({serve(){}});
function admin({slate='2026-10-09T00:20:00Z',existing=false}={}){
 const writes=[];
 return {writes,from(table){let inserting;
  const q={select(){return q},eq(){return q},like(){return q},not(){return q},order(){return q},limit(){return q},insert(rows){inserting=rows;writes.push({table,rows});return q},maybeSingle:async()=>({data:table==='sportsbook_markets'?existing?{id:7}:null:null,error:null}),single:async()=>({data:{id:8},error:null}),then(resolve){resolve({data:table==='nfl_pickem_games'?(slate?[{starts_at:slate}]:[]):inserting?null:[],error:null})}};return q;
 }};
}
it('uses the actual first NFL kickoff to lock fantasy winners',async()=>{
 const client=admin();expect((await matchupClose(client,2026,5)).toISOString()).toBe('2026-10-09T00:20:00.000Z');
 expect((await matchupClose(admin({slate:null}),2026,5)).toISOString()).toBe('2026-10-09T00:15:00.000Z');
});
it('creates a future two-sided winner market, never reopening or repricing an existing game',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-02T20:00:00Z'));
 try{
 const sides=[{roster_id:1,matchup_id:2,starters:['p1']},{roster_id:2,matchup_id:2,starters:['p2']}];
 const rosters=[{roster_id:1,owner_id:'a'},{roster_id:2,owner_id:'b'}],names=new Map([['a',{team:'A'}],['b',{team:'B'}]]),projections=[{player_id:'p1',stats:{pass_yd:250}},{player_id:'p2',stats:{pass_yd:200}}];
 const client=admin();expect(await ensureMatchupMarkets(client,{scoring_settings:{pass_yd:.04}},2026,5,sides,rosters,names,projections)).toBe(1);
 expect(client.writes[0].rows).toMatchObject({auto_key:'matchup:2026:5:2',status:'open',closes_at:'2026-10-09T00:20:00.000Z'});
 expect(client.writes[1].rows).toEqual(expect.arrayContaining([expect.objectContaining({label:'A',sleeper_roster_id:1}),expect.objectContaining({label:'B',sleeper_roster_id:2})]));
 const held=admin({existing:true});expect(await ensureMatchupMarkets(held,{},2026,5,sides,rosters,names,projections)).toBe(0);expect(held.writes).toEqual([]);
 const closed=admin({slate:'2026-10-02T00:20:00Z'});expect(await ensureMatchupMarkets(closed,{},2026,4,sides,rosters,names,projections)).toBe(0);expect(closed.writes).toEqual([]);
 }finally{vi.useRealTimers()}
});
