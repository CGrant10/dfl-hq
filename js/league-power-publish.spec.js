import {describe,it,expect,vi} from 'vitest';
import {publishLeaguePower} from './league-power-publish.js';
const league={league_id:'dfl',season:'2026',total_rosters:2,scoring_settings:{rec:1}};
const rosters=[{roster_id:1,players:['a']},{roster_id:2,players:['b']}];
const games=[1,2].map(week=>({season:2026,week,roster1:1,roster2:2,score1:100+week,score2:99}));
function database(saved=[],matchups=games){
 const queries=[],writes=[];
 return {queries,writes,from(table){const q={table,filters:[]};queries.push(q);const chain={select(){return chain;},eq(k,v){q.filters.push([k,v]);return chain;},lte(k,v){q.filters.push([k,'<=',v]);return chain;},order(){return chain;},then(ok){return Promise.resolve({data:table==='league_power_publications'?saved:matchups,error:null}).then(ok);},async upsert(rows,options){writes.push({table,rows:structuredClone(rows),options});return {error:null};}};return chain;}};
}
describe('append-only weekly publications',()=>{
 it('scopes all reads, backfills results only and inserts without overwriting',async()=>{
  const db=database(),loadPlayers=vi.fn(async()=>({a:{p:'WR'},b:{p:'WR'}}));
  const result=await publishLeaguePower({database:db,league,rosters,week:3,loadPlayers,projections:[{player_id:'a',opponent:'BUF',stats:{rec:20}},{player_id:'b',opponent:'BUF',stats:{rec:10}}]});
  expect(result).toEqual({published:2,week:2});
  expect(db.queries.filter(q=>q.filters.length).every(q=>q.filters.some(([k,v])=>k==='league_id'&&v==='dfl')&&q.filters.some(([k,v])=>k==='season'&&v===2026))).toBe(true);
  expect(db.writes[0].options.ignoreDuplicates).toBe(true);
  expect(db.writes[0].rows[0].payload).toMatchObject({reconstructed:true,rosterWeight:0});
  expect(db.writes[0].rows[1].payload).toMatchObject({reconstructed:false,rosterWeight:.4});
 });
 it('skips an existing edition without downloading players or changing it',async()=>{
  const db=database([{week:2}]),loadPlayers=vi.fn();
  expect(await publishLeaguePower({database:db,league,rosters,week:3,projections:[{}],loadPlayers})).toEqual({skipped:'published'});
  expect(loadPlayers).not.toHaveBeenCalled();expect(db.writes).toHaveLength(0);
 });
 it('waits for the complete previous week and never publishes the live week',async()=>{
  for(const matchups of [games.slice(0,1),games.map(g=>({...g,week:g.week+1}))]){
   const db=database([],matchups);
   expect(await publishLeaguePower({database:db,league,rosters,week:3})).toEqual({skipped:'scores-pending'});
   expect(db.writes).toHaveLength(0);
  }
 });
});
