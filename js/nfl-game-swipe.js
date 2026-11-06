import {mountHorizontalSwipe} from './horizontal-swipe.js';
import {animateUi,cancelUiMotion} from './ui-motion.js';
import {tabGlideOffset,tabGlideStep} from './swipe-tabs.js';
const translate=x=>`translateX(${x}px)`;

// One live stage and one inert neighbor. No hidden game pollers, resize loop,
// per-pointer DOM measurement, or interactive copies of the live feed.
export function mountNflGameSwipe(root,{active=()=>true,getGames,getSelected,preview,getPreviewKey=(_id)=>'',select,onSettled=()=>{}}){
 let scene=null,frame=0,stopped=false,suppress=false,committing=false,origin=0,idle=0;const previews=new Map();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const canMove=()=>!reduced.matches&&document.documentElement.dataset.uiMotion!=='off';
 const cancelWarm=()=>{if(!idle)return;if(window.requestIdleCallback)window.cancelIdleCallback(idle);else clearTimeout(idle);idle=0};
 const visualAttributes=new Set(['aria-pressed','data-play-kind','data-play-team','data-play-voided','data-nfl-field-selected','data-nfl-your-player','data-field-kind']);
 const prepared=id=>{
  const key=getPreviewKey(id),cached=previews.get(id);if(cached?.key===key)return cached.node;
  const template=document.createElement('template');template.innerHTML=preview(id);const node=template.content.querySelector('[data-nfl-game-stage]');if(!node)return null;
  for(const el of [node,...node.querySelectorAll('*')])for(const attr of [...el.attributes])if(attr.name==='id'||(attr.name.startsWith('data-')||attr.name.startsWith('aria-'))&&!visualAttributes.has(attr.name))el.removeAttribute(attr.name);
  node.inert=true;node.setAttribute('aria-hidden','true');node.classList.add('nfl-game-preview');previews.set(id,{key,node});return node;
 };
 const update=()=>{
  if(idle||stopped||scene||!active()||!canMove())return;
  const work=()=>{idle=0;if(stopped||scene||!active())return;const games=getGames(),i=games.findIndex(g=>g.id===getSelected()),ids=[games[i-1]?.id,games[i+1]?.id].filter(Boolean);for(const id of previews.keys())if(!ids.includes(id))previews.delete(id);for(const id of ids)prepared(id)};
  idle=window.requestIdleCallback?window.requestIdleCallback(work,{timeout:300}):setTimeout(work,32);
 };
 const clean=()=>{
  cancelAnimationFrame(frame);frame=0;
  if(!scene)return;
  const old=scene;scene=null;cancelUiMotion(old.stage);cancelUiMotion(old.copy);
  old.stage.style.removeProperty('transform');old.copy?.remove();
  delete old.host.dataset.nflDragging;
 };
 const finish=()=>{clean();onSettled();update()};
 const neighbor=dx=>{const games=getGames(),i=games.findIndex(g=>g.id===getSelected());return games[i+(dx<0?1:-1)]};
 const paint=()=>{
  frame=0;if(!scene)return;
  scene.stage.style.transform=translate(scene.offset);
  if(scene.copy)scene.copy.style.transform=translate(scene.offset+(scene.offset<0?scene.width:-scene.width));
  scene.painted=scene.offset;
 };
 const swipe=mountHorizontalSwipe(root,{
  min:56,flickVelocity:.55,
  exclude:'a,button:not(.nfl-play-select),input,select,textarea,summary,[contenteditable],[data-no-game-swipe]',
  accepts:target=>active()&&!!target.closest('.nfl-game-window')&&getGames().length>1,
  onStart(){
   cancelWarm();suppress=false;origin=scene?.stage.isConnected?new DOMMatrixReadOnly(getComputedStyle(scene.stage).transform).m41:0;
   if(scene){cancelAnimationFrame(frame);frame=0;cancelUiMotion(scene.stage);cancelUiMotion(scene.copy);scene.offset=origin;paint();}
  },
  onMove({dx}){
   suppress=true;if(!canMove())return;
   if(!scene){
    const stage=root.querySelector('[data-nfl-game-stage]'),host=stage?.parentElement;if(!host)return;
    const rect=stage.getBoundingClientRect();
    scene={stage,host,width:rect.width,top:Math.max(0,Math.min(innerHeight,root.querySelector('.nfl-center-tools').getBoundingClientRect().bottom)-rect.top),offset:0,painted:0,copy:null,id:''};host.dataset.nflDragging='';
   }
   const distance=origin+dx,game=neighbor(distance);
   if(scene.id!==game?.id){scene.copy?.remove();scene.copy=null;scene.id=game?.id;
    if(game){const copy=prepared(game.id);if(copy){copy.style.top=`${scene.top}px`;scene.host.append(copy);scene.copy=copy;}}
   }
   scene.offset=tabGlideOffset(distance,scene.width,!!game);
   if(!frame)frame=requestAnimationFrame(paint);
  },
  onEnd({dx,valid}){
   if(stopped)return;
   if(!scene){if(valid){const game=neighbor(dx);if(game){committing=true;try{select(game.id)}finally{committing=false}}}onSettled();update();return;}
   cancelAnimationFrame(frame);frame=0;paint();
   const old=scene,step=valid?tabGlideStep(scene.painted,dx,origin):0,game=step?neighbor(step>0?-1:1):null,from=scene.painted;
   if(game){
    // Keep the live outgoing stage in place until the inert neighbor arrives.
    // Interrupting this settle resumes at its rendered position, not at zero.
    const end=step>0?-old.width:old.width;old.stage.style.transform=translate(end);
    const animation=animateUi(old.stage,[{transform:translate(from)},{transform:translate(end)}],{duration:Math.round(110+150*Math.abs(end-from)/old.width),easing:'cubic-bezier(.2,.7,.25,1)',fill:'both'});
    if(old.copy){old.copy.style.transform='none';animateUi(old.copy,[{transform:translate(from+(step>0?old.width:-old.width))},{transform:'none'}],{duration:Math.round(110+150*Math.abs(end-from)/old.width),easing:'cubic-bezier(.2,.7,.25,1)',fill:'both'});}
    const complete=()=>{if(scene!==old)return;clean();committing=true;try{select(game.id)}finally{committing=false}onSettled();update()};
    if(animation)animation.finished.then(complete,()=>{});else complete();
   }else{
    const animation=animateUi(old.stage,[{transform:translate(from)},{transform:'none'}],{duration:Math.round(130+100*Math.abs(from)/old.width)});
    if(old.copy)animateUi(old.copy,[{transform:translate(from+(from<0?old.width:-old.width))},{transform:translate(from<0?old.width:-old.width)}],{duration:Math.round(130+100*Math.abs(from)/old.width)});
    if(animation)animation.finished.then(()=>{if(scene===old)finish()},()=>{});else finish();
   }
  }
 });
 const interrupt=()=>{cancelWarm();swipe.cancel();finish()};
 const click=event=>{if(suppress&&event.target.closest('.nfl-play-select')){event.preventDefault();event.stopImmediatePropagation();suppress=false;return;}if(!committing&&scene&&event.target.closest('button,select'))interrupt()};
 const events=[['resize',window],['pagehide',window],['dfl:ui-motion-change',window],['visibilitychange',document]];
 root.addEventListener('click',click,true);for(const [event,target]of events)target.addEventListener(event,interrupt);reduced.addEventListener('change',interrupt);
 return {update,get busy(){return !!scene||swipe.tracking},cancel:interrupt,stop(){stopped=true;cancelWarm();swipe.stop();clean();previews.clear();root.removeEventListener('click',click,true);for(const [event,target]of events)target.removeEventListener(event,interrupt);reduced.removeEventListener('change',interrupt)}};
}
