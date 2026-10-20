import { scenarioLine, stakeLine } from "./league-stakes.js";
import {freshRosterAdvice,rosterNextAction} from './roster-next-action.js';

const key = value => value == null ? "" : String(value);

export function applyWeeklyBriefing(root,next){
  const line=root.querySelector('[data-brief-lineup]'),action=root.querySelector('[data-brief-action]'),label=root.querySelector('[data-brief-action-kind]'),stamp=root.querySelector('[data-brief-checked]');
  if(line&&next.lineup!=null)line.textContent=next.lineup;
  if(action){action.textContent=next.action;action.href=next.actionUrl;action.target=next.actionUrl.startsWith('https://')?'_blank':'';action.rel=next.actionUrl.startsWith('https://')?'noopener noreferrer':'';action.closest('[data-brief-next-move]').hidden=!next.actionUrl||next.actionUrl==='#/analyzer';}
  if(label)label.textContent=next.actionLabel||'NEXT MOVE';
  if(stamp)stamp.textContent=next.checkedStatus||'';
}

export function buildWeeklyBriefing({ outlook, stakes, move, coach, meSleeperId, now = new Date() } = {}) {
  const mine = stakes?.rows?.find(row => key(row.sleeperUserId) === key(meSleeperId)) || null;
  const matchup = outlook?.predictions?.find(game => game.isMine) || null;
  const swap = outlook?.startSit?.swaps?.[0] || null;
  const tuesday = now.getDay() === 2;
  const fresh=freshRosterAdvice(coach,outlook?.week,now.getTime());
  const alert=fresh?coach.rescue?.find(row=>row.actionable):null;
  const next=rosterNextAction({coach,outlook,move,meSleeperId,now:now.getTime()});
  return {
    title: tuesday ? "Tuesday Briefing" : "Weekly Briefing",
    week: outlook?.week || stakes?.week || null,
    headline: matchup ? `${matchup.winner.name} is favored by ${Number(matchup.margin).toFixed(1)}` : "Your week is taking shape",
    matchup: matchup ? `${matchup.winner.name} ${Number(matchup.winner.projection).toFixed(1)} · ${matchup.loser.name} ${Number(matchup.loser.projection).toFixed(1)}` : "Sleeper matchup pending",
    playoff: mine ? stakeLine(mine) : "Playoff model pending",
    playoffDetail: mine ? scenarioLine(mine, stakes?.berths) : "Sync the league to build your path.",
    lineup: alert ? `${alert.player.name}: ${alert.status}${alert.backup?` · ${alert.backup.name} can cover ${alert.slot}`:` · no unlocked ${alert.slot} backup`}` : swap ? `Start ${swap.start.name} over ${swap.sit.name} · +${Number(swap.gain).toFixed(1)}`
      : outlook?.startSit?.lineupIsSet ? "No lineup move worth forcing" : "Set your lineup",
    action:next.text,actionUrl:next.url,actionLabel:next.label,actionKind:next.kind,checkedAt:fresh?coach.checkedAt:null,
    needsAttention:!!alert,
  };
}
