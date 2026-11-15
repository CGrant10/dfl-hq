import {it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({count:1}));
vi.mock('./supabase.js',()=>({db:()=>({rpc:async()=>({data:state.count})}),edge:()=>{throw Error('No push writes')}}));
vi.mock('./members.js',()=>({currentMember:()=>({id:1})}));
vi.mock('./service-worker.js',()=>({activeAppWorker:async()=>null,requireAppWorker:async()=>{throw Error('No enrollment')}}));
import {mountNotificationBell} from './notifications.js';

it('reuses the existing bell checks to signal changed inbox counts and stops cleanly',async()=>{
 vi.useFakeTimers();
 const window=new EventTarget(),button=new EventTarget(),count={textContent:'',classList:{toggle:vi.fn(),add:vi.fn()}};
 button.querySelector=()=>count;button.setAttribute=vi.fn();
 vi.stubGlobal('window',window);vi.stubGlobal('document',{getElementById:()=>button});vi.stubGlobal('navigator',{});
 const changed=vi.fn();window.addEventListener('dfl:inbox-update',changed);
 let stop;
 try{
  stop=mountNotificationBell();await vi.advanceTimersByTimeAsync(0);expect(changed).not.toHaveBeenCalled();
  state.count=2;window.dispatchEvent(new Event('focus'));await vi.advanceTimersByTimeAsync(0);expect(changed).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new Event('focus'));await vi.advanceTimersByTimeAsync(0);expect(changed).toHaveBeenCalledTimes(1);
  state.count=3;await vi.advanceTimersByTimeAsync(60000);expect(changed).toHaveBeenCalledTimes(2);
  stop();state.count=4;window.dispatchEvent(new Event('focus'));await vi.advanceTimersByTimeAsync(60000);expect(changed).toHaveBeenCalledTimes(2);
 }finally{stop?.();vi.useRealTimers();vi.unstubAllGlobals()}
});
it('refreshes from a live worker message and removes that listener when stopped',async()=>{
 vi.useFakeTimers();state.count=1;
 const window=new EventTarget(),worker=new EventTarget(),button=new EventTarget(),count={classList:{toggle(){},add(){}}};
 button.querySelector=()=>count;button.setAttribute=vi.fn();
 vi.stubGlobal('window',window);vi.stubGlobal('document',{getElementById:()=>button,visibilityState:'visible'});vi.stubGlobal('navigator',{serviceWorker:worker});
 const changed=vi.fn();window.addEventListener('dfl:inbox-update',changed);let stop;
 try{
  stop=mountNotificationBell();await vi.advanceTimersByTimeAsync(0);
  worker.dispatchEvent(new MessageEvent('message',{data:{type:'UNRELATED'}}));expect(changed).not.toHaveBeenCalled();
  worker.dispatchEvent(new MessageEvent('message',{data:{type:'DFL_NOTIFICATION_AVAILABLE',messageId:12}}));await vi.advanceTimersByTimeAsync(0);expect(changed).toHaveBeenCalledOnce();
  stop();worker.dispatchEvent(new MessageEvent('message',{data:{type:'DFL_NOTIFICATION_AVAILABLE',messageId:13}}));expect(changed).toHaveBeenCalledOnce();
 }finally{stop?.();vi.useRealTimers();vi.unstubAllGlobals()}
});
