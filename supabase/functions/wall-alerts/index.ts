import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';
import {wallPushEligibility,wallPushFailure} from '../../../js/wall-push-policy.js';
const TOKEN_HASH='c7429c5c8cfd182e13e7f1b537b0f671b0b99dcb004b19f8580b960f8f957091';
function secretKey(){try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''}catch{return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''}}
Deno.serve(async request=>{
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 const token=request.headers.get('x-dfl-cron-token')||'';
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 if(token.length<32||hash!==TOKEN_HASH)return Response.json({error:'Unauthorized'},{status:401});
 try{
  const admin=createClient(Deno.env.get('SUPABASE_URL')||'',secretKey(),{auth:{persistSession:false,autoRefreshToken:false}});
  const input=await request.json().catch(()=>({}));
  if(input.dryRun===true){
   const {count,error}=await admin.from('wall_push_outbox').select('*',{count:'exact',head:true}).is('completed_at',null).lt('attempts',5);
   if(error)throw error;return Response.json({ok:true,dryRun:true,pending:count});
  }
  const {data:batch,error}=await admin.rpc('claim_wall_push_batch');if(error)throw error;
  if(!batch?.length)return Response.json({ok:true,checked:0});
  const envPublic=Deno.env.get('VAPID_PUBLIC_KEY'),envPrivate=Deno.env.get('VAPID_PRIVATE_KEY');
  const config=envPublic&&envPrivate?{public_key:envPublic,private_key:envPrivate}:(await admin.from('notification_push_config').select('public_key,private_key').eq('singleton',true).single()).data;
  if(!config)throw Error('Push configuration unavailable');
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')||'mailto:dfl-hq@example.com',config.public_key,config.private_key);
  let delivered=0,failed=0,skipped=0;
  const outcomes=await Promise.allSettled(batch.map(async (claim:any)=>{
   const {data:message,error:messageError}=await admin.from('notification_messages').select('id,title,body,category,target_url,audience,target_member_ids,source_key,created_at').eq('id',claim.message_id).maybeSingle();
   const {data:subscription,error:subscriptionError}=await admin.from('push_subscriptions').select('id,member_id,enabled,categories,endpoint,p256dh,auth,failure_count').eq('id',claim.subscription_id).maybeSingle();
   let result:string|null=null,delayMs=120000;
   try{
    if(messageError||subscriptionError)throw Error('Delivery lookup unavailable');
    const eligible=wallPushEligibility(message,subscription);
    if(eligible!=='ready'){result=eligible;skipped++}
    else{
     if(!message||!subscription)throw Error('Delivery target unavailable');
     const expiresAt=new Date(Date.parse(message.created_at)+24*3600000).toISOString();
     const payload=JSON.stringify({title:message.title,body:message.body,category:'wall',url:message.target_url,messageId:message.id,expiresAt});
     await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},payload,{TTL:Math.max(1,Math.floor((Date.parse(expiresAt)-Date.now())/1000)),urgency:'normal',timeout:12000});
     result='delivered';delivered++;
     await admin.from('push_subscriptions').update({failure_count:0,last_success_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',subscription.id);
    }
   }catch(error){
    failed++;
    const status=error&&typeof error==='object'&&'statusCode' in error?Number(error.statusCode):0;
    const decision=wallPushFailure(status,claim.attempts);result=decision.result;delayMs=decision.delayMs||delayMs;
    if(subscription)await admin.from('push_subscriptions').update({...(decision.disable?{enabled:false}:{}),failure_count:Math.min(99,Number(subscription.failure_count||0)+1),updated_at:new Date().toISOString()}).eq('id',subscription.id);
   }
   const {error:finishError}=await admin.from('wall_push_outbox').update({result,completed_at:result?new Date().toISOString():null,available_at:new Date(Date.now()+delayMs).toISOString()})
    .eq('message_id',claim.message_id).eq('subscription_id',claim.subscription_id).eq('claim_token',claim.claim_token);
   if(finishError)throw finishError;
  }));
  if(outcomes.some(row=>row.status==='rejected'))throw Error('Delivery completion unavailable');
  return Response.json({ok:true,checked:batch.length,delivered,failed,skipped});
 }catch(error){console.error('wall-alerts',error);return Response.json({error:'Wall delivery unavailable'},{status:500})}
});
