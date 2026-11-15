import {esc} from './ui.js';
import {playerPortrait} from './player-presentation.js';
import {timeAgo,NOTIFICATION_CATEGORIES} from './notification-core.js';
import {ACTIVITY_FILTERS,activityCard,filterActivity} from './activity-center-model.js';
const label=id=>NOTIFICATION_CATEGORIES.find(([key])=>key===id)?.[1]||'League';
const number=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:2});
const paths={trades:'M3 6h14m-4-4 4 4-4 4M17 14H3m4-4-4 4 4 4',plays:'m4 15 3-7 9-4-4 9-8 2Zm4-5 3 3',book:'M4 3h12v14l-3-2-3 2-3-2-3 2V3Zm3 4h6m-6 4h4',league:'M3 8v4h4l7 4V4L7 8H3Zm4 4 2 5'};
function identity(card){
 const player=card.preview?.players?.[0]||card.preview?.packages?.[0]?.players?.[0];
 return `<span class="activity-identity" aria-hidden="true">${player?playerPortrait(player):`<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[card.kind]||paths.league}"/></svg>`}</span>`;
}
function dayLabel(value,now){
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return{key:'undated',label:'League activity'};
 const key=d=>`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,today=new Date(now),yesterday=new Date(now);yesterday.setDate(yesterday.getDate()-1);
 return{key:key(date),label:key(date)===key(today)?'Today':key(date)===key(yesterday)?'Yesterday':date.toLocaleDateString(undefined,{month:'short',day:'numeric',...(date.getFullYear()!==today.getFullYear()?{year:'numeric'}:{})})};
}
function preview(p){
 if(!p)return '';
 if(p.type==='trade')return `<div class="activity-trade">${p.packages.slice(0,3).map(pkg=>`<div><small>${esc(pkg.name)} sends</small><span><b>${esc(pkg.players[0]?.name||'No players')}${pkg.players.length>1?` <em>+${pkg.players.length-1}</em>`:''}</b></span></div>`).join('')}</div><div class="activity-result">${p.balance!==null?`<strong>${p.balance}%</strong><span>Value balance</span>`:'<span>Receipt available</span>'}${p.packages.length>3?`<span>${p.packages.length} teams</span>`:''}</div>`;
 if(p.type==='clip')return `<div class="activity-clip" aria-label="${esc(p.headline)}">${p.poster?`<span><img src="${esc(p.poster)}" alt="" loading="lazy" decoding="async"><i aria-hidden="true">▶</i></span>`:''}<strong>Video available</strong>${p.game?`<small>${esc(p.game)}</small>`:''}</div>`;
 if(p.type==='play')return '';
 if(p.type==='ticket')return `<div class="activity-ticket" data-result="${esc(p.status)}"><strong>${p.status==='won'?'✓ Cashed':p.status==='lost'?'× Missed':'↩ Refunded'}</strong><dl>${p.stake!==null?`<div><dt>Stake</dt><dd>${number(p.stake)} SIN</dd></div>`:''}${p.payout!==null?`<div><dt>Payout</dt><dd>${number(p.payout)} SIN</dd></div>`:''}</dl><small>Ticket #${esc(p.id)}${p.picks?` · ${p.picks} pick${p.picks===1?'':'s'}`:''}</small></div>`;
 return '';
}
export function activityFiltersMarkup(rows,selected='all'){
 return `<div class="page-activity-tabs activity-filters" role="group" aria-label="Filter activity">${ACTIVITY_FILTERS.map(([key,name])=>`<button type="button" data-activity-filter="${key}" aria-pressed="${key===selected}">${name}${key==='unread'?` <b>${rows.filter(r=>!r.is_read).length}</b>`:''}</button>`).join('')}</div>`;
}
export function activityListMarkup(rows,context={},filter='all'){
 const visible=filterActivity(rows,filter);
 if(!visible.length)return `<div class="notify-empty"><strong>${filter==='unread'?'You’re all caught up.':'Nothing here yet.'}</strong><span>${filter==='all'?'League activity will show up here.':'Try another filter.'}</span></div>`;
 let day='';const now=context.now??Date.now();
 return `<div class="activity-list">${visible.map(row=>{
  const card=activityCard(row,context),date=dayLabel(row.created_at,now),heading=date.key!==day?`<p class="activity-day" id="activity-day-${esc(date.key)}">${esc(date.label)}</p>`:'';day=date.key;
  const copy=card.summary||(!card.preview||['play','clip'].includes(card.preview.type)?card.body:'');
  return `${heading}<article id="activity-${esc(row.id)}" class="activity-item${row.is_read?'':' is-unread'}" data-activity-id="${esc(row.id)}"><a class="activity-card" href="${esc(card.href)}" data-notification-id="${esc(row.id)}">${identity(card)}<div class="activity-meta"><small>${esc(label(row.category))}</small><time datetime="${esc(row.created_at)}">${esc(timeAgo(row.created_at,now))}</time><span class="activity-unread"><i aria-hidden="true"></i>${row.is_read?'':'<span class="sr-only">Unread</span>'}</span></div><h2>${esc(card.title)}</h2><div class="activity-content">${copy?`<p>${esc(copy)}</p>`:''}${preview(card.preview)}</div><span class="activity-action">${esc(card.action)} <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a><button type="button" class="activity-dismiss" data-delete-notification="${esc(row.id)}" aria-label="Dismiss ${esc(card.title)}">×</button></article>`;
 }).join('')}</div>`;
}
