import { describe, expect, it, vi } from "vitest";

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
  return { tableRows, from, loadPlayers: vi.fn(async () => ({ p1: {}, p2: {} })) };
});

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
  buildPlayerPool: () => new Map(),
  analyzeLeague: ({ rosters }) => rosters.map(roster => ({ ...roster })),
}));

import { sleeper, loadWeeklyStats, loadWeeklyProjections } from "./sleeper.js";
import { loadMemberDirectory } from "./members.js";
import { clearAnalyzerDataCache, loadAnalyzerData } from "./team-analyzer-data.js";

describe("shared analyzer model", () => {
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
  it("loads every completed week while excluding the in-progress week", async()=>{
    clearAnalyzerDataCache();loadWeeklyStats.mockClear();
    const data=await loadAnalyzerData();
    expect(loadWeeklyStats.mock.calls.map(args=>args[1])).toEqual([1,2]);
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

});
