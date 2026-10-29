import {scorePlayer} from './dfl-scoring.js';
const number=value=>(typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isFinite(Number(value))?Number(value):null;
const searchable=value=>String(value).normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^\p{L}\p{N}\s]/gu,'').toLowerCase();
export function comparisonCandidates(data,{query='',position='',exclude=''}={}){
 const terms=searchable(query).trim().split(/\s+/).filter(Boolean);
 return [...data.players.values()].filter(p=>p.id!==String(exclude)&&(!position||p.position===position)&&terms.every(term=>searchable(`${p.name} ${p.nflTeam||''} ${data.owners.get(p.id)||''}`).includes(term)))
  .sort((a,b)=>(data.owners.has(b.id)?1:0)-(data.owners.has(a.id)?1:0)||(number(b.tradeValue)||0)-(number(a.tradeValue)||0)||a.name.localeCompare(b.name)).slice(0,30);
}
export function comparisonWeeks(data){return [...new Set([data.analysis.liveWeek,...data.weeks.map(b=>b.week)].map(Number).filter(w=>Number.isInteger(w)&&w>0&&w<=Number(data.analysis.liveWeek)))].sort((a,b)=>b-a);}
export function comparisonEdge(a,b,{enabled=true,threshold=.5,lower=false}={}){
 const x=number(a),y=number(b);if(!enabled||x===null||y===null)return null;
 const delta=Math.round((Number(x.toFixed(1))-Number(y.toFixed(1)))*10)/10;if(!delta||Math.abs(delta)<threshold)return null;
 return {side:(lower?delta<0:delta>0)?0:1,amount:Math.abs(delta)};
}
export function comparisonPlayer(data,id,{week:selectedWeek=data.analysis.liveWeek}={}){
 const p=data.players.get(String(id));if(!p)return null;
 const week=Number(selectedWeek),currentWeek=Number(data.analysis.liveWeek),historical=week<currentWeek,season=data.analysis.projectionSeason,w=data.weekly.get(p.id),schedule=data.analysis.nflSchedule?.get(({JAC:'JAX',WSH:'WAS',LA:'LAR'}[p.nflTeam]||p.nflTeam));
 const selected=data.weeks.find(bundle=>Number(bundle.week)===week);
 const played=selected&&!selected.stale?(selected.data||[]).find(row=>String(row.player_id)===p.id&&Number(row.season)===Number(season)&&Number(row.week)===week&&row.season_type==='regular'&&number(row.stats?.gp)>0):null;
 const points=played?scorePlayer(played.stats,data.analysis.league.scoring_settings):null;
 const recent=data.weeks.filter(bundle=>!bundle.stale&&Number(bundle.week)<=week).flatMap(bundle=>{
  if(Number(bundle.week)===currentWeek&&schedule?.key!=='final')return[];
  const row=(bundle.data||[]).find(row=>String(row.player_id)===p.id&&Number(row.season)===Number(season)&&Number(row.week)===Number(bundle.week)&&row.season_type==='regular'&&number(row.stats?.gp)>0);
  const points=row?scorePlayer(row.stats,data.analysis.league.scoring_settings):null;
  return Number.isFinite(points)?[{week:bundle.week,points}]:[];
 }).sort((a,b)=>a.week-b.week).slice(-4);
 const values=recent.map(row=>row.points).filter(Number.isFinite),average=values.length>=2?values.reduce((a,b)=>a+b,0)/values.length:null;
 const expert=p.expertFeedStatus==='Fresh'&&p.expert? p.expert:null;
 return {player:p,owner:data.owners.get(p.id)||'Free agent',week,season,
  projection:!historical&&w?.hasGame===true?number(w.points):null,points:Number.isFinite(points)?points:null,opponent:historical?played?.opponent||'':w?.opponent||schedule?.opponent||'',kickoff:historical?null:w?.kickoff||schedule?.kickoff||null,
  gameState:historical?played?'final':'unknown':schedule?.key||w?.gameStatus||'',historical,bye:!historical&&w?.hasGame===false&&w?.scheduleKnown!==false,
  injury:p.injuryStatus||'No tag',recent,average,range:values.length>=2?[Math.min(...values),Math.max(...values)]:null,
  expert,tradeValue:p.modelSource==='unrated'?null:number(p.tradeValue),stale:historical?!!selected?.stale:!!data.projectionsStale,expertStatus:p.expertFeedStatus||data.analysis.expertConsensus?.status||'Unavailable'};
}
