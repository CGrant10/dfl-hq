// =====================================================================
// DFL Golf - live team scorecards
// ---------------------------------------------------------------------
// Adds one editable 18-hole card for every generated team. Scores are
// stored in golf_scores (one row per outing/member/hole), and Front 9,
// Back 9 and Total are calculated from the inputs in real time.
// =====================================================================

import { db } from "./supabase.js";
import { loadMembers } from "./members.js";
import { esc, toast } from "./ui.js";
import { canEdit } from "./inline.js";

const mounted = new WeakSet();

function currentOutingId() {
  return new URLSearchParams(location.hash.split("?")[1] || "").get("id");
}

function holesFor(outing) {
  const count = Math.max(1, Math.min(18, Number(outing.holes) || 18));
  return Array.from({ length: count }, (_, i) => i + 1);
}

function scoreMap(scores) {
  const map = new Map();
  for (const s of scores || []) map.set(`${s.member_id}:${s.hole}`, Number(s.strokes) || 0);
  return map;
}

function teamCard(team, players, membersById, scores, holes) {
  const map = scoreMap(scores);
  const rows = players.map((p) => {
    const member = membersById.get(String(p.member_id));
    return `<div class="golf-sc-row" data-member="${p.member_id}">
      <div class="golf-sc-player">${esc(member?.display_name || "Unknown")}</div>
      ${holes.map((hole) => {
        const value = map.get(`${p.member_id}:${hole}`) || "";
        return `<input class="golf-sc-score" type="number" min="1" max="20" inputmode="numeric" data-member="${p.member_id}" data-hole="${hole}" value="${value}" aria-label="${esc(member?.display_name || "Player")} hole ${hole}">`;
      }).join("")}
      <output class="golf-sc-front">0</output><output class="golf-sc-back">0</output><output class="golf-sc-total">0</output>
    </div>`;
  }).join("");

  return `<section class="golf-score-team" data-team="${team.id}">
    <div class="golf-sc-title"><h3>${esc(team.name || "Team")}</h3><span>${players.length} player${players.length === 1 ? "" : "s"}</span></div>
    <div class="golf-sc-scroll"><div class="golf-sc-table">
      <div class="golf-sc-row golf-sc-head"><div class="golf-sc-player">Player</div>${holes.map((h) => `<div>${h}</div>`).join("")}<div>Front 9</div><div>Back 9</div><div>Total</div></div>
      ${rows || `<div class="golf-sc-empty">No players assigned.</div>`}
      <div class="golf-sc-team-total"><div class="golf-sc-player">Team total</div>${holes.map((h) => `<output data-team-hole="${h}">0</output>`).join("")}<output data-team-front>0</output><output data-team-back>0</output><output data-team-total>0</output></div>
    </div></div>
  </section>`;
}

function tally(card) {
  const rows = [...card.querySelectorAll(".golf-sc-row[data-member]")];
  for (const row of rows) {
    let front = 0, back = 0, total = 0;
    row.querySelectorAll(".golf-sc-score").forEach((input) => {
      const hole = Number(input.dataset.hole), value = Number(input.value) || 0;
      total += value;
      if (hole <= 9) front += value; else back += value;
    });
    row.querySelector(".golf-sc-front").value = front || "";
    row.querySelector(".golf-sc-back").value = back || "";
    row.querySelector(".golf-sc-total").value = total || "";
  }

  const team = new Map();
  for (const input of card.querySelectorAll(".golf-sc-score")) {
    const hole = Number(input.dataset.hole), value = Number(input.value) || 0;
    team.set(hole, (team.get(hole) || 0) + value);
  }
  let front = 0, back = 0, total = 0;
  for (const [hole, value] of team) {
    const out = card.querySelector(`[data-team-hole="${hole}"]`);
    if (out) out.value = value || "";
    total += value;
    if (hole <= 9) front += value; else back += value;
  }
  card.querySelector("[data-team-front]").value = front || "";
  card.querySelector("[data-team-back]").value = back || "";
  card.querySelector("[data-team-total]").value = total || "";
}

async function saveScore(input, outingId) {
  if (!canEdit()) return;
  const value = Number(input.value), memberId = Number(input.dataset.member), hole = Number(input.dataset.hole);
  if (!memberId || !hole) return;
  try {
    if (!input.value) {
      const { error } = await db().from("golf_scores").delete().eq("outing_id", outingId).eq("member_id", memberId).eq("hole", hole);
      if (error) throw error;
      return;
    }
    if (!Number.isInteger(value) || value < 1 || value > 20) { input.value = ""; return; }
    const { error } = await db().from("golf_scores").upsert({
      outing_id: outingId, member_id: memberId, hole, strokes: value, updated_at: new Date().toISOString()
    }, { onConflict: "outing_id,member_id,hole" });
    if (error) throw error;
  } catch (err) { toast(err.message || "Could not save score", true); }
}

async function mount(root, outingId) {
  if (!root || mounted.has(root)) return;
  mounted.add(root);

  const [outingRes, teamsRes, partsRes, scoresRes, members] = await Promise.all([
    db().from("golf_outings").select("id,holes").eq("id", outingId).maybeSingle(),
    db().from("golf_teams").select("*").eq("outing_id", outingId).order("sort_order"),
    db().from("golf_participants").select("*").eq("outing_id", outingId).order("sort_order"),
    db().from("golf_scores").select("outing_id,member_id,hole,strokes").eq("outing_id", outingId),
    loadMembers(),
  ]);

  const firstError = outingRes.error || teamsRes.error || partsRes.error || scoresRes.error;
  if (firstError) {
    const card = document.createElement("div");
    card.className = "card golf-score-error";
    card.innerHTML = `<strong>Golf scorecard could not load.</strong><div class="muted tiny">${esc(firstError.message || "Database request failed")}</div>`;
    root.prepend(card);
    return;
  }

  const outing = outingRes.data;
  if (!outing) return;
  const teams = teamsRes.data || [], parts = partsRes.data || [], scores = scoresRes.data || [];
  const byMember = new Map((members || []).map((m) => [String(m.id), m]));
  const holes = holesFor(outing);

  const old = root.querySelector("#golf-scorecards");
  if (old) old.remove();
  const oldControls = root.querySelector("#save-score")?.closest(".card");
  if (oldControls) oldControls.remove();

  const wrapper = document.createElement("div");
  wrapper.id = "golf-scorecards";
  wrapper.innerHTML = `<div class="card golf-score-intro"><div class="card-title">Team Scorecards</div><div class="muted tiny">Enter each player's strokes by hole. Front 9, Back 9 and Total update automatically.</div></div>` + teams.map((team) => teamCard(team, parts.filter((p) => String(p.team_id) === String(team.id)), byMember, scores, holes)).join("");
  if (!teams.length) wrapper.innerHTML += `<div class="card"><p class="muted tiny">Generate teams above to create scorecards.</p></div>`;
  root.insertBefore(wrapper, root.querySelector(".card:last-child"));

  wrapper.querySelectorAll(".golf-score-team").forEach((card) => tally(card));
  wrapper.addEventListener("input", (event) => {
    const input = event.target.closest(".golf-sc-score");
    if (input) tally(input.closest(".golf-score-team"));
  });
  wrapper.addEventListener("change", async (event) => {
    const input = event.target.closest(".golf-sc-score");
    if (!input) return;
    await saveScore(input, outingId);
    tally(input.closest(".golf-score-team"));
  });
  if (!canEdit()) wrapper.querySelectorAll("input.golf-sc-score").forEach((input) => input.disabled = true);
}

function boot() {
  const id = currentOutingId(), root = document.querySelector("#golf-outing");
  if (id && root) mount(root, id);
}

const observer = new MutationObserver(boot);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("hashchange", () => setTimeout(boot, 0));
boot();
