import {playerJourneyLinks} from './player-journey.js';
import { esc } from './ui.js';
import {mountWatchButton} from './player-watchlist-ui.js';
import { playerIdentity } from './player-presentation.js';
import { currentMember } from './members.js';
import { thermalScore, playerScoreTemperature } from './score-temperature.js';
import { mountScoreVfx } from './score-vfx.js';
import { loadPlayerCard } from './player-card-data.js';
import { animateUi, cancelUiMotion, cancelUiExit, exitUi } from './ui-motion.js';
import { connectPortrait } from './connected-portrait.js';
import {enterPlayerCard} from './player-card-motion.js';
import {mountSheetDrag,exitSheet} from './sheet-drag.js';
import { fitDialogToViewport } from './dialog-viewport.js';
import { playerFormHtml } from './player-form.js';
import { team } from './nfl-teams.js';
import { playerCardPlaceholder, finishLoadingContent } from './loading-presentation.js';
import {playerCardPreviewMatches} from './player-card-model.js';
import {sleeperAction} from './sleeper-links.js';
import {mountPlayerGameExplorer,playerGameDetailsHtml} from './player-game-explorer.js';
import {playerGame} from './player-game-model.js';
import {playerGameHeadline,playerAverageMarkup} from './player-card-summary.js';
import {mountDisclosureMotion} from './disclosure-motion.js';

let dialog, body, request = 0, opener, returnContainer, activeContext = null, sheetDrag, stopConnection = () => {};
let preview=null,gameExplorer=null,moreMotion=null,returnOfferKey=null;
let stopEntrance=(_options={})=>{};
function returnTarget() {
  const selector = opener?.dataset.playerCard ? `[data-player-card="${CSS.escape(opener.dataset.playerCard)}"]` : opener?.dataset.gamedayPlayer ? `[data-gameday-player="${CSS.escape(opener.dataset.gamedayPlayer)}"][data-player-roster="${CSS.escape(opener.dataset.playerRoster)}"]` : null;
  const scope=returnOfferKey&&returnContainer?.isConnected?returnContainer.querySelector(`[data-offer-key="${CSS.escape(returnOfferKey)}"]`):returnContainer;
  const replacement = selector && scope?.isConnected ? scope.querySelector(selector) : null;
  return opener?.isConnected ? opener : replacement;
}
function setup() {
  if (dialog) return;
  dialog = document.createElement('dialog');
  dialog.className = 'gameday-spotlight dfl-player-card';
  dialog.setAttribute('aria-labelledby', 'dfl-player-card-title');
  dialog.innerHTML = '<header><span class="dfl-sheet-grip" aria-hidden="true"></span><div class="player-card-heading"><small data-player-card-origin hidden></small><h2 id="dfl-player-card-title" tabindex="-1" autofocus>Player card</h2></div><button type="button" class="linkbtn" data-player-card-close>Close</button></header><div data-player-card-body></div>';
  document.body.append(dialog); body = dialog.querySelector('[data-player-card-body]');
  mountScoreVfx(dialog);
  const dismiss = (options = {}) => {
    if (!dialog.dataset.uiClosing && !options.immediate && !dialog.dataset.sheetMoving) {
      const origin=stopConnection.position?.();stopEntrance({closing:true});stopConnection();
      const source = returnTarget();
      const target = source?.querySelector('.dfl-player-portrait') || source?.closest('.dfl-player')?.querySelector('.dfl-player-portrait');
      if(dialog.dataset.playerCardStage!=='portrait'||origin)stopConnection = connectPortrait(body.querySelector('.dfl-player-portrait'), target, { motion:dialog.dataset.motion !== 'off', duration:280, hideSource:true, origin, easing:'cubic-bezier(.4,0,.2,1)' });
    }
    if(options.immediate)stopEntrance({closing:true});
    exitSheet(dialog, () => {sheetDrag.reset();dialog.close();}, { ...options, connected:!!stopConnection.position?.() });
  };
  sheetDrag=mountSheetDrag(dialog,{handle:dialog.querySelector('header'),dismiss,onStart:()=>{stopEntrance();stopConnection()}});
  dialog.querySelector('[data-player-card-close]').addEventListener('click', () => dismiss());
  dialog.addEventListener('click', e => { if (e.target === dialog) dismiss(); });
  dialog.addEventListener('cancel', e => { e.preventDefault(); dismiss(); });
  dialog.addEventListener('close', () => {
    if(dialog.open)return;
    stopEntrance();stopConnection(); cancelUiExit(dialog); cancelUiMotion(dialog);
    delete dialog.dataset.playerCardStage;dialog.style.removeProperty('clip-path');dialog.style.removeProperty('opacity');
    moreMotion?.stop();moreMotion=null;gameExplorer?.stop();gameExplorer=null;request++; activeContext = null; body.removeAttribute('aria-busy');
    returnTarget()?.focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', () => { if (dialog.open) dismiss({ immediate:true }); });
}
function wireGameExplorer(model){
  const initialWeek=gameExplorer?.selectedWeek;gameExplorer?.stop();const generation=request;
  gameExplorer=mountPlayerGameExplorer(body,model,{initialWeek,getMotion:()=>dialog.dataset.motion!=='off',onShare:async spec=>{try{const {openSharePreview}=await import('./share-editorial.js');if(dialog.open&&!dialog.dataset.uiClosing&&request===generation)openSharePreview(spec,{filename:`dfl-${model.player.id}-week-${spec.context.split(' ').at(-1)}.png`,title:`${model.player.name} · Player performance`,text:`${model.player.name} · ${spec.context} · ${spec.results[0].value} points · ${spec.status}`})}catch{body.querySelector('[data-player-game-announcement]')?.replaceChildren(document.createTextNode('Could not open the share preview. Try again.'))}}});
}
function render(model) {
  dialog.dataset.playerSeason=String(model.season);
  const p = model.player, me = currentMember(), journey=playerJourneyLinks(model);
  const props = ['QB', 'RB', 'WR', 'TE'].includes(p.position);
  const trade = model.owner && model.myRosterId != null && String(model.owner.id) !== String(model.myRosterId) && me?.sleeper_user_id;
  const state = { live: 'Live', final: 'Final', upcoming: 'Yet to play', unknown: 'Status pending' }[model.state] || 'Recorded stats';
  const availability = /out|ir|pup|doubt|^(o|d)$/i.test(model.injury.tag) ? "out" : /question|^q$/i.test(model.injury.tag) ? "questionable" : "neutral";
  const club = team(p.nflTeam);
  const heroStyle = club ? ` style="--player-primary:${esc(club.primary)};--player-secondary:${esc(club.secondary)}"` : '';
  const newActions=`<nav class="player-card-actions player-card-primary" aria-label="Player actions"><button type="button" class="linkbtn" data-player-compare="${esc(p.id)}">Compare player</button><button type="button" class="linkbtn" data-player-watch aria-pressed="false">Watch player</button></nav>`;
  const moreTools=`<details class="player-card-more"><summary>More player tools <i aria-hidden="true"></i></summary><nav class="player-card-tools" aria-label="More player actions">${journey.highlights?`<a class="linkbtn" href="${esc(journey.highlights)}">Highlights</a>`:''}${journey.matchup?`<a class="linkbtn" href="${esc(journey.matchup)}">View matchup</a>`:''}${props ? `<a class="linkbtn" href="#/sportsbook?player=${encodeURIComponent(p.name)}">Player props</a>` : ''}${trade ? `<a class="linkbtn" href="#/trade?team=${encodeURIComponent(model.myRosterId)}&target=${encodeURIComponent(p.id)}&partner=${encodeURIComponent(model.owner.id)}">Explore a trade</a>` : ''}<a class="linkbtn" href="#/analyzer">Team analyzer</a>${sleeperAction(model.leagueId,model.owner?'roster':'waivers',{className:'linkbtn'})}</nav></details>`;
  body.innerHTML = `<section class="player-card-hero"${heroStyle} aria-label="Player identity">${playerIdentity({ ...p, injuryStatus: '' })}<div class="player-card-owner"><small>DFL ROSTER</small>${model.owner?.memberId ? `<a href="#/profile?id=${esc(model.owner.memberId)}">${esc(model.ownerLabel)}</a>` : `<strong>${esc(model.ownerLabel)}</strong>`}</div></section><div class="player-card-availability" data-availability="${availability}"><b>${esc(model.injury.tag)}</b><span>${esc([model.injury.availability, model.injury.body].filter(Boolean).join(' · '))}</span></div><div class="gameday-spotlight-score"><span>${thermalScore(model.points, playerScoreTemperature({ ...p, points: model.points, state: model.state, afterHalftime: model.afterHalftime }), { tag: 'strong' })}<small>Fantasy points</small></span><span>${esc(state)} · Week ${model.week}</span></div><div class="player-card-week-summary"><p data-player-game-line>${esc(playerGameHeadline(playerGame(model),p.position))}</p>${playerAverageMarkup(model.seasonAverage)}</div>${newActions}<div data-player-game-chart>${playerFormHtml(model,{interactive:true})}</div><section class="player-card-game-stats" data-player-game-details aria-label="Selected game stats">${playerGameDetailsHtml(playerGame(model))}</section>${moreTools}${model.stats.updatedAt ? `<time class="gameday-stat-time" datetime="${esc(new Date(model.stats.updatedAt).toISOString())}">Stats · ${esc(new Date(model.stats.updatedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }))}</time>` : ''}`;
  const photo=body.querySelector('.player-card-hero img');if(photo)photo.loading='eager';
  wireGameExplorer(model);

}
export async function openPlayerCard(selection, { context = null, motion = true, source = document.activeElement } = {}) {
  setup();moreMotion?.stop();moreMotion=null; gameExplorer?.stop();gameExplorer=null; stopEntrance();stopConnection(); cancelUiExit(dialog); sheetDrag.reset(); cancelUiMotion(body);dialog.style.removeProperty('clip-path');dialog.style.removeProperty('opacity');delete dialog.dataset.playerCardStage; const token = ++request; opener = source; returnContainer = source?.closest('dialog') || source?.closest('#view'); activeContext = context;returnOfferKey=source?.closest('[data-offer-key]')?.dataset.offerKey||null;
  const route=source?.closest('#view')?.dataset.route||document.querySelector('#view')?.dataset.route;
  const origin=dialog.querySelector('[data-player-card-origin]'),label={clubhouse:'Clubhouse',trade:'Trade board',home:'Home',sportsbook:'The Book',analyzer:'Team analyzer'}[route];
  origin.textContent=label||'';origin.hidden=!label;
  const memberId=currentMember()?.id??null,hasPreview=playerCardPreviewMatches(preview,selection,context,memberId)&&!!body.querySelector('.player-card-hero');
  const finish=()=>{if(hasPreview){body.dataset.contentState='ready';body.removeAttribute('aria-busy');}else finishLoadingContent(body);};
  dialog.dataset.motion = motion ? 'on' : 'off';
  body.dataset.contentState = hasPreview?'refreshing':'loading'; body.setAttribute('aria-busy', 'true'); body.scrollTop = 0;
  body.querySelector('[data-player-card-refresh-error]')?.remove();
  if(hasPreview){const more=body.querySelector('.player-card-more');if(more)more.open=false;body.querySelectorAll('.player-card-primary,.player-card-tools').forEach(node=>node.inert=true);wireGameExplorer(preview.model);}
  else body.innerHTML = playerCardPlaceholder(context?.name || selection.name || source?.textContent?.trim());
  let entranceDone = Promise.resolve();
  const sourcePortrait=source?.matches?.('.dfl-player-portrait')?source:source?.querySelector('.dfl-player-portrait')||source?.closest('.dfl-player')?.querySelector('.dfl-player-portrait');
  const identity=body.querySelector('.loading-player-identity');
  if(identity&&sourcePortrait){
    const portrait=sourcePortrait.cloneNode(true);portrait.removeAttribute('style');portrait.querySelector('img')?.removeAttribute('style');if(portrait.querySelector('img'))portrait.querySelector('img').loading='eager';
    for(const name of ['--player-primary','--player-secondary'])portrait.style.setProperty(name,getComputedStyle(sourcePortrait).getPropertyValue(name));
    identity.className='player-card-hero';identity.dataset.playerCardSeed='';identity.firstElementChild.replaceWith(portrait);identity.lastElementChild.className='dfl-player-copy';
  }
  const opening=!dialog.open;
  if (opening) {
    dialog.dataset.playerCardStage='portrait';
    dialog.showModal();
    fitDialogToViewport(dialog);
  }
  // A hidden scroll container can ignore its reset. Reset both surfaces after
  // showModal, before measuring the portrait, even when reusing a warm preview.
  dialog.scrollTo({top:0,left:0,behavior:'instant'});
  body.scrollTo({top:0,left:0,behavior:'instant'});
  if (opening) {
    const entrance=enterPlayerCard(dialog,source,{motion});
    stopEntrance=entrance.stop;stopConnection=entrance.connection;entranceDone=entrance.arrived;
  }
  moreMotion=mountDisclosureMotion(dialog,{selector:'.player-card-more',getMotion:()=>dialog.dataset.motion!=='off',active:()=>dialog.open&&!dialog.dataset.uiClosing});
  dialog.querySelector('h2').focus({ preventScroll: true });
  let average,loadedModel=null,painted=false;
  try {
    const model = await loadPlayerCard(selection, context,{onSeasonAverage:value=>{
      if(token!==request||!dialog.open||dialog.dataset.uiClosing||(currentMember()?.id??null)!==memberId)return;
      average=value;if(loadedModel)loadedModel.seasonAverage=value;
      if(painted){const slot=body.querySelector('.player-card-season-average');if(slot){const template=document.createElement('template');template.innerHTML=playerAverageMarkup(value);slot.replaceWith(template.content);}}
    }});
    loadedModel=model;if(average!==undefined)model.seasonAverage=average;
    await entranceDone;
    if (token !== request || !dialog.open || dialog.dataset.uiClosing || (currentMember()?.id??null)!==memberId) return;
    const scroll=body.scrollTop,unchanged=hasPreview&&JSON.stringify(preview?.model)===JSON.stringify(model);
    if(!unchanged){render(model);mountWatchButton(body.querySelector('[data-player-watch]'),model.player.id);body.scrollTop=scroll;}
    body.querySelectorAll('.player-card-primary,.player-card-tools').forEach(node=>node.inert=false);
    preview={model,memberId,at:Date.now()};painted=true;
    finish();
    if(!hasPreview)animateUi(body.querySelector('.player-form-chart'), [{ opacity:0, transform:'translateY(4px)' }, { opacity:1, transform:'translateY(0)' }], { duration:240, motion:dialog.dataset.motion !== 'off' });
  }
  catch (error) { await entranceDone;if (token === request && dialog.open && !dialog.dataset.uiClosing && (currentMember()?.id??null)===memberId) {
    const retry=`<div data-player-card-refresh-error><p role="status">${hasPreview?'Refresh unavailable. Showing the last checked stats.':esc(error.message || 'Player data unavailable.')}</p><button type="button" class="linkbtn" data-player-card-retry>Retry</button></div>`;
    if(hasPreview)body.insertAdjacentHTML('afterbegin',retry);else body.innerHTML=retry;
    finish();body.querySelector('[data-player-card-retry]').onclick = () => void openPlayerCard(selection, { context, motion:dialog.dataset.motion !== 'off', source });
  } }
}
export function updatePlayerCard(context, motion = true) {
  if (!dialog?.open || !activeContext || String(activeContext.id) !== String(context?.id)) return;
  if(activeContext.points!==context.points||activeContext.week!==context.week||activeContext.state!==context.state)preview=null;
  activeContext = context; dialog.dataset.motion = motion ? 'on' : 'off';
  if(gameExplorer){gameExplorer.update(context);return;}
  const score = body.querySelector('.gameday-spotlight-score > span');
  const scoreStamp=JSON.stringify([context.points,playerScoreTemperature(context)]);
  if (score&&score.dataset.scoreStamp!==scoreStamp) {score.innerHTML = `${thermalScore(context.points, playerScoreTemperature(context), { tag: 'strong' })}<small>Fantasy points</small>`;score.dataset.scoreStamp=scoreStamp;}
  const status = body.querySelector('.gameday-spotlight-score > span:last-child');
  const formState = body.querySelector('[data-player-form-current-state]');
  if (formState) formState.textContent = { live:'Live', final:'Final', upcoming:'Yet to play', unknown:'Pending' }[context.state] || 'Recorded';
  if (status) status.textContent = `${{ live:'Live', final:'Final', upcoming:'Yet to play', unknown:'Status pending' }[context.state] || 'Recorded stats'} · Week ${context.week}`;
}
export function closePlayerCard(context) {
  if (dialog?.open && activeContext && String(activeContext.id) === String(context?.id)) { stopEntrance({closing:true});stopConnection(); exitUi(dialog, () => {sheetDrag.reset();dialog.close();}, { immediate:true }); }
}
