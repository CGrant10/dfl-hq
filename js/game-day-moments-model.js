const number=v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v))?Number(v):null;
// Times describe observed syncs, never the exact instant of an NFL play.
export function savedMoments(rows,model,players={}){
 const sides=new Map(model.games.flatMap(g=>g.sides.map(t=>[String(t.roster),t])));
 return rows.filter(r=>String(r.league_id)===String(model.leagueId)&&Number(r.season)===Number(model.season)&&Number(r.week)===Number(model.week)).flatMap(r=>{
  const side=sides.get(String(r.roster_id)),game=model.games.find(g=>String(g.id)===String(r.matchup_id)),at=Date.parse(r.captured_at);if(!side||!game?.sides.includes(side)||!Number.isFinite(at))return[];
  const name=players[r.player_id]?.n||side.lineup.find(p=>p.id===String(r.player_id))?.name||`Player ${r.player_id}`;let text;
  if(['touchdown','big-play'].includes(r.kind)){
   const play=r.data?.play,involved=r.data?.players;
   if(!play||play.kind!==r.kind||r.event_key!==footballMomentKey(r.roster_id,play.gameId,play.id)||!Number.isFinite(play.at)||!Number.isFinite(play.yards)||play.yards<0||typeof play.text!=='string'||!Array.isArray(involved)||!involved.length||involved.some(p=>!/^\d+$/.test(String(p.id))||!['QB','RB','WR','TE'].includes(p.position)||!['passer','receiver','rusher','scorer'].includes(p.role)))return[];
   const people=involved.map(p=>({...p,name:players[p.id]?.n||p.name})),label=footballMomentLabel(play,people);
   return [{key:String(r.id),eventKey:r.event_key,kind:r.kind,text:`${people.map(p=>p.name).join(' + ')} · ${label} · ${side.name}`,at:play.at,observedAt:at,matchupId:String(r.matchup_id),roster:String(r.roster_id),title:label,recap:{play:{...play,label},players:people},team:{team_name:side.name,identity:side.identity},player:people.find(p=>p.role!=='passer')||people[0]}];
  }
  if(r.kind==='lead'){const scores=game.sides.map(t=>number(r.data?.scores?.[t.roster]));if(scores.length!==2||scores.some(s=>s==null)||scores[game.sides.indexOf(side)]<=scores[1-game.sides.indexOf(side)])return[];text=`${side.name} moves ahead · ${scores.map(s=>s.toFixed(2)).join(' – ')}`}
  else if(r.kind==='big'&&number(r.data?.points)>=20)text=`${name}: ${number(r.data.points).toFixed(2)} points · ${side.name}`;
  else if(r.kind==='surge'&&number(r.data?.delta)>=6)text=`${name} · +${number(r.data.delta).toFixed(2)} pts · ${side.name}`;
  else return[];
  const meta=players[r.player_id],lineup=side.lineup.find(p=>p.id===String(r.player_id));
  const points=number(r.data?.points),delta=number(r.data?.delta);
  const recap=r.kind==='lead'?{sides:game.sides.map(t=>({team_name:t.name,identity:t.identity,points:number(r.data.scores[t.roster]),leading:String(t.roster)===String(r.roster_id)}))}
   :{points,delta:r.kind==='surge'?delta:null,before:r.kind==='surge'&&points!==null&&delta!==null?Math.round((points-delta)*100)/100:null};
  return[{key:String(r.id),kind:r.kind,text,at,matchupId:String(r.matchup_id),roster:String(r.roster_id),recap,team:{team_name:side.name,identity:side.identity},player:r.kind==='lead'?null:{id:String(r.player_id),name,position:meta?.p||lineup?.position,nflTeam:meta?.t||lineup?.nflTeam}}];
 }).sort((a,b)=>b.at-a.at||Number(b.key)-Number(a.key));
}
import {footballMomentKey,footballMomentLabel} from './football-moments.js';

export function momentSummary(moment){
 const facts=moment.recap,play=facts?.play,passing=facts?.players?.length>0&&facts.players.every(p=>p.role==='passer'),known=n=>typeof n==='number'&&Number.isFinite(n);
 const label=play?(moment.kind==='touchdown'?(passing?'TD pass':'Touchdown'):'Big play'):moment.kind==='surge'?'Points added':moment.kind==='lead'?'Takes the lead':'Big day';
 const value=play&&known(play.yards)?`${play.yards} yd`:moment.kind==='surge'&&known(facts?.delta)?`+${facts.delta.toFixed(2)}`:known(facts?.points)?facts.points.toFixed(2):'';
 const name=moment.player?.name||moment.team?.team_name||moment.title||label,owner=moment.team?.team_name;
 return {name,label,value,unit:play?'':value?'pts':'',detail:owner&&owner!==name?owner:moment.kind==='lead'&&facts?.sides?.length===2?facts.sides.map(s=>known(s.points)?s.points.toFixed(2):'—').join(' – '):''};
}
