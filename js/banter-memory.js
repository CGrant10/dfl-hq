import {slotEligible} from './lineup-alert-model.js';
const known=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const before=(g,m)=>Number(g.season)<Number(m.season)||Number(g.season)===Number(m.season)&&Number(g.week)<Number(m.week);
const href=(season,week,roster)=>`#/clubhouse?season=${season}&week=${week}&tab=matchups&roster=${encodeURIComponent(roster)}`;
// Receipts always include a source. Names come from today's matched identity.
export function banterMemory(model,game,{history=[],trades=[]}={}){
 if(!game?.sides?.length)return [];
 const facts=[],sides=game.sides;
 const games=[...new Map(history.filter(g=>before(g,model)&&known(g.score1)&&known(g.score2)&&(Number(g.score1)!==0||Number(g.score2)!==0)).map(g=>[[g.season,g.week,...[String(g.user1),String(g.user2)].sort()].join(':'),g])).values()].sort((a,b)=>Number(b.season)-Number(a.season)||Number(b.week)-Number(a.week));
 const pair=games.filter(g=>sides.every(s=>s.uid&&[String(g.user1),String(g.user2)].includes(String(s.uid))));
 if(pair.length){
  const last=pair[0],winner=Number(last.score1)>Number(last.score2)?String(last.user1):Number(last.score2)>Number(last.score1)?String(last.user2):null;
  let streak=0;for(const g of pair){const w=Number(g.score1)>Number(g.score2)?String(g.user1):Number(g.score2)>Number(g.score1)?String(g.user2):null;if(!winner||w!==winner)break;streak++}
  if(streak>=2){const holder=sides.find(s=>String(s.uid)===winner),other=sides.find(s=>s!==holder);facts.push({key:'rivalry:'+winner,type:'Rivalry file',fact:`Before this week, ${holder.name} won ${streak} straight recorded meetings.`,roast:`${other.name}, stop calling it a rivalry if you keep paying the fucking rent.`,href:href(last.season,last.week,String(last.user1)===winner?last.roster1:last.roster2)});}
 }
 for(const side of sides){
  if(side.uid){const season=games.filter(g=>Number(g.season)===Number(model.season)&&[String(g.user1),String(g.user2)].includes(String(side.uid)));let losses=0;
   for(const g of season){const mine=String(g.user1)===String(side.uid)?Number(g.score1):Number(g.score2),theirs=String(g.user1)===String(side.uid)?Number(g.score2):Number(g.score1);if(mine>=theirs)break;losses++}
   const opponent=sides.find(s=>s!==side)?.uid,differentOpponents=season.slice(0,losses).some(g=>String(g.user1)===String(side.uid)?String(g.user2)!==String(opponent):String(g.user1)!==String(opponent));
   if(losses>=3&&(differentOpponents||!facts.some(f=>f.type==='Rivalry file'))){const last=season[0];facts.push({key:'streak:'+side.uid,type:'Season file',fact:`${side.name} entered this week on ${losses} straight recorded losses.`,roast:`Another week to unfuck that streak. The standings are tired of your excuses.`,href:href(last.season,last.week,String(last.user1)===String(side.uid)?last.roster1:last.roster2)});}
  }
  if(model.completed){
   const starters=(side.lineup||[]).filter(p=>!p.empty&&known(p.points)),pairs=(side.bench||[]).filter(p=>!p.empty&&['QB','RB','WR','TE'].includes(p.position)&&known(p.points)).flatMap(bench=>starters.filter(p=>slotEligible(bench,p.slotType||p.position)).map(starter=>({bench,starter,gap:Number(bench.points)-Number(starter.points)}))).sort((a,b)=>b.gap-a.gap);
   if(pairs[0]?.gap>=10){const {bench,starter,gap}=pairs[0];facts.push({key:'bench:'+side.roster,type:'Bench file',fact:`${side.name}: ${bench.name} left ${gap.toFixed(2)} more points on the bench than ${starter.name}.`,roast:'Your bench showed up. Your lineup decision was fucking absent.',href:href(model.season,model.week,side.roster)});}
  }
  for(const trade of trades){
   if(!Number.isInteger(trade.week)||trade.week<1||trade.week>18)continue;
   if(trade.status!=='graded'||trade.outcome?.needsReview||trade.outcome?.grade==='Review'||!trade.season||Number(trade.season)>Number(model.season)||Number(trade.season)===Number(model.season)&&Number(trade.week)>Number(model.week))continue;
   const team=trade.teams?.find(t=>t.sleeper_user_id?side.uid!=null&&String(t.sleeper_user_id)===String(side.uid):t.member_id!=null&&side.memberId!=null&&String(t.member_id)===String(side.memberId));
   const values=team&&trade.teamValues?.find(t=>String(t.rosterId)===String(team.rosterId));
   if(!values||!known(values.sent)||!known(values.received)||Number(values.sent)<20||Number(values.received)>=Number(values.sent)*.7)continue;
   facts.push({key:'trade:'+trade.transactionId+':'+side.roster,type:'Trade-day file',fact:`${side.name}: ${Math.round(values.sent)} value sent, ${Math.round(values.received)} received in the saved trade-day estimate.`,roast:'That receipt is still on file. Generous as fuck.',href:'#/trade?tx='+encodeURIComponent(trade.transactionId)});break;
  }
 }
 return facts.slice(0,4);
}
