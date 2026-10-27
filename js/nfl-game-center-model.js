import {footballPlays,footballTeam,candidatePlay} from './live-football-model.js';
const clean=value=>String(value||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,500);
const name=value=>clean(value).normalize('NFKD').replace(/\p{M}/gu,'').replace(/\s+(jr|sr|ii|iii|iv)\.?$/i,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const nflGameId=value=>/^\d{1,24}$/.test(String(value||''))?String(value):'';
export function nflCenterGames(payload,season,week){
 if(Number(payload?.season?.year)!==Number(season)||Number(payload?.week?.number)!==Number(week)||Number(payload?.season?.type)!==2)return [];
 return (payload.events||[]).flatMap(event=>{
  const competition=event.competitions?.[0],status=competition?.status||event.status,teams=competition?.competitors||[];
  if(!nflGameId(event.id)||teams.length!==2||!Number.isFinite(Date.parse(event.date)))return [];
  const sides=[...teams].sort((a,b)=>Number(a.homeAway==='home')-Number(b.homeAway==='home')).map(side=>({code:footballTeam(side.team?.abbreviation),score:/^\d+$/.test(String(side.score))?Number(side.score):null,home:side.homeAway==='home'}));
  if(sides.some(side=>!side.code))return [];
  return [{id:String(event.id),date:event.date,sides,label:sides.map(s=>s.code).join(' @ '),state:status?.type?.state||'pre',status:clean(status?.type?.shortDetail||status?.type?.detail||'Scheduled')}];
 });
}
export function nflSummaryMatches(summary,game,season){return !!game&&String(summary?.header?.id)===game.id&&Number(summary?.header?.season?.year)===Number(season)&&Number(summary?.header?.season?.type)===2;}
export function nflCenterPlays(summary){
 const all=[...footballPlays(summary),...(summary?.scoringPlays||[])],unique=new Map();
 for(const play of all){
  if(!nflGameId(play.id)||!clean(play.text))continue;
  const previous=unique.get(String(play.id));unique.set(String(play.id),{...previous,...play});
 }
 return [...unique.values()].sort((a,b)=>Number(a.sequenceNumber||a.id)-Number(b.sequenceNumber||b.id)).map(play=>({id:String(play.id),text:clean(play.text),typeId:String(play.type?.id||''),typeLabel:clean(play.type?.text),yards:typeof play.statYardage==='number'&&Number.isFinite(play.statYardage)?play.statYardage:null,period:Number(play.period?.number)||null,clock:clean(play.clock?.displayValue),score:play.scoringPlay===true,home:typeof play.homeScore==='number'?play.homeScore:null,away:typeof play.awayScore==='number'?play.awayScore:null,big:play.scoringPlay!==true&&candidatePlay(play),voided:/no play|overturned|reversed|nullified/i.test(play.text)}));
}
// Keep official NFL stat lines alongside actual Sleeper points. No estimated
// PPR totals: conversions and unusual scoring must survive intact.
export function nflFantasyRows(summary,players=[],{weekly=[],season,week}={}){
 const rows=new Map(),groups={passing:['passingYards','passingTouchdowns','interceptions'],rushing:['rushingYards','rushingTouchdowns'],receiving:['receptions','receivingYards','receivingTouchdowns'],fumbles:['fumblesLost'],kicking:['longFieldGoalMade']};
 for(const club of summary?.boxscore?.players||[])for(const group of club.statistics||[]){
  if(!groups[group.name])continue;
  for(const item of group.athletes||[]){
   const athlete=item.athlete,code=footballTeam(club.team?.abbreviation);if(!nflGameId(athlete?.id)||!clean(athlete.displayName)||!code)continue;
   const key=String(athlete.id),row=rows.get(key)||{id:key,name:clean(athlete.displayName),nflTeam:code,stats:{},position:group.name==='passing'?'QB':group.name==='kicking'?'K':''};
   for(const field of groups[group.name]){const i=(group.keys||[]).indexOf(field),raw=item.stats?.[i];if(i>=0&&raw!==''&&raw!=null&&Number.isFinite(Number(raw)))row.stats[field]=Number(raw)}
   if(group.name==='kicking')for(const [field,key]of [['fieldGoalsMade/fieldGoalAttempts','fg'],['extraPointsMade/extraPointAttempts','xp']]){const raw=item.stats?.[(group.keys||[]).indexOf(field)];if(/^\d+\/\d+$/.test(String(raw)))row.stats[key]=String(raw)}
   rows.set(key,row);
  }
 }
 return [...rows.values()].filter(row=>Object.keys(row.stats).some(k=>k!=='fumblesLost')).map(row=>{
  const s=row.stats,matching=players.filter(p=>name(p.name)===name(row.name)&&footballTeam(p.nflTeam)===row.nflTeam),owned=matching.length===1?matching[0]:null;
  const recorded=weekly.filter(r=>Number(r.season)===Number(season)&&Number(r.week)===Number(week)&&r.season_type==='regular'&&footballTeam(r.team||r.player?.team)===row.nflTeam&&name(r.player?.full_name||`${r.player?.first_name||''} ${r.player?.last_name||''}`)===name(row.name));
  const stats=recorded.length===1?recorded[0]:null,points=typeof stats?.stats?.pts_ppr==='number'&&Number.isFinite(stats.stats.pts_ppr)?stats.stats.pts_ppr:null;
  const line=[s.passingYards!=null?`${s.passingYards} pass yd`:null,s.passingTouchdowns?`${s.passingTouchdowns} pass TD`:null,s.interceptions?`${s.interceptions} INT`:null,s.rushingYards!=null?`${s.rushingYards} rush yd`:null,s.rushingTouchdowns?`${s.rushingTouchdowns} rush TD`:null,s.receptions!=null?`${s.receptions} rec`:null,s.receivingYards!=null?`${s.receivingYards} rec yd`:null,s.receivingTouchdowns?`${s.receivingTouchdowns} rec TD`:null,s.fumblesLost?`${s.fumblesLost} lost`:null,s.fg?`${s.fg} FG`:null,s.xp?`${s.xp} XP`:null,s.longFieldGoalMade?`${s.longFieldGoalMade} long`:null].filter(Boolean).join(' · ');
  return {...row,playerId:owned?.id,owner:owned?.owner||'',isMine:owned?.isMine===true,position:owned?.position||stats?.player?.position||row.position,points:typeof owned?.points==='number'?owned.points:points,league:typeof owned?.points==='number',line};
 }).sort((a,b)=>Number(b.isMine)-Number(a.isMine)||(b.points??-Infinity)-(a.points??-Infinity)||a.name.localeCompare(b.name));
}
