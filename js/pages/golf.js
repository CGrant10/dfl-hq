// =====================================================================
// DFL Golf
// =====================================================================

import { db, insertRow, updateRow, isAdmin } from "../supabase.js";
import { esc, empty, errorBox, toast, fmtDate, loading } from "../ui.js";
import { loadMembers, currentMember } from "../members.js";
import { addControl, editControls, wireInline, canEdit, visible, hiddenClass } from "../inline.js";

const DEFAULT_RATING = 75;
const TEAM_NAMES = ["Team Chaos", "Team Bogey", "Team Shank", "Team Mulligan", "Team Sandbagger", "Team Whiff", "Team Duff", "Team Yips"];
const TEAM_COLORS = ["#2fbf5f", "#4aa3ff", "#f0a742", "#e0574a", "#b07cf0", "#3ecfcf"];

export async function render(view) {
  const qs = new URLSearchParams(location.hash.split("?")[1] || "");
  const id = qs.get("id");
  if (id) return renderOuting(view, id, qs.get("team"));
  return renderList(view);
}

async function renderList(view) {
  view.innerHTML = loading();
  const res = await db().from("golf_outings").select("*").order("event_date", { ascending: false });
  if (res.error) {
    view.innerHTML = `<h1>DFL Golf</h1>${errorBox(res.error)}<div class="card"><div class="card-body muted">If the golf tables are missing, run <strong>golf_schema.sql</strong> in Supabase.</div></div>`;
    return;
  }
  const outings = visible("golf_outings", res.data || []);
  const live = outings.filter(o => o.status !== "final");
  const past = outings.filter(o => o.status === "final");
  view.innerHTML = `<div id="golf-wrap"><header class="page-head"><h1>DFL Golf</h1>${addControl("golf_outings", "New outing")}</header>${outings.length ? "" : empty(canEdit() ? "No outings yet. Create one above." : "No golf outings yet.")}${live.length ? `<h2 class="section-title">Upcoming<span class="count">${live.length}</span></h2>${live.map(outingCard).join("")}` : ""}${past.length ? `<h2 class="section-title">Golf history<span class="count">${past.length}</span></h2>${past.map(outingCard).join("")}` : ""}</div>`;
  wireInline(view.querySelector("#golf-wrap"), () => render(view));
}

function outingCard(o) {
  const state = o.status === "final" ? ["Final", "grey"] : o.status === "active" ? ["Live", "green"] : ["Setup", "warn"];
  return `<article class="card golf-card ${hiddenClass("golf_outings", o)}"><a class="golf-link" href="#/golf?id=${o.id}"><div class="golf-top"><h3 class="card-heading">${esc(o.name)}</h3><span class="pill ${state[1]}">${state[0]}</span></div><div class="golf-meta">${o.course ? `<span>${esc(o.course)}</span>` : ""}${o.event_date ? `<span>· ${esc(fmtDate(o.event_date))}</span>` : ""}<span>· ${o.holes} holes</span></div></a>${editControls("golf_outings", o, { compact: true })}</article>`;
}

async function renderOuting(view, id, teamId) {
  view.innerHTML = loading();
  const [outRes, partsRes, teamsRes, ranksRes, scoresRes, holesRes, members] = await Promise.all([
    db().from("golf_outings").select("*").eq("id", id).maybeSingle(),
    db().from("golf_participants").select("*").eq("outing_id", id).order("sort_order"),
    db().from("golf_teams").select("*").eq("outing_id", id).order("sort_order"),
    db().from("golf_rankings").select("member_id, rating"),
    db().from("golf_scores").select("*").eq("outing_id", id),
    db().from("golf_holes").select("hole, par").eq("outing_id", id).order("hole"),
    loadMembers().catch(() => []),
  ]);
  if (outRes.error || !outRes.data) { view.innerHTML = `<h1>DFL Golf</h1>${errorBox(outRes.error || new Error("Outing not found"))}`; return; }
  if (partsRes.error || teamsRes.error || scoresRes.error || holesRes.error) {
    const err = partsRes.error || teamsRes.error || scoresRes.error || holesRes.error;
    view.innerHTML = `<h1>DFL Golf</h1>${errorBox(err)}<div class="card"><div class="card-body muted">The outing loaded, but a golf supporting table could not be read. Check golf_schema.sql in Supabase.</div></div>`;
    return;
  }
  const outing = outRes.data, parts = partsRes.data || [], teams = teamsRes.data || [], scores = scoresRes.data || [], holeRows = holesRes.data || [];
  const byId = new Map(members.map(m => [String(m.id), m]));
  const rating = new Map((ranksRes.data || []).map(r => [String(r.member_id), Number(r.rating)]));
  const rate = memberId => rating.get(String(memberId)) ?? DEFAULT_RATING;
  const pars = buildPars(outing, holeRows);
  const selected = teams.find(t => String(t.id) === String(teamId));
  if (teamId && !selected) { location.hash = `#/golf?id=${id}`; return; }

  view.innerHTML = `<header class="page-head"><a class="backlink" href="#/golf">← Golf</a><h1>${esc(outing.name)}</h1></header><div id="golf-outing">${selected ? teamScorecard(outing, selected, parts, scores, byId, pars) : outingOverview(outing, parts, teams, byId, rate)}</div>`;
  if (selected) wireScorecard(view, outing, selected, parts, pars);
  if (!selected && canEdit()) { wireLineup(view, outing, parts, members, () => render(view)); wireTeams(view, outing, parts, teams, rate, () => render(view)); }
}

function buildPars(outing, holeRows) {
  const byHole = new Map(holeRows.map(h => [Number(h.hole), Number(h.par)]));
  return Array.from({ length: Number(outing.holes || 18) }, (_, i) => byHole.get(i + 1) || 4);
}

function outingOverview(outing, parts, teams, byId, rate) {
  const rows = team => parts.filter(p => String(p.team_id) === String(team.id));
  const teamCard = team => {
    const mine = rows(team);
    return `<a class="gteam gteam-link" style="--racer:${esc(team.color || TEAM_COLORS[0])}" href="#/golf?id=${outing.id}&team=${team.id}"><header class="gteam-head"><span class="gteam-name">${esc(team.name || "Team")}</span><span class="gteam-open">View scorecard →</span></header><div class="gteam-members">${mine.length ? mine.map(p => `<span>${esc(byId.get(String(p.member_id))?.display_name || "Unknown")}</span>`).join("") : `<span class="muted tiny">Nobody yet</span>`}</div></a>`;
  };
  const unassigned = parts.filter(p => p.team_id == null);
  return `<div class="card"><div class="setup-figures">${figure(parts.length, parts.length === 1 ? "player" : "players")}${figure(outing.holes, "holes")}${figure(teams.length || "—", teams.length === 1 ? "team" : "teams")}</div><div class="golf-meta" style="margin-top:8px">${outing.course ? `<span>${esc(outing.course)}</span>` : ""}${outing.event_date ? `<span>· ${esc(fmtDate(outing.event_date))}</span>` : ""}</div>${outing.notes ? `<div class="card-body">${esc(outing.notes)}</div>` : ""}</div><div class="card"><div class="card-title">Teams</div>${teams.length ? `<div class="gteams">${teams.map(teamCard).join("")}</div>` : `<p class="muted tiny">No teams generated yet.</p>`}${unassigned.length ? `<div class="gteam is-spare"><header class="gteam-head"><span class="gteam-name">Unassigned</span></header><div class="gteam-members">${unassigned.map(p => `<span>${esc(byId.get(String(p.member_id))?.display_name || "Unknown")}</span>`).join("")}</div></div>` : ""}${canEdit() ? teamAdminControls(outing, parts, teams) : ""}</div>${canEdit() ? lineupCard(outing, parts, [], byId, rate) : ""}`;
}

function figure(value, label) { return `<div class="setup-figure"><span class="sf-v">${esc(value)}</span><span class="sf-l">${esc(label)}</span></div>`; }

function lineupCard(outing, parts, members, byId, rate) {
  const spare = members.filter(m => !parts.some(p => String(p.member_id) === String(m.id)));
  return `<div class="card"><div class="card-title">Line-up</div>${parts.length ? `<div class="glist">${parts.map(p => `<div class="grow"><span class="gname">${esc(byId.get(String(p.member_id))?.display_name || "Unknown")}</span><span class="grate">${rate(p.member_id)}</span><button class="btn ghost small" data-drop-player="${p.id}">&times;</button></div>`).join("")}</div>` : `<p class="muted tiny">Nobody signed up yet.</p>`}<div class="arena-admin">${spare.length ? `<select id="golf-add-member"><option value="">— add a player —</option>${spare.map(m => `<option value="${m.id}">${esc(m.display_name)}</option>`).join("")}</select>` : `<span class="muted tiny">Every member is playing.</span>`}<button class="btn ghost small" id="golf-add-all" ${spare.length ? "" : "disabled"}>Add everyone</button></div></div>`;
}

function teamAdminControls(outing, parts, teams) { return `<div class="arena-admin"><label class="gcount">Teams <input type="number" id="golf-team-count" min="2" max="6" value="${teams.length || 2}"></label><button class="btn small" id="golf-random" ${parts.length < 2 ? "disabled" : ""}>Random</button><button class="btn small" id="golf-balanced" ${parts.length < 2 ? "disabled" : ""}>Balanced</button><button class="btn ghost small" id="golf-clear" ${teams.length ? "" : "disabled"}>Clear teams</button></div><p class="muted tiny">Click a team to open its scorecard.</p>`; }

function teamScorecard(outing, team, parts, scores, byId, pars) {
  const teamParts = parts.filter(p => String(p.team_id) === String(team.id));
  const myId = String(currentMember()?.id || "");
  const editable = isAdmin() || teamParts.some(p => String(p.member_id) === myId);
  const totalPar = pars.reduce((a,b) => a+b, 0);
  return `<div class="card golf-scorecard-page"><div class="scorecard-title"><a class="backlink" href="#/golf?id=${outing.id}">← Teams</a><div><h2>${esc(team.name || "Team")}</h2><p class="muted tiny">${editable ? "Team members can edit this scorecard." : "Read-only scorecard."}</p></div></div>${teamParts.length ? teamParts.map(p => playerScoreBlock(outing, p, scores, byId, pars, editable)).join("") : `<p class="muted">No players on this team.</p>`}<div class="scorecard-summary"><span>Team par <b>${totalPar}</b></span><span>Team score <b>${teamParts.reduce((n,p) => n + playerTotal(p.member_id, scores), 0) || "—"}</b></span></div></div>`;
}

function playerScoreBlock(outing, participant, scores, byId, pars, editable) {
  const name = byId.get(String(participant.member_id))?.display_name || "Unknown";
  const mine = scores.filter(s => String(s.member_id) === String(participant.member_id));
  const val = hole => mine.find(s => Number(s.hole) === hole)?.strokes ?? "";
  const frontPar = pars.slice(0,9).reduce((a,b)=>a+b,0), backPar = pars.slice(9,18).reduce((a,b)=>a+b,0), totalPar = frontPar + backPar;
  const holes = Number(outing.holes || 18);
  const row = (start,end,label,par) => { const tally=sumRange(mine,start,end); return `<div class="score-nine"><div class="score-nine-head"><strong>${label}</strong><span>Par ${par}</span><span>Score <b data-tally="${participant.member_id}-${label}">${tally || "—"}</b></span><span>To par <b>${toPar(tally,par)}</b></span></div><div class="score-holes">${Array.from({length:end-start+1},(_,i)=>{const hole=start+i;if(hole>holes)return "";return `<label class="score-hole"><span>${hole}</span>${editable ? `<input data-score member="${participant.member_id}" hole="${hole}" type="number" min="1" max="15" inputmode="numeric" value="${val(hole)}" aria-label="${esc(name)}, hole ${hole}">` : `<b>${val(hole) || "—"}</b>`}</label>`}).join("")}</div></div>`; };
  const total = sumRange(mine,1,18);
  return `<section class="score-player"><header><h3>${esc(name)}</h3><span class="muted tiny">${editable ? "Editable" : "Read only"}</span></header>${row(1,9,"Front 9",frontPar)}${holes>9 ? row(10,18,"Back 9",backPar) : ""}<div class="score-total"><span>Total <b>${total || "—"}</b></span><span>Par ${totalPar}</span><span>To par <b>${toPar(total,totalPar)}</b></span></div></section>`;
}

function sumRange(scores,start,end){return scores.filter(s=>Number(s.hole)>=start&&Number(s.hole)<=end).reduce((n,s)=>n+Number(s.strokes||0),0);}
function playerTotal(memberId,scores){return scores.filter(s=>String(s.member_id)===String(memberId)).reduce((n,s)=>n+Number(s.strokes||0),0);}
function toPar(score,par){if(!score)return "—";const d=score-par;return d===0?"E":d>0?`+${d}`:`${d}`;}

function wireScorecard(view, outing, team, parts, pars) {
  const root=view.querySelector("#golf-outing");
  const myId=String(currentMember()?.id||"");
  const teamParts=parts.filter(p=>String(p.team_id)===String(team.id));
  const allowed=isAdmin()||teamParts.some(p=>String(p.member_id)===myId);
  if(!allowed)return;
  root.addEventListener("change",async e=>{
    const input=e.target.closest("input[data-score]"); if(!input)return;
    const memberId=Number(input.dataset.member), hole=Number(input.dataset.hole);
    const participant=teamParts.find(p=>String(p.member_id)===String(memberId)); if(!participant)return toast("That player is not on this team",true);
    try{
      if(!input.value.trim()){
        const {error}=await db().from("golf_scores").delete().eq("outing_id",outing.id).eq("member_id",memberId).eq("hole",hole); if(error)throw error;
      }else{
        const strokes=Number(input.value); if(!Number.isInteger(strokes)||strokes<1||strokes>15)throw new Error("Enter strokes from 1 to 15");
        const {error}=await db().from("golf_scores").upsert({outing_id:outing.id,member_id:memberId,hole,strokes},{onConflict:"outing_id,member_id,hole"}); if(error)throw error;
      }
      await refreshScorecard(view,outing,team,teamParts,pars);
    }catch(err){toast(err.message||"Could not save score",true);}
  });
}

async function refreshScorecard(view,outing,team,teamParts,pars){
  const {data,error}=await db().from("golf_scores").select("*").eq("outing_id",outing.id); if(error)return;
  const scores=data||[];
  teamParts.forEach(p=>{
    const block=view.querySelector(`.score-player input[data-member]`)?.closest?.(".score-player");
    if(!block)return;
  });
  // Re-rendering keeps the card's tallies authoritative and avoids stale DOM math.
  const root=view.querySelector("#golf-outing");
  root.innerHTML=teamScorecard(outing,team,scores.length?teamParts:teamParts,new Map(),pars);
  // The caller's normal route reload is safer for names/read-only state.
  render(view);
}

function wireLineup(view,outing,parts,members,refresh){
  const root=view.querySelector("#golf-outing");
  root.addEventListener("change",async e=>{const add=e.target.closest("#golf-add-member");if(!add||!add.value)return;try{await insertRow("golf_participants",{outing_id:outing.id,member_id:Number(add.value),sort_order:parts.length});refresh();}catch(err){toast(err.message||"Could not add that player",true);}});
  root.addEventListener("click",async e=>{const drop=e.target.closest("[data-drop-player]"),all=e.target.closest("#golf-add-all");if(drop){try{const{error}=await db().from("golf_participants").delete().eq("id",drop.dataset.dropPlayer);if(error)throw error;refresh();}catch(err){toast(err.message||"Could not remove that player",true);}}if(all){all.disabled=true;const have=new Set(parts.map(p=>String(p.member_id)));try{let n=parts.length;for(const m of members){if(have.has(String(m.id)))continue;await insertRow("golf_participants",{outing_id:outing.id,member_id:m.id,sort_order:n++});}refresh();}catch(err){toast(err.message||"Could not fill the line-up",true);all.disabled=false;}}});
}

function wireTeams(view,outing,parts,teams,rate,refresh){const root=view.querySelector("#golf-outing");root.addEventListener("change",async e=>{const move=e.target.closest("[data-move]");if(!move)return;try{await updateRow("golf_participants",move.dataset.move,{team_id:move.value?Number(move.value):null});refresh();}catch(err){toast(err.message||"Could not move that player",true);}});root.addEventListener("click",async e=>{const rnd=e.target.closest("#golf-random"),bal=e.target.closest("#golf-balanced"),clr=e.target.closest("#golf-clear");if(clr){if(!confirm("Clear the teams? Players stay in the outing."))return;try{await db().from("golf_participants").update({team_id:null}).eq("outing_id",outing.id);await db().from("golf_teams").delete().eq("outing_id",outing.id);refresh();}catch(err){toast(err.message||"Could not clear the teams",true);}return;}if(rnd||bal){const want=Math.max(2,Math.min(6,Number(view.querySelector("#golf-team-count")?.value)||2));e.target.disabled=true;try{await generateTeams(outing,parts,teams,rate,want,bal?"balanced":"random");toast(bal?"Balanced teams generated":"Random teams generated");refresh();}catch(err){toast(err.message||"Could not generate teams",true);e.target.disabled=false;}}});}

async function generateTeams(outing,parts,existingTeams,rate,want,mode){const teams=[...existingTeams];while(teams.length<want){const i=teams.length;teams.push(await insertRow("golf_teams",{outing_id:outing.id,name:TEAM_NAMES[i%TEAM_NAMES.length],color:TEAM_COLORS[i%TEAM_COLORS.length],sort_order:i}));}while(teams.length>want){const gone=teams.pop();await db().from("golf_teams").delete().eq("id",gone.id);}const locked=parts.filter(p=>p.locked&&p.team_id!=null),pool=parts.filter(p=>!(p.locked&&p.team_id!=null));const load=new Map(teams.map(t=>[String(t.id),0]));locked.forEach(p=>{const k=String(p.team_id);if(load.has(k))load.set(k,load.get(k)+1);});if(mode==="balanced")pool.sort((a,b)=>rate(b.member_id)-rate(a.member_id));else for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}for(const p of pool){let best=teams[0],bestLoad=Infinity;for(const t of teams){const l=load.get(String(t.id));if(l<bestLoad){bestLoad=l;best=t;}}load.set(String(best.id),bestLoad+1);await updateRow("golf_participants",p.id,{team_id:best.id});}}
