// =====================================================================
// Member lock - optional PIN before a protected member identity can be used.
// =====================================================================
import { db } from "./supabase.js";
import { currentMember } from "./members.js";
import { esc, toast } from "./ui.js";
const key=id=>`dfl.profile.unlocked.${id}`;
const pinKey=id=>`dfl.profile.pin.${id}`;
const unlocked=id=>{try{return sessionStorage.getItem(key(id))==="1"}catch{return false}};
const markUnlocked=id=>{try{sessionStorage.setItem(key(id),"1")}catch{}};
/*
  THE VERIFIED PIN IS KEPT FOR THE SESSION, AND THAT IS THE POINT.

  This screen verified the PIN and then threw it away, keeping a boolean. So a
  member who had already unlocked the app on the way in was asked for the same
  PIN again the moment they tried to write anything that needs server-side proof
  of identity - which is every keeper change. Being asked twice for the same
  secret in one session reads as the app not remembering, and it is.

  Kept in sessionStorage rather than in a module variable so a reload does not
  re-ask while the `unlocked` flag beside it still says otherwise - the two have
  to have the same lifetime or they disagree. It dies with the tab.

  The tradeoff, stated plainly: a PIN in sessionStorage is weaker than a PIN
  held nowhere. It is same-origin, same-tab, gone on close, and it sits beside a
  flag that already grants the same access to anything that only checks the
  flag. What it buys is that the SERVER can keep verifying every keeper write
  against the stored hash instead of the app trusting its own boolean - which is
  the stronger half of the guarantee, and the half that matters.
*/
const rememberPin=(id,pin)=>{try{sessionStorage.setItem(pinKey(id),pin)}catch{}};
/*
  EXPORTED, BECAUSE THERE WERE TWO OF THESE AND THAT WAS THE BUG.

  pages/profile-locked.js had its own copy of key()/unlocked()/markUnlocked() -
  same sessionStorage keys, separate code - and it is the gate a member actually
  passes when they open their own profile. So teaching THIS file to keep the
  verified PIN fixed the overlay nobody was using and left the real gate
  discarding it, which is why the keeper card kept asking for a PIN that had just
  been typed one screen earlier.

  One owner now. profile-locked.js imports these instead of redefining them, so a
  third gate cannot quietly appear with a fourth opinion about the same state.
*/
export const markMemberUnlocked = (id, pin = null) => {
  markUnlocked(id);
  if (pin) rememberPin(id, pin);
};
export const isMemberUnlocked = (id) => unlocked(id);
/** The PIN this member unlocked with, for calls that need server-side proof. */
export function verifiedPin(memberId){
 if(memberId==null)return null;
 try{return sessionStorage.getItem(pinKey(memberId))||null}catch{return null}
}
export function forgetVerifiedPin(memberId){
 try{sessionStorage.removeItem(pinKey(memberId));sessionStorage.removeItem(key(memberId))}catch{}
}
let overlay=null,pendingButton=null,started=false,replaying=false;
async function isLocked(memberId){try{const{data,error}=await db().rpc("profile_lock_status",{target_member_id:Number(memberId)});if(error)throw error;return!!data}catch{return false}}
function closeOverlay(){overlay?.remove();overlay=null}
function replay(btn){replaying=true;try{btn?.click()}finally{replaying=false}}
function showLock(member,{onSuccess=null,cancellable=true}={}){
 closeOverlay();overlay=document.createElement("div");overlay.className="overlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label",`${member.display_name} locked`);
 overlay.innerHTML=`<div class="overlay-card"><h2>${esc(member.display_name)} is locked</h2><p class="muted">Enter this member's PIN to use DFL HQ as ${esc(member.display_name)}.</p><form data-member-lock-form autocomplete="off"><label for="member-lock-pin">PIN</label><input id="member-lock-pin" name="dfl-member-pin" type="text" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="6" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" required autofocus style="-webkit-text-security:disc"><div class="row-end">${cancellable?`<button type="button" class="btn ghost" data-member-lock-cancel>Back</button>`:""}<button type="submit" class="btn">Unlock DFL HQ</button></div></form><p class="muted tiny">The PIN stays unlocked only for this app session.</p></div>`;document.body.appendChild(overlay);
 const input=overlay.querySelector("#member-lock-pin");input?.addEventListener("input",()=>{input.value=input.value.replace(/\D/g,"").slice(0,6)});overlay.querySelector("[data-member-lock-cancel]")?.addEventListener("click",()=>{pendingButton=null;closeOverlay()});overlay.querySelector("[data-member-lock-form]")?.addEventListener("submit",async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;try{const{data,error}=await db().rpc("profile_verify_pin",{target_member_id:Number(member.id),attempted_pin:input.value});if(error)throw error;if(data!==true)throw new Error("Wrong PIN");markUnlocked(member.id);rememberPin(member.id,input.value);const choice=pendingButton;pendingButton=null;closeOverlay();toast(`Unlocked for ${member.display_name}`);if(onSuccess)onSuccess();else replay(choice);}catch(err){toast(err.message||"Could not unlock member",true);btn.disabled=false;input.select();}});setTimeout(()=>input?.focus(),0);
}
function interceptMemberPick(event){if(replaying)return;const btn=event.target.closest?.("button[data-member]");if(!btn)return;event.preventDefault();event.stopImmediatePropagation();const id=btn.dataset.member;if(!id)return;if(unlocked(id)){replay(btn);return;}const label=btn.querySelector("strong")?.textContent?.trim()||"This member";btn.disabled=true;isLocked(id).then(locked=>{btn.disabled=false;if(!locked){replay(btn);return;}pendingButton=btn;showLock({id,display_name:label},{cancellable:true});});}
async function lockRememberedIdentity(){const member=currentMember();if(!member||unlocked(member.id))return;if(!(await isLocked(member.id)))return;showLock(member,{cancellable:false,onSuccess:()=>{}});}
export function startMemberLock(){if(started)return;started=true;document.addEventListener("click",interceptMemberPick,true);lockRememberedIdentity();}
