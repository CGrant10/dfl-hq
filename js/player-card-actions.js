export function mountPlayerCards() {
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-player-card]')
      || (event.target.closest('.dfl-player-portrait') && event.target.closest('.dfl-player')?.querySelector('[data-player-card]'));
    if (!target) return;
    event.preventDefault();
    void import('./player-card.js').then(({ openPlayerCard }) => openPlayerCard({ id: target.dataset.playerCard, name: target.dataset.playerName, team: target.dataset.playerTeam }, { source: target }));
  });
}
