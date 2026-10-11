// The server polls often, but only pulls full league data at the useful cadence.
/** @param {{state?:any,league?:any,schedule?:Map<any,any>,now?:number}} input */
export function backgroundSyncPolicy({state,league,schedule=new Map(),now=Date.now()}={}) {
  const season=Number(state?.season),week=Number(state?.week);
  if(state?.season_type!=='regular'||!Number.isInteger(week)||week<1||week>18||Number(league?.season)!==season||league?.status!=='in_season')return {enabled:false,mode:'inactive'};
  const games=[...schedule.values()];
  if(games.some(g=>g.key==='live'))return {enabled:true,mode:'live',intervalMs:5*60000};
  if(games.some(g=>g.key==='upcoming'&&Date.parse(g.kickoff)>now&&Date.parse(g.kickoff)-now<=3600000))return {enabled:true,mode:'kickoff',intervalMs:15*60000};
  // Six hours covers games running long and the first official result pass.
  if(games.some(g=>g.key==='final'&&now-Date.parse(g.kickoff)>=0&&now-Date.parse(g.kickoff)<=6*3600000))return {enabled:true,mode:'results',intervalMs:15*60000};
  return {enabled:true,mode:'rosters',intervalMs:3600000};
}
