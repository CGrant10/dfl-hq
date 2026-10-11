import {matchupTeamView} from './clubhouse-matchup-model.js';

export const MATCHUP_MOMENTS_CATEGORY='matchup_moments';
// categories is JSONB. A JS array makes PostgREST serialize a Postgres array instead.
export const MATCHUP_MOMENTS_FILTER=JSON.stringify([MATCHUP_MOMENTS_CATEGORY]);
const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
const hour=3600000;
const rounded=value=>Math.round(value*100)/100;

// A result waits for the whole verified NFL slate. Old scores cannot wake a phone.
export function matchupMomentWindow(schedule,now=Date.now()){
 const games=[...(schedule?.values()||[])];
 if(!games.length||games.some(game=>!finite(Date.parse(game.kickoff))))return {live:false,final:false};
 const last=Math.max(...games.map(game=>Date.parse(game.kickoff))),age=now-last;
 return {live:games.some(game=>game.key==='live'&&now>=Date.parse(game.kickoff)&&now-Date.parse(game.kickoff)<=6*hour),
  final:games.every(game=>game.key==='final')&&age>=4*hour&&age<=12*hour};
}

/** At most one close-game and one result alert per owner/week, never inferred lead changes.
 * @param {{season:number,week:number,rows?:Array<any>,rosters?:Array<any>,members?:Array<any>,players?:Record<string,any>,schedule?:Map<string,any>|null,teamNames?:Map<string,string>,optedMemberIds?:Array<number>,notifiedKeys?:Array<string>,now?:number}} input */
export function matchupMomentDrafts({season,week,rows=[],rosters=[],members=[],players={},schedule,
 teamNames=new Map(),optedMemberIds=[],notifiedKeys=[],now=Date.now()}){
 if(!Number.isInteger(season)||season<2000||!Number.isInteger(week)||week<1||week>18)return [];
 const window=matchupMomentWindow(schedule,now),opted=new Set(optedMemberIds.map(Number)),notified=new Set(notifiedKeys);
 if(!window.live&&!window.final)return [];
 const games=new Map();
 for(const row of rows){
  if(!Number.isSafeInteger(Number(row.matchup_id))||Number(row.matchup_id)<=0)continue;
  const id=Number(row.matchup_id);if(!games.has(id))games.set(id,[]);games.get(id).push(row);
 }
 return [...games].flatMap(([matchup,pair])=>{
  if(pair.length!==2||pair.some(row=>!finite(row.points))||String(pair[0].roster_id)===String(pair[1].roster_id))return [];
  const sides=pair.map(row=>matchupTeamView(row,players,schedule));
  if(window.final)for(const side of sides){
   // Verified no-game projections cover bye/unsigned starters once the NFL slate is over.
   if(side.starters.every(player=>player.state==='final'||player.state==='unknown'&&players[player.id]?.b===true)){
    side.known=true;side.remaining=0;
   }
  }
  if(sides.some(side=>side.score===null||!side.known||!side.starters.length))return [];
  const difference=rounded(sides[0].score-sides[1].score),margin=Math.abs(difference),remaining=sides[0].remaining+sides[1].remaining;
  const close=window.live&&remaining>=1&&remaining<=4&&(sides[0].live+sides[1].live)>0&&margin<=10&&sides[0].score+sides[1].score>=50;
  const final=window.final&&remaining===0;
  if(!close&&!final)return [];
  return pair.flatMap((row,index)=>{
   const roster=rosters.find(r=>String(r.roster_id)===String(row.roster_id));
   const member=members.find(m=>String(m.sleeper_user_id)===String(roster?.owner_id));
   if(!member||!Number.isSafeInteger(Number(member.id))||!opted.has(Number(member.id)))return [];
   const kind=final?'final':'close',sourceKey=`weekly:matchup:${season}:${week}:${row.roster_id}:${kind}`;
   if(notified.has(sourceKey))return [];
   const other=pair[1-index],name=String(teamNames.get(String(other.roster_id))||`Team ${other.roster_id}`).slice(0,70);
   const mine=sides[index],opponent=sides[1-index],ahead=index===0?difference>0:difference<0;
   const score=`${mine.score.toFixed(2)}–${opponent.score.toFixed(2)}`;
   const result=margin?`${ahead?'You lead':'You trail'} ${name} by ${margin.toFixed(2)}.`:`You're level with ${name}.`;
   const title=final?margin?(ahead?'Week '+week+': bragging rights earned':'Week '+week+': take the L'):`Week ${week}: dead even`:'Your matchup is getting spicy';
   const body=final?`${name} · ${score}. ${margin?`${ahead?'Ahead':'Behind'} by ${margin.toFixed(2)}.`:'Level on points.'} Current final score; stat corrections can apply.`
    :`${result} ${mine.remaining} starters left for you, ${opponent.remaining} for them. Actual score: ${score}.`;
   return [{title,body,category:MATCHUP_MOMENTS_CATEGORY,audience:'members',targetMemberIds:[Number(member.id)],sourceKey,
    targetUrl:`#/clubhouse?season=${season}&week=${week}&tab=matchups&matchup=${matchup}`,
    expiresAt:new Date(now+(final?2*hour:30*60000)).toISOString()}];
  });
 });
}

/** Used immediately before recording an optional moment as well as by the worker.
 * @param {Array<any>} subscriptions
 * @param {Array<number>} targetIds */
export function optedMatchupRecipients(subscriptions=[],targetIds=[]){
 const requested=new Set(targetIds.map(Number));
 return [...new Set(subscriptions.filter(row=>row.enabled===true&&Array.isArray(row.categories)&&row.categories.includes(MATCHUP_MOMENTS_CATEGORY)
  &&Number.isSafeInteger(Number(row.member_id))&&Number(row.member_id)>0&&requested.has(Number(row.member_id))).map(row=>Number(row.member_id)))];
}
