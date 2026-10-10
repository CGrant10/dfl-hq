import {matchupPhase} from './clubhouse-matchup-model.js';
import {spotlightStats} from './player-spotlight-model.js';
import {matchupPlayerPairs} from './game-day-lineup-comparison.js';

const numeric=v=>v!=null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const rounded=v=>Math.round(v*100)/100;
export function clubhouseGameMetrics(game,completed=false) {
 const [a,b]=game.sides,scores=[numeric(a.score),numeric(b.score)],phase=matchupPhase(a,b,completed);
 const margin=scores.some(v=>v===null)?null:rounded(Math.abs(scores[0]-scores[1]));
 const leader=margin?scores[0]>scores[1]?a:b:null;
 const lead=margin&&!['unknown','upcoming'].includes(phase.key)?{side:scores[0]>scores[1]?'left':'right',margin,label:completed?'Winner':'Leading'}:null;
 const teams=game.sides.map(t=>{
  const players=(t.lineup||[]).filter(p=>!p.empty),known=players.length>0&&players.every(p=>p.state!=='unknown');
  return {team:t,live:known?players.filter(p=>p.state==='live').length:null,upcoming:known?players.filter(p=>p.state==='upcoming').length:null,finished:known?players.filter(p=>p.state==='final').length:null,total:players.length};
 });
 const pressure=phase.key==='live'&&margin!==null&&margin<=10;
 const positional=matchupPlayerPairs(a.lineup,b.lineup).reduce((result,row)=>{
  const key=row.key.split(':')[0];let entry=result.find(r=>r.key===key);
  if(!entry){entry={key,label:key==='DEF'?'D/ST':key,left:0,right:0};result.push(entry)}
  for(const side of ['left','right']){const points=numeric(row[side]?.points);entry[side]=entry[side]===null||points===null?null:rounded(entry[side]+points)}
  return result;
 },[]);
 return {phase,margin,leader,lead,pressure,teams,positional};
}

export function clubhouseLeaguePulse(model) {
 const games=model.games||[],metrics=games.map(game=>({game,...clubhouseGameMetrics(game,model.completed)}));
 const teams=games.flatMap(g=>g.sides).filter(t=>numeric(t.score)>0).sort((a,b)=>b.score-a.score);
 const players=(model.starters||[]).filter(p=>['QB','RB','WR','TE'].includes(p.position)&&numeric(p.points)>0).sort((a,b)=>b.points-a.points);
 const close=metrics.filter(m=>!['unknown','upcoming'].includes(m.phase.key)&&m.margin!==null).sort((a,b)=>a.margin-b.margin)[0];
 return {live:metrics.filter(m=>m.phase.key==='live').length,high:teams[0]||null,player:players[0]||null,close:close||null};
}

const short={pass_yd:'pass yd',pass_td:'pass TD',pass_int:'INT',rush_yd:'rush yd',rush_td:'rush TD',rec:'rec',rec_yd:'rec yd',rec_td:'rec TD',fgm:'FG',xpm:'XP',fgm_lng:'long',sack:'sacks',int:'INT',fum_rec:'FR',def_td:'def TD',def_st_td:'ST TD',pts_allow:'allowed'};
export function clubhousePlayerStatLine(player,bundle,{season,week}={}) {
 if(player.empty)return '';
 if(player.state==='upcoming')return 'Yet to play';
 const stats=spotlightStats(player,bundle?.data||[],{season,week});
 if(!stats.items.length)return player.state==='upcoming'?'Yet to play':bundle?.error?'Stats unavailable':bundle?.loading?'Loading stats…':'No box score yet';
 // Keep touchdowns in the line even when a player also has rushing/receiving stats.
 const priorities={QB:['pass_yd','pass_td','pass_int','rush_yd'],RB:['rush_yd','rec','rec_yd','rush_td','rec_td'],WR:['rec','rec_yd','rec_td','rush_yd','rush_td'],TE:['rec','rec_yd','rec_td'],K:['fgm','xpm','fgm_lng'],DEF:['sack','int','pts_allow','fum_rec','def_td','def_st_td']};
 return stats.items.filter(s=>!(s.value===0&&['rush_td','rec_td','fum_rec','def_td','def_st_td'].includes(s.key))).sort((a,b)=>(priorities[player.position]||[]).indexOf(a.key)-(priorities[player.position]||[]).indexOf(b.key)).map(s=>`${s.value} ${short[s.key]||s.label}`).join(' · ');
}
