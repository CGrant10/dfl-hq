const positions=new Set(['QB','RB','WR','TE','K']);
const nameKey=value=>String(value||'').toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b/g,'').replace(/[^a-z0-9]/g,'');
const club=value=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[value]||value||'');
export function injuryAvailability(value){
 const status=String(value||'').trim(),key=status.toLowerCase().replace(/[ _-]/g,'');
 if(key==='out')return{tag:'Out',availability:'Ruled out',tone:'out'};
 if(['injuredreserve','ir','pup','physicallyunabletoperform','suspended','suspension'].includes(key))return{tag:key==='injuredreserve'||key==='ir'?'IR':status,availability:'Unavailable',tone:'out'};
 if(key==='doubtful')return{tag:'Doubtful',availability:'Unlikely to play',tone:'risk'};
 if(key==='questionable')return{tag:'Questionable',availability:'Decision pending',tone:'watch'};
 if(key==='probable')return{tag:'Probable',availability:'Likely to play',tone:'watch'};
 if(['','active','healthy','normal'].includes(key))return null;
 return{tag:status,availability:'Not confirmed',tone:'watch'};
}
export function buildInjuryReport(payload,{analysis=null,now=Date.now()}={}){
 if(!Array.isArray(payload?.injuries))return null;
 const players=analysis?.pool instanceof Map?[...analysis.pool.values()]:[];
 const indexed=new Map();
 for(const player of players){const key=`${nameKey(player.name)}:${club(player.nflTeam)}:${player.position}`;const matches=indexed.get(key)||[];matches.push(player);indexed.set(key,matches)}
 const owners=new Map();
 for(const team of analysis?.teams||[]){const starters=new Set((team.starters||[]).map(String));for(const id of team.playerIds||[])owners.set(String(id),{name:team.team_name||team.ownerName||'DFL team',starter:starters.has(String(id))})}
 const unique=new Map();
 for(const team of payload.injuries){for(const entry of team.injuries||[]){
  const status=injuryAvailability(entry.status);
  const athlete=entry.athlete||{},name=athlete.displayName||[athlete.firstName,athlete.lastName].filter(Boolean).join(' '),position=athlete.position?.abbreviation||'',nflTeam=club(athlete.team?.abbreviation||'');if(!name)continue;
  const matches=indexed.get(`${nameKey(name)}:${nflTeam}:${position}`)||[],player=matches.length===1?matches[0]:null,owner=player?owners.get(String(player.id)):null;
  const tier=owner?(owner.starter?0:1):positions.has(position)?2:3;
  const date=Date.parse(entry.date),updatedAt=Number.isFinite(date)?date:null,athleteId=athlete.id||athlete.headshot?.href?.match(/\/(\d+)\.(?:png|jpg)(?:\?|$)/)?.[1]||(athlete.links||[]).map(link=>link.href?.match(/\/id\/(\d+)/)?.[1]).find(Boolean),id=String(athleteId||`${nflTeam}:${position}:${nameKey(name)}`);
  const report={id,sleeperId:player?.id||null,name,position,nflTeam,owner:owner?.name||'',starter:owner?.starter||false,tier,listed:!!status,...status,body:entry.details?.type||'',updatedAt,importance:Number(player?.adp)>0?Number(player.adp):Infinity,value:Number(player?.expectedPoints)||0,photo:athleteId?`https://a.espncdn.com/i/headshots/nfl/players/full/${encodeURIComponent(athleteId)}.png`:''};
  const existing=unique.get(id);if(!existing||(updatedAt||0)>(existing.updatedAt||0))unique.set(id,report);
 }}
 const items=[...unique.values()].filter(p=>p.listed).sort((a,b)=>a.tier-b.tier||a.importance-b.importance||b.value-a.value||a.name.localeCompare(b.name));
 const stamp=Date.parse(payload.timestamp);
 return{items,checkedAt:now,sourceAt:Number.isFinite(stamp)?stamp:null,rostersKnown:analysis?.state==='ready',starters:items.filter(p=>p.tier===0).length,owned:items.filter(p=>p.tier<2).length};
}
export function injuryReportSlide(report){
 return{id:'injury-report',generator:'injuryReport',source:'auto',pinned:true,priority:675,treatment:'injuries',temporal:'none',background:'slate',logo:'default',headline:'Injury report',kicker:'NFL · AVAILABILITY',players:report?.items.slice(0,4)||[],checkedAt:report?.checkedAt||0,total:report?.items.length||0,available:!!report};
}
