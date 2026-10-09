import {currentSportsbookNames} from './current-team-names.js';
const id=value=>String(value??'');
const finite=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value));
const round=value=>Math.round(Number(value)*100)/100;
export function weeklyHref(season,week){return `#/clubhouse?season=${Number(season)}&week=${Number(week)}`}
export function buildWeeklyClubhouse(data,members=[],raw=[],players={}){
 const byUser=new Map(members.filter(m=>m.sleeper_user_id).map(m=>[id(m.sleeper_user_id),m])),byId=new Map(members.map(m=>[id(m.id),m]));
 const rosters=new Map(raw.map(row=>[id(row.roster_id),row]));
 const team=(uid,roster,score)=>{const member=byUser.get(id(uid)),actual=rosters.get(id(roster));return{uid,roster,memberId:member?.id,name:member?.team_name||member?.display_name||`Team ${roster}`,score:finite(actual?.points)?round(actual.points):finite(score)?round(score):null}};
 const games=(data.games||[]).map(g=>({...g,left:team(g.user1,g.roster1,g.score1),right:team(g.user2,g.roster2,g.score2)}));
 const scored=games.filter(g=>g.left.score!==null&&g.right.score!==null),decided=scored.filter(g=>g.left.score!==g.right.score).map(g=>({...g,winner:g.left.score>g.right.score?g.left:g.right,loser:g.left.score>g.right.score?g.right:g.left,margin:round(Math.abs(g.left.score-g.right.score))}));
 const awards=[];
 const award=(key,label,winners,detail)=>{if(winners.length)awards.push({key,label,winners,detail})};
 if(data.completed&&scored.length===games.length&&games.length){
  const teams=scored.flatMap(g=>[g.left,g.right]),highest=Math.max(...teams.map(t=>t.score));
  award('high-score','Final boss',teams.filter(t=>t.score===highest),`${highest.toFixed(2)} points`);
  if(decided.length){const biggest=Math.max(...decided.map(g=>g.margin)),closest=Math.min(...decided.map(g=>g.margin));
   award('blowout','Biggest blowout',decided.filter(g=>g.margin===biggest).map(g=>g.winner),`Won by ${biggest.toFixed(2)}`);
   award('escape','Closest escape',decided.filter(g=>g.margin===closest).map(g=>g.winner),`Won by ${closest.toFixed(2)}`);
  }
  const bench=[];
  for(const g of games)for(const t of [g.left,g.right]){const row=rosters.get(id(t.roster));if(!row?.players_points)continue;const starters=new Set((row.starters||[]).map(id));for(const [player,points]of Object.entries(row.players_points)){if(starters.has(player)||!finite(points)||Number(points)<=0)continue;bench.push({...t,player,playerName:players[player]?.n||`Player ${player}`,benchPoints:round(points)})}}
  if(bench.length){const highest=Math.max(...bench.map(t=>t.benchPoints));award('bench','Bench regret',bench.filter(t=>t.benchPoints===highest),`${highest.toFixed(2)} points from a benched player`)}
 }
 const counts=new Map();for(const v of data.votes||[])counts.set(id(v.nominee_id),(counts.get(id(v.nominee_id))||0)+1);
 const max=counts.size?Math.max(...counts.values()):0;
 const clown=[...counts].filter(([,count])=>count===max).map(([memberId])=>{const m=byId.get(memberId);return{memberId:m?.id,name:m?.team_name||m?.display_name||'Member'}});
 if(max&&data.completed&&!data.voteOpen&&data.voteClosed!==false)award('clown','Clown of the Week',clown,`${max} vote${max===1?'':'s'}${clown.length>1?' · tied ballot':''}`);
 return{...data,sportsbook:currentSportsbookNames({recap:data.sportsbook},members).recap,games,awards,counts,clown,clownVotes:max,benchAvailable:raw.length>0&&raw.every(row=>row.players_points),members};
}
export function weeklyRecapLines(model){
 const lines=[`${model.season} · Week ${model.week} · ${model.completed?'Final receipts':'Matchups in progress'}`];
 for(const a of model.awards)lines.push(`${a.label}: ${a.winners.map(w=>w.name+(w.playerName?` (${w.playerName})`:'')).join(' & ')} — ${a.detail}`);
 for(const g of model.games)lines.push(`${g.left.name} ${g.left.score?.toFixed(2)??'—'} · ${g.right.name} ${g.right.score?.toFixed(2)??'—'}`);
 const pickem=(model.pickem||[]).filter(row=>Number(row.rank)===1);for(const row of pickem){const member=model.members.find(m=>id(m.id)===id(row.member_id));lines.push(`Pick’em: ${member?.display_name||'Member'} · ${Number(row.correct)} right`)}
 const book=model.sportsbook?.mostProfitable;if(model.sportsbook?.available&&book)lines.push(`Sportsbook: ${book.display_name} · ${Number(book.net)>0?'+':''}${Number(book.net)} SIN net`);
 for(const post of model.wall||[])lines.push(`Wall receipt: ${post.body} · ${Number(post.reactions)} reactions`);
 return lines;
}
