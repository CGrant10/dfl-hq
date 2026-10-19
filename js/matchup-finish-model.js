const points=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Math.round(Number(value)*100):null;

// A finished NFL player or a temporary live lead is not a settled fantasy result.
export function matchupFinish(model,game){
 if(model?.completed!==true||!model.leagueId||!model.season||!model.week||game?.id==null||game.sides?.length!==2)return null;
 const scores=game.sides.map(team=>points(team.score));if(scores.some(value=>value===null))return null;
 const difference=scores[0]-scores[1],margin=Math.abs(difference)/100;
 const winner=difference===0?null:difference>0?0:1,kind=winner===null?'tie':margin<=1?'clutch':margin<5?'close':margin>=30?'blowout':'win';
 const winnerName=winner===null?'':game.sides[winner].name;
 const loserName=winner===null?'':game.sides[1-winner].name;
 const label={tie:'Dead even',clutch:'Stole it by',close:'Escaped by',blowout:'An absolute beating',win:'Win secured'}[kind];
 const roast=kind==='tie'?'Two teams. Zero fucking bragging rights.'
  :kind==='clutch'?`${loserName}, that decimal is going to haunt your ass.`
  :kind==='close'?`${winnerName}, put the fucking parade away. You barely survived.`
  :kind==='blowout'?`${loserName} brought a lineup to a fucking demolition.`
  :`${winnerName} gets the win. ${loserName} gets to explain that shit.`;
 return {key:JSON.stringify([String(model.leagueId),Number(model.season),Number(model.week),String(game.id)]),kind,winner,margin,label,roast,
  sides:game.sides.map((team,index)=>({...team,score:scores[index]/100})),season:model.season,week:model.week,
  announcement:`Final. ${game.sides.map((team,index)=>`${team.name}: ${(scores[index]/100).toFixed(2)}`).join('. ')}. ${winner===null?'Finished level.':`${winnerName} won by ${margin.toFixed(2)}.`}`};
}

export function finishSeenKey(result,owner='guest'){return JSON.stringify([String(owner||'guest'),result.key])}
