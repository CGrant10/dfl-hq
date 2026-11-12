import {footballTeam} from './live-football-model.js';
const text=v=>String(v??'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
const number=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
const categories=['passing','rushing','receiving','kicking'];
export function nflShortName(value){const parts=text(value).split(' ');return parts.length>1?parts[0][0]+'. '+parts.slice(1).join(' '):text(value)}
export function nflBoxscore(summary,sides=[]){
 return sides.map(side=>{const club=(summary?.boxscore?.players||[]).find(c=>footballTeam(c.team?.abbreviation)===side.code);
  return {...side,groups:categories.flatMap(category=>{const g=club?.statistics?.find(g=>g.name===category);if(!g)return[];const columns=(g.labels||g.displayNames||[]).map(text);if(!columns.length)return[];
   const rows=(g.athletes||[]).flatMap(item=>{if(!/^\d{1,24}$/.test(String(item.athlete?.id||''))||!text(item.athlete?.displayName))return[];return[{id:String(item.athlete.id),name:text(item.athlete.displayName),position:text(item.athlete.position?.abbreviation),nflTeam:side.code,values:columns.map((_,i)=>item.stats?.[i]===null||item.stats?.[i]===undefined||text(item.stats[i])===''?'—':text(item.stats[i]))}]});
   return rows.length?[{category,title:{passing:'Passing',rushing:'Rushing',receiving:'Receiving',kicking:'Kicking'}[category],columns,rows}]:[]})};
 });
}
export function nflGameLeaders(clubs=[]){
 return ['passing','rushing','receiving'].map(category=>({category,label:{passing:'Pass',rushing:'Rush',receiving:'Rec'}[category],sides:clubs.map(club=>{
  const group=club.groups.find(g=>g.category===category);if(!group)return null;
  const index=group.columns.findIndex(c=>/^YDS$/i.test(c));if(index<0)return null;
  const played=row=>row.values.some((v,i)=>i!==index&&(Number(v)>0||/^\d+\/[1-9]\d*$/.test(v)));
  const rows=group.rows.filter(r=>number(r.values[index])!==null&&played(r));if(!rows.length)return null;
  const yards=Math.max(...rows.map(r=>Number(r.values[index]))),leaders=rows.filter(r=>Number(r.values[index])===yards),player=leaders[0];
  const stat=label=>{const i=group.columns.findIndex(c=>new RegExp('^(?:'+label+')$','i').test(c));return i<0?'':player.values[i]};
  const parts=category==='passing'?[`${yards} pass yd`,stat('TD')&&`${stat('TD')} TD`,stat('INT')&&`${stat('INT')} INT`]:category==='rushing'?[stat('CAR|ATT')&&`${stat('CAR|ATT')} car`,`${yards} rush yd`,stat('TD')&&`${stat('TD')} TD`]:[stat('REC')&&`${stat('REC')} rec`,`${yards} rec yd`,stat('TD')&&`${stat('TD')} TD`];
  return {...player,yards,tied:leaders.length,line:parts.filter(Boolean).join(' · ')};
 })})).filter(row=>row.sides.some(Boolean));
}
export function nflQuarterScores(summary,sides=[]){
 const teams=summary?.header?.competitions?.[0]?.competitors||[],periods=Math.max(4,...teams.map(t=>Math.min(10,t.linescores?.length||0)));
 return {columns:Array.from({length:periods},(_,i)=>i<4?'Q'+(i+1):i===4?'OT':(i-3)+'OT'),teams:sides.map(s=>{const t=teams.find(t=>footballTeam(t.team?.abbreviation)===s.code);return{...s,periods:Array.from({length:periods},(_,i)=>number(t?.linescores?.[i]?.value??t?.linescores?.[i]?.displayValue))}})};
}
