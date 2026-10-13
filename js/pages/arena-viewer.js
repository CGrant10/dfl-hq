import {db} from '../supabase.js';
let active=null,generation=0;
export function leave(){generation++;active?.leave?.();active=null;}
export async function render(view){
 leave();const own=generation,id=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
 const {data}=id?await db().from('arena_events').select('race_engine,bc_state,status').eq('id',id).maybeSingle():{data:null};
 const stadium=!data||data.race_engine==='stadium-v1'||data.bc_state==='idle'&&data.status!=='complete';
 if(own!==generation)return;
 let page;
 if(stadium)page=await import('./arena-stadium.js');
 else{const result=location.hash.startsWith('#/arena-results')||data.bc_state==='finished'||data.status==='complete';page=await import(result?'./arena-results.js':'./broadcast.js');if(!result)await import('../arena/mobile-broadcast-performance.js');}
 if(own!==generation)return;active=page;
 await active.render(view);
}
