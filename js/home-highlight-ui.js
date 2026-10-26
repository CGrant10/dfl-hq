import {esc} from './ui.js';
import {highlightThumbnail} from './home-highlight-model.js';
export function highlightPosterUrl(value,width=640){
 const source=highlightThumbnail(value);if(!source)return null;
 const url=new URL('https://a.espncdn.com/combiner/i');url.searchParams.set('img',source);url.searchParams.set('w',String(width));url.searchParams.set('h',String(Math.round(width*9/16)));url.searchParams.set('scale','crop');return url.href;
}
const duration=n=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
export function homeHighlightMarkup(clips,now=Date.now()){
 if(!clips.length)return '';
 const first=clips.slice(0,8);
 return `<section class="home-highlight-reel" aria-labelledby="home-reel-title"><header><div><small>WEEKEND REEL</small><h2 id="home-reel-title">Weekend highlights.</h2></div><button type="button" class="linkbtn" data-home-reel-open>View reel <span aria-hidden="true">→</span></button></header><ol class="home-reel-cards" aria-label="NFL highlights in play order">${first.map(clip=>`<li id="home-highlight-${clip.id}"><button type="button" data-home-reel-clip="${clip.id}" aria-label="Watch ${esc(clip.headline)}"><span class="home-reel-poster"><img src="${esc(highlightPosterUrl(clip.thumbnail_url))}" alt="" loading="lazy" decoding="async"><span class="home-reel-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg></span><span class="home-reel-duration">${duration(clip.duration)}</span></span><span class="home-reel-kind">${clip.kind==='touchdown'?'TOUCHDOWN':'BIG PLAY'} · ESPN</span><strong>${esc(clip.headline)}</strong><span class="home-reel-matchup">${esc(clip.game_label)}</span></button></li>`).join('')}</ol><p class="home-reel-total">${clips.length} clip${clips.length===1?'':'s'} in the reel</p></section>`;
}
export function reelQueueMarkup(clips,selected){
 return clips.map((clip,index)=>`<button type="button" id="reel-queue-${clip.id}" data-reel-choose="${clip.id}" aria-pressed="${clip.id===selected}" aria-label="Clip ${index+1}: ${esc(clip.headline)}"><img src="${esc(highlightPosterUrl(clip.thumbnail_url,192))}" alt="" loading="lazy" decoding="async"><span>${index+1}</span></button>`).join('');
}
