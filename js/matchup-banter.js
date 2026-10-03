import {headToHead} from './home-slides.js';
// Stable, generated league copy. No quotes attributed to members or invented news.
export function matchupBanter(model,history=[]){
 const past=history.filter(g=>Number(g.season)<Number(model.season)||(Number(g.season)===Number(model.season)&&Number(g.week)<Number(model.week)));
 return model.games.map(game=>{
  const [a,b]=game.sides,h2h=headToHead({matchups:past,meSleeperId:a.uid,oppSleeperId:b.uid});
  const salt=`${model.season}:${model.week}:${game.id}`,seed=[...salt].reduce((n,c)=>n+c.charCodeAt(0),0);
  const openers=['The group chat wants receipts.','Sunday settles the argument.','One matchup. Two very confident managers.','The scoreboard gets the last word.'];
  let line=h2h?.meetings?`${a.name} and ${b.name}: the series is ${h2h.wins}-${h2h.losses}${h2h.ties?`-${h2h.ties}`:''} from ${a.name}’s side.`:`${a.name} vs ${b.name}. Fresh week, fresh bragging rights.`;
  if(h2h?.streak?.count>=2){const holder=h2h.streak.holder==='me'?a:b,challenger=h2h.streak.holder==='me'?b:a;line=`${holder.name} has taken the last ${h2h.streak.count}. ${challenger.name}, time to change the group-chat narrative.`}
  return {id:game.id,isMine:game.isMine,title:`${a.name} vs ${b.name}`,text:`${line} ${openers[seed%openers.length]}`};
 }).sort((a,b)=>Number(b.isMine)-Number(a.isMine));
}
