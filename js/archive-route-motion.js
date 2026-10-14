let selected=null,active=null,installed=false,stopRestoring=()=>{};
const permitted=()=>document.visibilityState==='visible'&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&document.documentElement.dataset.uiMotion!=='off';
const name='dfl-archive-art';
export function mountArchiveRouteMotion(){
 if(installed)return;installed=true;
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest('a[data-archive-key]');if(!link?.closest('#home-wrap')||!link.getAttribute('href')?.startsWith('#/facts?fact='))return;
  const image=link.querySelector('img');if(!image)return;
  selected={key:link.dataset.archiveKey,home:location.hash,hash:link.getAttribute('href'),source:image,top:image.getBoundingClientRect().top,height:document.documentElement.scrollHeight||0};
 },true);
 const stop=()=>{active?.skipTransition();stopRestoring()};window.addEventListener('dfl:ui-motion-change',()=>{if(!permitted())stop()});window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
}
function targetFor(view,key){return view?.querySelector(`img[data-archive-key="${CSS.escape(key)}"],a[data-archive-key="${CSS.escape(key)}"] img`)}
async function waitForTarget(view,key){
 let target=targetFor(view,key);if(target)return target;
 return new Promise(resolve=>{const observer=new MutationObserver(()=>{target=targetFor(view,key);if(target)finish(target)}),timer=setTimeout(()=>finish(null),1800);let done=false;const finish=value=>{if(done)return;done=true;observer.disconnect();clearTimeout(timer);resolve(value)};observer.observe(view,{subtree:true,childList:true})});
}

function restoreArchiveAnchor(view,target,top,minimumHeight){
 stopRestoring();const originalHeight=view.style.minHeight;view.style.minHeight=`${minimumHeight}px`;let frame=0,stopped=false;
 const adjust=()=>{frame=0;if(stopped||!view.isConnected||!target.isConnected)return;const shift=target.getBoundingClientRect().top-top;if(Math.abs(shift)>1)window.scrollBy({top:shift,behavior:'instant'})};
 const schedule=()=>{if(!stopped&&!frame)frame=requestAnimationFrame(adjust)};
 const observer=new ResizeObserver(schedule);observer.observe(view);
 const stop=()=>{if(stopped)return;stopped=true;view.style.minHeight=originalHeight;cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();view.removeEventListener('animationend',schedule);for(const event of ['pointerdown','wheel','keydown'])window.removeEventListener(event,stop)};
 const timer=setTimeout(stop,6000);view.addEventListener('animationend',schedule);for(const event of ['pointerdown','wheel','keydown'])window.addEventListener(event,stop,{passive:true});
 target.closest('a')?.focus({preventScroll:true});adjust();stopRestoring=stop;
}

export async function renderWithArchiveMotion(render,previous,nextHash){
 const interrupted=!!active;active?.skipTransition();active=null;stopRestoring();delete document.documentElement.dataset.archiveReturning;delete document.documentElement.dataset.archiveTransition;
 const entering=selected&&nextHash===selected.hash&&previous?.dataset.route==='home',returning=selected&&nextHash===selected.home&&previous?.dataset.route==='facts';
 if(returning)document.documentElement.dataset.archiveReturning='true';
 const renderAndRestore=async()=>{await render();if(document.documentElement.dataset.archiveTransition){const current=document.getElementById('view');if(current)current.dataset.connectedEntry='true'}if(!returning||location.hash!==nextHash)return;const view=document.getElementById('view'),target=await waitForTarget(view,selected.key);if(target&&location.hash===nextHash)restoreArchiveAnchor(view,target,selected.top,selected.height)};
 const fallback=async()=>{try{return await renderAndRestore()}finally{delete document.documentElement.dataset.archiveReturning}};
 if(interrupted||!selected||!entering&&!returning||!permitted()||!document.startViewTransition)return fallback();
 const connection={...selected},source=entering?connection.source:targetFor(previous,connection.key);
 if(!source?.isConnected)return fallback();
 const box=source.getBoundingClientRect();if(box.bottom<=44||box.top>=innerHeight-48)return fallback();
 const styles=[];const mark=node=>{styles.push([node,node.style.viewTransitionName]);node.style.viewTransitionName=name};mark(source);
 let invoked=false,transition;
 const update=async()=>{invoked=true;if(location.hash!==nextHash)return;await renderAndRestore();if(location.hash!==nextHash)return;const view=document.getElementById('view');const target=await waitForTarget(view,connection.key);if(location.hash!==nextHash)return;if(target)mark(target);target?.getBoundingClientRect()};
 try{document.documentElement.dataset.archiveTransition='true';transition=document.startViewTransition(update);active=transition;transition.ready.catch(()=>{});await transition.updateCallbackDone;}
 catch(error){if(!invoked)await render();else console.warn('Archive transition unavailable',error)}
 finally{const cleanup=()=>{styles.forEach(([node,value])=>node.style.viewTransitionName=value);if(active===transition){active=null;delete document.documentElement.dataset.archiveTransition;delete document.documentElement.dataset.archiveReturning}};if(transition)transition.finished.then(cleanup,cleanup);else cleanup()}
}
