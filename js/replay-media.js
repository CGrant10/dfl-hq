import {highlightPosterUrl} from './home-highlight-ui.js';
import {animateUi,cancelUiMotion} from './ui-motion.js';
export function mountReplayMedia(screen,{motion=()=>true,onEnded=()=>{},onError=()=>{},onPlaying=(_playing)=>{}}={}){
 let generation=0,video=null,muted=false,volume=1;
 const release=()=>{generation++;if(video){muted=video.muted;volume=video.volume;video.pause();video.removeAttribute('src');video.load()}screen.removeAttribute('aria-busy');screen.removeAttribute('data-reel-loading')};
 return {
  show(clip){
   release();const token=generation;
   const cover=document.createElement('img');cover.className='reel-frame-cover';cover.alt='';cover.src=highlightPosterUrl(clip.thumbnail_url);cover.setAttribute('aria-hidden','true');
   video=document.createElement('video');const next=video;next.controls=true;next.playsInline=true;next.preload='auto';next.muted=muted;next.volume=volume;next.poster=cover.src;next.src=clip.video_url;next.setAttribute('aria-label',clip.headline);
   screen.setAttribute('aria-busy','true');screen.dataset.reelLoading='';screen.replaceChildren(next,cover);
   let shown=false;
   const reveal=()=>{if(shown||token!==generation||next.readyState<2)return;shown=true;screen.removeAttribute('aria-busy');screen.removeAttribute('data-reel-loading');const animation=animateUi(cover,[{opacity:1},{opacity:0}],{motion:motion(),duration:160});if(animation)animation.finished.then(()=>cover.remove(),()=>{if(token===generation)cover.remove()});else cover.remove()};
   next.addEventListener('loadeddata',reveal);next.addEventListener('playing',()=>{reveal();if(token===generation)onPlaying(true)});next.addEventListener('pause',()=>{if(token===generation)onPlaying(false)});
   next.addEventListener('error',()=>{if(token!==generation||!next.hasAttribute('src'))return;screen.removeAttribute('aria-busy');screen.removeAttribute('data-reel-loading');onError()});
   next.addEventListener('ended',()=>{if(token===generation)onEnded()});
   void next.play().catch(()=>{/* Native controls remain available after an autoplay refusal. */});
  },
  pause(){video?.pause()},release,stop(){release();cancelUiMotion(screen)},
 };
}
