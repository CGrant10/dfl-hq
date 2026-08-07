/* =====================================================================
   DFL Golf - ONE scorecard per team
   ---------------------------------------------------------------------
   golf.js still owns the event/team routing and admin/team generation.
   This module replaces the old player-by-player score UI with exactly one
   score entry per team per hole.
   ===================================================================== */

import { db, isAdmin } from "./supabase.js";
import { currentMember, loadMembers } from "./members.js";

const STYLE = `
.single-team-scorecard{overflow:hidden}
.single-team-scorecard .scorecard-title{display:flex;align-items:center;gap:14px;padding:16px;background:var(--bg-3);border-bottom:1px solid var(--line)}
.single-team-scorecard .scorecard-team-heading{min-width:0;flex:1}
.single-team-scorecard .scorecard-team-heading h2{margin:2px 0 3px;font-size:20px}
.single-team-scorecard .scorecard-kicker{display:block;font-size:10px;letter-spacing:.13em;font-weight:800;color:var(--accent)}
.single-team-scorecard .scorecard-roster{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.single-team-scorecard .scorecard-roster span{padding:4px 8px;border:1px solid var(--line);border-radius:999px;background:var(--bg-2);font-size:11px}
.single-team-scorecard .scorecard-table-wrap{padding:12px 14px 0;overflow-x:auto;-webkit-overflow-scrolling:touch}
.single-team-scorecard .scorecard-nine{margin:0 0 14px;border:1px solid var(--line);border-radius:11px;overflow:hidden;background:var(--bg-2)}
.single-team-scorecard .scorecard-nine-title{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;background:var(--bg-3);border-bottom:1px solid var(--line)}
.single-team-scorecard .scorecard-nine-title strong{font-size:14px}
.single-team-scorecard .scorecard-nine-title span{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.single-team-scorecard .score-grid{display:grid;min-width:690px}
.single-team-scorecard .score-cell{min-height:43px;padding:6px 4px;display:grid;place-items:center;border-right:1px solid var(--line-soft);border-bottom:1px solid var(--line-soft);font-size:12px;font-variant-numeric:tabular-nums}
.single-team-scorecard .score-cell:last-child{border-right:0}
.single-team-scorecard .head{background:var(--bg-3);font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.single-team-scorecard .score-label{justify-items:start;padding-left:10px;font-weight:800}
.single-team-scorecard .par{font-weight:800;color:var(--muted)}
.single-team-scorecard .score-cell input{width:36px;height:33px;padding:0;border:1px solid var(--line);border-radius:6px;background:var(--bg-2);color:var(--text);text-align:center;font:inherit;font-weight:800;touch-action:manipulation}
.single-team-scorecard .score-cell input:focus{outline:2px solid var(--accent);outline-offset:-1px}
.single-team-scorecard .score-cell input[disabled]{opacity:.8;background:var(--bg-3)}
.single-team-scorecard .tally{font-weight:900;background:rgba(127,127,127,.035)}
.single-team-scorecard .to-par{font-weight:900}
.single-team-scorecard .dash{color:var(--muted)}
.single-team-scorecard .score-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:0 14px 14px;padding:12px;border:2px solid var(--line);border-radius:11px;background:var(--bg-3);font-variant-numeric:tabular-nums}
.single-team-scorecard .score-summary span{display:block;text-align:center}
.single-team-scorecard .score-summary small{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.04em}
.single-team-scorecard .score-summary b{display:block;margin-top:2px;font-size:17px}
.single-team-scorecard .score-note{padding:0 14px 14px;color:var(--muted);font-size:11px}
.single-team-scorecard .score-status{padding:10px 14px;color:var(--muted);font-size:11px}
@media(max-width:600px){.single-team-scorecard .score-summary{grid-template-columns:1fr 1fr}.single-team-scorecard .score-summary span:last-child{grid-column:1/-1}}
`;

function esc(value){
  return String(value ?? "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
}
function n(value){ const x=Number(value); return Number.isFinite(x) ? x : 0; }
function signed(score, par){ if(!score) return "—"; const d=score-par; return d===0 ? "E" : d>0 ? `+${d}` : `${d}`; }
function parsFor(outing, rows){
  const count=Math.max(1,Math.min(Number(outing.holes||18),18));
  const map=new Map((rows||[]).map(r=>[Number(r.hole),Number(r.par)||4]));
  return Array.from({length:count},(_,i)=>map.get(i+1)||4);
}

async function loadCard(outingId, teamId){
  const [teamRes, partRes, holeRes, scoreRes, memberList] = await Promise.all([
    db().from("golf_teams").select("*").eq("id",teamId).eq("outing_id",outingId).maybeSingle(),
    db().from("golf_participants").select("id,member_id,team_id").eq("outing_id",outingId).eq("team_id",teamId).order("sort_order"),
    db().from("golf_holes").select("hole,par").eq("outing_id",outingId).order("hole"),
    db().from("golf_scores").select("id,outing_id,team_id,hole,strokes").eq("outing_id",outingId).eq("team_id",teamId),
    loadMembers().catch(()=>[])
  ]);
  const error=teamRes.error||partRes.error||holeRes.error||scoreRes.error;
  if(error) throw error;
  return {team:teamRes.data,parts:partRes.data||[],pars:parsFor({holes:18},holeRes.data||[]),scores:scoreRes.data||[],members:memberList||[]};
}

function scoreMap(scores){ return new Map((scores||[]).map(s=>[Number(s.hole),s])); }
function total(map,start,end){ let sum=0; for(let h=start;h<=end;h++) sum+=n(map.get(h)?.strokes); return sum; }
function count(map,start,end){ let c=0; for(let h=start;h<=end;h++) if(n(map.get(h)?.strokes)>0)c++; return c; }

function nine(label,start,pars,map,editable){
  const holes=Array.from({length:9},(_,i)=>start+i).filter(h=>h<=18 && h<=pars.length);
  const par=holes.reduce((x,h)=>x+n(pars[h-1]),0);
  const score=total(map,start,start+8);
  const entered=count(map,start,start+8);
  const cols=`grid-template-columns:minmax(105px,1.6fr) repeat(${holes.length},minmax(42px,1fr)) minmax(58px,.8fr) minmax(52px,.75fr)`;
  const headers=holes.map(h=>`<div class="score-cell head">${h}</div>`).join("");
  const parRow=`<div class="score-cell score-label head">Par</div>${holes.map(h=>`<div class="score-cell par head">${n(pars[h-1])}</div>`).join("")}<div class="score-cell tally head">${par}</div><div class="score-cell to-par head">E</div>`;
  const scoreRow=`<div class="score-cell score-label">Team strokes</div>${holes.map(h=>{
    const value=map.get(h)?.strokes ?? "";
    return `<div class="score-cell"><input data-team-score data-hole="${h}" type="number" min="1" max="15" inputmode="numeric" value="${esc(value)}" ${editable?"":"disabled"} aria-label="Team score, hole ${h}"></div>`;
  }).join("")}<div class="score-cell tally">${score||"—"}</div><div class="score-cell to-par">${signed(score,par)}</div>`;
  return `<section class="scorecard-nine"><header class="scorecard-nine-title"><strong>${label}</strong><span>${entered}/${holes.length} entered · Par ${par}</span></header><div class="score-grid" style="${cols}"><div class="score-cell head">Team</div>${headers}<div class="score-cell head">Score</div><div class="score-cell head">To Par</div>${parRow}${scoreRow}</div></section>`;
}

async function renderTeamCard(root, outingId, teamId){
  const card=await loadCard(outingId,teamId);
  if(!card.team) throw new Error("Team not found");
  const current=String(currentMember()?.id||"");
  const memberOfTeam=card.parts.some(p=>String(p.member_id)===current);
  const editable=isAdmin()||memberOfTeam;
  const pars=card.pars;
  const map=scoreMap(card.scores);
  const frontPar=pars.slice(0,9).reduce((a,b)=>a+n(b),0);
  const backPar=pars.slice(9,18).reduce((a,b)=>a+n(b),0);
  const totalPar=frontPar+backPar;
  const front=total(map,1,9);
  const back=total(map,10,18);
  const complete=front+back;
  const names=card.parts.map(p=>card.members.find(m=>String(m.id)===String(p.member_id))?.display_name||"Unknown");
  root.innerHTML=`<section class="card single-team-scorecard">
    <div class="scorecard-title">
      <a class="backlink" href="#/golf?id=${outingId}">← Teams</a>
      <div class="scorecard-team-heading">
        <span class="scorecard-kicker">TEAM SCORECARD</span>
        <h2>${esc(card.team.name||"Team")}</h2>
        <div class="scorecard-roster">${names.map(name=>`<span>${esc(name)}</span>`).join("")}</div>
      </div>
    </div>
    <div class="score-status">${editable?"You can edit this team's single scorecard.":"Read-only — you are not on this team."} · ${card.scores.length} hole${card.scores.length===1?"":"s"} entered</div>
    <div class="scorecard-table-wrap">${nine("Front 9",1,pars,map,editable)}${pars.length>9?nine("Back 9",10,pars,map,editable):""}</div>
    <div class="score-summary">
      <span><small>Complete score</small><b>${complete||"—"}</b></span>
      <span><small>Par</small><b>${totalPar}</b></span>
      <span><small>Complete to par</small><b>${signed(complete,totalPar)}</b></span>
    </div>
  </section>`;
  wireScores(root,outingId,teamId,editable);
}

function wireScores(root,outingId,teamId,editable){
  if(!editable) return;
  root.addEventListener("change",async e=>{
    const input=e.target.closest("input[data-team-score]");
    if(!input) return;
    const hole=Number(input.dataset.hole);
    if(!hole) return;
    try{
      if(!input.value.trim()){
        const {error}=await db().from("golf_scores").delete().eq("outing_id",outingId).eq("team_id",teamId).eq("hole",hole);
        if(error) throw error;
      }else{
        const strokes=Number(input.value);
        if(!Number.isInteger(strokes)||strokes<1||strokes>15) throw new Error("Enter strokes from 1 to 15");
        const {error}=await db().from("golf_scores").upsert({outing_id:outingId,team_id:teamId,member_id:null,hole,strokes},{onConflict:"outing_id,team_id,hole"});
        if(error) throw error;
      }
      await renderTeamCard(root,outingId,teamId);
    }catch(err){ input.focus(); alert(err.message||"Could not save team score"); }
  });
}

function boot(){
  if(document.getElementById("dfl-golf-scorecard-style")) return;
  const style=document.createElement("style"); style.id="dfl-golf-scorecard-style"; style.textContent=STYLE; document.head.appendChild(style);
  const refresh=()=>{
    const root=document.querySelector("#golf-outing");
    const params=new URLSearchParams(location.hash.split("?")[1]||"");
    const outingId=params.get("id"),teamId=params.get("team");
    if(!root||!outingId||!teamId||root.dataset.teamCardLoaded===`${outingId}:${teamId}`) return;
    if(!root.querySelector(".golf-scorecard-page")) return;
    root.dataset.teamCardLoaded=`${outingId}:${teamId}`;
    renderTeamCard(root,outingId,teamId).catch(err=>{root.innerHTML=`<div class="card"><div class="card-body"><strong>Could not load team scorecard.</strong><p class="muted">${esc(err.message||"Database error")}</p></div></div>`;});
  };
  new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true});
  refresh();
}

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
