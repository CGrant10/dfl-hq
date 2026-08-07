// =====================================================================
// Keepers - who is keeping whom, and what round it costs.
//
// Three columns, one row per keeper, one card for the whole league. The
// team name is printed once and left blank on a team's later rows, the way
// a printed table of contents does it - so the eye runs straight down the
// player column without a header or a box interrupting it every line.
//
// This replaced a block per team, which spent a header and a border on
// teams that mostly have a single keeper.
// =====================================================================

import { selectAll } from "../supabase.js";
import { esc, empty, groupBy } from "../ui.js";
import { addControl, editControls, wireInline, canEdit, visible, hiddenClass } from "../inline.js";

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
 * The whole year as one three-column list, sorted by team.
 *
 * A row only draws its top hairline when it starts a new team, so the
 * grouping is legible without a header per team. The cost column is fixed
 * width with tabular digits, so the rounds line up as a column you can
 * scan on its own.
 */
function teamList(allRows) {
  const rows = visible("keepers", allRows);
  if (!rows.length) return empty("No keepers for this year.");

  const byTeam = [...groupBy(rows, "team").entries()]
    .sort((a, b) => a[0].localeCompare(b[0]));

  return `
    <div class="card keepcard">
      <div class="kp-head" aria-hidden="true">
        <span>Team</span><span>Keeper</span><span class="kp-r">Round</span>
      </div>
      ${byTeam.map(([team, list]) => list.map((k, i) => `
        <div class="kp-row ${i === 0 ? "kp-new" : ""} ${hiddenClass("keepers", k)}">
          <span class="kp-team">${i === 0 ? esc(team) : ""}</span>
          <span class="kp-player">
            ${esc(k.player)}
            ${k.notes ? `<span class="kp-note">${esc(k.notes)}</span>` : ""}
          </span>
          <span class="kp-cost ${k.round_cost == null ? "none" : ""}">${
            k.round_cost != null ? `${esc(k.round_cost)}` : "—"}</span>
          ${editControls("keepers", k, { compact: true })}
        </div>`).join("")).join("")}
    </div>`;
}
