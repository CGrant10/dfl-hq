// =====================================================================
// Home dashboard: next events, latest announcements, open polls, quick nav
// =====================================================================

import { db, configured } from "../supabase.js";
import { esc, empty, fmtDate, relDate, fmtShort, errorBox } from "../ui.js";
import { getUsername } from "../store.js";

export async function render(view) {
  if (!configured) {
    view.innerHTML = setupNotice();
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  // Fire all three queries at once - faster than one after another.
  const [events, announcements, polls] = await Promise.all([
    db().from("events").select("*").gte("event_date", today)
        .order("event_date", { ascending: true }).limit(3),
    db().from("announcements").select("*")
        .order("created_at", { ascending: false }).limit(3),
    db().from("polls").select("*").eq("active", true)
        .order("created_at", { ascending: false }).limit(3),
  ]);

  const firstError = events.error || announcements.error || polls.error;
  if (firstError) { view.innerHTML = errorBox(firstError); return; }

  const name = getUsername();

  view.innerHTML = `
    <div class="hero">
      <img src="icons/logo-256.png" alt="DFL league crest" width="256" height="256">
    </div>
    <h1 class="center">League Headquarters</h1>
    <p class="muted center" style="margin-top:-8px">
      ${name ? `Good to see you, <strong>${esc(name)}</strong>.` : "Rules, polls, keepers and league history."}
      Sleeper still runs the scoring.
    </p>

    <nav class="quicknav" style="margin:18px 0 6px">
      ${[
        ["rules", "Rules"], ["keepers", "Keepers"], ["polls", "Polls"],
        ["calendar", "Calendar"], ["history", "History"], ["owners", "Owners"],
        ["finances", "Finances"], ["admin", "Admin"],
      ].map(([route, label]) => `
        <a href="#/${route}">
          <svg class="ico" aria-hidden="true"><use href="#i-${route}"></use></svg>${label}
        </a>`).join("")}
    </nav>

    <div class="section-head"><h2>Upcoming</h2><a href="#/calendar">All events →</a></div>
    ${eventList(events.data)}

    <div class="section-head"><h2>Announcements</h2></div>
    ${announcementList(announcements.data)}

    <div class="section-head"><h2>Active polls</h2><a href="#/polls">Vote →</a></div>
    ${pollList(polls.data)}
  `;
}

function eventList(rows) {
  if (!rows?.length) return empty("No events scheduled yet.");
  return rows.map((e) => `
    <div class="card accent">
      <div class="card-title">${esc(e.title)}</div>
      <div class="muted">${fmtDate(e.event_date)} · <span class="pill green">${esc(relDate(e.event_date))}</span></div>
      ${e.description ? `<div class="card-body" style="margin-top:8px">${esc(e.description)}</div>` : ""}
    </div>`).join("");
}

function announcementList(rows) {
  if (!rows?.length) return empty("Nothing from the commissioner yet.");
  return rows.map((a) => `
    <div class="card">
      <div class="card-title">${esc(a.title)}</div>
      <div class="card-body">${esc(a.content)}</div>
      <div class="card-meta">${fmtShort(a.created_at)}</div>
    </div>`).join("");
}

function pollList(rows) {
  if (!rows?.length) return empty("No polls open right now.");
  return rows.map((p) => `
    <a class="card" href="#/polls" style="display:block;text-decoration:none;color:inherit">
      <div class="card-title">${esc(p.question)}</div>
      <div class="card-meta">Tap to vote →</div>
    </a>`).join("");
}

function setupNotice() {
  return `
    <h1>Almost there</h1>
    <div class="card accent">
      <div class="card-title">Connect Supabase</div>
      <div class="card-body">Open <strong>js/config.js</strong> and paste in your Supabase project URL and anon key, then run <strong>schema.sql</strong> in the Supabase SQL editor.

The README in this folder walks through both steps.</div>
    </div>`;
}
