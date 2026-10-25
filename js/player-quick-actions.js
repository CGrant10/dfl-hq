// Delegated holds never capture a pointer or replace native vertical scrolling.
export function mountPlayerQuickActions(doc=document,win=window,{open}={}){
 let hold=null,timer=0,suppress=null,until=0;
 const source=target=>target?.closest?.('[data-player-card],[data-gameday-player]')||target?.closest?.('.dfl-player')?.querySelector('[data-player-card]');
 const clear=()=>{clearTimeout(timer);timer=0;hold=null};
 const show=(button,opener=button)=>{
  clear();if(!button?.isConnected)return;
  const restore=()=>{suppress=null;until=0};
  const run=open||((...args)=>import('./player-quick-menu.js').then(m=>m.openPlayerQuickMenu(...args)));
  void Promise.resolve(run(button,{opener,beforeView:restore})).catch(()=>restore());
 };
 const down=e=>{
  clear();if(e.isPrimary===false||e.button!==0||e.pointerType==='mouse')return;
  if(!e.target.closest?.('.dfl-player-portrait,[data-player-card],[data-gameday-player]'))return;
  const button=source(e.target);if(!button||button.disabled||button.closest('[inert],[data-ui-closing]'))return;
  hold={id:e.pointerId,x:e.clientX,y:e.clientY,button};
  timer=setTimeout(()=>{if(!hold?.button.isConnected){clear();return}const button=hold.button;suppress=button;until=Infinity;show(button)},450);
 };
 const move=e=>{if(hold&&e.pointerId===hold.id&&Math.hypot(e.clientX-hold.x,e.clientY-hold.y)>8)clear()};
 const up=e=>{if(hold?.id===e.pointerId)clear();if(suppress)until=performance.now()+700};
 const click=e=>{
  const more=e.target.closest?.('[data-player-quick]');
  if(more){e.preventDefault();e.stopImmediatePropagation();show(source(more),more);return}
  // showModal makes the original row inert: mobile compatibility clicks may
  // consequently target the new dialog's backdrop instead of that row.
  if(suppress&&performance.now()<until&&(source(e.target)===suppress||e.target.matches?.('.player-quick-menu'))){e.preventDefault();e.stopImmediatePropagation();return}
 };
 const context=e=>{const button=source(e.target);if(button&&!button.disabled){e.preventDefault();if(suppress===button&&performance.now()<until)return;suppress=button;until=performance.now()+900;show(button)}};
 const listeners=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['scroll',clear],['visibilitychange',clear],['click',click],['contextmenu',context]];
 for(const [type,fn]of listeners)doc.addEventListener(type,fn,true);
 win.addEventListener('hashchange',clear);win.addEventListener('blur',clear);win.addEventListener('pagehide',clear);
 return ()=>{clear();for(const [type,fn]of listeners)doc.removeEventListener(type,fn,true);win.removeEventListener('hashchange',clear);win.removeEventListener('blur',clear);win.removeEventListener('pagehide',clear)};
}
