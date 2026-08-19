// =====================================================================
// Member lock - optional PIN before a protected member identity can be used.
// ---------------------------------------------------------------------
// This moves Profile PINs up to the identity boundary: if a member has a PIN,
// the entire app stays behind a blocking overlay until that PIN is verified.
// A successful unlock lasts for this browser/app session only.
// =====================================================================
import { db } from "./supabase.js";
import { currentMember } from "./members.js";
import { esc, toast } from "./ui.js";

const key=(id)=>`dfl.profile.unlocked.${id}`;
const unlocked=(id)=>{try{return sessionStorage.getItem(key(id))==="1"}catch{return false}};
const markUnlocked=(id)=>{try{sessionStorage.setItem(key(id),"1")}catch{}};

let overlay=null;
let pendingButton=null;
let started=false;
let replaying=false;

async function isLocked(memberId){
  try{
    const {data,error}=await db().rpc("profile_lock_status",{target_member_id:Number(memberId)});
    if(error)throw error;
    return !!data;
  }catch{
    // Migration missing or temporarily unavailable: do not brick identity.
    return false;
  }
}

function closeOverlay(){overlay?.remove();overlay=null}
function replay(btn){replaying=true;try{btn?.click()}finally{replaying=false}}

function showLock(member,{onSuccess=null,cancellable=true}={}){
  closeOverlay();
  overlay=document.createElement("div");
  overlay.className="overlay";
  overlay.setAttribute("role","dialog");
  overlay.setAttribute("aria-modal","true");
  overlay.setAttribute("aria-label",`${member.display_name} locked`);
  overlay.innerHTML=`<div class="overlay-card">
    <h2>${esc(member.display_name)} is locked</h2>
    <p class="muted">Enter this member's PIN to use DFL HQ as ${esc(member.display_name)}.</p>
    <form data-member-lock-form>
      <label for="member-lock-pin">PIN</label>
      <input id="member-lock-pin" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="6" autocomplete="off" required autofocus>
      <div class="row-end">${cancellable?`<button type="button" class="btn ghost" data-member-lock-cancel>Back</button>`:""}<button type="submit" class="btn">Unlock DFL HQ</button></div>
    </form>
    <p class="muted tiny">The PIN stays unlocked only for this app session.</p>
  </div>`;
  document.body.appendChild(overlay);

  const input=overlay.querySelector("#member-lock-pin");
  input?.addEventListener("input",()=>{input.value=input.value.replace(/\D/g,"").slice(0,6)});
  overlay.querySelector("[data-member-lock-cancel]")?.addEventListener("click",()=>{pendingButton=null;closeOverlay()});
  overlay.querySelector("[data-member-lock-form]")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const btn=e.currentTarget.querySelector('button[type="submit"]');
    btn.disabled=true;
    try{
      const {data,error}=await db().rpc("profile_verify_pin",{
        target_member_id:Number(member.id),attempted_pin:input.value
      });
      if(error)throw error;
      if(data!==true)throw new Error("Wrong PIN");
      markUnlocked(member.id);
      const choice=pendingButton;
      pendingButton=null;
      closeOverlay();
      toast(`Unlocked for ${member.display_name}`);
      if(onSuccess)onSuccess(); else replay(choice);
    }catch(err){
      toast(err.message||"Could not unlock member",true);
      btn.disabled=false;
      input.select();
    }
  });
  setTimeout(()=>input?.focus(),0);
}

function interceptMemberPick(event){
  if(replaying)return;
  const btn=event.target.closest?.("button[data-member]");
  if(!btn)return;

  // Stop every identity click synchronously. Browser events do not wait for an
  // async listener, so allowing propagation until the status RPC returned
  // would let app.js select the member before the PIN check finished.
  event.preventDefault();
  event.stopImmediatePropagation();

  const id=btn.dataset.member;
  if(!id)return;
  if(unlocked(id)){replay(btn);return;}

  const label=btn.querySelector("strong")?.textContent?.trim()||"This member";
  btn.disabled=true;
  isLocked(id).then((locked)=>{
    btn.disabled=false;
    if(!locked){replay(btn);return;}
    pendingButton=btn;
    showLock({id,display_name:label},{cancellable:true});
  });
}

async function lockRememberedIdentity(){
  const member=currentMember();
  if(!member||unlocked(member.id))return;
  if(!(await isLocked(member.id)))return;
  showLock(member,{cancellable:false,onSuccess:()=>{}});
}

export function startMemberLock(){
  if(started)return;
  started=true;
  document.addEventListener("click",interceptMemberPick,true);
  lockRememberedIdentity();
}
