const id=value=>value!=null&&String(value).trim()?String(value):null;
const cents=value=>(typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isFinite(Number(value))?Math.round(Number(value)*100):null;
const signature=settings=>{
 if(!settings||typeof settings!=='object'||Array.isArray(settings)||!Object.keys(settings).length||Object.values(settings).some(value=>cents(value)===null))return null;
 const values=Object.entries(settings).map(([key,value])=>[key,Math.round(Number(value)*1e6)/1e6]).filter(([,value])=>value!==0).sort(([a],[b])=>a.localeCompare(b));
 return values.length?JSON.stringify(values):null;
};

// Only a complete read, matched scoring and dated, unambiguous past receipts
// can establish a benchmark. Names never establish ownership.
export function buildRecordArchive(lore,{season,week}={}){
 if(lore?.error||lore?.archiveComplete!==true||!Number.isInteger(season)||!Number.isInteger(week)||week<1||week>18)return null;
 const formats=new Map((lore.leagues||[]).map(row=>[Number(row.season),signature(row.scoring_settings)]));
 const format=formats.get(season);if(!format)return null;
 const eligible=new Set([...formats].filter(([year,value])=>year<=season&&value===format).map(([year])=>year));
 const owners=new Map(),ownerConflicts=new Set();
 for(const row of lore.standings||[]){
  const key=`${Number(row.season)}:${id(row.roster_id)}`,owner=id(row.sleeper_user_id);if(!owner)continue;
  if(owners.has(key)&&owners.get(key)!==owner)ownerConflicts.add(key);else owners.set(key,owner);
 }
 const receipts=new Map(),tainted=new Set(),seasonTainted=new Set(),unresolved=new Set();let leagueTainted=false;
 const invalidate=(uids,year)=>{leagueTainted=true;for(const uid of uids.filter(Boolean)){tainted.add(uid);if(year===season)seasonTainted.add(uid)}};
 for(const row of lore.matchups||[]){
  const year=Number(row.season),round=Number(row.week);
  if(!eligible.has(year)||!Number.isInteger(round)||round<1||round>18||year===season&&round>=week)continue;
  const a=id(row.user1),b=id(row.user2),ra=id(row.roster1),rb=id(row.roster2),oa=owners.get(`${year}:${ra}`),ob=owners.get(`${year}:${rb}`),left=a||oa,right=b||ob;
  const pa=cents(row.score1),pb=cents(row.score2);
  if(!left||!right)unresolved.add(year);
  if(!left||!right||left===right||ownerConflicts.has(`${year}:${ra}`)||ownerConflicts.has(`${year}:${rb}`)||a&&oa&&a!==oa||b&&ob&&b!==ob||pa===null||pb===null||pa===0&&pb===0){invalidate([left,right,oa,ob],year);continue}
  const sides=[{uid:left,cents:pa},{uid:right,cents:pb}].sort((x,y)=>x.uid.localeCompare(y.uid));
  const key=`${year}:${round}:${sides[0].uid}:${sides[1].uid}`,receipt={season:year,week:round,sides};
  if(receipts.has(key)&&JSON.stringify(receipts.get(key))!==JSON.stringify(receipt)){invalidate([left,right],year);continue}
  receipts.set(key,receipt);
 }
 const byWeek=new Map();
 if(unresolved.size)for(const row of receipts.values())for(const side of row.sides){tainted.add(side.uid);if(unresolved.has(season))seasonTainted.add(side.uid)}
 for(const row of receipts.values())for(const side of row.sides){const key=`${row.season}:${row.week}:${side.uid}`;if(byWeek.has(key))invalidate([...row.sides,...byWeek.get(key).sides].map(t=>t.uid),row.season);else byWeek.set(key,row)}
 const personal=new Map(),seasonal=new Map();let league=null;
 const choose=(previous,next)=>!previous||next.cents>previous.cents?next:previous;
 const years=new Set();
 for(const row of receipts.values())for(const side of row.sides){
  const next={uid:side.uid,cents:side.cents,season:row.season,week:row.week};years.add(row.season);
  if(!tainted.has(side.uid))personal.set(side.uid,choose(personal.get(side.uid),next));
  if(row.season===season&&!seasonTainted.has(side.uid))seasonal.set(side.uid,choose(seasonal.get(side.uid),next));
  league=choose(league,next);
 }
 if(!years.size)return null;
 return {season,week,personal,seasonal,league:leagueTainted?null:league,years:[...years].sort((a,b)=>a-b)};
}

export function recordChases(model,game,{maxGap=30}={}){
 const archive=model?.recordArchive;
 if(!archive||archive.season!==model.season||archive.week!==model.week||!game?.sides?.length)return [];
 return game.sides.flatMap(team=>{
  const uid=id(team.uid||team.identity?.sleeper_user_id),score=cents(team.score);
  if(!uid||score===null||!model.completed&&(!team.known||!(team.lineup||team.starters||[]).some(p=>p.state==='live'||p.state==='final')))return [];
  const candidates=[['league',archive.league],['team',archive.personal.get(uid)],['season',archive.seasonal.get(uid)]];
  const candidate=candidates.find(([,target])=>target&&target.cents>0&&target.cents-score<=maxGap*100);
  if(!candidate)return [];
  const [kind,target]=candidate,state=score>target.cents?'cleared':score===target.cents?'tied':'chasing';
  return [{key:`${uid}:${kind}:${target.season}:${target.week}:${target.cents}`,team,uid,kind,target,state,cents:score,remaining:Math.max(0,target.cents-score+1)/100,above:Math.max(0,score-target.cents)/100,progress:Math.max(0,Math.min(1,score/(target.cents+1))),final:model.completed===true}];
 });
}
