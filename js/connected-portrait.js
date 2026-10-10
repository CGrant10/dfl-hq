import { animateUi, cancelUiMotion } from './ui-motion.js';

const inViewport = rect => rect.width > 0 && rect.height > 0 && rect.top >= 44 && rect.bottom <= innerHeight - 48 && rect.left >= 0 && rect.right <= innerWidth;

// A short-lived top-layer portrait connects a visible source to its detail.
// It never takes focus, intercepts a tap, or remains after cancellation.
export function connectPortrait(source, target, { motion = true } = {}) {
  const portrait = source?.querySelector('.dfl-player-portrait') || source?.closest('.dfl-player')?.querySelector('.dfl-player-portrait');
  if (!portrait?.isConnected || !target?.isConnected || !HTMLElement.prototype.showPopover) return () => {};
  const from = portrait.getBoundingClientRect(), to = target.getBoundingClientRect();
  if (!inViewport(from) || !inViewport(to)) return () => {};
  const style = getComputedStyle(target), originStyle = getComputedStyle(portrait);
  const overlay = document.createElement('div');
  overlay.className = 'dfl-connected-portrait';
  overlay.setAttribute('popover', 'manual'); overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, { position:'fixed', inset:'auto', margin:'0', padding:'0', pointerEvents:'none', overflow:'hidden', boxSizing:'border-box',
    left:`${to.left}px`, top:`${to.top}px`, width:`${to.width}px`, height:`${to.height}px`, background:style.background, color:style.color, border:style.border, borderRadius:style.borderRadius, transformOrigin:'top left' });
  const photo = portrait.querySelector('img');
  if (photo?.complete && photo.naturalWidth) {
    const image = document.createElement('img'); image.src = photo.currentSrc || photo.src; image.alt = '';
    Object.assign(image.style, { display:'block', width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' });
    if (portrait.classList.contains('is-team')) Object.assign(image.style, { objectFit:'contain', padding:'10px', boxSizing:'border-box' });
    overlay.append(image);
  } else {
    overlay.textContent = portrait.querySelector('i')?.textContent || '';
    Object.assign(overlay.style, { display:'grid', placeItems:'center', font:style.font });
  }
  document.body.append(overlay); overlay.showPopover();
  const animation = animateUi(overlay, [
    { transform:`translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width},${from.height / to.height})`, borderRadius:originStyle.borderRadius },
    { transform:'translate(0,0) scale(1,1)', borderRadius:style.borderRadius },
  ], { duration:280, motion });
  const visibility = target.style.visibility;
  const stop = () => { cancelUiMotion(overlay); overlay.remove(); target.style.visibility = visibility; };
  if (animation) { target.style.visibility = 'hidden'; animation.finished.then(stop, stop); }
  else stop();
  return stop;
}
