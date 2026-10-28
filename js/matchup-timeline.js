import {esc} from './ui.js';
import {momentSummary} from './game-day-moments-model.js';
import {activeHighlightClips} from './home-highlight-model.js';
const known=n=>typeof n==='number'&&Number.isFinite(n);
export function matchupTimeline(items,game,{filter='all'}={}){
 if(!game?.sides||game.sides.length!==2)return [];
 const unique=new Map();
 for(const m of items||[]){
  if(m.matchupId!==String(game.id)||!Number.isFinite(m.at)||!game.sides.some(s=>String(s.roster)===String(m.roster)))continue;
  if(!['lead','big','surge','touchdown','big-play'].includes(m.kind))continue;
  if(filter==='leads'&&m.kind!=='lead'||filter==='plays'&&!m.recap?.play)continue;
  const sides=m.recap?.sides;
  if(m.kind==='lead'&&(!Array.isArray(sides)||sides.length!==2||sides.some(s=>!known(s.points))))continue;
  unique.set(String(m.eventKey||m.key),m);
 }
 return [...unique.values()].sort((a,b)=>a.at-b.at||String(a.key).localeCompare(String(b.key),undefined,{numeric:true}));
}
export function timelinePlayHref(moment,model,clips=[],now=Date.now()){
 const play=moment?.recap?.play;if(!play||!/^\d+$/.test(String(play.gameId))||!/^\d+$/.test(String(play.id)))return null;
 const video=activeHighlightClips(clips,now).find(c=>c.game_id===String(play.gameId)&&c.play_id===String(play.id)&&c.video_url);
 const params=new URLSearchParams({season:model.season,week:model.week,matchup:moment.matchupId,tab:video?'highlights':'nfl',nflGame:play.gameId,moment:moment.eventKey||`nfl:${play.gameId}:${play.id}:${moment.roster}`});
 if(video)params.set('clip',video.id);
 return {href:'#/clubhouse?'+params,video:!!video};
}
export function timelineMarkup(items,game,{filter='all',selected='',model={},clips=[]}={}){
 const all=matchupTimeline(items,game),rows=matchupTimeline(items,game,{filter});if(!all.length)return '';
 const choice=rows.find(m=>String(m.eventKey||m.key)===selected)||rows.at(-1),view=choice&&momentSummary(choice),link=timelinePlayHref(choice,model,clips);
 const stamp=m=>new Date(m.at).toLocaleString('en-US',{timeZone:'America/Chicago',weekday:'short',hour:'numeric',minute:'2-digit'});
 return `<details class="matchup-timeline" id="matchup-timeline-${esc(game.id)}"><summary><span>Matchup timeline</span><b>${all.length} moment${all.length===1?'':'s'}</b></summary><div class="timeline-filters" role="group" aria-label="Timeline moments">${[['all','All'],['leads','Lead changes'],['plays','Plays']].map(([key,label])=>`<button type="button" data-timeline-filter="${key}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div><ol class="timeline-rail" data-no-swipe aria-label="Recorded moments, oldest first">${rows.map(m=>{const s=momentSummary(m),id=String(m.eventKey||m.key);return `<li id="timeline-moment-${esc(m.key)}"><button type="button" data-timeline-moment="${esc(id)}" aria-pressed="${m===choice}"><small>${esc(s.label)}</small><strong>${esc(s.name)}</strong><b>${esc(s.value)}${s.unit?' '+s.unit:''}</b><time datetime="${new Date(m.at).toISOString()}">${m.recap?.play?'':'Saved '}${esc(stamp(m))}</time></button></li>`}).join('')}</ol>${choice?`<section class="timeline-detail" data-timeline-detail aria-label="Selected moment"><header><small>${esc(view.label)}</small><strong>${esc(view.name)}</strong></header>${choice.kind==='lead'?`<div class="timeline-scores">${choice.recap.sides.map(s=>`<span>${esc(s.team_name)}<b>${s.points.toFixed(2)}</b></span>`).join('')}</div>`:`<p>${esc(view.value)} ${esc(view.unit)}${view.detail?' · '+esc(view.detail):''}</p>`}${link?`<a class="linkbtn" href="${esc(link.href)}">${link.video?'Watch this play':'Open play-by-play'} →</a>`:`<button type="button" class="linkbtn" data-highlight="${esc(choice.eventKey||choice.key)}">Open moment →</button>`}</section>`:'<p class="network-empty">No recorded moments in this view.</p>'}</details>`;
}
