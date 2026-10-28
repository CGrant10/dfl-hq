// Native details semantics with finite, reversible height motion. No scroll loop.
export function mountDisclosureMotion(root,{selector,getMotion=()=>true,active=()=>root.isConnected}={}) {
 const moving=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');let stopped=false;
 const current=()=>!stopped&&root.isConnected&&active();
 const allowed=node=>current()&&getMotion()&&!reduced.matches&&!document.hidden
  &&document.documentElement.dataset.uiMotion!=='off'&&!node.closest('[data-motion="off"],[hidden],[inert]');
 const release=state=>{
  state.observer?.disconnect();cancelAnimationFrame(state.frame);state.animation.onfinish=null;state.animation.cancel();moving.delete(state.node);
 };
 const finish=(state,open=state.open)=>{release(state);state.node.open=open};
 const settle=()=>{for(const state of [...moving.values()])finish(state)};
 const collapsed=node=>{
  const summary=node.querySelector(':scope>summary'),style=getComputedStyle(node),s=getComputedStyle(summary);
  return summary.getBoundingClientRect().height+['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((n,key)=>n+(parseFloat(style[key])||0),0)+(parseFloat(s.marginTop)||0)+(parseFloat(s.marginBottom)||0);
 };
 function move(node,open,deadline=performance.now()+260) {
  const start=node.getBoundingClientRect().height,old=moving.get(node);
  if(old)release(old);
  if(open)node.open=true;
  const end=open?node.getBoundingClientRect().height:collapsed(node);
  if(!allowed(node)||!node.animate||Math.abs(start-end)<1){node.open=open;return}
  const animation=node.animate([{height:`${start}px`,overflow:'clip'},{height:`${end}px`,overflow:'clip'}],{
   duration:Math.max(100,deadline-performance.now()),easing:'cubic-bezier(.22,.75,.25,1)',fill:'both',
  });
  const state={node,open,animation,observer:null,frame:0};moving.set(node,state);
  animation.onfinish=()=>{if(moving.get(node)===state)finish(state)};
  // Lazy receipts and score updates may change content during an opening.
  // Measure again only when content changes, and keep the original deadline.
  state.observer=new MutationObserver(()=>{
   if(moving.get(node)!==state||state.frame)return;
   if(!node.open){finish(state,false);return}
   if(open)state.frame=requestAnimationFrame(()=>{state.frame=0;if(moving.get(node)===state)move(node,open,deadline)});
  });
  state.observer.observe(node,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','open']});
 }
 const click=event=>{
  if(!current()||event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return;
  const summary=event.target.closest?.('summary'),node=summary?.parentElement;
  if(!node?.matches(selector)||summary!==node.querySelector(':scope>summary')||!root.contains(node))return;
  if(event.target.closest('a,button,input,select,textarea'))return;
  event.preventDefault();move(node,!(moving.get(node)?.open??node.open));
 };
 const motionChanged=()=>{for(const state of [...moving.values()])if(!allowed(state.node))finish(state)};
 root.addEventListener('click',click);reduced.addEventListener('change',motionChanged);
 root.addEventListener('dfl:clubhouse-tab',motionChanged);
 document.addEventListener('visibilitychange',motionChanged);window.addEventListener('dfl:ui-motion-change',motionChanged);window.addEventListener('resize',settle);
 return {motionChanged,stop(){if(stopped)return;stopped=true;settle();root.removeEventListener('click',click);root.removeEventListener('dfl:clubhouse-tab',motionChanged);reduced.removeEventListener('change',motionChanged);document.removeEventListener('visibilitychange',motionChanged);window.removeEventListener('dfl:ui-motion-change',motionChanged);window.removeEventListener('resize',settle)}};
}
