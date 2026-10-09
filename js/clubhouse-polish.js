// Finite presentation effects; never animate score geometry or delay selection.
export function mountClubhousePolish(root,{getMotion=()=>true,active=()=>root.isConnected}={}) {
 const tabs=root.querySelector('.clubhouse-tabs'),animations=new Set();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let stopped=false,frame=null,waiting=null,waitTimer=null,selection=null;
 const current=()=>!stopped&&root.isConnected&&active();
 const canPlay=()=>current()&&getMotion()&&!reduced.matches&&document.visibilityState==='visible';
 const visible=node=>{
  if(!node||node.closest('[hidden]')||!node.getClientRects().length)return false;
  const box=node.getBoundingClientRect();
  return box.bottom>44&&box.top<innerHeight-48&&box.right>0&&box.left<innerWidth;
 };
 const play=(node,frames,options={})=>{
  if(!node?.animate||!canPlay())return;
  const animation=node.animate(frames,{duration:240,easing:'cubic-bezier(.2,.75,.25,1)',...options});
  animations.add(animation);
  animation.onfinish=()=>{animations.delete(animation);animation.cancel()};
 };
 const stopWaiting=()=>{waiting?.disconnect();waiting=null;clearTimeout(waitTimer);waitTimer=null};
 const stopTransient=()=>{
  stopWaiting();for(const animation of animations){animation.onfinish=null;animation.cancel()}animations.clear();
 };
 const indicator=tabs?document.createElement('span'):null;
 if(indicator){indicator.className='clubhouse-tab-indicator';indicator.setAttribute('aria-hidden','true');tabs.append(indicator);tabs.dataset.clubhousePolished='1'}
 const syncTabs=(animate=false)=>{
  if(!current()||!indicator)return;
  const button=tabs.querySelector('[aria-selected="true"]');if(!button)return;
  const before=indicator.getBoundingClientRect(),bar=tabs.getBoundingClientRect(),after=button.getBoundingClientRect();
  if(!after.width){indicator.hidden=true;return}
  const previous=selection;selection=button.dataset.clubhouseTab;
  // FLIP only the decorative marker. Native tab focus and panels change immediately.
  for(const animation of animations)if(animation.effect?.target===indicator){animation.onfinish=null;animation.cancel();animations.delete(animation)}
  indicator.hidden=false;indicator.style.width=`${after.width}px`;indicator.style.left=`${after.left-bar.left+tabs.scrollLeft}px`;
  if(animate&&previous&&previous!==selection){
   play(indicator,[{transform:`translateX(${before.left-after.left}px) scaleX(${before.width/after.width})`},{transform:'translateX(0) scaleX(1)'}],{duration:280});
   const panel=root.querySelector('#'+button.getAttribute('aria-controls'));
   const heading=panel?.querySelector('.clubhouse-pulse-heading,.clubhouse-heading');
   if(visible(heading))play(heading,[{opacity:.45},{opacity:1}],{duration:220});
  }
 };
 const scheduleTabs=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=null;syncTabs(false)})};
 const tabObserver=new MutationObserver(()=>syncTabs(true));
 if(tabs)tabObserver.observe(tabs,{subtree:true,attributes:true,attributeFilter:['aria-selected']});
 const resize=new ResizeObserver(scheduleTabs);if(tabs)resize.observe(tabs);
 const enter=card=>{
  stopTransient();if(!canPlay())return;
  const faceoff=card?.querySelector('.clubhouse-game-teams');if(!faceoff)return;
  const reveal=()=>{
   stopWaiting();if(!canPlay()||card.closest('[hidden]')||!visible(faceoff))return;
   play(faceoff,[{opacity:.55},{opacity:1}],{duration:300});
   for(const [index,mark] of [...card.querySelectorAll('.clubhouse-game-side > .clubhouse-team-mark')].entries()){
    play(mark,[{opacity:.5,transform:`translateX(${index?6:-6}px) scale(.96)`},{opacity:1,transform:'translateX(0) scale(1)'}],{duration:520,delay:index*55});
   }
   const light=faceoff.querySelector('.clubhouse-stage-light');
   play(light,[{opacity:0,transform:'translateX(-130%)'},{opacity:.5,offset:.28},{opacity:0,transform:'translateX(130%)'}],{duration:850,easing:'ease-out'});
  };
  if(visible(faceoff))reveal();
  else {
   // Let the native scroll reach the matchup before its brief entrance plays.
   waiting=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))reveal()},{threshold:.15});
   waiting.observe(faceoff);waitTimer=setTimeout(stopWaiting,1100);
  }
 };
 const toggle=event=>{
  const details=event.target;
  if(!details.matches?.('.clubhouse-position-stats,.gd-compare-bench')||!details.open||!visible(details))return;
  const content=details.querySelector(':scope > table,:scope > ul');
  play(content,[{opacity:.4},{opacity:1}],{duration:180});
 };
 const motionChanged=()=>{if(!canPlay())stopTransient();syncTabs(false)};
 const onVisibility=()=>{if(document.visibilityState!=='visible')stopTransient()};
 root.addEventListener('toggle',toggle,true);reduced.addEventListener('change',motionChanged);document.addEventListener('visibilitychange',onVisibility);
 syncTabs(false);scheduleTabs();
 return {
  enter,stopTransient,motionChanged,
  stop(){if(stopped)return;stopped=true;stopTransient();cancelAnimationFrame(frame);tabObserver.disconnect();resize.disconnect();root.removeEventListener('toggle',toggle,true);reduced.removeEventListener('change',motionChanged);document.removeEventListener('visibilitychange',onVisibility);indicator?.remove();if(tabs)delete tabs.dataset.clubhousePolished},
 };
}
