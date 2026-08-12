// =====================================================================
// Home - the league's front door.
// =====================================================================
import { db, configured } from "../supabase.js";
import { esc, empty, fmtDate, relDate, fmtShort, money, errorBox, toast } from "../ui.js";
import { APP_VERSION, LEAGUE_FOUNDED } from "../config.js";
import { checkForUpdate } from "../update.js";
import { promptInstall, isInstalled } from "../install.js";
import { currentMember } from "../members.js";
import { addControl, editControls, wireInline, canEdit, visible, hiddenClass } from "../inline.js";
import { loadSettings, saveSetting, KEY_LOGO } from "../settings.js";
function installHelp(){const ua=navigator.userAgent;if(/iphone|ipad|ipod/i.test(ua))return "In Safari: Share, then Add to Home Screen";if(/android/i.test(ua))return "Chrome menu (⋮), then Install app";return "Chrome menu (⋮) → Cast, save and share → Install page as app"}
export async function render(view){if(!configured){view.innerHTML=setupNotice();return}const today=new Date().toISOString().slice(0,10);const [events,announcements,polls,leagues,members,golf,dues]=await Promise.all([db().from("events").select("*").gte("event_date",today).order("event_date",{ascending:true}).limit(3),db().from("announcements").select("*").order("created_at",{ascending:false}).limit(3),db().from("polls").select("*").eq("active",true).order("created_at",{ascending:false}).limit(3),db().from("sleeper_leagues").select("season, champion_user_id").order("season",{ascending:false}),db().from("members").select("id, display_name, team_name, sleeper_user_id"),db().from("golf_outings").select("id,name,event_date,status").neq("status","final").order("event_date",{ascending:true}).limit(1),db().from("finance_payments").select("season,amount_due,amount_paid")]);const firstError=events.error||announcements.error||polls.error;if(firstError){view.innerHTML=errorBox(firstError);return}const settings=await loadSettings();const memberRows=members.data||[];view.innerHTML=`<div id="home-wrap">${hero(leagues.data||[],memberRows,settings.get(KEY_LOGO))}${creedDoors(events.data,(golf.data||[])[0],polls.data,dues.data)}<section class="block"><h2 class="section-title">Upcoming<a class="section-link" href="#/calendar">Calendar →</a></h2>${eventList(events.data)}${adminRow(addControl("events","Add event"))}</section><section class="block"><h2 class="section-title">Announcements</h2>${announcementList(announcements.data)}${adminRow(addControl("announcements","Add announcement"))}</section><section class="block"><h2 class="section-title">Open polls<a class="section-link" href="#/polls">Vote →</a></h2>${pollList(polls.data)}${adminRow(addControl("polls","Add poll"))}</section><p class="version-line">DFL HQ v${esc(APP_VERSION)} · <button class="linkbtn" id="check-update">Check for updates</button>${isInstalled()?"":` · <button class="linkbtn" id="install-app">Install app</button>`}</p></div>`;wireInline(view.querySelector("#home-wrap"),()=>render(view));wireCrest(view);view.querySelector("#install-app")?.addEventListener("click",async()=>{const outcome=await promptInstall();if(outcome==="unavailable")toast(installHelp(),true)});view.querySelector("#check-update").addEventListener("click",async e=>{const btn=e.target;btn.disabled=true;btn.textContent="Checking…";try{const{stale,latest}=await checkForUpdate(true);if(!stale)toast(`Up to date (v${latest})`)}catch(err){toast("Could not check for updates",true);console.warn(err)}btn.disabled=false;btn.textContent="Check for updates"})}
function hero(leagues,members,logo){const me=currentMember();const latest=leagues.find(l=>l.champion_user_id);const champ=latest?members.find(m=>m.sleeper_user_id===latest.champion_user_id):null;const number=new Date().getFullYear()-LEAGUE_FOUNDED+1;const milestone=number>1&&number%10===0;return `<section class="hero ${milestone?"milestone":""}">${milestone?`<p class="hero-anniversary">${esc(ordinal(number))} Anniversary Season</p>`:""}<img class="hero-crest ${logo?"":"is-crest"}" src="${esc(logo||"icons/crest-512.png")}" alt="DFL league crest" ${logo?"":`width="512" height="341"`}><h1 class="sr-only">DFL HQ</h1>${canEdit()?`<div class="crest-tools"><input type="file" id="logo-file" accept="image/*" class="hidden"><button class="btn ghost small" id="logo-pick">Change crest</button>${logo?`<button class="btn ghost small" id="logo-reset">Use default</button>`:""}</div>`:""}<p class="hero-creed">Forged by sinners.<br>Fueled by rivalries.<br>Defined by champions.</p>${me?`<p class="hero-welcome">Welcome back, <strong>${esc(me.display_name)}</strong>.</p>`:""}<p class="hero-line">${esc(ordinal(number))} season${members.length?` · ${members.length} owners`:""}${champ?` · ${esc(champ.team_name||champ.display_name)} holds it`:""}</p></section>`}
const CREST_SIZE=256,MAX_UPLOAD=12*1024*1024;function wireCrest(view){const pick=view.querySelector("#logo-pick"),file=view.querySelector("#logo-file"),reset=view.querySelector("#logo-reset");if(!pick||!file)return;pick.addEventListener("click",()=>file.click());reset?.addEventListener("click",async()=>{if(!confirm("Go back to the built-in crest?"))return;try{await saveSetting(KEY_LOGO,"");toast("Crest reset");render(view)}catch(err){toast(err.message||"Could not reset the crest",true)}});file.addEventListener("change",async()=>{const chosen=file.files?.[0];if(!chosen)return;if(!chosen.type.startsWith("image/")){toast("That is not an image",true);return}if(chosen.size>MAX_UPLOAD){toast("That image is too large",true);return}pick.disabled=true;pick.textContent="Working…";try{await saveSetting(KEY_LOGO,await toSquarePng(chosen,CREST_SIZE));toast("Crest updated");render(view)}catch(err){toast(err.message||"Could not read that image",true);pick.disabled=false;pick.textContent="Change crest"}})}
async function toSquarePng(fileObj,size){const bitmap=await createImageBitmap(fileObj);try{const side=Math.min(bitmap.width,bitmap.height),canvas=document.createElement("canvas");canvas.width=canvas.height=size;canvas.getContext("2d").drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,size,size);return canvas.toDataURL("image/png")}finally{bitmap.close?.()}}
function ordinal(n){const r=n%100;if(r>=11&&r<=13)return `${n}th`;return n+(["th","st","nd","rd"][n%10]||"th")}
/*
  THE CREED IS THE NAVIGATION.

  DRAFT * GOLF * SIN * FOLD is printed on the crest, and it happens to name
  the four things this league does. So it is the way in, rather than a
  decorative line of type above a ten-icon grid. The full list still exists,
  behind More in the tab bar.

  Each door carries one live number, and a door with nothing to say says so
  quietly rather than showing a zero.
*/
function creedDoors(events,golfRow,polls,dues){
  const draft=(events||[]).find(e=>/draft/i.test(e.title||e.name||""));
  const open=(polls||[]).length;
  // Only the newest season's shortfall - an old unpaid row is history, not a
  // number to put on the front page.
  const rows=dues||[];
  const season=rows.reduce((a,r)=>Math.max(a,Number(r.season)||0),0);
  const owed=rows.filter(r=>Number(r.season)===season)
    .reduce((t,r)=>t+Math.max(0,(Number(r.amount_due)||0)-(Number(r.amount_paid)||0)),0);
  const doors=[
    ["DRAFT","keepers",draft?relDate(draft.event_date):"Keepers"],
    ["GOLF","golf",golfRow?(golfRow.event_date?relDate(golfRow.event_date):"Set up"):"No event"],
    ["SIN","polls",open?`${open} open`:"Quiet"],
    ["FOLD","finances",owed?money(owed):"Settled"],
  ];
  return `<nav class="creed-doors">${doors.map(([word,route,sub],i)=>
    `<a class="cdoor cd-${i}" href="#/${route}"><span class="cd-word">${word}</span><span class="cd-sub">${esc(sub)}</span></a>`
  ).join("")}</nav>`;
}
function adminRow(control){return control?`<div class="row-end">${control}</div>`:""}function eventList(allRows){const rows=visible("events",allRows);if(!rows.length)return empty("Nothing on the schedule yet.");return rows.map(e=>`<article class="card event ${hiddenClass("events",e)}"><div class="event-when"><span class="event-date">${esc(fmtDate(e.event_date))}</span><span class="pill green">${esc(relDate(e.event_date))}</span></div><h3 class="card-heading">${esc(e.title)}</h3>${e.description?`<div class="card-body">${esc(e.description)}</div>`:""}${editControls("events",e)}</article>`).join("")}
function announcementList(allRows){const rows=visible("announcements",allRows);if(!rows.length)return empty("Nothing from the commissioner yet.");return rows.map(a=>`<article class="card ${hiddenClass("announcements",a)}"><div class="card-kicker">${esc(fmtShort(a.created_at))}</div><h3 class="card-heading">${esc(a.title)}</h3><div class="card-body">${esc(a.content)}</div>${editControls("announcements",a)}</article>`).join("")}
function pollList(allRows){const rows=visible("polls",allRows);if(!rows.length)return empty("No polls open right now.");return rows.map(p=>`<a class="card linkcard ${hiddenClass("polls",p)}" href="#/polls"><h3 class="card-heading">${esc(p.question)}</h3><span class="card-cta">Cast your vote →</span></a>${editControls("polls",p,{compact:true})}`).join("")}
function setupNotice(){return `<header class="page-head"><h1>Almost there</h1></header><div class="card note"><h3 class="card-heading">Connect Supabase</h3><div class="card-body">Open <strong>js/config.js</strong> and paste in your Supabase project URL and anon key, then run <strong>schema.sql</strong> in the Supabase SQL editor.\n\nThe README walks through both steps.</div></div>`}
