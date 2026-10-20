import {scorePlayer} from './dfl-scoring.js';
const SLOTS=['QB','RB','RB','WR','WR','TE','K','DEF','FLEX'];
const OUT=new Set(['out','ir','pup','sus','suspended','na','dnr','inactive','retired']);
// Rank the available starting nine, never total roster/trade value. A second
// quarterback cannot occupy a flex or improve the estimate from the bench.
export function powerRosterForecast(roster,rows=[],players={},scoring={}){
 const projections=new Map(rows.map(r=>[String(r.player_id),r]));
 const candidates=[],unknown=[];
 for(const id of new Set((roster.players||roster.playerIds||[]).map(String))){
  const row=projections.get(id),meta=players instanceof Map?players.get(id):players[id];
  const info=row?.player||meta||{},position=String(info.position||meta?.position||meta?.p||'').toUpperCase();
  if(!position){unknown.push(id);continue;}
  if(!['QB','RB','WR','TE','K','DEF'].includes(position))continue;
  // The refreshed weekly feed includes availability (including an explicit
  // healthy null). Use it before the much larger cached player directory.
  const injury=row&&Object.hasOwn(row,'injury_status')?row.injury_status:row?.player&&Object.hasOwn(row.player,'injury_status')?row.player.injury_status:meta?.injury_status??meta?.injuryStatus??meta?.i??'';
  const status=String(injury||'').toLowerCase();
  if(OUT.has(status)||OUT.has(String(meta?.status||meta?.s||'').toLowerCase())||meta?.isOut)continue;
  if(!row||!row.stats){unknown.push(id);continue;}
  if(!row.opponent&&!(Number(row.stats.gp)>0))continue; // An identified bye/filler row is known unavailable.
  const points=scorePlayer(row.stats,scoring);
  if(points==null||!Number.isFinite(points)){unknown.push(id);continue;}
  candidates.push({id,position,points});
 }
 const used=new Set(),slots=SLOTS.map(position=>{
  const eligible=candidates.filter(p=>!used.has(p.id)&&(position==='FLEX'?['RB','WR','TE'].includes(p.position):p.position===position)).sort((a,b)=>b.points-a.points||a.id.localeCompare(b.id));
  const player=eligible[0];if(player)used.add(player.id);return {position,player:player?.id??null,points:player?.points??0};
 });
 // Unknown rostered projections could change which legal starters are best.
 const complete=rows.length>0&&unknown.length===0;
 return {complete,points:complete?Math.round(slots.reduce((s,p)=>s+p.points,0)*100)/100:null,slots,unknown:unknown.length};
}
