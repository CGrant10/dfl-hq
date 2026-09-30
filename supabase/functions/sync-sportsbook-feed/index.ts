import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const TOKEN_HASH="c7429c5c8cfd182e13e7f1b537b0f671b0b99dcb004b19f8580b960f8f957091";
const API="https://api.sportsgameodds.com/v2/events";
const ESPN="https://cdn.espn.com/core/nfl/scoreboard";
const cors=(r?:Request)=>({"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":r?.headers.get("access-control-request-headers")||"authorization, x-client-info, apikey, content-type, x-admin-token, x-member-id, x-commissioner-pin, x-dfl-cron-token","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Max-Age":"86400",Vary:"Access-Control-Request-Headers"});
const json=(v:unknown,s=200,r?:Request)=>Response.json(v,{status:s,headers:cors(r)});
type J=Record<string,any>;

function envKey(name:"SUPABASE_SECRET_KEYS"|"SUPABASE_PUBLISHABLE_KEYS",legacy:string){try{const map=JSON.parse(Deno.env.get(name)||"{}");if(map.default)return String(map.default)}catch{}return Deno.env.get(legacy)||""}
async function sha256(v:string){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,"0")).join("")}
function authHeaders(r:Request){const h:Record<string,string>={};for(const n of["x-admin-token","x-member-id","x-commissioner-pin"]){const v=r.headers.get(n);if(v)h[n]=v}return h}
async function authorized(r:Request,url:string,pub:string){const token=r.headers.get("x-dfl-cron-token")||"";if(token.length>=32&&await sha256(token)===TOKEN_HASH)return true;const c=createClient(url,pub,{global:{headers:authHeaders(r)},auth:{persistSession:false,autoRefreshToken:false}});const{data,error}=await c.rpc("has_commissioner_permission",{permission_name:"sportsbook"});return !error&&data===true}
const value=(...xs:any[])=>{for(const x of xs){const n=Number(x);if(Number.isFinite(n))return n}return null};
function weekOf(e:J){const raw=String(e.info?.seasonWeek||e.info?.week||e.week||"");return Number(raw.match(/(\d+)/)?.[1]||0)}
function startsAtOf(e:J){return String(e.status?.startsAt||e.startsAt||e.startTime||"")}
function seasonOf(e:J){return Number(e.info?.season||e.season||new Date(startsAtOf(e)||Date.now()).getFullYear())}
function eventStatus(e:J){if(e.status?.cancelled)return"cancelled";if(e.status?.finalized||e.status?.completed||e.status?.ended)return"final";if(e.status?.started)return"live";return"scheduled"}
const labelFor=(s:string)=>({passing_yards:"Passing yards",passing_touchdowns:"Passing TDs",rushing_yards:"Rushing yards",receiving_yards:"Receiving yards",receptions:"Receptions",touchdowns:"Touchdowns",fantasy_points:"Fantasy points"} as J)[s]||s.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
const supported=(s:string)=>/^(passing_yards|passing_touchdowns|rushing_yards|receiving_yards|receptions|touchdowns|fantasy_points)$/.test(s);
const statPriority=(s:string)=>({passing_yards:0,rushing_yards:1,receiving_yards:2,receptions:3,passing_touchdowns:4,touchdowns:5,fantasy_points:6} as J)[s]??99;

function playerID(odd:J){return String(odd.playerID||odd.statEntityID||"")}
function playerName(e:J,odd:J){const id=playerID(odd),p=e.players?.[id]||Object.values(e.players||{}).find((x:any)=>String(x?.playerID||x?.id)===id);return String((p as J)?.name||(p as J)?.names?.long||odd.playerName||odd.statEntityName||"").trim()}
function consensusLine(odd:J){
  const direct=value(odd.bookOverUnder,odd.fairOverUnder);
  if(direct!==null)return{line:direct,books:Object.values(odd.byBookmaker||{}).filter((book:any)=>book?.available!==false&&value(book?.overUnder)!==null).length};
  const lines=Object.values(odd.byBookmaker||{}).filter((book:any)=>book?.available!==false).map((book:any)=>value(book?.overUnder)).filter((line):line is number=>line!==null).sort((a,b)=>a-b);
  if(!lines.length)return{line:null,books:0};
  const middle=Math.floor(lines.length/2),line=lines.length%2?lines[middle]:(lines[middle-1]+lines[middle])/2;
  return{line,books:lines.length};
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
  if(input.action==="status")return json({ok:true,configured:true,pickemProvider:"Public NFL scoreboard",propsConfigured:!!apiKey},200,request);
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
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
    const now=new Date(),after=new Date(now.getTime()-8*864e5),before=new Date(now.getTime()+11*864e5);
    const q=new URLSearchParams({leagueID:"NFL",startsAfter:after.toISOString(),startsBefore:before.toISOString(),oddsPresent:"true",includeOpposingOdds:"true",expandResults:"true",limit:"50"});
    stage="SportsGameOdds request";
    const response=await fetch(`${API}?${q}`,{headers:{"x-api-key":apiKey,"User-Agent":"DFL-HQ/1.0"},signal:AbortSignal.timeout(25000)});
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body.success===false)throw new Error(body.error||`SportsGameOdds returned ${response.status}`);
    const events=Array.isArray(body.data)?body.data:[];let props=0,settled=0;
    stage="SportsGameOdds market import";
    const candidates:J[]=[];
    for(const e of events){
      const season=seasonOf(e),week=weekOf(e),startsAt=startsAtOf(e);if(!e.eventID||!season||!week||!startsAt)continue;
      const status=eventStatus(e),start=new Date(startsAt);
      const odds=Object.values(e.odds||{}) as J[];
      for(const odd of odds){
        if(String(odd.sideID).toLowerCase()!=="over"||String(odd.periodID||"game")!=="game"||String(odd.betTypeID||"ou")!=="ou"||!supported(String(odd.statID||"")))continue;
        const consensus=consensusLine(odd),line=consensus.line,player=playerName(e,odd),playerKey=playerID(odd);if(line===null||!player||!playerKey)continue;
        const oddID=String(odd.oddID||`${odd.statID}:${playerKey}`),key=`sgo:${e.eventID}:${oddID}`,score=oddScore(e,odd);
        if(status==="final"&&score!==null){const{data}=await admin.rpc("sportsbook_settle_provider_market",{target_provider_key:key,winner_side:score===line?"void":score>line?"over":"under",final_score:score,void_market:score===line});if(data)settled++;continue}
        if(status!=="scheduled"||start<=now||week!==nfl.week)continue;
        const market={title:`${player} · ${labelFor(String(odd.statID))}`,category:"Player Props",source:"provider",lore_note:`Book consensus ${line} · ${consensus.books||"multiple"} books · house price -110`,status:"open",closes_at:start.toISOString(),provider_key:key,provider_event_id:String(e.eventID),provider_market_id:String(odd.oddID||""),provider_line:line,provider_updated_at:new Date().toISOString()};
        candidates.push({market,line,playerKey,priority:statPriority(String(odd.statID)),start:start.getTime()});
      }
    }
    const bestByPlayer=new Map<string,J>();
    for(const candidate of candidates){const current=bestByPlayer.get(candidate.playerKey);if(!current||candidate.priority<current.priority)bestByPlayer.set(candidate.playerKey,candidate)}
    const selected=[...bestByPlayer.values()].sort((a,b)=>a.start-b.start||a.priority-b.priority||String(a.market.title).localeCompare(String(b.market.title))).slice(0,96);
    if(selected.length){
      const{data:markets,error:marketError}=await admin.from("sportsbook_markets").upsert(selected.map(row=>row.market),{onConflict:"provider_key"}).select("id,provider_key");if(marketError)throw marketError;
      const selectedByKey=new Map(selected.map(row=>[row.market.provider_key,row]));
      const choices=(markets||[]).flatMap(market=>{const row=selectedByKey.get(market.provider_key);return row?[{market_id:market.id,label:`Over ${row.line}`,odds_american:-110,sort_order:0,provider_side:"over"},{market_id:market.id,label:`Under ${row.line}`,odds_american:-110,sort_order:1,provider_side:"under"}]:[]});
      const{error:outcomeError}=await admin.from("sportsbook_outcomes").upsert(choices,{onConflict:"market_id,provider_side"});if(outcomeError)throw outcomeError;props=selected.length;
    }
    return json({ok:true,configured:true,pickemProvider:"Public NFL scoreboard",propsConfigured:true,events:events.length,games:publicGames,props,settled:settled+sleeperPropsSettled,notices,syncedAt:new Date().toISOString()},200,request);
  }catch(error){const detail=error instanceof Error?error.message:typeof error==="object"?JSON.stringify(error):String(error);console.error("sportsbook feed failed",stage,detail);return json({ok:false,error:`${stage}: ${detail}`},500,request)}
});
