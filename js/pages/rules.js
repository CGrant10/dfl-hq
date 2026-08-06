// =====================================================================
// Rules - read only for everyone. Admins edit them on the Admin page.
// =====================================================================

import { selectAll } from "../supabase.js";
import { esc, empty, groupBy } from "../ui.js";

// Order and labels of the tabs. The `key` matches rules.category in the DB.
export const CATEGORIES = [
  { key: "scoring", label: "Scoring" },
  { key: "keeper",  label: "Keepers" },
  { key: "trade",   label: "Trades" },
  { key: "waiver",  label: "Waivers" },
  { key: "playoff", label: "Playoffs" },
  { key: "general", label: "General" },
];

let activeTab = "scoring";

export async function render(view) {
  const rules = await selectAll("rules", { order: "sort_order", asc: true });
  const byCat = groupBy(rules, "category");

  view.innerHTML = `
    <h1>League Rules</h1>
    <div class="tabs" id="rule-tabs">
      ${CATEGORIES.map((c) => `
        <button data-cat="${c.key}" class="${c.key === activeTab ? "on" : ""}"
                style="${byCat.get(c.key)?.length ? "" : "opacity:.55"}">
          ${esc(c.label)}
        </button>`).join("")}
    </div>
    <div id="rule-body"></div>
  `;

  const body = view.querySelector("#rule-body");
  const paint = () => { body.innerHTML = section(byCat.get(activeTab) || []); };

  view.querySelector("#rule-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cat]");
    if (!btn) return;
    activeTab = btn.dataset.cat;
    view.querySelectorAll("#rule-tabs button")
        .forEach((b) => b.classList.toggle("on", b.dataset.cat === activeTab));
    paint();
  });

  paint();
}

function section(rows) {
  if (!rows.length) return empty("No rules written for this section yet.");
  return rows.map((r) => `
    <div class="card">
      ${r.title ? `<div class="card-title">${esc(r.title)}</div>` : ""}
      <div class="card-body">${esc(r.content)}</div>
    </div>`).join("");
}
