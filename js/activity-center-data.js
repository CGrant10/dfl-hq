import {db} from './supabase.js';
import {activityRoute,activityKind} from './activity-center-model.js';

/** Bounded, batched reads only for targets already returned by the member's inbox. */
export async function loadActivityContext(rows,{client=db(),memberId=null}={}){
 const trades=new Set(),clips=new Set(),games=new Set();let book=false;
 for(const row of rows){const r=activityRoute(row),kind=activityKind(row);
  if(kind==='trades'&&r.path==='#/trade'&&/^\d{1,24}$/.test(r.params.get('tx')||''))trades.add(r.params.get('tx'));
  if(kind==='plays'&&r.path==='#/clubhouse'){
   if(/^\d{1,24}$/.test(r.params.get('clip')||''))clips.add(r.params.get('clip'));
   const id=r.params.get('nflGame')||r.params.get('moment')?.match(/^nfl:(\d+):/)?.[1];if(/^\d{1,24}$/.test(id||''))games.add(id);
  }
  if(kind==='book'&&r.path==='#/sportsbook'&&/^\d{1,18}$/.test(r.params.get('ticket')||''))book=true;
 }
 const signal=AbortSignal.timeout(3500);
 const read=async task=>{try{const request=task();const r=await(typeof request.abortSignal==='function'?request.abortSignal(signal):request);return r?.error?null:r?.data}catch{return null}};
 const results=await Promise.all([
  trades.size?read(()=>client.from('trade_alerts').select('sleeper_transaction_id,teams,packages,result,routing_review').in('sleeper_transaction_id',[...trades].slice(0,50))):null,
  clips.size?read(()=>client.from('nfl_highlight_clips').select('id,game_id,play_id,headline,thumbnail_url,game_label,expires_at').in('id',[...clips].slice(0,50))):null,
  games.size?read(()=>client.from('nfl_live_games').select('game_id,plays').in('game_id',[...games].slice(0,6))):null,
  book?read(()=>client.rpc('sportsbook_my_live_account')):null,
 ]);
 const account=results[3],own=memberId!=null&&String(account?.member_id)===String(memberId);
 return{trades:Array.isArray(results[0])?results[0]:[],clips:Array.isArray(results[1])?results[1]:[],games:Array.isArray(results[2])?results[2]:[],bets:own&&Array.isArray(account?.bets)?account.bets:[],accountMemberId:own?account.member_id:null,memberId};
}
