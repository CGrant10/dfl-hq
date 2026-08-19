// =====================================================================
// Member lock - optional PIN before a protected member identity can be used.
// Also owns the post-identity view choice for commissioners/owner.
// =====================================================================
import { db, restoreAdmin, commissionerLogin, adminLogin, adminLogout } from "./supabase.js";
import { currentMember } from "./members.js";
import { getAdminToken, getCommissionerPin, setAdminToken, setCommissionerPin } from "./store.js";
import { esc, toast } from "./ui.js";
const key=id=>`dfl.profile.unlocked.${id}`;
const pinKey=id=>`dfl.profile.pin.${id}`;
const reminderKey=id=>`dfl.profile.lockReminder.${id}`;
const REMINDER_MS=30*24*60*60*1000;
const unlocked=id=>{try{return sessionStorage.getItem(key(id))==="1"}catch{return false}};
const markUnlocked=id=>{try{sessionStorage.setItem(key(id),"1")}catch{}};
const rememberPin=(id,pin)=>{try{sessionStorage.setItem(pinKey(id),pin)}catch{}};
export const markMemberUnlocked = (id, pin = null) => { markUnlocked(id); if (pin) rememberPin(id, pin); };
export const isMemberUnlocked = (id) => unlocked(id);
export function verifiedPin(memberId){if(memberId==null)return null;try{return sessionStorage.getItem(pinKey(memberId))||null}catch{return null}}
export function forgetVerifiedPin(memberId){try{sessionStorage.removeItem(pinKey(memberId));sessionStorage.removeItem(key(memberId))}catch{}}

let overlay=null,pendingButton=null,started=false,replaying=false;
let commissionerIds=null;
async function isLocked(memberId){try{const{data,error}=await db().rpc("profile_lock_status",{target_member_id:Number(memberId)});if(error)throw error;return!!data}catch{return false}}
async function loadCommissionerIds(){
 if(commissionerIds)return commissionerIds;
 try{const{data,error}=await db().rpc("public_commissioners");if(error)throw error;commissionerIds=new Set((data||[]).map(r=>String(r.member_id)));}
 catch{commissionerIds=new Set();}
 return commissionerIds;
}
function closeOverlay(){overlay?.remove();overlay=null}
function replay(btn){replaying=true;try{btn?.click()}finally{replaying=false}}
const waitForMember=async id=>{for(let i=0;i<30;i++){if(String(localStorage.getItem("dfl.memberId")||"")===String(id))return true;await new Promise(r=>setTimeout(r,20));}return false};
const redraw=()=>window.dispatchEvent(new HashChangeEvent("hashchange"));

function reminderDue(id){
 try{
   const last=Number(localStorage.getItem(reminderKey(id))||0);
   return !last||Date.now()-last>=REMINDER_MS;
 }catch{return true}
}
function markReminder(id){try{localStorage.setItem(reminderKey(id),String(Date.now()))}catch{}}
async function scrollToProfileLock(){
 location.hash="#/profile";
 for(let i=0;i<24;i++){
   await new Promise(r=>setTimeout(r,100));
   const card=document.querySelector("[data-profile-lock-settings]");
   if(card){card.scrollIntoView({behavior:"smooth",block:"center"});return;}
 }
}
function showProfileLockReminder(member){
 if(overlay)return;
 overlay=document.createElement("div");overlay.className="overlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label","Protect your DFL profile");
 overlay.innerHTML=`<div class="overlay-card"><h2>Want to lock your profile?</h2><p class="muted">You can add a 4–6 digit PIN so nobody else can open DFL HQ as <strong>${esc(member.display_name)}</strong>.</p><div class="row-end"><button type="button" class="btn ghost" data-lock-remind-later>Not now</button><button type="button" class="btn" data-lock-remind-set>Set a PIN</button></div><p class="muted tiny">We’ll only remind you about this occasionally.</p></div>`;
 document.body.appendChild(overlay);
 overlay.querySelector("[data-lock-remind-later]")?.addEventListener("click",closeOverlay);
 overlay.querySelector("[data-lock-remind-set]")?.addEventListener("click",async()=>{closeOverlay();await scrollToProfileLock();});
}
async function maybeRemindProfileLock(member){
 if(!member?.id||!reminderDue(member.id))return;
 /* A lock already exists: never advertise a feature this profile already uses. */
 if(await isLocked(member.id))return;
 markReminder(member.id);
 showProfileLockReminder(member);
}
function scheduleProfileLockReminder(member){setTimeout(()=>void maybeRemindProfileLock(member),550)}

/* Member View must really be non-admin even when a credential is remembered.
   Preserve the saved secrets, clear only the live privileged client, then put
   the secrets back so Commissioner View can restore them later without a trip
   through Admin. */
function suspendPrivilege(){
 const master=getAdminToken(),commissioner=getCommissionerPin();
 adminLogout();
 if(master)setAdminToken(master);
 if(commissioner)setCommissionerPin(commissioner);
}

async function activateSavedPrivilege(memberId){
 await waitForMember(memberId);
 try{return await restoreAdmin()}catch{return false}
}

function showPrivilegeLogin(member,btn,{startup=false}={}){
 closeOverlay();overlay=document.createElement("div");overlay.className="overlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label",`Commissioner access for ${member.display_name}`);
 overlay.innerHTML=`<div class="overlay-card"><h2>Commissioner View</h2><p class="muted">Unlock privileged tools as <strong>${esc(member.display_name)}</strong>.</p>
 <form data-commissioner-login autocomplete="off"><label for="pick-commissioner-pin">Commissioner PIN</label><input id="pick-commissioner-pin" name="dfl-commissioner-pin" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" required style="-webkit-text-security:disc"><div class="row-end"><button type="button" class="btn ghost" data-mode-back>Back</button><button type="submit" class="btn">Open Commissioner View</button></div></form>
 <details style="margin-top:12px"><summary class="muted tiny">Owner master access</summary><form data-master-login autocomplete="off" style="margin-top:10px"><label for="pick-master-key">Master password</label><input id="pick-master-key" name="dfl-admin-key" type="password" autocomplete="off" data-lpignore="true" data-1p-ignore><div class="row-end"><button type="submit" class="btn ghost">Open Owner View</button></div></form></details></div>`;
 document.body.appendChild(overlay);
 const pin=overlay.querySelector("#pick-commissioner-pin");pin?.addEventListener("input",()=>{pin.value=pin.value.replace(/\D/g,"").slice(0,12)});
 overlay.querySelector("[data-mode-back]")?.addEventListener("click",()=>showViewChoice(member,btn,{startup}));
 overlay.querySelector("[data-commissioner-login]")?.addEventListener("submit",async e=>{e.preventDefault();const submit=e.currentTarget.querySelector('button[type="submit"]');submit.disabled=true;try{await waitForMember(member.id);if(!(await commissionerLogin(pin.value,true)))throw new Error("Commissioner PIN not accepted");closeOverlay();toast("Commissioner View on");if(startup)redraw();else{location.hash="#/home";redraw();scheduleProfileLockReminder(member);}}catch(err){toast(err.message||"Could not unlock commissioner access",true);submit.disabled=false;pin.select();}});
 overlay.querySelector("[data-master-login]")?.addEventListener("submit",async e=>{e.preventDefault();const input=e.currentTarget.querySelector("#pick-master-key"),submit=e.currentTarget.querySelector('button[type="submit"]');submit.disabled=true;try{await waitForMember(member.id);if(!(await adminLogin(input.value,true)))throw new Error("Master password not accepted");closeOverlay();toast("Owner View on");if(startup)redraw();else{location.hash="#/home";redraw();scheduleProfileLockReminder(member);}}catch(err){toast(err.message||"Could not unlock owner access",true);submit.disabled=false;input.select();}});
 setTimeout(()=>pin?.focus(),0);
}

function showViewChoice(member,btn,{startup=false}={}){
 closeOverlay();overlay=document.createElement("div");overlay.className="overlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label",`Choose view for ${member.display_name}`);
 overlay.innerHTML=`<div class="overlay-card"><h2>Open as ${esc(member.display_name)}</h2><p class="muted">Choose how you want to enter DFL HQ.</p><div class="stack" style="gap:10px"><button type="button" class="btn ghost" data-member-view><strong>Member View</strong><span class="muted tiny" style="display:block">Regular league view. No commissioner controls.</span></button><button type="button" class="btn" data-admin-view><strong>Commissioner View</strong><span class="tiny" style="display:block;opacity:.8">Open with your privileged tools.</span></button></div>${startup?"":`<div class="row-end" style="margin-top:12px"><button type="button" class="btn ghost" data-choice-cancel>Back</button></div>`}</div>`;
 document.body.appendChild(overlay);
 overlay.querySelector("[data-choice-cancel]")?.addEventListener("click",closeOverlay);
 overlay.querySelector("[data-member-view]")?.addEventListener("click",()=>{suspendPrivilege();closeOverlay();if(btn){replay(btn);scheduleProfileLockReminder(member);}else redraw();toast(`Member View · ${member.display_name}`)});
 overlay.querySelector("[data-admin-view]")?.addEventListener("click",async()=>{
   const choice=overlay.querySelector("[data-admin-view]");choice.disabled=true;
   closeOverlay();if(btn)replay(btn);
   if(await activateSavedPrivilege(member.id)){toast(`Commissioner View · ${member.display_name}`);if(startup)redraw();else{location.hash="#/home";redraw();scheduleProfileLockReminder(member);}return;}
   showPrivilegeLogin(member,btn,{startup});
 });
}

async function continueMemberPick(btn,member){
 const ids=await loadCommissionerIds();
 if(ids.has(String(member.id))){showViewChoice(member,btn);return;}
 replay(btn);
 scheduleProfileLockReminder(member);
}

function showLock(member,{onSuccess=null,cancellable=true,afterUnlock=null}={}){
 closeOverlay();overlay=document.createElement("div");overlay.className="overlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label",`${member.display_name} locked`);
 overlay.innerHTML=`<div class="overlay-card"><h2>${esc(member.display_name)} is locked</h2><p class="muted">Enter this member's PIN to use DFL HQ as ${esc(member.display_name)}.</p><form data-member-lock-form autocomplete="off"><label for="member-lock-pin">PIN</label><input id="member-lock-pin" name="dfl-member-pin" type="text" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="6" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" required autofocus style="-webkit-text-security:disc"><div class="row-end">${cancellable?`<button type="button" class="btn ghost" data-member-lock-cancel>Back</button>`:""}<button type="submit" class="btn">Unlock DFL HQ</button></div></form><p class="muted tiny">The PIN stays unlocked only for this app session.</p></div>`;document.body.appendChild(overlay);
 const input=overlay.querySelector("#member-lock-pin");input?.addEventListener("input",()=>{input.value=input.value.replace(/\D/g,"").slice(0,6)});overlay.querySelector("[data-member-lock-cancel]")?.addEventListener("click",()=>{pendingButton=null;closeOverlay()});overlay.querySelector("[data-member-lock-form]")?.addEventListener("submit",async e=>{e.preventDefault();const submit=e.currentTarget.querySelector('button[type="submit"]');submit.disabled=true;try{const{data,error}=await db().rpc("profile_verify_pin",{target_member_id:Number(member.id),attempted_pin:input.value});if(error)throw error;if(data!==true)throw new Error("Wrong profile PIN");markUnlocked(member.id);rememberPin(member.id,input.value);const choice=pendingButton;pendingButton=null;closeOverlay();toast(`Unlocked for ${member.display_name}`);if(afterUnlock&&choice)await afterUnlock(choice,member);else if(onSuccess)await onSuccess();else replay(choice);}catch(err){toast(err.message||"Could not unlock member",true);submit.disabled=false;input.select();}});setTimeout(()=>input?.focus(),0);
}

function interceptMemberPick(event){
 if(replaying)return;const btn=event.target.closest?.("button[data-member]");if(!btn)return;
 event.preventDefault();event.stopImmediatePropagation();const id=btn.dataset.member;if(!id)return;
 const label=btn.querySelector("strong")?.textContent?.trim()||"This member";const member={id,display_name:label};
 if(unlocked(id)){void continueMemberPick(btn,member);return;}
 btn.disabled=true;isLocked(id).then(locked=>{btn.disabled=false;if(!locked){void continueMemberPick(btn,member);return;}pendingButton=btn;showLock(member,{cancellable:true,afterUnlock:continueMemberPick});});
}

async function enterRememberedIdentity(){
 const member=currentMember();
 if(!member)return;
 /* A shared/OBS broadcast is intentionally public and must never get an
    identity-mode modal dropped over the race. */
 if(location.hash.split("?")[0]==="#/broadcast")return;
 const ids=await loadCommissionerIds();
 const privileged=ids.has(String(member.id));
 const locked=await isLocked(member.id);
 if(locked&&!unlocked(member.id)){
   showLock(member,{cancellable:false,onSuccess:async()=>{if(privileged)showViewChoice(member,null,{startup:true});}});
   return;
 }
 if(privileged)showViewChoice(member,null,{startup:true});
}

export function startMemberLock(){
 if(started)return;
 started=true;
 document.addEventListener("click",interceptMemberPick,true);
 void enterRememberedIdentity();
}
