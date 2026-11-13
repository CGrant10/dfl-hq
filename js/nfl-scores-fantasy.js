import {nflFantasyRows} from './nfl-game-center-model.js';
import {scorePlayer} from './dfl-scoring.js';
import {footballTeam} from './live-football-model.js';
const clean=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/\s+(jr|sr|ii|iii|iv)\.?$/i,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const positions=['QB','RB','WR','TE','K','DEF'];
const full=r=>r?.player?.full_name||[r?.player?.first_name,r?.player?.last_name].filter(Boolean).join(' ');
const key=(n,t)=>clean(n)+':'+footballTeam(t);
const number=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
function index(rows,keyOf){const out=new Map();for(const r of rows){const k=keyOf(r);out.set(k,out.has(k)?null:r)}return out}
// Provider snapshots are replaced on refresh. Reuse the large catalog and
// week indexes instead of walking every NFL player on each live score paint.
const directoryCache=new WeakMap(),weekCache=new WeakMap();
function catalogIndex(directory){
 if(!directory||typeof directory!=='object')return new Map();if(!directoryCache.has(directory))directoryCache.set(directory,index(Object.entries(directory).map(([id,p])=>({id,...p})),p=>key(p.n,p.t)));return directoryCache.get(directory);
}
function weekIndex(rows,season,week){
 if(!Array.isArray(rows))return new Map();const scope=season+':'+week;let scopes=weekCache.get(rows);if(!scopes){scopes=new Map();weekCache.set(rows,scopes)}if(!scopes.has(scope))scopes.set(scope,index(rows.filter(r=>Number(r.season)===Number(season)&&Number(r.week)===Number(week)&&r.season_type==='regular'),r=>key(full(r),r.team||r.player?.team)));return scopes.get(scope);
}
// No box-score arithmetic or PPR preset is relabeled as this league's score.
export function nflScoresFantasyRows(summary,owned=[],{weekly=[],projections=[],directory={},season,week,sides=[],state='',scoringSettings=null,order=[]}={}){
 const projected=weekIndex(projections,season,week),actual=weekIndex(weekly,season,week),catalog=catalogIndex(directory);
 const owners=index(owned,p=>key(p.name,p.nflTeam)),codes=new Set(sides.map(s=>s.code));
 const rows=nflFantasyRows(summary,owned,{weekly,season,week,directory}).filter(p=>codes.has(p.nflTeam));
 const found=new Set(rows.map(p=>key(p.name,p.nflTeam)));
 for(const p of projected.values()){
  if(!p)continue;const name=full(p),code=footballTeam(p.team||p.player?.team),position=p.player?.position;
  if(!codes.has(code)||!positions.includes(position)||found.has(key(name,code))||!Object.keys(p.stats||{}).some(k=>k==='pts_ppr'||k==='pts_std'||k==='pts_half_ppr'||['pass_yd','rush_yd','rec_yd','fgm','pts_allow'].includes(k)))continue;
  found.add(key(name,code));rows.push({id:'sleeper-'+p.player_id,name,nflTeam:code,position,stats:{},points:null,line:''});
 }
 const prepared=rows.flatMap(p=>{
  const k=key(p.name,p.nflTeam),projection=projected.get(k),recorded=actual.get(k),owner=owners.get(k),person=catalog.get(k);
  const position=p.position||projection?.player?.position||person?.p;if(!positions.includes(position))return[];
  const compatible=r=>!r?.player?.position||r.player.position===position;
  const playerId=owner?.position&&owner.position!==position?null:owner?.id||person?.p===position&&person.id||compatible(projection)&&projection?.player_id||null;
  const points=state==='pre'?null:number(owner?.points)??(compatible(recorded)?scorePlayer(recorded?.stats,scoringSettings):null);
  const projectedPoints=compatible(projection)?scorePlayer(projection?.stats,scoringSettings):null;
  const s=p.stats||{},bits=[];
  if(s.completions!=null&&s.passingAttempts!=null)bits.push(`${s.completions}/${s.passingAttempts} CMP`);
  if(s.passingYards!=null)bits.push(`${s.passingYards} PASS YD`);
  if(s.passingTouchdowns)bits.push(`${s.passingTouchdowns} PASS TD`);
  if(s.interceptions)bits.push(`${s.interceptions} INT`);
  if(s.rushingAttempts!=null)bits.push(`${s.rushingAttempts} CAR`);
  if(s.rushingYards!=null)bits.push(`${s.rushingYards} RUSH YD`);
  if(s.rushingTouchdowns)bits.push(`${s.rushingTouchdowns} RUSH TD`);
  if(s.receptions!=null)bits.push(`${s.receptions}${s.receivingTargets!=null?'/'+s.receivingTargets:''} REC`);
  if(s.receivingYards!=null)bits.push(`${s.receivingYards} REC YD`);
  if(s.receivingTouchdowns)bits.push(`${s.receivingTouchdowns} REC TD`);
  if(s.fg)bits.push(`${s.fg} FG`);if(s.xp)bits.push(`${s.xp} XP`);if(s.fumblesLost)bits.push(`${s.fumblesLost} LOST`);
  return [{...p,position,playerId:playerId?String(playerId):null,rowKey:playerId?'sleeper-'+playerId:'espn-'+p.id,points,projectedPoints,league:true,owner:owner?.owner||'',isMine:owner?.isMine===true,line:Object.values(s).some(v=>typeof v==='number'&&v!==0||typeof v==='string'&&/^\d+\/\d+$/.test(v)&&v!=='0/0')?bits.join(', ')||p.line||'':''}];
 });
 const rank=new Map(order.map((id,i)=>[id,i]));
 return prepared.sort((a,b)=>positions.indexOf(a.position)-positions.indexOf(b.position)||(rank.get(a.rowKey)??Infinity)-(rank.get(b.rowKey)??Infinity)||a.name.localeCompare(b.name)||a.rowKey.localeCompare(b.rowKey));
}
