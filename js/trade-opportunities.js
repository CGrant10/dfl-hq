import {automaticTradePlayer} from './player-availability.js';
import {tradeAssessment} from './trade-assessment.js';
import {compareTradeSuggestions} from './trade-suggestion-quality.js';
export function scoutSnapshot(teams,pool,at=Date.now()){
 const players={};for(const team of teams)for(const id of team.playerIds||[]){const p=pool.get(String(id));if(p)players[String(id)]={owner:String(team.id),value:Number(p.tradeValue)||0,status:String(p.injuryStatus||'')}}return {at,players};
}
export function tradeOpportunities(offers,{mine,pool,intentions={},previous=null,limit=3}={}){
 if(!mine||!pool)return [];
 const mineIds=new Set((mine.playerIds||[]).map(String)),seen=new Set(),partners=new Set(),result=[];
 for(const row of [...offers].sort(compareTradeSuggestions)){
  if(row.parties||!row.other||String(row.other.id)===String(mine.id)||!row.sendA?.length||!row.sendB?.length)continue;
  const theirIds=new Set((row.other.playerIds||[]).map(String));
  if(row.sendA.some(id=>!mineIds.has(String(id)))||row.sendB.some(id=>!theirIds.has(String(id))))continue;
  const a=tradeAssessment(row),deltas=row.windowDeltas||[row.weeklyDeltaA,row.weeklyDeltaB];
  if(!a||a.needsReview||a.fairness<85||a.fitA<0||a.fitB<0||row.requiredDropsA?.length||row.requiredDropsB?.length||deltas.length!==2||deltas.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<.2))continue;
  if([...row.sendA,...row.sendB].some(id=>!automaticTradePlayer(pool.get(String(id)))))continue;
  if(row.sendB.some(id=>intentions[String(row.other.id)]?.players?.[id]==='keeping'))continue;
  const fingerprint=JSON.stringify([[...row.sendA].sort(),[...row.sendB].sort(),String(row.other.id)]);
  if(seen.has(fingerprint)||partners.has(String(row.other.id)))continue;
  seen.add(fingerprint);partners.add(String(row.other.id));
  const incoming=row.sendB.map(id=>pool.get(String(id))),outgoing=row.sendA.map(id=>pool.get(String(id)));
  const reasons=[];
  if(row.sendB.some(id=>['available','listening'].includes(intentions[String(row.other.id)]?.players?.[id])))reasons.push('Manager is open');
  if(previous?.players){for(const p of incoming){const old=previous.players[p.id];if(!old)continue;if(old.owner!==String(row.other.id)){reasons.push('Roster changed');break}if(old.status!==String(p.injuryStatus||'')){reasons.push('Status changed');break}if(Math.abs(old.value-Number(p.tradeValue))>=3){reasons.push('Value moved');break}}}
  if((row.startingIncomingA||[]).some(id=>pool.get(String(id))?.position===mine.need))reasons.push(`Adds ${mine.need} help`);
  result.push({offer:row,incoming,outgoing,deltas,balance:Math.round(a.fairness),signals:reasons.slice(0,2)});
  if(result.length>=limit)break;
 }
 return result;
}
const storageKey=(member,season)=>`dfl.scout.baseline.v1.${member||'guest'}.${season}`;
export function readScoutBaseline(member,season,storage=globalThis.localStorage,now=Date.now()){
 try{const data=JSON.parse(storage.getItem(storageKey(member,season))||'null');return data?.players&&typeof data.players==='object'&&Number.isFinite(data.at)&&now>=data.at&&now-data.at<14*86400000?data:null}catch{return null}
}
export function saveScoutBaseline(member,season,snapshot,storage=globalThis.localStorage){try{storage.setItem(storageKey(member,season),JSON.stringify(snapshot))}catch{}}
