const zone='America/Chicago';
const calendar=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
const parts=at=>Object.fromEntries(calendar.formatToParts(new Date(at)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
const dateKey=p=>`${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
const dayShift=(key,days)=>new Date(Date.parse(key+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
function centralHour(key,hour){
 const target=Date.parse(`${key}T${String(hour).padStart(2,'0')}:00:00Z`);let at=target;
 for(let i=0;i<3;i++){const p=parts(at),local=Date.UTC(p.year,p.month-1,p.day,p.hour);at+=target-local}
 return at;
}
export function highlightSession(now=Date.now()){
 const local=parts(now),date=local.hour<6?dayShift(dateKey(local),-1):dateKey(local);
 const weekday=new Date(date+'T12:00:00Z').getUTCDay(),startDate=dayShift(date,-((weekday+3)%7));
 const opensAt=centralHour(startDate,6),expiresAt=centralHour(dayShift(startDate,5),6);
 return {date,startDate,endDate:dayShift(startDate,4),opensAt,expiresAt,nextOpensAt:centralHour(dayShift(startDate,7),6),active:now>=opensAt&&now<expiresAt,label:'Weekend'};
}
export const highlightGameDate=at=>Number.isFinite(at)?dateKey(parts(at)):null;
const numericId=value=>/^\d{1,24}$/.test(String(value||''))?String(value):null;
const clean=value=>typeof value==='string'?value.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,180):'';
export function highlightThumbnail(value){try{const u=new URL(value);return u.protocol==='https:'&&['espnmedia-cdn.akamaized.net','a.espncdn.com','a1.espncdn.com','a2.espncdn.com','a3.espncdn.com','a4.espncdn.com'].includes(u.hostname)&&!u.username&&!u.password?u.href:null}catch{return null}}
export const highlightSourceUrl=id=>`https://www.espn.com/video/clip/_/id/${id}`;
export function highlightVideoUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='espnmedia-cdn.akamaized.net'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/^\/espn\/media\/[a-zA-Z0-9_./-]+\.mp4$/.test(u.pathname)?u.href:null}catch{return null}
}
export function highlightKind(video){
 if(video?.source!=='espn'||video?.tracking?.leagueName!=='NFL'||video?.tracking?.coverageType!=='OnePlay')return null;
 const text=`${clean(video.headline)} ${clean(video.description)}`;
 const setup=/\b(?:sets? up|leads? to)\b/i.test(text);
 if(!setup&&/\b(?:touchdown|TD|pick[- ]six)\b/i.test(text))return 'touchdown';
 if(!setup&&/\b(?:field goal|FG)\b/i.test(text))return null;
 const yards=[...text.matchAll(/\b(\d{2,3})[- ]yard\b/gi)].map(m=>Number(m[1]));
 return yards.some(n=>n>=20)||/\b(?:interception|intercepts?|picks? off|picked off|diving pick|one-handed|spectacular catch)\b/i.test(text)?'big-play':null;
}
export function gameHighlightClips(summary,event,{now=Date.now()}={}){
 const gameId=numericId(event?.id),kickoff=Date.parse(event?.date),session=highlightSession(now);
 const gameDate=highlightGameDate(kickoff);
 if(!session.active||!gameId||String(summary?.header?.id)!==gameId||!gameDate||gameDate<session.startDate||gameDate>session.endDate||kickoff>now+30000)return [];
 const teams=(event.competitions?.[0]?.competitors||[]).map(t=>clean(t.team?.abbreviation)).filter(Boolean);
 if(teams.length!==2)return [];
 return (Array.isArray(summary.videos)?summary.videos:[]).flatMap(video=>{
  const id=numericId(video.id),kind=highlightKind(video),headline=clean(video.headline),thumbnail=highlightThumbnail(video.thumbnail),duration=Number(video.duration);
  const published=Date.parse(video.originalPublishDate),embargo=Date.parse(video.timeRestrictions?.embargoDate),sourceExpiry=Date.parse(video.timeRestrictions?.expirationDate);
  let source;try{source=new URL(video.links?.web?.href)}catch{return []}
  const pathId=source.pathname.match(/^\/video\/clip\/_\/id\/(\d+)(?:\/|$)/)?.[1]||source.searchParams.get('id');
  if(!id||pathId!==id||source.protocol!=='https:'||source.hostname!=='www.espn.com'||!kind||!headline||!thumbnail||!Number.isFinite(duration)||duration<3||duration>180
   ||!Number.isFinite(published)||published<kickoff-300000||published>now+30000||Number.isFinite(embargo)&&embargo>now)return [];
  const expires=Math.min(session.expiresAt,Number.isFinite(sourceExpiry)?sourceExpiry:session.expiresAt);
  if(expires<=now)return [];
  return [{id,game_id:gameId,session_date:gameDate,headline,kind,thumbnail_url:thumbnail,source_url:highlightSourceUrl(id),video_url:highlightVideoUrl(video.links?.source?.href),duration:Math.round(duration),
   published_at:new Date(published).toISOString(),expires_at:new Date(expires).toISOString(),game_label:teams.join(' · '),fetched_at:new Date(now).toISOString()}];
 });
}
export function activeHighlightClips(rows=[],now=Date.now()){
 const session=highlightSession(now),unique=new Map();
 if(!session.active)return [];
 for(const row of rows){
  const published=Date.parse(row.published_at),expires=Date.parse(row.expires_at),id=numericId(row.id),headline=clean(row.headline);
  if(!id||typeof row.session_date!=='string'||row.session_date<session.startDate||row.session_date>session.endDate||!numericId(row.game_id)||!['touchdown','big-play'].includes(row.kind)||!headline||!highlightThumbnail(row.thumbnail_url)
   ||row.source_url!==highlightSourceUrl(id)||!Number.isFinite(published)||published>now+30000||!Number.isFinite(expires)||expires<=now||expires>session.expiresAt
   ||!Number.isFinite(row.duration)||row.duration<3||row.duration>180)continue;
  unique.set(id,{...row,id,headline,video_url:highlightVideoUrl(row.video_url)});
 }
 return [...unique.values()].sort((a,b)=>Date.parse(a.published_at)-Date.parse(b.published_at)||a.id.localeCompare(b.id));
}
