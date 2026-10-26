import {loadPlayerWeekDetails} from './player-week-detail-data.js';
import {indexPlayerWeeks,playerWeekDetail,playerWeekDetailHtml} from './player-week-detail-model.js';

// Patch only the two small stat labels; never rebuild a player row or score.
export function mountPlayerWeekDetails(root,{getModel,active=()=>root.isConnected,load=loadPlayerWeekDetails,onState=(_state)=>{}}={}) {
 let stopped=false,scope='',weeks=[],checkedAt=0,request=0,busy=false,queuedForce=false;
 let nearby=typeof IntersectionObserver==='undefined';
 const current=()=>!stopped&&root.isConnected&&active();
 const visibleRows=()=>[...root.querySelectorAll('[data-player-week-detail]')].filter(node=>node.getClientRects().length&&!node.closest('[hidden]')&&node.closest('dialog')===root.closest('dialog'));
 const paint=()=>{
  const model=getModel();if(!current()||!model)return;
  const players=new Map([...(model.starters||[]),...model.games.flatMap(g=>g.sides.flatMap(t=>[...t.lineup,...t.bench]))].map(p=>[`${p.roster}:${p.id}`,p]));
  for(const node of visibleRows()){
   const player=players.get(node.dataset.playerWeekDetail);if(!player)continue;
   const result=playerWeekDetail(player,weeks,model),template=document.createElement('template');template.innerHTML=playerWeekDetailHtml(player,result);
   for(const selector of ['.gd-player-week-line','.gd-player-week-average']){
    const target=node.querySelector(selector),next=template.content.querySelector(selector);if(!target||!next)continue;
    if(target.textContent!==next.textContent)target.textContent=next.textContent;
    if(next.hasAttribute('aria-label'))target.setAttribute('aria-label',next.getAttribute('aria-label'));
   }
  }
 };
 const update=async({force=false}={})=>{
  const model=getModel();if(!current()||!model)return;
  const key=`${model.season}:${model.week}`;
  if(scope!==key){scope=key;weeks=[];checkedAt=0;request++;busy=false;queuedForce=false}
  paint();if(busy){queuedForce ||= force;return}
  if(!nearby&&!force||!visibleRows().length||!force&&Date.now()-checkedAt<60000)return;
  busy=true;const token=++request;
  try{
   const result=await load(model.season,model.week,{force});
   if(!current()||token!==request||scope!==key)return;
   const failed=result.some(bundle=>bundle.error);
   weeks=indexPlayerWeeks((result.length?result:[{week:model.week,data:[],error:true}]).map(bundle=>{
    const prior=weeks.find(saved=>Number(saved.week)===Number(bundle.week));
    return bundle.error&&prior?.data?.length?{...prior,stale:true,error:false}:bundle;
   }),model);
   checkedAt=Date.now();paint();onState({failed,stale:weeks.some(b=>b.stale),available:weeks.some(b=>b.data?.length)});
  }catch{if(current()&&token===request){weeks=weeks.length?weeks.map(bundle=>({...bundle,stale:true})):indexPlayerWeeks([{week:model.week,error:true,data:[]}],model);checkedAt=Date.now();paint();onState({failed:true,stale:true,available:weeks.some(b=>b.data?.length)})}}
  finally{if(token===request){busy=false;if(queuedForce){queuedForce=false;void update({force:true})}}}
 };
 const opened=event=>{if(event.target.open)void update()},returned=()=>{if(document.visibilityState==='visible')void update()};
 const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{nearby=entries.some(entry=>entry.isIntersecting);if(nearby)void update()},{rootMargin:'200px 0px'});observer?.observe(root);
 root.addEventListener('toggle',opened,true);document.addEventListener('visibilitychange',returned);
 return {update,stop(){stopped=true;request++;observer?.disconnect();root.removeEventListener('toggle',opened,true);document.removeEventListener('visibilitychange',returned)}};
}
