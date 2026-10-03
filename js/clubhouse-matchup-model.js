// Pure game-day presentation. Unknown status is never counted as finished.
const number=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;
const club=v=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[v]||v);
export function nflWeekStatuses(payload,season,week){
 if(Number(payload?.season?.year)!==Number(season)||Number(payload?.season?.type)!==2||Number(payload?.week?.number)!==Number(week)||!payload.events?.length)throw Error('NFL week status unavailable');
 const teams=new Map();
 for(const event of payload.events){const type=event.status?.type||{},key=type.completed||type.state==='post'?'final':type.state==='in'?'live':type.state==='pre'?'upcoming':'unknown';
  for(const team of event.competitions?.[0]?.competitors||[])teams.set(club(team.team?.abbreviation),{key,label:type.shortDetail||type.description||'',kickoff:event.date});
 }
 return teams;
}
export function matchupTeamView(row,players={},schedule=null,{completed=false}={}){
 const ids=(row?.starters||[]).map(String).filter(id=>id!=='0');
 const starters=ids.map(id=>{const meta=players[id]||{},state=schedule?.get(club(meta.t));return{id,name:meta.n||`Player ${id}`,position:meta.p||'',nflTeam:meta.t||'',injuryStatus:completed?'':meta.i||'',points:number(row?.players_points?.[id]),state:completed?'final':state?.key||'unknown'}});
 const known=starters.length>0&&starters.every(p=>p.state!=='unknown');
 const remaining=completed?0:known?starters.filter(p=>p.state!=='final').length:null;
 const live=starters.filter(p=>p.state==='live').length;
 const featured=[...starters].filter(p=>['QB','RB','WR','TE'].includes(p.position)).sort((a,b)=>(b.position==='QB')-(a.position==='QB')||(b.points??0)-(a.points??0)).slice(0,2);
 return {score:number(row?.points),remaining,live,known,starters,featured};
}
export function matchupPhase(left,right,completed){
 if(completed)return {key:'final',label:'Final'};
 if(left.live||right.live)return {key:'live',label:'Live'};
 const all=[...left.starters,...right.starters];
 if(!all.length||!left.known||!right.known)return {key:'unknown',label:'Status pending'};
 if(all.every(p=>p.state==='upcoming'))return {key:'upcoming',label:'Upcoming'};
 return {key:'ongoing',label:'In progress'};
}
