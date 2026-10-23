const number=v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v))?Number(v):null;
// Times describe observed syncs, never the exact instant of an NFL play.
export function savedMoments(rows,model,players={}){
 const sides=new Map(model.games.flatMap(g=>g.sides.map(t=>[String(t.roster),t])));
 return rows.filter(r=>String(r.league_id)===String(model.leagueId)&&Number(r.season)===Number(model.season)&&Number(r.week)===Number(model.week)).flatMap(r=>{
  const side=sides.get(String(r.roster_id)),game=model.games.find(g=>String(g.id)===String(r.matchup_id)),at=Date.parse(r.captured_at);if(!side||!game?.sides.includes(side)||!Number.isFinite(at))return[];
  const name=players[r.player_id]?.n||side.lineup.find(p=>p.id===String(r.player_id))?.name||`Player ${r.player_id}`;let text;
  if(r.kind==='lead'){const scores=game.sides.map(t=>number(r.data?.scores?.[t.roster]));if(scores.length!==2||scores.some(s=>s==null)||scores[game.sides.indexOf(side)]<=scores[1-game.sides.indexOf(side)])return[];text=`${side.name} moves ahead · ${scores.map(s=>s.toFixed(2)).join(' – ')}`}
  else if(r.kind==='big'&&number(r.data?.points)>=20)text=`${name}: ${number(r.data.points).toFixed(2)} points · ${side.name}`;
  else if(r.kind==='surge'&&number(r.data?.delta)>=6)text=`${name}: +${number(r.data.delta).toFixed(2)} fantasy points since the previous sync · ${side.name}`;
  else return[];
  const meta=players[r.player_id],lineup=side.lineup.find(p=>p.id===String(r.player_id));
  const points=number(r.data?.points),delta=number(r.data?.delta);
  const recap=r.kind==='lead'?{sides:game.sides.map(t=>({team_name:t.name,identity:t.identity,points:number(r.data.scores[t.roster]),leading:String(t.roster)===String(r.roster_id)}))}
   :{points,delta:r.kind==='surge'?delta:null,before:r.kind==='surge'&&points!==null&&delta!==null?Math.round((points-delta)*100)/100:null};
  return[{key:String(r.id),kind:r.kind,text,at,matchupId:String(r.matchup_id),recap,team:{team_name:side.name,identity:side.identity},player:r.kind==='lead'?null:{id:String(r.player_id),name,position:meta?.p||lineup?.position,nflTeam:meta?.t||lineup?.nflTeam}}];
 }).sort((a,b)=>b.at-a.at||Number(b.key)-Number(a.key));
}
