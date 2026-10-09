import { accentOf } from './identity-rules.js';

const number = value => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;

export function playerScoreMoment(before, after) {
  const from = number(before), to = number(after);
  if (from == null || to == null || to <= from) return null;
  const milestone = [40, 30, 20].find(points => from < points && to >= points);
  if (milestone) return { kind: 'milestone', points: milestone, label: `${milestone}-point game` };
  return Math.round((to - from) * 100) / 100 >= 6 ? { kind: 'surge', label: 'Score surge' } : null;
}

function visible(element, root) {
  if (!element?.getClientRects().length || element.closest('[hidden]')) return false;
  const box = element.getBoundingClientRect();
  const dashboard = root.querySelector('.gd-watch-dashboard');
  return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight
    && box.right > 0 && box.left < innerWidth
    && (!dashboard || element.closest('.gd-watch-dashboard') || box.top >= dashboard.getBoundingClientRect().bottom);
}

// Short broadcast stings live inside existing rows; recorded numbers never move.
export function animateGameDayMoments(root, { previous, model, gameId = null }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const modal = [...document.querySelectorAll('dialog[open]')].at(-1);
  if (!previous || model.completed || reduced.matches || document.visibilityState !== 'visible'
    || root.closest('[data-motion="off"]') || modal && root.closest('dialog') !== modal
    || root.closest('dialog') && !root.closest('dialog').open) return () => {};
  const animations = [], nodes = [], restorations = [];
  let stopped = false, active = 0;
  const play = (node, frames, timing) => {
    if (node?.animate) animations.push(node.animate(frames, timing));
  };
  const sting = (surface, caption, label, color, milestone = false) => {
    const clip = document.createElement('span');
    clip.className = `gd-moment-clip${milestone ? ' is-milestone' : ''}`;
    clip.setAttribute('aria-hidden', 'true');
    clip.style.setProperty('--gd-moment-color', color);
    const sweep = document.createElement('span'); sweep.className = 'gd-moment-sweep'; clip.append(sweep);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('gd-moment-frame');
    const frame = document.createElementNS(svg.namespaceURI, 'rect');
    for (const [name, value] of Object.entries({ x: 1, y: 1, width: 98, height: 98, rx: 3, pathLength: 1, 'vector-effect': 'non-scaling-stroke' })) frame.setAttribute(name, String(value));
    svg.append(frame); clip.append(svg); surface.prepend(clip); nodes.push(clip);
    surface.classList.add('gd-moment-active');
    const original = caption?.textContent;
    if (caption) { caption.textContent = label; caption.classList.add('gd-moment-caption'); }
    const restore = () => {
      clip.remove(); surface.classList.remove('gd-moment-active');
      if (caption) {
        if (caption.textContent === label) caption.textContent = original;
        caption.classList.remove('gd-moment-caption');
      }
    };
    restorations.push(restore);
    play(sweep, [
      { transform: 'translateX(-180%) skewX(-18deg)', opacity: 0 },
      { opacity: .28, offset: .25 },
      { transform: 'translateX(450%) skewX(-18deg)', opacity: 0 },
    ], { duration: 1050, easing: 'cubic-bezier(.18,.75,.3,1)', fill: 'forwards' });
    play(frame, [
      { strokeDashoffset: '1', opacity: 0 },
      { strokeDashoffset: '0', opacity: .8, offset: .25 },
      { strokeDashoffset: '0', opacity: .35, offset: .75 },
      { strokeDashoffset: '0', opacity: 0 },
    ], { duration: milestone ? 3600 : 2700, easing: 'ease-out', fill: 'forwards' });
    if (milestone) {
      const photo = surface.querySelector('.dfl-player-portrait img');
      play(photo, [{ transform: 'scale(1)' }, { transform: 'scale(1.07)', offset: .35 }, { transform: 'scale(1)' }],
        { duration: 1200, easing: 'cubic-bezier(.18,.75,.3,1)' });
    }
    if (caption?.animate) {
      const animation = caption.animate([
        { opacity: 0, transform: 'translateY(3px)' },
        { opacity: 1, transform: 'translateY(0)', offset: .08 },
        { opacity: 1, transform: 'translateY(0)', offset: .9 },
        { opacity: 0, transform: 'translateY(-2px)' },
      ], { duration: milestone ? 4000 : 3000, easing: 'ease-out' });
      active++; animations.push(animation);
      animation.onfinish = () => { restore(); if (--active === 0) stop(); };
    } else {
      // A browser without Web Animations keeps the original static presentation.
      restore();
    }
  };

  const game = (model.games || []).find(game => gameId ? game.id === gameId : game.isMine);
  if (game?.leader && Object.hasOwn(previous.leaders || {}, game.id)
    && previous.leaders[game.id] !== game.leader && game.sides.some(team => team.live > 0)) {
    const surface = root.querySelector(`[data-gameday-team="${CSS.escape(game.leader)}"]`);
    if (visible(surface, root)) {
      const team = game.sides.find(team => team.roster === game.leader);
      sting(surface, surface.querySelector('.home-team-progress') || surface.querySelector(':scope > small'),
        'New lead', accentOf(team?.identity));
    }
  }

  const players = new Map((model.starters || []).map(player => [`${player.roster}:${player.id}`, player]));
  const candidates = [...root.querySelectorAll('[data-gameday-score-key]')].map(host => {
    const key = host.dataset.gamedayScoreKey, player = players.get(key);
    const moment = player?.state === 'live' && ['QB', 'RB', 'WR', 'TE'].includes(player.position)
      ? playerScoreMoment(previous.points?.[key], model.snapshot.points[key]) : null;
    const surface = host.closest('.gameday-player');
    return moment && visible(surface, root) ? { surface, moment, player } : null;
  }).filter(Boolean).sort((a, b) => (b.moment.points || 0) - (a.moment.points || 0));
  for (const { surface, moment, player } of candidates.slice(0, 3)) {
    const portrait = surface.querySelector('.dfl-player-portrait');
    const color = portrait ? getComputedStyle(portrait).getPropertyValue('--player-primary').trim() : '';
    sting(surface, surface.querySelector('.dfl-player-copy small'), moment.label,
      /^#[0-9a-f]{3,8}$/i.test(color) ? color : accentOf(player.identity), moment.kind === 'milestone');
  }
  const stop = () => {
    if (stopped) return; stopped = true;
    animations.forEach(animation => { animation.onfinish = null; animation.cancel(); });
    restorations.forEach(restore => restore()); nodes.forEach(node => node.remove());
    reduced.removeEventListener('change', onReduce); document.removeEventListener('visibilitychange', onVisibility);
  };
  const onReduce = () => { if (reduced.matches) stop(); };
  const onVisibility = () => { if (document.visibilityState !== 'visible') stop(); };
  if (animations.length) { reduced.addEventListener('change', onReduce); document.addEventListener('visibilitychange', onVisibility); }
  return stop;
}
