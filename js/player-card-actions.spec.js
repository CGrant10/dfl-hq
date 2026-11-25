import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountPlayerCards } from './player-card-actions.js';
import { openPlayerCard } from './player-card.js';

vi.mock('./player-quick-actions.js',()=>({mountPlayerQuickActions:vi.fn()}));
vi.mock('./player-card.js', () => ({ openPlayerCard:vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
async function activate(closest) {
  let click;
  vi.stubGlobal('document', { addEventListener:(_name, handler) => { click = handler; } });
  mountPlayerCards();
  const preventDefault = vi.fn();
  click({ target:{ closest }, preventDefault });
  await vi.dynamicImportSettled();
  return preventDefault;
}
describe('shared player-card entry points', () => {
  const button = { dataset:{ playerCard:'7564', playerName:'Ja’Marr Chase', playerTeam:'CIN' } };
  it('opens from the player name with the original focus-return source', async () => {
    await activate(selector => selector === '[data-player-card]' ? button : null);
    expect(openPlayerCard).toHaveBeenCalledWith({ id:'7564', name:'Ja’Marr Chase', team:'CIN' }, { source:button });
  });
  it('opens from the adjacent portrait using the same canonical control', async () => {
    const preventDefault = await activate(selector => selector === '.dfl-player-portrait' ? {} : selector === '.dfl-player' ? { querySelector:() => button } : null);
    expect(openPlayerCard).toHaveBeenCalledWith({ id:'7564', name:'Ja’Marr Chase', team:'CIN' }, { source:button });
    expect(preventDefault).toHaveBeenCalledOnce();
  });
  it('passes the viewed NFL week without substituting its PPR score for league points',async()=>{
    const scoped={dataset:{playerCard:'7564',playerSeason:'2025',playerWeek:'8',playerState:'final',playerPoints:'40'}};
    await activate(selector=>selector==='[data-player-card]'?scoped:null);
    expect(openPlayerCard).toHaveBeenCalledWith({id:'7564',name:undefined,team:undefined},{source:scoped,context:{id:'7564',season:2025,week:8,state:'final'}});
  });
  it('leaves artwork without a player control alone', async () => {
    const preventDefault = await activate(selector => selector === '.dfl-player-portrait' ? {} : null);
    expect(openPlayerCard).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });
});

describe('player-card intent across page changes',()=>{
 function setup(){const handlers=new Map(),doc={addEventListener:vi.fn((name,fn)=>handlers.set(name,fn)),removeEventListener:vi.fn()},win=new EventTarget();vi.stubGlobal('document',doc);vi.stubGlobal('window',win);const stop=mountPlayerCards();const tap=source=>handlers.get('click')({preventDefault:vi.fn(),target:{closest:s=>s==='[data-player-card]'?source:null}});return{handlers,doc,win,stop,tap}}
 it('opens only the last rapid tap rather than replaying queued cards',async()=>{const f=setup(),a={dataset:{playerCard:'a'},isConnected:true},b={dataset:{playerCard:'b'},isConnected:true};f.tap(a);f.tap(b);await vi.dynamicImportSettled();expect(openPlayerCard).toHaveBeenCalledTimes(1);expect(openPlayerCard).toHaveBeenLastCalledWith(expect.objectContaining({id:'b'}),{source:b});f.stop()});
 it('drops an opening when its row disappears or the route changes',async()=>{const f=setup(),a={dataset:{playerCard:'a'},isConnected:true};f.tap(a);a.isConnected=false;await vi.dynamicImportSettled();expect(openPlayerCard).not.toHaveBeenCalled();a.isConnected=true;f.tap(a);f.win.dispatchEvent(new Event('hashchange'));await vi.dynamicImportSettled();expect(openPlayerCard).not.toHaveBeenCalled();f.stop()});
 it('mounts once and warms intent without opening a card',async()=>{const f=setup();mountPlayerCards();expect(f.doc.addEventListener).toHaveBeenCalledTimes(3);const a={dataset:{playerCard:'a'}};f.handlers.get('pointerdown')({target:{closest:s=>s==='[data-player-card]'?a:null}});await vi.dynamicImportSettled();expect(openPlayerCard).not.toHaveBeenCalled();f.stop()});
});
