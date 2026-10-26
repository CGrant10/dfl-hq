import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tableRows = {
    sleeper_leagues: [{ sleeper_league_id: "league", season: 2026, scoring_settings: {} }],
    sleeper_rosters: [
      { season: 2026, roster_id: 1, sleeper_user_id: "a", players: ["p1"], starters: ["p1"] },
      { season: 2026, roster_id: 2, sleeper_user_id: "b", players: ["p2"], starters: ["p2"] },
    ],
    sleeper_matchups: [],
  };
  const from = vi.fn((table) => {
    const builder = {
      select: () => builder, order: () => builder, limit: () => builder,
      eq: () => builder, lte: () => builder,
      then(resolve, reject) { return Promise.resolve({ data: tableRows[table] || [], error: null }).then(resolve, reject); },
    };
    return builder;
  });
  return { tableRows, from, buildPool:vi.fn(()=>new Map()), loadPlayers: vi.fn(async () => ({ p1: {}, p2: {} })) };
});

vi.mock("./nfl-game-day.js",()=>({loadNflGameDay:vi.fn(async()=>({teams:new Map()}))}));
vi.mock("./supabase.js", () => ({ db: () => ({ from: mocks.from }) }));
vi.mock('./expert-rankings-data.js',()=>({loadExpertRankings:vi.fn(async()=>({status:'Unavailable',players:[]}))}));
vi.mock("./members.js", () => ({ loadMemberDirectory: vi.fn(async () => [
  { id: 1, sleeper_user_id: "a", display_name: "A", active: true },
  { id: 2, sleeper_user_id: "b", display_name: "B", active: true },
]) }));
vi.mock("./sleeper.js", () => ({
  loadPlayers: mocks.loadPlayers,
  sleeper: { league:vi.fn(async()=>null),users:vi.fn(async()=>[]),rosters: vi.fn(async () => []), matchups: vi.fn(async () => []) },
  loadSeasonStats: vi.fn(async () => ({ data: {}, fetchedAt: 1 })),
  loadMarketAdp: vi.fn(async () => ({ data: [], fetchedAt: 1 })),
  loadNflState: vi.fn(async () => ({ data: { season: 2026, season_type: "regular", week: 3 }, fetchedAt: 1 })),
  loadWeeklyProjections: vi.fn(async () => ({ data: [], fetchedAt: 1 })),
  loadWeeklyStats: vi.fn(async () => ({ data: [], fetchedAt: 1 })),
  loadTrendingPlayers: vi.fn(async () => ({ adds: new Map(), drops: new Map(), fetchedAt: 1 })),
}));
vi.mock("./league-state.js", () => ({
  loadLeagueState: vi.fn(async () => ({ season: 2026, currentWeek: 3 })),
}));
vi.mock("./dfl-scoring.js", () => ({ scoringFormat: () => "ppr" }));
vi.mock("./team-analyzer.js", () => ({
  buildPlayerPool: mocks.buildPool,
  analyzeLeague: ({ rosters }) => rosters.map(roster => ({ ...roster })),
}));

import {loadNflGameDay} from "./nfl-game-day.js";
import { sleeper, loadSeasonStats, loadWeeklyStats, loadWeeklyProjections, loadMarketAdp } from "./sleeper.js";
import {loadExpertRankings} from './expert-rankings-data.js';
import { loadMemberDirectory } from "./members.js";
import { clearAnalyzerDataCache, loadAnalyzerData } from "./team-analyzer-data.js";

describe("shared analyzer model", () => {
  beforeEach(()=>{clearAnalyzerDataCache();vi.clearAllMocks();});
  const liveLeague=()=>({league_id:'league',season:2026,total_rosters:2,scoring_settings:{rec:1},roster_positions:['QB','RB','RB','WR','WR','TE','FLEX','K','DEF','BN']});
  const freshRosters=()=>[{roster_id:1,owner_id:'a',players:['p1'],starters:['p1']},{roster_id:2,owner_id:'b',players:['p2'],starters:['p2']}];
  it('bounds current stats and availability to a minute, metadata and projections to five minutes',async()=>{
    clearAnalyzerDataCache();loadSeasonStats.mockClear();loadWeeklyProjections.mockClear();
    await loadAnalyzerData();
    expect(loadSeasonStats).toHaveBeenCalledWith(2026,{maxAgeMs:60000});
    expect(loadWeeklyProjections).toHaveBeenCalledWith(2026,3,{maxAgeMs:60000});
    expect(mocks.loadPlayers).toHaveBeenCalledWith({maxAgeMs:300000});
    expect(loadMarketAdp).toHaveBeenCalledWith(2026,'ppr',{maxAgeMs:300000});
    expect(loadExpertRankings).toHaveBeenLastCalledWith({season:2026,scoring:'ppr'},{force:false,maxAgeMs:60000});
  });
  it('fetches current stats, injuries and expert facts together before a final trade check',async()=>{
    clearAnalyzerDataCache();sleeper.league.mockResolvedValueOnce(liveLeague());sleeper.rosters.mockResolvedValueOnce(freshRosters());
    loadSeasonStats.mockClear();loadExpertRankings.mockClear();
    const data=await loadAnalyzerData({freshTrade:true});
    expect(loadSeasonStats).toHaveBeenCalledWith(2026,{maxAgeMs:0});
    expect(loadWeeklyProjections).toHaveBeenLastCalledWith(2026,3,{maxAgeMs:0});
    expect(loadExpertRankings).toHaveBeenLastCalledWith({season:2026,scoring:'ppr'},{force:true,maxAgeMs:60000});
    expect(loadMarketAdp).toHaveBeenLastCalledWith(2026,'ppr',{maxAgeMs:0});
    expect(mocks.loadPlayers).toHaveBeenLastCalledWith({maxAgeMs:0});
    expect(data.leagueFormat.verified).toBe(true);
  });
  it('blocks final sharing when a current-stat refresh falls back to stale data',async()=>{
    clearAnalyzerDataCache();sleeper.league.mockResolvedValueOnce(liveLeague());sleeper.rosters.mockResolvedValueOnce(freshRosters());
    loadSeasonStats.mockImplementationOnce(async()=>({data:{},fetchedAt:1})).mockImplementationOnce(async()=>({data:{},fetchedAt:1,stale:true}));
    await expect(loadAnalyzerData({freshTrade:true})).rejects.toThrow('current player stats');
  });
  it("shares in-flight work and refreshes after explicit invalidation", async () => {
    const [first, second] = await Promise.all([loadAnalyzerData(), loadAnalyzerData()]);
    expect(second).toBe(first);
    expect(mocks.from.mock.calls.filter(([table]) => table === "sleeper_leagues")).toHaveLength(1);
    expect(mocks.loadPlayers).toHaveBeenCalledTimes(1);

    clearAnalyzerDataCache();
    await loadAnalyzerData();
    expect(mocks.from.mock.calls.filter(([table]) => table === "sleeper_leagues")).toHaveLength(2);
    expect(mocks.loadPlayers).toHaveBeenCalledTimes(2);
  });
  it("loads every completed week and reads current scores separately from completed samples", async()=>{
    clearAnalyzerDataCache();loadWeeklyStats.mockClear();
    const data=await loadAnalyzerData();
    expect(loadWeeklyStats.mock.calls.map(args=>args[1])).toEqual([1,2,3]);
    expect(data.completedWeeks).toBe(2);
    expect(data.expertConsensus.status).toBe('Unavailable');
  });
  it("reports failed availability separately from newer production", async()=>{
    clearAnalyzerDataCache();
    loadWeeklyProjections.mockResolvedValueOnce({data:[],fetchedAt:0,stale:true});
    const data=await loadAnalyzerData();
    expect(data.availabilityUpdatedAt).toBe(0);
    expect(data.staleSources).toContain('Availability');
    expect(data.productionUpdatedAt).toBe(1);
  });
  it("uses synced roster names ahead of profile names when current Sleeper names are unavailable", async () => {
    clearAnalyzerDataCache();
    mocks.tableRows.sleeper_rosters[0].team_name = "Old synced team";
    mocks.tableRows.sleeper_rosters[0].display_name = "Old owner";
    mocks.tableRows.sleeper_rosters[1].team_name = "Unmapped team";
    mocks.tableRows.sleeper_rosters[1].display_name = "Unmapped owner";
    loadMemberDirectory.mockResolvedValueOnce([{id:1,sleeper_user_id:"a",team_name:"Current team",display_name:"Current owner"}]);
    const data = await loadAnalyzerData();
    expect(data.teams[0]).toMatchObject({team_name:"Old synced team",ownerName:"Current owner"});
    expect(data.teams[1]).toMatchObject({team_name:"Unmapped team",ownerName:"Unmapped owner"});
    expect(mocks.tableRows.sleeper_rosters[0].team_name).toBe("Old synced team");
    clearAnalyzerDataCache();
    loadMemberDirectory.mockResolvedValueOnce([{id:1,sleeper_user_id:"a",display_name:"Directory owner"}]);
    const withoutTeamName = await loadAnalyzerData();
    expect(withoutTeamName.teams[0].team_name).toBe("Old synced team");
  });
  it("refreshes names and scoring from current Sleeper data",async()=>{
    clearAnalyzerDataCache();
    sleeper.league.mockResolvedValueOnce({league_id:'league',season:2026,total_rosters:2,scoring_settings:{rec:1},roster_positions:['QB','RB','RB','WR','WR','TE','FLEX','K','DEF','BN']});
    sleeper.users.mockResolvedValueOnce([{user_id:'a',metadata:{team_name:'Latest A '}},{user_id:'b',metadata:{team_name:'Latest B'}}]);
    const data=await loadAnalyzerData();
    expect(data.teams[0].team_name).toBe('Latest A');expect(data.teams[1].team_name).toBe('Latest B');
    expect(data.league.scoring_settings.rec).toBe(1);expect(data.leagueFormat).toMatchObject({teams:2,verified:true});
    expect(data.teamNamesSource).toBe('Current Sleeper');expect(data.staleSources).not.toContain('Team names');
    expect(loadMemberDirectory).toHaveBeenLastCalledWith();
    clearAnalyzerDataCache();sleeper.users.mockResolvedValueOnce([{user_id:'a',metadata:{team_name:'Renamed A'}},{user_id:'b',metadata:{team_name:'Latest B'}}]);
    expect((await loadAnalyzerData()).teams[0].team_name).toBe('Renamed A');
  });
  it("discloses failed live reads while keeping synced tools usable",async()=>{
    clearAnalyzerDataCache();sleeper.users.mockRejectedValueOnce(new Error('unavailable'));sleeper.league.mockRejectedValueOnce(new Error('unavailable'));
    const data=await loadAnalyzerData();expect(data.staleSources).toEqual(expect.arrayContaining(['Team names','League settings']));
    expect(data.leagueFormat.verified).toBe(false);expect(data.teamNamesSource).toBe('Synced roster');
  });
  it("rejects partial rosters that would misprice a 12-team league as two teams",async()=>{
    clearAnalyzerDataCache();sleeper.league.mockResolvedValueOnce({league_id:'league',season:2026,total_rosters:12});
    await expect(loadAnalyzerData()).rejects.toThrow('roster count');
  });

  it('refreshes current rosters, stats, and availability on the visible-page update path',async()=>{
    sleeper.league.mockResolvedValueOnce(liveLeague());sleeper.rosters.mockResolvedValueOnce(freshRosters());
    await loadAnalyzerData({liveRefresh:true});
    expect(loadSeasonStats).toHaveBeenCalledWith(2026,{maxAgeMs:60000});
    expect(loadWeeklyProjections).toHaveBeenCalledWith(2026,3,{maxAgeMs:60000});
    expect(mocks.loadPlayers).toHaveBeenLastCalledWith({maxAgeMs:300000});
    expect(loadMarketAdp).toHaveBeenLastCalledWith(2026,'ppr',{maxAgeMs:300000});
    expect(loadExpertRankings).toHaveBeenLastCalledWith({season:2026,scoring:'ppr'},{force:false,maxAgeMs:60000});
    expect(sleeper.rosters).toHaveBeenCalledWith('league');
    expect(loadNflGameDay).toHaveBeenLastCalledWith(2026,3,{force:true});
  });
  it('adds a verified individual final to recent form before the league week advances',async()=>{
    const row={player_id:'p1',season:2026,week:3,season_type:'regular',team:'JAX',stats:{gp:1,rec:6}};
    loadWeeklyStats.mockImplementation(async(_season,week)=>({data:week===3?[row]:[],fetchedAt:1}));
    loadNflGameDay.mockResolvedValueOnce({teams:new Map([['JAX',{key:'final'}]])});
    await loadAnalyzerData();
    expect(mocks.buildPool).toHaveBeenLastCalledWith(expect.objectContaining({recentStats:[[],[],[row]],seasonWeeklyStats:[[],[],[row]]}));
    loadWeeklyStats.mockResolvedValue({data:[],fetchedAt:1});
  });

});
