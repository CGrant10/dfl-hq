let installed=false,selected=null,active=null,stopRestoring=()=>{},sequence=0;
const allowed=()=>document.visibilityState==='visible'&&document.documentElement.dataset.uiMotion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
const visible=node=>{const r=node?.getBoundingClientRect();return r&&r.width>0&&r.height>0&&r.bottom>44&&r.top<innerHeight-48};
const receipt=view=>view?.querySelector('[data-route-focus] > .td-receipt-summary');
const sourceFor=(view,connection)=>[...view?.querySelectorAll('a[href]')||[]].find(link=>link.getAttribute('href')===connection.hash&&(!connection.kind||link.classList.contains(connection.kind)));

export function mountTradeReceiptMotion(){
 if(installed)return;installed=true;
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest('a[href^="#/trade?tx="]');
  if(!link||!visible(link))return;
  const view=document.getElementById('view'),kind=['home-trade-item','breaking-trade-copy','breaking-trade-dock-copy'].find(name=>link.classList.contains(name));
  // The fixed alert has no place in a page's saved scroll position. It can
  // connect on entry; Back still uses the router's normal visit memory.
  selected={hash:link.getAttribute('href'),from:location.hash,visit:history.state?.dflRouteVisit?.id,
   source:link,kind,inPage:!!kind&&!!view?.contains(link),top:link.getBoundingClientRect().top,y:scrollY,at:performance.now()};
 },true);
 const cancel=()=>{active?.skipTransition();stopRestoring()};
 window.addEventListener('resize',cancel);window.addEventListener('pagehide',cancel);
 window.addEventListener('dfl:ui-motion-change',()=>{if(!allowed())cancel()});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');reduced.addEventListener('change',()=>{if(reduced.matches)cancel()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel()});
}

async function findAfterRender(view,find,hash){
 const target=find(view);if(target)return target;if(view?.querySelector('[role="alert"],.state.is-error'))return null;
 return new Promise(resolve=>{
  let done=false;const finish=value=>{if(done)return;done=true;observer.disconnect();clearTimeout(timer);resolve(value)};
  const observer=new MutationObserver(()=>{if(location.hash!==hash)finish(null);else{const node=find(view);if(node)finish(node)}});
  const timer=setTimeout(()=>finish(null),900);observer.observe(view,{childList:true,subtree:true});
 });
}

function restoreSource(view,target,connection){
 stopRestoring();let frame=0,stopped=false;const minHeight=view.style.minHeight;
 view.style.minHeight=`${Math.max(view.offsetHeight,connection.y+innerHeight-view.offsetTop)}px`;
 const adjust=()=>{frame=0;if(stopped||!target.isConnected)return;const delta=target.getBoundingClientRect().top-connection.top;if(Math.abs(delta)>1)scrollBy({top:delta,behavior:'instant'})};
 const schedule=()=>{if(!stopped&&!frame)frame=requestAnimationFrame(adjust)};
 const observer=new ResizeObserver(schedule);observer.observe(view);
 const stop=()=>{if(stopped)return;stopped=true;cancelAnimationFrame(frame);clearTimeout(timer);observer.disconnect();view.style.minHeight=minHeight;for(const type of ['pointerdown','wheel','keydown'])window.removeEventListener(type,stop)};
 const timer=setTimeout(stop,6000);for(const type of ['pointerdown','wheel','keydown'])window.addEventListener(type,stop,{passive:true});
 target.focus({preventScroll:true});adjust();stopRestoring=stop;
}

// A receipt belongs to the card that opened it. Only that surface morphs;
// navigation, live scores and the rest of the page remain still.
export async function renderWithTradeReceiptMotion(render,previous,nextHash,{back=false,visitId}={}){
 const interrupted=!!active,token=++sequence;active?.skipTransition();active=null;stopRestoring();
 delete document.documentElement.dataset.receiptTransition;delete document.documentElement.dataset.receiptReturning;
 const connection=selected,entering=connection&&nextHash===connection.hash&&connection.from!==nextHash&&performance.now()-connection.at<1800,
  returning=back&&connection?.inPage&&nextHash===connection.from&&(!connection.visit||connection.visit===visitId)&&previous?.querySelector('[data-route-focus].td-alert-receipt');
 if(!entering&&!returning)return render();
 if(returning)document.documentElement.dataset.receiptReturning='true';
 const update=async()=>{
  await render();if(token!==sequence||location.hash!==nextHash)return null;
  const view=document.getElementById('view');
  const target=await findAfterRender(view,returning?v=>sourceFor(v,connection):receipt,nextHash);
  if(token!==sequence||location.hash!==nextHash)return null;
  if(returning&&target)restoreSource(view,target,connection);
  if(document.documentElement.dataset.receiptTransition)view.dataset.connectedEntry='true';
  return target;
 };
 const source=entering?connection.source:receipt(previous);
 if(interrupted||!allowed()||!document.startViewTransition||!source?.isConnected||!visible(source)){
  try{return await update()}finally{if(entering)connection.source=null;if(token===sequence)delete document.documentElement.dataset.receiptReturning}
 }
 const styles=[];const mark=node=>{styles.push([node,node.style.viewTransitionName]);node.style.viewTransitionName='dfl-trade-receipt'};
 mark(source);let transition,invoked=false;
 try{
  document.documentElement.dataset.receiptTransition='true';
  transition=document.startViewTransition(async()=>{invoked=true;if(location.hash!==nextHash)return;const target=await update();if(target&&token===sequence&&location.hash===nextHash){mark(target);target.getBoundingClientRect()}else transition?.skipTransition()});
  active=transition;transition.ready.catch(()=>{});await transition.updateCallbackDone;
 }catch(error){if(!invoked)await update();else console.warn('Receipt transition unavailable',error)}
 finally{
  const cleanup=()=>{if(entering)connection.source=null;for(const[node,value]of styles)node.style.viewTransitionName=value;if(token===sequence){active=null;delete document.documentElement.dataset.receiptTransition;delete document.documentElement.dataset.receiptReturning}};
  if(transition)transition.finished.then(cleanup,cleanup);else cleanup();
 }
}
