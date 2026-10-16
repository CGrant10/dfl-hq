import {afterEach,it,expect,vi} from 'vitest';
afterEach(()=>vi.unstubAllGlobals());
async function fixture({supported=true,off=false,projected=false,updated=false,offscreen=false}={}){
 vi.resetModules();const doc=new EventTarget(),win=new EventTarget();doc.visibilityState='visible';doc.documentElement={dataset:{uiMotion:off?'off':'on'}};
 const node=text=>({textContent:text,style:{viewTransitionName:''},closest:()=>null,getBoundingClientRect:()=>({width:40,height:40,top:120,bottom:160,left:20,right:60})});
 const origins=['1','2'].map((id,i)=>{const badge=node(''),score=node(String(100+i));return{dataset:{gamedayTeam:id},badge,score,querySelector:selector=>selector==='.dfl-team-mark'?badge:score}});
 const targets=['1','2'].map((id,i)=>{const badge=node(''),score=node(String(100+i+(updated?1:0)));return{id,badge,score,querySelector:selector=>selector==='.dfl-team-mark'?badge:score}});
 if(offscreen)for(const t of targets)t.badge.getBoundingClientRect=()=>({width:40,height:40,top:1200,bottom:1240});
 const hash='#/clubhouse?matchup=1',card={classList:{contains:()=>projected},querySelectorAll:()=>origins},owner={querySelector:()=>card},link={getAttribute:()=>hash,closest:selector=>selector==='#home-wrap'?{}:owner};
 doc.querySelectorAll=selector=>targets.filter(t=>selector.includes(`"${t.id}"`));doc.querySelector=selector=>doc.querySelectorAll(selector)[0];
 vi.stubGlobal('document',doc);vi.stubGlobal('window',win);vi.stubGlobal('matchMedia',()=>({matches:false}));vi.stubGlobal('location',{hash:'#/home'});vi.stubGlobal('innerHeight',844);vi.stubGlobal('CSS',{escape:v=>v});
 let finish;const skip=vi.fn(()=>finish?.());if(supported)doc.startViewTransition=vi.fn(update=>{const done=Promise.resolve().then(update),finished=new Promise(resolve=>finish=resolve);return{ready:done,updateCallbackDone:done,finished,skipTransition:skip}});
 const api=await import('./matchup-route-motion.js');api.mountMatchupRouteMotion();const event=new Event('click');Object.assign(event,{button:0});Object.defineProperty(event,'target',{value:{closest:()=>link}});doc.dispatchEvent(event);location.hash=hash;
 return{...api,doc,origins,targets,hash,finish:()=>finish?.(),previous:{dataset:{route:'home'}}};
}
it('connects actual team identities and matching scores, then restores all temporary names',async()=>{
 const f=await fixture(),render=vi.fn();await f.renderWithMatchupMotion(render,f.previous,f.hash);expect(render).toHaveBeenCalledOnce();
 for(let i=0;i<2;i++){expect(f.origins[i].badge.style.viewTransitionName).toBe('dfl-matchup-team-'+i);expect(f.targets[i].badge.style.viewTransitionName).toBe('dfl-matchup-team-'+i);expect(f.targets[i].score.style.viewTransitionName).toBe('dfl-matchup-score-'+i)}
 f.finish();await Promise.resolve();expect(f.doc.documentElement.dataset.matchupTransition).toBeUndefined();expect(f.origins[0].badge.style.viewTransitionName).toBe('');expect(f.targets[0].score.style.viewTransitionName).toBe('');
});
it.each([{projected:true},{updated:true}])('never presents a forecast or changed score as an unchanged actual total: %o',async options=>{const f=await fixture(options);await f.renderWithMatchupMotion(vi.fn(),f.previous,f.hash);expect(f.targets[0].score.style.viewTransitionName).toBe('');f.finish()});
it.each([{supported:false},{off:true}])('keeps ordinary navigation usable without shared motion: %o',async options=>{const f=await fixture(options),render=vi.fn();await f.renderWithMatchupMotion(render,f.previous,f.hash);expect(render).toHaveBeenCalledOnce();if(f.doc.startViewTransition)expect(f.doc.startViewTransition).not.toHaveBeenCalled();expect(f.origins[0].badge.style.viewTransitionName).toBe('')});
it('does not start an old render when the user navigates away before snapshot capture',async()=>{const f=await fixture(),render=vi.fn();const pending=f.renderWithMatchupMotion(render,f.previous,f.hash);location.hash='#/trade';await pending;expect(render).not.toHaveBeenCalled();f.finish()});

it('does not wait for offscreen destination artwork before showing the page',async()=>{const f=await fixture({offscreen:true}),render=vi.fn();await f.renderWithMatchupMotion(render,f.previous,f.hash);expect(render).toHaveBeenCalledOnce();expect(f.targets[0].badge.style.viewTransitionName).toBe('');});
