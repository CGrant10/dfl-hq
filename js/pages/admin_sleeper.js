// =====================================================================
// Admin -> Sleeper tab
// League ID, fast current-season sync, optional history repair, and a live log.
// =====================================================================

import { db } from "../supabase.js";
import { syncSleeper } from "../sync.js";
import { esc, toast, errorBox, fmtDate, loading } from "../ui.js";
import {
  SLEEPER_SYNC_DAYS,
  normalizeSleeperSchedule,
  sleeperScheduleByDay,
} from "../sleeper-sync-schedule.js";

function scheduleTimeRow(day, time = "12:00") {
  const name = SLEEPER_SYNC_DAYS[day];
  return `<div class="sl-schedule-time">
    <input type="time" value="${esc(time)}" data-sync-time data-day="${day}"
      aria-label="${name} sync time">
    <button class="sl-remove-time" type="button" data-remove-sync-time
      aria-label="Remove ${name} sync time">Remove</button>
  </div>`;
}

function scheduleDaysMarkup(slots) {
  const grouped = sleeperScheduleByDay(slots);
  return SLEEPER_SYNC_DAYS.map((name, day) => `
    <section class="sl-schedule-day" data-schedule-day="${day}">
      <div class="sl-schedule-day-head">
        <strong>${name}</strong>
        <button type="button" data-add-sync-time="${day}">+ Add time</button>
      </div>
      <div class="sl-schedule-times" data-times-for="${day}">
        ${grouped[day].map((time) => scheduleTimeRow(day, time)).join("")}
        <span class="sl-no-times" ${grouped[day].length ? "hidden" : ""}>No automatic sync</span>
      </div>
    </section>`).join("");
}

/** The show/hide checklist of everyone a sync has ever found. */
async function renderPeople(host) {
  const box = host.querySelector("#sl-people-list");
  if (!box) return;

  const { data, error } = await db().from("sleeper_users")
    .select("sleeper_user_id, display_name, team_name, hidden")
    .order("display_name", { ascending: true });

  if (error) {
    box.innerHTML = `<span class="warntext">${esc(error.message)}</span>
      <div class="muted tiny">Run <strong>members_schema.sql</strong> to add the hidden flag.</div>`;
    return;
  }
  if (!data?.length) { box.textContent = "Nobody synced yet."; return; }

  const shown = data.filter((u) => !u.hidden).length;
  box.innerHTML = `
    <div class="muted tiny" style="margin-bottom:8px">${shown} of ${data.length} shown</div>
    ${data.map((u) => `
      <label class="checkrow">
        <input type="checkbox" data-user="${esc(u.sleeper_user_id)}" ${u.hidden ? "" : "checked"}>
        <span>
          <strong>${esc(u.display_name)}</strong>
          ${u.team_name ? `<span class="muted tiny"> · ${esc(u.team_name)}</span>` : ""}
        </span>
      </label>`).join("")}
  `;
}

export async function renderSleeperPanel(host) {
  host.innerHTML = loading();

  let config;
  try {
    const { data, error } = await db().from("sleeper_config").select("*").eq("id", 1).single();
    if (error) throw error;
    config = data;
  } catch (err) {
    host.innerHTML = errorBox(err) +
      `<div class="card"><div class="card-body muted">If this says the table is missing, run
       <strong>sleeper_schema.sql</strong> in the Supabase SQL editor.</div></div>`;
    return;
  }

  const [{ count: seasonCount }, { count: matchupCount }, scheduleResult] = await Promise.all([
    db().from("sleeper_leagues").select("*", { count: "exact", head: true }),
    db().from("sleeper_matchups").select("*", { count: "exact", head: true }),
    db().rpc("sleeper_get_sync_schedule"),
  ]);
  const schedule = scheduleResult.error ? null : scheduleResult.data;
  const scheduleSlots = normalizeSleeperSchedule(schedule?.slots || []);
  const scheduleEnabled = schedule?.enabled ?? config.auto_sync_enabled ?? false;

  host.innerHTML = `
    <form class="card" id="sl-form">
      <div class="card-title">Sleeper league</div>
      <label for="sl-id">Sleeper League ID</label>
      <input id="sl-id" type="text" inputmode="numeric" placeholder="1048291837465738240"
             value="${esc(config.sleeper_league_id || "")}">
      <div class="row-end"><button class="btn ghost" type="submit">Save league ID</button></div>
    </form>

    <div class="card">
      <div class="card-title">Sync</div>
      <div class="card-meta" style="margin:0 0 10px">
        Last sync: <strong>${config.last_synced_at ? esc(fmtDate(config.last_synced_at)) + " " +
          new Date(config.last_synced_at).toLocaleTimeString() : "never"}</strong>
        ${config.last_sync_note ? `<br>${esc(config.last_sync_note)}` : ""}
        <br>Stored now: ${seasonCount || 0} season(s), ${matchupCount || 0} matchups.
      </div>
      <button class="btn primary block" id="sl-sync">Sync Current Season</button>
      <button class="btn ghost block" id="sl-sync-history" style="margin-top:8px">Repair All Season History</button>
      <div class="muted tiny" style="margin-top:8px">
        Use the fast current-season sync after roster, matchup, waiver or trade changes.
        History repair is only needed when older records are missing or corrected.
      </div>
      <pre id="sl-log" class="synclog hidden"></pre>
    </div>

    <div class="card sl-schedule-card">
      <div class="sl-schedule-title-row">
        <div>
          <div class="card-title">Automatic sync schedule</div>
          <div class="muted tiny">Pick any weekdays and times. Central time · adjusts for daylight saving.</div>
        </div>
        <label class="sl-schedule-toggle">
          <input id="sl-auto-enabled" type="checkbox" ${scheduleEnabled ? "checked" : ""}
            ${schedule ? "" : "disabled"}>
          <span>Enabled</span>
        </label>
      </div>
      ${schedule ? `
        <div class="sl-schedule-days">${scheduleDaysMarkup(scheduleSlots)}</div>
        <div class="sl-schedule-foot">
          <div class="muted tiny">
            ${config.last_auto_checked_at ? `Last automatic check: ${esc(fmtDate(config.last_auto_checked_at))}` : "No automatic check recorded yet."}
            ${config.last_auto_error ? `<br><span class="warntext">${esc(config.last_auto_error)}</span>` : ""}
          </div>
          <button class="btn primary" id="sl-save-schedule" type="button">Save schedule</button>
        </div>` : `
        <div class="notice warn" style="margin-top:12px">
          Schedule controls need <strong>sleeper_sync_schedule_schema.sql</strong> applied to Supabase.
        </div>`}
    </div>

    <div class="card" id="sl-people">
      <div class="card-title">Who shows up</div>
      <div id="sl-people-list" class="muted tiny">Loading…</div>
    </div>
  `;

  renderPeople(host);

  // ---- commissioner-managed automatic sync schedule ----
  const scheduleCard = host.querySelector(".sl-schedule-card");
  scheduleCard?.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add-sync-time]");
    if (add) {
      const day = Number(add.dataset.addSyncTime);
      const times = scheduleCard.querySelector(`[data-times-for="${day}"]`);
      if (times.querySelectorAll("[data-sync-time]").length >= 8) {
        toast("That day already has the maximum of 8 sync times", true);
        return;
      }
      const used = new Set([...times.querySelectorAll("[data-sync-time]")].map((input) => input.value));
      const suggested = ["12:00", "13:00", "15:30", "18:00", "21:00", "00:00", "09:00"]
        .find((time) => !used.has(time)) || "12:00";
      times.querySelector(".sl-no-times")?.setAttribute("hidden", "");
      times.insertAdjacentHTML("beforeend", scheduleTimeRow(day, suggested));
      times.querySelector(".sl-schedule-time:last-child input")?.focus();
      return;
    }

    const remove = event.target.closest("[data-remove-sync-time]");
    if (remove) {
      const times = remove.closest(".sl-schedule-times");
      remove.closest(".sl-schedule-time")?.remove();
      if (!times.querySelector("[data-sync-time]")) times.querySelector(".sl-no-times")?.removeAttribute("hidden");
    }
  });

  host.querySelector("#sl-save-schedule")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const enabled = host.querySelector("#sl-auto-enabled").checked;
    const slots = normalizeSleeperSchedule([...host.querySelectorAll("[data-sync-time]")].map((input) => ({
      day: Number(input.dataset.day),
      time: input.value,
    })));
    if (enabled && !slots.length) {
      toast("Add at least one time before enabling automatic sync", true);
      return;
    }
    button.disabled = true;
    button.textContent = "Saving…";
    const { error } = await db().rpc("sleeper_save_sync_schedule", {
      new_schedule: slots,
      new_enabled: enabled,
    });
    if (error) {
      toast(error.message, true);
      button.disabled = false;
      button.textContent = "Save schedule";
      return;
    }
    toast(enabled ? `Automatic sync saved · ${slots.length} weekly time${slots.length === 1 ? "" : "s"}` : "Automatic sync paused");
    renderSleeperPanel(host);
  });

  // ---- show / hide synced people ----
  host.querySelector("#sl-people-list").addEventListener("change", async (e) => {
    const box = e.target.closest("input[data-user]");
    if (!box) return;
    const { error } = await db().from("sleeper_users")
      .update({ hidden: !box.checked }).eq("sleeper_user_id", box.dataset.user);
    if (error) { toast(error.message, true); box.checked = !box.checked; }
    else       { toast(box.checked ? "Now visible" : "Hidden"); }
  });

  // ---- save the league id ----
  host.querySelector("#sl-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = host.querySelector("#sl-id").value.trim();
    const { error } = await db().from("sleeper_config")
      .update({ sleeper_league_id: value }).eq("id", 1);
    if (error) toast(error.message, true);
    else       toast("League ID saved");
  });

  // ---- run a current-season sync or an explicit historical repair ----
  async function runSync(includeHistory, btn) {
    const logEl = host.querySelector("#sl-log");
    const leagueId = host.querySelector("#sl-id").value.trim();

    if (!leagueId) { toast("Enter a Sleeper league ID first", true); return; }

    logEl.classList.remove("hidden");
    logEl.textContent = "";
    const log = (msg) => {
      logEl.textContent += msg + "\n";
      logEl.scrollTop = logEl.scrollHeight;
    };

    const buttons = [...host.querySelectorAll("#sl-sync, #sl-sync-history")];
    buttons.forEach((button) => { button.disabled = true; });
    const originalText = btn.textContent;
    btn.textContent = includeHistory ? "Repairing history…" : "Syncing current season…";
    try {
      // Save the ID first so a successful sync always matches what is stored.
      await db().from("sleeper_config").update({ sleeper_league_id: leagueId }).eq("id", 1);

      const { counts } = await syncSleeper(leagueId, log, { includeHistory });
      toast(`Synced ${counts.seasons} season(s)`);
      renderSleeperPanel(host);
    } catch (err) {
      log(`\nFAILED: ${err.message}`);
      toast(err.message, true);
      buttons.forEach((button) => { button.disabled = false; });
      btn.textContent = originalText;
    }
  }

  host.querySelector("#sl-sync").addEventListener("click", (event) =>
    runSync(false, event.currentTarget));

  host.querySelector("#sl-sync-history").addEventListener("click", (event) => {
    if (!confirm("Repair every linked Sleeper season? Normal team changes only need the current-season sync.")) return;
    runSync(true, event.currentTarget);
  });
}
