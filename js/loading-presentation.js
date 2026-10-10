import { esc } from './ui.js';
import { animateUi } from './ui-motion.js';

// Decorative geometry only: pending data never masquerades as a real score.
export function loadingRows(count = 3) {
  return Array.from({ length: count }, () => '<div class="loading-row"><i class="loading-avatar"></i><span><i></i><i></i></span><i class="loading-value"></i></div>').join('');
}
export function playerCardPlaceholder(name = '') {
  return `<section data-player-card-loading role="status" aria-label="Loading player details"><span class="sr-only">Loading player details.</span>
    <div class="loading-player-identity"><i class="loading-player-portrait" aria-hidden="true"></i><div>${name ? `<strong>${esc(name)}</strong>` : '<i aria-hidden="true"></i>'}<div aria-hidden="true"><i></i><i></i></div></div></div>
    <div class="loading-player-details" aria-hidden="true"><i></i><div class="loading-player-score"><i></i><i></i></div><div class="loading-player-form"><i></i><div><i></i><i></i><i></i></div></div><div class="loading-player-stats">${loadingRows(3)}</div></div>
  </section>`;
}

// Opt-in, first completion only. Refreshes, scores, and controls never replay it.
export function finishLoadingContent(host) {
  if (!host || host.dataset.contentState !== 'loading') return;
  host.dataset.contentState = 'ready';
  host.removeAttribute('aria-busy');
  if (!host.isConnected || host.closest('.is-route-loading,[hidden],[data-ui-closing]')) return;
  const box = host.getBoundingClientRect();
  if (box.bottom <= 44 || box.top >= innerHeight - 48 || !host.getClientRects().length) return;
  animateUi(host, [{ opacity: .65 }, { opacity: 1 }], { duration: 160 });
}
