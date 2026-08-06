// =====================================================================
// Admin -> Sleeper tab
// League ID, a manual sync button, last sync time, and a live log.
// =====================================================================

import { db } from "../supabase.js";
import { syncSleeper } from "../sync.js";
import { esc, toast, errorBox, fmtDate } from "../ui.js";

export async function renderSleeperPanel(host) {
  host.innerHTML = `<div class="empty">Loading…</div>`;

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

  const [{ count: seasonCount }, { count: matchupCount }] = await Promise.all([
    db().from("sleeper_leagues").select("*", { count: "exact", head: true }),
    db().from("sleeper_matchups").select("*", { count: "exact", head: true }),
  ]);

  host.innerHTML = `
    <form class="card" id="sl-form">
      <div class="card-title">Sleeper league</div>
      <label for="sl-id">Sleeper League ID</label>
      <input id="sl-id" type="text" inputmode="numeric" placeholder="1048291837465738240"
             value="${esc(config.sleeper_league_id || "")}">
      <p class="muted tiny">
        Open your league on sleeper.app in a browser. The long number in the address bar
        is the ID: <code>sleeper.app/leagues/<strong>1048291837465738240</strong>/team</code>.
        Enter the ID for the <em>current</em> season — earlier seasons are found automatically.
      </p>
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
      <button class="btn block" id="sl-sync">Sync Sleeper Data</button>
      <p class="muted tiny">
        Pulls the current season and walks back through every previous season.
        Existing seasons are updated in place — nothing is ever deleted.
      </p>
      <pre id="sl-log" class="synclog hidden"></pre>
    </div>
  `;

  // ---- save the league id ----
  host.querySelector("#sl-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = host.querySelector("#sl-id").value.trim();
    const { error } = await db().from("sleeper_config")
      .update({ sleeper_league_id: value }).eq("id", 1);
    if (error) toast(error.message, true);
    else       toast("League ID saved");
  });

  // ---- run a sync ----
  host.querySelector("#sl-sync").addEventListener("click", async () => {
    const btn = host.querySelector("#sl-sync");
    const logEl = host.querySelector("#sl-log");
    const leagueId = host.querySelector("#sl-id").value.trim();

    if (!leagueId) { toast("Enter a Sleeper league ID first", true); return; }

    logEl.classList.remove("hidden");
    logEl.textContent = "";
    const log = (msg) => {
      logEl.textContent += msg + "\n";
      logEl.scrollTop = logEl.scrollHeight;
    };

    btn.disabled = true;
    btn.textContent = "Syncing…";
    try {
      // Save the ID first so a successful sync always matches what is stored.
      await db().from("sleeper_config").update({ sleeper_league_id: leagueId }).eq("id", 1);

      const { counts } = await syncSleeper(leagueId, log);
      toast(`Synced ${counts.seasons} season(s)`);
      renderSleeperPanel(host);
    } catch (err) {
      log(`\nFAILED: ${err.message}`);
      toast(err.message, true);
      btn.disabled = false;
      btn.textContent = "Sync Sleeper Data";
    }
  });
}
