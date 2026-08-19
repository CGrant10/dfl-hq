/* DFL Golf - personal club distances with opt-in league sharing. */
import { db, isAdmin } from "./supabase.js";
import { currentMember } from "./members.js";
import { esc, toast } from "./ui.js";

const STARTER=["Driver","3 wood","5 wood","4 hybrid","5 iron","6 iron","7 iron","8 iron","9 iron","Pitching wedge","Gap wedge","Sand wedge","Lob wedge"];
const SAVE_DELAY=600;
const timers=new Map();
let host=null;

async function loadMine(memberId){
  const {data,error}=await db().from("golf_bag").select("*").eq("member_id",memberId).order("sort_order").order("id");
  if(error)throw error;return data||[];
}
async function loadVisibility(memberId){
  const {data,error}=await db().from("golf_bag_visibility").select("is_public").eq("member_id",memberId).maybeSingle();
  if(error)throw error;return !!data?.is_public;
}
async function loadPublic(memberId){
  const [{data:bags,error:bagError},{data:members,error:memberError}]=await Promise.all([
    db().from("golf_bag").select("member_id,club,yards,sort_order,id").neq("member_id",memberId).order("member_id").order("sort_order"),
    db().from("members").select("id,display_name,team_name").eq("active",true)
  ]);
  if(bagError)throw bagError;if(memberError)throw memberError;
  const names=new Map((members||[]).map(m=>[String(m.id),m.display_name||m.team_name||`Member ${m.id}`]));
  const groups=new Map();
  for(const row of bags||[]){const k=String(row.member_id);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(row);}
  return [...groups].map(([id,rows])=>({id,name:names.get(id)||"DFL member",rows}));
}

function ownView(rows,me,isPublic){
  const sorted=[...rows].sort((a,b)=>(b.yards??-1)-(a.yards??-1));
  return `<section class="card bag-card">
    <div class="card-title-row"><div><div class="card-title">My Golf Bag</div><p class="muted tiny">${esc(me.display_name)} · ${isPublic?"visible to the league":"only you can see this"}</p></div><span class="bag-count">${rows.length}</span></div>
    <label class="checkrow"><input type="checkbox" id="bag-public" ${isPublic?"checked":""}> <span><strong>Share my bag</strong><br><small class="muted">Let other DFL members view your club distances. Only you can edit them.</small></span></label>
    ${rows.length?`<div class="bag-list">${sorted.map(r=>`<div class="bag-row" data-row="${r.id}"><input class="bag-club" type="text" value="${esc(r.club)}" maxlength="40" data-field="club" aria-label="Club name"><span class="bag-yards"><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" value="${r.yards??""}" placeholder="—" data-field="yards" aria-label="Yards for ${esc(r.club)}"><small>yds</small></span><button class="btn ghost small bag-del" data-del="${r.id}" aria-label="Remove ${esc(r.club)}">&times;</button></div>`).join("")}</div><div class="arena-admin"><button class="btn ghost small" id="bag-add">Add a club</button></div>`:`<p class="muted tiny">How far you hit each club.</p><div class="arena-admin"><button class="btn small" id="bag-starter">Start with a full bag</button><button class="btn ghost small" id="bag-add">Add one club</button></div>`}
  </section>`;
}
function publicView(groups){
  if(!groups.length)return "";
  return `<section class="block"><h2 class="section-title">DFL Bags</h2><p class="muted tiny">Shared by their owners.</p>${groups.map(g=>`<details class="card bag-card"><summary class="card-title">${esc(g.name)}'s bag <span class="bag-count">${g.rows.length}</span></summary><div class="bag-list">${[...g.rows].sort((a,b)=>(b.yards??-1)-(a.yards??-1)).map(r=>`<div class="bag-row"><strong class="bag-club">${esc(r.club)}</strong><span class="bag-yards"><b>${r.yards??"—"}</b><small>yds</small></span></div>`).join("")}</div></details>`).join("")}</section>`;
}

async function draw(){
  const me=currentMember();if(!host)return;if(!me){host.innerHTML="";return;}
  try{
    const [rows,isPublic,publicBags]=await Promise.all([loadMine(me.id),loadVisibility(me.id),loadPublic(me.id)]);
    if(!host)return;host.innerHTML=ownView(rows,me,isPublic)+publicView(publicBags);
  }catch(err){
    host.innerHTML=isAdmin()?`<section class="card"><div class="card-body muted tiny">Golf Bag sharing needs one migration: run <strong>golf_bag_public_schema.sql</strong> in Supabase.<br>${esc(err.message||String(err))}</div></section>`:"";
  }
}
function queue(id,field,getValue){const key=`${id}:${field}`;clearTimeout(timers.get(key));timers.set(key,setTimeout(async()=>{timers.delete(key);const raw=getValue();const patch=field==="yards"?{yards:raw===""?null:Math.max(1,Math.min(999,Number(raw)))}:{club:raw.trim()||"Club"};try{const{error}=await db().from("golf_bag").update({...patch,updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error}catch(err){toast(err.message||"Could not save that",true);draw()}},SAVE_DELAY));}
function wire(){
  host.addEventListener("input",e=>{const input=e.target.closest("[data-field]");if(!input)return;if(input.dataset.field==="yards"){const clean=input.value.replace(/\D/g,"").slice(0,3);if(clean!==input.value)input.value=clean}const id=input.closest("[data-row]")?.dataset.row;if(id)queue(id,input.dataset.field,()=>input.value)});
  host.addEventListener("change",async e=>{const toggle=e.target.closest("#bag-public");if(!toggle)return;const me=currentMember();if(!me)return;toggle.disabled=true;try{const{error}=await db().from("golf_bag_visibility").upsert({member_id:me.id,is_public:toggle.checked,updated_at:new Date().toISOString()},{onConflict:"member_id"});if(error)throw error;toast(toggle.checked?"Your bag is now public":"Your bag is private again");draw()}catch(err){toast(err.message||"Could not change bag visibility",true);toggle.disabled=false}});
  host.addEventListener("click",async e=>{const del=e.target.closest("[data-del]"),add=e.target.closest("#bag-add"),starter=e.target.closest("#bag-starter"),me=currentMember();if(!me)return;if(del){const row=del.closest("[data-row]"),name=row?.querySelector(".bag-club")?.value||"that club";if(!confirm(`Remove ${name} from your bag?`))return;try{const{error}=await db().from("golf_bag").delete().eq("id",del.dataset.del);if(error)throw error;draw()}catch(err){toast(err.message||"Could not remove that club",true)}return}if(add||starter){const clubs=starter?STARTER:["New club"];e.target.disabled=true;try{const rows=clubs.map((club,i)=>({member_id:me.id,club,sort_order:i}));const{error}=await db().from("golf_bag").insert(rows);if(error)throw error;draw()}catch(err){toast(err.message||"Could not add that",true);e.target.disabled=false}}});
}
function boot(){const find=()=>{const el=document.querySelector("#golf-wrap .golf-bag-page");if(!el||el===host)return;host=el;const header=el.closest("#golf-wrap")?.querySelector(".page-head");if(header&&header.nextElementSibling!==el)header.insertAdjacentElement("afterend",el);wire();draw()};new MutationObserver(find).observe(document.body,{childList:true,subtree:true});find()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
