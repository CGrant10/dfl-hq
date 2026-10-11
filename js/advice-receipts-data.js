import {db} from './supabase.js';
import {loadWeeklyStats} from './sleeper.js';
import {loadNflGameDay} from './nfl-game-day.js';
import {gradeAdviceReceipt} from './advice-receipts.js';
const cache=new Map();
export function clearAdviceReceiptsCache(){cache.clear()}
globalThis.addEventListener?.('dfl:quick-sync-complete',clearAdviceReceiptsCache);
export async function loadAdviceReceipts({leagueId,season,week,rosterId=null,history=false,teamNames=new Map(),force=false}={}){
  const from=history?Math.max(1,week-2):week,key=`${leagueId}:${season}:${from}:${week}:${rosterId||'all'}`;
  let hit=cache.get(key);
  if(force||!hit||Date.now()-hit.at>=30000){
    const read=(async()=>{
      let query=db().from('roster_advice_receipts').select('*').eq('league_id',String(leagueId)).eq('season',season).gte('week',from).lte('week',week).order('week',{ascending:false}).order('captured_at',{ascending:false}).limit(72);
      if(rosterId!=null)query=query.eq('roster_id',Number(rosterId));
      const {data,error}=await query;if(error)throw error;
      const records=data||[],weeks=[...new Set(records.map(r=>Number(r.week)))];
      const results=new Map();
      await Promise.all(weeks.map(async w=>{
        try{
          const nfl=await loadNflGameDay(season,w,{force});
          const statuses=[...nfl.teams.values()],now=Date.now();
          const completed=statuses.length>0&&statuses.every(s=>s.key==='final'&&Number.isFinite(Date.parse(s.kickoff))&&Date.parse(s.kickoff)+4*3600000<=now);
          if(!completed){results.set(w,{completed:false,stats:[]});return}
          const scores=await loadWeeklyStats(season,w,{maxAgeMs:force?0:60000});
          if(scores.stale||!Array.isArray(scores.data)||!scores.data.length)throw Error('Final player scores unavailable');
          results.set(w,{completed:true,stats:scores.data,schedule:nfl.teams});
        }catch{results.set(w,{completed:false,stats:[],unavailable:true})}
      }));
      return {records,results};
    })().catch(e=>{cache.delete(key);throw e});
    hit={at:Date.now(),read};cache.set(key,hit);
  }
  const {records,results}=await hit.read;
  const rows=records.map(r=>{
    const result=results.get(Number(r.week));
    const known=!result?.completed||[...(r.added_players||[]),...(r.removed_players||[])].every(p=>p.noGame===true||result.schedule?.get(({WSH:"WAS",JAC:"JAX",LA:"LAR"}[p.team]||p.team))?.key==='final');
    const graded=gradeAdviceReceipt(r,{...result,completed:!!result?.completed&&known,teamName:teamNames.get(String(r.roster_id))});
    if(!known)return {...graded,copy:"A player’s final game status is still unavailable."};
    return result?.unavailable?{...graded,copy:'Fresh game status or final scores could not load.'}:graded;
  });
  return {rows,season,week,history,rosterId};
}
