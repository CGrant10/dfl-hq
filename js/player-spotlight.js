import { openPlayerCard, updatePlayerCard, closePlayerCard } from './player-card.js';

// GameDay and Watch supply the same card with their authoritative live score.
export function mountPlayerSpotlight(root, { getModel, getMotion = () => true }) {
  let selection = null;
  const context = () => {
    const model = getModel();
    const p = model?.games.flatMap(g => g.sides).flatMap(t => [...t.lineup, ...t.bench]).find(p => p.id === selection?.id && p.roster === selection?.roster && !p.empty);
    return p ? { ...p, season: model.season, week: model.week } : null;
  };
  const click = event => {
    const button = event.target.closest('[data-gameday-player]');
    if (!button || button.closest('dialog') !== root.closest('dialog')) return;
    selection = { id: button.dataset.gamedayPlayer, roster: button.dataset.playerRoster };
    void openPlayerCard(selection, { context: context(), motion: getMotion(), source: button });
  };
  root.addEventListener('click', click);
  return { setMotion(value) { updatePlayerCard(context(), value); }, update() { updatePlayerCard(context(), getMotion()); }, stop() { closePlayerCard(context()); root.removeEventListener('click', click); } };
}
