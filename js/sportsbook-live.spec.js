import {afterEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({read:vi.fn()}));
vi.mock('./sportsbook-loading.js',()=>({loadPropGame:mocks.read}));
import {mountSportsbookLive} from './sportsbook-live.js';
describe('mounted book quote refresh',()=>{
  let stop;
  afterEach(()=>{stop?.();vi.useRealTimers();vi.unstubAllGlobals();});
  const setup=()=>{
    vi.useFakeTimers();const doc=new EventTarget(),win=new EventTarget();doc.visibilityState='visible';win.navigator={onLine:true};vi.stubGlobal('document',doc);vi.stubGlobal('window',win);
    let busy=false,active=true;const root={querySelector:()=>busy?{}:null,querySelectorAll:()=>[{dataset:{betOutcome:'2'}},{dataset:{betOutcome:'3'}}]},onUpdate=vi.fn(),onError=vi.fn();
    mocks.read.mockReset().mockResolvedValue({markets:[{id:1,status:'open'}],outcomes:[]});
    const client={};stop=mountSportsbookLive(root,{client,outcomeMap:new Map([['2',{market_id:1}],['3',{market_id:1}]]),active:()=>active,onUpdate,onError});
    return{win,doc,onUpdate,onError,client,busy:value=>busy=value,retire:()=>active=false};
  };
  it('reads mounted markets once on return and pauses while a slip is open',async()=>{
    const f=setup();await vi.advanceTimersByTimeAsync(0);expect(mocks.read).not.toHaveBeenCalled();
    f.busy(true);f.win.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(80);expect(mocks.read).not.toHaveBeenCalled();
    f.busy(false);const e=new Event('pageshow');e.persisted=true;f.win.dispatchEvent(e);await vi.advanceTimersByTimeAsync(80);
    expect(mocks.read).toHaveBeenCalledExactlyOnceWith(f.client,[1]);expect(f.onUpdate).toHaveBeenCalledOnce();
  });
  it('does not apply a late quote after navigation or while a slip opens',async()=>{
    const f=setup();let release;mocks.read.mockImplementation(()=>new Promise(resolve=>release=resolve));f.win.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(80);
    f.busy(true);release({markets:[],outcomes:[]});await vi.advanceTimersByTimeAsync(0);expect(f.onUpdate).not.toHaveBeenCalled();
    f.busy(false);f.win.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(80);f.retire();release({markets:[],outcomes:[]});await vi.advanceTimersByTimeAsync(0);expect(f.onUpdate).not.toHaveBeenCalled();
  });
  it('keeps existing quotes on failure and backs off before a read-only retry',async()=>{
    const f=setup();mocks.read.mockRejectedValueOnce(Error('network'));f.win.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(80);
    expect(f.onError).toHaveBeenCalledOnce();expect(f.onUpdate).not.toHaveBeenCalled();await vi.advanceTimersByTimeAsync(5000);expect(f.onUpdate).toHaveBeenCalledOnce();
  });
});
