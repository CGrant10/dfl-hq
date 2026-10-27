import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {runTradeWatch} from './handler.ts';
import {captureScheduledTrades} from '../sync-sleeper/trade-alerts.ts';
const TOKEN_HASH='c7429c5c8cfd182e13e7f1b537b0f671b0b99dcb004b19f8580b960f8f957091';
Deno.serve(async(request)=>{
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 const token=request.headers.get('x-dfl-cron-token')||'';
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 if(token.length<32||hash!==TOKEN_HASH)return Response.json({error:'Unauthorized'},{status:401});
 try{
  const url=Deno.env.get('SUPABASE_URL')||'';
  let secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  try{secret=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||secret}catch{}
  if(!url||!secret)throw Error('Server configuration unavailable');
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}}),input=await request.json().catch(()=>({}));
  const sleeper=async(path:string)=>{const response=await fetch(`https://api.sleeper.app/v1${path}`,{headers:{'User-Agent':'DFL-HQ-Trade-Watch/1.0'},signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error(`Sleeper ${response.status}`);return response.json()};
  return Response.json(await runTradeWatch({admin,sleeper,dryRun:input.dryRun===true,capture:(options:any)=>captureScheduledTrades({...options,url,cronToken:token})}));
 }catch(error){console.error('Trade watch:',error);return Response.json({ok:false,error:'Trade check unavailable; the next scheduled check will retry.'},{status:502})}
});
