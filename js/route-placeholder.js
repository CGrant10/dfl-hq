import { loadingRows } from './loading-presentation.js';

const pages = {
  home: ['The DFL Daily', 'home'], clubhouse: ['Clubhouse', 'clubhouse'],
  sportsbook: ['Sportsbook', 'sportsbook'], trade: ['Trades', 'trade'], analyzer: ['Team Analyzer', 'analyzer'],
  history: ['History', 'archive'], rules: ['League Rules', 'archive'], keepers: ['Keepers', 'archive'],
  finances: ['League Fees', 'ledger'], facts: ['DFL Lore', 'story'], profile: ['Team Profile', 'profile'],
  wall: ['League Wall', 'wall'], notifications: ['Notifications', 'inbox'], stakes: ['Playoff Race', 'matchup'],
  calendar: ['Calendar', 'archive'], polls: ['Polls', 'story'], proposals: ['Proposals', 'story'],
  golf: ['DFL Golf', 'archive'], arena: ['Draft Order', 'archive'], 'arena-beta': ['Draft Order', 'archive'],
  'arena-results': ['Draft Results', 'archive'], broadcast: ['Broadcast', 'matchup'], admin: ['Commissioner', 'archive'],
};
const tabs = '<div class="loading-tabs"><i></i><i></i><i></i></div>';
const panel = (content, className = '') => `<div class="loading-panel ${className}">${content}</div>`;
const faceoff = '<div class="loading-faceoff"><div><i class="loading-avatar"></i><i></i><i></i></div><div><i class="loading-avatar"></i><i></i><i></i></div></div>';
const pairedRows = Array.from({length:3}, () => `<div class="loading-paired-row">${loadingRows(1)}${loadingRows(1)}</div>`).join('');
const offer = panel(`<div class="loading-packages">${loadingRows(1)}${loadingRows(1)}</div><div class="loading-offer-footer"><i></i><i></i></div>`, 'loading-offer');
const metrics = panel(Array.from({length:3}, () => '<div><i></i><i></i></div>').join(''), 'loading-metrics');
const layouts = {
  profile: `${panel('<i class="loading-avatar"></i><div><i></i><i></i></div>','loading-profile')}${metrics}${panel(loadingRows(3))}`,
  ledger: `${tabs}${metrics}${metrics}${panel(loadingRows(5))}`,

  home: `<div class="loading-home-front">${panel(faceoff,'loading-scoreboard')}${panel('<i></i><i></i><i></i>','loading-broadcast')}</div>${tabs}${panel(loadingRows(3),'loading-desk-rows')}`,
  clubhouse: `${tabs}<div class="loading-matchup-rail"><i></i><i></i><i></i></div>${panel(faceoff,'loading-scoreboard')}${panel(pairedRows,'loading-lineups')}`,
  sportsbook: `${tabs}<div class="loading-week"><i></i></div>${panel(pairedRows,'loading-desk-rows')}`,
  trade: `${tabs}${panel('<i></i><i class="loading-action"></i>','loading-setup')}${tabs}${offer}${offer}${offer}`,
  analyzer: `${panel('<i></i><i class="loading-action"></i>', 'loading-setup')}${panel(faceoff)}${panel(loadingRows(4))}`,
  wall: `${panel('<i></i><i></i><i class="loading-action"></i>', 'loading-composer')}${panel(loadingRows(1)+'<div class="loading-story"><i></i><i></i><i></i></div>')}${panel(loadingRows(1)+'<div class="loading-story"><i></i><i></i></div>')}`,
  inbox: `${tabs}${panel(loadingRows(6))}`,
  story: `${panel(loadingRows(1))}${panel('<div class="loading-story"><i></i><i></i><i></i></div>')}${panel(loadingRows(3))}`,
  archive: `${tabs}${panel(loadingRows(4))}${panel(loadingRows(3))}`,
  matchup: `${tabs}${panel(faceoff)}${panel(loadingRows(4))}`,
};
export function routePlaceholder(name) {
  const [title, layout] = Object.hasOwn(pages, name) ? pages[name] : pages.home;
  return `<div class="route-placeholder" id="route-placeholder" role="status" aria-label="Loading ${title}">
    <div class="route-placeholder-inner is-${layout} loading-primary"><div class="loading-route-head"${layout==='profile'?' hidden':''}><p class="route-placeholder-label">${title}</p>${layout==='sportsbook'?'<div class="loading-wallet-preview" aria-hidden="true"><i></i><i></i></div>':''}</div>
      <div class="route-placeholder-art" aria-hidden="true">${layouts[layout]}</div><span class="sr-only">Loading league information.</span>
    </div></div>`;
}
