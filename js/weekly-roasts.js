import {DFL_SLOTS,slotEligible} from './lineup-alert-model.js';
const finite=n=>n!==null&&n!==undefined&&Number.isFinite(Number(n));
const cents=n=>Math.round(Number(n)*100);
// Submitted slots prove eligibility, not historical availability at kickoff.
export function weeklyRoasts({completed=false,games=[],raw=[],players={},rosterPositions=DFL_SLOTS,season,now=Date.now()}={}){
  if(!completed)return [];
  const slots=rosterPositions.filter(s=>s!=='BN');
  if(slots.length!==DFL_SLOTS.length)return [];
  const date=new Date(now),referenceSeason=date.getUTCMonth()<3?date.getUTCFullYear()-1:date.getUTCFullYear();
  const rows=new Map(raw.map(r=>[String(r.roster_id),r])),receipts=[];
  for(const game of games){
    const {left,right}=game;if(!finite(left?.score)||!finite(right?.score)||left.score===right.score)continue;
    const winner=left.score>right.score?left:right,loser=winner===left?right:left;
    const margin=cents(winner.score)-cents(loser.score),row=rows.get(String(loser.roster));let best=null;
    if(Number(season)===referenceSeason&&row?.starters?.length===slots.length&&row.players_points){
      const starting=new Set(row.starters.map(String));
      for(const [id,points]of Object.entries(row.players_points)){
        if(starting.has(id)||!finite(points)||!players[id]?.p)continue;
        const bench={position:players[id].p,positions:players[id].fp};
        row.starters.forEach((starter,index)=>{
          if(String(starter)==='0'||!finite(row.players_points[starter])||!slotEligible(bench,slots[index]))return;
          const gain=cents(points)-cents(row.players_points[starter]);
          if(gain>margin&&(!best||gain>best.gain))best={gain,id,starter,points:Number(points)};
        });
      }
    }
    if(best){
      const name=players[best.id].n||`Player ${best.id}`,starter=players[best.starter]?.n||`Player ${best.starter}`;
      receipts.push({key:`bench:${game.matchup_id}`,memberId:loser.memberId,name:loser.name,kind:'Bench disaster',
        text:`${loser.name} benched ${name}’s ${best.points.toFixed(2)} and lost by ${(margin/100).toFixed(2)}. That’s some fucking management.`,
        detail:`Lineup hindsight: ${name} for ${starter} adds ${(best.gain/100).toFixed(2)}. Slot-eligible in the submitted lineup; kickoff availability was not recorded.`,weight:best.gain});
    }else if(margin<=500){
      receipts.push({key:`escape:${game.matchup_id}`,memberId:winner.memberId,name:winner.name,kind:'Narrow escape',text:`${winner.name} beat ${loser.name} by ${(margin/100).toFixed(2)}. Talk your shit, but unclench first.`,detail:'Final matchup score.',weight:500-margin});
    }else if(margin>=3500){
      receipts.push({key:`blowout:${game.matchup_id}`,memberId:loser.memberId,name:loser.name,kind:'Body bag',text:`${loser.name} lost to ${winner.name} by ${(margin/100).toFixed(2)}. The group chat is going to be a rough fucking place tonight.`,detail:'Final matchup score.',weight:margin});
    }
  }
  return receipts.sort((a,b)=>b.weight-a.weight).slice(0,4);
}
