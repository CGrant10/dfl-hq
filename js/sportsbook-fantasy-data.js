import {fantasyMarketKey,fantasyMatchupResults} from './sportsbook-fantasy-results.js';
const cache=new Map();

// Read-only results. The Tuesday house settlement still owns wallets and payouts.
export async function loadFantasyBookResults(client,markets,{force=false,now=Date.now()}={}) {
  const relevant=markets.filter(m=>fantasyMarketKey(m)&&['open','locked'].includes(m.status)
    &&(!m.closes_at||Date.parse(m.closes_at)<=now));
  if(!relevant.length)return new Map();
  const seasons=[...new Set(relevant.map(m=>fantasyMarketKey(m).season))];
  const {data:leagues,error}=await client.from('sleeper_leagues').select('season,sleeper_league_id').in('season',seasons).abortSignal(AbortSignal.timeout(8000));
  if(error||!Array.isArray(leagues))throw Error('Fantasy results unavailable');
  const [{loadPlayers},{loadWeeklyRosters},{loadNflGameDay}]=await Promise.all([import('./sleeper.js'),import('./weekly-clubhouse-data.js'),import('./nfl-game-day.js')]);
  const players=await loadPlayers({maxAgeMs:300000});
  const groups=new Map();for(const market of relevant){const k=fantasyMarketKey(market),key=`${k.season}:${k.week}`;if(!groups.has(key))groups.set(key,{...k,markets:[]});groups.get(key).markets.push(market);}
  const results=await Promise.all([...groups.values()].map(async group=>{
    const league=leagues.find(row=>Number(row.season)===group.season);if(!league?.sleeper_league_id)return new Map();
    const key=`${league.sleeper_league_id}:${group.season}:${group.week}`,hit=cache.get(key);
    let snapshot;
    if(!force&&hit&&now-hit.checkedAt>=0&&now-hit.checkedAt<20000)snapshot=hit;
    else{
      try{const [rows,nfl]=await Promise.all([loadWeeklyRosters(league.sleeper_league_id,group.week,{maxAgeMs:force?0:20000}),loadNflGameDay(group.season,group.week,{force})]);snapshot={rows,schedule:nfl.teams,checkedAt:Math.min(Date.now(),nfl.fetchedAt)};cache.set(key,snapshot);}
      catch{cache.delete(key);return new Map();}
    }
    return fantasyMatchupResults({...group,...snapshot,players,now:Date.now()});
  }));
  return new Map(results.flatMap(result=>[...result]));
}
