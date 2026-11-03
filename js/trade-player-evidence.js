// Observed results and model sensitivity, not a statistical confidence interval.
const finite = v => v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
const quantile = (values, fraction) => {
  const sorted = [...values].sort((a,b)=>a-b), at=(sorted.length-1)*fraction;
  return sorted[Math.floor(at)] + (sorted[Math.ceil(at)]-sorted[Math.floor(at)])*(at%1);
};
export function productionProfile(samples = []) {
  const scores=samples.map(s=>finite(s.points)).filter(v=>v!=null);
  if(!scores.length)return {games:0,average:null,floor:null,ceiling:null,variation:null};
  const average=scores.reduce((a,b)=>a+b,0)/scores.length;
  const deviation=Math.sqrt(scores.reduce((n,v)=>n+(v-average)**2,0)/scores.length);
  return {games:scores.length,average,floor:quantile(scores,.25),ceiling:quantile(scores,.75),variation:average>0?deviation/average:null};
}
export function playerSensitivity(player) {
  const sample=player.consistency||{},games=Number(sample.games)||Number(player.currentGames)||0;
  // Conservative assumptions; widen for small samples, volatility and uncertainty.
  const sampling=sample.variation!=null&&games?sample.variation/Math.sqrt(games):.16;
  return Math.min(.5,Math.max(.1,sampling)+(games<4 ? .06 : 0)
    +(player.modelSource&&player.modelSource!=='projection' ? .12 : 0)
    +(player.isOut ? .16 : player.isRisky ? .06 : 0)+(player.staleSignals?.length ? .12 : 0)
    +(player.expertDisagreement||player.expertSplit ? .1 : 0)+(player.expertFeedStatus&&(!player.expert||player.expertFeedStatus!=='Fresh') ? .08 : 0));
}
export function packageValue(ids,pool) {
  let value=0,first=0,second=0;
  const seen=new Set();
  for(const id of ids){
    const key=String(id);if(seen.has(key))continue;seen.add(key);
    const player=pool.get(key),price=Number(player?.tradeValue)||0;
    if(player?.position==='QB'&&player.oneQbValueFactor!=null){
      if(price>first){second=first;first=price}else if(price>second)second=price;
    }else value+=price;
  }
  return value+first+second*.2;
}
export function packageContributions(ids,pool) {
  const players=[...new Set(ids.map(String))].map(id=>pool.get(id)).filter(Boolean);
  const qbs=players.filter(p=>p.position==='QB'&&p.oneQbValueFactor!=null).sort((a,b)=>b.tradeValue-a.tradeValue||String(a.id).localeCompare(String(b.id)));
  // A 1QB package buys one starter and, at most, cheap backup insurance.
  // A third streamer cannot manufacture the price of a premium skill player.
  return players.map(player=>({player,value:(Number(player.tradeValue)||0)*(qbs.includes(player)?[1,.2,0][Math.min(2,qbs.indexOf(player))]:1)}));
}
export function packageEvidence(ids,pool) {
  const pieces=packageContributions(ids,pool);
  const value=pieces.reduce((sum,p)=>sum+p.value,0);
  const low=pieces.reduce((sum,p)=>sum+p.value*(1-playerSensitivity(p.player)),0);
  const high=pieces.reduce((sum,p)=>sum+p.value*(1+playerSensitivity(p.player)),0);
  return {value:Math.round(value*10)/10,low:Math.round(low*10)/10,high:Math.round(high*10)/10};
}
export function comparableStarPremium(outgoing,incoming,pool) {
  if(incoming.length!==1||outgoing.length<2)return false;
  const target=pool.get(String(incoming[0])),options=outgoing.map(id=>pool.get(String(id))).filter(Boolean);
  if(!target)return false;
  const pace=p=>Number(p.tradePerGame??p.expectedPerGame??Number(p.expectedPoints)/17)||0;
  return options.some(p=>p.position===target.position&&pace(target)>0&&Math.abs(pace(p)-pace(target))/Math.max(pace(p),pace(target))<=.15
    && options.some(extra=>extra.id!==p.id&&Number(extra.tradeValue)>=5));
}
