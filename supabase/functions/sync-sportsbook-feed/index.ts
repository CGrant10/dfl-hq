import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const TOKEN_HASH="c7429c5c8cfd182e13e7f1b537b0f671b0b99dcb004b19f8580b960f8f957091";
const API="https://api.sportsgameodds.com/v2/events";
const ESPN="https://cdn.espn.com/core/nfl/scoreboard";
const cors=(r?:Request)=>({"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":r?.headers.get("access-control-request-headers")||"authorization, x-client-info, apikey, content-type, x-admin-token, x-member-id, x-commissioner-pin, x-dfl-cron-token","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Max-Age":"86400",Vary:"Access-Control-Request-Headers"});
const json=(v:unknown,s=200,r?:Request)=>Response.json(v,{status:s,headers:cors(r)});
type J=Record<string,any>;
const chunks=<T>(rows:T[],size=250)=>Array.from({length:Math.ceil(rows.length/size)},(_,index)=>rows.slice(index*size,(index+1)*size));

function envKey(name:"SUPABASE_SECRET_KEYS"|"SUPABASE_PUBLISHABLE_KEYS",legacy:string){try{const map=JSON.parse(Deno.env.get(name)||"{}");if(map.default)return String(map.default)}catch{}return Deno.env.get(legacy)||""}
async function sha256(v:string){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,"0")).join("")}
function authHeaders(r:Request){const h:Record<string,string>={};for(const n of["x-admin-token","x-member-id","x-commissioner-pin"]){const v=r.headers.get(n);if(v)h[n]=v}return h}
async function authorized(r:Request,url:string,pub:string){const token=r.headers.get("x-dfl-cron-token")||"";if(token.length>=32&&await sha256(token)===TOKEN_HASH)return true;const c=createClient(url,pub,{global:{headers:authHeaders(r)},auth:{persistSession:false,autoRefreshToken:false}});const{data,error}=await c.rpc("has_commissioner_permission",{permission_name:"sportsbook"});return !error&&data===true}
const FEED_HEALTH_KEY="sportsbook_feed_health";
async function readFeedHealth(admin:ReturnType<typeof createClient>){const{data}=await admin.from("app_settings").select("value").eq("key",FEED_HEALTH_KEY).maybeSingle();try{return JSON.parse(data?.value||"{}")}catch{return{}}}
async function writeFeedHealth(admin:ReturnType<typeof createClient>,value:J){const{error}=await admin.from("app_settings").upsert({key:FEED_HEALTH_KEY,value:JSON.stringify(value),updated_at:new Date().toISOString()},{onConflict:"key"});if(error)console.warn("sportsbook feed health unavailable",error.message)}
const value=(...xs:any[])=>{for(const x of xs){const n=Number(x);if(Number.isFinite(n))return n}return null};
function weekOf(e:J){const raw=String(e.info?.seasonWeek||e.info?.week||e.week||"");return Number(raw.match(/(\d+)/)?.[1]||0)}
function startsAtOf(e:J){return String(e.status?.startsAt||e.startsAt||e.startTime||"")}
function seasonOf(e:J){return Number(e.info?.season||e.season||new Date(startsAtOf(e)||Date.now()).getFullYear())}
function eventStatus(e:J){if(e.status?.cancelled)return"cancelled";if(e.status?.finalized||e.status?.completed||e.status?.ended)return"final";if(e.status?.started)return"live";return"scheduled"}
const labelFor=(s:string)=>({passing_yards:"Passing yards",passing_touchdowns:"Passing TDs",rushing_yards:"Rushing yards",receiving_yards:"Receiving yards",receptions:"Receptions",receiving_receptions:"Receptions",touchdowns:"Touchdowns",fantasy_points:"Fantasy points",fantasyScore:"Fantasy points"} as J)[s]||s.replaceAll("_"," ").replaceAll("+"," + ").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/\s+/g," ").replace(/\b\w/g,c=>c.toUpperCase());
function playerID(odd:J){return String(odd.playerID||odd.statEntityID||"")}
function playerRecord(e:J,odd:J){const id=playerID(odd);return(e.players?.[id]||Object.values(e.players||{}).find((x:any)=>String(x?.playerID||x?.id)===id)||{}) as J}
function playerName(e:J,odd:J){const p=playerRecord(e,odd);return String(p.name||p.names?.long||odd.playerName||odd.statEntityName||"").trim()}
function playerMeta(e:J,odd:J){const p=playerRecord(e,odd);return{position:String(p.position||p.positionID||p.positions?.[0]||"").toUpperCase(),team:String(p.teamID||p.team?.teamID||p.team?.abbreviation||p.teamAbbreviation||"").toUpperCase()}}
function teamName(team:J){return String(team?.names?.medium||team?.names?.short||team?.names?.long||team?.teamID||"").trim()}
function matchupName(e:J){const away=teamName(e.teams?.away),home=teamName(e.teams?.home);return away&&home?`${away} @ ${home}`:"NFL matchup"}
function totalIdentity(e:J,odd:J){
  const entity=String(odd.statEntityID||"").toLowerCase(),home=e.teams?.home||{},away=e.teams?.away||{};
  if(["home",String(home.statEntityID||"").toLowerCase(),String(home.teamID||"").toLowerCase()].includes(entity))return{key:"home",title:`${teamName(home)||"Home"} · Team total`,category:"Team Totals"};
  if(["away",String(away.statEntityID||"").toLowerCase(),String(away.teamID||"").toLowerCase()].includes(entity))return{key:"away",title:`${teamName(away)||"Away"} · Team total`,category:"Team Totals"};
  if(entity==="all")return{key:"all",title:`${matchupName(e)} · Game total`,category:"Game Totals"};
  return null;
}
function consensusLine(odd:J){
  const direct=value(odd.bookOverUnder,odd.fairOverUnder);
  if(direct!==null)return{line:direct,books:Object.values(odd.byBookmaker||{}).filter((book:any)=>book?.available!==false&&value(book?.overUnder)!==null).length};
  const lines=Object.values(odd.byBookmaker||{}).filter((book:any)=>book?.available!==false).map((book:any)=>value(book?.overUnder)).filter((line):line is number=>line!==null).sort((a,b)=>a-b);
  if(!lines.length)return{line:null,books:0};
  const middle=Math.floor(lines.length/2),line=lines.length%2?lines[middle]:(lines[middle-1]+lines[middle])/2;
  return{line,books:lines.length};
}
function americanOdds(input:any){const n=Number(input);return Number.isFinite(n)&&n!==0?Math.round(n):null}
function bestPriceAtLine(odd:J,line:number){
  const directLine=value(odd.bookOverUnder,odd.fairOverUnder),book=americanOdds(odd.bookOdds);
  const prices=Object.entries(odd.byBookmaker||{}).map(([name,entry]:[string,any])=>({name,entry,price:americanOdds(entry?.odds)})).filter(row=>row.entry?.available!==false&&Math.abs(Number(row.entry?.overUnder)-line)<.001&&row.price!==null).sort((a,b)=>Number(b.price)-Number(a.price));
  if(prices.length)return{price:prices[0].price,book:prices[0].name};
  if(book!==null&&(directLine===null||Math.abs(directLine-line)<.001))return{price:book,book:"market"};
  const fair=americanOdds(odd.fairOdds);return fair===null?null:{price:fair,book:"fair"};
}
function oddScore(e:J,odd:J){const entity=String(odd.statEntityID||odd.playerID||""),period=String(odd.periodID||"game"),stat=String(odd.statID||"");return value(odd.score,e.results?.[period]?.[entity]?.[stat])}

function importedStat(stats:J,key:string){
  const n=(name:string)=>Number(stats?.[name]||0);
  switch(key){
    case"pass_yd":return n("pass_yd");
    case"pass_td":return n("pass_td");
    case"rush_yd":return n("rush_yd");
    case"rec_yd":return n("rec_yd");
    case"rec":return n("rec");
    case"rush_rec_yd":return n("rush_yd")+n("rec_yd");
    case"pass_rush_yd":return n("pass_yd")+n("rush_yd");
    case"rush_rec_td":return n("rush_td")+n("rec_td");
    case"fantasy_points_ppr":return value(stats?.pts_ppr,stats?.fantasy_points_ppr)??0;
    default:return null;
  }
}

async function settleSleeperImports(admin:ReturnType<typeof createClient>){
  const{data:markets,error}=await admin.from("sportsbook_markets")
    .select("provider_key,provider_event_id,provider_market_id,provider_line")
    .like("provider_key","sleeper-import:%").in("status",["open","locked"]);
  if(error)throw error;
  const grouped=new Map<string,J[]>();
  for(const market of markets||[]){
    const match=String(market.provider_key||"").match(/^sleeper-import:(\d+):(\d+):/);if(!match)continue;
    const group=`${match[1]}:${match[2]}`,rows=grouped.get(group)||[];rows.push(market);grouped.set(group,rows);
  }
  let settled=0;
  for(const[group,rows]of grouped){
    const[season,week]=group.split(":").map(Number);
    const{data:games,error:gameError}=await admin.from("nfl_pickem_games").select("status").eq("season",season).eq("week",week);
    if(gameError)throw gameError;
    if(!games?.length||games.some(game=>!["final","cancelled"].includes(game.status)))continue;
    const response=await fetch(`https://api.sleeper.app/stats/nfl/${season}/${week}?season_type=regular`,{headers:{"User-Agent":"DFL-HQ-Prop-Settlement/1.0"},signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error(`Sleeper weekly stats returned ${response.status}`);
    const payload=await response.json();
    const stats=new Map((Array.isArray(payload)?payload:[]).map((row:J)=>[String(row.player_id),row.stats||row]));
    for(const market of rows){
      const playerId=String(market.provider_event_id||"").split(":").at(-1)||"";
      const score=importedStat(stats.get(playerId)||{},String(market.provider_market_id||""));
      if(score===null)continue;
      const line=Number(market.provider_line);
      const{data,error:settleError}=await admin.rpc("sportsbook_settle_provider_market",{target_provider_key:market.provider_key,winner_side:score===line?"void":score>line?"over":"under",final_score:score,void_market:score===line});
      if(settleError)throw settleError;if(data)settled++;
    }
  }
  return settled;
}

async function publicNflState(){
  const response=await fetch("https://api.sleeper.app/v1/state/nfl",{headers:{"User-Agent":"DFL-HQ-Pickem/1.0"},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error(`NFL week lookup returned ${response.status}`);
  const state=await response.json();
  return{season:Number(state.season),week:Number(state.week)};
}

async function syncPublicPickem(admin:ReturnType<typeof createClient>,season:number,week:number){
  let games=0;const weeks=new Set<string>();
  for(const targetWeek of [...new Set([Math.max(1,week-1),week])]){
    const params=new URLSearchParams({xhr:"1",limit:"50",dates:String(season),seasontype:"2",week:String(targetWeek)});
    const response=await fetch(`${ESPN}?${params}`,{headers:{"User-Agent":"Mozilla/5.0 DFL-HQ-Pickem/1.0"},signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error(`Public NFL schedule returned ${response.status}`);
    const payload=await response.json();
    const events=payload?.content?.sbData?.events||[];
    for(const event of events){
      const competition=event.competitions?.[0],competitors=competition?.competitors||[];
      const away=competitors.find((x:J)=>x.homeAway==="away"),home=competitors.find((x:J)=>x.homeAway==="home");
      const startsAt=event.date||competition?.date;if(!event.id||!away||!home||!startsAt)continue;
      const type=competition?.status?.type||event.status?.type||{},name=String(type.name||"").toLowerCase();
      const status=name.includes("cancel")||name.includes("postpon")?"cancelled":type.completed||type.state==="post"?"final":type.state==="in"?"live":"scheduled";
      const started=status==="live"||status==="final";
      const start=new Date(startsAt);
      const row={provider_event_id:`espn:${event.id}`,season,week:targetWeek,starts_at:start.toISOString(),away_team_id:String(away.team?.abbreviation||away.team?.id),away_team_name:String(away.team?.shortDisplayName||away.team?.displayName),home_team_id:String(home.team?.abbreviation||home.team?.id),home_team_name:String(home.team?.shortDisplayName||home.team?.displayName),away_score:started?value(away.score):null,home_score:started?value(home.score):null,status,is_monday_night:start.toLocaleString("en-US",{timeZone:"America/Chicago",weekday:"short"})==="Mon",updated_at:new Date().toISOString()};
      const{error}=await admin.from("nfl_pickem_games").upsert(row,{onConflict:"provider_event_id"});if(error)throw error;
      games++;weeks.add(`${season}:${targetWeek}`);
    }
  }
  for(const key of weeks){const[s,w]=key.split(":").map(Number);const{error}=await admin.rpc("pickem_grade_week",{target_season:s,target_week:w});if(error)throw error}
  return games;
}

async function sendPickemNotice(url:string,cronToken:string,payload:J){
  if(cronToken.length<32)return null;
  try{
    const response=await fetch(`${url}/functions/v1/send-notification`,{method:"POST",headers:{"content-type":"application/json","x-dfl-cron-token":cronToken},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body.error||`Notification returned ${response.status}`);
    return body;
  }catch(error){console.warn("pickem notification unavailable",error);return null}
}

async function pickemNotifications(admin:ReturnType<typeof createClient>,url:string,cronToken:string,season:number,week:number){
  if(cronToken.length<32)return{reminder:false,recap:false};
  let reminder=false,recap=false;
  const chicagoWeekday=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",weekday:"short"}).format(new Date());
  const [{data:games,error:gamesError},{data:config}]=await Promise.all([
    admin.from("nfl_pickem_games").select("starts_at").eq("season",season).eq("week",week).order("starts_at").limit(1),
    admin.from("nfl_pickem_config").select("weekly_prize").eq("singleton",true).maybeSingle(),
  ]);
  if(gamesError)throw gamesError;
  const lockAt=games?.[0]?.starts_at?new Date(games[0].starts_at):null;
  if(chicagoWeekday==="Thu"&&lockAt&&lockAt>new Date()){
    const [{data:members,error:memberError},{data:entries,error:entryError}]=await Promise.all([
      admin.from("members").select("id").eq("active",true),
      admin.from("nfl_pickem_entries").select("member_id").eq("season",season).eq("week",week),
    ]);
    if(memberError||entryError)throw memberError||entryError;
    const entered=new Set((entries||[]).map(row=>Number(row.member_id)));
    const missing=(members||[]).map(row=>Number(row.id)).filter(id=>Number.isSafeInteger(id)&&!entered.has(id));
    if(missing.length){
      const outcome=await sendPickemNotice(url,cronToken,{title:`Week ${week} Pick'em locks tonight`,body:`Your card is still empty. Pick the full slate before Thursday kickoff.${Number(config?.weekly_prize||0)>0?` Winner gets ${Number(config.weekly_prize)} SIN.`:""}`,category:"sportsbook",targetUrl:"#/sportsbook",sourceKey:`sportsbook:pickem:${season}:${week}:reminder`,audience:"members",targetMemberIds:missing});
      reminder=!!outcome?.ok;
    }
  }
  const previousWeek=Math.max(0,week-1);
  if(previousWeek){
    const{data:winner,error}=await admin.from("nfl_pickem_entries").select("correct_count,tiebreak_delta,prize_paid,member_id,members(display_name)").eq("season",season).eq("week",previousWeek).eq("weekly_rank",1).eq("graded",true).limit(1).maybeSingle();
    if(error)throw error;
    if(winner){
      const member=Array.isArray(winner.members)?winner.members[0]:winner.members;
      const outcome=await sendPickemNotice(url,cronToken,{title:`Week ${previousWeek} Pick'em winner`,body:`${member?.display_name||"The weekly winner"} took it with ${Number(winner.correct_count)} right${winner.tiebreak_delta!=null?` and missed the MNF total by ${Number(winner.tiebreak_delta)}`:""}.${Number(winner.prize_paid||0)>0?` +${Number(winner.prize_paid)} SIN.`:""}`,category:"sportsbook",targetUrl:"#/sportsbook",sourceKey:`sportsbook:pickem:${season}:${previousWeek}:results`,audience:"all"});
      recap=!!outcome?.ok;
    }
  }
  return{reminder,recap};
}

Deno.serve(async request=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:cors(request)});
  if(request.method!=="POST")return json({error:"Method not allowed"},405,request);
  const url=Deno.env.get("SUPABASE_URL")||"",pub=envKey("SUPABASE_PUBLISHABLE_KEYS","SUPABASE_ANON_KEY"),secret=envKey("SUPABASE_SECRET_KEYS","SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!pub||!secret)return json({error:"Server configuration unavailable"},500,request);
  if(!await authorized(request,url,pub))return json({error:"Unauthorized"},401,request);
  const apiKey=Deno.env.get("SPORTSGAMEODDS_API_KEY")||"";
  const input=await request.json().catch(()=>({}));
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  let feedHealth=await readFeedHealth(admin);
  if(input.action==="status"){
    const[{count:activeMarkets},{data:lastMarket}]=await Promise.all([admin.from("sportsbook_markets").select("id",{count:"exact",head:true}).eq("source","provider").in("status",["open","locked"]),admin.from("sportsbook_markets").select("provider_updated_at").eq("source","provider").order("provider_updated_at",{ascending:false}).limit(1).maybeSingle()]);
    const currentMonth=new Date().toISOString().slice(0,7),monthlyEventObjects=feedHealth.month===currentMonth?Number(feedHealth.monthlyEventObjects)||0:0;
    return json({ok:true,configured:true,pickemProvider:"Public NFL scoreboard",propsConfigured:!!apiKey,...feedHealth,monthlyEventObjects,activeMarkets:activeMarkets||0,lastMarketAt:lastMarket?.provider_updated_at||null},200,request);
  }
  let stage="starting";
  try{
    stage="NFL week lookup";
    const nfl=await publicNflState();
    stage="public Pick'em slate";
    const publicGames=await syncPublicPickem(admin,nfl.season,nfl.week);
    stage="imported prop settlement";
    const sleeperPropsSettled=await settleSleeperImports(admin);
    stage="Pick'em notifications";
    const notices=await pickemNotifications(admin,url,request.headers.get("x-dfl-cron-token")||"",nfl.season,nfl.week);
    if(!apiKey)return json({ok:true,configured:true,pickemProvider:"Public NFL scoreboard",propsConfigured:false,games:publicGames,props:0,settled:sleeperPropsSettled,notices,syncedAt:new Date().toISOString()},200,request);
    const now=new Date();
    const lastSuccess=Date.parse(feedHealth.lastSuccessAt||"");
    const cooldownMs=30*60*1000;
    if(input.force!==true&&Number.isFinite(lastSuccess)&&now.getTime()-lastSuccess<cooldownMs){
      return json({ok:true,configured:true,propsConfigured:true,cached:true,games:publicGames,settled:sleeperPropsSettled,notices,activeMarkets:Number(feedHealth.activeMarkets)||0,props:Number(feedHealth.props)||0,teamTotals:Number(feedHealth.teamTotals)||0,billedEventObjects:0,monthlyEventObjects:Number(feedHealth.monthlyEventObjects)||0,syncedAt:feedHealth.lastSuccessAt,nextProviderRefreshAt:new Date(lastSuccess+cooldownMs).toISOString()},200,request);
    }
    const{data:slate,error:slateError}=await admin.from("nfl_pickem_games").select("starts_at").eq("season",nfl.season).eq("week",nfl.week).order("starts_at");if(slateError)throw slateError;
    const starts=(slate||[]).map(row=>new Date(row.starts_at).getTime()).filter(Number.isFinite);
    const after=new Date((starts.length?Math.min(...starts):now.getTime())-12*36e5),before=new Date((starts.length?Math.max(...starts):now.getTime()+7*864e5)+18*36e5);
    const q=new URLSearchParams({leagueID:"NFL",startsAfter:after.toISOString(),startsBefore:before.toISOString(),oddsPresent:"true",includeOpposingOdds:"true",expandResults:"true",limit:"50"});
    stage="SportsGameOdds request";
    const response=await fetch(`${API}?${q}`,{headers:{"x-api-key":apiKey,"User-Agent":"DFL-HQ/1.0"},signal:AbortSignal.timeout(25000)});
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body.success===false)throw new Error(body.error||`SportsGameOdds returned ${response.status}`);
    const freshEvents=Array.isArray(body.data)?body.data:[];
    const currentEventIds=new Set(freshEvents.map((event:J)=>String(event.eventID)));
    const{data:pending,error:pendingError}=await admin.from("sportsbook_markets").select("provider_event_id,provider_key").eq("source","provider").in("status",["open","locked"]);if(pendingError)throw pendingError;
    const recoveryIds=[...new Set((pending||[]).filter(row=>String(row.provider_key||"").startsWith("sgo:")).map(row=>String(row.provider_event_id||"")).filter(id=>id&&!currentEventIds.has(id)))];
    let recoveryEvents:J[]=[];
    if(recoveryIds.length){
      const recoveryQuery=new URLSearchParams({eventIDs:recoveryIds.slice(0,50).join(","),includeOpposingOdds:"true",expandResults:"true",limit:"50"});
      const recoveryResponse=await fetch(`${API}?${recoveryQuery}`,{headers:{"x-api-key":apiKey,"User-Agent":"DFL-HQ/1.0"},signal:AbortSignal.timeout(25000)});
      const recoveryBody=await recoveryResponse.json().catch(()=>({}));if(!recoveryResponse.ok||recoveryBody.success===false)throw new Error(recoveryBody.error||`SportsGameOdds recovery returned ${recoveryResponse.status}`);
      recoveryEvents=Array.isArray(recoveryBody.data)?recoveryBody.data:[];
    }
    const events=[...new Map([...freshEvents,...recoveryEvents].map((event:J)=>[String(event.eventID),event])).values()];let props=0,teamTotals=0,settled=0,liveUpdated=0;
    stage="SportsGameOdds market import";
    const candidates:J[]=[],liveUpdates:J[]=[],settlements:J[]=[];
    for(const e of events){
      const season=seasonOf(e),week=weekOf(e),startsAt=startsAtOf(e);if(!e.eventID||!season||!week||!startsAt)continue;
      const status=eventStatus(e),start=new Date(startsAt);
      const odds=Object.values(e.odds||{}) as J[],oddsById=new Map(odds.map((odd:J)=>[String(odd.oddID||""),odd]));
      for(const odd of odds){
        const stat=String(odd.statID||""),total=stat==="points"?totalIdentity(e,odd):null,player=playerName(e,odd),isPlayer=!!player;
        if(String(odd.sideID).toLowerCase()!=="over"||String(odd.periodID||"game")!=="game"||String(odd.betTypeID||"ou")!=="ou"||(!isPlayer&&!total))continue;
        const consensus=consensusLine(odd),line=consensus.line,playerKey=isPlayer?playerID(odd):`${e.eventID}:${total?.key}`;if(line===null||!playerKey)continue;
        const opposite=oddsById.get(String(odd.opposingOddID||""))||odds.find((candidate:J)=>String(candidate.statID)===stat&&String(candidate.statEntityID||candidate.playerID)===String(odd.statEntityID||odd.playerID)&&String(candidate.periodID||"game")==="game"&&String(candidate.betTypeID||"ou")==="ou"&&String(candidate.sideID).toLowerCase()==="under");
        const overQuote=bestPriceAtLine(odd,line),underQuote=opposite?bestPriceAtLine(opposite,line):null;if(!overQuote||!underQuote)continue;
        const overOdds=overQuote.price,underOdds=underQuote.price;
        const oddID=String(odd.oddID||`${odd.statID}:${playerKey}`),key=`sgo:${e.eventID}:${oddID}`,score=oddScore(e,odd);
        if(status==="final"&&score!==null){settlements.push({provider_key:key,final_score:score});continue}
        if(status==="live"){if(score!==null)liveUpdates.push({provider_key:key,provider_score:score,provider_updated_at:new Date().toISOString(),market_status:"locked"});continue}
        if(status!=="scheduled"||start<=now||week!==nfl.week)continue;
        const meta=isPlayer?playerMeta(e,odd):{position:"",team:""};
        const market={title:isPlayer?`${player} · ${labelFor(stat)}`:total.title,category:isPlayer?"Player Props":total.category,source:"provider",lore_note:`${matchupName(e)} · Book consensus ${line} · ${consensus.books||"market"} books · best available pricing · OVER ${overQuote.book} · UNDER ${underQuote.book}${meta.position?` · POS ${meta.position}`:""}${meta.team?` · TEAM ${meta.team}`:""}`,status:"open",closes_at:start.toISOString(),provider_key:key,provider_event_id:String(e.eventID),provider_market_id:String(odd.oddID||""),provider_line:line,provider_updated_at:new Date().toISOString()};
        candidates.push({market,line,overOdds,underOdds,playerKey,kind:isPlayer?"player":"total",start:start.getTime()});
      }
    }
    if(liveUpdates.length){const{data,error}=await admin.rpc("sportsbook_update_provider_markets",{updates:liveUpdates});if(error)throw error;liveUpdated=Number(data||0)}
    if(settlements.length){const{data,error}=await admin.rpc("sportsbook_settle_provider_markets",{updates:settlements});if(error)throw error;settled=Number(data||0)}
    const playerSelected=candidates.filter(row=>row.kind==="player").sort((a,b)=>a.start-b.start||String(a.market.title).localeCompare(String(b.market.title)));
    const totalSelected=candidates.filter(row=>row.kind==="total").sort((a,b)=>a.start-b.start||String(a.market.title).localeCompare(String(b.market.title)));
    const selected=[...playerSelected,...totalSelected];
    if(selected.length){
      const selectedByKey=new Map(selected.map(row=>[row.market.provider_key,row]));
      const eventIds=[...new Set(selected.map(row=>String(row.market.provider_event_id)))],existing:J[]=[];
      for(let from=0;;from+=1000){const{data,error}=await admin.from("sportsbook_markets").select("id,provider_key").eq("source","provider").in("provider_event_id",eventIds).range(from,from+999);if(error)throw error;existing.push(...(data||[]));if((data||[]).length<1000)break}
      const existingIds=existing.map(row=>row.id);let protectedIds=new Set<string>();
      for(const ids of chunks(existingIds,500)){const{data:legs,error:legError}=await admin.from("sportsbook_bet_legs").select("market_id").in("market_id",ids);if(legError)throw legError;for(const leg of legs||[])protectedIds.add(String(leg.market_id))}
      const protectedKeys=new Set(existing.filter(row=>protectedIds.has(String(row.id))).map(row=>row.provider_key));
      const writable=selected.filter(row=>!protectedKeys.has(row.market.provider_key));
      for(const batch of chunks(writable)){const{error:marketError}=await admin.from("sportsbook_markets").upsert(batch.map(row=>row.market),{onConflict:"provider_key"});if(marketError)throw marketError}
      const markets:J[]=[];for(let from=0;;from+=1000){const{data,error}=await admin.from("sportsbook_markets").select("id,provider_key").eq("source","provider").in("provider_event_id",eventIds).range(from,from+999);if(error)throw error;markets.push(...(data||[]));if((data||[]).length<1000)break}
      const writableKeys=new Set(writable.map(row=>row.market.provider_key));
      const choices=markets.flatMap(market=>{const row=selectedByKey.get(market.provider_key);return row&&writableKeys.has(market.provider_key)?[{market_id:market.id,label:`Over ${row.line}`,odds_american:row.overOdds,sort_order:0,provider_side:"over"},{market_id:market.id,label:`Under ${row.line}`,odds_american:row.underOdds,sort_order:1,provider_side:"under"}]:[]});
      for(const batch of chunks(choices,500)){const{error:outcomeError}=await admin.from("sportsbook_outcomes").upsert(batch,{onConflict:"market_id,provider_side"});if(outcomeError)throw outcomeError}
      props=playerSelected.length;teamTotals=totalSelected.length;
    }
    const month=now.toISOString().slice(0,7),billedEventObjects=freshEvents.length+recoveryEvents.length;
    feedHealth={month,lastAttemptAt:now.toISOString(),lastSuccessAt:now.toISOString(),lastError:"",billedEventObjects,monthlyEventObjects:(feedHealth.month===month?Number(feedHealth.monthlyEventObjects)||0:0)+billedEventObjects,activeMarkets:selected.length,props,teamTotals,events:events.length};
    await writeFeedHealth(admin,feedHealth);
    return json({ok:true,configured:true,pickemProvider:"Public NFL scoreboard",propsConfigured:true,events:events.length,billedEventObjects,recoveredEvents:recoveryEvents.length,monthlyEventObjects:feedHealth.monthlyEventObjects,games:publicGames,props,teamTotals,liveUpdated,settled:settled+sleeperPropsSettled,notices,providerNotice:body.notice||null,syncedAt:now.toISOString()},200,request);
  }catch(error){const detail=error instanceof Error?error.message:typeof error==="object"?JSON.stringify(error):String(error);console.error("sportsbook feed failed",stage,detail);feedHealth={...feedHealth,lastAttemptAt:new Date().toISOString(),lastError:`${stage}: ${detail}`};await writeFeedHealth(admin,feedHealth);return json({ok:false,error:`${stage}: ${detail}`},500,request)}
});
