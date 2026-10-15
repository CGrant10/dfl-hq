import {loadNflGameDay} from './nfl-game-day.js';
import {optimalLineup} from './team-analyzer.js';
import {lineupPreviewsFor} from './trade-workspace.js';
import {tradeNflClub as club,tradeWeekPlayerPool} from './trade-week-forecast.js';

export function tradeWeekSchedule(payload,season,week){
 if(Number(payload?.season?.year)!==Number(season)||Number(payload?.season?.type)!==2||Number(payload?.week?.number)!==Number(week)||payload.events?.length<8)return null;
 const schedule=new Map();
 for(const event of payload.events){
  const sides=event.competitions?.[0]?.competitors||[];
  if(sides.length!==2||sides.some(side=>!side.team?.abbreviation))return null;
  for(let i=0;i<2;i++){
   const team=club(sides[i].team.abbreviation);if(schedule.has(team))return null;
   schedule.set(team,{opponent:club(sides[1-i].team.abbreviation),available:!(/cancel|postpon/i.test(event.status?.type?.name||''))});
  }
 }
 return schedule;
}
export async function loadTradeWeekSchedules(season,week,load=loadNflGameDay){
 if(!Number.isInteger(Number(season))||Number(season)<2020||!Number.isInteger(Number(week))||Number(week)<1)return [];
 const weeks=Array.from({length:Math.max(0,Math.min(4,17-week))},(_,i)=>week+i+1);
 return Promise.all(weeks.map(async week=>{
  try{const data=await load(season,week);return {week,schedule:tradeWeekSchedule(data.payload,season,week)};}catch{return {week,schedule:null};}
 }));
}

// Same seven legal slots in each future week; byes change the usable lineup.
// Opponents are schedule facts, not invented opponent-adjusted projections.
export function tradeWeeklyOutlook(deal,pool,weeks){
 const previews=lineupPreviewsFor(deal,pool);
 return weeks.map(({week,schedule},index)=>({week,available:!!schedule,teams:previews.map((preview,i)=>{
  const players=new Map([...pool,...preview.waiverAdds.map(p=>[p.id,p])]);
  const forecast=tradeWeekPlayerPool(players,schedule,index);
  const after=[...preview.after.map(s=>s.player?.id),...preview.benchAfter.map(p=>p.id)].filter(Boolean);
  const delta=optimalLineup(after,forecast).weeklyPoints-optimalLineup(deal.parties[i].playerIds,forecast).weeklyPoints;
  const incoming=deal.receives[i].map(id=>players.get(id)).filter(Boolean).map(p=>({name:p.name,opponent:!schedule?'Unavailable':schedule.get(club(p.nflTeam))?.opponent||'Bye',risk:!!(p.isOut||p.isRisky)}));
  return {teamId:preview.teamId,delta:Math.round(delta*10)/10,incoming};
 })}));
}
