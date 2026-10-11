import { scenarioLine, stakeLine } from "./league-stakes.js";

const key = value => value == null ? "" : String(value);

export function buildWeeklyBriefing({ outlook, stakes, move, coach, meSleeperId, now = new Date() } = {}) {
  const mine = stakes?.rows?.find(row => key(row.sleeperUserId) === key(meSleeperId)) || null;
  const matchup = outlook?.predictions?.find(game => game.isMine) || null;
  const swap = outlook?.startSit?.swaps?.[0] || null;
  const tuesday = now.getDay() === 2;
  const fresh=coach&&coach.plan?.state==='ready'&&Number(coach.plan.week)===Number(outlook?.week)&&Number(coach.checkedAt)>0&&now.getTime()-coach.checkedAt<120000;
  const alert=fresh?coach.rescue?.find(row=>row.actionable):null;
  const pickup=fresh?coach.plan.offers?.[0]:null;
  const actionUrl=meSleeperId?'#/analyzer?owner='+encodeURIComponent(meSleeperId):'#/analyzer';
  return {
    title: tuesday ? "Tuesday Briefing" : "Weekly Briefing",
    week: outlook?.week || stakes?.week || null,
    headline: matchup ? `${matchup.winner.name} is favored by ${Number(matchup.margin).toFixed(1)}` : "Your week is taking shape",
    matchup: matchup ? `${matchup.winner.name} ${Number(matchup.winner.projection).toFixed(1)} · ${matchup.loser.name} ${Number(matchup.loser.projection).toFixed(1)}` : "Sleeper matchup pending",
    playoff: mine ? stakeLine(mine) : "Playoff model pending",
    playoffDetail: mine ? scenarioLine(mine, stakes?.berths) : "Sync the league to build your path.",
    lineup: alert ? `${alert.player.name}: ${alert.status}${alert.backup?` · ${alert.backup.name} can cover ${alert.slot}`:` · no unlocked ${alert.slot} backup`}` : swap ? `Start ${swap.start.name} over ${swap.sit.name} · +${Number(swap.gain).toFixed(1)}`
      : outlook?.startSit?.lineupIsSet ? "No lineup move worth forcing" : "Set your lineup",
    action: pickup ? `Add ${pickup.player.name}${pickup.drop?` · drop ${pickup.drop.name}`:''}${pickup.targetWeek!==coach.plan.week?` · Week ${pickup.targetWeek} cover`:''}`
      : fresh ? 'No clear pickup improvement. Keep your depth.' : move?.headline || move?.title || move?.label || "Keep the roster ready",
    actionUrl, checkedAt:fresh?coach.checkedAt:null,
    needsAttention:!!alert,
  };
}
