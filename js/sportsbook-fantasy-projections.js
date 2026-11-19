import {fantasyMarketKey} from './sportsbook-fantasy-results.js';
import {scorePlayer} from './dfl-scoring.js';
const leagues=new Map();

// Live lineup reads are independent of the accepted prices on existing tickets.
export async function loadFantasyBookProjections(client,markets,{force=false}={}){
 const relevant=markets.filter(m=>fantasyMarketKey(m)&&['open','locked'].includes(m.status));
 if(!relevant.length)return new Map();
 const seasons=[...new Set(relevant.map(m=>fantasyMarketKey(m).season))];
 const {data,error}=await client.from('sleeper_leagues').select('season,sleeper_league_id').in('season',seasons).abortSignal(AbortSignal.timeout(8000));
 if(error||!Array.isArray(data))throw Error('League unavailable');
 const [{sleeper,loadWeeklyProjections},{loadWeeklyRosters}]=await Promise.all([import('./sleeper.js'),import('./weekly-clubhouse-data.js')]);
 const groups=new Map();for(const market of relevant){const key=fantasyMarketKey(market),id=`${key.season}:${key.week}`;if(!groups.has(id))groups.set(id,{...key,markets:[]});groups.get(id).markets.push(market);}
 const result=new Map();
 await Promise.all([...groups.values()].map(async group=>{
  const id=data.find(l=>Number(l.season)===group.season)?.sleeper_league_id;if(!id)return;
  let league=leagues.get(id);if(!league||Date.now()-league.at>300000){league={at:Date.now(),value:sleeper.league(id)};leagues.set(id,league);}
  let config;try{config=await league.value;}catch(error){leagues.delete(id);throw error;}
  if(!config?.scoring_settings)throw Error('Scoring unavailable');
  const [rows,projections]=await Promise.all([loadWeeklyRosters(id,group.week,{maxAgeMs:force?0:20000}),loadWeeklyProjections(group.season,group.week,{maxAgeMs:force?0:60000})]);
  if(!projections.data?.length)throw Error('Projections unavailable');
  const players=new Map(projections.data.map(p=>[String(p.player_id),p.stats||{}]));
  for(const market of group.markets){
   const sides=rows.filter(row=>Number(row.matchup_id)===group.matchupId),scores=new Map();
   for(const row of sides){const starters=(row.starters||[]).map(String).filter(id=>id!=='0');if(!starters.some(id=>players.has(id)))continue;scores.set(String(row.roster_id),starters.reduce((total,id)=>total+scorePlayer(players.get(id)||{},config.scoring_settings),0));}
   if(scores.size===2)result.set(String(market.id),scores);
  }
 }));
 return result;
}
