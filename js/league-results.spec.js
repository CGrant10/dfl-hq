import { describe, expect, it } from 'vitest';
import { reconcileLeagueResults } from './league-results.js';
import { buildLeaguePowerRankings } from './league-trajectory.js';

const teams = ['Grant','Jack-HAMMER','Mike','Klutch'].map((team_name,i) => ({id:String(i+1),roster_id:i+1,sleeper_user_id:`u${i+1}`,team_name,rank:i+1,lineup:{weeklyPoints:100}}));
const finalWeeks = [
  [1,3,150,100,2,4,80,70], [1,2,120,130,3,4,100,90],
  [1,4,180,90,2,3,80,70], [1,3,145.38,101.08,2,4,139.2,121.12],
].flatMap((r,i)=>[0,4].map(n=>({season:2026,week:i+1,roster1:r[n],user1:`u${r[n]}`,score1:r[n+2],roster2:r[n+1],user2:`u${r[n+1]}`,score2:r[n+3]})));
const standings = teams.map(t=>({season:2026,roster_id:t.roster_id,sleeper_user_id:t.sleeper_user_id,wins:t.id==='1'?2:1,losses:t.id==='1'?1:2,ties:0}));
const snapshot = {season:2026,week:4,rosters:teams.map((t,i)=>({roster_id:t.roster_id,owner_id:t.sleeper_user_id,settings:{wins:[3,4,1,0][i],losses:[1,0,3,4][i],ties:0,fpts:[595,429,372,371][i],fpts_decimal:38}})),matchups:[
  {roster_id:1,matchup_id:1,points:145.38},{roster_id:3,matchup_id:1,points:101.08},
  {roster_id:2,matchup_id:2,points:139.2},{roster_id:4,matchup_id:2,points:121.12},
]};

describe('fresh completed league results',()=>{
  it('corrects a provisional loss and stale standings without changing prior weeks',()=>{
    const stale=finalWeeks.map(r=>r.week===4&&r.roster1===1?{...r,score1:80}:r);
    const result=reconcileLeagueResults({season:2026,teams,standings,matchups:stale,snapshot});
    expect(result.matchups.filter(r=>r.week<4)).toEqual(stale.filter(r=>r.week<4));
    const built=buildLeaguePowerRankings({teams,...result,currentWeek:5,season:2026});
    expect(built.boards.at(-1).rows.find(r=>r.id==='1')).toMatchObject({record:'3-1',weeklyScore:145.38});
    expect(built.boards.at(-1).rows[0]).toMatchObject({name:'Jack-HAMMER',record:'4-0'});
    expect(standings[0].wins).toBe(2);
  });
  it('puts the only undefeated team first even if a 3-1 team scored far more',()=>{
    const built=buildLeaguePowerRankings({teams,matchups:finalWeeks,currentWeek:5});
    expect(built.boards.at(-1).rows[0]).toMatchObject({id:'2',record:'4-0'});
  });
  it('uses points to break equal-record ties and retains prior week movement',()=>{
    const built=buildLeaguePowerRankings({teams,matchups:finalWeeks,currentWeek:5});
    const tied=built.boards[1].rows.filter(r=>r.record==='1-0');
    expect(tied.map(r=>r.id)).toEqual(['1','2']);
    expect(built.boards.at(-1).comparison).toBe('vs Week 3');
  });
  it('keeps a complete stored slate when public results are partial or duplicated',()=>{
    for(const matchups of [snapshot.matchups.slice(0,3),[...snapshot.matchups.slice(0,3),snapshot.matchups[0]]]){
      const result=reconcileLeagueResults({season:2026,teams,standings,matchups:finalWeeks,snapshot:{...snapshot,matchups}});
      expect(result.matchups).toBe(finalWeeks);
    }
  });
  it('accepts actual zero and commissioner custom points without inventing missing scores',()=>{
    const changed={...snapshot,matchups:snapshot.matchups.map((r,i)=>i===0?{...r,points:9,custom_points:0}:r)};
    const result=reconcileLeagueResults({season:2026,teams,matchups:finalWeeks,snapshot:changed});
    expect(result.matchups.find(r=>r.week===4&&r.roster1===1).score1).toBe(0);
    const missing={...snapshot,matchups:snapshot.matchups.map((r,i)=>i===0?{...r,points:null}:r)};
    expect(reconcileLeagueResults({season:2026,teams,matchups:finalWeeks,snapshot:missing}).matchups).toBe(finalWeeks);
  });
  it('does not apply records from another season or an unfinished week',()=>{
    expect(reconcileLeagueResults({season:2025,teams,standings,matchups:finalWeeks,snapshot})).toEqual({standings,matchups:finalWeeks});
    const pending={...snapshot,rosters:snapshot.rosters.map(r=>({...r,settings:{...r.settings,wins:2,losses:1}}))};
    expect(reconcileLeagueResults({season:2026,teams,standings,snapshot:pending}).standings).toBe(standings);
    expect(buildLeaguePowerRankings({teams,matchups:finalWeeks,currentWeek:4}).latestWeek).toBe(3);
  });
});
