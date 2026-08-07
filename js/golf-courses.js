/* DFL Golf course library - mobile-first admin course picker */
import { db, isAdmin } from "./supabase.js";
import { toast } from "./ui.js";

const esc=v=>String(v??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let lastKey="";

async function enhance(){
  if(!isAdmin()) return;
  const root=document.querySelector("#golf-outing");
  if(!root) return;
  const q=new URLSearchParams(location.hash.split("?")[1]||"");
  const outingId=q.get("id");
  if(!outingId||q.get("team")) return;
  const adminCard=root.querySelector(".golf-admin-card");
  if(!adminCard) return;
  const key=`${outingId}:${adminCard}`;
  if(lastKey===key&&adminCard.querySelector("#golf-course-picker")) return;
  lastKey=key;
  const courses=await db().from("golf_courses").select("id,name,city,state,holes,par,yardage,course_rating,slope").order("name");
  if(courses.error) return;
  const outings=await db().from("golf_outings").select("course_id,course,holes").eq("id",outingId).maybeSingle();
  if(outings.error||!outings.data) return;
  const current=outings.data;
  const wrap=document.createElement("div");
  wrap.className="golf-course-library";
  wrap.id="golf-course-picker";
  wrap.innerHTML=`<div class="course-picker-head"><div><div class="card-title">Course library</div><p class="muted tiny">Pick a saved course to populate the event scorecard.</p></div></div><div class="course-picker-row"><select id="golf-course-select"><option value="">— Select course —</option>${(courses.data||[]).map(c=>`<option value="${c.id}" ${String(c.id)===String(current.course_id)?"selected":""}>${esc(c.name)}${c.city?` · ${esc(c.city)}, ${esc(c.state||"")}`:""}</option>`).join("")}</select><button class="btn small" id="golf-course-apply" ${current.course_id?"":"disabled"}>Apply</button></div><div id="golf-course-meta" class="muted tiny"></div>`;
  adminCard.querySelector(".golf-generator")?.insertAdjacentElement("beforebegin",wrap);
  const select=wrap.querySelector("#golf-course-select"),apply=wrap.querySelector("#golf-course-apply"),meta=wrap.querySelector("#golf-course-meta");
  const showMeta=()=>{const c=(courses.data||[]).find(x=>String(x.id)===String(select.value));apply.disabled=!c;if(c)meta.textContent=`${c.holes} holes · Par ${c.par??"—"} · ${c.yardage?`${c.yardage} yds`:"yardage not listed"}`;else meta.textContent="";};
  select.addEventListener("change",showMeta);showMeta();
  apply.addEventListener("click",async()=>{if(!select.value)return;apply.disabled=true;try{const{error}=await db().rpc("golf_apply_course_to_outing",{p_outing_id:Number(outingId),p_course_id:Number(select.value)});if(error)throw error;toast("Course applied — scorecard updated");location.reload();}catch(err){toast(err.message||"Could not apply course",true);showMeta();}});
}

const observer=new MutationObserver(()=>enhance());
function boot(){observer.observe(document.body,{childList:true,subtree:true});enhance();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
