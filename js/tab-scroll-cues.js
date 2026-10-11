const strips='#hist-tabs,#year-picker,.ta-jump,.tabs.tabscroll,.home-week-tabs,.home-position-tabs,.sb-tabs,.sb-product-tabs,.td-entry-actions,.page-activity-tabs';
export function mountTabScrollCues(root) {
  let frame=0,stopped=false;
  const states=new Map(),originalPosition=root.style.position;
  if(getComputedStyle(root).position==='static')root.style.position='relative';
  const schedule=()=>{if(!stopped&&!frame)frame=requestAnimationFrame(sync);};
  const resize=new ResizeObserver(schedule);resize.observe(root);
  function sync(){
    frame=0;if(stopped||!root.isConnected)return;
    const bars=new Set(root.querySelectorAll(strips)),bounds=root.getBoundingClientRect();
    for(const [bar,state]of states)if(!bars.has(bar)){resize.unobserve(bar);state.start.remove();state.end.remove();states.delete(bar);}
    for(const bar of bars){
      let state=states.get(bar);
      if(!state){
        state={};
        for(const side of ['start','end']){
          const cue=document.createElement('span');cue.className='dfl-scroll-cue';cue.dataset.side=side;cue.setAttribute('aria-hidden','true');cue.textContent=side==='start'?'‹':'›';cue.hidden=true;root.append(cue);state[side]=cue;
        }
        states.set(bar,state);resize.observe(bar);
      }
      const rect=bar.getBoundingClientRect(),overflow=bar.scrollWidth-bar.clientWidth;
      const visible=bar.getClientRects().length&&overflow>2&&['auto','scroll'].includes(getComputedStyle(bar).overflowX);
      for(const side of ['start','end']){
        const cue=state[side],show=visible&&(side==='start'?bar.scrollLeft>2:bar.scrollLeft<overflow-2);
        if(cue.hidden===Boolean(show))cue.hidden=!show;
        if(!show)continue;
        cue.style.left=`${rect.left-bounds.left+root.scrollLeft-root.clientLeft+(side==='end'?bar.clientWidth-22:0)}px`;
        cue.style.top=`${rect.top-bounds.top+root.scrollTop-root.clientTop}px`;
        cue.style.height=`${bar.clientHeight}px`;
      }
    }
  }
  const observer=new MutationObserver(records=>{
    if(records.some(r=>!r.target.closest?.('.dfl-scroll-cue')&&(r.type!=='childList'||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType!==1||!n.matches('.dfl-scroll-cue')))))schedule();
  });
  observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','aria-selected','aria-pressed']});
  const focus=event=>{
    const button=event.target.closest?.('button'),bar=button?.closest(strips);if(!bar)return;
    const b=bar.getBoundingClientRect(),r=button.getBoundingClientRect();
    const left=r.left<b.left?r.left-b.left-22:r.right>b.right?r.right-b.right+22:0;
    if(left)bar.scrollBy({left,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.uiMotion==='off'?'auto':'smooth'});
  };
  root.addEventListener('scroll',schedule,true);root.addEventListener('focusin',focus);
  document.fonts?.addEventListener('loadingdone',schedule);window.addEventListener('resize',schedule);
  sync();
  return ()=>{
    stopped=true;cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();
    root.removeEventListener('scroll',schedule,true);root.removeEventListener('focusin',focus);
    document.fonts?.removeEventListener('loadingdone',schedule);window.removeEventListener('resize',schedule);
    for(const state of states.values()){state.start.remove();state.end.remove();}states.clear();root.style.position=originalPosition;
  };
}
