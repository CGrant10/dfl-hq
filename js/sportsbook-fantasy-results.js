import {matchupTeamView} from './clubhouse-matchup-model.js';

export function fantasyMarketKey(market) {
  if(market?.category&&market.category!=='Fantasy')return null;
  const parts=String(market?.auto_key||'').match(/^matchup:(\d{4}):(\d{1,2}):(\d+)$/);
  return parts&&Number(parts[2])>=1&&Number(parts[2])<=18?{season:Number(parts[1]),week:Number(parts[2]),matchupId:Number(parts[3])}:null;
}

// A current score, projection, missing starter or unknown NFL status is not final.
export function fantasyMatchupResults({markets=[],rows=[],players={},schedule,season,week,checkedAt,now=Date.now(),starterCount=9}={}) {
  const results=new Map();
  if(!Number.isFinite(checkedAt)||now-checkedAt<0||now-checkedAt>90000||!(schedule instanceof Map))return results;
  for(const market of markets){
    const key=fantasyMarketKey(market);if(!key||key.season!==Number(season)||key.week!==Number(week))continue;
    const sides=rows.filter(row=>Number(row.matchup_id)===key.matchupId);
    if(sides.length!==2||new Set(sides.map(row=>String(row.roster_id))).size!==2
      ||sides.some(row=>!Array.isArray(row.starters)||row.starters.length!==starterCount))continue;
    const teams=sides.map(row=>matchupTeamView(row,players,schedule));
    if(teams.some(team=>team.score===null))continue;
    const final=teams.every(team=>team.known&&team.remaining===0);
    results.set(String(market.id),{final,checkedAt,scores:Object.fromEntries(sides.map((row,i)=>[String(row.roster_id),teams[i].score])),
      winner:final&&teams[0].score!==teams[1].score?String(sides[teams[0].score>teams[1].score?0:1].roster_id):null});
  }
  return results;
}

export function fantasyOutcomeResult(market,outcome,now=Date.now()) {
  if(!fantasyMarketKey(market))return null;
  if(market.status==='void')return {status:'void',score:null,checkedAt:now,official:true};
  if(market.status==='settled'&&typeof outcome?.is_winner==='boolean')
    return {status:outcome.is_winner?'won':'lost',score:null,checkedAt:now,official:true};
  const result=market?._fantasyResult,id=outcome?.sleeper_roster_id;
  if(!result?.final||!Number.isFinite(result.checkedAt)||now-result.checkedAt<0||now-result.checkedAt>90000
    ||id==null||!Object.hasOwn(result.scores,String(id)))return null;
  return {status:result.winner===null?'void':String(id)===result.winner?'won':'lost',score:result.scores[String(id)],checkedAt:result.checkedAt};
}

export function withFantasyLegResult(leg,market,outcome,now=Date.now()) {
  const {live_result:_old,...clean}=leg;
  if(leg.status&&leg.status!=='open')return clean;
  const result=fantasyOutcomeResult(market,outcome,now);
  return result?{...clean,live_result:result}:clean;
}

export function bookLegResult(leg,now=Date.now()) {
  if(['won','lost','void'].includes(leg?.status))return {status:leg.status,pending:false};
  const live=leg?.live_result;
  return live&&['won','lost','void'].includes(live.status)&&Number.isFinite(live.checkedAt)&&(live.official===true||now-live.checkedAt>=0&&now-live.checkedAt<=90000)
    ?{status:live.status,pending:!live.official}:{status:'open',pending:false};
}

export function bookEntryResult(legs,now=Date.now()) {
  const results=legs.map(leg=>bookLegResult(leg,now));
  if(!results.length)return 'open';
  // The house refunds the entry on a void; keep that distinct from a miss.
  if(results.some(result=>result.status==='void'))return 'void';
  if(results.some(result=>result.status==='lost'))return 'lost';
  return results.every(result=>result.status==='won')?'won':'open';
}

export function pendingBookReturn(bet,legs,now=Date.now()) {
  if(bet?.status!=='open'||!legs.some(leg=>bookLegResult(leg,now).pending))return null;
  const result=bookEntryResult(legs,now);
  return result==='lost'?{label:'Est. return',value:0}:result==='void'?{label:'Pending refund',value:Number(bet.stake)||0}:null;
}
