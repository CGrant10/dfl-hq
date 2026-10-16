export function mountPlayerCards() {
  document.addEventListener('click', event => {
    const compare=event.target.closest('[data-player-compare]');
    if(compare){event.preventDefault();void import('./player-compare.js').then(({openPlayerComparison})=>openPlayerComparison(compare.dataset.playerCompare,{otherId:compare.dataset.compareWith||'',source:compare}));return;}
    const target = event.target.closest('[data-player-card]')
      || (event.target.closest('.dfl-player-portrait') && event.target.closest('.dfl-player')?.querySelector('[data-player-card]'));
    if (!target) return;
    event.preventDefault();
    void import('./player-card.js').then(({ openPlayerCard }) => openPlayerCard({ id: target.dataset.playerCard, name: target.dataset.playerName, team: target.dataset.playerTeam }, { source: target }));
  });
}
