import {classifyCompletedTrade} from '../../../js/trade-receipt-model.js';

/** A lightweight trade-only poll. Full score, roster and report syncs keep their cadence. */
export async function runTradeWatch({admin,sleeper,capture,dryRun=false,now=Date.now()}:any){
 const checkedAt=new Date(now).toISOString();
 const {data:config,error:configError}=await admin.from('sleeper_config').select('sleeper_league_id,auto_sync_enabled').eq('id',1).single();
 if(configError)throw configError;
 if(!config.auto_sync_enabled)return {ok:true,skipped:'disabled'};
 if(!config.sleeper_league_id)throw Error('No Sleeper league configured');
 if(!dryRun){
  const cutoff=new Date(now-90000).toISOString();
  const claim=await admin.from('sleeper_config').update({last_trade_watch_started_at:checkedAt}).eq('id',1).eq('auto_sync_enabled',true).or(`last_trade_watch_started_at.is.null,last_trade_watch_started_at.lte.${cutoff}`).select('id');
  if(claim.error)throw claim.error;if(!claim.data?.length)return {ok:true,skipped:'cadence'};
 }
 try{
  const leagueId=String(config.sleeper_league_id),[league,state]=await Promise.all([sleeper(`/league/${leagueId}`),sleeper('/state/nfl')]);
  const season=Number(league?.season);
  if(!Number.isInteger(season)||season!==Number(state?.season))throw Error('Configured league is not the current Sleeper season');
  const leg=Number(league.settings?.leg),week=Math.max(1,Math.min(18,leg>0?leg:Number(state.week)||1)),weeks=week>1?[week-1,week]:[week];
  const ledgers=await Promise.all(weeks.map(w=>sleeper(`/league/${leagueId}/transactions/${w}`)));
  if(ledgers.some(rows=>!Array.isArray(rows)))throw Error('Incomplete Sleeper transactions');
  const unique=new Map(),transactionWeeks:Record<string,number>={};
  ledgers.forEach((rows,i)=>rows.forEach((tx:any)=>{unique.set(String(tx.transaction_id),tx);transactionWeeks[String(tx.transaction_id)]=weeks[i]}));
  const transactions=[...unique.values()],trades=transactions.filter(classifyCompletedTrade),ids=trades.map(tx=>String(tx.transaction_id));
  let work=false;
  if(ids.length){
   const saved=await admin.from('trade_alerts').select('sleeper_transaction_id,breaking_active,notification_message_id').in('sleeper_transaction_id',ids);
   if(saved.error)throw saved.error;
   const existing=new Map((saved.data||[]).map((row:any)=>[String(row.sleeper_transaction_id),row]));
   work=ids.some(id=>{const row:any=existing.get(id);return !row||row.breaking_active&&!row.notification_message_id});
  }
  if(dryRun)return {ok:true,dryRun:true,season,week,weeks,completedTrades:ids.length,workPending:work};
  let tradeAlerts={created:0,notified:0};
  if(work){
   const [users,rosters]=await Promise.all([sleeper(`/league/${leagueId}/users`),sleeper(`/league/${leagueId}/rosters`)]);
   if(!Array.isArray(users)||!users.length||!Array.isArray(rosters)||rosters.length!==Number(league.total_rosters)||new Set(rosters.map(r=>r.roster_id)).size!==rosters.length||rosters.some(r=>!Array.isArray(r.players)))throw Error('Incomplete Sleeper ownership data');
   // Receipts reference the persisted Sleeper transaction. The trade-only
   // watcher must create that parent itself, before grading or sending alerts.
   const ledger=await admin.from('sleeper_transactions').upsert(trades.map(tx=>({
    sleeper_transaction_id:String(tx.transaction_id),season,
    week:tx.leg??transactionWeeks[String(tx.transaction_id)]??week,
    type:tx.type||'',status:tx.status||'',details:tx,created_ms:tx.created??null,
   })),{onConflict:'sleeper_transaction_id'});
   if(ledger.error)throw ledger.error;
   tradeAlerts=await capture({admin,league,users,rosters,transactions,transactionWeeks,season,week});
  }
  const saved=await admin.from('sleeper_config').update({last_trade_watch_checked_at:checkedAt,last_trade_watch_error:''}).eq('id',1);
  if(saved.error)throw saved.error;
  return {ok:true,season,week,completedTrades:ids.length,tradeAlerts};
 }catch(error){
  if(!dryRun)await admin.from('sleeper_config').update({last_trade_watch_error:String((error as any)?.message||error).slice(0,500)}).eq('id',1);
  throw error;
 }
}
