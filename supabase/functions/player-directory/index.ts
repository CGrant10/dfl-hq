import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {compactPlayers,validPlayerDirectory} from '../../../js/player-directory-model.js';
const TOKEN_HASH='c7429c5c8cfd182e13e7f1b537b0f671b0b99dcb004b19f8580b960f8f957091';
Deno.serve(async request=>{
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 const token=request.headers.get('x-dfl-cron-token')||'',hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
 if(token.length<32||hash!==TOKEN_HASH)return Response.json({error:'Unauthorized'},{status:401});
 try{
  const key=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  const admin=createClient(Deno.env.get('SUPABASE_URL')||'',key,{auth:{persistSession:false,autoRefreshToken:false}});
  const response=await fetch('https://api.sleeper.app/v1/players/nfl',{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Player source unavailable');
  const players=compactPlayers(await response.json());if(!validPlayerDirectory(players))throw Error('Invalid player catalog');
  const packed=JSON.stringify(players),bytes=new TextEncoder().encode(packed);
  if(bytes.byteLength>8000000)throw Error('Unexpected player catalog size');
  const contentHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  const old=await admin.from('nfl_player_directory').select('content_hash').eq('id',1).maybeSingle();if(old.error)throw old.error;
  const changed=old.data?.content_hash!==contentHash,fetched_at=new Date().toISOString(),player_count=Object.keys(players).length;
  const saved=changed?await admin.from('nfl_player_directory').upsert({id:1,players,content_hash:contentHash,fetched_at,player_count}):await admin.from('nfl_player_directory').update({fetched_at,player_count}).eq('id',1);
  if(saved.error)throw saved.error;
  return Response.json({ok:true,players:player_count,bytes:bytes.byteLength,changed});
 }catch(error){console.error('player-directory',error instanceof Error?error.message:'refresh unavailable');return Response.json({error:'Player directory refresh unavailable'},{status:500})}
});
