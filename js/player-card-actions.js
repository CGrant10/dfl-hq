import {mountPlayerQuickActions} from './player-quick-actions.js';
export function mountPlayerCards() {
  mountPlayerQuickActions();
  document.addEventListener('click', event => {
    const compare=event.target.closest('[data-player-compare]');
    if(compare){event.preventDefault();void import('./player-compare.js').then(({openPlayerComparison})=>openPlayerComparison(compare.dataset.playerCompare,{otherId:compare.dataset.compareWith||'',source:compare}));return;}
    const target = event.target.closest('[data-player-card]')
      || (event.target.closest('.dfl-player-portrait') && event.target.closest('.dfl-player')?.querySelector('[data-player-card]'));
    if (!target) return;
    event.preventDefault();
    const context=playerCardScope(target);
    void import('./player-card.js').then(({ openPlayerCard }) => openPlayerCard({ id: target.dataset.playerCard, name: target.dataset.playerName, team: target.dataset.playerTeam }, { source: target, ...(context?{context}:{}) }));
  });
}

export function playerCardScope(source){
 const season=Number(source?.dataset.playerSeason),week=Number(source?.dataset.playerWeek);
 if(!Number.isInteger(season)||season<2000||!Number.isInteger(week)||week<1||week>18)return null;
 return {id:source.dataset.playerCard,season,week,state:['live','final','upcoming'].includes(source.dataset.playerState)?source.dataset.playerState:''};
}
