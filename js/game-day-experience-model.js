import {headToHead} from './home-slides.js';

export const MATCHUP_REACTIONS=[['choke','Choke'],['cooking','Cooking'],['fraud','Fraud watch'],['respect','Respect']];
const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const past=(g,model)=>Number(g.season)<Number(model.season)||(Number(g.season)===Number(model.season)&&Number(g.week)<Number(model.week));

export function matchupEntrance(model,game,history=[]){
 if(!game?.sides?.length)return null;
 const [a,b]=game.sides,h2h=headToHead({matchups:history.filter(g=>past(g,model)&&finite(g.score1)&&finite(g.score2)),meSleeperId:a.uid,oppSleeperId:b.uid});
 const record=h2h?.meetings?`${h2h.wins}–${h2h.losses}${h2h.ties?`–${h2h.ties}`:''} · ${a.name}’s series record`:'First recorded meeting';
 const holder=h2h?.streak?.holder==='me'?a:b;
 const banter=h2h?.streak?.count>=2?`${holder.name} has taken the last ${h2h.streak.count}. The group chat wants a response.`:['One matchup. Two very confident managers.','The scoreboard gets the last word.','Sunday settles the argument.'][(Number(model.week)+Number(game.id||0))%3];
 return {record,banter};
}

// Current performances are labeled as such. Historical records exclude the
// current fixture, unplayed 0–0 rows, and incomplete/non-numeric scores.
export function gameDayReel(model,history=[],members=[]){
 if(!model)return[];
 const slides=model.leaders.slice(0,2).map(p=>({key:`player:${p.roster}:${p.id}`,kind:'This week',headline:`${p.points.toFixed(2)} points`,detail:`${p.name} · ${p.owner}`,player:p}));
 const identity=uid=>members.find(m=>String(m.sleeper_user_id)===String(uid));
 const side=(g,n)=>{const member=identity(g[`user${n}`]);return {name:member?.team_name||member?.display_name||`Roster ${g[`roster${n}`]}`,identity:member||{},score:Number(g[`score${n}`])}};
 const games=history.filter(g=>past(g,model)&&finite(g.score1)&&finite(g.score2)&&(Number(g.score1)!==0||Number(g.score2)!==0)).map(g=>{const a=side(g,1),b=side(g,2);return {season:Number(g.season),week:Number(g.week),a,b,margin:Math.abs(a.score-b.score),winner:a.score>b.score?a:b,loser:a.score>b.score?b:a}});
 if(!games.length)return slides;
 const high=games.flatMap(g=>[g.a,g.b].map(t=>({...t,season:g.season,week:g.week}))).sort((a,b)=>b.score-a.score)[0];
 slides.push({key:'record:high',kind:'All-time scoring high',headline:`${high.score.toFixed(2)} points`,detail:`${high.name} · ${high.season}, Week ${high.week}`,team:high});
 const close=[...games].filter(g=>g.margin>0).sort((a,b)=>a.margin-b.margin)[0];
 if(close)slides.push({key:'record:close',kind:'Closest recorded win',headline:`Won by ${close.margin.toFixed(2)}`,detail:`${close.winner.name} ${close.winner.score.toFixed(2)} – ${close.loser.score.toFixed(2)} ${close.loser.name} · ${close.season}, Week ${close.week}`,team:close.winner});
 const blow=[...games].filter(g=>g.margin>0).sort((a,b)=>b.margin-a.margin)[0];
 if(blow&&blow!==close)slides.push({key:'record:blowout',kind:'Biggest recorded blowout',headline:`${blow.margin.toFixed(2)}-point gap`,detail:`${blow.winner.name} ${blow.winner.score.toFixed(2)} – ${blow.loser.score.toFixed(2)} ${blow.loser.name} · ${blow.season}, Week ${blow.week}`,team:blow.winner});
 const heartbreak=games.filter(g=>g.margin>0).sort((a,b)=>b.loser.score-a.loser.score)[0];
 if(heartbreak)slides.push({key:'record:heartbreak',kind:'Highest-scoring loss',headline:`${heartbreak.loser.score.toFixed(2)} and lost`,detail:`${heartbreak.loser.name} fell to ${heartbreak.winner.name} (${heartbreak.winner.score.toFixed(2)}) · ${heartbreak.season}, Week ${heartbreak.week}`,team:heartbreak.loser});
 return slides;
}

export function matchupReactionScope(model,game){
 if(!model?.leagueId||!game)return null;
 return {league_id:String(model.leagueId),season:Number(model.season),week:Number(model.week),matchup_id:Number(game.id)};
}
