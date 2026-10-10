import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountPlayerCards } from './player-card-actions.js';
import { openPlayerCard } from './player-card.js';

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
  it('leaves artwork without a player control alone', async () => {
    const preventDefault = await activate(selector => selector === '.dfl-player-portrait' ? {} : null);
    expect(openPlayerCard).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
