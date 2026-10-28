import {esc} from './ui.js';
import {playerPortrait} from './player-presentation.js';
import {timeAgo,NOTIFICATION_CATEGORIES} from './notification-core.js';
import {ACTIVITY_FILTERS,activityCard,filterActivity} from './activity-center-model.js';
const label=id=>NOTIFICATION_CATEGORIES.find(([key])=>key===id)?.[1]||'League';
const number=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:2});
function preview(p){
 if(!p)return '';
 if(p.type==='trade')return `<div class="activity-trade" style="--activity-parties:${Math.min(3,p.packages.length)}">${p.packages.slice(0,3).map(pkg=>`<div><small>${esc(pkg.name)} sends</small>${pkg.players.slice(0,2).map(player=>`<span>${playerPortrait(player)}<b>${esc(player.name)}</b></span>`).join('')}${pkg.players.length>2?`<em>+${pkg.players.length-2} more</em>`:''}</div>`).join('')}</div><div class="activity-result">${p.balance!==null?`<strong>${p.balance}%</strong><span>Value balance</span>`:'<span>Receipt available</span>'}${p.packages.length>3?`<span>${p.packages.length} teams</span>`:''}</div>`;
 if(p.type==='clip')return `<div class="activity-clip">${p.poster?`<span><img src="${esc(p.poster)}" alt="" loading="lazy" decoding="async"><i aria-hidden="true">▶</i></span>`:''}<strong>${esc(p.headline)}</strong>${p.game?`<small>${esc(p.game)}</small>`:''}</div>`;
 if(p.type==='play')return `<div class="activity-players">${p.players.map(playerPortrait).join('')}</div>`;
 if(p.type==='ticket')return `<div class="activity-ticket" data-result="${esc(p.status)}"><strong>${p.status==='won'?'✓ Cashed':p.status==='lost'?'× Missed':'↩ Refunded'}</strong><dl>${p.stake!==null?`<div><dt>Stake</dt><dd>${number(p.stake)} SIN</dd></div>`:''}${p.payout!==null?`<div><dt>Payout</dt><dd>${number(p.payout)} SIN</dd></div>`:''}</dl><small>Ticket #${esc(p.id)}${p.picks?` · ${p.picks} pick${p.picks===1?'':'s'}`:''}</small></div>`;
 return '';
}
export function activityFiltersMarkup(rows,selected='all'){
 return `<div class="page-activity-tabs activity-filters" role="group" aria-label="Filter activity">${ACTIVITY_FILTERS.map(([key,name])=>`<button type="button" data-activity-filter="${key}" aria-pressed="${key===selected}">${name}${key==='unread'?` <b>${rows.filter(r=>!r.is_read).length}</b>`:''}</button>`).join('')}</div>`;
}
export function activityListMarkup(rows,context={},filter='all'){
 const visible=filterActivity(rows,filter);
 if(!visible.length)return `<div class="notify-empty"><strong>${filter==='unread'?'You’re all caught up.':'Nothing here yet.'}</strong><span>${filter==='all'?'League activity will show up here.':'Try another filter.'}</span></div>`;
 return `<div class="activity-list">${visible.map(row=>{const card=activityCard(row,context);return `<article class="activity-item${row.is_read?'':' is-unread'}" data-activity-id="${esc(row.id)}"><a class="activity-card" href="${esc(card.href)}" data-notification-id="${esc(row.id)}"><div class="activity-meta"><small>${esc(label(row.category))}</small><time datetime="${esc(row.created_at)}">${esc(timeAgo(row.created_at))}</time>${row.is_read?'':'<span class="activity-unread"><i aria-hidden="true"></i><span class="sr-only">Unread</span></span>'}</div><h2>${esc(card.title)}</h2>${card.preview?preview(card.preview)+(card.preview.type==='play'?`<p>${esc(card.body)}</p>`:''):`<p>${esc(card.body)}</p>`}<span class="activity-action">${esc(card.action)} <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a><button type="button" class="activity-dismiss" data-delete-notification="${esc(row.id)}" aria-label="Dismiss ${esc(card.title)}">×</button></article>`}).join('')}</div>`;
}
