import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {gameHighlightClips,highlightSession,highlightGameDate} from '../../../js/home-highlight-model.js';
import {linkHighlightPlays} from '../_shared/highlight-links.ts';
const TOKEN_HASH='c7429c5c8cfd182e13e7f1b537b0f671b0b99dcb004b19f8580b960f8f957091';
const get=async(url:string,timeout=10000)=>{const r=await fetch(url,{headers:{'User-Agent':'DFL-HQ-Highlights/1.0'},signal:AbortSignal.timeout(timeout)});if(!r.ok)throw Error(`Highlight provider ${r.status}`);return r.json()};
function secretKey(){try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''}catch{return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''}}
Deno.serve(async request=>{
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 const token=request.headers.get('x-dfl-cron-token')||'',hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
 if(token.length<32||hash!==TOKEN_HASH)return Response.json({error:'Unauthorized'},{status:401});
 const input=await request.json().catch(()=>({})),dryRun=input.dryRun===true,requested=Date.parse(input.at),now=dryRun&&Number.isFinite(requested)?requested:Date.now();
 try{
  const admin=createClient(Deno.env.get('SUPABASE_URL')||'',secretKey(),{auth:{persistSession:false,autoRefreshToken:false}}),session=highlightSession(now);
  if(!dryRun){const removed=await admin.from('nfl_highlight_clips').delete().lte('expires_at',new Date(now).toISOString());if(removed.error)throw removed.error}
  const config=await admin.from('sleeper_config').select('auto_sync_enabled').eq('id',1).single();if(config.error)throw config.error;
  if(!config.data.auto_sync_enabled)return Response.json({ok:true,skipped:'disabled'});
  if(!session.active)return Response.json({ok:true,skipped:'between-weekends',clips:0});
  const dates=Array.from({length:5},(_,i)=>new Date(Date.parse(session.startDate+'T12:00:00Z')+i*86400000).toISOString().slice(0,10)).filter(date=>date<=session.date);
  const boards=await Promise.allSettled(dates.map(date=>get(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${date.replaceAll('-','')}`)));
  const failedBoards=boards.filter(result=>result.status==='rejected').length;
  if(failedBoards===boards.length)throw Error('Highlight scoreboards unavailable');
  const allEvents=boards.flatMap(result=>result.status==='fulfilled'?result.value.events||[]:[]);
  const events=[...new Map(allEvents.filter((e:any)=>/^\d{1,24}$/.test(String(e.id))&&(highlightGameDate(Date.parse(e.date))||'')>=session.startDate&&(highlightGameDate(Date.parse(e.date))||'')<=session.endDate&&Date.parse(e.date)<=now+30000).map((e:any)=>[String(e.id),e])).values()] as any[];
  let cursor=0,failed=0;const clips:any[]=[];
  await Promise.all(Array.from({length:Math.min(3,events.length)},async()=>{while(cursor<events.length){const event=events[cursor++];try{
   const summary=await get(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${event.id}`);
   if(String(summary.header?.id)!==String(event.id))throw Error('Highlight game scope mismatch');
   clips.push(...await linkHighlightPlays(gameHighlightClips(summary,event,{now}),summary,url=>get(url,3000)));
  }catch{failed++}}}));
  const rows=[...new Map(clips.map(clip=>[clip.id,clip])).values()];
  if(rows.length){const known=await admin.from('nfl_highlight_clips').select('id,game_id,headline,kind,play_id').in('id',rows.map(row=>row.id)).not('play_id','is',null);if(known.error)throw known.error;
   for(const row of rows)if(!row.play_id){const prior=(known.data||[]).find(p=>p.id===row.id&&p.game_id===row.game_id&&p.headline===row.headline&&p.kind===row.kind);if(prior)row.play_id=prior.play_id}
  }
  if(!dryRun&&rows.length){const saved=await admin.from('nfl_highlight_clips').upsert(rows,{onConflict:'id'});if(saved.error)throw saved.error}
  if(events.length&&failed===events.length)throw Error('Highlight sources unavailable');
  return Response.json({ok:true,dryRun,date:session.date,startDate:session.startDate,endDate:session.endDate,expiresAt:new Date(session.expiresAt).toISOString(),games:events.length,clips:rows.length,linked:rows.filter(row=>row.play_id).length,failed,failedBoards});
 }catch(error){console.error('game-highlights',error instanceof Error?error.message:'provider unavailable');return Response.json({error:'Highlight refresh unavailable'},{status:500})}
});
