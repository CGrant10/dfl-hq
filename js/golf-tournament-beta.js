import { db } from "./supabase.js";
import { loadMembers } from "./members.js";
import { esc, toast } from "./ui.js";
import { canEdit } from "./inline.js";

const activeHole = new Map();
const saveTimers = new Map();
const route = () => {
  const [path, raw = ""] = location.hash.split("?");
  const query = new URLSearchParams(raw);
  return { golf: path === "#/golf", id: Number(query.get("id")) || 0, classic: query.get("classic") === "1", setup: query.get("setup") === "1" };
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
  style.textContent += `.tb-setup{display:flex;flex:1 1 auto;min-height:0;flex-direction:column;padding:12px;gap:10px}.tb-setup-card{padding:12px;border:1px solid #ffffff1e;border-radius:15px;background:#24211d}.tb-setup-title{display:flex;align-items:center;justify-content:space-between;gap:8px}.tb-setup-title h2{margin:0;font-size:17px}.tb-setup-title span{color:#f4c430;font-size:10px;font-weight:900}.tb-add-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:9px}.tb-add-row input,.tb-add-row select,.tb-team-count{min-height:40px;border:1px solid #ffffff28;border-radius:10px;background:#171717;color:#fff;padding:0 10px}.tb-add-row button,.tb-setup-actions button{min-height:40px}.tb-player-chips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:9px}.tb-player-chip{display:flex;align-items:center;justify-content:space-between;min-width:0;padding:7px 8px;border-radius:9px;background:#171717}.tb-player-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.tb-player-chip button{border:0;background:transparent;color:#e8a39e;font-size:16px}.tb-mode-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px}.tb-mode-tabs button{min-height:42px;border:1px solid #ffffff26;border-radius:11px;background:#2a2722;color:#fff;font-weight:900}.tb-mode-tabs button.is-active{border-color:#f4c430;background:#f4c430;color:#171717}.tb-setup-panel{display:grid;gap:9px}.tb-setup-panel p{margin:0;color:#b9b2a6;font-size:10px;line-height:1.45}.tb-setup-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.tb-setup-actions .wide{grid-column:1/-1}.tb-advanced{text-align:center;color:#b9b2a6;font-size:10px}.tb-advanced a{color:#f4c430}.tb-setup-status{min-height:16px;color:#f4c430;font-size:10px;text-align:center}`;
  style.textContent += `.tb-setup-panel[hidden]{display:none!important}`;
  document.head.append(style);
}

const scoreMap = (scores, key = "team_id") => new Map(scores.filter(row => row[key] != null).map(row => [`${row[key]}:${row.hole}`, row]));
const parFor = (holes, hole) => Number(holes.find(row => Number(row.hole) === Number(hole))?.par) || 4;
const scoreTotal = (scores, teamId, count) => {
  let total = 0;
  for (let hole = 1; hole <= count; hole += 1) total += Number(scores.get(`${teamId}:${hole}`)?.strokes) || 0;
  return total;
};

async function persistScore(state, cardId, hole, strokes, putts) {
  const key = `${cardId}:${hole}`;
  clearTimeout(saveTimers.get(key));
  saveTimers.set(key, setTimeout(async () => {
    saveTimers.delete(key);
    const existing = state.scores.get(key);
    if (!strokes) {
      if (existing?.id) {
        const cleared = await db().from(state.individual ? "golf_match_scores" : "golf_scores").delete().eq("id", existing.id);
        if (cleared.error) toast(cleared.error.message || "Score did not clear", true);
        else state.scores.delete(key);
      }
      return;
    }
    let result;
    const table = state.individual ? "golf_match_scores" : "golf_scores";
    const payload = state.individual ? { strokes, putts, updated_at: new Date().toISOString() } : { strokes, putts, member_id: null, updated_at: new Date().toISOString() };
    if (existing?.id) result = await db().from(table).update(payload).eq("id", existing.id).select().maybeSingle();
    else result = await db().from(table).insert(state.individual ? { side_id: cardId, hole, ...payload } : { outing_id: state.outing.id, team_id: cardId, hole, ...payload }).select().maybeSingle();
    if (result.error && String(result.error.code) === "23505") result = state.individual
      ? await db().from(table).update(payload).eq("side_id", cardId).eq("hole", hole).select().maybeSingle()
      : await db().from(table).update(payload).eq("outing_id", state.outing.id).eq("team_id", cardId).eq("hole", hole).select().maybeSingle();
    if (result.error) toast(result.error.message || "Score did not save", true);
    else if (result.data) state.scores.set(key, result.data);
  }, 350));
}

function cardsFor(state) {
  if (state.individual) return state.sides.map(side => {
    const seat = state.matchPlayers.find(row => String(row.side_id) === String(side.id));
    const person = state.participants.find(row => String(row.id) === String(seat?.participant_id));
    const primary = person?.member_id ? state.names.get(String(person.member_id)) : person?.guest_name;
    return { id: side.id, primary: primary || "Golfer", secondary: "Singles" };
  });
  return state.teams.map(team => ({ id: team.id, ...teamLabel(team, state.participants, state.names) }));
}

function setupMarkup(state) {
  const organizer = canEdit("golf_participants");
  const have = new Set(state.participants.filter(p => p.member_id != null).map(p => String(p.member_id)));
  const available = state.members.filter(member => !have.has(String(member.id)));
  const playerName = person => person.member_id ? state.names.get(String(person.member_id)) : person.guest_name;
  const chips = state.participants.map(person => `<div class="tb-player-chip"><span>${esc(playerName(person) || "Golfer")}</span>${organizer ? `<button type="button" data-tb-remove="${person.id}" aria-label="Remove golfer">×</button>` : ""}</div>`).join("");
  return `<main class="tb-shell" data-tbeta-root><header class="tb-head"><a class="tb-circle" href="#/golf?id=${state.outing.id}" aria-label="Back to tournament scoring">‹</a><div class="tb-hole"><strong>SETUP</strong><small>TOURNAMENT BETA</small></div><span></span></header><div class="tb-sub"><div><small>Fast tournament setup</small><strong>${esc(state.outing.course || state.outing.name)}</strong></div><span class="tb-link">${state.participants.length} GOLFERS</span></div><section class="tb-setup"><div class="tb-setup-card"><div class="tb-setup-title"><h2>Golfers</h2><span>ADD SINGLES—NO TEAMS NEEDED</span></div>${canEdit("golf_participants") ? `<div class="tb-add-row"><select data-tb-member><option value="">Choose a DFL golfer…</option>${available.map(member => `<option value="${member.id}">${esc(nameOf(member))}</option>`).join("")}</select><button class="btn" type="button" data-tb-add-member>Add</button></div><div class="tb-add-row"><input type="text" maxlength="80" data-tb-guest placeholder="Guest golfer name"><button class="btn" type="button" data-tb-add-guest>Add guest</button></div>` : `<p class="muted tiny">Organizer access is required to change the field.</p>`}<div class="tb-player-chips">${chips || `<span class="muted tiny">Add at least two golfers.</span>`}</div></div><div class="tb-mode-tabs"><button class="is-active" type="button" data-tb-mode="singles">Singles / 1v1v1</button><button type="button" data-tb-mode="teams">Teams</button></div><div class="tb-setup-card tb-setup-panel" data-tb-panel="singles"><div class="tb-setup-title"><h2>One field, individual cards</h2><span>${state.participants.length} PLAYERS</span></div><p>Every golfer plays every other golfer. Two players makes 1v1; three makes 1v1v1; larger fields work the same way.</p><div class="tb-setup-actions"><button class="btn primary wide" type="button" data-tb-build-singles ${state.participants.length < 2 ? "disabled" : ""}>Start ${state.participants.length}-golfer singles match</button></div></div><div class="tb-setup-card tb-setup-panel" data-tb-panel="teams" hidden><div class="tb-setup-title"><h2>Deal quick teams</h2><select class="tb-team-count" data-tb-team-count aria-label="Team count">${[2,3,4,5,6].map(n => `<option value="${n}" ${n === Math.max(2, state.teams.length) ? "selected" : ""}>${n} teams</option>`).join("")}</select></div><p>Random shuffles the field. Even keeps team sizes as close as possible. Two-team setups also build the match round automatically.</p><div class="tb-setup-actions"><button class="btn" type="button" data-tb-build-teams="random" ${state.participants.length < 2 ? "disabled" : ""}>Random teams</button><button class="btn primary" type="button" data-tb-build-teams="even" ${state.participants.length < 2 ? "disabled" : ""}>Even teams</button></div></div><div class="tb-setup-status" data-tb-status></div><div class="tb-advanced">Need captains, draft order or custom rounds? <a href="#/golf?id=${state.outing.id}&classic=1">Open advanced setup</a></div></section></main>`;
}

function teamLabel(team, participants, names) {
  const people = participants.filter(person => String(person.team_id) === String(team.id)).map(person => person.member_id ? names.get(String(person.member_id)) : person.guest_name).filter(Boolean);
  return { primary: people.length === 1 ? people[0] : team.name || `Team ${team.sort_order + 1}`, secondary: people.length > 1 ? people.join(" · ") : team.name || "Individual card" };
}

function markup(state) {
  const { outing, holes, scores } = state;
  const cards = cardsFor(state);
  if (!cards.length) return `<section class="card" data-tbeta-root><div class="card-title-row"><div><div class="card-title">Tournament Beta</div><p class="muted tiny">Add golfers, then start singles or deal teams in the fast setup.</p></div><span class="pill">Beta</span></div><div class="card-body"><a class="btn primary" href="#/golf?id=${outing.id}&setup=1">Fast setup</a></div></section>`;
  const count = Number(outing.holes) || 18;
  const hole = Math.max(1, Math.min(count, Number(activeHole.get(outing.id)) || 1));
  activeHole.set(outing.id, hole);
  const rows = cards.map(card => {
    const row = scores.get(`${card.id}:${hole}`) || {};
    const total = scoreTotal(scores, card.id, count);
    return `<article class="tb-row"><span class="tb-avatar">${esc(initials(card.primary))}</span><div class="tb-copy"><strong>${esc(card.primary)}</strong><small>${esc(card.secondary)} · ${total || "No scores"}</small></div><button type="button" class="tb-score" data-tb-open="${card.id}">Hole ${hole}<b>${Number(row.strokes) || "+"}</b></button></article>`;
  }).join("");
  const table = `<table class="tb-table"><thead><tr><th class="sticky">Golfer / team</th>${Array.from({ length: count }, (_, i) => i + 1).map(h => `<th class="${h === hole ? "current" : ""}">${h}<br><small>Par ${parFor(holes, h)}</small></th>`).join("")}<th>Total</th></tr></thead><tbody>${cards.map(card => `<tr><th class="sticky">${esc(card.primary)}</th>${Array.from({ length: count }, (_, i) => i + 1).map(h => `<td class="${h === hole ? "current" : ""}">${Number(scores.get(`${card.id}:${h}`)?.strokes) || "—"}</td>`).join("")}<td>${scoreTotal(scores, card.id, count) || "—"}</td></tr>`).join("")}</tbody></table>`;
  return `<main class="tb-shell" data-tbeta-root><header class="tb-head"><a class="tb-circle" href="#/golf" aria-label="Back to Golf home">‹</a><div class="tb-hole"><strong>${ordinal(hole)}</strong><small>Par ${parFor(holes, hole)}</small></div><button class="tb-circle" type="button" data-tb-next="1" aria-label="Next hole">›</button></header><div class="tb-sub"><div><small>Tournament Beta</small><strong>${esc(outing.course || outing.name)}</strong></div><a class="tb-link" href="#/golf?id=${outing.id}&setup=1">SETUP</a></div><section class="tb-play"><div class="tb-progress">Hole ${hole} of ${count} · ${cards.length} scorecard${cards.length === 1 ? "" : "s"}</div><div class="tb-roster">${rows}</div><div class="tb-actions"><button class="btn" type="button" data-tb-card>Scorecard</button><button class="btn primary" type="button" data-tb-finish ${outing.status === "final" ? "disabled" : ""}>${outing.status === "final" ? "Finished" : "Finish tournament"}</button></div></section><section class="tb-card" hidden><header class="tb-card-head"><button class="tb-circle" type="button" data-tb-card>‹</button><h2>SCORECARD</h2></header><div class="tb-hint">Drag left or right to scan every hole</div><div class="tb-table-wrap">${table}</div></section><section class="tb-sheet" data-tb-sheet hidden><div class="tb-sheet-head"><span class="tb-avatar" data-tb-avatar>G</span><div><strong data-tb-name>Golfer</strong><small>Hole ${hole} · Par ${parFor(holes, hole)}</small></div><button class="tb-done" type="button" data-tb-done>Done</button></div><div class="tb-controls"><div><span class="tb-label">Shots</span><div class="tb-step"><button type="button" data-tb-step="strokes:-1">−</button><output data-tb-strokes>—</output><button type="button" data-tb-step="strokes:1">+</button></div></div><div><span class="tb-label">Putts</span><div class="tb-step"><button type="button" data-tb-step="putts:-1">−</button><output data-tb-putts>—</output><button type="button" data-tb-step="putts:1">+</button></div></div></div></section></main>`;
}

function wire(root, state) {
  const count = Number(state.outing.holes) || 18;
  root.querySelector("[data-tb-next]")?.addEventListener("click", () => { activeHole.set(state.outing.id, (Number(activeHole.get(state.outing.id)) % count) + 1); paint(); });
  root.querySelectorAll("[data-tb-card]").forEach(button => button.addEventListener("click", () => { const play = root.querySelector(".tb-play"), card = root.querySelector(".tb-card"); play.hidden = !play.hidden; card.hidden = !card.hidden; }));
  const sheet = root.querySelector("[data-tb-sheet]");
  root.querySelectorAll("[data-tb-open]").forEach(button => button.addEventListener("click", () => {
    const cardId = Number(button.dataset.tbOpen), label = cardsFor(state).find(item => Number(item.id) === cardId), hole = Number(activeHole.get(state.outing.id)) || 1, row = state.scores.get(`${cardId}:${hole}`) || {};
    sheet.dataset.teamId = String(cardId); sheet.dataset.strokes = String(Number(row.strokes) || 0); sheet.dataset.putts = String(Number(row.putts) || 0); sheet.querySelector("[data-tb-avatar]").textContent = initials(label.primary); sheet.querySelector("[data-tb-name]").textContent = label.primary; sheet.querySelector("[data-tb-strokes]").textContent = Number(row.strokes) || "—"; sheet.querySelector("[data-tb-putts]").textContent = Number(row.putts) || "—"; sheet.hidden = false;
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

async function setupTeams(state, count, shuffle) {
  if (state.teams.length && !confirm("Replace the current teams? Existing team scorecards and matches will be reset.")) return false;
  const clear = await db().from("golf_participants").update({ team_id: null, pick_number: null, picked_at: null }).eq("outing_id", state.outing.id);
  if (clear.error) throw clear.error;
  const gone = await db().from("golf_teams").delete().eq("outing_id", state.outing.id);
  if (gone.error) throw gone.error;
  const rows = Array.from({ length: count }, (_, index) => ({ outing_id: state.outing.id, name: `Team ${index + 1}`, color: ["#c73a33", "#f4c430", "#426a7d", "#a4c43b", "#70518a", "#e5a64a"][index], sort_order: index, draft_order: index }));
  const made = await db().from("golf_teams").insert(rows).select("*").order("sort_order");
  if (made.error) throw made.error;
  const players = [...state.participants];
  if (shuffle) for (let i = players.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [players[i], players[j]] = [players[j], players[i]]; }
  const writes = await Promise.all(players.map((person, index) => db().from("golf_participants").update({ team_id: made.data[index % made.data.length].id }).eq("id", person.id)));
  const failed = writes.find(result => result.error);
  if (failed) throw failed.error;
  if (count === 2) {
    let round = state.rounds.find(item => item.format === "pairs");
    if (!round) { const added = await db().rpc("golf_add_round", { p_outing_id: state.outing.id, p_format: "pairs", p_scoring: "strokes" }); if (added.error) throw added.error; round = { id: added.data }; }
    const built = await db().rpc("golf_build_pairs", { p_round_id: Number(round.id) });
    if (built.error) throw built.error;
  }
  return true;
}

function wireSetup(root, state) {
  root.querySelectorAll("[data-tb-mode]").forEach(button => button.addEventListener("click", () => {
    root.querySelectorAll("[data-tb-mode]").forEach(item => item.classList.toggle("is-active", item === button));
    root.querySelectorAll("[data-tb-panel]").forEach(panel => { panel.hidden = panel.dataset.tbPanel !== button.dataset.tbMode; });
  }));
  const busy = async (button, task) => { button.disabled = true; const status = root.querySelector("[data-tb-status]"); status.textContent = "Working…"; try { await task(); } catch (error) { toast(error.message || "Setup did not save", true); status.textContent = ""; button.disabled = false; } };
  root.querySelector("[data-tb-add-member]")?.addEventListener("click", event => busy(event.currentTarget, async () => { const memberId = Number(root.querySelector("[data-tb-member]")?.value); if (!memberId) throw new Error("Choose a golfer first"); const result = await db().from("golf_participants").insert({ outing_id: state.outing.id, member_id: memberId, sort_order: state.participants.length }); if (result.error) throw result.error; await paint(); }));
  root.querySelector("[data-tb-add-guest]")?.addEventListener("click", event => busy(event.currentTarget, async () => { const input = root.querySelector("[data-tb-guest]"), guest = input?.value.trim(); if (!guest) throw new Error("Enter the guest's name"); const result = await db().from("golf_participants").insert({ outing_id: state.outing.id, guest_name: guest, sort_order: state.participants.length }); if (result.error) throw result.error; await paint(); }));
  root.querySelectorAll("[data-tb-remove]").forEach(button => button.addEventListener("click", () => busy(button, async () => { const result = await db().from("golf_participants").delete().eq("id", button.dataset.tbRemove); if (result.error) throw result.error; await paint(); })));
  root.querySelector("[data-tb-build-singles]")?.addEventListener("click", event => busy(event.currentTarget, async () => {
    let round = state.rounds.find(item => item.format === "singles");
    if (!round) { const added = await db().rpc("golf_add_round", { p_outing_id: state.outing.id, p_format: "singles", p_scoring: "strokes" }); if (added.error) throw added.error; round = { id: added.data }; }
    const synced = await db().rpc("golf_sync_individual_match", { p_round_id: Number(round.id) });
    if (synced.error) throw synced.error;
    toast(`${state.participants.length}-golfer singles match ready`); location.hash = `#/golf?id=${state.outing.id}`;
  }));
  root.querySelectorAll("[data-tb-build-teams]").forEach(button => button.addEventListener("click", event => busy(event.currentTarget, async () => { const count = Math.max(2, Math.min(6, Number(root.querySelector("[data-tb-team-count]")?.value) || 2)); const done = await setupTeams(state, count, button.dataset.tbBuildTeams === "random"); if (done) { toast(`${count} teams ready`); location.hash = `#/golf?id=${state.outing.id}`; } else { button.disabled = false; root.querySelector("[data-tb-status]").textContent = ""; } })));
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
  const [teamsResult, partsResult, scoresResult, holesResult, roundsResult, members] = await Promise.all([
    db().from("golf_teams").select("*").eq("outing_id", current.id).order("sort_order"),
    db().from("golf_participants").select("*").eq("outing_id", current.id).order("sort_order"),
    db().from("golf_scores").select("*").eq("outing_id", current.id),
    db().from("golf_holes").select("hole,par").eq("outing_id", current.id).order("hole"),
    db().from("golf_rounds").select("*").eq("outing_id", current.id).order("round_number"),
    loadMembers().catch(() => [])
  ]);
  const error = teamsResult.error || partsResult.error || scoresResult.error || holesResult.error || roundsResult.error;
  if (error) { root.innerHTML = `<section class="card" data-tbeta-root><div class="card-title">Tournament Beta</div><div class="card-body muted">${esc(error.message || error)}</div></section>`; return; }
  let holes = holesResult.data || [];
  if (!holes.length && outingResult.data.course_id) { const courseHoles = await db().from("golf_course_holes").select("hole,par").eq("course_id", outingResult.data.course_id).order("hole"); if (!courseHoles.error) holes = courseHoles.data || []; }
  const rounds = roundsResult.data || [], singles = rounds.find(round => round.format === "singles");
  let sides = [], matchPlayers = [], matchScores = [];
  if (singles) {
    const matches = await db().from("golf_matches").select("id").eq("round_id", singles.id).order("match_number");
    const ids = (matches.data || []).map(match => match.id);
    if (ids.length) {
      const sideResult = await db().from("golf_match_sides").select("*").in("match_id", ids).order("slot");
      sides = (sideResult.data || []).filter(side => side.team_id == null);
      if (sides.length) {
        const sideIds = sides.map(side => side.id);
        const [playersResult, matchScoresResult] = await Promise.all([db().from("golf_match_players").select("*").in("side_id", sideIds), db().from("golf_match_scores").select("*").in("side_id", sideIds)]);
        matchPlayers = playersResult.data || []; matchScores = matchScoresResult.data || [];
      }
    }
  }
  const individual = sides.length >= 2;
  const state = { outing: outingResult.data, teams: teamsResult.data || [], participants: partsResult.data || [], scores: individual ? scoreMap(matchScores, "side_id") : scoreMap(scoresResult.data || []), holes, rounds, sides, matchPlayers, individual, members: members || [], names: new Map((members || []).map(member => [String(member.id), nameOf(member)])) };
  root.innerHTML = current.setup ? setupMarkup(state) : markup(state);
  document.body.classList.toggle("tb-focus", current.setup || cardsFor(state).length > 0);
  if (current.setup) wireSetup(root, state); else wire(root, state);
}

let queued = false;
function schedule() { if (queued) return; queued = true; queueMicrotask(async () => { try { await paint(); } finally { queued = false; } }); }
new MutationObserver(() => { injectPlayType(); const current = route(), root = document.querySelector("#golf-outing"); if (current.golf && current.id && root && (current.classic ? !root.querySelector(".tb-classic-banner") : !root.querySelector("[data-tbeta-root]"))) schedule(); }).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("hashchange", schedule);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule); else schedule();
