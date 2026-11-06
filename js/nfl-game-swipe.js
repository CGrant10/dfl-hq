import {mountHorizontalSwipe} from './horizontal-swipe.js';
import {animateUi,cancelUiMotion} from './ui-motion.js';
import {tabGlideOffset,tabGlideStep} from './swipe-tabs.js';
const translate=x=>`translateX(${x}px)`;

// One live stage and one inert neighbor. No hidden game pollers, resize loop,
// per-pointer DOM measurement, or interactive copies of the live feed.
export function mountNflGameSwipe(root,{active=()=>true,getGames,getSelected,preview,select,onSettled=()=>{}}){
 let scene=null,frame=0,stopped=false,suppress=false,committing=false,origin=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const canMove=()=>!reduced.matches&&document.documentElement.dataset.uiMotion!=='off';
 const clean=()=>{
  cancelAnimationFrame(frame);frame=0;
  if(!scene)return;
  const old=scene;scene=null;cancelUiMotion(old.stage);cancelUiMotion(old.copy);
  old.stage.style.removeProperty('transform');old.copy?.remove();
  delete old.host.dataset.nflDragging;
 };
 const finish=()=>{clean();onSettled()};
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
   suppress=false;origin=scene?.stage.isConnected?new DOMMatrixReadOnly(getComputedStyle(scene.stage).transform).m41:0;
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
    if(game){const template=document.createElement('template');template.innerHTML=preview(game.id);const copy=template.content.querySelector('[data-nfl-game-stage]');if(copy){
     for(const el of [copy,...copy.querySelectorAll('*')])for(const attr of [...el.attributes])if(attr.name==='id'||attr.name.startsWith('data-')||attr.name.startsWith('aria-'))el.removeAttribute(attr.name);
     copy.inert=true;copy.setAttribute('aria-hidden','true');copy.classList.add('nfl-game-preview');copy.style.top=`${scene.top}px`;scene.host.append(copy);scene.copy=copy;
    }}
   }
   scene.offset=tabGlideOffset(distance,scene.width,!!game);
   if(!frame)frame=requestAnimationFrame(paint);
  },
  onEnd({dx,valid}){
   if(stopped)return;
   if(!scene){if(valid){const game=neighbor(dx);if(game){committing=true;try{select(game.id)}finally{committing=false}}}onSettled();return;}
   cancelAnimationFrame(frame);frame=0;paint();
   const old=scene,step=valid?tabGlideStep(scene.painted,dx,origin):0,game=step?neighbor(step>0?-1:1):null,from=scene.painted;
   if(game){
    // Keep the live outgoing stage in place until the inert neighbor arrives.
    // Interrupting this settle resumes at its rendered position, not at zero.
    const end=step>0?-old.width:old.width;old.stage.style.transform=translate(end);
    const animation=animateUi(old.stage,[{transform:translate(from)},{transform:translate(end)}],{duration:250,fill:'both'});
    if(old.copy){old.copy.style.transform='none';animateUi(old.copy,[{transform:translate(from+(step>0?old.width:-old.width))},{transform:'none'}],{duration:250,fill:'both'});}
    const complete=()=>{if(scene!==old)return;clean();committing=true;try{select(game.id)}finally{committing=false}onSettled()};
    if(animation)animation.finished.then(complete,()=>{});else complete();
   }else{
    const animation=animateUi(old.stage,[{transform:translate(from)},{transform:'none'}],{duration:200});
    if(old.copy)animateUi(old.copy,[{transform:translate(from+(from<0?old.width:-old.width))},{transform:translate(from<0?old.width:-old.width)}],{duration:200});
    if(animation)animation.finished.then(()=>{if(scene===old)finish()},()=>{});else finish();
   }
  }
 });
 const interrupt=()=>{swipe.cancel();finish()};
 const click=event=>{if(suppress&&event.target.closest('.nfl-play-select')){event.preventDefault();event.stopImmediatePropagation();suppress=false;return;}if(!committing&&scene&&event.target.closest('button,select'))interrupt()};
 const events=[['resize',window],['pagehide',window],['dfl:ui-motion-change',window],['visibilitychange',document]];
 root.addEventListener('click',click,true);for(const [event,target]of events)target.addEventListener(event,interrupt);reduced.addEventListener('change',interrupt);
 return {get busy(){return !!scene||swipe.tracking},cancel:interrupt,stop(){stopped=true;swipe.stop();clean();root.removeEventListener('click',click,true);for(const [event,target]of events)target.removeEventListener(event,interrupt);reduced.removeEventListener('change',interrupt)}};
}
