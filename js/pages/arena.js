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
/* The DFL Pet is a member's racer sprite. This import was missed when the
   pet landed, so runRace() threw ReferenceError on its first statement -
   which is why Start did nothing at all from v1.69.0 onward. */
import { petOf } from "./profile-dfl.js";
import { backgroundMotion, createArenaRenderer, createFinishPresentation, createReactionTimeline, presentationRacerFrame, presentationScreenRatio } from "../arena/pixi-runtime.js";
import { getReduceRaceMotion, onReduceRaceMotionChange, setReduceRaceMotion } from "../store.js";
import { addControl, editControls, wireInline, canEdit, visible, hiddenClass } from "../inline.js";
import { currentMember } from "../members.js";
import { themeLabel, slotsFor, assignSprites, spriteMarkup,
         toSpritePng, MAX_SPRITE_UPLOAD } from "../arena/sprites.js";
import { simulate, dramatize, callouts, visualEvents, intensityAt, boardState, newSeed, ticksFor, raceSeconds, TICK_MS,
         crossingSpeeds, presentFinish, raceShot } from "../arena/race.js";

const raceMotionClass = () => getReduceRaceMotion() ? "race-motion-reduced" : "race-motion-full";
const applyRaceMotionClass = (element, reduced = getReduceRaceMotion()) => {
  element?.classList.toggle("race-motion-reduced", reduced);
  element?.classList.toggle("race-motion-full", !reduced);
};

/*
  A MEMBER'S ARENA PAGE IS THE WAITING ROOM.

  The clean 16:9 broadcast route already owns the realtime subscription and
  the polling fallback. Reusing that viewer keeps one shared clock and one
  playback loop. While an event is idle, members can inspect the line-up here;
  the moment the commissioner starts, this watcher moves them into the shared
  viewer automatically.
*/
let sharedWatch = null;

function stopSharedWatch() {
  if (!sharedWatch) return;
  clearInterval(sharedWatch.poll);
  sharedWatch.channel?.unsubscribe?.();
  sharedWatch = null;
}

function enterSharedRace(event) {
  if (!event || !["running", "paused", "finished"].includes(event.bc_state)) return false;
  stopSharedWatch();
  location.hash = `#/broadcast?id=${event.id}`;
  return true;
}

function watchSharedRace(eventId) {
  stopSharedWatch();

  const accept = (event) => enterSharedRace(event);
  const channel = db().channel(`arena-wait-${eventId}`)
    .on("postgres_changes", {
      event: "UPDATE", schema: "public", table: "arena_events",
      filter: `id=eq.${eventId}`,
    }, (payload) => accept(payload.new))
    .subscribe();

  const poll = setInterval(async () => {
    try {
      const { data } = await db().from("arena_events")
        .select("id,bc_state").eq("id", eventId).maybeSingle();
      accept(data);
    } catch { /* Realtime is primary; the next poll can try again. */ }
  }, 1500);

  sharedWatch = { channel, poll };
}

export function leave() {
  stopSharedWatch();
}

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

  // A member opening an already-live event goes straight to the shared view.
  if (!canEdit() && enterSharedRace(event)) return;

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
    /* Tell the broadcast which race this is, so a stream that is already
       open follows the same recording instead of inventing its own. It is
       admin-only at the database, so a member's press simply races here. */
    try {
      await updateRow("arena_events", event.id, {
        seed,
        bc_state: "running",
        bc_started_at: new Date(Date.now() + COUNTDOWN_MS).toISOString(),
        bc_offset_ms: 0,
      });
      event.seed = seed;
    } catch { /* not an admin: local race only */ }
    await runRace(view, stage, event, parts, byId, seed, { save: !replay });
  });

  /* The line-up wiring is no longer admin-only, because a member now has one
     control in it: the picker on their own lane. Everything else inside
     wireLineup is still guarded - the add, remove, colour, PNG and re-roll
     controls are not RENDERED for a non-admin, and the database refuses them
     regardless. Gating the listener as well meant the member's own picker
     silently did nothing. */
  wireLineup(view, event, parts, members, () => render(view));
  if (canEdit()) {
    wireBroadcast(view, stage, event, parts, byId, () => render(view));
  } else {
    watchSharedRace(event.id);
  }

  if (!results.length) {
    stage.innerHTML = canEdit() ? `
      <div class="arena-ready">
        <strong>${parts.length < 2 ? "Line-up needed" : "Race ready"}</strong>
        <span>${parts.length < 2
          ? "Add at least two racers below."
          : "Use Race controls below to start the shared race."}</span>
      </div>` : `
      <div class="arena-ready is-waiting" role="status">
        <strong>Waiting for the commissioner</strong>
        <span>This page will open the shared race automatically when it starts.</span>
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
  /* YOUR OWN LANE. Choosing what you look like is the fun of the Arena and
     it used to be one person's job for twelve people. A member gets the
     picker on their own row only - and the database agrees, because the
     write goes through arena_pick_racer() which will only ever touch the
     calling member's row. The UI is the convenience; the RPC is the rule. */
  const meId = String(currentMember()?.id || "");
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
            ${!admin && meId && String(p.member_id) === meId ? `
              <select class="lane-pick" data-my-sprite="${p.id}" data-event="${event.id}"
                      aria-label="Pick your racer">
                <option value="">— pick your racer —</option>
                ${slotsFor(event.theme).map((sl) =>
                  `<option value="${esc(sl.key)}" ${sl.key === p.sprite ? "selected" : ""}>${esc(sl.label)}</option>`).join("")}
              </select>` : ""}
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
    const mine = e.target.closest("[data-my-sprite]");

    /*
      A member picking their own racer. Not updateRow(): that writes to
      arena_participants, which is admin-write, so it would be refused - and
      row level security refuses by matching zero rows rather than by
      erroring, so it would have been refused SILENTLY and the picker would
      have looked like it worked. The RPC returns how many rows it changed
      and 0 is reported as the failure it is.
    */
    if (mine) {
      const select = mine;
      select.disabled = true;
      try {
        const { data, error } = await db().rpc("arena_pick_racer", {
          p_event_id: Number(select.dataset.event),
          p_sprite: select.value || null,
        });
        if (error) throw error;
        if (!data) throw new Error("You are not in this race.");
        toast(select.value ? "Racer picked" : "Back to the default racer");
        refresh();
      } catch (err) {
        toast(/function|does not exist/i.test(err.message || "")
          ? "Run arena_pick_racer_schema.sql in Supabase"
          : (err.message || "Could not pick that racer"), true);
        select.disabled = false;
      }
      return;
    }

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
  The commissioner's control panel for the shared race.

  Nothing here draws a race - it only writes state to the event row, and the
  broadcast page (and any phone watching) derives everything from that. So
  the panel works from anywhere with signal, including a phone in a bar, and
  the machine running OBS never needs to be touched once the scene is set.

  The browser-source URL stays copyable for one-time OBS setup. The operator
  controls the shared race here; there is no second "Open broadcast" action
  competing with those controls.
*/
function broadcastCard(event, parts) {
  if (!canEdit()) return "";

  const url = `${location.origin}${location.pathname}#/broadcast?id=${event.id}`;
  const state = event.bc_state || "idle";
  const running = state === "running";
  const paused = state === "paused";
  const finished = state === "finished";
  const ready = parts.length >= 2;
  const statusLabel = running ? "Race live" : paused ? "Race paused" : finished ? "Race finished" : "Ready to race";
  const statusHelp = !ready ? "Add at least two racers to begin." :
    running ? "The shared race is moving on every viewer." :
    paused ? "Viewers are holding on the same frame." :
    finished ? "Review the finish, save it, or reset for another run." :
    "All viewers are waiting at the starting line.";

  return `
    <section class="card bc-panel" aria-labelledby="bc-console-title">
      <header class="bc-console-head">
        <div>
          <span class="eyebrow">Commissioner console</span>
          <h2 id="bc-console-title">Race control</h2>
          <p class="muted tiny">${esc(statusHelp)}</p>
        </div>
        <div class="bc-state bc-state--${esc(state)}" role="status">
          <span class="bc-state-dot" aria-hidden="true"></span>
          <span>${esc(statusLabel)}</span>
        </div>
      </header>

      <div class="bc-launch">
        <div>
          <strong>1. Put the race on screen</strong>
          <span class="muted tiny">Opens the public starting grid without beginning the race.</span>
        </div>
        <button class="btn ghost" id="bc-open" data-viewer-url="${esc(url)}">Open race view</button>
      </div>

      <div class="bc-command">
        <button class="btn bc-primary" id="bc-start" ${ready ? "" : "disabled"}>
          <span>${running || paused || finished ? "Run race again" : "Start race"}</span>
          <small>${ready ? `${parts.length} racers · shared live` : "Lineup incomplete"}</small>
        </button>
        <div class="bc-transport" aria-label="Race transport controls">
          <button class="btn ghost" id="bc-pause" ${running || paused ? "" : "disabled"}>${paused ? "Resume race" : "Pause race"}</button>
          <button class="btn ghost" id="bc-skip" ${running || paused ? "" : "disabled"}>Finish now</button>
        </div>
      </div>

      <div class="bc-console-foot">
        <fieldset class="bc-view-options">
          <legend>Viewer display</legend>
          <label><input type="checkbox" id="bc-board-t" ${event.bc_show_board === false ? "" : "checked"}> Leaderboard</label>
          <label><input type="checkbox" id="bc-timer-t" ${event.bc_show_timer === false ? "" : "checked"}> Race clock</label>
          <label><input type="checkbox" id="bc-motion-t" ${getReduceRaceMotion() ? "checked" : ""}> Reduce race motion/effects</label>
        </fieldset>
        <div class="bc-result-actions">
          <button class="btn ghost small" id="bc-save" ${finished && ready ? "" : "disabled"}>Save result</button>
          <button class="btn ghost small danger" id="bc-reset" ${state === "idle" ? "disabled" : ""}>Reset race</button>
        </div>
      </div>

      <details class="bc-setup">
        <summary>Viewer / OBS link</summary>
        <p class="muted tiny">This public link opens directly into the race view. No profile is required.</p>
        <div class="bc-url">
          <input id="bc-url" type="text" readonly aria-label="Public race viewer URL" value="${esc(url)}">
          <button class="btn ghost small" id="bc-copy">Copy link</button>
        </div>
      </details>
    </section>`;
}

/** Seconds of countdown before the racers move. */
const COUNTDOWN_MS = 2700;
const COUNTDOWN_STEP_MS = 900;

/*
   IS A PARAMETER, and it has to be.

  This is a top-level function; the stage element is a const inside
  render(). Reaching for it here threw ReferenceError the moment #bc-start
  was clicked - AFTER the database write had already gone through - so the
  broadcast started, the Arena did nothing, and the button looked dead.
*/
function wireBroadcast(view, stage, event, parts, byId, refresh) {
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

  const updateSharedEvent = async (patch) => {
    const { data, error } = await db().from("arena_events")
      .update(patch).eq("id", event.id).select("*").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Shared race update was rejected. Re-run arena_schema.sql and sign in as commissioner.");
    Object.assign(event, data);
    return data;
  };

  const write = async (patch, note) => {
    try {
      await updateSharedEvent(patch);
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

    if (t.closest("#bc-open")) {
      /*
        Opening the screen and starting the clock are deliberately separate.
        Create the window during the click so popup blockers allow it, reset
        the shared viewer to the starting grid, then navigate it only after
        the reset has been confirmed by Supabase.
      */
      const url = t.closest("#bc-open").dataset.viewerUrl;
      const raceWindow = window.open("about:blank", "dfl-race-view", `popup=yes,width=${screen.availWidth},height=${screen.availHeight},left=0,top=0`);
      if (!raceWindow) {
        toast("Allow pop-ups to open the race view", true);
        return;
      }
      raceWindow.document.title = "Preparing race…";
      try {
        await updateSharedEvent({ bc_state: "idle", bc_started_at: null, bc_offset_ms: 0 });
        raceWindow.location.replace(url);
        toast("Race view opened at the starting line");
        refresh();
      } catch (err) {
        raceWindow.close();
        toast(err.message || "Could not prepare the race view", true);
      }
      return;
    }

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
      if (panel.dataset.raceBusy === "true") return;
      panel.dataset.raceBusy = "true";
      const startButton = panel.querySelector("#bc-start");
      if (startButton) startButton.disabled = true;
      /*
        THIS BUTTON USED TO ONLY TELL THE OTHER SCREEN TO RACE.

        It wrote bc_state to the database, which the /broadcast page picks
        up - and then refresh() re-rendered this page. So on the Arena the
        operator pressed "Start race", saw a toast, and watched nothing
        happen. The race was real, it was just somewhere else.

        Now one press starts BOTH: the broadcast row is written so the OBS
        page follows, and the same seed is played here immediately. Same
        seed means simulate() returns the same recording, so the two views
        are two cameras on one race rather than two races.

        The write is deliberately NOT the `write()` helper: that calls
        refresh(), which would rebuild the page and throw away the stage
        this race is about to be drawn into.
      */
      const seed = newSeed();
      try {
        await updateSharedEvent({
          seed,
          bc_state: "running",
          bc_started_at: new Date(Date.now() + COUNTDOWN_MS).toISOString(),
          bc_offset_ms: 0,
        });
      } catch (err) {
        console.warn("arena: shared race not updated", err);
        toast(err.message || "The shared race could not start", true);
        delete panel.dataset.raceBusy;
        if (startButton) startButton.disabled = parts.length < 2;
        return;
      }
      for (const id of ["#bc-pause", "#bc-skip", "#bc-reset"]) {
        const control = panel.querySelector(id);
        if (control) control.disabled = false;
      }
      const completed = await runRace(view, stage, event, parts, byId, seed, { save: true });
      if (completed) refresh();
      else if (panel.isConnected) {
        delete panel.dataset.raceBusy;
        if (startButton) startButton.disabled = parts.length < 2;
      }
      return;
    }

    if (t.closest("#bc-pause")) {
      try {
        const resuming = event.bc_state === "paused";
        await updateSharedEvent(resuming ? {
          bc_state: "running",
          bc_started_at: new Date().toISOString(),
          bc_offset_ms: event.bc_offset_ms || 0,
        } : {
          bc_state: "paused",
          bc_offset_ms: Math.max(0, Math.round(elapsedNow())),
        });
        const button = panel.querySelector("#bc-pause");
        if (button) button.textContent = resuming ? "Pause race" : "Resume race";
        const state = panel.querySelector(".bc-state");
        if (state) {
          state.className = `bc-state bc-state--${event.bc_state}`;
          state.querySelector("span:last-child").textContent = resuming ? "Race live" : "Race paused";
        }
        toast(resuming ? "Resumed" : "Paused");
      } catch (err) {
        toast(err.message || "Could not update the race", true);
      }
      return;
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
    if (e.target.id === "bc-motion-t") {
      setReduceRaceMotion(e.target.checked);
      view.querySelectorAll(".arena-track-wrap, .bc-stage").forEach((el) => applyRaceMotionClass(el, e.target.checked));
      toast(e.target.checked ? "Race effects reduced on this device" : "Full race effects restored");
    }
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
  const racers = parts.map((p, i) => {
    /*
      THE DFL PET IS THE RACER, when the member has made one.

      Presentation only: the sprite key and the lane colour are the only
      things that change. simulate() never sees any of this - it is handed
      an array of ids and lengths, so the winner, the finish times and the
      order are byte for byte what they were. A member with no pet falls
      back to whatever the participant row already said.
    */
    const pet = petOf(byId.get(String(p.member_id)));
    return {
      id: p.member_id,
      name: byId.get(String(p.member_id))?.display_name || "Unknown",
      sprite: pet?.species || p.sprite,
      image: pet ? null : p.sprite_image,
      color: pet?.color || p.color || laneColor(i),
      pet,
      number: p.number ?? i + 1,
    };
  });

  const sim = simulate(racers, ticks, seed);
  /*
    THE RESULT COMES FROM sim.order; THE PICTURE COMES FROM shown.

    dramatize() adds overtakes, surges and stalls to the DRAWING only, and
    its wobble is zero by the finish line - so the race is livelier and the
    winner is still exactly who simulate() decided, which is what is
    already saved in arena_results for completed events.
  */
  const { shown, events } = dramatize(sim, seed);
  const calls = callouts(sim, shown, racers, events);
  /* Scanned once, before a frame is drawn - see visualEvents(). The loop
     below only walks this queue, so nothing is compared per frame. */
  const visuals = visualEvents(sim, shown, racers);
  const pixiTimeline = createReactionTimeline(events, visuals, racers.length);

  stage.innerHTML = `
    <div class="arena-track-wrap cinematic-race ${raceMotionClass()}" data-theme="${esc(event.theme || "stadium")}">
      <div class="race-scenery" aria-hidden="true">
        <svg class="arena-effect-defs" width="0" height="0" focusable="false" aria-hidden="true">
          <filter id="arena-motion-blur" x="-12%" y="-4%" width="124%" height="108%" color-interpolation-filters="sRGB">
            <feGaussianBlur data-arena-motion-blur stdDeviation="0 0" edgeMode="duplicate"></feGaussianBlur>
          </filter>
        </svg>
        <div class="race-sky"></div><div class="race-hills far"></div>
        <div class="race-hills near"></div><div class="race-crowd"></div>
      </div>
      <div class="scoreboard">
        <span class="sb-brand">DFL ARENA</span>
        <span class="sb-status" id="sb-status">On the line</span>
        <span class="sb-clock" id="sb-clock">0.0s</span>
      </div>

      <div class="track" id="track">
        <div class="track-start"></div>
        <div class="track-finish"></div>
        ${racers.map((r, i) => `
          <div class="lane" style="--lane:${i};--lanes:${racers.length};--lane-y:${(10 + ((i + .5) / racers.length) * 80).toFixed(2)}%">
            <div class="runner trail-${esc(r.pet?.trail || "none")}" id="runner-${i}">
              <div class="runner-art" style="--racer:${esc(r.color)};--pet-accent:${esc(r.pet?.accent || "#ffffff")}">
                ${spriteMarkup(event.theme, r.sprite, r.color, r.image, r.pet)}
              </div>
              <!--
                ONE NAME TAG PER RACER, and it is the original .lane-tag.

                A second badge (.runner-nameplate) had been added inside the
                runner while this one was left switched off with display:none
                in the cinematic rules. The original is switched back on and
                lives inside .runner instead of the lane, so it travels with
                its racer rather than labelling an empty strip of track.
              -->
              <span class="lane-tag" style="--racer:${esc(r.color)}"><b>${r.number}</b>${esc(r.name)}</span>
            </div>
          </div>`).join("")}
      </div>

      <div class="countdown hidden" id="countdown"><span id="countdown-n">3</span></div>
    </div>

    <!--
      THE LIVE BOARD. Order comes from the DRAWN race so it matches what is
      on screen; the times come from sim.order, which is the truth. Rows are
      absolutely positioned and moved with a transform, so a change of
      position is a transition rather than a re-render - and the DOM is
      built once, never rebuilt per frame.
    -->
    <ol class="ar-board" id="ar-board" style="--rows:${racers.length}">
      ${racers.map((r, i) => `
        <li class="ar-row" id="ar-row-${i}" style="--racer:${esc(r.color)}">
          <span class="ar-pos"></span>
          <span class="ar-who">${esc(r.name)}</span>
          <span class="ar-time"></span>
        </li>`).join("")}
    </ol>
    <div id="arena-result-slot"></div>
  `;

  const runners = racers.map((_, i) => stage.querySelector(`#runner-${i}`));

  /*
    ARENA DEBUG, behind ?debug=arena. Off by default and shipped that way
    on purpose: proving the pipeline fires is exactly the thing that was
    hard to do from the outside, and deleting the tool after one use means
    doing it again from scratch next time.
  */
  const debugOn = /[?&]debug=arena/.test(location.search) || /[?&]debug=arena/.test(location.hash);
  let dbg = null;
  if (debugOn) {
    dbg = document.createElement("pre");
    dbg.className = "arena-debug";
    stage.appendChild(dbg);
  }
  const counts = { surge: 0, stumble: 0, jump: 0, swap: 0, near: 0 };
  const status  = stage.querySelector("#sb-status");
  const clock   = stage.querySelector("#sb-clock");
  const slot    = stage.querySelector("#arena-result-slot");

  const finish = async () => {
    status.textContent = "Final";
    stage.querySelector("#track")?.classList.remove("is-running");
    /* The winner's celebration is added by the cascade the moment they
       actually cross, not here - by the time this runs the last racer is
       home and the moment has passed. */
    slot.innerHTML = resultsCard(
      sim.order.map((o) => ({ member_id: o.racer.id, place: o.place, finish_ms: o.finishMs })),
      byId, event, { fresh: true });
    if (save) await saveResults(event, sim, seed);
  };

  /* Keep the race in view while leaving the commissioner console stable.
     Controls no longer collapse or change location during an active run. */
  let reducedMotionEffects = getReduceRaceMotion();
  const raceWrap = stage.querySelector(".arena-track-wrap");
  applyRaceMotionClass(raceWrap, reducedMotionEffects);
  raceWrap.dataset.shot = "wide";        // the establishing shot, before GO
  const stopMotionWatch = onReduceRaceMotionChange((reduced) => {
    reducedMotionEffects = reduced;
    applyRaceMotionClass(raceWrap, reduced);
  });
  stage.scrollIntoView({
    behavior: reducedMotionEffects ? "auto" : "smooth",
    block: window.matchMedia("(max-width: 720px)").matches ? "center" : "start",
  });

  const pixi = await createArenaRenderer(raceWrap, racers);
  const startGrid = racers.map((racer, lane) => ({
    id: racer.id, progress: 0, lane, leading: lane === 0, finished: false,
  }));
  await countdown(stage, (countdownMs) => pixi?.render({
    elapsedMs: 0, state: "idle", heat: 0, racers: startGrid, countdownMs, reduceMotionEffects: reducedMotionEffects,
  }));

  status.textContent = "Racing";
  stage.querySelector("#track")?.classList.add("is-running");
  const started = performance.now();
  let pausedFor = 0;
  let pausedAt = null;

  const completed = await new Promise((resolve) => {
    const lastFinish = sim.order.at(-1).finishMs;
    const total = lastFinish + 1_100;
    let nextCall = 0, calledAt = -9999, nextEvent = 0, nextVisual = 0;
    /* One timer-free expiry list. Effects are removed by the frame loop
       that added them, so nothing can outlive the race or stack up: at
       most one entry per racer per effect class. */
    const expiry = [];
    const rows    = racers.map((_, i) => stage.querySelector(`#ar-row-${i}`));
    const official = new Map(sim.order.map((o) => [o.index, o.finishMs]));
    /* Finishing place, for the post-finish parking spots. Straight off
       sim.order, so the spread is the real result and not a guess. */
    const placeOf = new Map(sim.order.map((o) => [o.index, o.place]));
    /* Real closing speed per racer, measured once. The coast starts from
       exactly this, which is what makes the crossing continuous. */
    const crossSpeed = crossingSpeeds(sim);
    let lastOrderKey = "";
    const homed = new Set();
    const track = stage.querySelector("#track");
    const scenery = stage.querySelector(".race-scenery");
    const sceneryBlur = stage.querySelector("[data-arena-motion-blur]");
    /*
      Composite racer travel instead of changing `left` every frame.
      Track width is measured only when the stage resizes; each animation
      frame writes one CSS variable consumed by translate3d on the runner.
    */
    let trackWidth = Math.max(1, track?.clientWidth || 1);
    const sizeWatcher = typeof ResizeObserver === "function" ? new ResizeObserver((entries) => {
      trackWidth = Math.max(1, entries[0]?.contentRect?.width || track?.clientWidth || 1);
    }) : null;
    sizeWatcher?.observe(track);
    for (const runner of runners) {
      runner?.style.setProperty("--race-x", `${(trackWidth * .03).toFixed(2)}px`);
      runner?.classList.add("is-positioned");
    }
    const stopPlayback = (value) => { sizeWatcher?.disconnect(); stopMotionWatch(); resolve(value); };
    /* A racer wearing a reaction, and when it expires. The class drives a
       CSS keyframe on the character; nothing here moves anything. */
    const reacting = new Map();
    let sceneryBlurX = 0;
    let leader = -1;
    /* When the lead last actually changed hands, which is one of the few
       moments worth dropping the camera to track level for. */
    let lastLeadChangeMs = null;

    function frame(now) {
      /* A Pause, Reset, route change, or re-render detaches this stage.
         Stop the old loop before it can write classes or save a ghost result. */
      if (!stage.isConnected) { stopPlayback(false); return; }
      if (event.bc_state === "paused") {
        if (pausedAt == null) pausedAt = now;
        track?.classList.remove("is-running");
        status.textContent = "Paused";
        requestAnimationFrame(frame);
        return;
      }
      if (pausedAt != null) {
        pausedFor += now - pausedAt;
        pausedAt = null;
        track?.classList.add("is-running");
      }
      const elapsed = now - started - pausedFor;
      const t = Math.min(sim.frames, elapsed / TICK_MS);
      const lo = Math.floor(t), hi = Math.min(sim.frames, lo + 1), mix = t - lo;

      let leaderProgress = 0;
      for (const samples of shown) {
        const progress = (samples[lo] ?? 0) + ((samples[hi] ?? samples[lo] ?? 0) - (samples[lo] ?? 0)) * mix;
        leaderProgress = Math.max(leaderProgress, progress);
      }
      const finishPresentation = createFinishPresentation({
        elapsedMs: elapsed, leaderProgress, order: sim.order, racers,
      });
      const visualT = Math.min(sim.frames, finishPresentation.visualElapsedMs / TICK_MS);
      const visualLo = Math.floor(visualT);
      const visualHi = Math.min(sim.frames, visualLo + 1);
      const visualMix = visualT - visualLo;
      raceWrap.dataset.camera = finishPresentation.camera.state;
      raceWrap.style.setProperty("--finish-camera", finishPresentation.camera.mix.toFixed(4));

      const pixiRacers = [];
      for (let i = 0; i < runners.length; i++) {
        const s = shown[i];                            // drawn, not decided
        const pixiRacer = presentationRacerFrame({
          id: racers[i].id, lane: i, samples: s, lo: visualLo, hi: visualHi, mix: visualMix,
          elapsedMs: finishPresentation.visualElapsedMs, officialFinishMs: official.get(i), timeline: pixiTimeline,
        });
        const p = pixiRacer.progress;                  // interpolate between ticks

        /*
          THE COAST, WRITTEN OVER THE SHARED ADAPTER'S ONE NUMBER.

          presentationRacerFrame() parks every finisher at the same
          `1 + 0.2`, which is why twelve racers ended up on one coordinate.
          The frame payload is built here, so the per-place spot is
          substituted before either renderer sees it - Pixi positions from
          `displayProgress`, so this is all it takes to spread them out.

          `progress` is left exactly as it was: the board, the callouts and
          the result all read that one, and only the DRAWN position moves.
        */
        presentFinish(pixiRacer, {
          elapsedMs: finishPresentation.visualElapsedMs,
          finishMs: official.get(i),
          place: placeOf.get(i),
          crossSpeed: crossSpeed[i],
          celebrating: finishPresentation.celebrationActive,
        });
        const phase = pixiRacer.phase;

        const screenRatio = presentationScreenRatio(pixiRacer.displayProgress, finishPresentation.camera);
        /* The runner element carries the name tag, so it has to track the
           racer whether or not Pixi is drawing the character. The art
           inside it is already hidden by the Pixi handoff, so this moves a
           label and nothing else - it does not animate a second racer. */
        runners[i].style.setProperty("--race-x", `${(trackWidth * screenRatio).toFixed(2)}px`);
        if (runners[i].dataset.phase !== phase) runners[i].dataset.phase = phase;
        if (pixiRacer.finished) runners[i].classList.add("is-home");
        pixiRacers.push(pixiRacer);
      }
      const pixiLeader = pixiRacers.reduce((best, row) => row.progress > best.progress ? row : best, pixiRacers[0]);
      if (pixiLeader) pixiLeader.leading = true;
      if (scenery) scenery.style.setProperty("--race-pan", Math.min(1, leaderProgress).toFixed(4));

      /*
        THE CHARACTERS REACT TO THE SAME EVENTS THE COMMENTARY DOES.
        dramatize() stamped each moment with the tick the racer reached it,
        so the word, the animation and the movement land together instead
        of three systems each having their own opinion.
      */
      while (nextEvent < events.length && elapsed >= events[nextEvent].ms) {
        const ev = events[nextEvent++];
        counts[ev.kind] = (counts[ev.kind] || 0) + 1;
        const el = runners[ev.racer];
        if (el) {
          el.classList.remove("is-surge", "is-stumble");
          el.classList.add(ev.kind === "stumble" ? "is-stumble" : "is-surge");
          reacting.set(ev.racer, elapsed + ev.durMs);
        }
      }
      for (const [i, until] of reacting) {
        if (elapsed > until) {
          runners[i]?.classList.remove("is-surge", "is-stumble");
          reacting.delete(i);
        }
      }

      /*
        THE VISUAL QUEUE. Precomputed, so this is a walk rather than a
        search: while the next event is due, apply it and move on.
      */
      while (nextVisual < visuals.length && elapsed >= visuals[nextVisual].ms) {
        const ev = visuals[nextVisual++];
        counts[ev.kind] = (counts[ev.kind] || 0) + 1;
        const hot = ev.intensity >= 0.6;
        if (ev.kind === "jump") {
          const el = runners[ev.racer];
          if (el) { el.classList.add("is-jump"); expiry.push([el, "is-jump", elapsed + ev.durMs]); }
          const row = rows[ev.racer];
          if (row) { row.classList.add("ar-jump"); expiry.push([row, "ar-jump", elapsed + ev.durMs]); }
          /* The callout line is shared with the commentary, and a jump is
             the more interesting thing to be saying. */
          if (ev.text && elapsed - calledAt > 1800) { status.textContent = ev.text; calledAt = elapsed; }
        } else if (ev.kind === "swap") {
          for (const i of [ev.racer, ev.other]) {
            const el = runners[i];
            /*
              TWO CALLS, NOT ONE STRING. classList.add("is-duel is-hot")
              throws InvalidCharacterError - DOMTokenList rejects spaces -
              and because this runs inside the rAF callback, that exception
              killed the whole animation loop the first time two racers
              traded places. Everything after it stopped: positions, the
              board, the cascading finishes, the callouts. The race simply
              froze, which is exactly what "the animations do not show"
              looked like from the outside.
            */
            if (el) {
              el.classList.add("is-duel");
              if (hot) el.classList.add("is-hot");
              expiry.push([el, "is-duel", elapsed + ev.durMs]);
            }
          }
        } else if (ev.kind === "near") {
          for (const i of [ev.racer, ev.other]) {
            const el = runners[i];
            if (el) { el.classList.add("is-near"); expiry.push([el, "is-near", elapsed + ev.durMs]); }
          }
        }
      }
      /* Expire in place. No setTimeout per effect, so a chaotic pack
         cannot leave a hundred timers running after the race. */
      for (let k = expiry.length - 1; k >= 0; k--) {
        if (elapsed >= expiry[k][2]) {
          expiry[k][0].classList.remove(expiry[k][1], "is-hot");
          expiry.splice(k, 1);
        }
      }

      /* FINAL STRETCH. A curve on the track element, read by CSS - one
         write when it changes band, not sixty a second. */
      const heat = intensityAt(shown, lo);
      const band = heat > .66 ? "3" : heat > .33 ? "2" : heat > 0 ? "1" : "0";
      if (track && track.dataset.heat !== band) track.dataset.heat = band;
      /* Genuine X-axis-only background blur. It is applied to the existing
         scenery layer, never the track, racers, labels, board, or finish. */
      const backdrop = backgroundMotion("running", heat, finishPresentation.celebrationActive, reducedMotionEffects);
      sceneryBlurX += (backdrop.blurX - sceneryBlurX) * .16;
      sceneryBlur?.setAttribute("stdDeviation", `${sceneryBlurX.toFixed(2)} ${backdrop.blurY.toFixed(2)}`);
      raceWrap?.style.setProperty("--arena-motion", backdrop.intensity.toFixed(3));
      pixi?.render({
        elapsedMs: elapsed,
        state: finishPresentation.celebrationActive ? "finished" : "running",
        heat: Number(band),
        racers: pixiRacers,
        winnerId: sim.order[0].racer.id,
        finish: finishPresentation,
        reduceMotionEffects: reducedMotionEffects,
      });

      /*
        THE BOARD. Ranked by drawn position while running, but a racer who
        has FINISHED is pinned by their official finish time - otherwise a
        pack all sitting at 1.0 would sort arbitrarily and the final order
        could contradict the result.
      */
      /* ONE authority - see boardState() in race.js. The broadcast asks
         the same function with the same arguments, so the two boards
         cannot disagree about the order, the gaps or who is home. */
      const board = boardState(sim, shown, elapsed);
      const order = board.map((r) => r.index);

      const key = order.join(",");
      if (key !== lastOrderKey) {
        /* Only when it actually changes - twelve transform writes on a
           change, not on every one of sixty frames a second. */
        order.forEach((racerIdx, place) => {
          const row = rows[racerIdx];
          if (!row) return;
          const wasPlace = Number(row.dataset.place ?? place);
          row.style.transform = `translateY(calc(var(--row-h) * ${place}))`;
          row.querySelector(".ar-pos").textContent = place + 1;
          row.dataset.place = place;
          if (place !== wasPlace) {
            row.classList.remove("ar-up", "ar-down");
            /* Force the class to re-apply so a racer moving twice in quick
               succession flashes twice rather than once. */
            void row.offsetWidth;
            row.classList.add(place < wasPlace ? "ar-up" : "ar-down");
          }
          row.classList.toggle("is-first", place === 0);
        });
        lastOrderKey = key;
      }

      /*
        CASCADING FINISHES. Each racer crosses on their OWN official time,
        gets their moment, and the rest keep racing - the loop already ran
        to the last finisher, but nothing marked the individual arrivals.
      */
      for (let i = 0; i < racers.length; i++) {
        const ms = official.get(i);
        if (homed.has(i) || elapsed < ms) continue;
        homed.add(i);
        const row = rows[i];
        if (row) {
          row.classList.add("is-home");
          row.querySelector(".ar-time").textContent =
            board.find((b) => b.index === i)?.label || "";
        }
        runners[i]?.classList.remove("is-surge", "is-stumble");
        runners[i]?.classList.add("is-finished");
      }

      if (finishPresentation.celebrationActive) {
        const winner = runners[sim.order[0].index];
        winner?.classList.remove("is-finished");
        winner?.classList.add("is-winner");
        raceWrap?.classList.add("has-winner");
      }

      /* Whoever is visually in front wears it, so the leader is readable
         at a glance even on a phone-sized track. */
      const top = order[0];
      if (top !== leader) {
        if (leader >= 0) {
          runners[leader]?.classList.remove("is-leading");
          /* Only a genuine change of hands counts - not the first frame,
             where nobody held the lead to begin with. */
          lastLeadChangeMs = elapsed;
        }
        runners[top]?.classList.add("is-leading");
        leader = top;
      }

      /*
        THE SHOT. A flat 2D framing chosen once a frame and written to the
        wrapper; the CSS transform on .track does the rest. It cannot move
        a racer - progress is already on screen by the time this runs, and
        nothing here is fed back into the renderer.
      */
      const shot = raceShot({
        leaderProgress,
        celebrating: finishPresentation.celebrationActive,
      });
      if (raceWrap.dataset.shot !== shot) raceWrap.dataset.shot = shot;

      /* Callouts replace the status word as they come due, and the last
         one stays up rather than flicking back - the scoreboard has one
         line and a race has a handful of moments. */
      while (nextCall < calls.length && elapsed >= calls[nextCall].ms) {
        status.textContent = calls[nextCall].text;
        calledAt = elapsed;
        nextCall++;
      }

      // Stops on the last finish rather than running on to the extra beat
      // the animation holds for before the result appears.
      clock.textContent = (Math.min(elapsed, lastFinish) / 1000).toFixed(1) + "s";
      /* "Final stretch" only if a callout is not currently holding the
         line - a call that is two seconds old is still the more
         interesting thing to be saying. */
      if (elapsed > total * 0.82 && elapsed - calledAt > 2200) status.textContent = "Final stretch";

      if (dbg) {
        const live = {};
        for (const el of runners) for (const c of el?.classList || [])
          if (c.startsWith("is-")) live[c] = (live[c] || 0) + 1;
        dbg.textContent =
          `ARENA DEBUG
` +
          `state    ${homed.size === racers.length ? "FINISHED" : "RACING"}
` +
          `progress ${Math.round(Math.min(1, elapsed / lastFinish) * 100)}%
` +
          `heat     ${track?.dataset.heat ?? "0"}
` +
          `finished ${homed.size}/${racers.length}

` +
          `surges ${counts.surge}  stumbles ${counts.stumble}
` +
          `jumps ${counts.jump}  swaps ${counts.swap}  near ${counts.near}

` +
          `active   ${Object.entries(live).map(([k, v]) => `${k}x${v}`).join(" ") || "none"}
` +
          `controls ${document.querySelector('[data-collapse="arena-broadcast"]')?.classList.contains("is-folded") ? "HIDDEN" : "visible"}`;
      }

      if (elapsed >= total) stopPlayback(true);
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  if (!completed) return false;
  await finish();
  slot.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return true;
}


function countdown(stage, onStep = null) {
  const box = stage.querySelector("#countdown");
  const num = stage.querySelector("#countdown-n");
  const status = stage.querySelector("#sb-status");
  /* This is a layout invariant, not a responsive approximation. Inline
     important properties prevent any earlier landscape rule from putting
     the countdown back into flex/grid flow and resizing the Pixi host. */
  box.style.setProperty("position", "absolute", "important");
  box.style.setProperty("inset", "0", "important");
  box.style.setProperty("z-index", "10", "important");
  box.style.setProperty("pointer-events", "none", "important");
  box.classList.remove("hidden");

  return new Promise((resolve) => {
    const steps = ["3", "2", "1", "GO!"];
    let i = 0;
    const tick = () => {
      if (!stage.isConnected) { resolve(); return; }
      const step = steps[i];
      onStep?.(Math.max(0, (steps.length - 1 - i) * COUNTDOWN_STEP_MS));
      num.textContent = step;
      num.classList.toggle("go", step === "GO!");
      num.style.animation = "none";
      void num.offsetWidth;
      num.style.animation = "";
      status.textContent = step === "GO!" ? "Away!" : "Set";
      if (step === "GO!") {
        /* The race and shared clock begin on GO, not after the overlay fades. */
        setTimeout(() => box.isConnected && box.classList.add("hidden"), 420);
        resolve();
        return;
      }
      i++;
      setTimeout(tick, COUNTDOWN_STEP_MS);
    };
    tick();
  });
}

// ------------------------------- results ------------------------------

function resultsCard(results, byId, event, { fresh = false } = {}) {
  const rows = [...results].sort((a, b) => a.place - b.place);
  const win  = rows[0];
  const winner = win ? byId.get(String(win.member_id)) : null;
  const winnerPet = petOf(winner);

  return `
    <div class="card results-card ${fresh ? "reveal" : ""}">
      <div class="card-title">Result</div>

      ${winner ? `
        <div class="winner-block">
          <span class="winner-trophy" aria-hidden="true">🏆</span>
          ${winnerPet ? `<span class="winner-pet" style="--racer:${esc(winnerPet.color || "#2fbf5f")}">${spriteMarkup(event?.theme, winnerPet.species, winnerPet.color, null, winnerPet)}</span>` : ""}
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
        ${canEdit() ? `<button class="btn ghost small" id="arena-replay">Replay locally</button>` : ""}
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

    const finalOffset = (sim.order.at(-1)?.finishMs ?? 0) + 400;
    await updateRow("arena_events", event.id, {
      status: "complete",
      seed,
      completed_at: new Date().toISOString(),
      bc_state: "finished",
      bc_started_at: new Date().toISOString(),
      bc_offset_ms: finalOffset,
    });
    toast("Result saved");
  } catch (err) {
    // A member watching a race must not see a scary failure: the race still
    // happened and the order is on screen, it just is not theirs to store.
    if (canEdit()) toast(err.message || "Could not save the result", true);
  }
}
