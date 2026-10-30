import {footballTeam} from './live-football-model.js';
const number=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
const bounded=(value,max)=>number(value)!==null&&value>=0&&value<=max?value:null;
const teamId=value=>String(value?.id||String(value?.$ref||'').match(/\/teams\/(\d+)(?:\?|$)/)?.[1]||'');
const text=value=>String(value||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,100);

export function nflPlayTeam(play,sides=[]){
 const id=teamId(play?.start?.team)||teamId(play?.team);
 return sides.find(side=>side.id&&String(side.id)===id)||null;
}
function spot(value,sides){
 const side=sides.find(side=>side.id&&String(side.id)===teamId(value?.team));
 if(!side)return null;
 const label=text(value.possessionText),match=label.match(/^([A-Z]{2,3})\s+(\d{1,2})$/);
 // Some punt summaries contain a contradictory yardsToEndzone. An explicit
 // named yard line is authoritative; quick boards use the fixed field axis.
 const named=label==='50'?50:match&&Number(match[2])<=50&&sides.some(s=>s.code===footballTeam(match[1]))?(side.code===footballTeam(match[1])?100-Number(match[2]):Number(match[2])):null;
 const yard=bounded(value.yardLine,100);
 const goal=named??(yard!==null?(side.home?100-yard:yard):bounded(value.yardsToEndzone,100));
 if(goal===null)return null;
 const down=Number.isInteger(value.down)?bounded(value.down,4):null,distance=bounded(value.distance,100);
 return {team:side.code,x:side.home?goal:100-goal,goal,down:down&&distance!==null?text(value.shortDownDistanceText)||`${down}${['','st','nd','rd','th'][down]} & ${distance}`:'',distance:down?distance:null,label:text(value.possessionText)|| (goal===50?'50':goal===0?`${sides.find(s=>s.code!==side.code)?.code||''} goal line`:goal===100?`${side.code} goal line`:goal>50?`${side.code} ${100-goal}`:`${sides.find(s=>s.code!==side.code)?.code||''} ${goal}`)};
}

// Coordinates represent official start/end spots, never a guessed player route.
export function nflPlayField(play,sides=[]){
 const start=spot(play?.start,sides),end=spot(play?.end,sides);
 if(!start||!end)return null;
 const voided=/no play|overturned|reversed|nullified/i.test(play.text||'');
 const kick=['52','53','59'].includes(String(play.type?.id))||/punt|kickoff|field goal|extra point/i.test(play.type?.text||'');
 const turnover=play.isTurnover===true||!kick&&start.team!==end.team;
 const touchdown=!voided&&play.scoringPlay===true&&/touchdown/i.test(`${play.type?.text||''} ${play.text||''}`);
 const side=sides.find(s=>s.code===start.team),target=start.distance===null?null:Math.max(0,Math.min(100,start.x+(side.home?-start.distance:start.distance)));
 return {start,end,target,voided,turnover,touchdown,kick,yards:number(play.statYardage),animate:!voided&&start.x!==end.x};
}

export function nflBoardAhead(summary,game){
 const id=String(game?.lastPlay?.id||'');
 if(!/^\d{1,24}$/.test(id))return false;
 const drives=summary?.drives||{},plays=[...(drives.previous||[]),...(drives.current?[drives.current]:[])].flatMap(d=>d.plays||[]).concat(summary?.scoringPlays||[]);
 const ids=plays.map(p=>String(p.id)).filter(id=>/^\d{1,24}$/.test(id));
 return !ids.includes(id)&&(!ids.length||ids.every(previous=>BigInt(previous)<BigInt(id)));
}
