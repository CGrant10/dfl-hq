import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({from:vi.fn(),stats:vi.fn(),nfl:vi.fn()}));
vi.mock('./supabase.js',()=>({db:()=>({from:mocks.from})}));
vi.mock('./sleeper.js',()=>({loadWeeklyStats:mocks.stats}));
vi.mock('./nfl-game-day.js',()=>({loadNflGameDay:mocks.nfl}));
import {clearAdviceReceiptsCache,loadAdviceReceipts} from './advice-receipts-data.js';
const row={id:1,kind:'lineup',roster_id:2,season:2026,week:4,captured_at:'2026-10-01T12:00:00Z',locks_at:'2026-10-01T17:00:00Z',scoring_settings:{rec:1},added_players:[{id:'in',team:'CHI'}],removed_players:[{id:'out',team:'CHI'}]};
let query;
const input={leagueId:'dfl',season:2026,week:5,rosterId:2,history:true,teamNames:new Map([['2','Current team name']])};
beforeEach(()=>{
 clearAdviceReceiptsCache();vi.clearAllMocks();
 query={select:vi.fn(),eq:vi.fn(),gte:vi.fn(),lte:vi.fn(),order:vi.fn(),limit:vi.fn(),then:(resolve)=>Promise.resolve({data:[row],error:null}).then(resolve)};
 for(const name of ['select','eq','gte','lte','order','limit'])query[name].mockReturnValue(query);
 mocks.from.mockReturnValue(query);
 mocks.nfl.mockResolvedValue({teams:new Map([['CHI',{key:'final',kickoff:'2026-10-01T17:00:00Z'}]])});
 mocks.stats.mockResolvedValue({data:[{player_id:'in',stats:{rec:20}},{player_id:'out',stats:{rec:5}}],stale:false});
});
describe('advice receipt data',()=>{
 it('scopes history to the selected team, league and last three weeks with current names',async()=>{
  const result=await loadAdviceReceipts(input);
  expect(query.eq.mock.calls).toEqual([['league_id','dfl'],['season',2026],['roster_id',2]]);
  expect(query.gte).toHaveBeenCalledWith('week',3);expect(query.lte).toHaveBeenCalledWith('week',5);
  expect(result.rows[0]).toMatchObject({grade:'hit',actualGain:15,teamName:'Current team name'});
 });
 it('does not score live, missing or future kickoff status',async()=>{
  for(const teams of [new Map(),new Map([['CHI',{key:'live',kickoff:'2026-10-01T17:00:00Z'}]]),new Map([['CHI',{key:'final',kickoff:'2099-10-01T17:00:00Z'}]])]){
   clearAdviceReceiptsCache();mocks.nfl.mockResolvedValue({teams});
   expect((await loadAdviceReceipts(input)).rows[0].actualGain).toBeNull();
  }
  expect(mocks.stats).not.toHaveBeenCalled();
 });
 it('requires final status for every changed player even if the available slate is final',async()=>{
  mocks.nfl.mockResolvedValue({teams:new Map([['KC',{key:'final',kickoff:'2026-10-01T17:00:00Z'}]])});
  expect((await loadAdviceReceipts(input)).rows[0]).toMatchObject({actualGain:null,copy:'A player’s final game status is still unavailable.'});
 });
 it('withholds stale results and fresh provider failures',async()=>{
  mocks.stats.mockResolvedValue({data:[{player_id:'in',stats:{rec:20}}],stale:true});
  expect((await loadAdviceReceipts(input)).rows[0].actualGain).toBeNull();
  clearAdviceReceiptsCache();mocks.nfl.mockRejectedValue(Error('Offline'));
  expect((await loadAdviceReceipts(input)).rows[0]).toMatchObject({actualGain:null,copy:'Fresh game status or final scores could not load.'});
 });
 it('refreshes final scores and does not cache a failed receipt read',async()=>{
  await loadAdviceReceipts(input);await loadAdviceReceipts(input);expect(mocks.from).toHaveBeenCalledTimes(1);
  mocks.stats.mockResolvedValue({data:[{player_id:'in',stats:{rec:3}},{player_id:'out',stats:{rec:10}}],stale:false});
  expect((await loadAdviceReceipts({...input,force:true})).rows[0].grade).toBe('miss');
  expect(mocks.stats).toHaveBeenLastCalledWith(2026,4,{maxAgeMs:0});
  clearAdviceReceiptsCache();query.then=resolve=>Promise.resolve({data:null,error:Error('Unavailable')}).then(resolve);
  await expect(loadAdviceReceipts(input)).rejects.toThrow('Unavailable');
  query.then=resolve=>Promise.resolve({data:[],error:null}).then(resolve);
  expect((await loadAdviceReceipts(input)).rows).toEqual([]);
 });
});
