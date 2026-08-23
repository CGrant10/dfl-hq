import { db } from "./supabase.js";
import { loadMembers } from "./members.js";
import { esc, toast } from "./ui.js";

const activeHole = new Map();
const saveTimers = new Map();
const route = () => {
  const [path, raw = ""] = location.hash.split("?");
  const query = new URLSearchParams(raw);
  return { golf: path === "#/golf", id: Number(query.get("id")) || 0, classic: query.get("classic") === "1" };
};
const nameOf = member => member?.golf_name || member?.display_name || "Golfer";
const initials = name => String(name || "G").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
const ordinal = hole => `${hole}${hole % 100 >= 11 && hole % 100 <= 13 ? "TH" : hole % 10 === 1 ? "ST" : hole % 10 === 2 ? "ND" : hole % 10 === 3 ? "RD" : "TH"}`;

function injectPlayType() {
  const select = document.querySelector("#i_event_type");
  if (!select || select.querySelector('option[value="tournament_beta"]')) return;
  const option = document.createElement("option");
  option.value = "tournament_beta";
  option.textContent = "Tournament Beta";
  select.append(option);
  select.closest("form")?.querySelector(".muted.tiny")?.append(" Tournament Beta keeps the tournament setup and uses the new live scorer.");
}

function ensureStyles() {
  if (document.getElementById("golf-tournament-beta-style")) return;
  const style = document.createElement("style");
  style.id = "golf-tournament-beta-style";
  style.textContent = `
body.tb-focus{height:100dvh;overflow:hidden;overscroll-behavior:none;background:#171717}body.tb-focus .golf-event-head,body.tb-focus .guest-strip{display:none!important}body.tb-focus #view,body.tb-focus #golf-outing{height:100%;overflow:hidden}body.tb-focus #view{max-width:none!important;padding:0!important}
.tb-shell{display:flex;flex-direction:column;width:min(100%,720px);height:100%;margin:auto;overflow:hidden;background:linear-gradient(180deg,#24211d,#171717 65%);color:#f8f5ec}.tb-head{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;gap:8px;min-height:88px;padding:8px 12px;background:#171717f5;border-bottom:1px solid #f4c43055}.tb-circle{display:grid;place-items:center;width:42px;height:42px;border:1px solid #ffffff2d;border-radius:50%;background:#2a2722;color:#fff;font:900 22px/1 inherit;text-decoration:none}.tb-hole{text-align:center}.tb-hole strong{display:block;font-size:25px}.tb-hole small{display:block;margin-top:6px;color:#b9b2a6;font-size:10px}.tb-sub{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 13px;background:#211f1b;border-bottom:1px solid #ffffff18}.tb-sub small{display:block;color:#f4c430;font-size:9px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.tb-sub strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.tb-link{color:#f4c430;font-size:10px;font-weight:900;text-decoration:none}.tb-progress{padding:7px 13px;color:#a7a096;font-size:9px;letter-spacing:.1em;text-transform:uppercase}.tb-roster{display:grid;flex:1 1 auto;min-height:0;grid-auto-rows:auto;align-content:start;overflow:hidden}.tb-row{display:grid;grid-template-columns:48px minmax(0,1fr) 78px;align-items:center;gap:10px;min-height:68px;padding:7px 13px;border-top:1px solid #ffffff17}.tb-avatar{display:grid;place-items:center;width:46px;height:46px;border:2px solid #f3efe2;border-radius:50%;background:linear-gradient(145deg,#c73a33,#7d211d);font-weight:950}.tb-row:nth-child(2n) .tb-avatar{background:linear-gradient(145deg,#f4c430,#9b7412);color:#171717}.tb-copy{min-width:0}.tb-copy strong,.tb-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tb-copy small{margin-top:3px;color:#aaa196;font-size:10px}.tb-score{min-height:48px;border:1px solid #ffffff29;border-radius:12px;background:#28251f;color:#fff;font:900 10px/1.15 inherit}.tb-score b{display:block;color:#f4c430;font-size:19px}.tb-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 13px}.tb-actions button{min-height:42px}.tb-card{display:flex;flex:1 1 auto;min-height:0;flex-direction:column;background:#f5f5f4;color:#263b49}.tb-card[hidden],.tb-play[hidden],.tb-sheet[hidden]{display:none!important}.tb-card-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff}.tb-card-head h2{margin:0;font-size:19px}.tb-hint{padding:6px 12px;background:#eaf1f5;color:#55707f;font-size:9px;text-align:center}.tb-table-wrap{overflow-x:auto;overflow-y:hidden;touch-action:pan-x;overscroll-behavior:contain}.tb-table{width:max-content;min-width:100%;border-collapse:collapse;background:#fff}.tb-table th,.tb-table td{min-width:58px;height:48px;padding:6px;border:1px solid #ccd2d6;text-align:center}.tb-table .sticky{position:sticky;left:0;z-index:2;min-width:112px;max-width:112px;background:#fff;text-align:left}.tb-table thead th{background:#f1f2f3}.tb-table .current{background:#fff4c5}.tb-sheet{position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom));z-index:75;width:min(calc(100% - 16px),704px);padding:9px 14px 14px;transform:translateX(-50%);border-radius:20px 20px 0 0;background:#f9fbfc;color:#27485a;box-shadow:0 0 0 100vmax #0008,0 -10px 32px #0008}.tb-sheet-head{display:grid;grid-template-columns:40px minmax(0,1fr) 64px;align-items:center;gap:9px;padding-bottom:9px;border-bottom:1px solid #d9e4ea}.tb-sheet-head .tb-avatar{width:38px;height:38px;font-size:12px}.tb-done{min-height:40px;border:0;border-radius:9px;background:#477fbd;color:#fff;font-weight:900}.tb-controls{display:grid;grid-template-columns:repeat(2,minmax(120px,164px));justify-content:center;gap:10px;padding-top:10px}.tb-label{display:block;margin-bottom:5px;text-align:center;font-size:10px;font-weight:900}.tb-step{display:grid;grid-template-columns:32px minmax(40px,1fr) 32px;align-items:center;min-height:40px;border-radius:14px;background:#d8e8f3}.tb-step button{display:grid;place-items:center;width:29px;height:29px;margin:auto;border:0;border-radius:50%;background:#fff;color:#31566a;font:900 20px/1 inherit}.tb-step output{text-align:center;font:900 22px/1 inherit}.tb-classic-banner{margin:10px 0;padding:10px 12px;border:1px solid #f4c43066;border-radius:10px;background:#f4c43012}.tb-classic-banner a{color:#f4c430;font-weight:900}
`;
  document.head.append(style);
}

const scoreMap = scores => new Map(scores.filter(row => row.team_id != null).map(row => [`${row.team_id}:${row.hole}`, row]));
const parFor = (holes, hole) => Number(holes.find(row => Number(row.hole) === Number(hole))?.par) || 4;
const scoreTotal = (scores, teamId, count) => {
  let total = 0;
  for (let hole = 1; hole <= count; hole += 1) total += Number(scores.get(`${teamId}:${hole}`)?.strokes) || 0;
  return total;
};

async function persistScore(state, teamId, hole, strokes, putts) {
  const key = `${teamId}:${hole}`;
  clearTimeout(saveTimers.get(key));
  saveTimers.set(key, setTimeout(async () => {
    saveTimers.delete(key);
    const existing = state.scores.get(key);
    if (!strokes) {
      if (existing?.id) {
        const cleared = await db().from("golf_scores").delete().eq("id", existing.id);
        if (cleared.error) toast(cleared.error.message || "Score did not clear", true);
        else state.scores.delete(key);
      }
      return;
    }
    let result;
    const payload = { strokes, putts, member_id: null, updated_at: new Date().toISOString() };
    if (existing?.id) result = await db().from("golf_scores").update(payload).eq("id", existing.id).select().maybeSingle();
    else result = await db().from("golf_scores").insert({ outing_id: state.outing.id, team_id: teamId, hole, ...payload }).select().maybeSingle();
    if (result.error && String(result.error.code) === "23505") result = await db().from("golf_scores").update(payload).eq("outing_id", state.outing.id).eq("team_id", teamId).eq("hole", hole).select().maybeSingle();
    if (result.error) toast(result.error.message || "Score did not save", true);
    else if (result.data) state.scores.set(key, result.data);
  }, 350));
}

function teamLabel(team, participants, names) {
  const people = participants.filter(person => String(person.team_id) === String(team.id)).map(person => person.member_id ? names.get(String(person.member_id)) : person.guest_name).filter(Boolean);
  return { primary: people.length === 1 ? people[0] : team.name || `Team ${team.sort_order + 1}`, secondary: people.length > 1 ? people.join(" · ") : team.name || "Individual card" };
}

function markup(state) {
  const { outing, teams, participants, holes, scores, names } = state;
  if (!teams.length) return `<section class="card" data-tbeta-root><div class="card-title-row"><div><div class="card-title">Tournament Beta</div><p class="muted tiny">Set up golfers, teams, rounds and matches first, then return to the beta scorer.</p></div><span class="pill">Beta</span></div><div class="card-body"><a class="btn primary" href="#/golf?id=${outing.id}&classic=1">Open tournament setup</a></div></section>`;
  const count = Number(outing.holes) || 18;
  const hole = Math.max(1, Math.min(count, Number(activeHole.get(outing.id)) || 1));
  activeHole.set(outing.id, hole);
  const rows = teams.map(team => {
    const label = teamLabel(team, participants, names);
    const row = scores.get(`${team.id}:${hole}`) || {};
    const total = scoreTotal(scores, team.id, count);
    return `<article class="tb-row" data-tb-team="${team.id}"><span class="tb-avatar">${esc(initials(label.primary))}</span><div class="tb-copy"><strong>${esc(label.primary)}</strong><small>${esc(label.secondary)} · ${total || "No scores"}</small></div><button type="button" class="tb-score" data-tb-open="${team.id}">Hole ${hole}<b>${Number(row.strokes) || "+"}</b></button></article>`;
  }).join("");
  const table = `<table class="tb-table"><thead><tr><th class="sticky">Golfer / team</th>${Array.from({ length: count }, (_, i) => i + 1).map(h => `<th class="${h === hole ? "current" : ""}">${h}<br><small>Par ${parFor(holes, h)}</small></th>`).join("")}<th>Total</th></tr></thead><tbody>${teams.map(team => { const label = teamLabel(team, participants, names); return `<tr><th class="sticky">${esc(label.primary)}</th>${Array.from({ length: count }, (_, i) => i + 1).map(h => `<td class="${h === hole ? "current" : ""}">${Number(scores.get(`${team.id}:${h}`)?.strokes) || "—"}</td>`).join("")}<td>${scoreTotal(scores, team.id, count) || "—"}</td></tr>`; }).join("")}</tbody></table>`;
  return `<main class="tb-shell" data-tbeta-root><header class="tb-head"><a class="tb-circle" href="#/golf" aria-label="Back to Golf home">‹</a><div class="tb-hole"><strong>${ordinal(hole)}</strong><small>Par ${parFor(holes, hole)}</small></div><button class="tb-circle" type="button" data-tb-next="1" aria-label="Next hole">›</button></header><div class="tb-sub"><div><small>Tournament Beta</small><strong>${esc(outing.course || outing.name)}</strong></div><a class="tb-link" href="#/golf?id=${outing.id}&classic=1">SETUP</a></div><section class="tb-play"><div class="tb-progress">Hole ${hole} of ${count} · ${teams.length} scorecard${teams.length === 1 ? "" : "s"}</div><div class="tb-roster">${rows}</div><div class="tb-actions"><button class="btn" type="button" data-tb-card>Scorecard</button><button class="btn primary" type="button" data-tb-finish ${outing.status === "final" ? "disabled" : ""}>${outing.status === "final" ? "Finished" : "Finish tournament"}</button></div></section><section class="tb-card" hidden><header class="tb-card-head"><button class="tb-circle" type="button" data-tb-card>‹</button><h2>SCORECARD</h2></header><div class="tb-hint">Drag left or right to scan every hole</div><div class="tb-table-wrap">${table}</div></section><section class="tb-sheet" data-tb-sheet hidden><div class="tb-sheet-head"><span class="tb-avatar" data-tb-avatar>G</span><div><strong data-tb-name>Golfer</strong><small>Hole ${hole} · Par ${parFor(holes, hole)}</small></div><button class="tb-done" type="button" data-tb-done>Done</button></div><div class="tb-controls"><div><span class="tb-label">Shots</span><div class="tb-step"><button type="button" data-tb-step="strokes:-1">−</button><output data-tb-strokes>—</output><button type="button" data-tb-step="strokes:1">+</button></div></div><div><span class="tb-label">Putts</span><div class="tb-step"><button type="button" data-tb-step="putts:-1">−</button><output data-tb-putts>—</output><button type="button" data-tb-step="putts:1">+</button></div></div></div></section></main>`;
}

function wire(root, state) {
  const count = Number(state.outing.holes) || 18;
  root.querySelector("[data-tb-next]")?.addEventListener("click", () => { activeHole.set(state.outing.id, (Number(activeHole.get(state.outing.id)) % count) + 1); paint(); });
  root.querySelectorAll("[data-tb-card]").forEach(button => button.addEventListener("click", () => { const play = root.querySelector(".tb-play"), card = root.querySelector(".tb-card"); play.hidden = !play.hidden; card.hidden = !card.hidden; }));
  const sheet = root.querySelector("[data-tb-sheet]");
  root.querySelectorAll("[data-tb-open]").forEach(button => button.addEventListener("click", () => {
    const teamId = Number(button.dataset.tbOpen), team = state.teams.find(item => Number(item.id) === teamId), label = teamLabel(team, state.participants, state.names), hole = Number(activeHole.get(state.outing.id)) || 1, row = state.scores.get(`${teamId}:${hole}`) || {};
    sheet.dataset.teamId = String(teamId); sheet.dataset.strokes = String(Number(row.strokes) || 0); sheet.dataset.putts = String(Number(row.putts) || 0); sheet.querySelector("[data-tb-avatar]").textContent = initials(label.primary); sheet.querySelector("[data-tb-name]").textContent = label.primary; sheet.querySelector("[data-tb-strokes]").textContent = Number(row.strokes) || "—"; sheet.querySelector("[data-tb-putts]").textContent = Number(row.putts) || "—"; sheet.hidden = false;
  }));
  root.querySelector("[data-tb-done]")?.addEventListener("click", () => { sheet.hidden = true; paint(); });
  root.querySelectorAll("[data-tb-step]").forEach(button => button.addEventListener("click", () => {
    const [field, rawStep] = button.dataset.tbStep.split(":"), teamId = Number(sheet.dataset.teamId), hole = Number(activeHole.get(state.outing.id)) || 1, max = field === "putts" ? 15 : 20, min = field === "strokes" && Number(sheet.dataset.putts) ? 1 : 0, value = Math.max(min, Math.min(max, Number(sheet.dataset[field]) + Number(rawStep)));
    sheet.dataset[field] = String(value); sheet.querySelector(`[data-tb-${field}]`).textContent = value || "—";
    if (field === "putts" && !Number(sheet.dataset.strokes)) { const par = parFor(state.holes, hole); sheet.dataset.strokes = String(par); sheet.querySelector("[data-tb-strokes]").textContent = String(par); }
    persistScore(state, teamId, hole, Number(sheet.dataset.strokes) || 0, Number(sheet.dataset.putts) || 0);
  }));
  root.querySelector("[data-tb-finish]")?.addEventListener("click", async event => { event.currentTarget.disabled = true; const result = await db().from("golf_outings").update({ status: "final", finalized_at: new Date().toISOString() }).eq("id", state.outing.id); if (result.error) { event.currentTarget.disabled = false; toast(result.error.message || "Could not finish tournament", true); } else { toast("Tournament finished"); paint(); } });
}

async function paint() {
  injectPlayType();
  const current = route();
  if (!current.golf || !current.id) { document.body.classList.remove("tb-focus"); return; }
  const outingResult = await db().from("golf_outings").select("*").eq("id", current.id).maybeSingle();
  if (outingResult.error || outingResult.data?.event_type !== "tournament_beta") { document.body.classList.remove("tb-focus"); return; }
  const root = document.querySelector("#golf-outing");
  if (!root) return;
  if (current.classic) {
    document.body.classList.remove("tb-focus");
    if (!root.querySelector(".tb-classic-banner")) root.insertAdjacentHTML("afterbegin", `<div class="tb-classic-banner"><strong>Tournament Beta setup</strong> · <a href="#/golf?id=${current.id}">Open beta scoring</a></div>`);
    return;
  }
  ensureStyles();
  const [teamsResult, partsResult, scoresResult, holesResult, members] = await Promise.all([
    db().from("golf_teams").select("*").eq("outing_id", current.id).order("sort_order"),
    db().from("golf_participants").select("*").eq("outing_id", current.id).order("sort_order"),
    db().from("golf_scores").select("*").eq("outing_id", current.id),
    db().from("golf_holes").select("hole,par").eq("outing_id", current.id).order("hole"),
    loadMembers().catch(() => [])
  ]);
  const error = teamsResult.error || partsResult.error || scoresResult.error || holesResult.error;
  if (error) { root.innerHTML = `<section class="card" data-tbeta-root><div class="card-title">Tournament Beta</div><div class="card-body muted">${esc(error.message || error)}</div></section>`; return; }
  let holes = holesResult.data || [];
  if (!holes.length && outingResult.data.course_id) { const courseHoles = await db().from("golf_course_holes").select("hole,par").eq("course_id", outingResult.data.course_id).order("hole"); if (!courseHoles.error) holes = courseHoles.data || []; }
  const state = { outing: outingResult.data, teams: teamsResult.data || [], participants: partsResult.data || [], scores: scoreMap(scoresResult.data || []), holes, names: new Map((members || []).map(member => [String(member.id), nameOf(member)])) };
  root.innerHTML = markup(state);
  document.body.classList.toggle("tb-focus", state.teams.length > 0);
  wire(root, state);
}

let queued = false;
function schedule() { if (queued) return; queued = true; queueMicrotask(async () => { try { await paint(); } finally { queued = false; } }); }
new MutationObserver(() => { injectPlayType(); const current = route(), root = document.querySelector("#golf-outing"); if (current.golf && current.id && root && (current.classic ? !root.querySelector(".tb-classic-banner") : !root.querySelector("[data-tbeta-root]"))) schedule(); }).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("hashchange", schedule);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule); else schedule();
