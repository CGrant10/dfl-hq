import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({players:vi.fn(),rows:vi.fn(),nfl:vi.fn()}));
vi.mock('./sleeper.js',()=>({loadPlayers:mocks.players}));
vi.mock('./weekly-clubhouse-data.js',()=>({loadWeeklyRosters:mocks.rows}));
vi.mock('./nfl-game-day.js',()=>({loadNflGameDay:mocks.nfl}));
import {loadFantasyBookResults} from './sportsbook-fantasy-data.js';
beforeEach(()=>{vi.resetAllMocks();mocks.players.mockResolvedValue({});mocks.rows.mockResolvedValue([]);mocks.nfl.mockResolvedValue({fetchedAt:Date.now(),teams:new Map()});});
const client=()=>{const q={select:vi.fn(()=>q),in:vi.fn(()=>q),abortSignal:vi.fn(()=>q),then:resolve=>resolve({data:[{season:2026,sleeper_league_id:'league'}],error:null})};return{from:vi.fn(()=>q),rpc:vi.fn()}};
describe('read-only fantasy result loading',()=>{
 it('does no extra work for provider, settled or future lines',async()=>{
  const db=client();expect(await loadFantasyBookResults(db,[{id:1,auto_key:'matchup:2026:7:1',status:'open',closes_at:new Date(Date.now()+3600000).toISOString()},{id:2,category:'Player Props'},{id:3,auto_key:'matchup:2026:7:1',status:'settled'}])).toEqual(new Map());expect(db.from).not.toHaveBeenCalled();expect(mocks.players).not.toHaveBeenCalled();
 });
 it('groups matchup requests by week, uses fresh score reads and reuses compact player metadata',async()=>{
  const db=client(),markets=[1,2].map(id=>({id,auto_key:`matchup:2026:7:${id}`,status:'locked'}));await loadFantasyBookResults(db,markets,{force:true});
  expect(mocks.rows).toHaveBeenCalledExactlyOnceWith('league',7,{maxAgeMs:0});expect(mocks.nfl).toHaveBeenCalledExactlyOnceWith(2026,7,{force:true});expect(mocks.players).toHaveBeenCalledExactlyOnceWith({maxAgeMs:300000});expect(db.rpc).not.toHaveBeenCalled();
 });
 it('does not present a cached final after an NFL status request fails',async()=>{
  const db=client(),markets=[{id:1,auto_key:'matchup:2026:8:1',status:'locked'}];mocks.nfl.mockRejectedValueOnce(Error('offline'));expect(await loadFantasyBookResults(db,markets,{force:true})).toEqual(new Map());expect(db.rpc).not.toHaveBeenCalled();
 });
});
