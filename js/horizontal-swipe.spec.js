import {afterEach,describe,expect,it,vi} from 'vitest';
import {mountHorizontalSwipe} from './horizontal-swipe.js';
afterEach(()=>vi.unstubAllGlobals());
function fixture() {
 vi.stubGlobal('getSelection',()=> '');let index=0,captured=null;
 const surface=new EventTarget();surface.closest=()=>null;surface.setPointerCapture=vi.fn(id=>captured=id);surface.hasPointerCapture=id=>captured===id;surface.releasePointerCapture=vi.fn(()=>captured=null);
 const end=vi.fn(g=>{if(g.valid)index+=g.dx<0?1:-1;});
 const control=mountHorizontalSwipe(surface,{onEnd:end});
 const send=(type,x=100,y=100,extra={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:x,clientY:y,...extra});surface.dispatchEvent(e);return e;};
 const swipe=dx=>{send('pointerdown');send('pointermove',100+dx);send('pointerup',100+dx);};
 return {surface,control,end,send,swipe,index:()=>index};
}
describe('stable horizontal gestures',()=>{
 it('keeps rapid forward and reverse swipes working, with capture released every time',()=>{
  const f=fixture();for(let i=0;i<30;i++)f.swipe(-80);for(let i=0;i<30;i++)f.swipe(80);
  expect(f.index()).toBe(0);expect(f.surface.setPointerCapture).toHaveBeenCalledTimes(60);expect(f.surface.releasePointerCapture).toHaveBeenCalledTimes(60);expect(f.control.tracking).toBe(false);
 });
 it('allows a deliberate slow pull to land without an arbitrary gesture timeout',()=>{
  let time=0;vi.stubGlobal('performance',{now:()=>time});const f=fixture();
  f.send('pointerdown');time=1600;f.send('pointermove',20);time=2400;f.send('pointerup',20);
  expect(f.index()).toBe(1);expect(f.control.tracking).toBe(false);
 });
 it('does not confuse a different pointer release with the current gesture',()=>{
  const f=fixture();f.send('pointerdown');f.send('pointermove',20);f.send('pointerup',20,100,{pointerId:2});expect(f.control.tracking).toBe(true);f.send('pointerup',20);expect(f.index()).toBe(1);
 });
 it('ignores the child capture loss but cancels a genuine surface loss',()=>{
  const f=fixture();f.send('pointerdown');f.send('pointermove',20);
  const child=new Event('lostpointercapture');Object.assign(child,{pointerId:1});Object.defineProperty(child,'target',{value:{}});f.surface.dispatchEvent(child);expect(f.control.tracking).toBe(true);
  f.surface.releasePointerCapture(1);f.send('lostpointercapture',20);expect(f.control.tracking).toBe(false);expect(f.index()).toBe(0);
 });
 it('does not let a late capture loss cancel the next gesture with a reused pointer id',()=>{
  const f=fixture();f.swipe(-80);f.send('pointerdown');f.send('lostpointercapture');expect(f.control.tracking).toBe(true);
  f.send('pointermove',20);f.send('lostpointercapture',20);expect(f.control.tracking).toBe(true);f.send('pointerup',20);expect(f.index()).toBe(2);
 });
 it('does not leave a ghost click latch over the next intentional touch or control',()=>{
  const f=fixture();f.swipe(-80);expect(f.send('click').defaultPrevented).toBe(true);
  f.surface.closest=()=>({});f.send('pointerdown');expect(f.send('click').defaultPrevented).toBe(false);
  f.surface.closest=()=>null;f.swipe(80);f.send('pointerdown');f.send('pointerup');expect(f.send('click').defaultPrevented).toBe(false);
 });
 it('cancels vertical gestures, second fingers and stopped gestures without navigating',()=>{
  const f=fixture();f.send('pointerdown');f.send('pointermove',105,160);expect(f.control.tracking).toBe(false);
  f.send('pointerdown');f.send('pointermove',20);f.send('pointerdown',20,100,{pointerId:2,isPrimary:false});f.send('pointerup',20);expect(f.index()).toBe(0);
  f.send('pointerdown');f.send('pointermove',20);f.control.stop();f.send('pointerup',20);expect(f.index()).toBe(0);expect(f.surface.hasPointerCapture(1)).toBe(false);
 });
});
