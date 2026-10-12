import {beforeEach,describe,it,expect,vi} from 'vitest';
const wire=vi.hoisted(()=>({tables:{},rosters:[],stale:false,offline:false,playerInjury:null}));
vi.mock('./supabase.js',()=>({db:()=>({from:table=>{
 const result={select:()=>result,order:()=>result,limit:()=>result,eq:()=>result,lte:()=>result,
 then:resolve=>Promise.resolve(resolve({data:wire.tables[table]||[],error:null}))};return result;
}})}));
vi.mock('./nfl-game-day.js',()=>({loadNflGameDay:async()=>({teams:new Map()})}));
vi.mock('./members.js',()=>({loadMemberDirectory:async()=>[]}));
vi.mock('./league-state.js',()=>({loadLeagueState:async()=>({season:2026,currentWeek:5})}));
vi.mock('./expert-rankings-data.js',()=>({loadExpertRankings:async()=>({players:new Map(),status:'Unavailable'})}));
vi.mock('./league-results.js',()=>({loadLatestLeagueResults:async()=>null,reconcileLeagueResults:()=>({})}));
vi.mock('./sleeper.js',()=>({
 sleeper:{league:async()=>{if(wire.offline)throw Error('Offline');return {league_id:'league',season:2026,total_rosters:12,roster_positions:['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'],scoring_settings:{rec:1}}},
 users:async()=>wire.rosters.map(r=>({user_id:r.owner_id,display_name:'Current '+r.roster_id})),rosters:vi.fn(async()=>wire.rosters),matchups:async()=>[]},
 loadPlayers:vi.fn(async()=>Object.fromEntries(Array.from({length:12},(_,i)=>['p'+i,{n:'Player '+i,p:'RB',t:'BUF',i:i===0?wire.playerInjury:null}]))),
 loadSeasonStats:async()=>({data:{},fetchedAt:Date.now()}),loadMarketAdp:async()=>({data:[],fetchedAt:Date.now()}),
 loadWeeklyProjections:vi.fn(async()=>({data:[],fetchedAt:Date.now(),stale:wire.stale})),
 loadWeeklyStats:async()=>({data:[],fetchedAt:Date.now()}),loadTrendingPlayers:async()=>({adds:new Map(),drops:new Map()}),
}));
import {clearAnalyzerDataCache,loadAnalyzerData} from './team-analyzer-data.js';
import {sleeper,loadPlayers,loadWeeklyProjections} from './sleeper.js';
beforeEach(()=>{
 clearAnalyzerDataCache();vi.clearAllMocks();wire.stale=false;wire.offline=false;wire.playerInjury=null;
 wire.rosters=Array.from({length:12},(_,i)=>({roster_id:i+1,owner_id:'owner'+i,players:['p'+i],starters:['p'+i]}));
 wire.tables={sleeper_leagues:[{sleeper_league_id:'league',season:2026,scoring_settings:{rec:1}}],
 sleeper_rosters:wire.rosters.map(r=>({...r,season:2026,sleeper_user_id:r.owner_id}))};
});
describe('trade share data boundary',()=>{
 it('bypasses the shared model, cached ownership and cached injury payloads',async()=>{
  await loadAnalyzerData();wire.rosters[0].players=['p1'];wire.rosters[1].players=['p0'];wire.playerInjury='Out';
  const fresh=await loadAnalyzerData({freshTrade:true});
  expect(sleeper.rosters).toHaveBeenCalledWith('league');
  expect(fresh.teams.find(t=>t.id==='2').playerIds).toContain('p0');
  expect(fresh.pool.get('p0').injuryStatus).toBe('Out');
  expect(loadPlayers).toHaveBeenLastCalledWith({maxAgeMs:0});expect(loadWeeklyProjections).toHaveBeenLastCalledWith(2026,5,{maxAgeMs:0});
 });
 it('treats an actual reserve designation as unavailable even when the player feed says healthy',async()=>{
  wire.rosters[0].reserve=['p0'];const fresh=await loadAnalyzerData({freshTrade:true});
  expect(fresh.pool.get('p0')).toMatchObject({isOut:true,playerStatus:'Injured Reserve'});
 });
 it('refuses stale injury fallback instead of allowing a stale share',async()=>{wire.stale=true;await expect(loadAnalyzerData({freshTrade:true})).rejects.toThrow('verify current injuries');});
 it('refuses unverifiable league settings and duplicate ownership',async()=>{
  wire.offline=true;await expect(loadAnalyzerData({freshTrade:true})).rejects.toThrow('verify current league settings');
  wire.offline=false;wire.rosters[1].players.push('p0');await expect(loadAnalyzerData({freshTrade:true})).rejects.toThrow('Roster ownership changed');
 });
});
