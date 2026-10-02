// The league clock and the week attached to a playable market are different facts.
export function sportsbookWeekCaption(state={}){
 const season=Number(state.season),week=Number(state.week);
 return season>=2010&&week>=1&&week<=18?`Week ${week} · ${season} · NFL & fantasy`:'NFL & fantasy lines';
}
export function fantasyWeekGroups(markets=[],state={}){
 const groups=new Map(),season=Number(state.season),week=Number(state.week);
 for(const market of markets){
  const key=String(market.auto_key||'').match(/^matchup:(\d+):(\d+):/);if(!key)continue;
  const id=`${key[1]}:${key[2]}`,group=groups.get(id)||{season:Number(key[1]),week:Number(key[2]),markets:[]};group.markets.push(market);groups.set(id,group);
 }
 for(const group of groups.values())group.period=group.season===season&&group.week===week?'current':season>=2010&&week>=1?(group.season>season||group.season===season&&group.week>week?'upcoming':'previous'):'unknown';
 const order={current:0,upcoming:1,previous:2,unknown:3};
 return [...groups.values()].sort((a,b)=>order[a.period]-order[b.period]||(a.period==='previous'?b.season-a.season||b.week-a.week:a.season-b.season||a.week-b.week));
}
