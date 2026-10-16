import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectPortrait } from './connected-portrait.js';
import { animateUi } from './ui-motion.js';
vi.mock('./ui-motion.js', () => ({ animateUi:vi.fn(), cancelUiMotion:vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks(); });
function fixture() {
  const overlays=[];
  class Element {} Element.prototype.showPopover=()=>{};
  vi.stubGlobal('HTMLElement',Element);vi.stubGlobal('innerHeight',844);vi.stubGlobal('innerWidth',390);
  vi.stubGlobal('window',new EventTarget());
  vi.stubGlobal('getComputedStyle',()=>({background:'black',color:'white',border:'1px solid',borderRadius:'50%',font:'12px sans-serif'}));
  vi.stubGlobal('document',{addEventListener:vi.fn(),removeEventListener:vi.fn(),body:{append:vi.fn()},createElement:()=>{const el={isConnected:true,getBoundingClientRect:()=>({left:50,top:220,right:100,bottom:270,width:50,height:50}),style:{},setAttribute:vi.fn(),append:vi.fn(),showPopover:vi.fn(),remove:vi.fn()};overlays.push(el);return el;}});
  const portrait=(x,y,size)=>({isConnected:true,style:{visibility:''},matches:()=>true,classList:{contains:()=>false},getBoundingClientRect:()=>({left:x,top:y,right:x+size,bottom:y+size,width:size,height:size}),querySelector:s=>s==='i'?{textContent:'DM'}:null});
  const source=portrait(30,180,64),target=portrait(30,300,36);
  let finish;animateUi.mockReturnValue({finished:new Promise(resolve=>{finish=resolve;})});
  return {source,target,overlays,finish:()=>finish()};
}
describe('connected portrait return lifecycle',()=>{
  it('reverses from the current travelling position instead of the stationary portrait',()=>{
    const f=fixture(),stop=connectPortrait(f.source,f.target),origin=stop.position();stop();
    connectPortrait(f.target,f.source,{origin,hideSource:true});
    expect(animateUi.mock.calls[1][1][0].transform).toContain('translate(20px,40px)');
  });
  it('restores portraits when the viewport moves during travel',()=>{
    const f=fixture();const stop=connectPortrait(f.source,f.target,{hideSource:true});window.dispatchEvent(new Event('resize'));
    expect(f.source.style.visibility).toBe('');expect(f.target.style.visibility).toBe('');expect(stop.position()).toBeNull();
  });
  it('hides the stationary portraits during a return and restores them after the flight',async()=>{
    const f=fixture();connectPortrait(f.source,f.target,{hideSource:true,duration:160});
    expect(f.source.style.visibility).toBe('hidden');expect(f.target.style.visibility).toBe('hidden');
    expect(animateUi.mock.calls[0][2].duration).toBe(160);
    f.finish();await Promise.resolve();expect(f.source.style.visibility).toBe('');expect(f.target.style.visibility).toBe('');expect(f.overlays[0].remove).toHaveBeenCalledOnce();
  });
  it('does not let a cancelled flight restore visibility over a newer one',async()=>{
    const f=fixture(),stop=connectPortrait(f.source,f.target,{hideSource:true});stop();stop();
    const oldFinish=f.finish;
    animateUi.mockReturnValue({finished:new Promise(()=>{})});
    const stopNew=connectPortrait(f.source,f.target,{hideSource:true});oldFinish();await Promise.resolve();
    expect(f.target.style.visibility).toBe('hidden');expect(f.overlays[0].remove).toHaveBeenCalledOnce();stopNew();expect(f.target.style.visibility).toBe('');
  });
  it('falls back to an ordinary close when the source row is offscreen',()=>{
    const f=fixture();f.target.getBoundingClientRect=()=>({left:30,top:900,right:66,bottom:936,width:36,height:36});
    connectPortrait(f.source,f.target,{hideSource:true})();expect(f.overlays).toHaveLength(0);expect(f.source.style.visibility).toBe('');
  });
  it('never hides either portrait when shared motion suppresses the animation',()=>{
    const f=fixture();animateUi.mockReturnValue(undefined);connectPortrait(f.source,f.target,{hideSource:true,motion:false})();
    expect(f.source.style.visibility).toBe('');expect(f.target.style.visibility).toBe('');expect(f.overlays[0].remove).toHaveBeenCalledOnce();
  });
});
