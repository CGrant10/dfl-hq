import {DFL_SLOTS,slotEligible} from './lineup-alert-model.js';
const finite=n=>n!==null&&n!==undefined&&Number.isFinite(Number(n));
const cents=n=>Math.round(Number(n)*100);
const lines={
 bench:['Brilliant fucking management, dumbass.','All that tinkering, just to bench the fucking answer.','Your bench showed up. Your fucking lineup did not.'],
 escape:['Unclench, you lucky fucking bastard.','Talk your shit. Quietly. That was a fucking escape.','A win is a win, you fortunate little shit.'],
 blowout:['The group chat is going to be a rough fucking place tonight.','Keep the receipt. That was a fucking demolition.','No bad-beat speech is getting you out of that ass-kicking.'],
};
// Stable for a scored matchup; refreshing or changing today's date never
// rerolls a roast. Current names and the proven score remain the actual story.
const roastLine=(kind,key)=>{let hash=2166136261;for(const letter of String(key))hash=Math.imul(hash^letter.charCodeAt(0),16777619);return lines[kind][(hash>>>0)%lines[kind].length]};
// Submitted slots prove eligibility, not historical availability at kickoff.
export function weeklyRoasts({completed=false,games=[],raw=[],players={},rosterPositions=DFL_SLOTS,season,week,now=Date.now()}={}){
  if(!completed)return [];
  const slots=rosterPositions.filter(s=>s!=='BN');
  if(slots.length!==DFL_SLOTS.length)return [];
  const date=new Date(now),referenceSeason=date.getUTCMonth()<3?date.getUTCFullYear()-1:date.getUTCFullYear();
  const rows=new Map(raw.map(r=>[String(r.roster_id),r])),receipts=[];
  for(const game of games){
    const {left,right}=game;if(!finite(left?.score)||!finite(right?.score)||left.score===right.score)continue;
    const winner=left.score>right.score?left:right,loser=winner===left?right:left;
    const margin=cents(winner.score)-cents(loser.score),row=rows.get(String(loser.roster));let best=null;
    const copyKey=`${season}:${week??''}:${game.matchup_id}:${winner.roster}:${loser.roster}:${margin}`;
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
        text:`${loser.name} benched ${name}’s ${best.points.toFixed(2)} and lost by ${(margin/100).toFixed(2)}. ${roastLine('bench',copyKey)}`,
        detail:`Lineup hindsight: ${name} for ${starter} adds ${(best.gain/100).toFixed(2)}. Slot-eligible in the submitted lineup; kickoff availability was not recorded.`,weight:best.gain});
    }else if(margin<=500){
      receipts.push({key:`escape:${game.matchup_id}`,memberId:winner.memberId,name:winner.name,kind:'Narrow escape',text:`${winner.name} beat ${loser.name} by ${(margin/100).toFixed(2)}. ${roastLine('escape',copyKey)}`,detail:'Final matchup score.',weight:500-margin});
    }else if(margin>=3500){
      receipts.push({key:`blowout:${game.matchup_id}`,memberId:loser.memberId,name:loser.name,kind:'Body bag',text:`${loser.name} lost to ${winner.name} by ${(margin/100).toFixed(2)}. ${roastLine('blowout',copyKey)}`,detail:'Final matchup score.',weight:margin});
    }
  }
  return receipts.sort((a,b)=>b.weight-a.weight).slice(0,4);
}
