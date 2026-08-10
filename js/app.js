// =====================================================================
// app.js - start-up: theme, "Who are you?", admin restore, router, SW
// =====================================================================
import { APP_VERSION } from "./config.js";
import { getUsername, setUsername } from "./store.js";
import { restoreAdmin, registerUser, configured } from "./supabase.js";
import { loadMembers, restoreMember, selectMember, currentMember, getMemberId } from "./members.js";
import { initTheme } from "./theme.js";
import { loadSettings } from "./settings.js";
import { startRouter, renderRoute, go } from "./router.js";
import { setupInstall } from "./install.js";
import { setupUpdates } from "./update.js";
import { esc, toast } from "./ui.js";
const welcome=document.getElementById("welcome"),welcomeForm=document.getElementById("welcome-form"),welcomeInput=document.getElementById("welcome-input"),welcomeCancel=document.getElementById("welcome-cancel"),memberList=document.getElementById("member-list"),whoamiName=document.getElementById("whoami-name");
function paintName(){const m=currentMember();if(whoamiName)whoamiName.textContent=m?m.display_name:(getUsername()||"Who are you?")}
async function openPicker({cancellable=false}={}){if(!welcome||!memberList)return;if(welcomeCancel)welcomeCancel.classList.toggle("hidden",!cancellable);welcome.classList.remove("hidden");memberList.innerHTML=`<div class="muted tiny">Loading members…</div>`;let members=[];try{members=await loadMembers({force:true})}catch{}if(!members.length){memberList.innerHTML=`<div class="muted tiny">No members yet. An admin can add them in Admin → Members.</div>`;if(welcomeForm)welcomeForm.classList.remove("hidden");if(welcomeInput){welcomeInput.value=getUsername();setTimeout(()=>welcomeInput.focus(),50)}return}if(welcomeForm)welcomeForm.classList.add("hidden");const mine=getMemberId();memberList.innerHTML=members.map(m=>`<button type="button" class="memberbtn ${String(m.id)===mine?"on":""}" data-member="${m.id}"><span class="avatar avatar-fallback sm">${esc(initials(m.display_name))}</span><span class="memberbtn-text"><strong>${esc(m.display_name)}</strong>${m.team_name?`<span class="muted tiny">${esc(m.team_name)}</span>`:""}</span></button>`).join("")}
function initials(name){return String(name||"?").trim().slice(0,2).toUpperCase()}
if(memberList)memberList.addEventListener("click",async e=>{const btn=e.target.closest("button[data-member]");if(!btn)return;const members=await loadMembers();const member=members.find(m=>String(m.id)===btn.dataset.member);if(!member)return;selectMember(member);paintName();welcome?.classList.add("hidden");await registerUser(member.display_name);toast(`Welcome, ${member.display_name}`);renderRoute()});
if(welcomeForm)welcomeForm.addEventListener("submit",async e=>{e.preventDefault();const name=welcomeInput?.value.trim();if(!name)return;setUsername(name);paintName();welcome?.classList.add("hidden");await registerUser(name);renderRoute()});
if(welcomeCancel)welcomeCancel.addEventListener("click",()=>welcome?.classList.add("hidden"));
document.getElementById("whoami")?.addEventListener("click",()=>{if(currentMember())go("profile");else openPicker({cancellable:!!getUsername()})});
window.addEventListener("dfl:pick-member",()=>openPicker({cancellable:true}));
async function boot(){console.log(`DFL HQ v${APP_VERSION}`);initTheme();if(!configured)toast("Add your Supabase keys in js/config.js",true);await Promise.all([restoreAdmin(),restoreMember(),loadSettings()]);paintName();startRouter();if(!currentMember()&&!getUsername())openPicker();else if(getUsername())registerUser(getUsername());if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).catch(console.warn);setupInstall();setupUpdates()}
boot();
