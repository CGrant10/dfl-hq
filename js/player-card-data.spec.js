import {afterEach,expect,it,vi} from 'vitest';
import {loadPlayerCard} from './player-card-data.js';
import {loadSeasonStats} from './sleeper.js';
vi.mock('./supabase.js',()=>({db:()=>({from:table=>{const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,then:resolve=>resolve({data:table==='sleeper_leagues'?[{season:2026,sleeper_league_id:'league',scoring_settings:{rec:1}}]:[],error:null})};return q}})}));
vi.mock('./sleeper.js',()=>({loadPlayers:async()=>({'7564':{n:'Chase',p:'WR',t:'CIN'}}),loadWeeklyStats:async()=>({data:[]}),loadSeasonStats:vi.fn()}));
vi.mock('./league-state.js',()=>({loadLeagueState:async()=>({season:2026,currentWeek:6})}));
vi.mock('./members.js',()=>({loadMemberDirectory:async()=>[],currentMember:()=>null}));
vi.mock('./injury-report-data.js',()=>({loadNflInjuries:async()=>null}));
afterEach(()=>vi.clearAllMocks());
it('returns usable player details without waiting for optional season totals',async()=>{
 let release;loadSeasonStats.mockReturnValue(new Promise(resolve=>release=resolve));const average=vi.fn();
 const card=await loadPlayerCard({id:'7564'},null,{onSeasonAverage:average});
 expect(card.player.name).toBe('Chase');expect(card.seasonAverage).toBeNull();expect(average).not.toHaveBeenCalled();
 release({data:{'7564':{gp:5,pts_ppr:100}}});await Promise.resolve();await Promise.resolve();
 expect(average).toHaveBeenCalledWith({value:20,games:5,stale:false});
});
it('does not attach current season totals to an archived week',async()=>{
 const card=await loadPlayerCard({id:'7564'},{season:2026,week:2});
 expect(card.week).toBe(2);expect(card.seasonAverage).toBeNull();expect(loadSeasonStats).not.toHaveBeenCalled();
});
