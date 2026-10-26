import {db} from './supabase.js';
import {highlightSession} from './home-highlight-model.js';
export async function loadHomeHighlights({now=Date.now()}={}){
 const session=highlightSession(now);
 if(!session.active)return [];
 const {data,error}=await db().from('nfl_highlight_clips').select('id,game_id,session_date,headline,kind,thumbnail_url,source_url,video_url,duration,published_at,expires_at,game_label,fetched_at')
  .gte('session_date',session.startDate).lte('session_date',session.endDate).gt('expires_at',new Date(now).toISOString()).order('published_at',{ascending:false}).limit(500).abortSignal(AbortSignal.timeout(10000));
 if(error)throw error;return data||[];
}
