import {DFL_SLOTS,slotEligible,availableBeforeKickoff} from './lineup-alert-model.js';
const finite=n=>n!==null&&n!==undefined&&Number.isFinite(Number(n));
const usable=p=>p&&finite(p.points)&&p.hasGame&&!p.isOut;
const round=n=>Math.round(n*10)/10;

// Maximum-weight slot assignment; a flex never steals a needed second RB/WR.
export function rosterLineupScore(ids,pool,{locked=[],includeLineup=false}={}) {
  let mask=0,total=0;const used=new Set(),slots=Array(DFL_SLOTS.length).fill("0");
  for(const {id,slotIndex} of locked){if(mask&(1<<slotIndex))continue;mask|=1<<slotIndex;used.add(String(id));slots[slotIndex]=String(id);const p=pool.get(String(id));if(!p||!finite(p.points))return null;total+=p.hasGame&&!p.isOut?Number(p.points):0}
  let states=new Map([[mask,{total,filled:locked.length,...(includeLineup?{slots}: {})}]]);
  for(const id of [...new Set(ids.map(String))]){
    if(used.has(id))continue;const p=pool.get(id);if(!usable(p))continue;
    const next=new Map(states);
    for(const [bits,value]of states)for(let i=0;i<DFL_SLOTS.length;i++){
      if(bits&(1<<i)||!slotEligible(p,DFL_SLOTS[i]))continue;
      const key=bits|1<<i,candidate={total:value.total+Number(p.points),filled:value.filled+1};
      if(!next.has(key)||candidate.total>next.get(key).total){if(includeLineup){candidate.slots=[...value.slots];candidate.slots[i]=id}next.set(key,candidate);}
    }
    states=next;
  }
  return [...states.values()].sort((a,b)=>b.filled-a.filled||b.total-a.total)[0];
}

export function buildWaiverPlan({rosters=[],rosterId,weekly=[],schedule=null,values=new Map(),trending=null,league={},now=Date.now(),fresh=true,candidateIds=null}={}){
  const mine=rosters.find(r=>String(r.roster_id)===String(rosterId)),count=Number(league.total_rosters)||12;
  if(!fresh||!mine||rosters.length!==count||new Set(rosters.map(r=>String(r.roster_id))).size!==count||rosters.some(r=>!Array.isArray(r.players))||!(weekly[0]?.pool instanceof Map))return {state:'unavailable',offers:[]};
  if(!schedule)return {state:'schedule-unavailable',offers:[]};
  const owned=new Set(rosters.flatMap(r=>[...r.players,...(r.reserve||[]),...(r.taxi||[])]).map(String));
  const reserve=new Set([...(mine.reserve||[]),...(mine.taxi||[])].map(String));
  const ids=mine.players.map(String).filter(id=>!reserve.has(id)),starters=(mine.starters||[]).map(String),starting=new Set(starters);
  const current=weekly[0].pool;
  if(starters.some(id=>id!=='0'&&(!current.has(id)||current.get(id).hasGame&&!finite(current.get(id).points))))return {state:'unavailable',offers:[]};
  const state=p=>{const team=({WSH:'WAS',JAC:'JAX',LA:'LAR'}[p?.team]||p?.team);return schedule.get(team)};
  const locked=starters.flatMap((id,slotIndex)=>{if(id==='0')return [];const p=current.get(id);if(p?.hasGame===false)return [];const game=state(p);return !game||game.key!=='upcoming'||Date.parse(game.kickoff)<=now?[{id,slotIndex}]:[]});
  const canMove=p=>availableBeforeKickoff({...p,state:state(p)?.key,kickoff:state(p)?.kickoff},now);
  const dropOptions=ids.filter(id=>!starting.has(id)&&!reserve.has(id)).map(id=>({id,p:current.get(id),value:values.get(id)}))
    .filter(row=>row.p&&finite(row.p.points)&&canMove(row.p)&&row.value&&row.value.tradeValue<50&&!(row.value.positionRank>0&&row.value.positionRank<=({QB:12,RB:30,WR:36,TE:12}[row.p.position]||0)))
    .sort((a,b)=>a.value.tradeValue-b.value.tradeValue||Number(a.p.points)-Number(b.p.points)).slice(0,8);
  const bases=weekly.map((w,i)=>({week:w.week,pool:w.pool,weight:[1,.7,.45][w.week-weekly[0].week],base:rosterLineupScore(ids,w.pool,{locked:i?[]:locked}),locked:i?[]:locked}));
  const futureCount=weekly.length;
  const wanted=candidateIds?new Set(candidateIds.map(String)):null;
  const candidates=[...current.values()].filter(p=>(!wanted||wanted.has(String(p.id)))&&!owned.has(String(p.id))&&usable(p)&&!p.isRisky&&canMove(p)).sort((a,b)=>b.points-a.points).slice(0,wanted?20:90);
  const offers=[];
  for(const player of candidates){
    let best=null;
    // Sleeper's roster capacity counts the non-BN starting slots plus BN slots.
    const capacity=Array.isArray(league.roster_positions)?league.roster_positions.filter(s=>s!=='IR').length:ids.length;
    const options=ids.length<capacity?[null]:dropOptions;
    for(const drop of options){
      const next=ids.filter(id=>id!==drop?.id).concat(String(player.id));
      const gains=bases.map(w=>{const after=rosterLineupScore(next,w.pool,{locked:w.locked});return {week:w.week,gain:w.base&&after?round(after.total-w.base.total):null,coverage:w.base&&after?after.filled-w.base.filled:0,weight:w.weight}});
      if(!gains.some(g=>g.gain>=1.5)||gains.some(g=>g.gain!==null&&g.gain< -1.5))continue;
      const score=gains.reduce((n,g)=>n+(g.gain||0)*g.weight,0);
      if(!best||score>best.score)best={player,drop:drop?{...drop.p,tradeValue:drop.value.tradeValue}:null,gains,score};
    }
    if(!best)continue;
    const strongest=[...best.gains].sort((a,b)=>(b.gain||0)-(a.gain||0))[0];
    const kind=strongest.week!==weekly[0].week?'Plan ahead':strongest.coverage>0?'Fill a gap':player.position==='QB'||player.position==='K'||player.position==='DEF'?'Streamer':'Lineup upgrade';
    const adds=Number(trending?.adds?.get(String(player.id)))||0;
    const urgent=kind==='Fill a gap',stream=['QB','K','DEF'].includes(player.position);
    const base=stream?[0,3]:urgent?[5,12]:best.score>=6?[4,9]:[1,4];
    const budget=Number(league.settings?.waiver_budget),spent=Number(mine.settings?.waiver_budget_used)||0;
    const faab=Number(league.settings?.waiver_type)===2&&budget>0?{min:Math.min(Math.floor(base[0]*budget/100),Math.max(0,budget-spent)),max:Math.min(Math.ceil(base[1]*budget/100),Math.max(0,budget-spent)),budget,remaining:Math.max(0,budget-spent)}:null;
    offers.push({...best,kind,adds,faab,targetWeek:strongest.week});
  }
  offers.sort((a,b)=>b.score-a.score||b.adds-a.adds||a.player.name.localeCompare(b.player.name));
  if(wanted)return {state:'ready',offers,futureCount,week:weekly[0].week,rosterId:mine.roster_id};
  const counts=new Map(),shortlist=offers.filter(o=>{const position=o.player.position,count=counts.get(position)||0,limit=['QB','K','DEF'].includes(position)?1:2;if(count>=limit)return false;counts.set(position,count+1);return true}).slice(0,4);
  return {state:'ready',offers:shortlist,futureCount,week:weekly[0].week,rosterId:mine.roster_id};
}
