// Keep the full alert's document space. Only the small, fixed copy enters.
export function mountTradeAlertDock(host,{onClick}={}){
 const dock=document.createElement('aside');
 dock.className='breaking-trade-dock';dock.setAttribute('aria-label','Trade alert');dock.hidden=true;dock.inert=true;
 document.body.append(dock);dock.addEventListener('click',onClick);
 let stopped=false,frame=0,shown=false;
 const paint=()=>{
  frame=0;if(stopped)return;
  const top=Math.max(document.querySelector('.topbar')?.getBoundingClientRect().bottom||44,innerWidth>=900?document.querySelector('#tabbar')?.getBoundingClientRect().bottom||0:0);
  const blocked=document.hidden||document.querySelector('dialog[open],#more:not(.hidden),#welcome:not(.hidden),.update-gate:not(.hidden)');
  const on=!host.hidden&&!blocked&&/^#\/home(?:\?|$)/.test(location.hash)&&host.getBoundingClientRect().bottom<=top;
  const moved=dock.style.top!==`${top}px`;
  dock.style.top=`${top}px`;
  if(on===shown){if(on&&moved)window.dispatchEvent(new Event('dfl:scroll-chrome'));return;}
  shown=on;dock.hidden=!on;dock.inert=!on;
  window.dispatchEvent(new Event('dfl:scroll-chrome'));
 };
 const schedule=()=>{if(!stopped&&!frame)frame=requestAnimationFrame(paint)};
 const watchDialog=node=>{if(node.nodeName==='DIALOG')observer.observe(node,{attributes:true,attributeFilter:['open']})};
 const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes||[])watchDialog(node);schedule()});
 observer.observe(document.body,{childList:true});
 document.querySelectorAll('dialog').forEach(watchDialog);
 observer.observe(host,{attributes:true,attributeFilter:['hidden']});
 for(const node of document.querySelectorAll('#more,#welcome,#update'))observer.observe(node,{attributes:true,attributeFilter:['class']});
 const resize=new ResizeObserver(schedule);resize.observe(host);const header=document.querySelector('.topbar');if(header)resize.observe(header);const nav=document.querySelector('#tabbar');if(nav)resize.observe(nav);
 document.fonts?.ready.then(schedule);
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);window.addEventListener('hashchange',schedule);window.addEventListener('pageshow',schedule);document.addEventListener('visibilitychange',schedule);
 return {update(markup){dock.innerHTML=markup;schedule()},stop(){stopped=true;cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();dock.removeEventListener('click',onClick);dock.remove();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);window.removeEventListener('hashchange',schedule);window.removeEventListener('pageshow',schedule);document.removeEventListener('visibilitychange',schedule);window.dispatchEvent(new Event('dfl:scroll-chrome'))}};
}
