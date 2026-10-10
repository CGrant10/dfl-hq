import { esc } from './ui.js';
import { playerIdentity } from './player-presentation.js';
import { fitDialogToViewport } from './dialog-viewport.js';
import { animateUi, cancelUiExit, cancelUiMotion, exitUi } from './ui-motion.js';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function filterTradePlayers(rows, query = '', position = 'all') {
  const words = normalize(query).split(' ').filter(Boolean);
  return rows.filter(row => (position === 'all' || row.player.position === position)
    && words.every(word => normalize([row.player.name, row.player.position, row.player.nflTeam || row.player.team, row.owner].join(' ')).includes(word)));
}
const selectorFor = select => select.matches('[data-tb-league-target]') ? '[data-tb-league-target]'
  : `[data-tb-add-anchor="${select.dataset.tbAddAnchor}"]`;
export function focusTradePicker(select) {
  (select?.previousElementSibling?.matches('[data-trade-picker]') ? select.previousElementSibling : select)?.focus({ preventScroll:true });
}

let dialog, active, position = 'all';
function setup() {
  if (dialog) return;
  dialog = document.createElement('dialog');
  dialog.className = 'trade-player-picker';
  dialog.setAttribute('aria-labelledby', 'trade-picker-title');
  dialog.innerHTML = '<header><div><small data-picker-context></small><h2 id="trade-picker-title" tabindex="-1" autofocus>Add a player</h2></div><button type="button" class="linkbtn" data-picker-close>Close</button></header><div class="trade-picker-search"><label class="sr-only" for="trade-picker-search">Search players or teams</label><input id="trade-picker-search" type="search" placeholder="Search players or teams…" autocomplete="off"><div class="trade-picker-positions" aria-label="Filter by position"></div><p role="status" data-picker-count></p></div><div class="trade-picker-list" data-picker-list></div>';
  document.body.append(dialog);
  const dismiss = (options = {}) => exitUi(dialog, () => dialog.close(), options);
  dialog.querySelector('[data-picker-close]').onclick = () => dismiss();
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  // A populated search input consumes Escape to clear itself in Chromium.
  // The sheet uses the same one-press dismissal as the other DFL dialogs.
  dialog.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); dismiss(); } });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) { dismiss(); return; }
    const filter = event.target.closest('[data-picker-position]');
    if (filter) { position = filter.dataset.pickerPosition; draw(); return; }
    const choice = event.target.closest('[data-picker-player]');
    if (!choice || !active) return;
    const { select, root, selector } = active;
    const id = choice.dataset.pickerPlayer;
    // Only offer the current select's available options. A redraw invalidates
    // an open sheet instead of applying a choice to a different roster.
    if (!select.isConnected || ![...select.options].some(option => option.value === id && !option.disabled)) { dismiss({ immediate:true }); return; }
    dialog.close();
    select.value = id;
    select.dispatchEvent(new Event('change', { bubbles:true }));
    focusTradePicker(root.querySelector(selector) || root.querySelector('[data-tb-add-anchor="receive"]'));
  });
  dialog.querySelector('input').addEventListener('input', () => draw());
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    cancelUiExit(dialog); cancelUiMotion(dialog);
    if (active) focusTradePicker(active.select.isConnected ? active.select : active.root.querySelector(active.selector));
    active = null;
  });
  window.addEventListener('hashchange', () => { if (dialog.open) dismiss({ immediate:true }); });
}
function draw() {
  if (!active) return;
  const rows = filterTradePlayers(active.rows, dialog.querySelector('input').value, position);
  for (const button of dialog.querySelectorAll('[data-picker-position]')) button.setAttribute('aria-pressed', String(button.dataset.pickerPosition === position));
  dialog.querySelector('[data-picker-count]').textContent = `${rows.length} player${rows.length === 1 ? '' : 's'}`;
  dialog.querySelector('[data-picker-list]').innerHTML = rows.length ? rows.map(({ player:p, owner }) => {
    const projection = Number(p.expectedPerGame);
    const hasProjection = p.expectedPerGame != null && Number.isFinite(projection);
    const value = Number(p.tradeValue);
    const tradeValue = p.tradeValue != null && Number.isFinite(value) ? Math.round(value) : '—';
    const label = ['Add '+p.name, p.position, p.nflTeam || p.team, owner, p.injuryStatus, hasProjection ? `Projected ${projection.toFixed(1)} points per game` : 'Projection unavailable', 'Trade value '+tradeValue].filter(Boolean).join(', ');
    return `<button type="button" class="trade-picker-player" data-picker-player="${esc(p.id)}" aria-label="${esc(label)}"><span class="trade-picker-identity">${playerIdentity({ ...p, injuryStatus:'' })}${p.injuryStatus ? `<small class="trade-picker-injury">${esc(p.injuryStatus)}</small>` : ''}${owner ? `<small class="trade-picker-owner">${esc(owner)}</small>` : ''}</span><span class="trade-picker-stat"><b>${hasProjection ? projection.toFixed(1) : '—'}</b><small>Proj / game</small><span>Value ${tradeValue}</span></span></button>`;
  }).join('') : '<p class="trade-picker-empty">No matching players. Try another name or position.</p>';
  dialog.querySelector('[data-picker-list]').scrollTop = 0;
}
function open(select, root, pool, teams) {
  setup(); cancelUiExit(dialog); cancelUiMotion(dialog);
  const rows = [...select.options].filter(option => option.value && !option.disabled).map(option => {
    const player = pool.get(String(option.value));
    const owner = teams.find(team => (team.playerIds || []).some(id => String(id) === option.value));
    return { player, owner:owner?.team_name || owner?.ownerName || option.parentElement?.label || '' };
  }).filter(row => row.player);
  active = { select, root, selector:selectorFor(select), rows };
  position = 'all';
  dialog.querySelector('input').value = '';
  dialog.querySelector('h2').textContent = select.dataset.tbAddAnchor === 'send' ? 'Players you offer' : 'Players you want';
  dialog.querySelector('[data-picker-context]').textContent = select.matches('[data-tb-league-target]') ? 'SHOP THE LEAGUE' : 'BUILD THE PACKAGE';
  const positions = [...new Set(rows.map(row => row.player.position).filter(Boolean))].sort((a,b) => ['QB','RB','WR','TE','K','DEF'].indexOf(a) - ['QB','RB','WR','TE','K','DEF'].indexOf(b));
  dialog.querySelector('.trade-picker-positions').innerHTML = ['all', ...positions].map(pos => `<button type="button" data-picker-position="${esc(pos)}" aria-pressed="${pos === 'all'}">${pos === 'all' ? 'All' : esc(pos)}</button>`).join('');
  draw();
  dialog.showModal(); fitDialogToViewport(dialog);
  dialog.querySelector('h2').focus({ preventScroll:true });
  animateUi(dialog, [{ opacity:0, transform:'translateY(14px)' }, { opacity:1, transform:'translateY(0)' }], { duration:220 });
}
export function mountTradePlayerPickers(root, pool, teams) {
  for (const select of root.querySelectorAll('select[data-tb-add-anchor],select[data-tb-league-target]')) {
    if (select.previousElementSibling?.matches('[data-trade-picker]')) continue;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'trade-picker-trigger';
    button.dataset.tradePicker = select.dataset.tbAddAnchor || 'league';
    button.setAttribute('aria-label', select.getAttribute('aria-label'));
    button.setAttribute('aria-haspopup', 'dialog');
    button.innerHTML = '<span aria-hidden="true">+</span> Add player';
    button.disabled = ![...select.options].some(option => option.value && !option.disabled);
    button.addEventListener('click', () => open(select, root, pool, teams));
    select.before(button); select.hidden = true;
  }
}
