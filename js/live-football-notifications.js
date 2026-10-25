import {LIVE_PLAY_AGE,LIVE_FEED_AGE} from './live-football-model.js';
import {MATCHUP_MOMENTS_CATEGORY} from './matchup-moments.js';

// Only a fresh verified play affecting the owner's current starting lineup.
// One member/play key covers a passer/receiver stack, even across devices.
/** @param {{season:number,week:number,feeds?:Array<any>,rows?:Array<any>,rosters?:Array<any>,members?:Array<any>,optedMemberIds?:Array<number>,now?:number}} input */
export function footballNotificationDrafts({season,week,feeds=[],rows=[],rosters=[],members=[],optedMemberIds=[],now=Date.now()}){
 if(!Number.isInteger(season)||!Number.isInteger(week)||week<1||week>18)return [];
 const opted=new Set(optedMemberIds.map(Number)),drafts=[];
 for(const row of rows){
  if(!Number.isSafeInteger(Number(row.roster_id))||Number(row.roster_id)<=0||!Number.isSafeInteger(Number(row.matchup_id))||Number(row.matchup_id)<=0||!Array.isArray(row.starters))continue;
  const owners=rosters.filter(r=>String(r.roster_id)===String(row.roster_id));if(owners.length!==1)continue;
  const people=members.filter(member=>String(member.sleeper_user_id)===String(owners[0].owner_id));if(people.length!==1||!opted.has(Number(people[0].id)))continue;
  const member=Number(people[0].id),starters=new Set(row.starters.filter(id=>id&&String(id)!=='0').map(String));
  for(const feed of feeds){
   const age=now-Date.parse(feed.fetched_at);if(age<0||age>LIVE_FEED_AGE||!Number.isFinite(age))continue;
   for(const play of feed.plays||[]){
    if(!play.eligible||!['touchdown','big-play'].includes(play.kind)||!Number.isFinite(play.at)||now-play.at<0||now-play.at>LIVE_PLAY_AGE)continue;
    const involved=(play.players||[]).filter(player=>starters.has(String(player.id)));if(!involved.length)continue;
    const people=[...new Map(involved.map(p=>[p.id,p])).values()],names=people.map(p=>p.name).join(' + '),passing=people.every(p=>p.role==='passer');
    const label=play.kind==='touchdown'?(passing?'TD PASS':'TOUCHDOWN'):`${play.yards}-YD ${passing?'PASS':people.some(p=>p.role==='receiver')?'RECEPTION':'RUN'}`;
    drafts.push({title:`${names} · ${label}`.slice(0,80),body:play.text.slice(0,240),category:MATCHUP_MOMENTS_CATEGORY,audience:'members',targetMemberIds:[member],
     sourceKey:`weekly:play:${season}:${week}:${member}:${feed.game_id}:${play.id}`,targetUrl:`#/clubhouse?season=${season}&week=${week}&tab=matchups&matchup=${row.matchup_id}`,
     expiresAt:new Date(play.at+LIVE_PLAY_AGE).toISOString()});
   }
  }
 }
 return [...new Map(drafts.map(draft=>[draft.sourceKey,draft])).values()];
}
