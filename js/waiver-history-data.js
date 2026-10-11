import {db} from './supabase.js';
import {sleeper} from './sleeper.js';

const cache=new Map();
export const WAIVER_HISTORY_LIMIT=600;
export function clearWaiverHistoryCache(){cache.clear();}
globalThis.addEventListener?.('dfl:quick-sync-complete',clearWaiverHistoryCache);

// One season and four recent weeks; current-week ownership changes come live.
export function loadWaiverHistory({leagueId,season,week}){
 const key=`${leagueId}:${season}:${week}`,hit=cache.get(key);
 if(hit&&Date.now()-hit.at<60000)return hit.value;
 const value=(async()=>{
  const [stored,live]=await Promise.allSettled([
   db().from('sleeper_transactions').select('sleeper_transaction_id,season,week,type,status,created_ms,details')
    .eq('season',season).gte('week',Math.max(1,week-3)).lte('week',week).in('type',['waiver','free_agent'])
    .eq('status','complete').order('created_ms',{ascending:false}).limit(WAIVER_HISTORY_LIMIT+1),
   sleeper.transactions(leagueId,week),
  ]);
  const history=stored.status==='fulfilled'&&!stored.value.error&&Array.isArray(stored.value.data)?stored.value.data:null;
  const current=live.status==='fulfilled'&&Array.isArray(live.value)?live.value:null;
  const combined=new Map((history||[]).slice(0,WAIVER_HISTORY_LIMIT).map(row=>[String(row.sleeper_transaction_id),row]));
  for(const transaction of current||[]){
   if(!transaction.transaction_id)continue;
   combined.set(String(transaction.transaction_id),{sleeper_transaction_id:String(transaction.transaction_id),season,
    week:transaction.leg??week,type:transaction.type,status:transaction.status,created_ms:transaction.created,details:transaction});
  }
  return {transactions:[...combined.values()],state:history&&current&&history.length<=WAIVER_HISTORY_LIMIT?'ready':history||current?'partial':'unavailable',checkedAt:Date.now()};
 })();
 cache.set(key,{at:Date.now(),value});return value;
}
