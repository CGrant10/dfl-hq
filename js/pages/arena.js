// =====================================================================
// DFL Arena - the league's general purpose settling-of-arguments machine.
//
// An Arena event is "a set of members and an ordered result". Draft order,
// golf teams, playoff seeding, who buys the beer, awards, a week 8
// punishment - the engine does not know which, and deliberately so.
//
//   #/arena          the events list and the history
//   #/arena?id=12    one event: line-up, the race, the result
//
// Members watch and read. The commissioner creates, sets the line-up,
// starts the race and saves the result. The database enforces that; the
// buttons are hidden as a convenience.
// =====================================================================

import { db, insertRow, updateRow } from "../supabase.js";
import { esc, empty, errorBox, toast, fmtDate, loading } from "../ui.js";
import { loadMembers } from "../members.js";
import { addControl, editControls, wireInline, canEdit, visible, hiddenClass } from "../inline.js";
import { THEMES, themeKeys, themeLabel, slotsFor, assignSprites, spriteMarkup,
         toSpritePng, MAX_SPRITE_UPLOAD } from "../arena/sprites.js";
import { simulate, newSeed, ticksFor, raceSeconds, TICK_MS, LENGTHS } from "../arena/race.js";

const reduceMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export async function render(view) {
  const id = new URLSearchParams(location.hash.split("?")[1] || "").get("id");
  if (id) return renderEvent(view, id);
  return renderList(view);
}

// ============================== the list ==============================

async function renderList(view) {
  view.innerHTML = loading();

  const [eventsRes, resultsRes, members] = await Promise.all([
    db().from("arena_events").select("*").order("created_at", { ascending: false }),
    db().from("arena_results").select("event_id, member_id, place").eq("place", 1),
    loadMembers().catch(() => []),
  ]);

  if (eventsRes.error) {
    view.innerHTML = `<h1>DFL Arena</h1>` + errorBox(eventsRes.error) +
      `<div class="card"><div class="card-body muted">If the tables are missing, run
       <strong>arena_schema.sql</strong> in the Supabase SQL editor.</div></div>`;
    return;
  }

  const events  = visible("arena_events", eventsRes.data || []);
  const winners = new Map((resultsRes.data || []).map((r) => [r.event_id, r.member_id]));
  const byId    = new Map(members.map((m) => [String(m.id), m]));

  const open = events.filter((e) => e.status !== "complete");
  const done = events.filter((e) => e.status === "complete");

  view.innerHTML = `
    <div id="arena-wrap">
      <header class="page-head">
        <h1>DFL Arena</h1>
        ${addControl("arena_events", "New event")}
      </header>
      ${events.length ? "" : empty(canEdit()
        ? "No Arena events yet. Create one above — draft order, golf teams, punishments, anything."
        : "No Arena events yet.")}

      ${open.length ? `
        <h2 class="section-title">Ready to run<span class="count">${open.length}</span></h2>
        ${open.map((e) => eventCard(e, null, byId)).join("")}` : ""}

      ${done.length ? `
        <h2 class="section-title">Arena history<span class="count">${done.length}</span></h2>
        ${done.map((e) => eventCard(e, winners.get(e.id), byId)).join("")}` : ""}
    </div>
  `;

  wireInline(view.querySelector("#arena-wrap"), () => render(view));
}

function eventCard(e, winnerId, byId) {
  const winner = winnerId != null ? byId.get(String(winnerId)) : null;
  return `
    <article class="card arena-card ${hiddenClass("arena_events", e)}">
      <a class="arena-link" href="#/arena?id=${e.id}">
        <div class="arena-top">
          <h3 class="card-heading">${esc(e.name)}</h3>
          <span class="pill ${e.status === "complete" ? "grey" : "green"}">
            ${e.status === "complete" ? "Final" : "Ready"}
          </span>
        </div>
        <div class="arena-meta">
          <span>${esc(themeLabel(e.theme))}</span>
          ${e.event_date ? `<span>· ${esc(fmtDate(e.event_date))}</span>` : ""}
          ${winner ? `<span class="arena-winner">· 🏆 ${esc(winner.display_name)}</span>` : ""}
        </div>
        ${e.description ? `<div class="card-body">${esc(e.description)}</div>` : ""}
      </a>
      ${editControls("arena_events", e, { compact: true })}
    </article>`;
}

// ============================== one event =============================

async function renderEvent(view, id) {
  view.innerHTML = loading();

  const [eventRes, partsRes, resultsRes, members] = await Promise.all([
    db().from("arena_events").select("*").eq("id", id).maybeSingle(),
    db().from("arena_participants").select("*").eq("event_id", id).order("sort_order"),
    db().from("arena_results").select("*").eq("event_id", id).order("place"),
    loadMembers().catch(() => []),
  ]);

  if (eventRes.error || !eventRes.data) {
    view.innerHTML = `<h1>DFL Arena</h1>` + errorBox(eventRes.error || new Error("Event not found"));
    return;
  }

  const event   = eventRes.data;
  const parts   = partsRes.data || [];
  const results = resultsRes.data || [];
  const byId    = new Map(members.map((m) => [String(m.id), m]));

  view.innerHTML = `
    <header class="page-head">
      <a class="backlink" href="#/arena">← Arena</a>
      <h1>${esc(event.name)}</h1>
      ${event.description ? `<p class="page-sub">${esc(event.description)}</p>` : ""}
    </header>

    <div id="arena-event">
      <div class="card arena-setup">
        <div class="arena-figures">
          ${figure(parts.length, parts.length === 1 ? "racer" : "racers")}
          ${figure(themeLabel(event.theme), "theme")}
          ${figure(raceSeconds(event.race_length, event.length_ticks) + "s", "length")}
        </div>
        ${event.notes ? `<div class="card-body">${esc(event.notes)}</div>` : ""}
      </div>

      ${results.length ? resultsCard(results, byId, event) : ""}

      <div id="arena-stage"></div>

      ${broadcastCard(event, parts)}

      ${lineupCard(event, parts, byId, members)}
    </div>
  `;

  const stage = view.querySelector("#arena-stage");

  // Start / replay
  view.querySelector("#arena-event").addEventListener("click", async (e) => {
    const start  = e.target.closest("#arena-start");
    const replay = e.target.closest("#arena-replay");
    const clear  = e.target.closest("#arena-clear");

    if (clear) return clearResult(view, event);
    if (!start && !replay) return;

    if (parts.length < 2) { toast("An Arena race needs at least two racers", true); return; }

    // A replay reuses the stored seed so it is the same race; a fresh run
    // draws a new one.
    const seed = replay && event.seed ? Number(event.seed) : newSeed();
    await runRace(view, stage, event, parts, byId, seed, { save: !replay });
  });

  if (canEdit()) {
    wireLineup(view, event, parts, members, () => render(view));
    wireBroadcast(view, event, parts, byId, () => render(view));
  }

  if (!results.length) {
    stage.innerHTML = `
      <div class="row-end">
        <button class="btn" id="arena-start" ${parts.length < 2 ? "disabled" : ""}>
          ${parts.length < 2 ? "Add racers to start" : "Start the race"}
        </button>
      </div>`;
  }
}

function figure(value, label) {
  return `<div class="setup-figure">
            <span class="sf-v">${esc(value)}</span><span class="sf-l">${esc(label)}</span>
          </div>`;
}

// ------------------------------- line-up ------------------------------

function lineupCard(event, parts, byId, members) {
  const admin = canEdit();
  const inRace = new Set(parts.map((p) => String(p.member_id)));
  const spare  = members.filter((m) => !inRace.has(String(m.id)));

  return `
    <div class="card">
      <div class="card-title">Line-up</div>

      ${parts.length ? `<div class="lanes-list">${parts.map((p, i) => {
        const m = byId.get(String(p.member_id));
        return `
          <div class="lane-row">
            <span class="lane-no">${p.number ?? i + 1}</span>
            <span class="lane-sprite" style="--racer:${esc(p.color || laneColor(i))}">
              ${spriteMarkup(event.theme, p.sprite, p.color || laneColor(i), p.sprite_image)}
            </span>
            <span class="lane-name">${esc(m?.display_name || "Unknown")}</span>
            ${admin ? `
              <select class="lane-pick" data-sprite-for="${p.id}">
                <option value="">— sprite —</option>
                ${slotsFor(event.theme).map((s) =>
                  `<option value="${esc(s.key)}" ${s.key === p.sprite ? "selected" : ""}>${esc(s.label)}</option>`).join("")}
              </select>
              <input type="file" accept="image/*" class="hidden" data-pngfile="${p.id}">
              <button class="btn ghost small" data-png="${p.id}"
                      title="${p.sprite_image ? "Replace this racer's picture" : "Upload a PNG for this racer"}">
                ${p.sprite_image ? "PNG ✓" : "PNG"}
              </button>
              ${p.sprite_image
                ? `<button class="btn ghost small" data-pngclear="${p.id}" title="Back to the drawn sprite">↺</button>`
                : ""}
              <button class="btn ghost small" data-drop-racer="${p.id}" aria-label="Remove">&times;</button>
            ` : ""}
          </div>`;
      }).join("")}</div>` : `<p class="muted tiny">No racers yet.</p>`}

      ${admin ? `
        <div class="arena-admin">
          ${spare.length ? `
            <select id="arena-add-member">
              <option value="">— add a racer —</option>
              ${spare.map((m) => `<option value="${m.id}">${esc(m.display_name)}</option>`).join("")}
            </select>` : `<span class="muted tiny">Every member is in this race.</span>`}
          <button class="btn ghost small" id="arena-add-all" ${spare.length ? "" : "disabled"}>Add everyone</button>
          <button class="btn ghost small" id="arena-roll-sprites" ${parts.length ? "" : "disabled"}>Random sprites</button>
        </div>` : ""}
    </div>`;
}

const LANE_COLORS = [
  "#2fbf5f", "#4aa3ff", "#f0a742", "#e0574a", "#b07cf0", "#3ecfcf",
  "#f2e05a", "#ff7fb0", "#8fd14f", "#ff9a4a", "#7f8cff", "#d6b254",
];
const laneColor = (i) => LANE_COLORS[i % LANE_COLORS.length];

function wireLineup(view, event, parts, members, refresh) {
  const root = view.querySelector("#arena-event");

  root.addEventListener("change", async (e) => {
    const add = e.target.closest("#arena-add-member");
    const sprite = e.target.closest("[data-sprite-for]");

    if (add && add.value) {
      try {
        await insertRow("arena_participants", {
          event_id: event.id,
          member_id: Number(add.value),
          sort_order: parts.length,
          color: laneColor(parts.length),
          number: parts.length + 1,
        });
        refresh();
      } catch (err) { toast(err.message || "Could not add that racer", true); }
    }

    if (sprite) {
      try {
        await updateRow("arena_participants", sprite.dataset.spriteFor, { sprite: sprite.value });
        toast("Sprite set");
        refresh();
      } catch (err) { toast(err.message || "Could not set the sprite", true); }
    }
  });

  // A picked file never touches the network as-is: it is redrawn to a small
  // PNG first, so what reaches the database is a few kilobytes.
  root.addEventListener("change", async (e) => {
    const picker = e.target.closest("[data-pngfile]");
    if (!picker) return;
    const file = picker.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) { toast("That is not an image", true); return; }
    if (file.size > MAX_SPRITE_UPLOAD)   { toast("That image is too large", true); return; }

    try {
      const dataUrl = await toSpritePng(file);
      await updateRow("arena_participants", picker.dataset.pngfile, { sprite_image: dataUrl });
      toast("Racer picture set");
      refresh();
    } catch (err) {
      toast(/sprite_image|column/.test(err.message || "")
        ? "Run arena_sprites_schema.sql in Supabase"
        : (err.message || "Could not read that image"), true);
    }
  });

  root.addEventListener("click", async (e) => {
    const drop = e.target.closest("[data-drop-racer]");
    const all  = e.target.closest("#arena-add-all");
    const roll = e.target.closest("#arena-roll-sprites");
    const png  = e.target.closest("[data-png]");
    const wipe = e.target.closest("[data-pngclear]");

    if (png) {
      root.querySelector(`[data-pngfile="${png.dataset.png}"]`)?.click();
      return;
    }

    if (wipe) {
      try {
        await updateRow("arena_participants", wipe.dataset.pngclear, { sprite_image: null });
        toast("Back to the drawn sprite");
        refresh();
      } catch (err) { toast(err.message || "Could not clear the picture", true); }
      return;
    }

    if (drop) {
      try {
        const { error } = await db().from("arena_participants").delete().eq("id", drop.dataset.dropRacer);
        if (error) throw error;
        refresh();
      } catch (err) { toast(err.message || "Could not remove that racer", true); }
    }

    if (all) {
      all.disabled = true;
      const have = new Set(parts.map((p) => String(p.member_id)));
      try {
        let n = parts.length;
        for (const m of members) {
          if (have.has(String(m.id))) continue;
          await insertRow("arena_participants", {
            event_id: event.id, member_id: m.id, sort_order: n,
            color: laneColor(n), number: n + 1,
          });
          n++;
        }
        toast("Line-up filled");
        refresh();
      } catch (err) { toast(err.message || "Could not fill the line-up", true); all.disabled = false; }
    }

    if (roll) {
      roll.disabled = true;
      try {
        const keys = assignSprites(event.theme, parts.length);
        for (let i = 0; i < parts.length; i++) {
          await updateRow("arena_participants", parts[i].id, { sprite: keys[i] });
        }
        toast("Sprites rolled");
        refresh();
      } catch (err) { toast(err.message || "Could not roll sprites", true); roll.disabled = false; }
    }
  });
}

// ============================ broadcast mode ==========================

/*
  The commissioner's control panel for the OBS view.

  Nothing here draws a race - it only writes state to the event row, and the
  broadcast page (and any phone watching) derives everything from that. So
  the panel works from anywhere with signal, including a phone in a bar, and
  the machine running OBS never needs to be touched once the scene is set.

  The Broadcast link is deliberately a plain URL: that string is what gets
  pasted into an OBS Browser Source.
*/
function broadcastCard(event, parts) {
  if (!canEdit()) return "";

  const url = `${location.origin}${location.pathname}#/broadcast?id=${event.id}`;
  const running = event.bc_state === "running";
  const paused  = event.bc_state === "paused";

  return `
    <div class="card bc-panel">
      <div class="card-title">Broadcast</div>

      <div class="bc-url">
        <input id="bc-url" type="text" readonly value="${esc(url)}">
        <button class="btn ghost small" id="bc-copy">Copy</button>
      </div>

      <div class="bc-controls">
        <a class="btn small" href="#/broadcast?id=${event.id}">Open broadcast</a>
        <button class="btn small" id="bc-start" ${parts.length < 2 ? "disabled" : ""}>
          ${running || paused ? "Restart" : "Start race"}
        </button>
        <button class="btn ghost small" id="bc-pause" ${running || paused ? "" : "disabled"}>
          ${paused ? "Resume" : "Pause"}
        </button>
        <button class="btn ghost small" id="bc-skip" ${running || paused ? "" : "disabled"}>Skip to finish</button>
        <button class="btn ghost small" id="bc-reset">Reset</button>
        <button class="btn ghost small" id="bc-save" ${parts.length < 2 ? "disabled" : ""}>Save result</button>
      </div>

      <div class="bc-toggles">
        <label><input type="checkbox" id="bc-board-t" ${event.bc_show_board === false ? "" : "checked"}> Leaderboard</label>
        <label><input type="checkbox" id="bc-timer-t" ${event.bc_show_timer === false ? "" : "checked"}> Timer</label>
        <span class="pill ${running ? "green" : paused ? "warn" : "grey"}">${esc(event.bc_state || "idle")}</span>
      </div>
    </div>`;
}

/** Seconds of countdown before the racers move. */
const COUNTDOWN_MS = 3400;

function wireBroadcast(view, event, parts, byId, refresh) {
  const panel = view.querySelector(".bc-panel");
  if (!panel) return;

  const ticks = ticksFor(event.race_length, event.length_ticks);

  /* Elapsed race time right now, from the row - the same formula the
     broadcast uses, so pausing lands on the identical frame everywhere. */
  const elapsedNow = () => {
    if (!event.bc_started_at || event.bc_state === "idle") return 0;
    if (event.bc_state === "paused") return event.bc_offset_ms || 0;
    return Date.now() - Date.parse(event.bc_started_at) + (event.bc_offset_ms || 0);
  };

  const write = async (patch, note) => {
    try {
      await updateRow("arena_events", event.id, patch);
      if (note) toast(note);
      refresh();
    } catch (err) {
      toast(/bc_state|column/.test(err.message || "")
        ? "Run arena_broadcast_schema.sql in Supabase"
        : (err.message || "Could not update the broadcast"), true);
    }
  };

  panel.addEventListener("click", async (e) => {
    const t = e.target;

    if (t.closest("#bc-copy")) {
      const input = panel.querySelector("#bc-url");
      try {
        await navigator.clipboard.writeText(input.value);
        toast("Broadcast URL copied");
      } catch {
        // Clipboard needs a secure context; selecting it is the fallback.
        input.removeAttribute("readonly");
        input.select();
        toast("Copy the highlighted URL");
      }
      return;
    }

    if (t.closest("#bc-start")) {
      // A fresh seed only when there is not one yet, so Restart replays the
      // same race rather than quietly rolling a different winner.
      const seed = event.seed || newSeed();
      return write({
        seed,
        bc_state: "running",
        bc_started_at: new Date(Date.now() + COUNTDOWN_MS).toISOString(),
        bc_offset_ms: 0,
      }, "Countdown running");
    }

    if (t.closest("#bc-pause")) {
      if (event.bc_state === "paused") {
        return write({
          bc_state: "running",
          bc_started_at: new Date().toISOString(),
          bc_offset_ms: event.bc_offset_ms || 0,
        }, "Resumed");
      }
      return write({ bc_state: "paused", bc_offset_ms: Math.max(0, Math.round(elapsedNow())) }, "Paused");
    }

    if (t.closest("#bc-skip")) {
      // Jump the clock past the last finish, which puts every lane on the
      // line and triggers the winner card on every viewer at once.
      const racers = parts.map((p) => ({ id: p.member_id }));
      const sim = simulate(racers, ticks, Number(event.seed) || 1);
      const end = (sim.order.at(-1)?.finishMs ?? 0) + 400;
      return write({
        bc_state: "finished",
        bc_started_at: new Date().toISOString(),
        bc_offset_ms: end,
      }, "Skipped to the finish");
    }

    if (t.closest("#bc-reset")) {
      return write({ bc_state: "idle", bc_started_at: null, bc_offset_ms: 0 }, "Broadcast reset");
    }

    if (t.closest("#bc-save")) {
      const racers = parts.map((p, i) => ({
        id: p.member_id,
        name: byId.get(String(p.member_id))?.display_name || "Unknown",
      }));
      const sim = simulate(racers, ticks, Number(event.seed) || 1);
      await saveResults(event, sim, Number(event.seed) || 1);
      refresh();
    }
  });

  panel.addEventListener("change", (e) => {
    if (e.target.id === "bc-board-t") write({ bc_show_board: e.target.checked });
    if (e.target.id === "bc-timer-t") write({ bc_show_timer: e.target.checked });
  });
}

// =============================== the race =============================

/**
 * Countdown, run, reveal.
 *
 * Exported so the race can be driven without a database behind it - the
 * animation is the headline feature and needs to be verifiable on its own.
 *
 * The whole race is simulated first (see race.js), so what happens here is
 * playback: one requestAnimationFrame loop that maps elapsed time to a tick
 * and writes a transform per racer. No layout is read inside the loop and
 * nothing is re-created, which is what keeps it smooth on a phone.
 */
export async function runRace(view, stage, event, parts, byId, seed, { save }) {
  const ticks = ticksFor(event.race_length, event.length_ticks);
  const racers = parts.map((p, i) => ({
    id: p.member_id,
    name: byId.get(String(p.member_id))?.display_name || "Unknown",
    sprite: p.sprite,
    image: p.sprite_image,
    color: p.color || laneColor(i),
    number: p.number ?? i + 1,
  }));

  const sim = simulate(racers, ticks, seed);

  stage.innerHTML = `
    <div class="arena-track-wrap">
      <div class="scoreboard">
        <span class="sb-brand">DFL ARENA</span>
        <span class="sb-status" id="sb-status">On the line</span>
        <span class="sb-clock" id="sb-clock">0.0s</span>
      </div>

      <div class="track" id="track">
        <div class="track-start"></div>
        <div class="track-finish"></div>
        ${racers.map((r, i) => `
          <div class="lane">
            <span class="lane-tag" style="--racer:${esc(r.color)}">
              <b>${r.number}</b>${esc(r.name)}
            </span>
            <div class="runner" id="runner-${i}">
              <div class="runner-art" style="--racer:${esc(r.color)}">
                ${spriteMarkup(event.theme, r.sprite, r.color, r.image)}
              </div>
            </div>
          </div>`).join("")}
      </div>

      <div class="countdown hidden" id="countdown"><span id="countdown-n">3</span></div>
    </div>
    <div id="arena-result-slot"></div>
  `;

  const runners = racers.map((_, i) => stage.querySelector(`#runner-${i}`));
  const status  = stage.querySelector("#sb-status");
  const clock   = stage.querySelector("#sb-clock");
  const slot    = stage.querySelector("#arena-result-slot");

  const finish = async () => {
    status.textContent = "Final";
    slot.innerHTML = resultsCard(
      sim.order.map((o) => ({ member_id: o.racer.id, place: o.place, finish_ms: o.finishMs })),
      byId, event, { fresh: true });
    if (save) await saveResults(event, sim, seed);
  };

  // Reduced motion: no countdown, no movement - place everyone and reveal.
  if (reduceMotion()) {
    runners.forEach((el, i) => { el.style.transform = `translate3d(${trackX(1)},0,0)`; });
    clock.textContent = (sim.order.at(-1).finishMs / 1000).toFixed(1) + "s";
    await finish();
    return;
  }

  await countdown(stage);

  status.textContent = "Racing";
  const started = performance.now();

  await new Promise((resolve) => {
    const lastFinish = sim.order.at(-1).finishMs;
    const total = lastFinish + 250;

    function frame(now) {
      const elapsed = now - started;
      const t = Math.min(sim.frames, elapsed / TICK_MS);
      const lo = Math.floor(t), hi = Math.min(sim.frames, lo + 1), mix = t - lo;

      for (let i = 0; i < runners.length; i++) {
        const s = sim.samples[i];
        const p = s[lo] + (s[hi] - s[lo]) * mix;      // interpolate between ticks
        runners[i].style.transform = `translate3d(${trackX(p)},0,0)`;
      }

      // Stops on the last finish rather than running on to the extra beat
      // the animation holds for before the result appears.
      clock.textContent = (Math.min(elapsed, lastFinish) / 1000).toFixed(1) + "s";
      if (elapsed > total * 0.82) status.textContent = "Final stretch";

      if (elapsed >= total) resolve();
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  await finish();
  slot.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/*
  Progress to a CSS translate.

  CAREFUL: a percentage in translateX resolves against the ELEMENT'S OWN
  width, not the parent's. That is why .runner is a full-width rail that
  spans the lane and the sprite sits at its left edge - translating the rail
  by 50% moves the sprite half a lane, which is what you want. When the
  transform was on the 46px sprite itself, "100%" was 46 pixels and the
  racers looked frozen on the start line.

  Subtracting the sprite width keeps it inside the lane at the finish, so
  nothing has to be measured inside the animation loop.
*/
const SPRITE_W = 46;
const trackX = (p) => `calc(${(p * 100).toFixed(3)}% - ${(p * SPRITE_W).toFixed(1)}px)`;

function countdown(stage) {
  const box = stage.querySelector("#countdown");
  const num = stage.querySelector("#countdown-n");
  const status = stage.querySelector("#sb-status");
  box.classList.remove("hidden");

  return new Promise((resolve) => {
    const steps = ["3", "2", "1", "GO!"];
    let i = 0;
    const tick = () => {
      num.textContent = steps[i];
      num.classList.toggle("go", steps[i] === "GO!");
      // restart the pop animation
      num.style.animation = "none";
      void num.offsetWidth;
      num.style.animation = "";
      status.textContent = steps[i] === "GO!" ? "Away!" : "Set";
      i++;
      if (i < steps.length) setTimeout(tick, 700);
      else setTimeout(() => { box.classList.add("hidden"); resolve(); }, 420);
    };
    tick();
  });
}

// ------------------------------- results ------------------------------

function resultsCard(results, byId, event, { fresh = false } = {}) {
  const rows = [...results].sort((a, b) => a.place - b.place);
  const win  = rows[0];
  const winner = win ? byId.get(String(win.member_id)) : null;

  return `
    <div class="card results-card ${fresh ? "reveal" : ""}">
      <div class="card-title">Result</div>

      ${winner ? `
        <div class="winner-block">
          <span class="winner-trophy" aria-hidden="true">🏆</span>
          <span class="winner-name">${esc(winner.display_name)}</span>
          <span class="winner-label">Winner${event?.name ? " · " + esc(event.name) : ""}</span>
        </div>` : ""}

      <div class="order-head" aria-hidden="true">
        <span>Pos</span><span>Racer</span><span class="oh-r">Time</span>
      </div>
      <div class="order-list">
        ${rows.map((r, i) => {
          const m = byId.get(String(r.member_id));
          return `
            <div class="order-row ${r.place === 1 ? "first" : ""}" style="--i:${i}">
              <span class="order-place">${r.place === 1 ? "1st" : ordinal(r.place)}</span>
              <span class="order-name">${esc(m?.display_name || "Unknown")}</span>
              <span class="order-time">${r.finish_ms != null ? (r.finish_ms / 1000).toFixed(2) + "s" : ""}</span>
            </div>`;
        }).join("")}
      </div>

      <div class="row-end">
        <a class="btn ghost small" href="#/arena">Back to Arena</a>
        ${canEdit() ? `<button class="btn ghost small" id="arena-replay">Replay</button>` : ""}
        ${canEdit() ? `<button class="btn small" id="arena-start">Run again</button>` : ""}
        ${canEdit() ? `<button class="btn danger small" id="arena-clear">Clear result</button>` : ""}
      </div>
    </div>`;
}

function ordinal(n) {
  const r = n % 100;
  if (r >= 11 && r <= 13) return `${n}th`;
  return n + (["th", "st", "nd", "rd"][n % 10] || "th");
}

/**
 * Throw away a result and put the event back on the start line.
 *
 * For the case this exists for - "that run was a test" - the seed goes too,
 * so the next race is a genuinely new one rather than a replay of the test.
 * The broadcast is reset in the same breath, otherwise a winner card would
 * still be sitting on the OBS scene for an event that no longer has a result.
 *
 * The participants and their sprites are untouched: clearing a result must
 * not cost you the line-up you spent ten minutes setting up.
 */
async function clearResult(view, event) {
  if (!confirm("Delete this race result? The line-up and sprites are kept.")) return;

  try {
    const { error } = await db().from("arena_results").delete().eq("event_id", event.id);
    if (error) throw error;

    const back = { status: "setup", seed: null, completed_at: null };
    try {
      // Reset the broadcast too, where those columns exist.
      await updateRow("arena_events", event.id,
        { ...back, bc_state: "idle", bc_started_at: null, bc_offset_ms: 0 });
    } catch {
      // No broadcast columns yet - the result still clears.
      await updateRow("arena_events", event.id, back);
    }

    toast("Result cleared");
    render(view);
  } catch (err) {
    toast(err.message || "Could not clear the result", true);
  }
}

/** Replace the stored result, and mark the event final. */
async function saveResults(event, sim, seed) {
  try {
    const { error: wipe } = await db().from("arena_results").delete().eq("event_id", event.id);
    if (wipe) throw wipe;

    const rows = sim.order.map((o) => ({
      event_id: event.id,
      member_id: o.racer.id,
      place: o.place,
      finish_ms: o.finishMs,
    }));
    const { error } = await db().from("arena_results").insert(rows);
    if (error) throw error;

    await updateRow("arena_events", event.id, {
      status: "complete",
      seed,
      completed_at: new Date().toISOString(),
    });
    toast("Result saved");
  } catch (err) {
    // A member watching a race must not see a scary failure: the race still
    // happened and the order is on screen, it just is not theirs to store.
    if (canEdit()) toast(err.message || "Could not save the result", true);
  }
}
