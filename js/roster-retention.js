// Drop advice is stricter than pricing a voluntary trade: useful insurance
// should not fund a marginal pickup. Facts come from the shared player model.
const finite=value=>value!=null&&value!==''&&Number.isFinite(Number(value));
const club=value=>({JAC:'JAX',WSH:'WAS',LA:'LAR'}[value]||value);
const slots={QB:1,RB:2,WR:2,TE:1};
const playable=p=>p&&p.hasGame&&!p.isOut&&!p.outForSeason&&finite(p.points)&&Number(p.points)>0;
export function rosterRetention({id,rosterIds=[],ownedIds=rosterIds,values=new Map(),weekly=[],players={},incoming=null}={}){
 id=String(id);const ids=[...new Set(rosterIds.map(String))],value=values.get(id),current=weekly[0]?.pool?.get(id);
 const position=current?.position||value?.position||players[id]?.p||players[id]?.position;
 if(!slots[position]||value?.outForSeason||current?.outForSeason)return null;
 const leadId=value?.handcuffForId&&String(value.handcuffForId),lead=leadId&&values.get(leadId);
 if(position==='RB'&&leadId&&ownedIds.map(String).includes(leadId)&&lead&&!lead.outForSeason&&!value.outForSeason
  &&(!value.backfieldStatus||value.backfieldStatus==='Fresh')&&club(lead.nflTeam)===club(value.nflTeam)&&lead.nflTeam){
  return {kind:'handcuff',id,name:value.name||current?.name||id,starterId:leadId,starterName:lead.name||leadId,reason:`${lead.name||leadId} cover`};
 }
 if(position==='RB'&&value?.backfieldStatus&&value.backfieldStatus!=='Fresh'&&value.nflTeam&&ownedIds.some(key=>{
  const other=values.get(String(key));return String(key)!==id&&other?.position==='RB'&&!other.outForSeason&&club(other.nflTeam)===club(value.nflTeam);
 }))return {kind:'roles',id,name:value.name||current?.name||id,reason:'RB role unverified'};
 const healthy=Math.max(Number(value?.forwardPerGame)||0,...weekly.map(w=>Number(w.pool?.get(id)?.points)||0));
 if(healthy<({QB:16,RB:4,WR:5,TE:5}[position])||Number(value?.tradeValue)<5)return null;
 // Ordinary 1QB/1TE streamers are expendable unless a known absence or
 // questionable starter makes the reserve actionable insurance.
 if(['QB','TE'].includes(position)&&!weekly.some(view=>ids.some(key=>key!==id&&view.pool?.get(key)?.position===position
  &&(view.pool.get(key).isOut||view.pool.get(key).isRisky||view.pool.get(key).hasGame===false))))return null;
 for(const view of weekly){
  const drop=view.pool?.get(id);if(!playable(drop))continue;
  const before=ids.map(key=>view.pool.get(key)).filter(p=>p?.position===position&&playable(p));
  const replacement=incoming&&view.pool.get(String(incoming.id));
  const after=before.filter(p=>String(p.id)!==id).length+(replacement?.position===position&&playable(replacement)?1:0);
  if(after<before.length&&after<=slots[position])return {kind:'depth',id,name:value?.name||current?.name||id,position,week:view.week,reason:view.week!==weekly[0]?.week?`Week ${view.week} ${position} cover`:`Last usable ${position} reserve`};
 }
 return null;
}
export function retainedRosterDepth(input){
 return input.rosterIds.map(id=>rosterRetention({...input,id})).filter(Boolean)
  .sort((a,b)=>Number(b.kind==='handcuff')-Number(a.kind==='handcuff')||String(a.id).localeCompare(String(b.id)));
}
