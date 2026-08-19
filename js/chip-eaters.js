/*
  DFL Chip Eaters - last place, permanently remembered.

  TWO RULES THE COMMISSIONER SET, both of which the first cut got wrong:

  1. LAST IN THE PLAYOFFS, NOT WORST RECORD. This read
     sleeper_standings.rank, which the sync computes as record then points for -
     the table going INTO the playoffs. Last place is decided in the losers
     bracket, so it comes from sleeper_leagues.last_place_user_id, filled by the
     sync from that bracket. A season the bracket cannot answer shows NO chip
     eater rather than falling back to the record, because falling back to the
     record is the thing that was wrong.

  2. THE PUNISHMENT HISTORY STARTS AFTER 2021. Earlier seasons are not part of
     it. FIRST_SEASON is the only place that is written down.
*/
import { db } from "./supabase.js";
import { currentMember, loadMembers } from "./members.js";
import { esc, toast } from "./ui.js";
import { canEdit } from "./inline.js";
import { editableName, wireNamePick } from "./name-pick.js";
import { setSeasonResult } from "./season-result.js";

async function data(){
  const [leagues,standings,history,members]=await Promise.all([
    db().from("sleeper_leagues").select("season,status,last_place_user_id,last_place_locked").eq("status","complete")
      .then(r=>r,()=>({data:[],error:null}))
      /* last_place_user_id arrives with chip_eater_schema.sql. Before that the
         column does not exist and the select 42703s, so fall back to the shape
         without it - the board then reports no automatic chip eaters, which is
         correct rather than wrong. */
      .then(async r=>r.error?await db().from("sleeper_leagues").select("season,status").eq("status","complete"):r),
    db().from("sleeper_standings").select("season,sleeper_user_id,team_name,rank,wins,losses,points_for"),
    db().from("history").select("id,year,category,winner,notes").eq("category","Chip Eater"),
    loadMembers({force:false}).then(data=>({data,error:null})).catch(error=>({data:[],error})),
  ]);
  const error=leagues.error||standings.error||history.error||members.error;if(error)throw error;
  return {leagues:leagues.data||[],standings:standings.data||[],manual:history.data||[],members:members.data||[]};
}
/** The punishment history starts after 2021. Written down once. */
export const FIRST_SEASON=2022;

function automatic(d){
  const bySleeper=new Map(d.members.filter(m=>m.sleeper_user_id).map(m=>[String(m.sleeper_user_id),m]));
  const teamNameOf=new Map(d.standings.map(s=>[`${s.season}:${s.sleeper_user_id}`,s.team_name||""]));
  return d.leagues
    .filter(l=>Number(l.season)>=FIRST_SEASON&&l.last_place_user_id)
    .map(l=>{
      const season=Number(l.season),uid=String(l.last_place_user_id),m=bySleeper.get(uid);
      return {season,memberId:m?.id||null,
        name:m?.display_name||teamNameOf.get(`${season}:${uid}`)||"Unknown",
        team:teamNameOf.get(`${season}:${uid}`)||m?.team_name||"",
        manual:false,locked:l.last_place_locked===true,done:false};
    });
}
function chipEaters(d){
  const auto=new Map(automatic(d).map(r=>[Number(r.season),r]));
  for(const h of d.manual){const y=Number(h.year);if(y<FIRST_SEASON)continue;const m=d.members.find(x=>String(x.display_name).toLowerCase()===String(h.winner||"").toLowerCase()||String(x.team_name||"").toLowerCase()===String(h.winner||"").toLowerCase());auto.set(y,{season:y,memberId:m?.id||null,name:h.winner||m?.display_name||"Unknown",team:m?.team_name||"",manual:true,done:/complete|completed|ate|done/i.test(h.notes||""),historyId:h.id,notes:h.notes||""})}
  return [...auto.values()].sort((a,b)=>b.season-a.season);
}

/*
  ONE ROW MEANS ONE ROW.

  Commissioner controls used to make the punishment board wrap into a second
  line on phones while members saw a shorter row. That made the same history
  look like two different components depending on permissions and screen size.
  Every piece is now non-shrinking and non-wrapping; if a very narrow device
  cannot fit it, the row scrolls horizontally instead of becoming two lines.
*/
function card(rows){return `<section class="card" data-chip-eaters><div class="card-title-row"><div class="card-title">🌶️ Chip Eaters</div></div><div class="card-body" style="padding-top:4px">${rows.length?rows.map(r=>`<div class="chip-eater-row" style="display:flex;align-items:center;gap:8px;flex-wrap:nowrap;white-space:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:7px 0;border-bottom:1px solid var(--line,rgba(255,255,255,.08))"><strong style="flex:0 0 auto">${esc(r.season)}</strong><span aria-hidden="true" style="flex:0 0 auto">🌶️</span><span style="flex:0 0 auto">${canEdit()?editableName({text:r.name,field:"lastPlace",key:r.season,canEdit:true}):r.memberId?`<a class="plainlink" href="#/profile?id=${r.memberId}">${esc(r.name)}</a>`:esc(r.name)}</span>${r.team&&r.team!==r.name?`<span class="muted tiny" style="flex:0 0 auto">${esc(r.team)}</span>`:""}<span class="pill ${r.done?"green":"warn"}" style="flex:0 0 auto">${r.done?"Chip eaten":"Punishment due"}</span>${r.locked?`<span class="muted tiny" style="flex:0 0 auto">set by hand</span>`:""}${canEdit()?`<button class="linkbtn" style="flex:0 0 auto" type="button" data-chip-done="${r.season}" data-chip-name="${esc(r.name)}">${r.done?"Undo":"Mark eaten"}</button>`:""}</div>`).join(""):`<span class="muted">No completed seasons yet.</span>`}</div></section>`}

export async function decorateChipEaters(view){
  if(!view||view.querySelector("[data-chip-eaters]"))return;let d;try{d=await data()}catch{return}const rows=chipEaters(d),hash=location.hash;
  if(hash.startsWith("#/history")){
    const tabs=view.querySelector("#hist-tabs"),body=view.querySelector("#hist-body");if(!tabs||!body)return;
    const wrap=document.createElement("div");wrap.innerHTML=card(rows);
    /* History leads with what went RIGHT. Hall of Fame / the selected history
       tab gets the page first; last place lives below that content. */
    body.insertAdjacentElement("afterend",wrap.firstElementChild);wire(view,d);return;
  }
  if(hash.startsWith("#/profile")){
    const wanted=new URLSearchParams(hash.split("?")[1]||"").get("id"),memberId=wanted||currentMember()?.id;if(!memberId)return;
    const mine=rows.filter(r=>String(r.memberId)===String(memberId));if(!mine.length)return;
    const head=view.querySelector(".profile-head .row");if(!head)return;const badge=document.createElement("span");badge.className="pill warn";badge.dataset.chipEaters="badge";badge.textContent=`🌶️ Chip Eater${mine.length>1?` ×${mine.length}`:""}`;badge.title=mine.map(r=>r.season).join(", ");head.appendChild(badge);
  }
}
function wire(view,d){
  /*
    THE prompt() FLOW IS GONE.

    It asked for the season as free text, then the winner's display name as free
    text, and matched that case-insensitively against the member list - so a
    typo, a nickname or a renamed member silently did nothing, and it could not
    show the list it was about to match against. Clicking the name gives the
    actual list, which cannot be spelled wrong.

    It also wrote a `history` row, which meant the Chip Eater lived in two places
    at once. The override now writes sleeper_leagues.last_place_user_id - the
    same column the automatic answer uses - and locks it so the next Sync Sleeper
    leaves it alone.
  */
  wireNamePick(view,d.members||[],async({field,key,memberId})=>{
    await setSeasonResult({season:Number(key),field,memberId});
    location.reload();
  });
  view.querySelectorAll("[data-chip-done]").forEach(btn=>btn.addEventListener("click",async()=>{const y=Number(btn.dataset.chipDone),name=btn.dataset.chipName,row=chipEaters(d).find(r=>r.season===y),done=!row?.done,payload={year:y,category:"Chip Eater",winner:name,notes:done?"Hot chip punishment completed":""};const old=d.manual.find(h=>Number(h.year)===y);const q=old?db().from("history").update(payload).eq("id",old.id):db().from("history").insert(payload);const{error}=await q;if(error){toast(error.message||"Could not update punishment",true);return}toast(done?"The chip has been eaten 🌶️":"Punishment reopened");location.reload()}));
}
