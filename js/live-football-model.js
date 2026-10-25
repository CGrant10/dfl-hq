import {teamCode} from './nfl-teams.js';
const numeric=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
const id=value=>/^\d{1,24}$/.test(String(value||''))?String(value):'';
export const footballTeam=value=>({WSH:'WAS',JAC:'JAX',LVR:'LV',OAK:'LV',SD:'LAC',LA:'LAR'}[teamCode(value)]||teamCode(value));
const clean=value=>String(value||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,420);
export const LIVE_PLAY_AGE=180000;
export const LIVE_FEED_AGE=150000;
/** @param {any} event @param {{season?:number,week?:number,now?:number}} options */
export function footballGame(event,{season,week,now=Date.now()}={}){
 const competition=event?.competitions?.[0],status=competition?.status||event?.status;
 if(!competition||!id(event.id)||!Array.isArray(competition.competitors)||competition.competitors.length!==2)return null;
 const sides=competition.competitors.map(side=>({id:id(side.team?.id),code:footballTeam(side.team?.abbreviation),score:/^\d+$/.test(String(side.score??''))?Number(side.score):null,home:side.homeAway==='home'}));
 if(sides.some(side=>!side.id||!side.code)||sides[0].id===sides[1].id)return null;
 const kickoff=Date.parse(event.date),live=status?.type?.state==='in'&&Number.isFinite(kickoff)&&kickoff<=now+30000&&now-kickoff<10*3600000;
 const situation=competition.situation||{},offense=sides.find(side=>side.id===String(situation.possession)),field=clean(situation.possessionText),match=field.match(/^([A-Z]{2,3})\s+(\d{1,2})$/);
 let goal=field==='50'?50:null;
 if(match&&offense&&sides.some(side=>side.code===footballTeam(match[1]))&&Number(match[2])<=50)goal=footballTeam(match[1])===offense.code?100-Number(match[2]):Number(match[2]);
 const down=numeric(situation.down),distance=numeric(situation.distance),validDown=down!==null&&down>=1&&down<=4&&distance!==null&&distance>=0&&distance<=99;
 return {id:id(event.id),season:Number(season),week:Number(week),kickoff,live,final:status?.type?.completed===true||status?.type?.state==='post',sides,offense:live&&offense?offense.code:null,
  redZone:live&&!!offense&&validDown&&situation.isRedZone===true&&goal!==null&&goal<=20,goal:live?goal:null,field,
  down:live&&validDown?clean(situation.shortDownDistanceText||situation.downDistanceText):'',clock:clean(status?.displayClock),period:numeric(status?.period),
  lastPlay:clean(situation.lastPlay?.text),lastPlayId:id(situation.lastPlay?.id)};
}
export function footballPlays(summary){
 const drives=summary?.drives||{},all=[...(drives.previous||[]),...(drives.current?[drives.current]:[])].flatMap(drive=>drive.plays||[]);
 return [...new Map(all.filter(play=>id(play.id)).map(play=>[String(play.id),play])).values()].sort((a,b)=>Number(a.sequenceNumber||a.id)-Number(b.sequenceNumber||b.id)).slice(-300);
}
export function candidatePlay(play){
 const type=String(play?.type?.id),yards=numeric(play?.statYardage);
 if(play?.isPenalty===true||play?.isTurnover===true||/\bno play\b|overturned|reversed|nullified|intercepted|fumble/i.test(String(play?.text||'')))return false;
 return ['67','68'].includes(type)&&play.scoringPlay===true||['5','24'].includes(type)&&yards!==null&&yards>=20;
}
export function footballPlayerIndex(players={}){
 const map=new Map();
 for(const [key,p]of Object.entries(players)){
  const espn=id(p.espn_id),position=p.position||p.p;if(!espn||!['QB','RB','WR','TE'].includes(position))continue;
  const player={id:String(key),name:clean(p.full_name||p.n||`${p.first_name||''} ${p.last_name||''}`),position,nflTeam:footballTeam(p.team||p.t)};
  if(map.has(espn))map.set(espn,null);else map.set(espn,player);
 }
 return map;
}
const playerName=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\s+(jr|sr|ii|iii|iv)\.?$/i,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function footballAthleteId(athlete){return id(athlete?.id)||id(String(athlete?.$ref||'').match(/\/athletes\/(\d+)(?:\?|$)/)?.[1]);}
// Sleeper leaves many newer ESPN IDs empty. Match an official structured
// athlete profile only when name, NFL team and position resolve uniquely.
// Play-description abbreviations and fuzzy name guesses are never used.
export function footballProfileMatch(profile,players,game){
 const espn=id(profile?.id),teamId=id(profile?.team?.id)||id(String(profile?.team?.$ref||'').match(/\/teams\/(\d+)(?:\?|$)/)?.[1]),club=game.sides.find(side=>side.id===teamId)?.code,position=profile?.position?.abbreviation;
 const names=[profile?.fullName,profile?.displayName].map(playerName).filter(Boolean);
 if(!espn||!club||!['QB','RB','WR','TE'].includes(position)||!names.length)return null;
 const matches=Object.entries(players||{}).filter(([_id,p])=>footballTeam(p.team||p.t)===club&&(p.position||p.p)===position&&(!id(p.espn_id)||id(p.espn_id)===espn)&&names.includes(playerName(p.full_name||p.n||`${p.first_name||''} ${p.last_name||''}`)));
 if(matches.length!==1)return null;const [key,p]=matches[0];
 return {id:String(key),name:clean(p.full_name||p.n||profile.fullName),position,nflTeam:club};
}
export function footballPlay(play,game,players=new Map()){
 const playId=id(play?.id);if(!playId)return null;
 const at=Date.parse(play.wallclock),yards=numeric(play.statYardage),type=String(play.type?.id),td=['67','68'].includes(type)&&play.scoringPlay===true&&Number(play.scoreValue)===6;
 const eligible=candidatePlay(play)&&yards!==null&&yards>=0&&(!['67','68'].includes(type)||td);
 const roles=new Map();
 const offenseId=id(play.start?.team?.id)||id(String(play.start?.team?.$ref||'').match(/\/teams\/(\d+)(?:\?|$)/)?.[1])||id((play.teamParticipants||[]).find(p=>p.type==='offense')?.id);
 const offense=game.sides.find(side=>side.id===offenseId)?.code;
 if(eligible)for(const participant of play.participants||[]){
  const role=participant.type;if(!['passer','receiver','rusher','scorer'].includes(role))continue;
  const player=players.get(footballAthleteId(participant.athlete));
  if(!player||!offense||player.nflTeam!==offense)continue;
  if(type==='68'&&!['rusher','scorer'].includes(role)||['67','24'].includes(type)&&!['passer','receiver','scorer'].includes(role))continue;
  if(!td&&(role==='passer'?yards<40:yards<20))continue;
  const existing=roles.get(player.id);if(!existing||existing.role==='scorer')roles.set(player.id,{...player,role});
 }
 return {id:playId,gameId:game.id,at:Number.isFinite(at)?at:null,sequence:Number(play.sequenceNumber)||Number(playId),text:clean(play.text),yards,period:Number(play.period?.number)||null,clock:clean(play.clock?.displayValue),
  kind:eligible&&roles.size?(td?'touchdown':'big-play'):null,players:[...roles.values()]};
}
export function liveStarterEvents(games=[],model,{gameId=null,ownOnly=false,now=Date.now()}={}){
 if(!model||model.completed)return [];
 const sides=(model.games||[]).filter(game=>!gameId||String(game.id)===String(gameId)).flatMap(game=>game.sides).filter(side=>!ownOnly||String(side.memberId)===String(model.memberId));
 const starters=new Map(sides.flatMap(side=>(side.lineup||[]).filter(p=>!p.empty&&['QB','RB','WR','TE'].includes(p.position)).map(p=>[String(p.id),{...p,owner:side.name,roster:String(side.roster)}])));
 return games.flatMap(feed=>{
  if(Number(feed.season)!==Number(model.season)||Number(feed.week)!==Number(model.week))return [];
  const fetched=Date.parse(feed.fetched_at);if(!Number.isFinite(fetched)||now-fetched<0||now-fetched>LIVE_FEED_AGE)return [];
  return (feed.plays||[]).flatMap(play=>{
   if(!play.eligible||!['touchdown','big-play'].includes(play.kind)||!Number.isFinite(play.at)||now-play.at<0||now-play.at>LIVE_PLAY_AGE)return [];
   const players=(play.players||[]).filter(player=>starters.has(String(player.id))).map(player=>({...starters.get(String(player.id)),role:player.role}));
   return players.length?[{...play,key:`${model.season}:${model.week}:${feed.game_id}:${play.id}`,players}]:[];
  });
 }).sort((a,b)=>a.at-b.at||a.sequence-b.sequence);
}
export function redZoneGames(feeds=[],model,{gameId=null,ownOnly=false,now=Date.now()}={}){
 if(!model||model.completed)return [];
 const sides=(model.games||[]).filter(game=>!gameId||String(game.id)===String(gameId)).flatMap(game=>game.sides).filter(side=>!ownOnly||String(side.memberId)===String(model.memberId));
 const players=sides.flatMap(side=>(side.lineup||[]).filter(p=>!p.empty&&['QB','RB','WR','TE'].includes(p.position)).map(p=>({...p,owner:side.name,roster:String(side.roster)})));
 return feeds.flatMap(feed=>{
  if(Number(feed.season||feed.snapshot?.season)!==Number(model.season)||Number(feed.week||feed.snapshot?.week)!==Number(model.week))return [];
  const game=feed.snapshot,age=now-(typeof feed.snapshot_at==='number'?feed.snapshot_at:Date.parse(feed.fetched_at));if(!game?.live||!game.redZone||!Number.isFinite(age)||age<0||age>LIVE_FEED_AGE)return [];
  const involved=players.filter(p=>footballTeam(p.nflTeam)===game.offense);return involved.length?[{...game,players:involved,fetchedAt:now-age}]:[];
 });
}
export function livePlaySource(source){return /^weekly:play:\d{4}:\d{1,2}:\d+:\d{1,24}:\d{1,24}$/.test(String(source||''));}
