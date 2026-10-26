import {LIVE_FEED_AGE,LIVE_PLAY_AGE} from './live-football-model.js';
const positive=value=>Number.isSafeInteger(Number(value))&&Number(value)>0;
const digits=value=>/^\d{1,24}$/.test(String(value||''));
export const footballMomentKey=(roster,game,play)=>positive(roster)&&digits(game)&&digits(play)?`nfl:${game}:${play}:${roster}`:null;
export const isFootballMomentKey=value=>/^nfl:\d{1,24}:\d{1,24}:[1-9]\d*$/.test(String(value||''));
export function footballMomentLabel(play,players=play?.players||[]){
 const passing=players.length>0&&players.every(p=>p.role==='passer');
 return play.kind==='touchdown'?(passing?'TD PASS':'TOUCHDOWN'):`${play.yards}-YD ${passing?'PASS':players.some(p=>p.role==='receiver')?'RECEPTION':'RUN'}`;
}
// Persist only freshly verified plays for the submitted weekly starters. The
// same play can belong to both opponents, but a QB/receiver stack stays one row.
/** @param {{leagueId:string,season:number,week:number,feeds?:Array<any>,rows?:Array<any>,now?:number}} input */
export function footballMomentRows({leagueId,season,week,feeds=[],rows=[],now=Date.now()}){
 if(!leagueId||!Number.isInteger(season)||!Number.isInteger(week)||week<1||week>18)return [];
 const result=[];
 for(const row of rows){
  const paired=rows.filter(r=>String(r.matchup_id)===String(row.matchup_id));
  if(!positive(row.roster_id)||!positive(row.matchup_id)||paired.length!==2||new Set(paired.map(r=>String(r.roster_id))).size!==2||!Array.isArray(row.starters))continue;
  const starters=new Set(row.starters.map(String).filter(id=>digits(id)&&id!=='0'));
  for(const feed of feeds){
   const age=now-Date.parse(feed.fetched_at);
   if(!digits(feed.game_id)||Number(feed.season??feed.snapshot?.season)!==season||Number(feed.week??feed.snapshot?.week)!==week||!Number.isFinite(age)||age<0||age>LIVE_FEED_AGE)continue;
   for(const play of feed.plays||[]){
    if(!digits(play.id)||!play.eligible||!['touchdown','big-play'].includes(play.kind)||!Number.isFinite(play.at)||now-play.at<0||now-play.at>LIVE_PLAY_AGE||!Number.isFinite(play.yards)||play.yards<0||!play.text)continue;
    const players=[...new Map((play.players||[]).filter(p=>starters.has(String(p.id))&&['QB','RB','WR','TE'].includes(p.position)&&['passer','receiver','rusher','scorer'].includes(p.role)).map(p=>[String(p.id),{id:String(p.id),name:String(p.name).slice(0,100),position:p.position,nflTeam:p.nflTeam,role:p.role}])).values()];
    if(!players.length)continue;
    const key=footballMomentKey(row.roster_id,feed.game_id,play.id);
    result.push({league_id:String(leagueId),season,week,event_key:key,kind:play.kind,matchup_id:Number(row.matchup_id),roster_id:Number(row.roster_id),player_id:players[0].id,
     data:{play:{id:String(play.id),gameId:String(feed.game_id),kind:play.kind,at:play.at,yards:play.yards,period:play.period,clock:play.clock,text:String(play.text).slice(0,420)},players}});
   }
  }
 }
 return [...new Map(result.map(r=>[r.event_key,r])).values()];
}
