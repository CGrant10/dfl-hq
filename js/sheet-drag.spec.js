import {afterEach,describe,expect,it,vi} from 'vitest';
import {mountSheetDrag,sheetShouldClose,exitSheet} from './sheet-drag.js';
afterEach(()=>vi.unstubAllGlobals());
describe('sheet dismissal intent',()=>{
  it('uses a reachable distance for short and tall sheets',()=>{
    expect(sheetShouldClose({distance:59,height:200})).toBe(false);
    expect(sheetShouldClose({distance:60,height:200})).toBe(true);
    expect(sheetShouldClose({distance:119,height:800})).toBe(false);
    expect(sheetShouldClose({distance:120,height:800})).toBe(true);
  });
  it('accepts deliberate flicks but rejects tiny or upward movement',()=>{
    expect(sheetShouldClose({distance:40,height:600,velocity:.8})).toBe(true);
    expect(sheetShouldClose({distance:35,height:600,velocity:2})).toBe(false);
    expect(sheetShouldClose({distance:-90,height:600,velocity:2})).toBe(false);
  });
  it('never closes from cancellation even after crossing the threshold',()=>{
    expect(sheetShouldClose({distance:400,height:500,velocity:1,cancelled:true})).toBe(false);
  });
});
function fixture(){
  const media=new EventTarget();media.matches=true;vi.stubGlobal('matchMedia',()=>media);
  const document=new EventTarget();document.documentElement={dataset:{uiMotion:'off'}};document.visibilityState='visible';document.hidden=false;
  vi.stubGlobal('document',document);vi.stubGlobal('window',new EventTarget());vi.stubGlobal('innerWidth',390);
  vi.stubGlobal('getComputedStyle',()=>({transform:'none',getPropertyValue:()=> '1'}));
  vi.stubGlobal('cancelAnimationFrame',vi.fn());
  const dialog=new EventTarget();dialog.dataset={};dialog.open=true;dialog.isConnected=true;dialog.closest=()=>null;dialog.getBoundingClientRect=()=>({height:500});dialog.style={removeProperty:vi.fn(),setProperty:vi.fn()};
  const handle=new EventTarget();handle.dataset={};handle.closest=()=>null;let captured=null;
  handle.setPointerCapture=id=>captured=id;handle.hasPointerCapture=id=>captured===id;handle.releasePointerCapture=()=>captured=null;
  let busy=false;const dismiss=vi.fn();const control=mountSheetDrag(dialog,{handle,canDismiss:()=>!busy,dismiss});
  const send=(type,x=100,y=100,extra={})=>{const event=new Event(type,{cancelable:true});Object.assign(event,{pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:x,clientY:y,...extra});handle.dispatchEvent(event);return event;};
  return {handle,dialog,dismiss,control,send,busy:v=>busy=v,captured:()=>captured};
}
describe('sheet controls and interruption',()=>{
  it('releases a held gesture when the browser suspends the page',()=>{
    const f=fixture();f.send('pointerdown');f.send('pointermove',100,250);expect(f.captured()).toBe(1);
    window.dispatchEvent(new Event('pagehide'));expect(f.captured()).toBeNull();
    f.send('pointerup',100,250);expect(f.dismiss).not.toHaveBeenCalled();f.control.stop();
  });
  it('closes deliberate pulls without requiring decorative motion',()=>{
    const f=fixture();f.send('pointerdown');f.send('pointermove',100,240);f.send('pointerup',100,240);expect(f.dismiss).toHaveBeenCalledOnce();expect(f.captured()).toBeNull();f.control.stop();
  });
  it('returns short pulls and horizontal gestures without closing',()=>{
    const f=fixture();f.send('pointerdown');f.send('pointermove',100,120);f.send('pointerup',100,120);expect(f.dismiss).not.toHaveBeenCalled();
    f.send('pointerdown');f.send('pointermove',170,105);f.send('pointerup',170,105);expect(f.dismiss).not.toHaveBeenCalled();f.control.stop();
  });
  it('protects buttons and refuses dismissal while an entry is being submitted',()=>{
    const f=fixture();f.handle.closest=()=>({});f.send('pointerdown');f.send('pointermove',100,250);f.send('pointerup',100,250);expect(f.dismiss).not.toHaveBeenCalled();
    f.handle.closest=()=>null;f.send('pointerdown');f.send('pointermove',100,250);f.busy(true);f.send('pointerup',100,250);expect(f.dismiss).not.toHaveBeenCalled();f.control.stop();
  });
  it('ignores unrelated releases and cancels second fingers, viewport changes and stop',()=>{
    const f=fixture();f.send('pointerdown');f.send('pointermove',100,250);f.send('pointerup',100,250,{pointerId:2});expect(f.dismiss).not.toHaveBeenCalled();
    f.send('pointerdown',100,250,{pointerId:2,isPrimary:false});f.send('pointerup',100,250);expect(f.dismiss).not.toHaveBeenCalled();
    f.send('pointerdown');f.send('pointermove',100,250);window.dispatchEvent(new Event('resize'));f.send('pointerup',100,250);expect(f.dismiss).not.toHaveBeenCalled();
    f.send('pointerdown');f.send('pointermove',100,250);f.control.stop();f.send('pointerup',100,250);expect(f.dismiss).not.toHaveBeenCalled();expect(f.captured()).toBeNull();
  });
});

describe('sheet exit geometry',()=>{
  it('finishes below the visible viewport when released from an existing drag',async()=>{
    vi.stubGlobal('window',{visualViewport:{offsetTop:0,height:844}});vi.stubGlobal('innerWidth',390);
    vi.stubGlobal('document',{visibilityState:'visible'});vi.stubGlobal('matchMedia',()=>({matches:false}));
    vi.stubGlobal('getComputedStyle',()=>({opacity:'1',transform:'matrix(1,0,0,1,0,150)'}));
    vi.stubGlobal('DOMMatrixReadOnly',class{constructor(){this.m42=150;}});
    const dialog={dataset:{},isConnected:true,closest:()=>null,getBoundingClientRect:()=>({top:350})};
    dialog.animate=vi.fn(()=>({finished:Promise.resolve(),cancel:vi.fn(),effect:{target:dialog}}));
    const done=vi.fn();exitSheet(dialog,done);
    expect(dialog.animate.mock.calls[0][0][1].transform).toBe('translateY(668px)');
    await Promise.resolve();expect(done).toHaveBeenCalledOnce();
  });
});
