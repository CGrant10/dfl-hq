import {afterEach,describe,expect,it,vi} from 'vitest';
import {mountUpdateLogoGlow} from './update.js';
afterEach(()=>vi.unstubAllGlobals());
const flush=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};
function fixture({cached=false,hidden=false}={}){
  const image=Object.assign(new EventTarget(),{complete:cached,naturalWidth:cached?512:0,src:'https://example.test/dfl-hq/icons/app-update-512.png',decode:vi.fn(async()=>{})});
  const glow={style:{setProperty:vi.fn()}};
  const doc=Object.assign(new EventTarget(),{hidden});
  const el={isConnected:true,dataset:{},classList:{contains:()=>false},querySelector:selector=>selector.endsWith('img')?image:glow,removeAttribute:()=>delete el.dataset.logoReady};
  let frame=null;
  const request=vi.fn(callback=>{frame=callback;return 1});
  vi.stubGlobal('document',doc);vi.stubGlobal('requestAnimationFrame',request);vi.stubGlobal('cancelAnimationFrame',()=>{frame=null});
  return {el,image,glow,doc,request,paint:()=>{const callback=frame;frame=null;callback?.();}};
}
describe('update logo readiness',()=>{
  it('waits for a cold image to load and decode before starting a visible sweep',async()=>{
    const f=fixture();let decode;
    f.image.decode.mockImplementation(()=>new Promise(resolve=>{decode=resolve}));
    const stop=mountUpdateLogoGlow(f.el);
    expect(f.request).not.toHaveBeenCalled();expect(f.el.dataset.logoReady).toBeUndefined();
    f.image.complete=true;f.image.naturalWidth=512;f.image.dispatchEvent(new Event('load'));
    expect(f.request).not.toHaveBeenCalled();decode();await flush();
    expect(f.el.dataset.logoReady).toBeUndefined();f.paint();expect(f.el.dataset.logoReady).toBe('true');stop();
  });
  it('starts a cached logo after decode and a paint frame',async()=>{
    const f=fixture({cached:true}),stop=mountUpdateLogoGlow(f.el);
    await flush();expect(f.request).toHaveBeenCalledOnce();expect(f.el.dataset.logoReady).toBeUndefined();
    f.paint();expect(f.el.dataset.logoReady).toBe('true');stop();
    expect(f.glow.style.setProperty).toHaveBeenCalledWith('--update-logo-mask','url("https://example.test/dfl-hq/icons/app-update-512.png")');
  });
  it('defers a background-tab sweep until visible and does not replay on repeated visibility events',async()=>{
    const f=fixture({cached:true,hidden:true}),stop=mountUpdateLogoGlow(f.el);
    await flush();expect(f.request).not.toHaveBeenCalled();
    f.doc.hidden=false;f.doc.dispatchEvent(new Event('visibilitychange'));f.paint();
    f.doc.dispatchEvent(new Event('visibilitychange'));
    expect(f.request).toHaveBeenCalledOnce();expect(f.el.dataset.logoReady).toBe('true');stop();
  });
  it('ignores an old image decode after the gate is replaced',async()=>{
    const f=fixture({cached:true});let decode;
    f.image.decode.mockImplementation(()=>new Promise(resolve=>{decode=resolve}));
    const stop=mountUpdateLogoGlow(f.el);stop();decode();await flush();f.paint();
    expect(f.el.dataset.logoReady).toBeUndefined();expect(f.request).not.toHaveBeenCalled();
  });
});
