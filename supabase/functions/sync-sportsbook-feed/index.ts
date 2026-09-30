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
function seasonOf(e:J){return Number(e.info?.season||e.season||new Date(e.startsAt||Date.now()).getFullYear())}
function eventStatus(e:J){if(e.status?.cancelled)return"cancelled";if(e.status?.finalized||e.status?.completed||e.status?.ended)return"final";if(e.status?.started)return"live";return"scheduled"}
const labelFor=(s:string)=>({passing_yards:"Passing yards",passing_touchdowns:"Passing TDs",rushing_yards:"Rushing yards",receiving_yards:"Receiving yards",receptions:"Receptions",touchdowns:"Touchdowns",fantasy_points:"Fantasy points"} as J)[s]||s.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
const supported=(s:string)=>/^(passing_yards|passing_touchdowns|rushing_yards|receiving_yards|receptions|touchdowns|fantasy_points)$/.test(s);

function underdogLine(odd:J){const u=odd.byBookmaker?.underdog;return u?.available===false?null:value(u?.overUnder,u?.line,odd.bookOverUnder?.underdog)}
function playerName(e:J,odd:J){const p=e.players?.[odd.playerID]||e.players?.find?.((x:J)=>String(x.playerID||x.id)===String(odd.playerID));return String(p?.name||p?.names?.long||odd.playerName||odd.statEntityName||"").trim()}
function oddScore(e:J,odd:J){return value(odd.score,e.results?.[odd.oddID],e.results?.[odd.statID]?.[odd.playerID])}

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
  try{
    const nfl=await publicNflState();
    const publicGames=await syncPublicPickem(admin,nfl.season,nfl.week);
    if(!apiKey)return json({ok:true,configured:true,pickemProvider:"Public NFL scoreboard",propsConfigured:false,games:publicGames,props:0,settled:0,syncedAt:new Date().toISOString()},200,request);
    const now=new Date(),after=new Date(now.getTime()-8*864e5),before=new Date(now.getTime()+11*864e5);
    const q=new URLSearchParams({leagueID:"NFL",startsAfter:after.toISOString(),startsBefore:before.toISOString(),includeOpposingOdds:"true",expandResults:"true",bookmakerID:"underdog,draftkings,fanduel",limit:"50"});
    const response=await fetch(`${API}?${q}`,{headers:{"x-api-key":apiKey,"User-Agent":"DFL-HQ/1.0"},signal:AbortSignal.timeout(25000)});
    const body=await response.json().catch(()=>({}));
    if(!response.ok||body.success===false)throw new Error(body.error||`SportsGameOdds returned ${response.status}`);
    const events=Array.isArray(body.data)?body.data:[];let props=0,settled=0;
    for(const e of events){
      const season=seasonOf(e),week=weekOf(e),startsAt=e.startsAt||e.startTime;if(!e.eventID||!season||!week||!startsAt)continue;
      const status=eventStatus(e),start=new Date(startsAt);
      const odds=Object.values(e.odds||{}) as J[];
      for(const odd of odds){
        if(String(odd.sideID).toLowerCase()!=="over"||!supported(String(odd.statID||"")))continue;
        const line=underdogLine(odd),player=playerName(e,odd);if(line===null||!player)continue;
        const key=`sgo:${e.eventID}:${odd.statID}:${odd.playerID}:${line}`,score=oddScore(e,odd);
        if(status==="final"&&score!==null){const{data}=await admin.rpc("sportsbook_settle_provider_market",{target_provider_key:key,winner_side:score===line?"void":score>line?"over":"under",final_score:score,void_market:score===line});if(data)settled++;continue}
        if(status!=="scheduled"||start<=now)continue;
        const market={title:`${player} · ${labelFor(String(odd.statID))}`,category:"Player Props",source:"provider",lore_note:`Underdog ${line} · house price -110`,status:"open",closes_at:start.toISOString(),provider_key:key,provider_event_id:String(e.eventID),provider_market_id:String(odd.oddID||""),provider_line:line,provider_updated_at:new Date().toISOString()};
        const{data:m,error:me}=await admin.from("sportsbook_markets").upsert(market,{onConflict:"provider_key"}).select("id").single();if(me)throw me;
        const choices=[{market_id:m.id,label:`Over ${line}`,odds_american:-110,sort_order:0,provider_side:"over"},{market_id:m.id,label:`Under ${line}`,odds_american:-110,sort_order:1,provider_side:"under"}];
        const{error:oe}=await admin.from("sportsbook_outcomes").upsert(choices,{onConflict:"market_id,provider_side"});if(oe)throw oe;props++;
      }
    }
    return json({ok:true,configured:true,pickemProvider:"Public NFL scoreboard",propsConfigured:true,events:events.length,games:publicGames,props,settled,syncedAt:new Date().toISOString()},200,request);
  }catch(error){return json({ok:false,error:error instanceof Error?error.message:String(error)},500,request)}
});
