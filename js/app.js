// =====================================================================
// app.js - start-up: theme, "Who are you?", admin restore, router, SW
// =====================================================================
import { APP_VERSION } from "./config.js";
import { getUsername } from "./store.js";
import { restoreAdmin, registerUser, configured } from "./supabase.js";
import { loadMembers, restoreMember, selectMember, currentMember, getMemberId } from "./members.js";
import { startPresence } from "./presence.js";
import { initTheme } from "./theme.js";
import { loadSettings } from "./settings.js";
import { startRouter, renderRoute, go } from "./router.js";
import { setupInstall } from "./install.js";
import { setupUpdates } from "./update.js";
import { esc, toast } from "./ui.js";
import { golfPass, clearGolfPass, onGolfPassChange } from "./golf-guest.js";
import { mountJoin } from "./golf-join.js";
/* welcomeForm and welcomeInput used to be looked up here and have never
   existed in index.html - leftovers from the free-text name box that the
   member picker replaced. Every branch that touched them was dead. */
const welcome=document.getElementById("welcome"),welcomeCancel=document.getElementById("welcome-cancel"),
      welcomeJoin=document.getElementById("welcome-join"),welcomeGolf=document.getElementById("welcome-golf"),
      welcomeCard=welcome?.querySelector(".overlay-card"),
      memberList=document.getElementById("member-list"),whoamiName=document.getElementById("whoami-name");
/* A golf guest is somebody, and the chip should say so. They have no member
   row and no username, so without this the top right read "Who are you?" at
   a person who had just told the app exactly who they were. */
function paintName(){
  const m=currentMember(),g=golfPass();
  if(!whoamiName)return;
  whoamiName.textContent=m?m.display_name:(g?g.name:(getUsername()||"Who are you?"));
}
async function openPicker({cancellable=false}={}){
  if(!welcome||!memberList)return;
  welcomeJoin?.classList.add("hidden");
  welcomeCard?.classList.remove("hidden");
  /* Dismissable when there is somewhere to go back to. This is what the
     button in index.html now makes possible; before, cancellable was a
     parameter that toggled a class on null. */
  welcomeCancel?.classList.toggle("hidden",!cancellable);
  welcome.classList.remove("hidden");
  memberList.innerHTML=`<div class="muted tiny">Loading members…</div>`;
  let members=[];
  try{members=await loadMembers({force:true})}catch{}
  if(!members.length){
    memberList.innerHTML=`<div class="muted tiny">No members yet. An admin can add them in Admin → Members.</div>`;
    return;
  }
  const mine=getMemberId();
  memberList.innerHTML=members.map(m=>`<button type="button" class="memberbtn ${String(m.id)===mine?"on":""}" data-member="${m.id}"><span class="avatar avatar-fallback sm">${esc(initials(m.display_name))}</span><span class="memberbtn-text"><strong>${esc(m.display_name)}</strong>${m.team_name?`<span class="muted tiny">${esc(m.team_name)}</span>`:""}</span></button>`).join("");
}

/*
  THE GUEST DOOR.

  Mounted over the picker rather than beside it, and it never touches member
  identity: no selectMember, no setUsername, no registerUser. A guest who
  finishes this has an event pass and nothing else, which is exactly the
  amount of standing they should have.
*/
function openGolfJoin(){
  if(!welcome||!welcomeJoin)return;
  welcome.classList.remove("hidden");
  welcomeCard?.classList.add("hidden");
  welcomeJoin.classList.remove("hidden");
  mountJoin(welcomeJoin,{
    onDone:(pass)=>{
      welcome.classList.add("hidden");
      paintName();
      location.hash=`#/golf?id=${pass.outing}`;
      renderRoute();
    },
    /* Back to the picker, because somebody who opened this by mistake still
       has to get in somehow. */
    onCancel:()=>openPicker({cancellable:!!(currentMember()||getUsername()||golfPass())}),
  });
}

function initials(name){return String(name||"?").trim().slice(0,2).toUpperCase()}
/*
  The More sheet. The tab bar is four doors now, so everything else lives
  here. Opening it is the only new interaction; the routes are unchanged, so
  a link inside it just changes the hash and the sheet closes itself.
*/
const moreSheet=document.getElementById("more"),moreBtn=document.getElementById("more-btn");
/* The button says whether the sheet is open, because "More" on its own tells
   a screen reader nothing about what tapping it just did. */
const syncMore=()=>moreBtn?.setAttribute("aria-expanded",String(!moreSheet?.classList.contains("hidden")));
const closeMore=()=>{moreSheet?.classList.add("hidden");syncMore()};
moreBtn?.addEventListener("click",()=>{moreSheet?.classList.toggle("hidden");syncMore()});
document.getElementById("more-close")?.addEventListener("click",closeMore);
// Tapping the backdrop closes it; tapping the card must not.
moreSheet?.addEventListener("click",e=>{if(e.target===moreSheet)closeMore()});
moreSheet?.addEventListener("click",e=>{if(e.target.closest("a"))closeMore()});
window.addEventListener("hashchange",closeMore);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMore()});
if(memberList)memberList.addEventListener("click",async e=>{const btn=e.target.closest("button[data-member]");if(!btn)return;const members=await loadMembers();const member=members.find(m=>String(m.id)===btn.dataset.member);if(!member)return;selectMember(member);paintName();welcome?.classList.add("hidden");await registerUser(member.display_name);toast(`Welcome, ${member.display_name}`);renderRoute()});
welcomeCancel?.addEventListener("click",()=>welcome?.classList.add("hidden"));
welcomeGolf?.addEventListener("click",openGolfJoin);
/* Escape closes the picker only when there is a way back in - trapping
   somebody in a modal is the bug this pass exists to fix, and so is letting
   them escape a first run with no identity at all. */
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape"||welcome?.classList.contains("hidden"))return;
  if(currentMember()||getUsername()||golfPass())welcome.classList.add("hidden");
});
document.getElementById("whoami")?.addEventListener("click",()=>{
  if(currentMember())return go("profile");
  /* A guest's name goes back to the event they joined. Sending them to the
     member picker would be asking a question they have already answered. */
  const g=golfPass();
  if(g)return void(location.hash=`#/golf?id=${g.outing}`);
  openPicker({cancellable:!!getUsername()});
});
window.addEventListener("dfl:pick-member",()=>openPicker({cancellable:true}));
async function boot(){console.log(`DFL HQ v${APP_VERSION}`);initTheme();/* Aggregate only - presence.js never learns who anybody is. */startPresence();if(!configured)toast("Add your Supabase keys in js/config.js",true);await Promise.all([restoreAdmin(),restoreMember(),loadSettings()]);paintName();startRouter();/* A guest holding an event pass has already said who they are. Raising the
   member picker over them was the whole bug. */
if(!currentMember()&&!getUsername()&&!golfPass())openPicker();
else if(getUsername())registerUser(getUsername());if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).catch(console.warn);setupInstall();setupUpdates()}
onGolfPassChange(paintName);
boot();
