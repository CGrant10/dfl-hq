export const tradeNflClub=value=>({JAC:'JAX',WSH:'WAS',LA:'LAR'}[value]||value);

// Schedule facts change availability, not player talent or opponent strength.
export function tradeWeekPlayerPool(pool,schedule,index){
 return new Map([...pool].map(([id,p])=>{
  const game=schedule?.get(tradeNflClub(p.nflTeam));
  const bye=!!schedule&&!game&&p.nflTeam&&p.nflTeam!=='FA';
  const missed=Number(p.estimatedMissedGames)||0;
  const injuryFactor=p.isOut||p.isRisky?Math.max(0,Math.min(1,index+1-missed)):1;
  const pace=p.outForSeason?0:Number(p.forwardPerGame??p.tradePerGame??p.expectedPerGame??Number(p.expectedPoints)/17)||0;
  return [id,{...p,expectedPoints:pace*17*(bye||game?.available===false?0:injuryFactor)}];
 }));
}
