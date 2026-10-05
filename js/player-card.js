import { esc } from './ui.js';
import { playerIdentity } from './player-presentation.js';
import { currentMember } from './members.js';
import { thermalScore, playerTemperature } from './score-temperature.js';
import { mountScoreVfx } from './score-vfx.js';
import { loadPlayerCard } from './player-card-data.js';

let dialog, body, request = 0, opener, returnContainer, activeContext = null;
function setup() {
  if (dialog) return;
  dialog = document.createElement('dialog');
  dialog.className = 'gameday-spotlight dfl-player-card';
  dialog.setAttribute('aria-labelledby', 'dfl-player-card-title');
  dialog.innerHTML = '<header><h2 id="dfl-player-card-title" tabindex="-1" autofocus>Player card</h2><button type="button" class="linkbtn" data-player-card-close>Close</button></header><div data-player-card-body></div>';
  document.body.append(dialog); body = dialog.querySelector('[data-player-card-body]');
  mountScoreVfx(dialog);
  dialog.querySelector('[data-player-card-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    request++; activeContext = null;
    const selector = opener?.dataset.playerCard ? `[data-player-card="${CSS.escape(opener.dataset.playerCard)}"]` : opener?.dataset.gamedayPlayer ? `[data-gameday-player="${CSS.escape(opener.dataset.gamedayPlayer)}"][data-player-roster="${CSS.escape(opener.dataset.playerRoster)}"]` : null;
    const replacement = selector && returnContainer?.isConnected ? returnContainer.querySelector(selector) : null;
    (opener?.isConnected ? opener : replacement)?.focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', () => { if (dialog.open) dialog.close(); });
}
function render(model) {
  const p = model.player, me = currentMember();
  const props = ['QB', 'RB', 'WR', 'TE'].includes(p.position);
  const trade = model.owner && model.myRosterId != null && String(model.owner.id) !== String(model.myRosterId) && me?.sleeper_user_id;
  const state = { live: 'Live', final: 'Final', upcoming: 'Yet to play', unknown: 'Status pending' }[model.state] || 'Recorded stats';
  body.innerHTML = `${playerIdentity(p)}<div class="player-card-owner"><small>DFL ROSTER</small>${model.owner?.memberId ? `<a href="#/profile?id=${esc(model.owner.memberId)}">${esc(model.ownerLabel)}</a>` : `<strong>${esc(model.ownerLabel)}</strong>`}</div><div class="player-card-availability"><b>${esc(model.injury.tag)}</b><span>${esc([model.injury.availability, model.injury.body].filter(Boolean).join(' · '))}</span></div><div class="gameday-spotlight-score"><span>${thermalScore(model.points, playerTemperature(model.points, model.state, model.afterHalftime), { tag: 'strong' })}<small>Fantasy points</small></span><span>${esc(state)} · Week ${model.week}</span></div><section class="player-card-recent" aria-label="Recent fantasy points"><h3>Recent form</h3><dl>${model.recent.map(r => `<div><dt>Week ${r.week}</dt><dd>${r.points == null ? '—' : r.points.toFixed(2)}${r.stale ? '<small>Last available</small>' : ''}</dd></div>`).join('')}</dl></section>${model.stats.items.length ? `<dl class="gameday-stat-grid">${model.stats.items.map(s => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('')}</dl>` : '<p class="player-card-empty">Game stats unavailable.</p>'}<nav class="player-card-actions" aria-label="Player actions">${props ? `<a class="linkbtn" href="#/sportsbook?player=${encodeURIComponent(p.name)}">Player props</a>` : ''}${trade ? `<a class="linkbtn" href="#/trade?team=${encodeURIComponent(model.myRosterId)}&target=${encodeURIComponent(p.id)}&partner=${encodeURIComponent(model.owner.id)}">Explore a trade</a>` : ''}<a class="linkbtn" href="#/analyzer">Team analyzer</a></nav>${model.stats.updatedAt ? `<time class="gameday-stat-time" datetime="${esc(new Date(model.stats.updatedAt).toISOString())}">Stats · ${esc(new Date(model.stats.updatedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }))}</time>` : ''}`;
}
export async function openPlayerCard(selection, { context = null, motion = true, source = document.activeElement } = {}) {
  setup(); const token = ++request; opener = source; returnContainer = source?.closest('dialog') || source?.closest('#view'); activeContext = context;
  dialog.dataset.motion = motion ? 'on' : 'off';
  body.innerHTML = '<p role="status">Loading player…</p>';
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('h2').focus({ preventScroll: true });
  try { const model = await loadPlayerCard(selection, context); if (token === request && dialog.open) render(model); }
  catch (error) { if (token === request && dialog.open) { body.innerHTML = `<p role="status">${esc(error.message || 'Player data unavailable.')}</p><button type="button" class="linkbtn" data-player-card-retry>Retry</button>`; body.querySelector('button').onclick = () => void openPlayerCard(selection, { context, motion, source }); } }
}
export function updatePlayerCard(context, motion = true) {
  if (!dialog?.open || !activeContext || String(activeContext.id) !== String(context?.id)) return;
  activeContext = context; dialog.dataset.motion = motion ? 'on' : 'off';
  const score = body.querySelector('.gameday-spotlight-score > span');
  if (score) score.innerHTML = `${thermalScore(context.points, playerTemperature(context.points, context.state, context.afterHalftime), { tag: 'strong' })}<small>Fantasy points</small>`;
  const status = body.querySelector('.gameday-spotlight-score > span:last-child');
  if (status) status.textContent = `${{ live:'Live', final:'Final', upcoming:'Yet to play', unknown:'Status pending' }[context.state] || 'Recorded stats'} · Week ${context.week}`;
}
export function closePlayerCard(context) {
  if (dialog?.open && activeContext && String(activeContext.id) === String(context?.id)) dialog.close();
}
