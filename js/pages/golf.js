// =====================================================================
// DFL Golf - the draft party event, and its own sport.
//
//   #/golf          the outings list and the history
//   #/golf?id=7     one outing: who is playing, and the teams
//
// GOLF IS NOT THE DRAFT. The power rankings here never touch fantasy draft
// order, and an Arena race never sets a golf team. Two unrelated systems
// that happen to involve the same twelve people.
//
// This is the first slice: outings, the line-up, and team generation.
// Live scoring, the leaderboard, the rankings screen and the side-bet
// ledger read the same tables (golf_schema.sql already has them) and land
// next.
// =====================================================================

import { db, insertRow, updateRow } from "../supabase.js";
import { esc, empty, errorBox, toast, fmtDate, loading } from "../ui.js";
import { loadMembers } from "../members.js";
import { addControl, editControls, wireInline, canEdit, visible, hiddenClass } from "../inline.js";

/*
  A member with no golf_rankings row is rated this rather than left out, so
  a new member can be balanced into a team the first time they show up.
  75 is deliberately mid-table: it does not flatter anybody and it does not
  quietly make them the last pick.
*/
const DEFAULT_RATING = 75;

const TEAM_NAMES = [
  "Team Chaos", "Team Bogey", "Team Shank", "Team Mulligan",
  "Team Sandbagger", "Team Whiff", "Team Duff", "Team Yips",
];
const TEAM_COLORS = ["#2fbf5f", "#4aa3ff", "#f0a742", "#e0574a", "#b07cf0", "#3ecfcf"];

export async function render(view) {
  const id = new URLSearchParams(location.hash.split("?")[1] || "").get("id");
  if (id) return renderOuting(view, id);
  return renderList(view);
}

// ============================== the list ==============================

async function renderList(view) {
  view.innerHTML = loading();

  const res = await db().from("golf_outings").select("*").order("event_date", { ascending: false });
  if (res.error) {
    view.innerHTML = `<h1>DFL Golf</h1>` + errorBox(res.error) +
      `<div class="card"><div class="card-body muted">If the tables are missing, run
       <strong>golf_schema.sql</strong> in the Supabase SQL editor.</div></div>`;
    return;
  }

  const outings = visible("golf_outings", res.data || []);
  const live = outings.filter((o) => o.status !== "final");
  const past = outings.filter((o) => o.status === "final");

  view.innerHTML = `
    <div id="golf-wrap">
      <header class="page-head">
        <h1>DFL Golf</h1>
        ${addControl("golf_outings", "New outing")}
      </header>
      ${outings.length ? "" : empty(canEdit()
        ? "No outings yet. Create one above — the draft party is the usual excuse."
        : "No golf outings yet.")}

      ${live.length ? `
        <h2 class="section-title">Upcoming<span class="count">${live.length}</span></h2>
        ${live.map(outingCard).join("")}` : ""}

      ${past.length ? `
        <h2 class="section-title">Golf history<span class="count">${past.length}</span></h2>
        ${past.map(outingCard).join("")}` : ""}
    </div>
  `;

  wireInline(view.querySelector("#golf-wrap"), () => render(view));
}

function outingCard(o) {
  const state = o.status === "final" ? ["Final", "grey"]
              : o.status === "active" ? ["Live", "green"]
              : ["Setup", "warn"];
  return `
    <article class="card golf-card ${hiddenClass("golf_outings", o)}">
      <a class="golf-link" href="#/golf?id=${o.id}">
        <div class="golf-top">
          <h3 class="card-heading">${esc(o.name)}</h3>
          <span class="pill ${state[1]}">${state[0]}</span>
        </div>
        <div class="golf-meta">
          ${o.course ? `<span>${esc(o.course)}</span>` : ""}
          ${o.event_date ? `<span>· ${esc(fmtDate(o.event_date))}</span>` : ""}
          <span>· ${o.holes} holes</span>
        </div>
      </a>
      ${editControls("golf_outings", o, { compact: true })}
    </article>`;
}

// ============================= one outing =============================

async function renderOuting(view, id) {
  view.innerHTML = loading();

  const [outRes, partsRes, teamsRes, ranksRes, scoresRes, members] = await Promise.all([
    db().from("golf_outings").select("*").eq("id", id).maybeSingle(),
    db().from("golf_participants").select("*").eq("outing_id", id).order("sort_order"),
    db().from("golf_teams").select("*").eq("outing_id", id).order("sort_order"),
    db().from("golf_rankings").select("member_id, rating"),
    db().from("golf_scores").select("*").eq("outing_id", id),
    loadMembers().catch(() => []),
  ]);

  if (outRes.error || !outRes.data) {
    view.innerHTML = `<h1>DFL Golf</h1>` + errorBox(outRes.error || new Error("Outing not found"));
    return;
  }

  const outing = outRes.data;
  const parts  = partsRes.data || [];
  const teams  = teamsRes.data || [];
  const scores = scoresRes.data || [];
  const byId   = new Map(members.map((m) => [String(m.id), m]));

  const rate = (memberId) => rating.get(String(memberId)) ?? DEFAULT_RATING;

  view.innerHTML = `
    <header class="page-head">
      <a class="backlink" href="#/golf">← Golf</a>
      <h1>${esc(outing.name)}</h1>
    </header>

    <div id="golf-outing">
      <div class="card">
        <div class="setup-figures">
          ${figure(parts.length, parts.length === 1 ? "player" : "players")}
          ${figure(outing.holes, "holes")}
          ${figure(teams.length || "—", teams.length === 1 ? "team" : "teams")}
        </div>
        <div class="golf-meta" style="margin-top:8px">
          ${outing.course ? `<span>${esc(outing.course)}</span>` : ""}
          ${outing.event_date ? `<span>· ${esc(fmtDate(outing.event_date))}</span>` : ""}
        </div>
        ${outing.notes ? `<div class="card-body">${esc(outing.notes)}</div>` : ""}
      </div>

      ${teamsCard(outing, parts, teams, byId, rate)}
      ${scoreCard(outing, parts, scores, byId)}
      ${lineupCard(outing, parts, members, byId, rate)}
    </div>
  `;

  if (canEdit()) {
    wireLineup(view, outing, parts, members, () => render(view));
    wireTeams(view, outing, parts, teams, rate, () => render(view));
  }
}

function figure(value, label) {
  return `<div class="setup-figure">
            <span class="sf-v">${esc(value)}</span><span class="sf-l">${esc(label)}</span>
          </div>`;
}

// ------------------------------- line-up ------------------------------

function lineupCard(outing, parts, members, byId, rate) {
  const admin = canEdit();
  const playing = new Set(parts.map((p) => String(p.member_id)));
  const spare = members.filter((m) => !playing.has(String(m.id)));

  return `
    <div class="card">
      <div class="card-title">Line-up</div>

      ${parts.length ? `<div class="glist">
        ${parts.map((p) => {
          const m = byId.get(String(p.member_id));
          return `
            <div class="grow">
              <span class="gname">${esc(m?.display_name || "Unknown")}</span>
              <span class="grate">${rate(p.member_id)}</span>
              ${admin ? `<button class="btn ghost small" data-drop-player="${p.id}" aria-label="Remove">&times;</button>` : ""}
            </div>`;
        }).join("")}
      </div>` : `<p class="muted tiny">Nobody signed up yet.</p>`}

      ${admin ? `
        <div class="arena-admin">
          ${spare.length ? `
            <select id="golf-add-member">
              <option value="">— add a player —</option>
              ${spare.map((m) => `<option value="${m.id}">${esc(m.display_name)}</option>`).join("")}
            </select>` : `<span class="muted tiny">Every member is playing.</span>`}
          <button class="btn ghost small" id="golf-add-all" ${spare.length ? "" : "disabled"}>Add everyone</button>
        </div>` : ""}
    </div>`;
}

// -------------------------------- teams -------------------------------

/**
 * Teams, with each side's combined and average rating.
 *
 * The rating is a BALANCING TOOL and nothing else - it never decides who is
 * on which team by itself, it just makes "are these sides fair" answerable
 * at a glance. The commissioner can move anybody afterwards.
 */
function teamsCard(outing, parts, teams, byId, rate) {
  const admin = canEdit();

  const rows = (teamId) => parts.filter((p) => String(p.team_id) === String(teamId));
  const unassigned = parts.filter((p) => p.team_id == null);

  const block = (team) => {
    const mine = rows(team.id);
    const total = mine.reduce((t, p) => t + rate(p.member_id), 0);
    const avg = mine.length ? (total / mine.length) : 0;

    return `
      <section class="gteam" style="--racer:${esc(team.color || TEAM_COLORS[0])}">
        <header class="gteam-head">
          <span class="gteam-name">${esc(team.name || "Team")}</span>
          <span class="gteam-nums">
            <b>${total}</b> total · <b>${avg ? avg.toFixed(1) : "—"}</b> avg
          </span>
        </header>
        ${mine.length ? mine.map((p) => playerRow(p, byId, rate, teams, admin)).join("")
                      : `<div class="grow"><span class="muted tiny">Nobody yet</span></div>`}
      </section>`;
  };

  return `
    <div class="card">
      <div class="card-title">Teams</div>

      ${teams.length ? `<div class="gteams">${teams.map(block).join("")}</div>`
                     : `<p class="muted tiny">No teams generated yet.</p>`}

      ${unassigned.length ? `
        <section class="gteam is-spare">
          <header class="gteam-head"><span class="gteam-name">Unassigned</span></header>
          ${unassigned.map((p) => playerRow(p, byId, rate, teams, admin)).join("")}
        </section>` : ""}

      ${admin ? `
        <div class="arena-admin">
          <label class="gcount">Teams
            <input type="number" id="golf-team-count" min="2" max="6"
                   value="${teams.length || 2}">
          </label>
          <button class="btn small" id="golf-random" ${parts.length < 2 ? "disabled" : ""}>Random</button>
          <button class="btn small" id="golf-balanced" ${parts.length < 2 ? "disabled" : ""}>Balanced</button>
          <button class="btn ghost small" id="golf-clear" ${teams.length ? "" : "disabled"}>Clear teams</button>
        </div>
        <p class="muted tiny">A locked player keeps their team when you regenerate.</p>` : ""}
    </div>`;
}

function playerRow(p, byId, rate, teams, admin) {
  const m = byId.get(String(p.member_id));
  return `
    <div class="grow ${p.locked ? "is-locked" : ""}">
      <span class="gname">${esc(m?.display_name || "Unknown")}</span>
      <span class="grate">${rate(p.member_id)}</span>
      ${admin ? `
        <select class="gmove" data-move="${p.id}">
          <option value="">— unassigned —</option>
          ${teams.map((t) => `<option value="${t.id}" ${String(t.id) === String(p.team_id) ? "selected" : ""}>
            ${esc(t.name || "Team")}</option>`).join("")}
        </select>
        <button class="btn ghost small glock" data-lock="${p.id}" data-on="${p.locked ? "1" : "0"}"
                title="${p.locked ? "Unlock" : "Lock to this team"}">${p.locked ? "🔒" : "🔓"}</button>
      ` : ""}
    </div>`;
}

// ------------------------------- wiring -------------------------------

function wireLineup(view, outing, parts, members, refresh) {
  const root = view.querySelector("#golf-outing");

  root.addEventListener("change", async (e) => {
    const add = e.target.closest("#golf-add-member");
    if (!add || !add.value) return;
    try {
      await insertRow("golf_participants", {
        outing_id: outing.id,
        member_id: Number(add.value),
        sort_order: parts.length,
      });
      refresh();
    } catch (err) { toast(err.message || "Could not add that player", true); }
  });

  root.addEventListener("click", async (e) => {
    const drop = e.target.closest("[data-drop-player]");
    const all  = e.target.closest("#golf-add-all");

    if (drop) {
      try {
        const { error } = await db().from("golf_participants").delete().eq("id", drop.dataset.dropPlayer);
        if (error) throw error;
        refresh();
      } catch (err) { toast(err.message || "Could not remove that player", true); }
    }

    if (all) {
      all.disabled = true;
      const have = new Set(parts.map((p) => String(p.member_id)));
      try {
        let n = parts.length;
        for (const m of members) {
          if (have.has(String(m.id))) continue;
          await insertRow("golf_participants",
            { outing_id: outing.id, member_id: m.id, sort_order: n++ });
        }
        toast("Line-up filled");
        refresh();
      } catch (err) { toast(err.message || "Could not fill the line-up", true); all.disabled = false; }
    }
  });
}

function wireTeams(view, outing, parts, teams, rate, refresh) {
  const root = view.querySelector("#golf-outing");

  root.addEventListener("change", async (e) => {
    const move = e.target.closest("[data-move]");
    if (move) {
      try {
        await updateRow("golf_participants", move.dataset.move,
          { team_id: move.value ? Number(move.value) : null });
        refresh();
      } catch (err) { toast(err.message || "Could not move that player", true); }
    }
  });

  root.addEventListener("click", async (e) => {
    const lock = e.target.closest("[data-lock]");
    const rnd  = e.target.closest("#golf-random");
    const bal  = e.target.closest("#golf-balanced");
    const clr  = e.target.closest("#golf-clear");

    if (lock) {
      try {
        await updateRow("golf_participants", lock.dataset.lock, { locked: lock.dataset.on !== "1" });
        refresh();
      } catch (err) { toast(err.message || "Could not lock that player", true); }
      return;
    }

    if (clr) {
      if (!confirm("Clear the teams? Players stay in the outing.")) return;
      try {
        await db().from("golf_participants").update({ team_id: null }).eq("outing_id", outing.id);
        await db().from("golf_teams").delete().eq("outing_id", outing.id);
        toast("Teams cleared");
        refresh();
      } catch (err) { toast(err.message || "Could not clear the teams", true); }
      return;
    }

    if (rnd || bal) {
      const want = Math.max(2, Math.min(6,
        Number(view.querySelector("#golf-team-count")?.value) || 2));
      e.target.disabled = true;
      try {
        await generateTeams(outing, parts, teams, rate, want, bal ? "balanced" : "random");
        toast(bal ? "Balanced teams generated" : "Random teams generated");
        refresh();
      } catch (err) {
        toast(err.message || "Could not generate teams", true);
        e.target.disabled = false;
      }
    }
  });
}

// ============================ scoring ============================

function scoreCard(outing, parts, scores, byId) {
return `
<section class="card golf-scorecard">

<header class="card-head">
<h2>Live Scorecard</h2>
</header>

<div class="glist">

${parts.map((p) => {

const player = byId.get(String(p.member_id));

const holes = scores.filter(
(s) => String(s.member_id) === String(p.member_id)
);

const total = holes.reduce(
(sum, s) => sum + Number(s.strokes || 0),
0
);

return `
<div class="grow">
<span class="gname">
${esc(player?.display_name || "Unknown")}
</span>

<span class="grate">
${total || "-"}
</span>
</div>
`;

}).join("")}

</div>

</section>
`;
}
// ---------------------------- the generator ---------------------------

/**
 * Build `want` teams and assign everybody who is not locked.
 *
 * Random is a shuffle dealt round-robin. Balanced is a SNAKE draft by
 * rating - best to team 1, next to team 2, and back again - which is the
 * standard way to split a ranked field evenly and beats sorting into blocks
 * (that just makes one stacked team).
 *
 * Locked players are left exactly where they are, and the teams they are
 * already on are counted as having them, so the snake fills around them
 * instead of ignoring them and producing lopsided sides.
 */
async function generateTeams(outing, parts, existingTeams, rate, want, mode) {
  // Reuse the teams that exist, add or drop to reach `want`.
  const teams = [...existingTeams];

  while (teams.length < want) {
    const i = teams.length;
    const row = await insertRow("golf_teams", {
      outing_id: outing.id,
      name: TEAM_NAMES[i % TEAM_NAMES.length],
      color: TEAM_COLORS[i % TEAM_COLORS.length],
      sort_order: i,
    });
    teams.push(row);
  }
  while (teams.length > want) {
    const gone = teams.pop();
    // Players on a removed team fall back to unassigned via ON DELETE SET NULL.
    await db().from("golf_teams").delete().eq("id", gone.id);
  }

  const locked = parts.filter((p) => p.locked && p.team_id != null);
  const pool   = parts.filter((p) => !(p.locked && p.team_id != null));

  // Where the snake starts from: a team that already has locked players is
  // that much less hungry.
  const load = new Map(teams.map((t) => [String(t.id), 0]));
  for (const p of locked) {
    const k = String(p.team_id);
    if (load.has(k)) load.set(k, load.get(k) + 1);
  }

  if (mode === "balanced") {
    pool.sort((a, b) => rate(b.member_id) - rate(a.member_id));
  } else {
    for (let i = pool.length - 1; i > 0; i--) {          // Fisher-Yates
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }

  // Snake order, recomputed each pick so the emptiest team gets the next
  // player - which is what keeps sides even when locks are uneven.
  for (const p of pool) {
    let best = teams[0], bestLoad = Infinity;
    for (const t of teams) {
      const l = load.get(String(t.id));
      if (l < bestLoad) { bestLoad = l; best = t; }
    }
    load.set(String(best.id), bestLoad + 1);
    await updateRow("golf_participants", p.id, { team_id: best.id });
  }
}
