export function canWarmRoutes({ connection = {}, hidden = false } = {}) {
  return !hidden && !connection.saveData && !['slow-2g', '2g', '3g'].includes(connection.effectiveType);
}

// Network idle can happen while a route is still waiting for its data.
// Speculative pages must yield to the page the member actually opened.
export function mountRouteWarmup({ready,warm,win=window,doc=document,routes=['trade','clubhouse']}={}){
 let stopped=false,timer=null,idle=null,index=0,waits=0;
 const stop=()=>{stopped=true;if(timer!=null)win.clearTimeout(timer);if(idle!=null)win.cancelIdleCallback?.(idle)};
 const schedule=delay=>{timer=win.setTimeout(()=>{timer=null;if(stopped)return;if(win.requestIdleCallback)idle=win.requestIdleCallback(run,{timeout:5000});else run()},delay)};
 const run=()=>{
  idle=null;if(stopped)return;
  if(!canWarmRoutes({connection:win.navigator?.connection,hidden:doc.hidden})){stop();return}
  if(!ready()){if(waits++<20)schedule(1000);return}
  const route=routes[index++];if(!route){stop();return}
  Promise.resolve().then(()=>{if(!stopped)return warm(route)}).catch(()=>{}).finally(()=>{if(!stopped)schedule(300)});
 };
 schedule(1000);return stop;
}
