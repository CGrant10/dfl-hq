const pages = {
  home: ['The Clubhouse', 'matchup'], clubhouse: ['Clubhouse', 'matchup'],
  sportsbook: ['Sportsbook', 'workbench'], trade: ['Trade Board', 'workbench'], analyzer: ['Team Analyzer', 'workbench'],
  history: ['History', 'archive'], rules: ['League Rules', 'archive'], keepers: ['Keepers', 'archive'],
  finances: ['League Fees', 'archive'], facts: ['DFL Lore', 'story'], profile: ['Team Profile', 'story'],
  wall: ['League Wall', 'story'], notifications: ['Notifications', 'story'], stakes: ['Playoff Race', 'matchup'],
  calendar: ['Calendar', 'archive'], polls: ['Polls', 'story'], proposals: ['Proposals', 'story'],
  golf: ['DFL Golf', 'archive'], arena: ['Draft Order', 'archive'], 'arena-beta': ['Draft Order', 'archive'],
  'arena-results': ['Draft Results', 'archive'], broadcast: ['Broadcast', 'matchup'], admin: ['Commissioner', 'archive'],
};
export function routePlaceholder(name) {
  const [title, layout] = pages[name] || pages.home;
  return `<div class="route-placeholder" id="route-placeholder" role="status" aria-label="Loading ${title}">
    <div class="route-placeholder-inner is-${layout}"><p class="route-placeholder-label">${title}</p>
      <div class="route-placeholder-art" aria-hidden="true"><div class="route-placeholder-head"><i></i><i></i></div>
        <div class="route-placeholder-tabs"><i></i><i></i><i></i></div>
        <div class="route-placeholder-panel"><i></i><i></i><i></i></div>
        <div class="route-placeholder-panel"><i></i><i></i></div>
      </div><span class="sr-only">Loading league information.</span>
    </div></div>`;
}
