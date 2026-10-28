import {currentMember} from '../members.js';
import {esc,toast} from '../ui.js';
import {DEFAULT_NOTIFICATION_CATEGORIES,NOTIFICATION_CATEGORIES,NOTIFICATION_PRESETS,timeAgo} from '../notification-core.js';
import {clearInbox,disablePush,dismissNotifications,enablePush,inbox,markRead,pushCapability,pushPreferences,saveSubscription,testNotification} from '../notifications.js';
import {ensureStylesheet} from '../lazy-css.js';
import {loadActivityContext} from '../activity-center-data.js';
import {activityFiltersMarkup,activityListMarkup} from '../activity-center-ui.js';
import {mountMobileSheet} from '../mobile-sheet.js';
import {confirmSheet} from '../confirm-sheet.js';
let generation=0,settingsSheet=null;
export function leave(){generation++;leaveHandlers?.();leaveHandlers=null;settingsSheet?.stop();settingsSheet?.dialog.remove();settingsSheet=null}
export function settingsMarkup(state) {
  const capability = pushCapability();
  const active = state?.enabled && !!state?.subscription;
  const selected = new Set(state?.categories || DEFAULT_NOTIFICATION_CATEGORIES);
  const delivery = active ? state.failureCount > 0
    ? `<p class="notify-delivery is-warn"><b>Needs attention</b><span>The last delivery failed. Turn notifications off and on to reconnect.</span></p>`
    : state.lastSuccessAt
      ? `<p class="notify-delivery is-good"><b>Delivery confirmed</b><span>${esc(timeAgo(state.lastSuccessAt))} · ${esc(state.deviceLabel || "this device")}</span></p>`
      : `<p class="notify-delivery"><b>Ready on this device</b><span>${esc(state.deviceLabel || "This phone")} · waiting for its first delivered alert</span></p>` : "";
  return `<section class="notify-setup">
    <div class="notify-setup-copy">
      <small>THIS DEVICE</small>
      <h2>${active ? "Notifications are on" : "Never miss league business"}</h2>
      <p>${active ? "Get alerts while DFL HQ is closed." : esc(capability.reason || "Get lock-screen alerts on this device.")}</p>
    </div>
    ${delivery}
    ${capability.installRequired ? `<div class="notify-install"><strong>Install first</strong><span>Share <b>→</b> Add to Home Screen, then open DFL HQ from its icon.</span></div>` : ""}
    ${capability.supported ? `<div class="notify-actions">
      <button class="btn ${active ? "ghost" : ""}" type="button" data-push-toggle="${active ? "off" : "on"}">${active ? "Turn off on this device" : "Enable notifications"}</button>
      ${active ? `<button class="btn ghost" type="button" data-push-test>Send a test</button>` : ""}
    </div>
    ${active ? `<p class="muted tiny notify-test-hint">Test arrives in five seconds. Switch apps to check the banner.</p>` : ""}` : ""}
    ${active ? `<fieldset class="notify-categories"><legend>What should reach this phone?</legend>
      <div class="notify-presets"><button type="button" data-notify-preset="essential">Essential</button><button type="button" data-notify-preset="gameday">Game day</button><button type="button" data-notify-preset="all">Everything</button></div>
      ${NOTIFICATION_CATEGORIES.map(([id, label, description]) => `<label><input type="checkbox" value="${id}" ${selected.has(id) ? "checked" : ""}><span><strong>${esc(label)}</strong><small>${esc(description || "")}</small></span></label>`).join("")}
    </fieldset>` : ""}
  </section>`;
}


export async function render(view){
 leave();const request=++generation,member=currentMember();
 await ensureStylesheet('css/notifications.css');if(request!==generation)return;
 if(!member){view.innerHTML='<header class="notification-head"><div><small>DFL HQ</small><h1>Activity</h1></div></header><section class="card profile-entry"><h2>Your league inbox</h2><button type="button" class="btn" data-open-profile>Choose your profile</button></section>';return}
 const current=()=>request===generation&&view.isConnected&&String(currentMember()?.id)===String(member.id);
 view.innerHTML='<header class="notification-head"><div><small>DFL HQ</small><h1>Activity</h1></div></header><div class="activity-loading" role="status">Loading league activity…</div>';
 let rows,context,filter='all';
 try{rows=await inbox();if(!current())return;context=await loadActivityContext(rows,{memberId:member.id})}
 catch{if(!current())return;view.innerHTML='<header class="notification-head"><h1>Activity</h1></header><div class="notify-empty"><strong>Your inbox couldn’t load.</strong><button type="button" class="btn" data-retry-inbox>Retry</button></div>';view.querySelector('[data-retry-inbox]').onclick=()=>render(view);return}
 if(!current())return;
 view.innerHTML=`<header class="notification-head"><div><small>DFL HQ</small><h1>Activity</h1><p data-activity-count></p></div><button type="button" class="btn ghost small" data-activity-settings aria-haspopup="dialog">Settings</button></header>${activityFiltersMarkup(rows)}<div class="activity-toolbar"><button class="linkbtn" type="button" data-read-all>Mark all read</button><button class="linkbtn" type="button" data-clear-all>Clear inbox</button></div><section class="notification-inbox" aria-label="League activity" data-activity-list></section><p class="sr-only" role="status" data-activity-announcement></p>`;
 const paint=()=>{
  view.querySelector('[data-activity-list]').innerHTML=activityListMarkup(rows,context,filter);
  const unread=rows.filter(r=>!r.is_read).length;
  view.querySelector('[data-activity-count]').textContent=unread?`${unread} unread`:'All caught up';
  view.querySelector('[data-read-all]').disabled=!unread;view.querySelector('[data-clear-all]').disabled=!rows.length;
  const badge=view.querySelector('[data-activity-filter="unread"] b');if(badge)badge.textContent=unread;
 };
 paint();
 view.querySelector('[data-activity-settings]').onclick=e=>openSettings(e.currentTarget);
 async function openSettings(source){
  if(settingsSheet)return;
  const dialog=document.createElement('dialog');dialog.className='notification-settings-sheet';dialog.setAttribute('aria-labelledby','notify-settings-title');
  dialog.innerHTML='<header><h2 id="notify-settings-title">Notification settings</h2><button type="button" data-settings-close>Close</button></header><div data-sheet-body><p role="status">Checking this device…</p></div>';
  document.body.append(dialog);let busy=false,prefs=null;
  const sheet=mountMobileSheet(dialog,{canDismiss:()=>!busy,onClosed:()=>{sheet.stop();dialog.remove();if(settingsSheet?.dialog===dialog)settingsSheet=null}});
  settingsSheet={...sheet,dialog};sheet.open({source});dialog.querySelector('[data-settings-close]').onclick=()=>sheet.close();
  const body=dialog.querySelector('[data-sheet-body]');
  const draw=()=>{body.innerHTML=settingsMarkup(prefs)};
  const refresh=async()=>{try{prefs=await pushPreferences();if(current()&&dialog.open)draw()}catch{if(dialog.open)body.innerHTML='<p role="status">Device settings are unavailable.</p><button type="button" class="btn" data-settings-retry>Retry</button>'}};
  dialog.addEventListener('click',async event=>{
   const toggle=event.target.closest('[data-push-toggle]'),test=event.target.closest('[data-push-test]'),preset=event.target.closest('[data-notify-preset]');
   if(event.target.closest('[data-settings-retry]'))return refresh();
   if(busy||!current()||!toggle&&!test&&!preset)return;
   const button=toggle||test||preset;busy=true;button.disabled=true;
   try{
    if(toggle){await(toggle.dataset.pushToggle==='off'?disablePush():enablePush());if(current())toast('Notification settings saved');await refresh()}
    else if(test){button.textContent='Sending in 5 seconds…';await testNotification(5000);if(current())toast('Test sent to this device')}
    else if(prefs?.subscription){const categories=NOTIFICATION_PRESETS[preset.dataset.notifyPreset]||DEFAULT_NOTIFICATION_CATEGORIES;await saveSubscription(prefs.subscription,categories);prefs.categories=categories;if(dialog.open)draw();toast('Notification preferences saved')}
   }catch(error){if(current())toast(error.message||'Could not save settings',true)}
   finally{busy=false;if(button.isConnected){button.disabled=false;if(test)button.textContent='Send a test'}}
  });
  dialog.addEventListener('change',async event=>{
   if(!event.target.matches('.notify-categories input')||!prefs?.subscription||busy)return;
   const previous=prefs.categories,categories=[...dialog.querySelectorAll('.notify-categories input:checked')].map(i=>i.value);
   busy=true;dialog.querySelectorAll('.notify-categories input').forEach(i=>i.disabled=true);
   try{await saveSubscription(prefs.subscription,categories);prefs.categories=categories;toast('Notification preferences saved')}
   catch(error){prefs.categories=previous;if(dialog.open)draw();toast(error.message||'Could not save preferences',true)}
   finally{busy=false;dialog.querySelectorAll('.notify-categories input').forEach(i=>i.disabled=false)}
  });
  await refresh();
 }
 view.addEventListener('click',async event=>{
  if(!current())return;
  const tab=event.target.closest('[data-activity-filter]');
  if(tab){filter=tab.dataset.activityFilter;view.querySelectorAll('[data-activity-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===tab)));paint();view.querySelector('[data-activity-announcement]').textContent=`Showing ${tab.textContent.trim()} activity`;return}
  const link=event.target.closest('[data-notification-id]');if(link){void markRead([Number(link.dataset.notificationId)]).catch(()=>{});return}
  const remove=event.target.closest('[data-delete-notification]'),read=event.target.closest('[data-read-all]'),clear=event.target.closest('[data-clear-all]');
  if(!remove&&!read&&!clear)return;
  const button=remove||read||clear;if(!clear)button.disabled=true;
  try{
   if(clear){const accepted=await confirmSheet({title:'Clear your inbox?',message:`Remove these ${rows.length} notices from your copy of the inbox.`,action:'Clear inbox',source:button});if(!accepted||!current())return;button.disabled=true;await clearInbox();rows=[]}
   else if(read){await markRead(rows.filter(r=>!r.is_read).map(r=>r.id));rows=rows.map(r=>({...r,is_read:true}))}
   else{const id=Number(remove.dataset.deleteNotification);await dismissNotifications([id]);rows=rows.filter(r=>Number(r.id)!==id)}
   if(current()){paint();view.querySelector('[data-activity-announcement]').textContent=remove?'Notification dismissed':read?'All activity marked read':'Inbox cleared';view.querySelector('[data-activity-filter][aria-pressed="true"]').focus({preventScroll:true})}
  }catch(error){if(current())toast(error.message||'Could not update your inbox',true)}
  finally{if(button.isConnected)button.disabled=false}
 },{signal:(()=>{const c=new AbortController();leaveHandlers=()=>c.abort();return c.signal})()});
}
let leaveHandlers=null;
