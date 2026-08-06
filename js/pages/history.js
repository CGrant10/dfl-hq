// =====================================================================
// League history / Hall of Fame - champions, runner ups, awards,
// records and the moments nobody is allowed to forget.
// =====================================================================

import { selectAll } from "../supabase.js";
import { esc, empty, groupBy } from "../ui.js";

// Anything not in this list still shows, just at the bottom of the year.
const ORDER = ["Champion", "Runner Up", "Award", "Record", "Moment"];

// Maps a category to an icon in the sprite at the top of index.html.
const ICON = {
  "Champion":  "i-history",
  "Runner Up": "i-medal",
  "Award":     "i-award",
  "Record":    "i-record",
  "Moment":    "i-moment",
};

function icon(category) {
  const id = ICON[category] || "i-award";
  return `<svg class="ico-sm" aria-hidden="true"><use href="#${id}"></use></svg>`;
}

export async function render(view) {
  const rows = await selectAll("history", { order: "year", asc: false });

  if (!rows.length) {
    view.innerHTML = `<h1>Hall of Fame</h1>${empty("No history recorded yet.")}`;
    return;
  }

  const champs = rows.filter((r) => r.category === "Champion");
  const byYear = [...groupBy(rows, "year").entries()].sort((a, b) => b[0] - a[0]);

  view.innerHTML = `
    <h1>Hall of Fame</h1>

    ${champs.length ? `
      <div class="card accent">
        <div class="card-title">${icon("Champion")} Champions</div>
        <table class="tbl">
          <tbody>
            ${champs.map((c) => `<tr><td style="width:70px">${esc(c.year)}</td><td>${esc(c.winner)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>` : ""}

    ${byYear.map(([year, list]) => `
      <div class="section-head"><h2>${esc(year)}</h2></div>
      ${sortRows(list).map(entry).join("")}
    `).join("")}
  `;
}

function sortRows(list) {
  const rank = (c) => { const i = ORDER.indexOf(c); return i === -1 ? 99 : i; };
  return [...list].sort((a, b) => rank(a.category) - rank(b.category));
}

function entry(r) {
  return `
    <div class="card">
      <div class="card-title">${icon(r.category)} ${esc(r.winner || r.category)}</div>
      <div class="card-meta" style="margin:0">
        <span class="pill">${esc(r.category)}</span>
      </div>
      ${r.notes ? `<div class="card-body" style="margin-top:8px">${esc(r.notes)}</div>` : ""}
    </div>`;
}
