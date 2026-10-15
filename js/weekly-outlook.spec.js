import { describe, expect, it } from "vitest";
import {
  SWAP_THRESHOLD, bestWeeklyLineup, buildWeeklyPool, defenseDifficulty,
  matchupNote, startSitAdvice,
} from "./weekly-outlook.js";

/* Points come straight from scorePlayer, so the fixtures use plain PPR stats
   and assert on relative outcomes rather than exact scoring maths. */
const row = (id, position, { pts = 10, team = "AAA", opponent = "ZZZ", status = null,
                             gp = 1, week = 1 } = {}) => ({
  player_id: id,
  week,
  team,
  opponent,
  injury_status: status,
  player: { first_name: `P${id}`, last_name: position, position },
  /* pts_ppr is not read directly - scorePlayer works off the stat line - so
     the fixture expresses points as receptions, which PPR scores 1:1. */
  stats: { gp, rec: pts, rec_yd: 0 },
});

const poolOf = (rows) => buildWeeklyPool(rows, { rec: 1 });

describe("buildWeeklyPool", () => {
  it("keeps team, opponent and injury status alongside the projection", () => {
    const pool = poolOf([row("1", "RB", { team: "SEA", opponent: "NE", status: "Questionable" })]);
    const player = pool.get("1");
    expect(player.team).toBe("SEA");
    expect(player.opponent).toBe("NE");
    expect(player.isRisky).toBe(true);
    expect(player.isOut).toBe(false);
    expect(player.points).toBeGreaterThan(0);
  });

  /* Real data: of 3,114 week-1 rows only ~400 carry a projection, and those
     are exactly the rows naming an opponent. The rest score 0 against nobody
     and must not be startable. */
  it("treats a row with no opponent and no gp as not scheduled", () => {
    const pool = buildWeeklyPool([{
      player_id: "1", player: { position: "RB", first_name: "No", last_name: "Game" },
      opponent: null, stats: { rec: 0 },
    }], { rec: 1 });
    expect(pool.get("1").hasGame).toBe(false);
    expect(bestWeeklyLineup(["1"], pool).slots.find(s => s.position === "RB").player).toBeNull();
  });

  it("marks ruled-out players out, and gp:0 as no game", () => {
    const pool = poolOf([row("1", "RB", { status: "Out" }), row("2", "WR", { gp: 0 })]);
    expect(pool.get("1").isOut).toBe(true);
    expect(pool.get("2").hasGame).toBe(false);
  });
});

describe("a player with no projection", () => {
  /* The rule that matters most: absent must never be treated as zero. */
  it("is absent from the pool rather than scored zero", () => {
    const pool = poolOf([row("1", "RB")]);
    expect(pool.has("99")).toBe(false);
    expect(pool.get("99")).toBeUndefined();
  });

  it("never displaces a projected starter", () => {
    const pool = poolOf([row("1", "RB", { pts: 4 })]);
    const { slots } = bestWeeklyLineup(["1", "99"], pool);
    const rbs = slots.filter(slot => slot.position === "RB");
    expect(rbs[0].player.id).toBe("1");
    expect(rbs[1].player).toBeNull();
  });
});

describe("bestWeeklyLineup", () => {
  const roster = [
    row("qb1", "QB", { pts: 20 }), row("qb2", "QB", { pts: 12 }),
    row("rb1", "RB", { pts: 18 }), row("rb2", "RB", { pts: 14 }), row("rb3", "RB", { pts: 13 }),
    row("wr1", "WR", { pts: 16 }), row("wr2", "WR", { pts: 11 }),
    row("te1", "TE", { pts: 9 }),
  ];

  it("fills dedicated slots before the flex", () => {
    const pool = poolOf(roster);
    const { slots } = bestWeeklyLineup(roster.map(r => r.player_id), pool);
    const byPosition = slots.filter(s => s.position === "RB").map(s => s.player.id);
    expect(byPosition).toEqual(["rb1", "rb2"]);
    /* rb3 at 13 beats wr2 at 11, so the flex takes him. */
    expect(slots.find(s => s.position === "FLEX").player.id).toBe("rb3");
  });

  it("never starts one player in two slots", () => {
    const pool = poolOf(roster);
    const { slots } = bestWeeklyLineup(roster.map(r => r.player_id), pool);
    const ids = slots.map(s => s.player?.id).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /* Regression: a 12% haircut on "Questionable" reordered the lineup silently
     and started Juwan Johnson (10.43) over Tucker Kraft (10.86) in week 1. A
     flag a human should weigh is not a number the tool may quietly move. */
  it("does not demote a questionable player below a lower projection", () => {
    const pool = poolOf([
      row("kraft", "TE", { pts: 10.86, status: "Questionable" }),
      row("juwan", "TE", { pts: 10.43 }),
    ]);
    const { slots } = bestWeeklyLineup(["kraft", "juwan"], pool);
    expect(slots.find(s => s.position === "TE").player.id).toBe("kraft");
  });

  it("leaves a slot empty rather than starting an out player", () => {
    const pool = poolOf([row("te1", "TE", { pts: 30, status: "Out" })]);
    const { slots } = bestWeeklyLineup(["te1"], pool);
    expect(slots.find(s => s.position === "TE").player).toBeNull();
  });

  it("includes the DFL kicker and defense in the weekly lineup", () => {
    const rows = [row("k1", "K", { pts: 8 }), row("SEA", "DEF", { pts: 9 })];
    const { slots, total } = bestWeeklyLineup(rows.map(item => item.player_id), poolOf(rows));
    expect(slots.find(slot => slot.position === "K").player.id).toBe("k1");
    expect(slots.find(slot => slot.position === "DEF").player.id).toBe("SEA");
    expect(total).toBe(17);
  });
});

describe("startSitAdvice", () => {
  const base = [
    row("qb1", "QB", { pts: 20 }),
    row("rb1", "RB", { pts: 18 }), row("rb2", "RB", { pts: 14 }),
    row("wr1", "WR", { pts: 16 }), row("wr2", "WR", { pts: 11 }),
    row("te1", "TE", { pts: 9 }), row("flex", "RB", { pts: 12 }),
  ];
  const ids = base.map(r => r.player_id);

  it("says nothing when the submitted lineup is already optimal", () => {
    const pool = poolOf(base);
    const advice = startSitAdvice({ playerIds: ids, starterIds: ids, weekly: pool });
    expect(advice.swaps).toEqual([]);
    expect(advice.pointsOnBench).toBeCloseTo(0, 5);
  });

  it("ignores a difference too small to be real", () => {
    const rows = [...base, row("wr3", "WR", { pts: 11 + (SWAP_THRESHOLD - 0.5) })];
    const pool = poolOf(rows);
    const starters = ids;
    const advice = startSitAdvice({ playerIds: [...ids, "wr3"], starterIds: starters, weekly: pool });
    expect(advice.swaps).toEqual([]);
  });

  it("recommends a swap once the margin clears the threshold", () => {
    const rows = [...base, row("wr3", "WR", { pts: 11 + SWAP_THRESHOLD + 2 })];
    const pool = poolOf(rows);
    const advice = startSitAdvice({ playerIds: [...ids, "wr3"], starterIds: ids, weekly: pool });
    expect(advice.swaps.length).toBeGreaterThan(0);
    expect(advice.swaps[0].in.id).toBe("wr3");
    expect(advice.swaps[0].gain).toBeGreaterThanOrEqual(SWAP_THRESHOLD);
  });

  it("flags an out starter regardless of the margin, and marks it urgent", () => {
    const rows = [
      row("qb1", "QB", { pts: 20 }),
      row("rb1", "RB", { pts: 18, status: "Out" }), row("rb2", "RB", { pts: 14 }),
      row("wr1", "WR", { pts: 16 }), row("wr2", "WR", { pts: 11 }),
      row("te1", "TE", { pts: 9 }), row("bench", "RB", { pts: 1 }),
    ];
    const pool = poolOf(rows);
    const starters = ["qb1", "rb1", "rb2", "wr1", "wr2", "te1"];
    const advice = startSitAdvice({
      playerIds: rows.map(r => r.player_id), starterIds: starters, weekly: pool,
    });
    expect(advice.alarms.map(a => a.player.id)).toContain("rb1");
    /* A 1-point replacement is a loss on paper, and still the right call. */
    expect(advice.swaps.some(swap => swap.out.id === "rb1" && swap.urgent)).toBe(true);
  });

  it("reports the points left on the bench", () => {
    const rows = [...base, row("wr3", "WR", { pts: 25 })];
    const pool = poolOf(rows);
    const advice = startSitAdvice({ playerIds: [...ids, "wr3"], starterIds: ids, weekly: pool });
    expect(advice.pointsOnBench).toBeGreaterThan(0);
    expect(advice.bestTotal).toBeGreaterThan(advice.submittedTotal);
  });
});

describe("defenseDifficulty", () => {
  it("ranks the most generous defense first and phrases the matchup", () => {
    const pool = poolOf([
      row("a", "RB", { pts: 30, opponent: "SOFT" }),
      row("b", "WR", { pts: 25, opponent: "SOFT" }),
      row("c", "RB", { pts: 3, opponent: "HARD" }),
      row("d", "WR", { pts: 2, opponent: "HARD" }),
    ]);
    const defense = defenseDifficulty(pool);
    expect(defense.get("SOFT").rank).toBe(1);
    expect(defense.get("HARD").rank).toBe(2);
    expect(matchupNote(pool.get("a"), defense).tone).toBe("great");
    expect(matchupNote(pool.get("c"), defense).tone).toBe("brutal");
  });

  it("has no opinion when the opponent is unknown", () => {
    const pool = poolOf([row("a", "RB", { opponent: null })]);
    expect(matchupNote(pool.get("a"), defenseDifficulty(pool))).toBeNull();
  });
});

describe('actionable weekly decisions',()=>{
 const now=Date.parse('2026-10-15T20:00:00Z');
 const player=(id,position,points,extra={})=>({id,name:id,position,points,hasGame:true,scheduleKnown:true,...extra});
 const advice=(players,starters,positions=['RB','WR','FLEX'])=>startSitAdvice({playerIds:players.map(p=>p.id),starterIds:starters,rosterPositions:positions,weekly:new Map(players.map(p=>[p.id,p])),now});
 it('locks both starters and bench players after kickoff',()=>{
  const early={kickoff:'2026-10-15T19:00:00Z'};
  const result=advice([player('rb','RB',10,early),player('wr','WR',10),player('flex','WR',10),player('bench','RB',25),player('played','WR',30,early)],['rb','wr','flex']);
  expect(result.lockedCount).toBe(1);expect(result.swaps.every(s=>s.in.id!=='played'&&s.out.id!=='rb')).toBe(true);
  expect(result.lineup.slots[0].player.id).toBe('rb');
 });
 it('keeps unprojected starters in place and reports missing data',()=>{
  const result=advice([player('rb','RB',null),player('bench','RB',25)],['rb'],['RB']);
  expect(result.unknownStarters.map(p=>p.id)).toEqual(['rb']);expect(result.completeEstimate).toBe(false);expect(result.swaps).toHaveLength(0);
 });
 it('allows a legal FLEX reshuffle instead of an illegal position swap',()=>{
  const result=advice([player('rb','RB',8),player('wr','WR',18),player('flex','RB',15),player('bench','WR',20)],['rb','wr','flex']);
  expect(result.swaps).toHaveLength(1);expect(result.swaps[0]).toMatchObject({in:{id:'bench'},out:{id:'rb'},slot:'WR'});
  expect(result.swaps[0].reassign).toContainEqual(expect.objectContaining({player:expect.objectContaining({id:'flex'}),to:'RB'}));
 });
 it('never replaces the sole tight end with a higher-scoring receiver',()=>{
  const result=advice([player('te','TE',5),player('bench','WR',30)],['te'],['TE']);expect(result.swaps).toHaveLength(0);
 });
 it('uses a healthy, later and legal injury backup outside the final starters',()=>{
  const result=advice([player('old','RB',7),player('risk','RB',20,{isRisky:true,injuryStatus:'Questionable',kickoff:'2026-10-18T20:00:00Z'}),player('early','RB',16,{kickoff:'2026-10-18T17:00:00Z'}),player('late','RB',14,{kickoff:'2026-10-19T00:00:00Z'})],['old'],['RB']);
  expect(result.swaps[0]).toMatchObject({call:'Start if active',confidence:'conditional',backup:{id:'late'}});
 });
 it('replaces a confirmed inactive player without requiring a projected gain',()=>{
  const result=advice([player('out','RB',25,{isOut:true,injuryStatus:'Out'}),player('replacement','RB',4)],['out'],['RB']);
  expect(result.swaps[0]).toMatchObject({urgent:true,call:'Replace now',in:{id:'replacement'}});
 });
 it('does not overstate a tiny projection difference',()=>{
  expect(advice([player('starter','RB',10),player('bench','RB',11.4)],['starter'],['RB']).swaps).toHaveLength(0);
 });
 it('refreshes current team and injury status without inventing projections',()=>{
  const players=new Map([['1',{name:'Current Name',position:'RB',nflTeam:'KC',injuryStatus:null}],['missing',{name:'Pending',position:'WR'}]]);
  const pool=buildWeeklyPool([row('1','RB',{team:'SEA',status:'Out'})],{rec:1},{players});
  expect(pool.get('1')).toMatchObject({name:'Current Name',team:'KC',isOut:false});expect(pool.get('missing').points).toBeNull();
 });
});
it('repairs multiple inactive starters without blocking each other’s moves',()=>{
 const entries=[{id:'out1',position:'RB',points:20,isOut:true,injuryStatus:'Out'},{id:'out2',position:'WR',points:20,isOut:true,injuryStatus:'Out'},{id:'rb',position:'RB',points:8},{id:'wr',position:'WR',points:9}].map(p=>({...p,name:p.id,hasGame:true,scheduleKnown:true}));
 const result=startSitAdvice({playerIds:entries.map(p=>p.id),starterIds:['out1','out2'],rosterPositions:['RB','WR'],weekly:new Map(entries.map(p=>[p.id,p]))});
 expect(result.swaps).toHaveLength(2);expect(result.swaps.every(s=>s.urgent)).toBe(true);
});
it('respects a current reserve designation even when the weekly row has no injury tag',()=>{
 const players=new Map([['ir',{name:'Reserve player',position:'RB',nflTeam:'KC',injuryStatus:null,isOut:true}]]);
 const pool=buildWeeklyPool([row('ir','RB')],{rec:1},{players});expect(pool.get('ir').isOut).toBe(true);
});
