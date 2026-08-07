// =====================================================================
// Keepers - who is keeping whom, and what round it costs.
//
// Built for a glance, not for study. This is the page somebody opens to
// settle an argument in a group chat, so every team fits in one block and
// every keeper is one line: name on the left, cost on the right.
//
// It used to be a table per team, which repeated a Player/Cost header
// twelve times and pushed the last few teams well below the fold.
// =====================================================================

import { selectAll } from "../supabase.js";
import { esc, empty, groupBy } from "../ui.js";
import { addControl, editControls, wireInline, canEdit } from "../inline.js";

let year = null;   // remembered while the app stays open

export async function render(view) {
  const rows = await selectAll("keepers", { order: "team", asc: true });

  if (!rows.length) {
    view.innerHTML = `
      <header class="page-head"><h1>Keepers</h1></header>
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
    <header class="page-head">
      <h1>Keepers</h1>
      <p class="page-sub" id="keeper-count"></p>
    </header>

    <div class="tabs" id="year-tabs">
      ${years.map((y) => `<button data-year="${y}" class="${y === year ? "on" : ""}">${y}</button>`).join("")}
    </div>
    <div id="keeper-body"></div>
  `;

  const body  = view.querySelector("#keeper-body");
  const count = view.querySelector("#keeper-count");

  const paint = () => {
    const mine = rows.filter((r) => r.year === year);
    const teams = groupBy(mine, "team").size;

    count.textContent = mine.length
      ? `${year} · ${mine.length} keeper${mine.length === 1 ? "" : "s"} across ${teams} team${teams === 1 ? "" : "s"}`
      : `${year} · nothing recorded`;

    body.innerHTML = teamList(mine)
      + (canEdit() ? `<div class="row-end">${addControl("keepers", "Add keeper", { year })}</div>` : "");
  };

  view.querySelector("#year-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-year]");
    if (!btn) return;
    year = Number(btn.dataset.year);
    view.querySelectorAll("#year-tabs button")
        .forEach((b) => b.classList.toggle("on", Number(b.dataset.year) === year));
    paint();
  });

  wireInline(body, () => render(view));

  paint();
}

/**
 * One block per team. The team name and its keeper count sit on a single
 * header line, then one line per player - no column headings, because
 * "a name and a round" needs no explaining twelve times over.
 */
function teamList(rows) {
  if (!rows.length) return empty("No keepers for this year.");

  const byTeam = [...groupBy(rows, "team").entries()]
    .sort((a, b) => a[0].localeCompare(b[0]));

  return `<div class="keeplist">
    ${byTeam.map(([team, list]) => `
      <section class="keepteam">
        <h2 class="keepteam-name">
          ${esc(team)}<span class="keepteam-n">${list.length}</span>
        </h2>
        ${list.map((k) => `
          <div class="keeper">
            <div class="keeper-who">
              <span class="keeper-player">${esc(k.player)}</span>
              ${k.notes ? `<span class="keeper-note">${esc(k.notes)}</span>` : ""}
            </div>
            <span class="keeper-cost ${k.round_cost == null ? "none" : ""}">
              ${k.round_cost != null ? `Rd ${esc(k.round_cost)}` : "—"}
            </span>
            ${editControls("keepers", k, { compact: true })}
          </div>`).join("")}
      </section>`).join("")}
  </div>`;
}
