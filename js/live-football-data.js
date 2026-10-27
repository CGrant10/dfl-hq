import {db} from './supabase.js';
import {highlightVideoUrl} from './home-highlight-model.js';
const cache=new Map();
export function loadLiveFootball(season,week){
 const key=`${season}:${week}`,hit=cache.get(key);if(hit&&Date.now()-hit.at<20000)return hit.promise;
 const promise=(async()=>{const {data,error}=await db().rpc('nfl_live_week',{p_season:Number(season),p_week:Number(week)}).abortSignal(AbortSignal.timeout(12000));if(error)throw error;const feeds=data||[];
  const games=feeds.filter(feed=>feed.plays?.length).map(feed=>String(feed.game_id));if(!games.length)return feeds;
  for(const feed of feeds)for(const play of feed.plays||[])delete play.clipId;
  try{const videos=await db().from('nfl_highlight_clips').select('id,game_id,play_id,video_url,expires_at').in('game_id',games).not('play_id','is',null).gt('expires_at',new Date().toISOString()).limit(100).abortSignal(AbortSignal.timeout(4000));
   if(!videos.error)for(const feed of feeds)for(const play of feed.plays||[]){delete play.clipId;const clip=(videos.data||[]).find(c=>c.game_id===feed.game_id&&c.play_id===String(play.id)&&highlightVideoUrl(c.video_url));if(clip)play.clipId=clip.id}
  }catch{/* Play alerts remain available when video metadata cannot load. */}
  return feeds;
 })().catch(error=>{if(cache.get(key)?.promise===promise)cache.delete(key);throw error});
 cache.set(key,{at:Date.now(),promise});return promise;
}
