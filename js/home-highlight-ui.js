import {esc} from './ui.js';
import {playerPortrait} from './player-presentation.js';
import {highlightThumbnail} from './home-highlight-model.js';
export function highlightPosterUrl(value,width=640){
 const source=highlightThumbnail(value);if(!source)return null;
 const url=new URL('https://a.espncdn.com/combiner/i');url.searchParams.set('img',source);url.searchParams.set('w',String(width));return url.href;
}
const duration=n=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
export function reelPlayersMarkup(players=[],selected='',total=0,prefix='home'){
 if(!players.length)return '';
 return `<button type="button" id="${prefix}-reel-person-all" class="reel-person" data-reel-player-filter="" aria-pressed="${!selected}"><span>All players</span><b>${total}</b></button>${players.map(player=>`<button type="button" id="${prefix}-reel-person-${esc(player.key)}" class="reel-person" data-reel-player-filter="${esc(player.key)}" aria-pressed="${selected===player.key}" aria-label="${esc(player.name)}: ${player.count} clips">${playerPortrait(player)}<span>${esc(player.name)}</span><b>${player.count}</b></button>`).join('')}`;
}
export function reelGameOptions(clips,selected=''){
 const games=[...new Map(clips.map(clip=>[clip.game_id,clip.game_label])).entries()];
 return `<option value="">All games · ${clips.length}</option>${games.map(([id,label])=>`<option value="${id}" ${selected===id?'selected':''}>${esc(label)} · ${clips.filter(c=>c.game_id===id).length}</option>`).join('')}`;
}
function clipCard(clip){return `<li id="home-highlight-${clip.id}"><button type="button" data-home-reel-clip="${clip.id}" aria-label="Watch ${esc(clip.headline)}"><span class="home-reel-poster"><img src="${esc(highlightPosterUrl(clip.thumbnail_url))}" alt="" loading="lazy" decoding="async"><span class="home-reel-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg></span><span class="home-reel-duration">${duration(clip.duration)}</span></span><span class="home-reel-kind">${clip.kind==='touchdown'?'TOUCHDOWN':'BIG PLAY'} · ESPN</span><strong>${esc(clip.headline)}</strong><span class="home-reel-matchup">${esc(clip.game_label)}</span></button></li>`}
export function homeHighlightMarkup(clips,now=Date.now(),{title='Weekend highlights.',eyebrow='WEEKEND REEL',emptyText='',players=[],player='',total=clips.length,layout='rail',game='',games=clips,query=''}={}){
 if(!clips.length&&!emptyText&&!players.length&&layout!=='grid')return '';
 const groups=layout==='grid'?[...new Map(clips.map(clip=>[clip.game_id,clip.game_label])).entries()]:[];
 return `<section class="home-highlight-reel" data-reel-layout="${layout}" data-no-swipe aria-labelledby="home-reel-title"><header><div><small>${esc(eyebrow)}</small><h2 id="home-reel-title">${esc(title)}</h2></div>${clips.length?'<button type="button" class="linkbtn" data-home-reel-open>Browse clips <span aria-hidden="true">→</span></button>':''}</header>${layout==='grid'?`<div class="reel-grid-filters"><label>Game<select data-home-reel-game>${reelGameOptions(games,game)}</select></label><label>Find a clip<input data-home-reel-search type="search" maxlength="80" placeholder="Player or play" value="${esc(query)}"></label></div>`:''}${players.length?`<div class="home-reel-players" role="group" aria-label="Filter highlights by player">${reelPlayersMarkup(players,player,total)}</div>`:''}${layout==='grid'?groups.map(([id,label])=>`<section class="reel-game-group" id="reel-game-${id}"><h3>${esc(label)} <span>${clips.filter(c=>c.game_id===id).length} clip${clips.filter(c=>c.game_id===id).length===1?'':'s'}</span></h3><ol class="home-reel-cards home-reel-grid" aria-label="${esc(label)} highlights, newest first">${clips.filter(c=>c.game_id===id).map(clipCard).join('')}</ol></section>`).join(''):`<ol class="home-reel-cards" aria-label="NFL highlights, newest first">${clips.slice(0,8).map(clipCard).join('')}</ol>`}${clips.length?`<p class="home-reel-total" role="status">${clips.length} clip${clips.length===1?'':'s'}${player?' for this player':' in the reel'}</p>`:`<p class="home-reel-empty" role="status">${esc(query||player||game?'No matching clips. Try another player or game.':emptyText)}</p>`}</section>`;
}
export function reelQueueMarkup(clips,selected){
 if(!clips.length)return '<li class="reel-search-empty"><strong>No matching clips</strong><button type="button" class="linkbtn" data-reel-clear>Clear filters</button></li>';
 return clips.map((clip,index)=>`<li id="reel-queue-${clip.id}"><button type="button" data-reel-choose="${clip.id}" aria-pressed="${clip.id===selected}" aria-label="Clip ${index+1}: ${esc(clip.headline)}"><span class="reel-list-poster"><img src="${esc(highlightPosterUrl(clip.thumbnail_url,320))}" alt="" loading="lazy" decoding="async"><span>${duration(clip.duration)}</span></span><span class="reel-list-copy"><strong>${esc(clip.headline)}</strong><small>${esc(clip.game_label)} · ${clip.kind==='touchdown'?'TD':'Big play'}${clip.id===selected?' · Playing':''}</small></span><span class="reel-list-number" aria-hidden="true">${index+1}</span></button></li>`).join('');
}
