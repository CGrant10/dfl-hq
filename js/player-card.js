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

let dialog, body, request = 0, opener, returnContainer, activeContext = null, sheetDrag, stopConnection = () => {};
let preview=null;
let stopEntrance=(_options={})=>{};
function returnTarget() {
  const selector = opener?.dataset.playerCard ? `[data-player-card="${CSS.escape(opener.dataset.playerCard)}"]` : opener?.dataset.gamedayPlayer ? `[data-gameday-player="${CSS.escape(opener.dataset.gamedayPlayer)}"][data-player-roster="${CSS.escape(opener.dataset.playerRoster)}"]` : null;
  const replacement = selector && returnContainer?.isConnected ? returnContainer.querySelector(selector) : null;
  return opener?.isConnected ? opener : replacement;
}
function setup() {
  if (dialog) return;
  dialog = document.createElement('dialog');
  dialog.className = 'gameday-spotlight dfl-player-card';
  dialog.setAttribute('aria-labelledby', 'dfl-player-card-title');
  dialog.innerHTML = '<header><span class="dfl-sheet-grip" aria-hidden="true"></span><h2 id="dfl-player-card-title" tabindex="-1" autofocus>Player card</h2><button type="button" class="linkbtn" data-player-card-close>Close</button></header><div data-player-card-body></div>';
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
    request++; activeContext = null; body.removeAttribute('aria-busy');
    returnTarget()?.focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', () => { if (dialog.open) dismiss({ immediate:true }); });
}
function render(model) {
  const p = model.player, me = currentMember();
  const props = ['QB', 'RB', 'WR', 'TE'].includes(p.position);
  const trade = model.owner && model.myRosterId != null && String(model.owner.id) !== String(model.myRosterId) && me?.sleeper_user_id;
  const state = { live: 'Live', final: 'Final', upcoming: 'Yet to play', unknown: 'Status pending' }[model.state] || 'Recorded stats';
  const availability = /out|ir|pup|doubt|^(o|d)$/i.test(model.injury.tag) ? "out" : /question|^q$/i.test(model.injury.tag) ? "questionable" : "neutral";
  const club = team(p.nflTeam);
  const heroStyle = club ? ` style="--player-primary:${esc(club.primary)};--player-secondary:${esc(club.secondary)}"` : '';
  body.innerHTML = `<section class="player-card-hero"${heroStyle} aria-label="Player identity">${playerIdentity({ ...p, injuryStatus: '' })}<div class="player-card-owner"><small>DFL ROSTER</small>${model.owner?.memberId ? `<a href="#/profile?id=${esc(model.owner.memberId)}">${esc(model.ownerLabel)}</a>` : `<strong>${esc(model.ownerLabel)}</strong>`}</div></section><div class="player-card-availability" data-availability="${availability}"><b>${esc(model.injury.tag)}</b><span>${esc([model.injury.availability, model.injury.body].filter(Boolean).join(' · '))}</span></div><div class="gameday-spotlight-score"><span>${thermalScore(model.points, playerScoreTemperature({ ...p, points: model.points, state: model.state, afterHalftime: model.afterHalftime }), { tag: 'strong' })}<small>Fantasy points</small></span><span>${esc(state)} · Week ${model.week}</span></div>${playerFormHtml(model)}${model.stats.items.length ? `<section class="player-card-game-stats" aria-label="Game stats"><h3>Week ${model.week} box score</h3><dl class="gameday-stat-grid">${model.stats.items.map(s => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('')}</dl></section>` : '<p class="player-card-empty">Game stats unavailable.</p>'}<nav class="player-card-actions" aria-label="Player actions"><button type="button" class="linkbtn" data-player-compare="${esc(p.id)}">Compare player</button><button type="button" class="linkbtn" data-player-watch aria-pressed="false">Watch player</button>${props ? `<a class="linkbtn" href="#/sportsbook?player=${encodeURIComponent(p.name)}">Player props</a>` : ''}${trade ? `<a class="linkbtn" href="#/trade?team=${encodeURIComponent(model.myRosterId)}&target=${encodeURIComponent(p.id)}&partner=${encodeURIComponent(model.owner.id)}">Explore a trade</a>` : ''}<a class="linkbtn" href="#/analyzer">Team analyzer</a>${sleeperAction(model.leagueId,model.owner?'roster':'waivers',{className:'linkbtn'})}</nav>${model.stats.updatedAt ? `<time class="gameday-stat-time" datetime="${esc(new Date(model.stats.updatedAt).toISOString())}">Stats · ${esc(new Date(model.stats.updatedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }))}</time>` : ''}`;
  body.querySelector('.gameday-spotlight-score > span').dataset.scoreStamp=JSON.stringify([model.points,playerScoreTemperature({...p,points:model.points,state:model.state,afterHalftime:model.afterHalftime})]);
}
export async function openPlayerCard(selection, { context = null, motion = true, source = document.activeElement } = {}) {
  setup(); stopEntrance();stopConnection(); cancelUiExit(dialog); sheetDrag.reset(); cancelUiMotion(body);dialog.style.removeProperty('clip-path');dialog.style.removeProperty('opacity');delete dialog.dataset.playerCardStage; const token = ++request; opener = source; returnContainer = source?.closest('dialog') || source?.closest('#view'); activeContext = context;
  const memberId=currentMember()?.id??null,hasPreview=playerCardPreviewMatches(preview,selection,context,memberId)&&!!body.querySelector('.player-card-hero');
  const finish=()=>{if(hasPreview){body.dataset.contentState='ready';body.removeAttribute('aria-busy');}else finishLoadingContent(body);};
  dialog.dataset.motion = motion ? 'on' : 'off';
  body.dataset.contentState = hasPreview?'refreshing':'loading'; body.setAttribute('aria-busy', 'true'); body.scrollTop = 0;
  body.querySelector('[data-player-card-refresh-error]')?.remove();
  if(hasPreview)body.querySelector('.player-card-actions').inert=true;
  else body.innerHTML = playerCardPlaceholder(context?.name || selection.name || source?.textContent?.trim());
  let entranceDone = Promise.resolve();
  const sourcePortrait=source?.matches?.('.dfl-player-portrait')?source:source?.querySelector('.dfl-player-portrait')||source?.closest('.dfl-player')?.querySelector('.dfl-player-portrait');
  const identity=body.querySelector('.loading-player-identity');
  if(identity&&sourcePortrait){
    const portrait=sourcePortrait.cloneNode(true);portrait.removeAttribute('style');portrait.querySelector('img')?.removeAttribute('style');
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
  dialog.querySelector('h2').focus({ preventScroll: true });
  try {
    const model = await loadPlayerCard(selection, context);
    await entranceDone;
    if (token !== request || !dialog.open || dialog.dataset.uiClosing || (currentMember()?.id??null)!==memberId) return;
    const scroll=body.scrollTop,unchanged=hasPreview&&JSON.stringify(preview?.model)===JSON.stringify(model);
    if(!unchanged){render(model);mountWatchButton(body.querySelector('[data-player-watch]'),model.player.id);body.scrollTop=scroll;}
    body.querySelector('.player-card-actions').inert=false;
    preview={model,memberId,at:Date.now()};
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
