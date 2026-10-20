import {slotEligible,availableBeforeKickoff} from './lineup-alert-model.js';
import {waiverOfferPriority} from './waiver-coach.js';
import {sleeperUrl} from './sleeper-links.js';
const skill=p=>['RB','WR','TE'].includes(p?.position);
const finite=n=>n!=null&&n!==''&&Number.isFinite(Number(n));
const teamKey=t=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[t]||t);
export function freshRosterAdvice(coach,week,now){
 const age=Number(now)-Number(coach?.checkedAt);
 return coach?.plan?.state==='ready'&&Number(coach.plan.week)===Number(week)&&Number(coach.checkedAt)>0&&age>=0&&age<120000;
}
/** One ranked action, never the first item in a raw waiver list. */
export function rosterNextAction({coach,outlook,move,meSleeperId,now=Date.now()}={}){
 const report=meSleeperId?'#/analyzer?owner='+encodeURIComponent(meSleeperId):'#/analyzer';
 const action=(kind,text,url=report)=>({kind,text,url,label:kind==='hold'?'NEXT MOVE · HOLD':kind==='ir'?'NEXT MOVE · IR RETURN':kind==='trade'?'NEXT MOVE · TRADE TARGET':kind==='waiver'?'NEXT MOVE · WAIVER TARGET':'NEXT MOVE'});
 if(!freshRosterAdvice(coach,outlook?.week,now))return action('refresh',move?.headline||move?.title||move?.label||'Refresh your roster advice');
 const week=coach.plan.week,pool=coach.weekly?.[0]?.pool;
 const roster=coach.rosters?.find(r=>String(r.roster_id)===String(coach.plan.rosterId));
 const rosterUrl=sleeperUrl(coach.league?.league_id,'roster')||report,waiverUrl=sleeperUrl(coach.league?.league_id,'waivers')||report;
 const ready=p=>{const g=coach.nfl?.teams?.get(teamKey(p?.team));return p?.hasGame&&!p.isOut&&!p.isRisky&&finite(p.points)&&availableBeforeKickoff({...p,state:g?.key,kickoff:g?.kickoff},now)};
 const alerts=(coach.rescue||[]).filter(a=>a.actionable).sort((a,b)=>Number(a.severity==='questionable')-Number(b.severity==='questionable')||Number(!skill(a.player))-Number(!skill(b.player)));
 const urgent=alerts.find(a=>a.severity!=='questionable');
 if(urgent?.backup)return action('lineup',urgent.player.empty?`Start ${urgent.backup.name} at ${urgent.slot}`:`Start ${urgent.backup.name} for ${urgent.player.name}`,rosterUrl);
 const returning=coach.plan.returns?.[0];
 if(returning&&(!urgent||slotEligible(returning.player,urgent.slot)&&returning.gain>0))return action('ir',returning.needsSpace?`Make room for ${returning.player.name} · IR return`:`Activate ${returning.player.name} from IR`,rosterUrl);
 const offers=(coach.plan.offers||[]).filter(o=>o?.player&&o.gains?.some(g=>finite(g.gain)&&g.gain>0))
  .sort((a,b)=>waiverOfferPriority(a,week)-waiverOfferPriority(b,week)||(b.score||0)-(a.score||0));
 const pickupText=(o,targetWeek=o.targetWeek)=>`Add ${o.player.name}${o.drop?` · drop ${o.drop.name}`:''} · ${targetWeek!==week?`W${targetWeek} `:''}+${Number(o.gains.find(g=>g.week===targetWeek)?.gain).toFixed(1)} projected`;
 if(urgent){
  const cover=offers.find(o=>slotEligible(o.player,urgent.slot)&&o.gains.some(g=>g.week===week&&g.coverage>0));
  return cover?action('waiver',pickupText(cover,week),waiverUrl):action('lineup',`Fill your ${urgent.slot} slot before kickoff`,rosterUrl);
 }
 const gap=offers.find(o=>o.gains.some(g=>g.week===week&&g.coverage>0));
 if(gap)return action('waiver',pickupText(gap,week),waiverUrl);
 // Validate an old outlook swap against the fresh roster and kickoff data.
 for(const swap of outlook?.startSit?.swaps||[]){
  const start=pool?.get(String(swap.start?.id)),sit=pool?.get(String(swap.sit?.id));
  const game=coach.nfl?.teams?.get(teamKey(sit?.team)),canBench=sit&&(sit.hasGame===false&&sit.scheduleKnown!==false||availableBeforeKickoff({...sit,state:game?.key,kickoff:game?.kickoff},now));
  if(!ready(start)||!canBench||!roster?.starters?.map(String).includes(String(sit.id))||!roster.players?.map(String).includes(String(start.id))||[...(roster.reserve||[]),...(roster.taxi||[])].map(String).includes(String(start.id)))continue;
  const gain=Number(start.points)-(sit.isOut||sit.hasGame===false?0:finite(sit.points)?Number(sit.points):Infinity);
  if(gain>=3)return action('lineup',`Start ${start.name} over ${sit.name} · +${gain.toFixed(1)} projected`,rosterUrl);
 }
 const pickup=offers.find(o=>{
  if(!skill(o.player)&&o.player.position!=='QB')return false;
  const target=o.gains.find(g=>g.week===o.targetWeek),threshold=o.player.position==='QB'?5:o.targetWeek===week?3:4;
  return target?.gain>=threshold;
 });
 if(pickup)return action('waiver',pickupText(pickup),waiverUrl);
 const target=move?.trade?.player,partner=move?.trade?.team;
 if(move?.need?.urgent&&target&&partner&&move.mine?.id!=null){
  const owner=coach.rosters?.find(r=>String(r.roster_id)===String(partner.id));
  if(owner?.players?.map(String).includes(String(target.id))&&![...(owner.reserve||[]),...(owner.taxi||[])].map(String).includes(String(target.id))&&ready(pool?.get(String(target.id)))&&Number(move.tradeGain)>=3)
   return action('trade',`Price a trade for ${target.name}`,`#/trade?team=${encodeURIComponent(move.mine.id)}&partner=${encodeURIComponent(partner.id)}&target=${encodeURIComponent(target.id)}`);
 }
 if(alerts[0])return action('watch',`Watch ${alerts[0].player.name}${alerts[0].backup?` · keep ${alerts[0].backup.name} available`:''}`,rosterUrl);
 if(move?.need?.urgent&&move.mine?.id!=null&&['RB','WR','TE'].includes(move.need.position))return action('trade',`Shop ${move.need.position} upgrades · keep your depth`,`#/trade?team=${encodeURIComponent(move.mine.id)}`);
 return action('hold','Hold your depth · no worthwhile upgrade');
}
