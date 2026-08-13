// DFL Golf - mobile-first event/team view with live leaderboard.
import { db, insertRow, updateRow } from "../supabase.js";
import { esc, empty, errorBox, toast, fmtDate, loading } from "../ui.js";
import { loadMembers } from "../members.js";
import { passFor, saveGolfPass, clearGolfPass, verifyCode, eventHasCode } from "../golf-guest.js";
import { addControl, editControls, wireInline, canEdit, visible, hiddenClass } from "../inline.js";
import { pendingFor, dropPending } from "../golf-offline.js";
import { memberNames, playerName, isGuest } from "../golf-people.js";
const DEFAULT_RATING=75;
/* Set once per render of an event, and read by every card that prints a
   player's name. A participant is either a league member or a guest with a
   name typed for the day, so no card can read a name off member_id. */
let nameMap=new Map();
const TEAM_NAMES=["Team Chaos","Team Bogey","Team Shank","Team Mulligan","Team Sandbagger","Team Whiff","Team Duff","Team Yips"];
const TEAM_COLORS=["#2fbf5f","#4aa3ff","#f0a742","#e0574a","#b07cf0","#3ecfcf"];
export async function render(view){stopLeaderPoll();const qs=new URLSearchParams(location.hash.split("?")[1]||"");const id=qs.get("id");if(id)return renderOuting(view,id,qs.get("team"),qs.get("match"));return renderList(view);}
async function renderList(view){view.innerHTML=loading();const res=await db().from("golf_outings").select("*").order("event_date",{ascending:false});if(res.error){view.innerHTML=`<h1>DFL Golf</h1>${errorBox(res.error)}<div class="card"><div class="card-body muted">If the golf tables are missing, run <strong>golf_schema.sql</strong> in Supabase.</div></div>`;return;}const outings=visible("golf_outings",res.data||[]),live=outings.filter(o=>o.status!=="final"),past=outings.filter(o=>o.status==="final");view.innerHTML=`<div id="golf-wrap"><header class="page-head"><h1>DFL Golf</h1>${addControl("golf_outings","New event")}</header>${outings.length?"":empty(canEdit()?"No golf events yet. Create one above.":"No golf events yet.")}${live.length?`<h2 class="section-title">Upcoming<span class="count">${live.length}</span></h2>${live.map(outingCard).join("")}`:""}${past.length?`<h2 class="section-title">Golf history<span class="count">${past.length}</span></h2>${past.map(outingCard).join("")}`:""}<div class="golf-bag-page"></div></div>`;wireInline(view.querySelector("#golf-wrap"),()=>render(view));}
function outingCard(o){const state=o.status==="final"?["Final","grey"]:o.status==="active"?["Live","green"]:["Setup","warn"];return `<article class="card golf-card ${hiddenClass("golf_outings",o)}"><a class="golf-link" href="#/golf?id=${o.id}"><div class="golf-top"><h3 class="card-heading">${esc(o.name)}</h3><span class="pill ${state[1]}">${state[0]}</span></div><div class="golf-meta">${o.course?`<span>${esc(o.course)}</span>`:""}${o.event_date?`<span>· ${esc(fmtDate(o.event_date))}</span>`:""}<span>· ${o.holes||18} holes</span></div></a>${editControls("golf_outings",o,{compact:true})}</article>`;}
/*
  A 9-hole course is stored as 9 pars and played twice, so hole 12 takes hole
  3's par - the same wrap the scorecard has always applied.

  Without it the pars map had no key for 10-18, every back-nine stroke failed
  the isFinite check below, and the board quietly threw half the round away: a
  team that had finished read "Thru 9" at their front-nine score.
*/
function parFor(pars,hole){const h=Number(hole);if(pars.has(h))return pars.get(h);if(pars.size&&pars.size<=9&&h>9)return pars.get(h-9);return undefined;}
function scoreToPar(scores,pars){let total=0,par=0,holes=0;for(const s of scores){const h=Number(s.hole),st=Number(s.strokes),p=Number(parFor(pars,h));if(Number.isFinite(st)&&Number.isFinite(p)){total+=st;par+=p;holes++;}}return{diff:total-par,holes,total};}
/* A dash, not "Not started" - the line under the team name already says that,
   and the score column is 44px of tabular numerals. */
function scoreLabel(diff,holes){if(!holes)return"—";if(diff===0)return"E";return diff>0?`+${diff}`:`${diff}`;}
/* Strokes this device has entered but not yet managed to send count on the
   board too - the alternative is your own team reading a hole behind while
   you stand there looking at the number you just typed. */
function withPending(outingId,teamId,rows){const pend=pendingFor(outingId,teamId);if(!pend.size)return rows;
const map=new Map(rows.map(r=>[Number(r.hole),r]));
for(const [hole,strokes] of pend){if(strokes==null)map.delete(hole);else map.set(hole,{hole,strokes});}
return [...map.values()];}

/*
  The rows on their own, so the poll can replace them without rebuilding the
  card around them.

  Sorted by to-par, which ranks a team at −1 thru 6 above one at +2 thru 18 -
  that is how a live golf leaderboard works, so THRU is printed next to every
  score. A team yet to start sits at the bottom rather than at even par.
*/
/* 18, NOT outing.holes. A 9-hole course is stored as holes=9 and played twice,
   and the scorecard always offers holes 1-18 - so reading outing.holes here
   would call a team finished when they were standing on the 10th tee. */
const ROUND_HOLES=18;
function leaderRows(teams,scores,holes,outing){const pars=new Map((holes||[]).map(h=>[Number(h.hole),Number(h.par)]));
const cards=teams.map(t=>{const ss=withPending(outing.id,t.id,scores.filter(s=>String(s.team_id)===String(t.id)));const x=scoreToPar(ss,pars);return{team:t,...x,label:scoreLabel(x.diff,x.holes)};}).sort((a,b)=>{if(!a.holes&&!b.holes)return a.team.sort_order-b.team.sort_order;if(!a.holes)return 1;if(!b.holes)return-1;return a.diff-b.diff||b.holes-a.holes||a.team.sort_order-b.team.sort_order;});
if(!cards.length)return empty("No teams yet.");
const thru=x=>!x.holes?"Not started":`${x.holes>=ROUND_HOLES?"F":`Thru ${x.holes}`} · ${x.total} stroke${x.total===1?"":"s"}`;
return cards.map((x,i)=>`<a class="golf-leader-row" href="#/golf?id=${x.team.outing_id}&team=${x.team.id}"><span class="golf-leader-pos">${i+1}</span><span class="golf-leader-team"><strong>${esc(x.team.name||"Team")}</strong><small>${thru(x)}</small></span><strong class="golf-leader-score">${x.label}</strong><span class="golf-leader-arrow">›</span></a>`).join("");}

function leaderboard(teams,scores,holes,outing){return `<section class="card golf-leaderboard" data-collapse="golf-leaderboard"><div class="card-title-row"><div><div class="card-title">Live leaderboard</div><p class="muted tiny">Updates as teams enter strokes.</p></div><span class="admin-badge">LIVE</span></div><div class="golf-leader-list" data-leader-list>${leaderRows(teams,scores,holes,outing)}</div></section>`;}

const LEADER_POLL_MS=15000;
let leaderTimer=0,onLeaderVisible=null;
function stopLeaderPoll(){clearInterval(leaderTimer);leaderTimer=0;
if(onLeaderVisible){document.removeEventListener("visibilitychange",onLeaderVisible);onLeaderVisible=null;}}

/*
  "Updates as teams enter strokes" was only true if you reloaded the page:
  nothing re-read the scores. Now it polls, the same way the draft board
  does, and stops as soon as the list it paints leaves the DOM.

  ONLY the list is replaced. A full page re-render every 15 seconds would
  close the admin cards mid-edit and reset a select somebody was using.

  A failed read is ignored on purpose - out of signal the right thing to show
  is the last board we had, not an error where the standings were.
*/
function startLeaderPoll(view,outing){stopLeaderPoll();
if(!view.querySelector("[data-leader-list]"))return;

const tick=async()=>{
  const node=view.querySelector("[data-leader-list]");
  if(!node||!document.body.contains(node))return stopLeaderPoll();
  /* A backgrounded tab is a phone in a pocket. Don't spend its battery or
     its data on standings nobody is looking at. */
  if(document.hidden)return;
  const [teamsRes,scoresRes,holesRes]=await Promise.all([
    db().from("golf_teams").select("*").eq("outing_id",outing.id).order("sort_order"),
    db().from("golf_scores").select("*").eq("outing_id",outing.id),
    db().from("golf_holes").select("hole,par").eq("outing_id",outing.id).order("hole")]);
  if(teamsRes.error||scoresRes.error||holesRes.error)return;
  const fresh=view.querySelector("[data-leader-list]");
  if(fresh)fresh.innerHTML=leaderRows(teamsRes.data||[],scoresRes.data||[],holesRes.data||[],outing);
};

leaderTimer=setInterval(tick,LEADER_POLL_MS);
/* Coming back to the app is the moment you most want the truth, and it is
   also the moment the numbers are most likely to be stale - the pocket
   skipped every tick. Refresh now rather than up to 15 seconds from now. */
onLeaderVisible=()=>{if(!document.hidden)tick();};
document.addEventListener("visibilitychange",onLeaderVisible);}
async function renderOuting(view,id,teamId,matchId){view.innerHTML=loading();const [outRes,partsRes,teamsRes,ranksRes,scoresRes,holesRes,members]=await Promise.all([db().from("golf_outings").select("*").eq("id",id).maybeSingle(),db().from("golf_participants").select("*").eq("outing_id",id).order("sort_order"),db().from("golf_teams").select("*").eq("outing_id",id).order("sort_order"),db().from("golf_rankings").select("member_id,rating"),db().from("golf_scores").select("*").eq("outing_id",id),db().from("golf_holes").select("hole,par").eq("outing_id",id).order("hole"),loadMembers().catch(()=>[])]);if(outRes.error||!outRes.data){view.innerHTML=`<h1>DFL Golf</h1>${errorBox(outRes.error||new Error("Golf event not found"))}`;return;}const supportError=partsRes.error||teamsRes.error||scoresRes.error||holesRes.error;if(supportError){view.innerHTML=`<h1>DFL Golf</h1>${errorBox(supportError)}<div class="card"><div class="card-body muted">The event loaded, but a golf supporting table could not be read. Check the golf schema and reload.</div></div>`;return;}const outing=outRes.data,parts=partsRes.data||[],teams=teamsRes.data||[],membersList=members||[],byId=new Map(membersList.map(m=>[String(m.id),m])),rating=new Map((ranksRes.data||[]).map(r=>[String(r.member_id),Number(r.rating)])),rate=id=>rating.get(String(id))??DEFAULT_RATING,selected=teams.find(t=>String(t.id)===String(teamId));nameMap=memberNames(membersList);if(teamId&&!selected){location.hash=`#/golf?id=${id}`;return;}/*
  Up ONE level, never all the way out.

  This header sits above the team scorecard and the 2v2 card as well as the
  event itself, and it used to say "← Golf" and go to the events list from all
  three. So the most obvious button on a scorecard threw you out of the event
  entirely - and worse, the card below it had its own back link going somewhere
  else, so two arrows a thumb apart disagreed about what "back" meant.

  On a sub-screen this goes to the event; only the event page itself goes out
  to the list.
*/
const deep=!!(selected||matchId),backHref=deep?`#/golf?id=${id}`:"#/golf",backText=deep?"← Back":"← Golf";
const title=`<header class="page-head golf-event-head"><a class="backlink" href="${backHref}">${backText}</a><div><h1>${esc(outing.name)}</h1><div class="golf-meta">${outing.course?`<span>${esc(outing.course)}</span>`:""}${outing.event_date?`<span>· ${esc(fmtDate(outing.event_date))}</span>`:""}<span>· ${outing.holes||18} holes</span></div></div></header>`;if(selected){view.innerHTML=`${title}<div id="golf-outing"><div class="golf-scorecard-page"></div></div>`;return;}
/* One 2v2, filled in by golf-match.js. Same arrangement as the team card:
   this page leaves a hole and does not need to know what goes in it. */
if(matchId){view.innerHTML=`${title}<div id="golf-outing"><div class="golf-match-page"></div></div>`;return;}
view.innerHTML=`${title}${guestStrip(outing)}<div id="golf-outing"><div class="golf-draft-page"></div><div class="golf-matches-page"></div>${leaderboard(teams,scoresRes.data||[],holesRes.data||[],outing)}${outingOverview(outing,parts,teams,byId,(scoresRes.data||[]).length)}</div>`;startLeaderPoll(view,outing);wireGuest(view,outing,()=>render(view));wireGuestCode(view,outing);if(canEdit()){wireLineup(view,outing,parts,membersList,()=>render(view));wireTeams(view,outing,parts,teams,rate,()=>render(view));wireTeamNames(view,outing,teams,()=>render(view));wireTeamMode(view,outing,parts,teams,()=>render(view));}}
function outingOverview(outing,parts,teams,byId,scoreCount){const teamCard=team=>{const players=parts.filter(p=>String(p.team_id)===String(team.id));return `<div class="gteam-wrap"><a class="gteam gteam-link" style="--racer:${esc(team.color||TEAM_COLORS[0])}" href="#/golf?id=${outing.id}&team=${team.id}"><header class="gteam-head"><div><span class="gteam-name">${esc(team.name||"Team")}</span><span class="gteam-count">${players.length} player${players.length===1?"":"s"}</span></div><span class="gteam-open">View scorecard <b>→</b></span></header><div class="gteam-members">${players.length?players.map(p=>`<span>${esc(playerName(p,nameMap))}</span>`).join(""):`<span class="muted tiny">No players assigned</span>`}</div></a></div>`;};const unassigned=parts.filter(p=>p.team_id==null);return `<section class="golf-event-grid"><div class="card golf-event-summary"><div class="setup-figures">${figure(parts.length,parts.length===1?"player":"players")}${figure(outing.holes||18,"holes")}${figure(teams.length,teams.length===1?"team":"teams")}</div>${outing.notes?`<p class="muted golf-notes">${esc(outing.notes)}</p>`:""}</div><section class="card golf-teams-card" data-collapse="golf-teams"><div class="card-title-row"><div><div class="card-title">Teams</div><p class="muted tiny">Select a team to open its scorecard.</p></div>${canEdit()?`<span class="admin-badge">Admin</span>`:""}</div>${teams.length?`<div class="gteams">${teams.map(teamCard).join("")}</div>`:`<div class="golf-empty-teams">${canEdit()?"Generate teams below to get started.":"Teams have not been generated yet."}</div>`}${unassigned.length?`<div class="gteam is-spare"><header class="gteam-head"><span class="gteam-name">Unassigned</span><span class="muted tiny">${unassigned.length}</span></header><div class="gteam-members">${unassigned.map(p=>`<span>${esc(playerName(p,nameMap))}</span>`).join("")}</div></div>`:""}</section>${canEdit()?`<section class="card golf-admin-card" data-collapse="golf-teamsetup"><div class="card-title-row"><div><div class="card-title">How teams are decided</div><p class="muted tiny">${teamMode(outing)==="random"?"The generator deals every player out — at random, or evenly by rating with locked players staying put.":teamMode(outing)==="draft"?"Captains pick their players one at a time on the board above.":"Build random or balanced teams. Locked players stay together."}</p></div><span class="admin-badge">Admin only</span></div>${teamAdminControls(outing,parts,teams,scoreCount,parts.filter(p=>p.pick_number!=null).length)}</section>${guestCodeCard(outing)}${rosterCard(outing,parts,teams,byId)}${lineupCard(outing,parts,teams,byId)}`:""}</section>`;}
/* An admin-only write that the database REFUSES does not come back as an
   error: row level security makes it match zero rows and PostgREST returns
   a cheerful 204. Without asking for the changed rows back, a member with no
   admin token sees "Team renamed" and a name that never changed. */
async function mustWrite(query,what){const{data,error}=await query.select("id");if(error)throw error;if(!data||!data.length)throw new Error(`The database refused to ${what}. Sign in as admin and try again.`);return data;}
function figure(value,label){return `<div class="setup-figure"><span class="sf-v">${esc(value)}</span><span class="sf-l">${esc(label)}</span></div>`;}
/* A player's team, said in colour AND in words - the dot alone is no use to
   anybody who cannot separate the two teams' colours, and the words alone are
   what you have to read one at a time. */
const teamOf=(p,teams)=>teams.find(t=>String(t.id)===String(p.team_id));
function teamDot(p,teams){const team=teamOf(p,teams);
return team?`<i class="tdot" style="--racer:${esc(team.color||TEAM_COLORS[0])}"></i>`:`<i class="tdot is-none" title="No team yet"></i>`;}
function teamLabel(p,teams){const team=teamOf(p,teams);
return `<small class="tteam${team?"":" muted"}">${esc(team?.name||"no team")}</small>`;}
function lineupCard(outing,parts,teams,byId){const names=[...byId.values()],spare=names.filter(m=>!parts.some(p=>String(p.member_id)===String(m.id)));return `<section class="card golf-lineup-card" data-collapse="golf-players"><div class="card-title-row"><div><div class="card-title">Players</div><p class="muted tiny">Add or remove players from this event. The colour is their team.</p></div></div>${parts.length?`<div class="glist">${parts.map(p=>`<div class="grow"><span class="gname">${teamDot(p,teams)}${esc(playerName(p,nameMap))}${isGuest(p)?`<small class="muted"> · guest</small>`:""}${teamLabel(p,teams)}</span><button class="btn ghost small" data-drop-player="${p.id}" aria-label="Remove player">×</button></div>`).join("")}`:`<p class="muted tiny">Nobody is signed up yet.</p>`}<div class="arena-admin">${spare.length?`<select id="golf-add-member"><option value="">— add a member —</option>${spare.map(m=>`<option value="${m.id}">${esc(m.display_name)}</option>`).join("")}`:`<span class="muted tiny">Every member is playing.</span>`}<button class="btn ghost small" id="golf-add-all" ${spare.length?"":"disabled"}>Add everyone</button></div><div class="arena-admin"><input id="golf-new-guest" type="text" maxlength="80" placeholder="Guest name" inputmode="text"><button class="btn small" id="golf-add-guest">Add a guest</button></div><p class="muted tiny">A guest plays this event only. They are <strong>not</strong> added to the league, so they never turn up in the “Who are you?” picker, the keepers or any member list — but they can be drafted, paired and scored like anybody else. Somebody else enters their strokes, since a guest has no device of their own in the app.</p></section>`;}
/* The generator, then the one control that throws scores away. It is kept
   below a rule and labelled with the exact number of strokes it deletes,
   because "Reset" next to "Random teams" is how a round gets wiped at the
   turn by a mis-tap. */
/*
  How this outing decides its teams, and only the controls for the mode it is
  actually in.

  Manual is the default and the two modes are mutually exclusive on screen,
  because the failure mode otherwise is a real one: "Random teams" sitting a
  thumb's width from a draft in progress silently reassigns everybody and
  throws the picks away.

  team_mode arrives with golf_draft_schema.sql. Until that is run it is
  undefined, and an outing with no mode behaves exactly as it did before -
  generator visible, no draft - so nothing breaks while the migration waits.
*/
function teamMode(outing){return outing.team_mode==null?"legacy":outing.team_mode==="random"?"random":"draft";}
function teamAdminControls(outing,parts,teams,scoreCount,pickCount){const mode=teamMode(outing);
const modeSwitch=mode==="legacy"?"":`<div class="golf-mode" role="group" aria-label="How teams are decided">
  <button type="button" class="gm-opt ${mode==="draft"?"is-on":""}" data-team-mode="draft" aria-pressed="${mode==="draft"}">Captains draft<small>pick one at a time</small></button>
  <button type="button" class="gm-opt ${mode==="random"?"is-on":""}" data-team-mode="random" aria-pressed="${mode==="random"}">Random<small>deal them out</small></button>
</div>`;
const generator=`<div class="golf-generator"><label class="gcount">Teams <input type="number" id="golf-team-count" min="2" max="6" value="${teams.length||2}"></label><button class="btn small" id="golf-random" ${parts.length<2?"disabled":""}>Random teams</button><button class="btn small" id="golf-balanced" ${parts.length<2?"disabled":""}>Balanced teams</button><button class="btn ghost small" id="golf-clear" ${teams.length?"":"disabled"}>Clear teams</button></div>`;
// In draft mode the empty teams still have to come from somewhere, so making
// them stays - it is dealing the PLAYERS out that would trample the draft.
const draftControls=`<div class="golf-generator"><label class="gcount">Teams <input type="number" id="golf-team-count" min="2" max="6" value="${teams.length||2}"></label><button class="btn small" id="golf-make-teams" ${teams.length?"disabled":""}>Create the teams</button><button class="btn ghost small" id="golf-clear" ${teams.length?"":"disabled"}>Clear teams</button></div><p class="muted tiny">Empty teams, then name the captains on the draft board above. Nobody is assigned for you.</p>`;
return modeSwitch+(mode==="draft"?draftControls:generator)+`<div class="golf-danger"><div class="golf-danger-text"><strong>Reset all scorecards</strong><p class="muted tiny">${scoreCount?`Deletes all ${scoreCount} stroke${scoreCount===1?"":"s"} for every team in this event. Teams, players and pars stay.`:"No strokes have been entered yet."}</p></div><button class="btn small danger" id="golf-reset-scores" ${scoreCount?"":"disabled"}>Reset all</button></div>`;}

/* Rename a team and shuffle who is on it, in one place.

   The team cards above are links to a scorecard, so they are the wrong home
   for a select and two buttons - a tap meant for the roster would open the
   card instead. Locking matters here because the generator honours it: a
   locked player keeps their team when you regenerate. */
function rosterCard(outing,parts,teams,byId){const options=(p)=>`<option value="">— unassigned —</option>${teams.map(t=>`<option value="${t.id}" ${String(t.id)===String(p.team_id)?"selected":""}>${esc(t.name||"Team")}</option>`).join("")}`;
const row=(p)=>`<div class="grow gedit-row ${p.locked?"is-locked":""}"><span class="gname">${esc(playerName(p,nameMap))}</span><select class="gmove" data-move="${p.id}" data-was="${p.team_id??""}" aria-label="Move player to another team">${options(p)}</select><button type="button" class="btn ghost small glock" data-lock="${p.id}" data-on="${p.locked?"1":"0"}" title="${p.locked?"Unlock":"Lock to this team"}" aria-label="${p.locked?"Unlock":"Lock to this team"}">${p.locked?"🔒":"🔓"}</button></div>`;
const block=(t)=>{const mine=parts.filter(p=>String(p.team_id)===String(t.id));return `<div class="gedit" style="--racer:${esc(t.color||TEAM_COLORS[0])}"><div class="gedit-head"><input class="gedit-name" type="text" maxlength="40" value="${esc(t.name||"Team")}" data-team-name="${t.id}" aria-label="Team name"><button type="button" class="btn small" data-save-name="${t.id}">Save</button></div><div class="glist">${mine.length?mine.map(row).join(""):`<div class="grow"><span class="muted tiny">Nobody on this team yet</span></div>`}</div></div>`};
const loose=parts.filter(p=>p.team_id==null);
return `<section class="card golf-roster-card" data-collapse="golf-roster"><div class="card-title-row"><div><div class="card-title">Team editor</div><p class="muted tiny">Rename a team, move players between teams, and lock anyone who should stay put through a regenerate.</p></div><span class="admin-badge">Admin only</span></div>${teams.length?`<div class="gedits">${teams.map(block).join("")}${loose.length?`<div class="gedit is-spare"><div class="gedit-head"><span class="gedit-title">Unassigned</span></div><div class="glist">${loose.map(row).join("")}</div></div>`:""}</div>`:`<div class="golf-empty-teams">Generate teams first.</div>`}</section>`;}
function wireLineup(view,outing,parts,members,refresh){const root=view.querySelector("#golf-outing");root.addEventListener("change",async e=>{const add=e.target.closest("#golf-add-member");if(!add||!add.value)return;try{await insertRow("golf_participants",{outing_id:outing.id,member_id:Number(add.value),sort_order:parts.length});refresh();}catch(err){toast(err.message||"Could not add that player",true);}});root.addEventListener("click",async e=>{const drop=e.target.closest("[data-drop-player]"),all=e.target.closest("#golf-add-all"),create=e.target.closest("#golf-add-guest");if(drop){try{const{error}=await db().from("golf_participants").delete().eq("id",drop.dataset.dropPlayer);if(error)throw error;refresh();}catch(err){toast(err.message||"Could not remove that player",true);}}if(all){all.disabled=true;const have=new Set(parts.map(p=>String(p.member_id)));try{let n=parts.length;for(const m of members)if(!have.has(String(m.id)))await insertRow("golf_participants",{outing_id:outing.id,member_id:m.id,sort_order:n++});refresh();}catch(err){toast(err.message||"Could not fill the line-up",true);all.disabled=false;}}/* A guest is a golf_participants row and nothing else.
   This used to create a members row, which is how a stranger ended up in the
   "Who are you?" picker and every member dropdown in the app for good. */
if(create){const input=root.querySelector("#golf-new-guest"),name=input?.value?.trim();if(!name)return toast("Enter the guest's name",true);create.disabled=true;try{await insertRow("golf_participants",{outing_id:outing.id,guest_name:name,sort_order:parts.length});toast(`${name} added to this event`);refresh();}catch(err){toast(err.message||"Could not add that guest",true);create.disabled=false;}}});}
/* Names are typed in the field that already shows the current one, so you
   can see what you are changing - a prompt() box shows you nothing else on
   the card. Enter saves, because that is what Enter does in a text field. */
function wireTeamNames(view,outing,teams,refresh){const root=view.querySelector("#golf-outing");
const save=async(id,value)=>{const clean=String(value||"").trim();if(!clean)return toast("Team name cannot be blank",true);const team=teams.find(t=>String(t.id)===String(id));if(team&&team.name===clean)return;try{await mustWrite(db().from("golf_teams").update({name:clean}).eq("id",id),"rename that team");toast("Team renamed");refresh();}catch(err){toast(err.message||"Could not rename team",true);}};
root.addEventListener("click",e=>{const btn=e.target.closest("[data-save-name]");if(!btn)return;const input=root.querySelector(`[data-team-name="${btn.dataset.saveName}"]`);if(input)save(btn.dataset.saveName,input.value);});
root.addEventListener("keydown",e=>{const input=e.target.closest("[data-team-name]");if(!input||e.key!=="Enter")return;e.preventDefault();save(input.dataset.teamName,input.value);});}
function wireTeams(view,outing,parts,teams,rate,refresh){const root=view.querySelector("#golf-outing");root.addEventListener("change",async e=>{const move=e.target.closest("[data-move]");if(!move)return;try{await mustWrite(db().from("golf_participants").update({team_id:move.value?Number(move.value):null}).eq("id",move.dataset.move),"move that player");refresh();}catch(err){toast(err.message||"Could not move that player",true);move.value=move.dataset.was||"";}});root.addEventListener("click",async e=>{const rnd=e.target.closest("#golf-random"),bal=e.target.closest("#golf-balanced"),clr=e.target.closest("#golf-clear"),lock=e.target.closest("[data-lock]"),reset=e.target.closest("#golf-reset-scores");
if(lock){try{await mustWrite(db().from("golf_participants").update({locked:lock.dataset.on!=="1"}).eq("id",lock.dataset.lock),"lock that player");refresh();}catch(err){toast(err.message||"Could not lock that player",true);}return;}
/* Two gates on the same button, and the count is in the sentence: this
   deletes the whole event's strokes and there is no undo. */
if(reset){if(!confirm(`Reset every scorecard in this event?\n\nThis deletes all strokes for all teams. Teams, players and pars stay. This cannot be undone.`))return;if(!confirm("Last check - the strokes are gone for good. Reset all scorecards?"))return;reset.disabled=true;
/* Queued strokes on THIS device go too, or the first flush after the reset
   would put some of them straight back. */
dropPending(outing.id);
try{const gone=await mustWrite(db().from("golf_scores").delete().eq("outing_id",outing.id),"reset the scorecards");toast(`All scorecards reset — ${gone.length} stroke${gone.length===1?"":"s"} cleared`);refresh();}catch(err){toast(err.message||"Could not reset the scorecards",true);reset.disabled=false;}return;}if(clr){if(!confirm("Clear the teams? Players stay in the outing."))return;try{const a=await db().from("golf_participants").update({team_id:null}).eq("outing_id",outing.id);if(a.error)throw a.error;const b=await db().from("golf_teams").delete().eq("outing_id",outing.id);if(b.error)throw b.error;refresh();}catch(err){toast(err.message||"Could not clear the teams",true);}return;}if(rnd||bal){const want=Math.max(2,Math.min(6,Number(view.querySelector("#golf-team-count")?.value)||2));
/* Dealing the players out discards every pick that has been made. Say so with
   the number in it rather than quietly reassigning a half-finished draft. */
const picked=parts.filter(p=>p.pick_number!=null).length;
if(picked&&!confirm(`This deals every player out again and throws away the ${picked} pick${picked===1?"":"s"} already made. Carry on?`))return;
e.target.disabled=true;try{await generateTeams(outing,parts,teams,rate,want,bal?"balanced":"random");toast(bal?"Balanced teams generated":"Random teams generated");refresh();}catch(err){toast(err.message||"Could not generate teams",true);e.target.disabled=false;}}});}

/*
  The mode switch, and making empty teams for a draft to fill.

  Switching to Random does not itself move anybody - it just puts the
  generator on screen - so it only warns when there are picks that pressing
  the generator would then destroy.
*/
function wireTeamMode(view,outing,parts,teams,refresh){const root=view.querySelector("#golf-outing");
root.addEventListener("click",async e=>{const opt=e.target.closest("[data-team-mode]"),make=e.target.closest("#golf-make-teams");

if(opt){const want=opt.dataset.teamMode;
/* Only ever the two real values, and compared against the RAW stored value so
   a bad one that got in previously is corrected rather than read as a match. */
if(want!=="draft"&&want!=="random")return;
if(want===outing.team_mode)return;
const picked=parts.filter(p=>p.pick_number!=null).length;
if(want==="random"&&picked&&!confirm(`Switch to Random? The ${picked} pick${picked===1?"":"s"} already made stay${picked===1?"s":""} for now, but generating teams will replace ${picked===1?"it":"them"}.`))return;
try{await updateRow("golf_outings",outing.id,{team_mode:want});refresh();}
catch(err){toast(err.message||"Could not switch mode",true);}
return;}

if(make){const want=Math.max(2,Math.min(6,Number(view.querySelector("#golf-team-count")?.value)||2));
make.disabled=true;
try{for(let i=0;i<want;i++)await insertRow("golf_teams",{outing_id:outing.id,name:TEAM_NAMES[i%TEAM_NAMES.length],color:TEAM_COLORS[i%TEAM_COLORS.length],sort_order:i,draft_order:i});
toast(`${want} empty teams created`);refresh();}
catch(err){toast(err.message||"Could not create the teams",true);make.disabled=false;}}});}
async function generateTeams(outing,parts,existingTeams,rate,want,mode){const teams=[...existingTeams];while(teams.length<want){const i=teams.length;teams.push(await insertRow("golf_teams",{outing_id:outing.id,name:TEAM_NAMES[i%TEAM_NAMES.length],color:TEAM_COLORS[i%TEAM_COLORS.length],sort_order:i}));}while(teams.length>want){const gone=teams.pop();const{error}=await db().from("golf_teams").delete().eq("id",gone.id);if(error)throw error;}const locked=parts.filter(p=>p.locked&&p.team_id!=null),pool=parts.filter(p=>!(p.locked&&p.team_id!=null)),load=new Map(teams.map(t=>[String(t.id),0]));locked.forEach(p=>{const k=String(p.team_id);if(load.has(k))load.set(k,load.get(k)+1);});if(mode==="balanced")pool.sort((a,b)=>rate(b.member_id)-rate(a.member_id));else for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}for(const p of pool){let best=teams[0],bestLoad=Infinity;for(const t of teams){const l=load.get(String(t.id));if(l<bestLoad){bestLoad=l;best=t;}}load.set(String(best.id),bestLoad+1);/* Clear the pick as well as setting the team. A generated assignment is not
   a pick, and leaving an old pick_number behind would have the draft board
   reporting picks that nobody ever made. */
await updateRow("golf_participants",p.id,{team_id:best.id,pick_number:null,picked_at:null}).catch(()=>updateRow("golf_participants",p.id,{team_id:best.id}));}}

/* =====================================================================
   GUEST ACCESS
   ---------------------------------------------------------------------
   Half the field is not in the league. Those people are already on the
   event as golf_participants rows with a guest_name and no member_id -
   they simply had no way to prove it, so every score policy said no and a
   member had to keep their card.

   A guest types the event code once, picks their own name off the roster,
   and can then score their own team. The pass is kept on the phone so
   nobody types it again on the 14th tee, and it is worth nothing on its
   own: every write carries it to Postgres, which re-checks it against a
   hash the API cannot read.

   The whole thing is one strip at the top of the event, and it is not
   drawn at all for a signed-in league member - they already have a
   member id and this would be a second sign-in for nothing.
   ===================================================================== */

function guestStrip(outing) {
  const pass = passFor(outing.id);
  if (pass) {
    return `<div class="card guest-strip is-on">
      <div>
        <span class="card-title">Scoring as</span>
        <strong class="guest-who">${esc(pass.name)}</strong>
        ${pass.teamName ? `<span class="muted tiny">${esc(pass.teamName)}</span>` : ""}
      </div>
      <button type="button" class="btn ghost small" data-guest-out>Sign out</button>
    </div>`;
  }
  return `<div class="card guest-strip" data-guest-prompt>
    <div>
      <span class="card-title">Playing today?</span>
      <p class="muted tiny">Not in the league? Enter the event code to score your own team.</p>
    </div>
    <button type="button" class="btn small" data-guest-in>Enter code</button>
  </div>`;
}

/*
  Sign-in, in two steps and one card: the code, then which of these people
  you are. The roster comes back from the same RPC that checks the code, so
  a correct code costs one round trip rather than two.
*/
function wireGuest(view, outing, refresh) {
  const strip = view.querySelector(".guest-strip");
  if (!strip) return;

  strip.querySelector("[data-guest-out]")?.addEventListener("click", () => {
    clearGolfPass();
    toast("Signed out of this event");
    refresh();
  });

  strip.querySelector("[data-guest-in]")?.addEventListener("click", () => {
    strip.innerHTML = `
      <form class="guest-form" data-guest-form>
        <label for="guest-code">Event code</label>
        <div class="guest-row">
          <input id="guest-code" name="code" type="text" autocomplete="off"
                 autocapitalize="characters" spellcheck="false" placeholder="e.g. ROLLA26" required>
          <button class="btn small" type="submit">Continue</button>
        </div>
        <p class="muted tiny" data-guest-msg>The commissioner has the code.</p>
      </form>`;
    const form = strip.querySelector("[data-guest-form]");
    const msg = strip.querySelector("[data-guest-msg]");
    strip.querySelector("#guest-code")?.focus();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = form.code.value.trim();
      if (!code) return;
      const btn = form.querySelector("button");
      btn.disabled = true; btn.textContent = "Checking…";
      let roster = [];
      try {
        roster = await verifyCode(db(), outing.id, code);
      } catch (err) {
        /* The RPC is missing until golf_guest_schema.sql has been run. Say
           that plainly rather than showing a Postgres error to somebody
           standing on a tee box. */
        msg.textContent = "Guest access is not set up for this event yet.";
        msg.className = "warntext tiny";
        btn.disabled = false; btn.textContent = "Continue";
        console.warn(err);
        return;
      }
      if (!roster.length) {
        msg.textContent = "That code is not right for this event.";
        msg.className = "warntext tiny";
        btn.disabled = false; btn.textContent = "Continue";
        return;
      }

      /* Which one are you. Everybody on the event is listed, members
         included - a member who has not picked themselves on this device is
         still a person standing on the tee, and the policy will give them
         the same team-scoped access as anybody else. */
      strip.innerHTML = `
        <div class="guest-pick">
          <span class="card-title">Which one are you?</span>
          <div class="guest-list">
            ${roster.map((r) => `
              <button type="button" class="memberbtn" data-pick="${esc(r.participant_id)}"
                      data-name="${esc(r.display_name)}" data-team="${esc(r.team_id ?? "")}"
                      data-team-name="${esc(r.team_name || "")}">
                <span class="memberbtn-text">
                  <strong>${esc(r.display_name)}</strong>
                  ${r.team_name ? `<span class="muted tiny">${esc(r.team_name)}</span>` : ""}
                </span>
              </button>`).join("")}
          </div>
        </div>`;

      strip.querySelector(".guest-list").addEventListener("click", (ev) => {
        const btn2 = ev.target.closest("button[data-pick]");
        if (!btn2) return;
        saveGolfPass({
          outing: String(outing.id),
          participant: btn2.dataset.pick,
          code,
          name: btn2.dataset.name,
          teamId: btn2.dataset.team || null,
          teamName: btn2.dataset.teamName || "",
        });
        toast(`Scoring as ${btn2.dataset.name}`);
        refresh();
      });
    });
  });
}

/* =====================================================================
   GUEST ACCESS, from the commissioner's side
   ---------------------------------------------------------------------
   The code has to be settable from the app. Without this the only way to
   let a guest score was to run SQL, which is not a thing anybody is doing
   on a golf course - and a feature that needs a laptop to switch on is a
   feature nobody uses.

   The code itself is NEVER read back. It cannot be: the hash lives in a
   table with no policies and the app has no way to reach it. So this shows
   whether a code exists and lets an admin set or clear one, and that is
   deliberately all it can do. If the commissioner forgets it, they set a
   new one - which is the right trade for a code that unlocks nothing but
   one afternoon's scorecards.
   ===================================================================== */
function guestCodeCard(outing) {
  return `<section class="card golf-guest-admin" data-collapse="golf-guestcode">
    <div class="card-title-row">
      <div>
        <div class="card-title">Guest access</div>
        <p class="muted tiny">A code for people who are not in the league. They pick their
          own name and can score their own team — nothing else.</p>
      </div>
      <span class="admin-badge">Admin only</span>
    </div>
    <div class="guest-code-state muted tiny" data-code-state>Checking…</div>
    <form class="guest-code-form" data-code-form>
      <label for="gc-code">Event code</label>
      <div class="guest-row">
        <input id="gc-code" name="code" type="text" autocomplete="off" autocapitalize="characters"
               spellcheck="false" placeholder="e.g. ROLLA26" minlength="4">
        <button class="btn small" type="submit">Set code</button>
      </div>
      <p class="muted tiny">Four characters or more. Setting a new one replaces the old
        immediately; clearing it locks every guest out.</p>
      <div class="row-end"><button type="button" class="btn ghost small danger" data-code-clear>Clear code</button></div>
    </form>
  </section>`;
}

function wireGuestCode(view, outing) {
  const card = view.querySelector(".golf-guest-admin");
  if (!card) return;
  const state = card.querySelector("[data-code-state]");
  const form = card.querySelector("[data-code-form]");

  const paint = async () => {
    const has = await eventHasCode(db(), outing.id);
    state.textContent = has
      ? "A code is set for this event. Guests can sign in now."
      : "No code set — guests cannot score this event yet.";
    state.className = has ? "guest-code-state tiny" : "guest-code-state muted tiny";
  };
  paint();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = form.code.value.trim();
    if (code.length < 4) { toast("Four characters or more", true); return; }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const { error } = await db().rpc("golf_set_event_code", { p_outing_id: Number(outing.id), p_code: code });
      if (error) throw error;
      form.code.value = "";
      toast(`Code set — tell the field: ${code}`);
      paint();
    } catch (err) {
      toast(err.message || "Could not set the code", true);
    }
    btn.disabled = false;
  });

  card.querySelector("[data-code-clear]").addEventListener("click", async () => {
    if (!confirm("Clear the code? Every guest loses access to this event straight away.")) return;
    try {
      const { error } = await db().rpc("golf_set_event_code", { p_outing_id: Number(outing.id), p_code: "" });
      if (error) throw error;
      toast("Code cleared");
      paint();
    } catch (err) {
      toast(err.message || "Could not clear the code", true);
    }
  });
}
