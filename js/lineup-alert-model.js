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
    backups.sort((a,b)=>Number(Date.parse(b.kickoff)>=kickoff)-Number(Date.parse(a.kickoff)>=kickoff)
      ||(finite(b.projection)?Number(b.projection):0)-(finite(a.projection)?Number(a.projection):0)||a.name.localeCompare(b.name));
    const backup=backups[0]||null;
    if(backup)claimed.add(String(backup.id));
    return [{player,slot,status:player.empty?'Empty slot':status,severity:player.empty||out.test(status)?'out':'questionable',backup,
      lateCover:!!backup&&Number.isFinite(kickoff)&&Date.parse(backup.kickoff)>=kickoff,
      actionable:player.empty||availableBeforeKickoff(player,now)}];
  });
}
/** @param {{season:number,week:number,teams?:Array<any>,completed?:boolean,now?:number}} input */
export function lineupAlertDrafts({season,week,teams=[],completed=false,now=Date.now()}) {
  if(completed)return [];
  return teams.filter(t=>Number.isSafeInteger(Number(t.memberId))&&Number(t.memberId)>0).flatMap(team=>
    lineupRescuePlan(team,{now,windowMs:90*60000}).map(alert=>({
      title:`${alert.player.name}: ${alert.status}`,
      body:alert.backup?`${alert.severity==='out'?'Replace with':'Backup option:'} ${alert.backup.name} (${alert.slot}). ${alert.severity==='questionable'&&!alert.lateCover?'Backup kicks off earlier. ':''}Set changes in Sleeper before kickoff.`:`No healthy, unlocked ${alert.slot} backup on your bench. Check waivers in Team Analyzer.`,
      category:'matchups',audience:'members',targetMemberIds:[Number(team.memberId)],
      targetUrl:'#/analyzer?owner='+encodeURIComponent(team.uid),
      sourceKey:`weekly:lineup:${season}:${week}:${team.roster}:${alert.player.id}:${alert.severity}`,
      expiresAt:alert.player.kickoff,
    })));
}
