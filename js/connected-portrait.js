import { animateUi, cancelUiMotion } from './ui-motion.js';

const inViewport = rect => rect.width > 0 && rect.height > 0 && rect.top >= 44 && rect.bottom <= innerHeight - 48 && rect.left >= 0 && rect.right <= innerWidth;

// A short-lived top-layer portrait connects a visible source to its detail.
// It never takes focus, intercepts a tap, or remains after cancellation.
export function connectPortrait(source, target, { motion = true, duration = 280, hideSource = false, origin = null, easing, hold = false, lift = 0 } = {}) {
  const portrait = source?.matches?.('.dfl-player-portrait') ? source : source?.querySelector('.dfl-player-portrait') || source?.closest('.dfl-player')?.querySelector('.dfl-player-portrait');
  if (!portrait?.isConnected || !target?.isConnected || !HTMLElement.prototype.showPopover) return () => {};
  const from = origin || portrait.getBoundingClientRect(), to = target.getBoundingClientRect();
  if (!inViewport(from) || !inViewport(to)) return () => {};
  const style = getComputedStyle(target), originStyle = getComputedStyle(portrait);
  const overlay = document.createElement('div');
  overlay.className = 'dfl-connected-portrait';
  overlay.setAttribute('popover', 'manual'); overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, { position:'fixed', inset:'auto', margin:'0', padding:'0', pointerEvents:'none', overflow:'hidden', boxSizing:'border-box',
    left:`${to.left}px`, top:`${to.top}px`, width:`${to.width}px`, height:`${to.height}px`, background:style.background, color:style.color, border:style.border, borderRadius:style.borderRadius, transformOrigin:'top left' });
  const photo = portrait.querySelector('img');
  let pendingImage=null,photoReady=null;
  if (photo?.src) {
    const image = document.createElement('img'),ready=photo.complete&&photo.naturalWidth;
    image.alt = '';
    Object.assign(image.style, { display:'block', width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' });
    if (portrait.classList.contains('is-team')) Object.assign(image.style, { objectFit:'contain', padding:'10px', boxSizing:'border-box' });
    if(!ready){
      // A late headshot fades into the travelling portrait at its current size.
      // It cannot move the card, replay the flight or survive its cancellation.
      const fallback=document.createElement('span');fallback.textContent=portrait.querySelector('i')?.textContent||'';
      Object.assign(overlay.style,{display:'grid',placeItems:'center',font:style.font});
      fallback.style.gridArea='1 / 1';image.style.gridArea='1 / 1';image.style.opacity='0';overlay.append(fallback);
      pendingImage=image;photoReady=()=>{if(stopped)return;image.style.opacity='1';const fade=animateUi(image,[{opacity:0},{opacity:1}],{duration:160,motion});if(fade)fade.finished.then(()=>fallback.remove(),()=>{});else fallback.remove();};
      image.addEventListener('load',photoReady,{once:true});
    }
    image.src=photo.currentSrc||photo.src;overlay.append(image);
  } else {
    overlay.textContent = portrait.querySelector('i')?.textContent || '';
    Object.assign(overlay.style, { display:'grid', placeItems:'center', font:style.font });
  }
  document.body.append(overlay); overlay.showPopover();
  const animation = animateUi(overlay, [
    { transform:`translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width},${from.height / to.height})`, borderRadius:originStyle.borderRadius },
    ...(lift?[{offset:.62,transform:`translate(${(from.left-to.left)*.16}px,${(from.top-to.top)*.16-lift}px) scale(${1+(from.width/to.width-1)*.16},${1+(from.height/to.height-1)*.16})`,borderRadius:style.borderRadius}]:[]),
    { transform:'translate(0,0) scale(1,1)', borderRadius:style.borderRadius },
  ], { duration, motion, ...(easing ? { easing } : {}) });
  const visibility = target.style.visibility;
  const sourceVisibility = portrait.style.visibility;
  let stopped = false,settle;
  const finished=new Promise(resolve=>settle=resolve);
  const stop = () => { if (stopped) return; stopped = true; settle(false);if(pendingImage)pendingImage.removeEventListener('load',photoReady);cancelUiMotion(overlay); overlay.remove(); target.style.visibility = visibility; if (hideSource) portrait.style.visibility = sourceVisibility;
    window.removeEventListener('resize',stop);window.removeEventListener('scroll',stop,true);window.removeEventListener('dfl:ui-motion-change',stop);window.visualViewport?.removeEventListener('resize',stop);document.removeEventListener('visibilitychange',stop);
  };
  stop.position=()=>!stopped&&overlay.isConnected?overlay.getBoundingClientRect():null;
  stop.finished=finished;
  window.addEventListener('resize',stop);window.addEventListener('scroll',stop,true);window.addEventListener('dfl:ui-motion-change',stop);window.visualViewport?.addEventListener('resize',stop);document.addEventListener('visibilitychange',stop);
  if (animation) { target.style.visibility = 'hidden'; if (hideSource) portrait.style.visibility = 'hidden'; animation.finished.then(()=>{settle(true);if(!hold)stop()}, stop); }
  else stop();
  return stop;
}
