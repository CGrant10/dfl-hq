import {animateUi,cancelUiMotion} from './ui-motion.js';

const KEY='dfl.player-points.v1',TTL=30*86400000;
const points=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Math.round(Number(value)*100)/100:null;
export function viewedPointChange(before,after){
 const a=points(before),b=points(after);if(a===null||b===null)return null;
 const delta=Math.round((b-a)*100)/100;
 return delta?{delta,label:`${delta>0?'+':'−'}${Math.abs(delta)}`} :null;
}
// Per device/profile/week and scoring source. An older cached response must
// never overwrite a score the member has already seen. No network writes.
export function recordViewedPoints(storage,scope,id,value,at,now=Date.now()){
 const score=points(value);if(!scope||!id||score===null||!Number.isFinite(at)||at<=0||at>now+60000)return null;
 try{
  const parsed=JSON.parse(storage.getItem(KEY)||'{}'),data=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  for(const key of Object.keys(data))if(!data[key]||now-data[key].seenAt>TTL||now<data[key].seenAt)delete data[key];
  const group=data[scope]?.players&&typeof data[scope].players==='object'?data[scope]:{players:{},seenAt:now},previous=group.players[id];
  if(previous&&previous.at>at)return null;
  const change=previous?viewedPointChange(previous.points,score):null;
  group.players[id]={points:score,at,seenAt:now};group.seenAt=now;data[scope]=group;
  for(const key of Object.keys(data).sort((a,b)=>data[b].seenAt-data[a].seenAt).slice(6))delete data[key];
  const ids=Object.keys(group.players).sort((a,b)=>group.players[b].seenAt-group.players[a].seenAt);for(const key of ids.slice(700))delete group.players[key];
  storage.setItem(KEY,JSON.stringify(data));return change;
 }catch{return null}
}

export function mountViewedPlayerPoints(root,{getScope,active=()=>root.isConnected,getMotion=()=>true,storage=null}={}){
 let stopped=false,scope='',frame=0,writeTimer=0,pending=null;const items=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const deviceStorage=()=>{try{return storage||globalThis.localStorage}catch{return null}};
 const flush=()=>{clearTimeout(writeTimer);writeTimer=0;if(pending!==null){try{deviceStorage()?.setItem(KEY,pending)}catch{}pending=null}};
 const batchedStorage={getItem:_key=>pending??deviceStorage()?.getItem(KEY),setItem:(_key,value)=>{pending=value;if(!writeTimer)writeTimer=setTimeout(flush,150)}};
 const current=()=>!stopped&&root.isConnected&&active()&&!document.hidden;
 const sample=node=>({id:node.dataset.viewedPlayer,value:node.dataset.viewedPoints,at:Number(node.dataset.viewedScoreAt||root.dataset.pointsChecked),source:node.dataset.viewedSource||'league'});
 const visible=node=>{
  if(!current()||!node.isConnected||node.closest('[hidden],[inert],.nfl-game-preview')||document.querySelector('dialog[open]'))return false;
  const b=node.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2;
  return b.width>0&&b.height>0&&x>0&&x<innerWidth&&y>0&&y<innerHeight&&node.contains(document.elementFromPoint(x,y));
 };
 const clearGrowth=item=>{if(!item.growth)return;const {copy,number}=item.growth;item.growth=null;cancelUiMotion(copy);copy.remove();delete number.dataset.returnGrowing};
 // Only the decorative digits grow. Keep the real score, thermal glyph anchor
 // and the separate return delta in place, including while the page scrolls.
 const grow=(node,item)=>{
  const number=node.querySelector('.gd-thermal-number')||node.querySelector('b');if(!number||number.hasAttribute('data-score-rolling'))return;
  const value=number.querySelector('.gd-thermal-value')||number;
  const copy=document.createElement('span');copy.className='player-return-score-copy';copy.textContent=value.textContent;copy.setAttribute('aria-hidden','true');number.append(copy);
  const animation=animateUi(copy,[{transform:'scale(1)',offset:0,easing:'cubic-bezier(.2,.75,.25,1)'},{transform:'scale(1.18)',offset:.32,easing:'cubic-bezier(.2,.75,.25,1)'},{transform:'scale(.99)',offset:.76},{transform:'scale(1)',offset:1}],{duration:560,easing:'linear'});
  if(!animation){copy.remove();return}
  number.dataset.returnGrowing='';const growth={copy,number};item.growth=growth;
  void animation.finished.catch(()=>{}).then(()=>{if(item.growth===growth)clearGrowth(item)});
 };
 const clearBadge=item=>{clearGrowth(item);clearTimeout(item.fade);item.animation?.cancel();item.animation=null;item.badge?.remove();item.badge=null};
 const reset=item=>{clearTimeout(item.timer);item.timer=null;item.engaged=false;clearBadge(item)};
 const acknowledge=(node,item,show)=>{
  if(!visible(node))return;
  const s=sample(node),key=`${scope}:${s.source}:${s.id}:${s.value}:${s.at}`;if(key===item.sample)return;
  clearGrowth(item);item.sample=key;if(!deviceStorage())return;
  const change=recordViewedPoints(batchedStorage,`${scope}:${s.source}`,s.id,s.value,s.at);if(!show||!change)return;
  clearBadge(item);
  const motion=getMotion()&&!reduced.matches&&document.documentElement.dataset.uiMotion!=='off';
  if(motion&&change.delta>0)grow(node,item);
  const badge=document.createElement('span');badge.className=`player-return-delta${change.delta<0?' is-negative':''}`;badge.textContent=change.label;
  badge.setAttribute('role','img');badge.setAttribute('aria-label',`${change.delta>0?'Up':'Down'} ${Math.abs(change.delta)} fantasy points since you last viewed this player`);(node.querySelector(':scope > small')||node.querySelector('b')||node).append(badge);item.badge=badge;
  if(motion&&badge.animate){item.animation=badge.animate([{opacity:0,transform:'translateY(2px)',offset:0},{opacity:1,transform:'none',offset:.08},{opacity:1,transform:'none',offset:.7},{opacity:0,transform:'translateY(-3px)',offset:1}],{duration:3600,easing:'ease-out',fill:'both'});item.animation.onfinish=()=>clearBadge(item)}
  item.fade=setTimeout(()=>clearBadge(item),3700);
 };
 const eligible=node=>{const s=sample(node);if(!s.id||points(s.value)===null||!Number.isFinite(s.at)||s.at<=0)return false;try{const saved=JSON.parse(batchedStorage.getItem(KEY)||'{}');if(saved?.[`${scope}:${s.source}`]?.players?.[s.id]?.at>s.at)return false}catch{}return true};
 const queue=(node,item)=>{if(item.timer||item.engaged||!visible(node))return;item.timer=setTimeout(()=>{item.timer=null;if(!visible(node)||!eligible(node))return;item.engaged=true;acknowledge(node,item,true)},650)};
 const observer=new IntersectionObserver(entries=>{for(const e of entries){const item=items.get(e.target);if(!item)continue;item.intersecting=e.isIntersecting&&e.intersectionRatio>=.5;if(item.intersecting)queue(e.target,item);else reset(item)}},{threshold:[0,.5,1]});
 const refresh=()=>{
  if(stopped)return;const next=String(getScope()||'');if(scope!==next){for(const item of items.values())reset(item);scope=next;for(const item of items.values())item.sample=''}
  const nodes=new Set(root.querySelectorAll('[data-viewed-player]'));
  for(const [node,item]of items)if(!nodes.has(node)){reset(item);observer.unobserve(node);items.delete(node)}
  for(const node of nodes){let item=items.get(node);if(!item){item={intersecting:false,engaged:false,sample:'',timer:null,badge:null,animation:null,fade:null};items.set(node,item);observer.observe(node)}
   if(!visible(node)){reset(item);continue}
   if(item.engaged){acknowledge(node,item,false);if(item.badge&&!item.badge.isConnected){clearBadge(item)}}else if(item.intersecting)queue(node,item);
  }
 };
 const schedule=()=>{if(!frame&&!stopped)frame=requestAnimationFrame(()=>{frame=0;refresh()})};
 const suspend=()=>{flush();for(const item of items.values())reset(item);if(!document.hidden)schedule()};
 const motion=()=>{if(stopped)return;if(reduced.matches||!getMotion()||document.documentElement.dataset.uiMotion==='off')for(const item of items.values()){clearGrowth(item);item.animation?.cancel();item.animation=null}};
 const clickMotion=event=>{if(event.target.closest('[data-clubhouse-motion]'))queueMicrotask(motion)};
 const modal=new MutationObserver(schedule);modal.observe(document.body,{attributes:true,attributeFilter:['open'],subtree:true});
 root.addEventListener('click',clickMotion);root.addEventListener('dfl:clubhouse-context',schedule);root.addEventListener('dfl:clubhouse-tab',schedule);root.addEventListener('dfl:player-points-painted',schedule);document.addEventListener('visibilitychange',suspend);window.addEventListener('pageshow',schedule);window.addEventListener('pagehide',suspend);window.addEventListener('dfl:ui-motion-change',motion);reduced.addEventListener('change',motion);
 refresh();
 return {refresh,stop(){stopped=true;flush();cancelAnimationFrame(frame);observer.disconnect();modal.disconnect();for(const item of items.values())reset(item);items.clear();root.removeEventListener('click',clickMotion);root.removeEventListener('dfl:clubhouse-context',schedule);root.removeEventListener('dfl:clubhouse-tab',schedule);root.removeEventListener('dfl:player-points-painted',schedule);document.removeEventListener('visibilitychange',suspend);window.removeEventListener('pageshow',schedule);window.removeEventListener('pagehide',suspend);window.removeEventListener('dfl:ui-motion-change',motion);reduced.removeEventListener('change',motion)}};
}
