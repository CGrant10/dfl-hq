import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {MATCHUP_MOMENTS_CATEGORY,MATCHUP_MOMENTS_FILTER} from '../../../js/matchup-moments.js';

Deno.test('real notification SDK serializes category opt-in as a JSONB array',async()=>{
 let requestURL='';
 const client=createClient('https://sdk-validation.example','public-test-key',{
  auth:{persistSession:false,autoRefreshToken:false},
  global:{fetch:async input=>{
   requestURL=input instanceof Request?input.url:String(input);
   return new Response('[]',{headers:{'Content-Type':'application/json'}});
  }},
 });
 const result=await client.from('push_subscriptions').select('member_id').eq('enabled',true).contains('categories',MATCHUP_MOMENTS_FILTER);
 if(result.error)throw result.error;
 const filter=new URL(requestURL).searchParams.get('categories');
 if(!filter?.startsWith('cs.'))throw Error('Missing containment filter');
 const value=JSON.parse(filter.slice(3));
 if(!Array.isArray(value)||value.length!==1||value[0]!==MATCHUP_MOMENTS_CATEGORY)throw Error('Opt-in must filter a JSONB category array');
});
