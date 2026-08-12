/* =====================================================================
   golf-matches.js - the team points board and the three battles
   ---------------------------------------------------------------------
   Sits on the outing page under the leaderboard and answers the only
   question the format actually asks: WHO IS WINNING THE OUTING.

     THE BOARD    team points, big. One point per battle won, nothing for a
                  halved one, so three battles can end 2-0, 1-1 or 0-0.
     THE BATTLES  one row each: the two pairs, where they stand, and a tap
                  through to the card.
     ADMIN        build the pairs, or move somebody between them.

   Boots off the .golf-matches-page placeholder the way the draft board and
   the scorecards do, so pages/golf.js does not have to know how any of this
   works - it just leaves a hole in the page.

   The arithmetic all lives in golf-battle.js. Nothing here decides what a
   point is worth.
   ===================================================================== */
import { db, isAdmin } from "./supabase.js";
import { esc, empty, toast } from "./ui.js";
import { loadMembers } from "./members.js";
import { battleResult, standingLine, teamPoints, pointsFootnote, pairName } from "./golf-battle.js";

const POLL_MS = 15000;
let host = null, timer = 0, outingId = null;

function styles() {
  if (document.getElementById("dfl-battles-style")) return;
  const s = document.createElement("style");
  s.id = "dfl-battles-style";
  s.textContent = `
.golf-points{padding:0;overflow:hidden}
.golf-points-grid{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;padding:15px 13px}
.gp-team{min-width:0;display:grid;gap:4px;justify-items:center;text-align:center}
.gp-team b{font-size:12.5px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.gp-team span{font-size:34px;font-weight:950;line-height:1;font-variant-numeric:tabular-nums;color:var(--racer,var(--accent))}
.gp-dash{font-size:15px;font-weight:900;color:var(--muted)}
.golf-points-foot{padding:0 13px 12px;text-align:center;font-size:10.5px;color:var(--muted)}
.golf-points-lead{padding:9px 13px;border-top:1px solid var(--line-soft);text-align:center;font-size:11.5px;font-weight:900;background:var(--bg-3)}

.golf-battles{padding:0;overflow:hidden}
.golf-battles .card-title-row{padding:14px 14px 0}
.gb-list{display:grid}
.gb-row{display:grid;grid-template-columns:26px 1fr 16px;align-items:center;gap:9px;padding:11px 13px;border-top:1px solid var(--line-soft);text-decoration:none;color:inherit;min-height:52px}
.gb-row:hover{background:var(--bg-3)}
.gb-n{font-weight:900;color:var(--muted);text-align:center;font-variant-numeric:tabular-nums}
.gb-mid{min-width:0;display:grid;gap:3px}
.gb-pair{display:flex;align-items:center;gap:6px;min-width:0;font-size:13px;font-weight:800}
.gb-pair i{width:8px;height:8px;border-radius:50%;background:var(--racer,var(--accent));flex:0 0 8px}
.gb-pair span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gb-pair em{font-style:normal;margin-left:auto;padding-left:8px;font-variant-numeric:tabular-nums;color:var(--muted);font-weight:900}
.gb-pair.is-low em{color:var(--sc-under)}
.gb-stand{font-size:10.5px;color:var(--muted);font-weight:800}
.gb-stand.is-done{color:var(--accent)}
.gb-arrow{font-size:20px;color:var(--muted);text-align:right}
.gb-admin{padding:12px 13px;border-top:1px solid var(--line)}
.gb-seats{display:grid;gap:9px;margin-top:9px}
.gb-seat-group{border:1px solid var(--line);border-radius:9px;padding:9px;background:var(--bg-2)}
.gb-seat-group>strong{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
.gb-seat{display:grid;grid-template-columns:1fr;gap:6px;margin-top:7px}
.gb-seat select{height:38px;padding:0 9px;border:1px solid var(--line);border-radius:7px;background:var(--bg-3);color:var(--text);font:inherit;min-width:0}
@media(min-width:560px){.gb-seat{grid-template-columns:1fr 1fr}}`;
  document.head.appendChild(s);
}

// ------------------------------------------------------------------- data

async function load(id) {
  const matchesRes = await db().from("golf_matches").select("id,match_number")
    .eq("outing_id", id).order("match_number");
  if (matchesRes.error) throw matchesRes.error;
  const matches = matchesRes.data || [];
  const matchIds = matches.map((m) => m.id);
  const none = { data: [], error: null };

  const [teamsRes, partsRes, sidesRes, members] = await Promise.all([
    db().from("golf_teams").select("id,name,color,sort_order").eq("outing_id", id).order("sort_order"),
    db().from("golf_participants").select("id,member_id,team_id,pick_number,sort_order").eq("outing_id", id),
    matchIds.length ? db().from("golf_match_sides").select("id,match_id,team_id,slot").in("match_id", matchIds).order("slot") : none,
    loadMembers().catch(() => []),
  ]);
  if (teamsRes.error || partsRes.error || sidesRes.error) throw teamsRes.error || partsRes.error || sidesRes.error;

  const sides = sidesRes.data || [];
  const sideIds = sides.map((s) => s.id);
  const [playersRes, scoresRes] = await Promise.all([
    sideIds.length ? db().from("golf_match_players").select("id,side_id,participant_id").in("side_id", sideIds) : none,
    sideIds.length ? db().from("golf_match_scores").select("side_id,hole,strokes").in("side_id", sideIds) : none,
  ]);
  if (playersRes.error || scoresRes.error) throw playersRes.error || scoresRes.error;

  const byMember = new Map((members || []).map((m) => [String(m.id), m.display_name]));
  const byPart = new Map((partsRes.data || []).map((p) => [String(p.id), p]));
  const strokes = new Map();
  for (const row of scoresRes.data || []) {
    const key = String(row.side_id);
    if (!strokes.has(key)) strokes.set(key, new Map());
    strokes.get(key).set(Number(row.hole), Number(row.strokes));
  }

  const battles = matches.map((m) => {
    const mine = sides.filter((s) => String(s.match_id) === String(m.id))
      .sort((a, b) => Number(a.slot) - Number(b.slot));
    const built = mine.map((s) => {
      const rows = (playersRes.data || []).filter((p) => String(p.side_id) === String(s.id));
      const team = (teamsRes.data || []).find((t) => String(t.id) === String(s.team_id));
      return {
        ...s,
        rows,
        teamName: team?.name || "Team",
        color: team?.color || "",
        players: rows.map((r) => {
          const part = byPart.get(String(r.participant_id));
          return { row_id: r.id, participant_id: r.participant_id, name: byMember.get(String(part?.member_id)) || "Unknown" };
        }),
        strokes: strokes.get(String(s.id)) || new Map(),
      };
    });
    const result = built.length === 2 ? battleResult(built[0].strokes, built[1].strokes) : null;
    return { ...m, sides: built, result };
  });

  return {
    battles,
    teams: teamsRes.data || [],
    parts: partsRes.data || [],
    byMember,
    /* Every player already in a pair, so the seat pickers can say so rather
       than offering a swap that looks like a fresh assignment. */
    taken: new Map((playersRes.data || []).map((r) => [String(r.participant_id), r])),
    scored: (scoresRes.data || []).length,
  };
}

// ------------------------------------------------------------------ views

function board(data) {
  const pts = teamPoints(data.battles.filter((b) => b.sides.length === 2));
  const teams = data.teams.length === 2 ? data.teams : [];
  if (!teams.length) return "";
  const values = teams.map((t) => pts.get(String(t.id)) || 0);
  const foot = pointsFootnote(data.battles.filter((b) => b.sides.length === 2));
  const lead = values[0] === values[1]
    ? (values[0] === 0 && data.battles.every((b) => !b.result?.complete) ? "" : "All square")
    : `${esc(teams[values[0] > values[1] ? 0 : 1].name)} lead`;
  return `<section class="card golf-points">
    <div class="golf-points-grid">
      ${teams.map((t, i) => `<div class="gp-team" style="--racer:${esc(t.color || "")}"><span>${values[i]}</span><b>${esc(t.name)}</b></div>`)
        .join('<div class="gp-dash">—</div>')}
    </div>
    ${foot ? `<div class="golf-points-foot">${esc(foot)}</div>` : ""}
    ${lead ? `<div class="golf-points-lead">${lead}</div>` : ""}
  </section>`;
}

function battleRow(b) {
  const names = b.sides.map((s) => pairName(s.players.map((p) => p.name)));
  if (b.sides.length !== 2) {
    return `<div class="gb-row"><span class="gb-n">${b.match_number}</span><div class="gb-mid"><div class="gb-stand">Sides not built yet</div></div><span class="gb-arrow"></span></div>`;
  }
  const r = b.result;
  const totals = b.sides.map((s) => { let t = 0; for (const v of s.strokes.values()) t += Number(v) || 0; return t; });
  const low = r.thru && r.diff !== 0 ? (r.diff < 0 ? 0 : 1) : -1;
  return `<a class="gb-row" href="#/golf?id=${outingId}&match=${b.id}">
    <span class="gb-n">${b.match_number}</span>
    <div class="gb-mid">
      ${b.sides.map((s, i) => `<div class="gb-pair ${low === i ? "is-low" : ""}" style="--racer:${esc(s.color || "")}"><i></i><span>${esc(names[i])}</span><em>${totals[i] || "—"}</em></div>`).join("")}
      <div class="gb-stand ${r.complete ? "is-done" : ""}">${esc(standingLine(r, names[0], names[1]))}</div>
    </div>
    <span class="gb-arrow">›</span></a>`;
}

/* The seat pickers. One select per seat, listing that team's players - so a
   captain's pairs can be shuffled without anybody touching SQL. */
function seats(data) {
  return data.battles.filter((b) => b.sides.length === 2).map((b) => `
    <div class="gb-seat-group"><strong>Battle ${b.match_number}</strong>
      ${b.sides.map((s) => {
        const pool = data.parts.filter((p) => String(p.team_id) === String(s.team_id))
          .sort((a, b2) => (a.pick_number ?? 9999) - (b2.pick_number ?? 9999) || (a.sort_order ?? 0) - (b2.sort_order ?? 0));
        const seat = (player, index) => `
          <select data-seat="${s.id}:${index}" data-row="${player?.row_id ?? ""}" aria-label="Player ${index + 1} for ${esc(s.teamName)} in battle ${b.match_number}">
            <option value="">— empty —</option>
            ${pool.map((p) => {
              const held = data.taken.get(String(p.id));
              const elsewhere = held && String(held.side_id) !== String(s.id);
              const name = data.byMember.get(String(p.member_id)) || "Unknown";
              return `<option value="${p.id}" ${String(p.id) === String(player?.participant_id) ? "selected" : ""}>${esc(name)}${elsewhere ? " (in another battle)" : ""}</option>`;
            }).join("")}
          </select>`;
        return `<div class="gb-seat">${seat(s.players[0], 0)}${seat(s.players[1], 1)}</div>`;
      }).join("")}
    </div>`).join("");
}

function view(data) {
  const admin = isAdmin();
  const built = data.battles.length > 0;
  const adminBlock = !admin ? "" : `<div class="gb-admin">
    <div class="arena-admin">
      <button class="btn small" id="gb-build">${built ? "Rebuild the pairs" : "Build the 2v2s"}</button>
      ${data.scored ? `<button class="btn ghost small danger" id="gb-clear">Clear all 2v2 strokes (${data.scored})</button>` : ""}
    </div>
    <p class="muted tiny">Pairs are made in draft order — first two picked together — and pair 1 plays pair 1. Move anybody with the pickers below; picking a player who is already in another battle swaps the two.${data.scored ? " Rebuilding is blocked until the strokes are cleared." : ""}</p>
    ${built ? `<div class="gb-seats">${seats(data)}</div>` : ""}
  </div>`;

  return `${board(data)}
    <section class="card golf-battles">
      <div class="card-title-row"><div><div class="card-title">The 2v2s</div>
        <p class="muted tiny">Fewest strokes wins the battle and one point for the team. Level is worth nothing.</p></div>
        ${admin ? `<span class="admin-badge">Admin</span>` : ""}</div>
      <div class="gb-list">${data.battles.length ? data.battles.map(battleRow).join("") : empty(admin ? "No battles yet. Build them below." : "The 2v2s have not been set up yet.")}</div>
      ${adminBlock}
    </section>`;
}

// ----------------------------------------------------------------- actions

/*
  Move a player into a seat.

  golf_match_players has one row per participant, so a player cannot be in
  two pairs - which means "put Dave here" where Dave is already paired is a
  SWAP, not an assignment. Doing it as two updates would break the unique
  constraint halfway through (both rows holding the same participant for an
  instant), so the pair of rows is deleted and re-inserted the other way
  round instead.
*/
async function assignSeat(data, sideId, rowId, participantId) {
  const client = db();
  const held = participantId ? data.taken.get(String(participantId)) : null;

  if (!participantId) {
    if (!rowId) return;
    const { error } = await client.from("golf_match_players").delete().eq("id", rowId);
    if (error) throw error;
    return;
  }

  if (held && String(held.id) !== String(rowId)) {
    /* Who currently sits in the seat we are filling - they go where the
       incoming player came from. If the seat was empty, nobody swaps back. */
    const outgoing = rowId
      ? [...data.taken.values()].find((r) => String(r.id) === String(rowId))
      : null;
    const del = await client.from("golf_match_players").delete()
      .in("id", [held.id, ...(rowId ? [rowId] : [])]);
    if (del.error) throw del.error;
    const rows = [{ side_id: sideId, participant_id: Number(participantId) }];
    if (outgoing) rows.push({ side_id: held.side_id, participant_id: outgoing.participant_id });
    const ins = await client.from("golf_match_players").insert(rows);
    if (ins.error) throw ins.error;
    return;
  }

  if (rowId) {
    const { error } = await client.from("golf_match_players")
      .update({ participant_id: Number(participantId) }).eq("id", rowId);
    if (error) throw error;
    return;
  }
  const { error } = await client.from("golf_match_players")
    .insert({ side_id: sideId, participant_id: Number(participantId) });
  if (error) throw error;
}

// ---------------------------------------------------------------- lifecycle

let data = null;

async function draw() {
  if (!host) return;
  try {
    data = await load(outingId);
  } catch (err) {
    /* Before the migration is run these tables do not exist. Only the person
       who can actually run it is given the homework. */
    host.innerHTML = isAdmin()
      ? `<section class="card"><div class="card-body muted tiny">The 2v2s need one migration: run <strong>golf_matches_schema.sql</strong> in Supabase.<br>${esc(err.message || String(err))}</div></section>`
      : "";
    return;
  }
  styles();
  host.innerHTML = view(data);
}

function wire() {
  host.addEventListener("change", async (e) => {
    const select = e.target.closest("[data-seat]");
    if (!select) return;
    const [sideId] = select.dataset.seat.split(":");
    select.disabled = true;
    try {
      await assignSeat(data, sideId, select.dataset.row || "", select.value);
      await draw();
    } catch (err) {
      toast(err.message || "Could not move that player", true);
      select.disabled = false;
      await draw();
    }
  });

  host.addEventListener("click", async (e) => {
    const build = e.target.closest("#gb-build");
    const clear = e.target.closest("#gb-clear");

    if (build) {
      if (data.battles.length && !confirm("Rebuild the pairs from scratch? Any pairing you have adjusted by hand will be replaced."))return;
      build.disabled = true;
      try {
        const { data: made, error } = await db().rpc("golf_build_matches", { p_outing_id: Number(outingId) });
        if (error) throw error;
        toast(`${made} battle${made === 1 ? "" : "s"} built`);
        await draw();
      } catch (err) { toast(err.message || "Could not build the 2v2s", true); build.disabled = false; }
      return;
    }

    if (clear) {
      if (!confirm(`Delete all ${data.scored} stroke${data.scored === 1 ? "" : "s"} entered in the 2v2s? This cannot be undone.`)) return;
      clear.disabled = true;
      try {
        const sideIds = data.battles.flatMap((b) => b.sides.map((s) => s.id));
        const { error } = await db().from("golf_match_scores").delete().in("side_id", sideIds);
        if (error) throw error;
        toast("2v2 strokes cleared");
        await draw();
      } catch (err) { toast(err.message || "Could not clear the strokes", true); clear.disabled = false; }
    }
  });
}

function stop() { clearInterval(timer); timer = 0; host = null; }

function boot() {
  const find = () => {
    const el = document.querySelector("#golf-outing .golf-matches-page");
    if (!el) { if (host) stop(); return; }
    if (el === host) return;
    const q = new URLSearchParams(location.hash.split("?")[1] || "");
    outingId = q.get("id");
    if (!outingId) return;
    host = el;
    wire();
    draw();
    clearInterval(timer);
    timer = setInterval(() => {
      if (!document.body.contains(host)) return stop();
      /* Don't redraw under somebody's thumb: an admin with a seat picker open
         would have it closed and reset mid-choice. */
      if (document.hidden || host.contains(document.activeElement)) return;
      draw();
    }, POLL_MS);
  };
  new MutationObserver(find).observe(document.body, { childList: true, subtree: true });
  find();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
