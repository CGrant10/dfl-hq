import {sleeper,loadPlayers,loadWeeklyProjections} from './sleeper.js';
import {loadNflGameDay} from './nfl-game-day.js';
import {buildWeeklyPool} from './weekly-outlook.js';
import {buildWaiverPlan} from './waiver-coach.js';
import {gameDayLineup} from './game-day-model.js';
import {lineupRescuePlan} from './lineup-alert-model.js';
import {matchesDflStartingSlots} from './analyzer-league-context.js';
import {loadWaiverHistory,clearWaiverHistoryCache} from './waiver-history-data.js';
import {buildWaiverIntelligence} from './waiver-intelligence.js';
const cache=new Map();
export function clearRosterCoachCache(){cache.clear();clearWaiverHistoryCache();}
globalThis.addEventListener?.('dfl:quick-sync-complete',clearRosterCoachCache);
export function loadRosterCoachSnapshot(leagueId,season,week){
  const key=`${leagueId}:${season}:${week}`,hit=cache.get(key);if(hit&&Date.now()-hit.at<60000)return hit.value;
  const value=(async()=>{
    const results=await Promise.allSettled([sleeper.league(leagueId),sleeper.rosters(leagueId),sleeper.matchups(leagueId,week),loadPlayers({maxAgeMs:300000}),loadNflGameDay(season,week),sleeper.users(leagueId),loadWaiverHistory({leagueId,season,week}),
      ...Array.from({length:Math.min(3,19-week)},(_,i)=>loadWeeklyProjections(season,week+i,{maxAgeMs:60000}))]);
    const get=i=>results[i].status==='fulfilled'?results[i].value:null;
    const league=get(0),rosters=get(1),rows=get(2),players=get(3),nfl=get(4);
    if(!league||Number(league.season)!==Number(season)||!Array.isArray(rosters)||!Array.isArray(rows)||!players||!matchesDflStartingSlots(league.roster_positions))throw Error('Fresh league rosters unavailable');
    const weekly=results.slice(7).flatMap((r,i)=>r.status==='fulfilled'&&r.value.data?.length&&!r.value.stale?[{week:week+i,pool:buildWeeklyPool(r.value.data,league.scoring_settings),fetchedAt:r.value.fetchedAt}]:[]);
    if(weekly[0]?.week!==week)throw Error('Fresh weekly projections unavailable');
    return {league,rosters,rows,players,nfl,weekly,users:get(5),history:get(6),checkedAt:Date.now()};
  })().catch(error=>{cache.delete(key);throw error});cache.set(key,{at:Date.now(),value});return value;
}
export async function loadRosterCoach({data,team,season,week}){
  const snapshot=await loadRosterCoachSnapshot(data.league.sleeper_league_id,season,week);
  const {league,rosters,rows,players,nfl,weekly}=snapshot;
  const roster=rosters.find(r=>String(r.roster_id)===String(team.id)),row=rows.find(r=>String(r.roster_id)===String(team.id));
  if(!roster||!row)throw Error('This team’s current lineup is unavailable');
  const submitted=rosters.map(r=>({...r,starters:rows.find(row=>String(row.roster_id)===String(r.roster_id))?.starters||r.starters}));
  const teamNames=new Map(rosters.map(r=>{
    const user=(Array.isArray(snapshot.users)?snapshot.users:[]).find(u=>String(u.user_id)===String(r.owner_id));
    return [String(r.roster_id),user?.metadata?.team_name||user?.display_name||data.teams?.find(t=>String(t.id)===String(r.roster_id))?.team_name||`Team ${r.roster_id}`];
  }));
  const basePlan=buildWaiverPlan({rosters:submitted,rosterId:team.id,weekly,schedule:nfl?.teams,values:data.pool,players,league});
  const plan=buildWaiverIntelligence({plan:basePlan,history:snapshot.history,rosters:submitted,weekly,schedule:nfl?.teams,players,teamNames,league,season,week});
  const live=gameDayLineup({...row,players:roster.players},players,nfl?.teams,{rosterPositions:league.roster_positions});
  const rescue=lineupRescuePlan({...live,bench:live.bench.map(p=>({...p,activeRoster:![...(roster.reserve||[]),...(roster.taxi||[])].map(String).includes(p.id),projection:weekly[0].pool.get(p.id)?.points}))});
  return {...snapshot,plan,rescue};
}
