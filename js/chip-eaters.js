// DFL Chip Eaters — last place, permanently remembered.
import { db } from "./supabase.js";
import { currentMember, loadMembers } from "./members.js";
import { esc, toast } from "./ui.js";
import { canEdit } from "./inline.js";

async function data(){
  const [leagues,standings,history,members]=await Promise.all([
    db().from("sleeper_leagues").select("season,status").eq("status","complete"),
    db().from("sleeper_standings").select("season,sleeper_user_id,team_name,rank,wins,losses,points_for"),
    db().from("history").select("id,year,category,winner,notes").eq("category","Chip Eater"),
    loadMembers({force:false}).then(data=>({data,error:null})).catch(error=>({data:[],error})),
  ]);
  const error=leagues.error||standings.error||history.error||members.error;if(error)throw error;
  return {leagues:leagues.data||[],standings:standings.data||[],manual:history.data||[],members:members.data||[]};
}
function automatic(d){
  const complete=new Set(d.leagues.map(l=>Number(l.season))),bySeason=new Map();
  for(const s of d.standings){const y=Number(s.season);if(!complete.has(y))continue;if(!bySeason.has(y))bySeason.set(y,[]);bySeason.get(y).push(s)}
  const bySleeper=new Map(d.members.filter(m=>m.sleeper_user_id).map(m=>[String(m.sleeper_user_id),m]));
  return [...bySeason.entries()].map(([season,rows])=>{
    const ranked=rows.filter(r=>Number.isFinite(Number(r.rank))&&Number(r.rank)>0).sort((a,b)=>Number(b.rank)-Number(a.rank));
    if(!ranked.length)return null;const r=ranked[0],m=bySleeper.get(String(r.sleeper_user_id));
    return {season,memberId:m?.id||null,name:m?.display_name||r.team_name||"Unknown",team:r.team_name||m?.team_name||"",rank:Number(r.rank),manual:false,done:false};
  }).filter(Boolean);
}
function chipEaters(d){
  const auto=new Map(automatic(d).map(r=>[Number(r.season),r]));
  for(const h of d.manual){const y=Number(h.year);const m=d.members.find(x=>String(x.display_name).toLowerCase()===String(h.winner||"").toLowerCase()||String(x.team_name||"").toLowerCase()===String(h.winner||"").toLowerCase());auto.set(y,{season:y,memberId:m?.id||null,name:h.winner||m?.display_name||"Unknown",team:m?.team_name||"",manual:true,done:/complete|completed|ate|done/i.test(h.notes||""),historyId:h.id,notes:h.notes||""})}
  return [...auto.values()].sort((a,b)=>b.season-a.season);
}
function card(rows){return `<section class="card" data-chip-eaters><div class="card-title-row"><div class="card-title">🌶️ Chip Eaters</div>${canEdit()?`<button class="btn ghost small" type="button" data-chip-correct>Correct season</button>`:""}</div><div class="card-body">${rows.length?rows.map(r=>`<div class="row" style="justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line,rgba(255,255,255,.08))"><span><strong>${esc(r.season)}</strong> · ${r.memberId?`<a class="plainlink" href="#/profile?id=${r.memberId}">${esc(r.name)}</a>`:esc(r.name)}${r.team&&r.team!==r.name?` <span class="muted tiny">· ${esc(r.team)}</span>`:""}</span><span class="row" style="gap:6px"><span class="pill ${r.done?"green":"warn"}">${r.done?"Chip eaten":"Punishment due"}</span>${canEdit()?`<button class="linkbtn" type="button" data-chip-done="${r.season}" data-chip-name="${esc(r.name)}">${r.done?"Undo":"Mark eaten"}</button>`:""}</span></div>`).join(""):`<span class="muted">No completed seasons yet.</span>`}</div></section>`}
export async function decorateChipEaters(view){
  if(!view||view.querySelector("[data-chip-eaters]"))return;let d;try{d=await data()}catch{return}const rows=chipEaters(d),hash=location.hash;
  if(hash.startsWith("#/history")){
    const tabs=view.querySelector("#hist-tabs"),body=view.querySelector("#hist-body");if(!tabs||!body)return;
    const wrap=document.createElement("div");wrap.innerHTML=card(rows);tabs.insertAdjacentElement("beforebegin",wrap.firstElementChild);wire(view,d);return;
  }
  if(hash.startsWith("#/profile")){
    const wanted=new URLSearchParams(hash.split("?")[1]||"").get("id"),memberId=wanted||currentMember()?.id;if(!memberId)return;
    const mine=rows.filter(r=>String(r.memberId)===String(memberId));if(!mine.length)return;
    const head=view.querySelector(".profile-head .row");if(!head)return;const badge=document.createElement("span");badge.className="pill warn";badge.dataset.chipEaters="badge";badge.textContent=`🌶️ Chip Eater${mine.length>1?` ×${mine.length}`:""}`;badge.title=mine.map(r=>r.season).join(", ");head.appendChild(badge);
  }
}
function wire(view,d){
  view.querySelector("[data-chip-correct]")?.addEventListener("click",async()=>{const y=Number(prompt("Season to correct?",new Date().getFullYear()-1));if(!y)return;const names=d.members.map(m=>m.display_name).join("\n"),winner=prompt(`Who was the ${y} Chip Eater?\n\n${names}`,"");if(!winner)return;const member=d.members.find(m=>m.display_name.toLowerCase()===winner.trim().toLowerCase());if(!member){toast("Use the member's exact display name",true);return}const old=d.manual.find(h=>Number(h.year)===y);const payload={year:y,category:"Chip Eater",winner:member.display_name,notes:old?.notes||"Punishment due"};const q=old?db().from("history").update(payload).eq("id",old.id):db().from("history").insert(payload);const{error}=await q;if(error){toast(error.message||"Could not save Chip Eater",true);return}toast("Chip Eater corrected");location.reload()});
  view.querySelectorAll("[data-chip-done]").forEach(btn=>btn.addEventListener("click",async()=>{const y=Number(btn.dataset.chipDone),name=btn.dataset.chipName,row=chipEaters(d).find(r=>r.season===y),done=!row?.done,payload={year:y,category:"Chip Eater",winner:name,notes:done?"Hot chip punishment completed":"Punishment due"};const old=d.manual.find(h=>Number(h.year)===y);const q=old?db().from("history").update(payload).eq("id",old.id):db().from("history").insert(payload);const{error}=await q;if(error){toast(error.message||"Could not update punishment",true);return}toast(done?"The chip has been eaten 🌶️":"Punishment reopened");location.reload()}));
}
