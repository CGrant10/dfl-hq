import {normalizeKit} from './racer-kit-model.js';
import {defaultRacerKit} from './racer-character.js';

const number=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
export const finishTime=value=>number(value)===null||Number(value)<0?'—':`${(Number(value)/1000).toFixed(3)}s`;

// Use lane order for race numbers, exactly as on the field. Jersey numbers are
// a separate, editable part of a member's saved uniform.
export function finishRacers(snapshot,members=[]){
 const people=new Map(members.map(member=>[String(member.id),member]));
 const kits=new Map((snapshot.racer_kits||[]).map(row=>[String(row.member_id),row.kit]));
 return (snapshot.participants||[]).map((participant,index)=>{
  const id=String(participant.member_id),member=people.get(id),number=participant.number??index+1;
  return {id,index,raceNumber:index+1,name:member?.display_name||`Racer ${index+1}`,team:member?.team_name||'',profile:!!member,
   kit:normalizeKit(kits.get(id)||defaultRacerKit(id,{number,jersey:participant.color||member?.accent_color}),{number})};
 });
}

// Count alone cannot establish an official order: reject duplicate members,
// missing places and results from another field. Never sort a draw by time.
export function officialFinish(event,results=[],racers=[]){
 if(!['finished'].includes(event?.bc_state)&&event?.status!=='complete')return null;
 if(!racers.length||results.length!==racers.length)return null;
 const field=new Map(racers.map(racer=>[String(racer.id),racer]));
 if(field.size!==racers.length||results.some(row=>!field.has(String(row.member_id))))return null;
 const ordered=[...results].sort((a,b)=>Number(a.place)-Number(b.place));
 if(new Set(ordered.map(row=>String(row.member_id))).size!==field.size||ordered.some((row,index)=>number(row.place)!==index+1))return null;
 let previous=null;
 for(const result of ordered){
  const time=number(result.finish_ms);
  if(result.finish_ms!=null&&(time===null||time<0))return null;
  if(time!==null&&previous!==null&&time<previous)return null;
  if(time!==null)previous=time;
 }
 const winnerTime=number(ordered[0].finish_ms);
 const rows=ordered.map(row=>{
  const time=number(row.finish_ms);
  return {...field.get(String(row.member_id)),place:Number(row.place),time,
   gap:time!==null&&winnerTime!==null?time-winnerTime:null};
 });
 const margin=rows.length>1&&rows[1].gap!==null?rows[1].gap:null;
 return {rows,podium:rows.slice(0,3),margin,photoFinish:margin!==null&&margin<=250};
}
