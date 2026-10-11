import {startSitAdvice} from './weekly-outlook.js';
import {legalWeeklyLineup} from './lineup-lab.js';
import {buildWaiverPlan,rosterLineupScore} from './waiver-coach.js';
import {DFL_SLOTS,availableBeforeKickoff} from './lineup-alert-model.js';
import {scorePlayer} from './dfl-scoring.js';
const club=t=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[t]||t);
const number=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const round=n=>Math.round(n*100)/100;
const changed=(after,before)=>after.filter(id=>id!=='0'&&!before.includes(id));
const nflClubs=new Set('ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LAC LAR LV MIA MIN NE NO NYG NYJ PHI PIT SEA SF TB TEN WAS'.split(' '));
const verifiedNoGame=(p,schedule)=>p?.hasGame===false&&nflClubs.has(club(p.team))&&schedule?.size>=24&&!schedule.has(club(p.team));
const gameFor=(p,schedule)=>schedule?.get(club(p?.team));
const movable=(p,schedule,now)=>availableBeforeKickoff({...p,state:gameFor(p,schedule)?.key,kickoff:gameFor(p,schedule)?.kickoff},now);
function snapshot({kind,roster,before,after,pool,schedule,league,season,week,now,label,dropId=null,projectedGain}){
  const added=changed(after,before),removed=changed(before,after);
  if(!added.length||new Set(after.filter(id=>id!=='0')).size!==after.filter(id=>id!=='0').length)return null;
  const diff=[...added,...removed].map(id=>pool.get(id));
  if(diff.some(p=>!p||number(p.points)===null||p.hasGame&&!movable(p,schedule,now)||p?.hasGame===false&&!verifiedNoGame(p,schedule)))return null;
  const kickoffs=diff.filter(p=>p.hasGame).map(p=>Date.parse(gameFor(p,schedule)?.kickoff));
  if(!kickoffs.length||kickoffs.some(t=>!Number.isFinite(t)||t<=now)||(number(projectedGain)===null||projectedGain<=0))return null;
  const playerSnapshot=p=>({id:p.id,name:p.name,position:p.position,team:p.team,projected:p.hasGame&&!p.isOut?p.points:0,noGame:verifiedNoGame(p,schedule),injury:p.injuryStatus||''});
  return {league_id:String(league.league_id),season,week,roster_id:Number(roster.roster_id),kind,
    source_version:'1.373.0',before_lineup:before,after_lineup:after,
    added_players:added.map(id=>playerSnapshot(pool.get(id))),removed_players:removed.map(id=>playerSnapshot(pool.get(id))),
    label,drop_id:dropId,projected_gain:round(projectedGain),scoring_settings:league.scoring_settings,
    captured_at:new Date(now).toISOString(),locks_at:new Date(Math.min(...kickoffs)).toISOString()};
}
// The protected worker supplies fresh provider data. Callers cannot submit or
// backdate receipts. Save only the first eligible call per kind/team/week.
export function buildAdviceReceipts({league,rosters=[],rosterId,weekly=[],values=new Map(),schedule,season,week,now=Date.now()}={}){
  const roster=rosters.find(r=>String(r.roster_id)===String(rosterId)),pool=weekly[0]?.pool;
  if(!roster||!(pool instanceof Map)||!schedule||weekly[0].week!==week||Number(league?.season)!==season||!Number.isInteger(week)||week<1||week>18)return [];
  const reserve=new Set([...(roster.reserve||[]),...(roster.taxi||[])].map(String));
  const ids=(roster.players||[]).map(String).filter(id=>!reserve.has(id)),before=(roster.starters||[]).map(String);
  const result=[];
  if(before.length===DFL_SLOTS.length&&before.every(id=>ids.includes(id))&&legalWeeklyLineup(before,pool)){
    const advice=startSitAdvice({playerIds:ids,starterIds:before,weekly:pool});
    for(const swap of advice.swaps){
      const after=before.map(id=>id===swap.out.id?swap.in.id:id);
      if(!legalWeeklyLineup(after,pool))continue;
      const row=snapshot({kind:'lineup',roster,before,after,pool,schedule,league,season,week,now,
        label:`START ${swap.in.name} · BENCH ${swap.out.name}`,projectedGain:swap.gain});
      if(row){result.push(row);break}
    }
  }
  const plan=buildWaiverPlan({rosters,rosterId,weekly,schedule,values,league,now});
  if(plan.state!=='ready')return result;
  const locked=before.flatMap((id,slotIndex)=>{const p=pool.get(id);return id!=='0'&&p?.hasGame&&!movable(p,schedule,now)?[{id,slotIndex}]:[]});
  const base=rosterLineupScore(ids,pool,{locked,includeLineup:true});
  if(!base)return result;
  for(const offer of plan.offers){
    if(offer.targetWeek!==week||!(offer.gains.find(g=>g.week===week)?.gain>=1.5))continue;
    const next=rosterLineupScore(ids.filter(id=>id!==offer.drop?.id).concat(offer.player.id),pool,{locked,includeLineup:true});
    if(!next||next.filled<base.filled)continue;
    const row=snapshot({kind:'waiver',roster,before:base.slots,after:next.slots,pool,schedule,league,season,week,now,
      label:`ADD ${offer.player.name}${offer.drop?` · DROP ${offer.drop.name}`:' · OPEN SPOT'}`,dropId:offer.drop?.id||null,projectedGain:next.total-base.total});
    if(row){result.push(row);break}
  }
  return result;
}
export function gradeAdviceReceipt(receipt,{stats=[],completed=false,teamName=null}={}){
  const base={...receipt,teamName:teamName||`Team ${receipt.roster_id}`,grade:'pending',actualGain:null,copy:'Waiting for final scores.'};
  if(!completed)return base;
  const captured=Date.parse(receipt.captured_at),locks=Date.parse(receipt.locks_at);
  if(!Number.isFinite(captured)||!Number.isFinite(locks)||captured>=locks)return {...base,grade:'ungraded',copy:'No verified pre-kickoff record.'};
  const rows=new Map(stats.map(row=>[String(row.player_id),row]));
  const actual=p=>{
    if(p.noGame===true)return 0;
    const row=rows.get(String(p.id));
    if(!row?.stats||!Object.keys(row.stats).length||!Object.values(row.stats).some(v=>number(v)!==null))return null;
    if(Object.keys(receipt.scoring_settings||{}).some(key=>key in row.stats&&number(row.stats[key])===null))return null;
    const score=scorePlayer(row.stats,receipt.scoring_settings);return number(score);
  };
  const added=(receipt.added_players||[]).map(actual),removed=(receipt.removed_players||[]).map(actual);
  if(!added.length||[...added,...removed].some(v=>v===null))return {...base,copy:'A player’s final score is still unavailable.'};
  const gain=round(added.reduce((a,b)=>a+b,0)-removed.reduce((a,b)=>a+b,0));
  const grade=gain>.5?'hit':gain<-.5?'miss':'push';
  return {...base,grade,actualGain:gain,addedActual:added,removedActual:removed,
    copy:grade==='hit'?'DFL HQ backed its shit up.':grade==='miss'?'DFL HQ talked shit and got this one wrong.':'All that talk. Basically a wash.'};
}
export function adviceReceiptSummary(rows=[]){
  const count=grade=>rows.filter(r=>r.grade===grade).length;
  return {hits:count('hit'),misses:count('miss'),pushes:count('push'),pending:count('pending'),ungraded:count('ungraded')};
}
