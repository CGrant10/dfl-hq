import {sleeper,loadPlayers,loadWeeklyProjections} from './sleeper.js';
import {loadNflGameDay} from './nfl-game-day.js';
import {buildWeeklyPool} from './weekly-outlook.js';
import {buildWaiverPlan} from './waiver-coach.js';
import {gameDayLineup} from './game-day-model.js';
import {lineupRescuePlan} from './lineup-alert-model.js';
import {matchesDflStartingSlots} from './analyzer-league-context.js';
const cache=new Map();
globalThis.addEventListener?.('dfl:quick-sync-complete',()=>cache.clear());
function read(leagueId,season,week){
  const key=`${leagueId}:${season}:${week}`,hit=cache.get(key);if(hit&&Date.now()-hit.at<60000)return hit.value;
  const value=(async()=>{
    const results=await Promise.allSettled([sleeper.league(leagueId),sleeper.rosters(leagueId),sleeper.matchups(leagueId,week),loadPlayers({maxAgeMs:300000}),loadNflGameDay(season,week),
      ...Array.from({length:Math.min(3,19-week)},(_,i)=>loadWeeklyProjections(season,week+i,{maxAgeMs:60000}))]);
    const get=i=>results[i].status==='fulfilled'?results[i].value:null;
    const league=get(0),rosters=get(1),rows=get(2),players=get(3),nfl=get(4);
    if(!league||Number(league.season)!==Number(season)||!Array.isArray(rosters)||!Array.isArray(rows)||!players||!matchesDflStartingSlots(league.roster_positions))throw Error('Fresh league rosters unavailable');
    const weekly=results.slice(5).flatMap((r,i)=>r.status==='fulfilled'&&r.value.data?.length&&!r.value.stale?[{week:week+i,pool:buildWeeklyPool(r.value.data,league.scoring_settings),fetchedAt:r.value.fetchedAt}]:[]);
    if(weekly[0]?.week!==week)throw Error('Fresh weekly projections unavailable');
    return {league,rosters,rows,players,nfl,weekly,checkedAt:Date.now()};
  })().catch(error=>{cache.delete(key);throw error});cache.set(key,{at:Date.now(),value});return value;
}
export async function loadRosterCoach({data,team,season,week}){
  const snapshot=await read(data.league.sleeper_league_id,season,week);
  const {league,rosters,rows,players,nfl,weekly}=snapshot;
  const roster=rosters.find(r=>String(r.roster_id)===String(team.id)),row=rows.find(r=>String(r.roster_id)===String(team.id));
  if(!roster||!row)throw Error('This team’s current lineup is unavailable');
  const plan=buildWaiverPlan({rosters:rosters.map(r=>({...r,starters:rows.find(row=>String(row.roster_id)===String(r.roster_id))?.starters||r.starters})),rosterId:team.id,weekly,schedule:nfl?.teams,values:data.pool,league});
  const live=gameDayLineup({...row,players:roster.players},players,nfl?.teams,{rosterPositions:league.roster_positions});
  const rescue=lineupRescuePlan({...live,bench:live.bench.map(p=>({...p,activeRoster:![...(roster.reserve||[]),...(roster.taxi||[])].map(String).includes(p.id),projection:weekly[0].pool.get(p.id)?.points}))});
  return {...snapshot,plan,rescue};
}
