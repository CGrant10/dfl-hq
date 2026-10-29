import {viewingMatchupFrom,setViewingMatchup,applyViewingMatchup} from './matchup-view-context.js';
import {animateUi,cancelUiMotion} from './ui-motion.js';

// One owner and one native video. Moving the screen never assigns a new source.
let dock=null;
export const isReplayDocked=media=>!!dock&&dock.media===media;
export function detachReplayDock(media){if(isReplayDocked(media)){dock.restore=null;dock.placeholder.remove()}}
export function closeReplayDock(){dock?.dispose()}
export function restoreReplayDock(media){
 if(!isReplayDocked(media)||!dock.restore||!dock.placeholder.isConnected)return false;
 const entry=dock,restore=entry.restore;entry.placeholder.replaceWith(entry.screen);entry.cleanup();restore();return true;
}
export function dockReplay({screen,media,clip,restore}){
 const video=screen?.querySelector('video');if(!video||!clip?.video_url)return false;const matchup=viewingMatchupFrom(screen);
 closeReplayDock();const placeholder=document.createComment('Replay screen');screen.before(placeholder);
 const host=document.createElement('aside');host.className='replay-dock';host.setAttribute('aria-label','Playing highlight');host.dataset.noSwipe='';
 host.innerHTML='<div class="replay-dock-bar"><button type="button" data-dock-expand aria-label="Expand video"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5" fill="none" stroke="currentColor" stroke-width="2"/></svg></button><span></span><button type="button" data-dock-close aria-label="Close video">×</button></div><div data-dock-screen></div>';
 host.querySelector('.replay-dock-bar span').textContent=clip.game_label;setViewingMatchup(host,matchup);
 const wasPlaying=!video.paused,time=video.currentTime;host.querySelector('[data-dock-screen]').append(screen);document.body.append(host);
 // Safari may pause a reparented video. Resume only a video already playing;
 // a browser refusal leaves the native play controls available.
 const resume=()=>{if(wasPlaying&&video.paused&&video.currentTime>=time-.5)void video.play().catch(()=>{})};resume();
 let full=null,closed=false;
 const hide=()=>{if(document.hidden)media.pause()};
 const cleanup=()=>{
  if(closed)return;closed=true;clearTimeout(expiry);document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',dispose);window.removeEventListener('hashchange',navigate);
  cancelUiMotion(host);cancelUiMotion(screen);if(full?.open)full.close();full?.remove();host.remove();placeholder.remove();if(dock===entry)dock=null;
 };
 const dispose=()=>{if(closed)return;media.stop();if(placeholder.isConnected)placeholder.replaceWith(screen);else screen.remove();cleanup()};
 const entry={media,screen,placeholder,restore,cleanup,dispose};dock=entry;
 const expiry=setTimeout(dispose,Math.max(1,Math.min(7*86400000,Date.parse(clip.expires_at)-Date.now())));
 const minimize=()=>{cancelUiMotion(screen);const playing=!video.paused;host.querySelector('[data-dock-screen]').append(screen);full.close();host.hidden=false;if(playing)void video.play().catch(()=>{});animateUi(host,[{opacity:.6,transform:'translateY(8px) scale(.98)'},{opacity:1,transform:'none'}],{duration:180});host.querySelector('[data-dock-expand]').focus({preventScroll:true})};
 const expand=()=>{
  const origin=screen.getBoundingClientRect(),playing=!video.paused;
  const glide=()=>{const box=screen.getBoundingClientRect();if(!box.width||!origin.width)return;animateUi(screen,[{transform:`translate(${origin.x+origin.width/2-box.x-box.width/2}px,${origin.y+origin.height/2-box.y-box.height/2}px) scale(${origin.width/box.width})`,opacity:.5},{transform:'none',opacity:1}],{duration:260})};
  if(restoreReplayDock(media)){if(playing)void video.play().catch(()=>{});glide();return;}
  if(!full){full=document.createElement('dialog');full.className='replay-dock-expanded';full.setAttribute('aria-label','Highlight viewer');full.innerHTML='<header><h2></h2><button type="button" class="linkbtn" data-dock-minimize>Minimize</button><button type="button" class="linkbtn" data-dock-stop>Close</button></header><div data-dock-full-screen></div><a class="btn ghost" href="#/clubhouse?tab=highlights">Browse highlights</a>';full.querySelector('h2').textContent=clip.headline;full.querySelector('[data-dock-minimize]').onclick=minimize;full.querySelector('[data-dock-stop]').onclick=dispose;full.addEventListener('cancel',e=>{e.preventDefault();minimize()});document.body.append(full);}
  applyViewingMatchup(full,host);full.querySelector('[data-dock-full-screen]').append(screen);full.showModal();host.hidden=true;if(playing)void video.play().catch(()=>{});glide();
 };
 host.querySelector('[data-dock-expand]').onclick=expand;host.querySelector('[data-dock-close]').onclick=dispose;
 // A full-screen dock must not leave the next route trapped under its modal.
 const navigate=()=>{if(full?.open)minimize()};window.addEventListener('hashchange',navigate);
 document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',dispose,{once:true});
 animateUi(host,[{opacity:0,transform:'translateY(12px) scale(.96)'},{opacity:1,transform:'none'}],{duration:220});
 host.querySelector('[data-dock-expand]').focus({preventScroll:true});return true;
}
