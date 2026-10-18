// Shared by the live screens and the protected background alert worker.
export const DFL_SLOTS = ['QB','RB','RB','WR','WR','TE','FLEX','K','DEF'];
const out = /^(out|ir|injured reserve|pup|sus|suspended|na|dnr|doubtful)$/i;
const risk = /^(questionable|q)$/i;
const finite = n => n !== null && n !== undefined && Number.isFinite(Number(n));
export const slotEligible = (player, slot) => {
  const positions = player?.positions?.length ? player.positions : [player?.position];
  return positions.some(p => slot === 'FLEX' ? ['RB','WR','TE'].includes(p) : p === slot);
};
export function availableBeforeKickoff(player, now = Date.now()) {
  return !player?.empty && player?.state === 'upcoming'
    && Number.isFinite(Date.parse(player.kickoff)) && Date.parse(player.kickoff) > now;
}
export function lineupRescuePlan(team, {completed=false,now=Date.now(),windowMs=Infinity}={}) {
  if(completed)return [];
  const starters=new Set((team.lineup||[]).filter(p=>!p.empty).map(p=>String(p.id)));
  const claimed=new Set();
  const priority=p=>p.empty||out.test(p.availabilityStatus||'')||out.test(p.injuryStatus||'')?2:risk.test(p.injuryStatus||'')?1:0;
  return [...(team.lineup||[])].sort((a,b)=>priority(b)-priority(a)||Number(a.slotType==='FLEX')-Number(b.slotType==='FLEX')).flatMap(player=>{
    const status=out.test(player.availabilityStatus||'')?player.availabilityStatus:player.injuryStatus||'';
    if(!player.empty&&!out.test(status)&&!risk.test(status))return [];
    if(!player.empty&&!['upcoming','unknown'].includes(player.state))return [];
    if(!player.empty&&Number.isFinite(Date.parse(player.kickoff))&&Date.parse(player.kickoff)<=now)return [];
    if(Number.isFinite(windowMs)&&(!availableBeforeKickoff(player,now)||Date.parse(player.kickoff)-now>windowMs))return [];
    const slot=player.slotType||({Flex:'FLEX',Kicker:'K',Def:'DEF'}[player.slot]||player.slot||player.position);
    const backups=(team.bench||[]).filter(p=>!claimed.has(String(p.id))&&p.activeRoster!==false&&!starters.has(String(p.id))&&slotEligible(p,slot)
      &&availableBeforeKickoff(p,now)&&!out.test(p.availabilityStatus||'')&&!out.test(p.injuryStatus||'')&&!risk.test(p.injuryStatus||''));
    const kickoff=Date.parse(player.kickoff);
    backups.sort((a,b)=>(risk.test(status)?Number(Date.parse(b.kickoff)>=kickoff)-Number(Date.parse(a.kickoff)>=kickoff):0)
      ||(finite(b.projection)?Number(b.projection):0)-(finite(a.projection)?Number(a.projection):0)||a.name.localeCompare(b.name));
    const backup=backups[0]||null;
    if(backup)claimed.add(String(backup.id));
    return [{player,slot,status:player.empty?'Empty slot':status,severity:player.empty||out.test(status)?'out':'questionable',backup,
      lateCover:!!backup&&Number.isFinite(kickoff)&&Date.parse(backup.kickoff)>=kickoff,
      actionable:player.empty||availableBeforeKickoff(player,now)}];
  });
}
/** One owner notification for new problems; earlier polls and legacy alerts count.
 * @param {{season:number,week:number,teams?:Array<any>,completed?:boolean,now?:number,notifiedKeys?:Array<string>}} input */
export function lineupAlertDrafts({season,week,teams=[],completed=false,now=Date.now(),notifiedKeys=[]}) {
  if(completed)return [];
  const notified=new Set(notifiedKeys);
  return teams.filter(t=>Number.isSafeInteger(Number(t.memberId))&&Number(t.memberId)>0).flatMap(team=>{
    const alerts=lineupRescuePlan(team,{now,windowMs:90*60000}).map(alert=>({...alert,
      key:`weekly:lineup:${season}:${week}:${team.roster}:${alert.player.id}:${alert.severity}`}))
      .filter(alert=>!notified.has(alert.key)&&!(alert.severity==='questionable'&&notified.has(alert.key.replace(/questionable$/, 'out'))));
    if(!alerts.length)return [];
    const first=alerts[0];
    const detail=alerts.map(alert=>`${alert.player.name} (${alert.status})${alert.backup?` → ${alert.backup.name}${alert.severity==='questionable'&&!alert.lateCover?' [earlier kickoff]':''}`:`: no healthy ${alert.slot} backup`}`).join('; ');
    const suffix=' Open Team Analyzer before kickoff.';
    const body=detail.length+suffix.length<=240?detail+suffix:`${alerts.length} lineup problems. ${first.player.name}: ${first.status}${first.backup?` → ${first.backup.name}`:''}. Open Team Analyzer for all backups before kickoff.`;
    return [{title:alerts.length===1?`${first.player.name}: ${first.status}`:`${alerts.length} starters need attention`,
      body,category:'matchups',audience:'members',targetMemberIds:[Number(team.memberId)],
      targetUrl:'#/analyzer?owner='+encodeURIComponent(team.uid),
      lineupKeys:alerts.map(alert=>alert.key).sort(),
      expiresAt:new Date(Math.min(...alerts.map(alert=>Date.parse(alert.player.kickoff)))).toISOString(),
    }];
  });
}
export async function lineupAlertSourceKey(draft) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(draft.lineupKeys.join('|')));
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  return draft.lineupKeys[0].split(':').slice(0,5).join(':')+':group:'+hash;
}
