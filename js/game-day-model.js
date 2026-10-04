import {matchupTeamView} from './clubhouse-matchup-model.js';
const DEFAULT_SLOTS=['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'];
const slotName=s=>({FLEX:'Flex',K:'Kicker',DEF:'Def',SUPER_FLEX:'Superflex',WRRB_FLEX:'Flex',REC_FLEX:'Flex'}[s]||s);
const slotOrder=s=>({QB:0,RB:1,WR:2,TE:3,FLEX:4,WRRB_FLEX:4,REC_FLEX:4,SUPER_FLEX:4,K:5,DEF:6}[s]??7);
export function gameDayLineup(row,players={},schedule=null,{completed=false,rosterPositions=DEFAULT_SLOTS}={}){
 const slots=rosterPositions.filter(s=>s!=='BN'),started=new Set((row?.starters||[]).map(String));
 const named=matchupTeamView(row,players,schedule,{completed}).starters,byId=new Map(named.map(p=>[p.id,p]));
 const lineup=(row?.starters||[]).map((id,index)=>{const metaPosition=players[String(id)]?.p;const position=['K','DEF'].includes(metaPosition)?metaPosition:slots[index]||metaPosition||'Starter';return {...(byId.get(String(id))||{id:`empty-${index}`,name:'Empty slot',position,nflTeam:'',points:null,state:'unknown',empty:true}),slot:slotName(position),slotIndex:index,slotType:position}}).sort((a,b)=>slotOrder(a.slotType)-slotOrder(b.slotType)||a.slotIndex-b.slotIndex);
 const benchIds=[...new Set((row?.players||[]).map(String))].filter(id=>id!=='0'&&!started.has(id));
 const bench=matchupTeamView({...row,starters:benchIds},players,schedule,{completed}).starters.map(p=>({...p,slot:'Bench'}));
 return {lineup,bench};
}
const finite=v=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
export function buildGameDay({week,rows=[],players={},nfl=null,members=[],memberId=null,rosterPositions=DEFAULT_SLOTS,now=Date.now()}){
 const rosterMap=new Map(rows.map(r=>[String(r.roster_id),r]));
 const memberMap=new Map(members.map(m=>[String(m.sleeper_user_id),m]));
 const starters=[],games=[];let mine=[],bench=[];
 for(const game of week.games||[]){
  const sides=[['user1','roster1'],['user2','roster2']].map(([uid,rid])=>{
   const member=memberMap.get(String(game[uid])),row=rosterMap.get(String(game[rid])),team=matchupTeamView(row,players,nfl?.teams,{completed:week.completed}),name=member?.team_name||member?.display_name||`Team ${game[rid]}`;
   for(const p of team.starters)starters.push({...p,memberId:member?.id,owner:name,roster:String(game[rid]),isMine:memberId!=null&&String(member?.id)===String(memberId),points:finite(p.points)?Number(p.points):null});
   const roster=gameDayLineup(row,players,nfl?.teams,{completed:week.completed,rosterPositions});const context=p=>({...p,memberId:member?.id,owner:name,roster:String(game[rid]),isMine:memberId!=null&&String(member?.id)===String(memberId)});const lineup=roster.lineup.map(context),teamBench=roster.bench.map(context);
   if(memberId!=null&&String(member?.id)===String(memberId)){mine=lineup;bench=teamBench}
   return {...team,name,uid:game[uid],identity:member||{},memberId:member?.id,roster:String(game[rid]),lineup,bench:teamBench};
  });
  games.push({id:String(game.matchup_id),sides,isMine:sides.some(t=>memberId!=null&&String(t.memberId)===String(memberId)),leader:sides.some(t=>t.score==null)||sides[0].score===sides[1].score?null:sides[sides[0].score>sides[1].score?0:1].roster});
 }
 const events=(nfl?.payload?.events||[]).map(e=>{const type=e.status?.type||{},sides=e.competitions?.[0]?.competitors||[];return {id:e.id,kickoff:Date.parse(e.date),state:type.completed||type.state==='post'?'final':type.state==='in'?'live':type.state==='pre'?'upcoming':'unknown',label:type.shortDetail||type.description||'Status pending',teams:sides.map(s=>({name:s.team?.abbreviation||'NFL',score:finite(s.score)?Number(s.score):null}))}});
 const nextKickoff=Math.min(...events.filter(e=>e.state==='upcoming'&&e.kickoff>now).map(e=>e.kickoff));
 const live=events.some(e=>e.state==='live');
 const leaders=starters.filter(p=>p.points!==null&&p.points>0).sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name)).slice(0,4);
 const snapshot={points:Object.fromEntries(starters.filter(p=>p.points!==null).map(p=>[`${p.roster}:${p.id}`,p.points])),leaders:Object.fromEntries(games.map(g=>[g.id,g.leader]))};
 return {leagueId:week.leagueId,season:week.season,week:week.week,completed:week.completed,live,nextKickoff:Number.isFinite(nextKickoff)?nextKickoff:null,starters,mine,bench,leaders,games,events,snapshot};
}
export function gameDayHighlights(model,previous=null){
 const highlights=[];
 for(const g of model.games){const old=previous?.leaders?.[g.id];if(old&&g.leader&&g.leader!==old){const leader=g.sides.find(t=>t.roster===g.leader);highlights.push({key:`lead:${g.id}:${g.leader}`,kind:'lead',text:`${leader.name} moves ahead · ${g.sides.map(t=>t.score.toFixed(2)).join(' – ')}`})}}
 for(const p of model.starters){if(p.points===null)continue;const old=previous?.points?.[`${p.roster}:${p.id}`];
  if(finite(old)&&p.points-Number(old)>=6)highlights.push({key:`jump:${p.id}:${p.points}`,kind:'surge',text:`${p.name}: +${(p.points-Number(old)).toFixed(2)} fantasy points since the last check · ${p.owner}`});
  if(p.points>=20&&(!finite(old)||Number(old)<20))highlights.push({key:`big:${p.id}`,kind:'big',text:`Big day: ${p.name} has ${p.points.toFixed(2)} points · ${p.owner}`});
 }
 return highlights.slice(0,3);
}
export function kickoffCountdown(timestamp,now=Date.now()){
 if(timestamp==null||timestamp<=now)return '';const minutes=Math.ceil((timestamp-now)/60000),hours=Math.floor(minutes/60),days=Math.floor(hours/24);
 return days?`${days}d ${hours%24}h to kickoff`:hours?`${hours}h ${minutes%60}m to kickoff`:`${minutes}m to kickoff`;
}
