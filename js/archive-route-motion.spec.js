import {afterEach,it,expect,vi} from 'vitest';
afterEach(()=>vi.unstubAllGlobals());
async function fixture({supported=true,off=false}={}){
 vi.resetModules();const win=new EventTarget(),doc=new EventTarget();doc.visibilityState='visible';doc.documentElement={dataset:{uiMotion:off?'off':'on'}};
 const image=()=>({isConnected:true,style:{viewTransitionName:''},getBoundingClientRect:()=>({width:100,height:70,top:120,bottom:190,left:20,right:120})});
 const source=image(),target=image(),view={dataset:{route:'facts'},querySelector:()=>target};doc.getElementById=()=>view;
 vi.stubGlobal('document',doc);vi.stubGlobal('window',win);vi.stubGlobal('matchMedia',()=>({matches:false}));vi.stubGlobal('location',{hash:'#/home'});vi.stubGlobal('innerHeight',844);vi.stubGlobal('CSS',{escape:value=>value});vi.stubGlobal('requestAnimationFrame',callback=>setTimeout(callback,0));vi.stubGlobal('cancelAnimationFrame',clearTimeout);
 let finish;const skip=vi.fn(()=>finish?.());if(supported)doc.startViewTransition=vi.fn(update=>{const updateCallbackDone=Promise.resolve().then(update),finished=new Promise(resolve=>finish=resolve);return{updateCallbackDone,ready:updateCallbackDone,finished,skipTransition:skip}});
 const api=await import('./archive-route-motion.js');api.mountArchiveRouteMotion();const hash='#/facts?fact=record%3Akey',link={dataset:{archiveKey:'record:key'},closest:()=>true,getAttribute:()=>hash,querySelector:()=>source},event=new Event('click');Object.assign(event,{button:0});Object.defineProperty(event,'target',{value:{closest:()=>link}});doc.dispatchEvent(event);location.hash=hash;
 return{...api,doc,source,target,view,hash,finish:()=>finish(),previous:{dataset:{route:'home'}}};
}
it('connects the selected Archive art and restores temporary names after completion',async()=>{const f=await fixture(),render=vi.fn();await f.renderWithArchiveMotion(render,f.previous,f.hash);expect(render).toHaveBeenCalledOnce();expect(f.source.style.viewTransitionName).toBe('dfl-archive-art');expect(f.target.style.viewTransitionName).toBe('dfl-archive-art');f.finish();await Promise.resolve();expect(f.source.style.viewTransitionName).toBe('');expect(f.target.style.viewTransitionName).toBe('');expect(f.doc.documentElement.dataset.archiveTransition).toBeUndefined()});
it('preserves ordinary navigation on unsupported browsers and with motion off',async()=>{for(const options of [{supported:false},{off:true}]){const f=await fixture(options),render=vi.fn();await f.renderWithArchiveMotion(render,f.previous,f.hash);expect(render).toHaveBeenCalledOnce();if(f.doc.startViewTransition)expect(f.doc.startViewTransition).not.toHaveBeenCalled();expect(f.source.style.viewTransitionName).toBe('')}});
it('does not start an old render when navigation changes during snapshot capture',async()=>{const f=await fixture(),render=vi.fn();const pending=f.renderWithArchiveMotion(render,f.previous,f.hash);location.hash='#/sportsbook';await pending;expect(render).not.toHaveBeenCalled();f.finish();await Promise.resolve();expect(f.source.style.viewTransitionName).toBe('')});
it('anchors the returning card through deferred layout changes and releases on user input',async()=>{
 const f=await fixture();let top=200,resize;f.view.isConnected=true;f.view.style={minHeight:''};f.view.addEventListener=()=>{};f.view.removeEventListener=()=>{};f.target.getBoundingClientRect=()=>({width:100,height:70,top,bottom:top+70,left:20,right:120});f.target.closest=()=>({focus:vi.fn()});window.scrollBy=vi.fn(change=>top-=change.top);
 vi.stubGlobal('ResizeObserver',class{constructor(callback){resize=callback}observe(){}disconnect(){}});location.hash='#/home';
 await f.renderWithArchiveMotion(vi.fn(),{dataset:{route:'facts'},querySelector:()=>f.source},'#/home',{back:true});expect(top).toBe(120);
 top+=25;resize();await new Promise(resolve=>setTimeout(resolve,10));expect(top).toBe(120);
 window.dispatchEvent(new Event('wheel'));top+=20;resize();await new Promise(resolve=>setTimeout(resolve,10));expect(top).toBe(140);f.finish();await Promise.resolve();
});
it('does not restore the Archive card on an ordinary Home visit',async()=>{
 const f=await fixture();location.hash='#/home';const render=vi.fn();
 await f.renderWithArchiveMotion(render,{dataset:{route:'facts'},querySelector:()=>f.source},'#/home');
 expect(render).toHaveBeenCalledOnce();expect(f.doc.documentElement.dataset.archiveReturning).toBeUndefined();expect(f.doc.startViewTransition).not.toHaveBeenCalled();
});
