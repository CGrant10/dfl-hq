// =====================================================================
// Calendar - two tabs:
//   Events      draft date, keeper deadline, trade deadline, gatherings
//   Side Events March Madness, pick'em, survivor pools, whatever else
// =====================================================================

import { db, insertRow } from "../supabase.js";
import { esc, empty, fmtDate, relDate, toast, errorBox } from "../ui.js";
import { getUsername } from "../store.js";

let tab = "events";

export async function render(view) {
  view.innerHTML = `
    <h1>Calendar</h1>
    <div class="tabs" id="cal-tabs">
      <button data-tab="events" class="${tab === "events" ? "on" : ""}">Events</button>
      <button data-tab="side"   class="${tab === "side" ? "on" : ""}">Side Events</button>
    </div>
    <div id="cal-body"></div>
  `;

  const body = view.querySelector("#cal-body");

  view.querySelector("#cal-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    tab = btn.dataset.tab;
    view.querySelectorAll("#cal-tabs button")
        .forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    paint(body, view);
  });

  paint(body, view);
}

async function paint(body, view) {
  body.innerHTML = `<div class="empty">Loading…</div>`;
  try {
    if (tab === "events") await paintEvents(body);
    else                  await paintSide(body, view);
  } catch (err) {
    body.innerHTML = errorBox(err);
  }
}

// ---------------------------------------------------------------- events

async function paintEvents(body) {
  const { data, error } = await db().from("events").select("*")
    .order("event_date", { ascending: true });
  if (error) throw error;

  const today    = new Date().toISOString().slice(0, 10);
  const upcoming = (data || []).filter((e) => e.event_date >= today);
  const past     = (data || []).filter((e) => e.event_date < today).reverse();

  body.innerHTML = `
    ${upcoming.length
      ? upcoming.map((e) => eventCard(e, true)).join("")
      : empty("Nothing on the schedule. An admin can add events.")}
    ${past.length ? `<div class="section-head"><h2>Past</h2></div>${past.map((e) => eventCard(e, false)).join("")}` : ""}
  `;
}

function eventCard(e, upcoming) {
  return `
    <div class="card ${upcoming ? "accent" : ""}">
      <div class="card-title">${esc(e.title)}</div>
      <div class="muted">
        ${fmtDate(e.event_date)}
        · <span class="pill ${upcoming ? "green" : "grey"}">${esc(relDate(e.event_date))}</span>
      </div>
      ${e.description ? `<div class="card-body" style="margin-top:8px">${esc(e.description)}</div>` : ""}
    </div>`;
}

// ----------------------------------------------------------- side events

async function paintSide(body, view) {
  const username = getUsername();

  const [eventsRes, signupsRes] = await Promise.all([
    db().from("side_events").select("*").order("created_at", { ascending: false }),
    db().from("side_event_signups").select("side_event_id, username"),
  ]);
  if (eventsRes.error || signupsRes.error) throw eventsRes.error || signupsRes.error;

  const events  = eventsRes.data || [];
  const signups = signupsRes.data || [];

  if (!events.length) {
    body.innerHTML = empty("No side events yet. Brackets, pick'em pools and survivor contests go here.");
    return;
  }

  const cards = events.map((ev) => {
    const people = signups.filter((s) => s.side_event_id === ev.id).map((s) => s.username);
    const joined = people.includes(username);
    const open   = ev.status === "Open";

    return `
      <div class="card ${open ? "accent" : ""}">
        <div class="card-title">${esc(ev.title)}</div>
        <div class="card-meta" style="margin:0 0 8px">
          <span class="pill">${esc(ev.kind)}</span>
          <span class="pill ${open ? "green" : "grey"}">${esc(ev.status)}</span>
          · ${people.length} in
        </div>
        ${ev.description ? `<div class="card-body">${esc(ev.description)}</div>` : ""}
        ${ev.link ? `<div style="margin-top:8px"><a href="${esc(ev.link)}" target="_blank" rel="noopener">Open bracket / pool →</a></div>` : ""}
        ${people.length ? `<div class="card-meta">Playing: ${esc(people.join(", "))}</div>` : ""}
        ${open ? `<div class="row-end">
          <button class="btn small ${joined ? "ghost" : ""}" data-join="${ev.id}" ${joined ? "disabled" : ""}>
            ${joined ? "You're in" : "Count me in"}
          </button>
        </div>` : ""}
      </div>`;
  }).join("");

  // Wrapped in a fresh element so the click listener is never doubled up.
  body.innerHTML = `<div id="side-list">${cards}</div>`;

  body.querySelector("#side-list").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-join]");
    if (!btn) return;
    if (!username) { toast("Set your league name first", true); return; }

    btn.disabled = true;
    try {
      await insertRow("side_event_signups", {
        side_event_id: Number(btn.dataset.join),
        username,
      });
      toast("You're in");
      paint(body, view);
    } catch (err) {
      btn.disabled = false;
      toast(err.code === "23505" ? "You already joined" : err.message, true);
    }
  });
}
