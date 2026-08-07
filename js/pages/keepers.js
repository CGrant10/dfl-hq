// =====================================================================
// Keepers - who is keeping whom, and what round it costs.
// Grouped by team, filtered by year.
// =====================================================================

import { selectAll } from "../supabase.js";
import { esc, empty, groupBy } from "../ui.js";
import { addControl, editControls, wireInline, canEdit } from "../inline.js";

let year = null;   // remembered while the app stays open

export async function render(view) {
  const rows = await selectAll("keepers", { order: "team", asc: true });

  if (!rows.length) {
    view.innerHTML = `<h1>Keepers</h1>
      <div id="keeper-body">
        ${empty("No keepers recorded yet.")}
        ${canEdit() ? `<div class="row-end">${addControl("keepers", "Add keeper")}</div>` : ""}
      </div>`;
    wireInline(view.querySelector("#keeper-body"), () => render(view));
    return;
  }

  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a);
  if (!years.includes(year)) year = years[0];

  view.innerHTML = `
    <h1>Keepers</h1>
    <div class="tabs" id="year-tabs">
      ${years.map((y) => `<button data-year="${y}" class="${y === year ? "on" : ""}">${y}</button>`).join("")}
    </div>
    <div id="keeper-body"></div>
  `;

  const body = view.querySelector("#keeper-body");

  // New keepers default to the season being viewed.
  const paint = () => {
    body.innerHTML = teams(rows.filter((r) => r.year === year))
      + (canEdit() ? `<div class="row-end">${addControl("keepers", "Add keeper", { year })}</div>` : "");
  };

  wireInline(body, () => render(view));

  view.querySelector("#year-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-year]");
    if (!btn) return;
    year = Number(btn.dataset.year);
    view.querySelectorAll("#year-tabs button")
        .forEach((b) => b.classList.toggle("on", Number(b.dataset.year) === year));
    paint();
  });

  paint();
}

function teams(rows) {
  if (!rows.length) return empty("No keepers for this year.");

  const byTeam = [...groupBy(rows, "team").entries()]
    .sort((a, b) => a[0].localeCompare(b[0]));

  return byTeam.map(([team, list]) => `
    <div class="card">
      <div class="card-title">${esc(team)} <span class="pill grey">${list.length}</span></div>
      <table class="tbl">
        <thead><tr><th>Player</th><th style="width:80px">Cost</th></tr></thead>
        <tbody>
          ${list.map((k) => `
            <tr>
              <td>
                ${esc(k.player)}
                ${k.notes ? `<div class="muted tiny">${esc(k.notes)}</div>` : ""}
                ${editControls("keepers", k, { compact: true })}
              </td>
              <td>${k.round_cost != null ? `Rd ${esc(k.round_cost)}` : "—"}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`).join("");
}
