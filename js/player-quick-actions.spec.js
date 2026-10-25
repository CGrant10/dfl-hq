import {describe,it,expect,vi,afterEach} from 'vitest';
import {mountPlayerQuickActions} from './player-quick-actions.js';
afterEach(()=>vi.useRealTimers());
function fixture(){
 vi.useFakeTimers();const handlers={},doc={addEventListener:(type,fn)=>handlers[type]=fn,removeEventListener:vi.fn()},win={addEventListener:vi.fn(),removeEventListener:vi.fn()},open=vi.fn();
 const button={isConnected:true,disabled:false,closest:()=>null},target={closest:selector=>selector==='[data-player-card],[data-gameday-player]'||selector==='.dfl-player-portrait,[data-player-card],[data-gameday-player]'?button:null};
 const stop=mountPlayerQuickActions(doc,win,{open});
 const event={target,pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:50,clientY:50};
 return {handlers,event,open,button,stop,doc};
}
describe('player quick actions without scroll interference',()=>{
 it('opens once after a hold and suppresses only that source compatibility click',()=>{
  const f=fixture();f.handlers.pointerdown(f.event);vi.advanceTimersByTime(449);expect(f.open).not.toHaveBeenCalled();vi.advanceTimersByTime(1);expect(f.open).toHaveBeenCalledOnce();
  const click={...f.event,preventDefault:vi.fn(),stopImmediatePropagation:vi.fn()};f.handlers.click(click);expect(click.preventDefault).toHaveBeenCalledOnce();
  const allowed={...click,preventDefault:vi.fn()};f.open.mock.calls[0][1].beforeView();f.handlers.click(allowed);expect(allowed.preventDefault).not.toHaveBeenCalled();
 });
 it.each(['pointerup','pointercancel','scroll','visibilitychange'])('a %s cancels a pending hold',type=>{
  const f=fixture();f.handlers.pointerdown(f.event);f.handlers[type](f.event);vi.advanceTimersByTime(500);expect(f.open).not.toHaveBeenCalled();
 });
 it('a vertical drag cancels without capturing or preventing the pointer',()=>{
  const f=fixture();f.handlers.pointerdown(f.event);f.handlers.pointermove({...f.event,clientY:62});vi.advanceTimersByTime(500);expect(f.open).not.toHaveBeenCalled();
 });
 it('a long-held release suppresses a retargeted backdrop click',()=>{
  const f=fixture();f.handlers.pointerdown(f.event);vi.advanceTimersByTime(1800);f.handlers.pointerup(f.event);
  const click={target:{closest:()=>null,matches:selector=>selector==='.player-quick-menu'},preventDefault:vi.fn(),stopImmediatePropagation:vi.fn()};f.handlers.click(click);expect(f.open).toHaveBeenCalledOnce();expect(click.preventDefault).toHaveBeenCalledOnce();
 });
 it('ignores mouse holds, disabled players and removed sources',()=>{
  const f=fixture();f.handlers.pointerdown({...f.event,pointerType:'mouse'});vi.advanceTimersByTime(500);expect(f.open).not.toHaveBeenCalled();
  f.button.disabled=true;f.handlers.pointerdown(f.event);vi.advanceTimersByTime(500);expect(f.open).not.toHaveBeenCalled();f.button.disabled=false;
  f.handlers.pointerdown(f.event);f.button.isConnected=false;vi.advanceTimersByTime(500);expect(f.open).not.toHaveBeenCalled();
 });
 it('teardown removes every listener and a pending timer',()=>{
  const f=fixture();f.handlers.pointerdown(f.event);f.stop();vi.advanceTimersByTime(500);expect(f.open).not.toHaveBeenCalled();expect(f.doc.removeEventListener).toHaveBeenCalledTimes(8);
 });
});
