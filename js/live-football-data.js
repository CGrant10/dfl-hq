import {db} from './supabase.js';
const cache=new Map();
export function loadLiveFootball(season,week){
 const key=`${season}:${week}`,hit=cache.get(key);if(hit&&Date.now()-hit.at<20000)return hit.promise;
 const promise=(async()=>{const {data,error}=await db().rpc('nfl_live_week',{p_season:Number(season),p_week:Number(week)}).abortSignal(AbortSignal.timeout(12000));if(error)throw error;return data||[]})().catch(error=>{if(cache.get(key)?.promise===promise)cache.delete(key);throw error});
 cache.set(key,{at:Date.now(),promise});return promise;
}
