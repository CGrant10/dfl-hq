// =====================================================================
// Fantasy Fun Facts - "Did you know?"
// ---------------------------------------------------------------------
// One fact a day, chosen by the date so the whole league sees the same
// one, plus the rest of the book underneath it.
//
// This page computes nothing. funfacts.js derives the facts, and it in
// turn takes every figure from lore.js. Three layers, one direction, no
// second stats engine.
// =====================================================================
import { esc, errorBox, loading, toast } from "../ui.js";
import { loadLore } from "../lore.js";
import { funFacts, factOfTheDay, factLine } from "../funfacts.js";
import { shareText } from "../share.js";

const ICON = {
  nailbiter: "i-versus", blowout: "i-versus", high: "i-record", low: "i-record",
  streak: "i-medal", volume: "i-history", title: "i-trophy",
};

export async function render(view) {
  view.innerHTML = loading();

  const lore = await loadLore();
  if (!lore || lore.error) { view.innerHTML = errorBox(lore?.error || new Error("No league data yet")); return; }

  const today = factOfTheDay(lore);
  const all = funFacts(lore);

  if (!today) {
    view.innerHTML = `<header class="page-head"><h1>DFL Lore</h1></header>
      <div class="state"><span class="state-title">Not enough history yet</span>
      <span>Once a few seasons have been synced from Sleeper, the league's records show up here.</span></div>`;
    return;
  }

  /* The rest of the book, today's fact excluded - it is already the top
     of the page and printing it twice makes the list look padded. */
  const rest = all.filter((f) => f.id !== today.id);

  view.innerHTML = `
    <header class="page-head"><h1>DFL Lore</h1></header>

    <section class="factcard dfl-mark" data-fact>
      <span class="fact-kicker">
        <svg class="ico-sm" aria-hidden="true"><use href="#${esc(ICON[today.kind] || "i-record")}"></use></svg>
        DFL Lore
      </span>
      <p class="fact-ask">Did you know?</p>
      <p class="fact-head">${esc(today.headline)}</p>
      <p class="fact-detail">${esc(today.detail)}</p>
      ${today.season ? `<span class="fact-when">${esc(today.season)} season</span>` : ""}
      <div class="row-end">
        <button type="button" class="btn ghost small" data-share>
          <svg class="ico-sm" aria-hidden="true"><use href="#i-moment"></use></svg>
          Share
        </button>
      </div>
    </section>

    <p class="muted tiny fact-note">A new piece of league history every day — the same one for everybody.</p>

    ${rest.length ? `<h2 class="section-title">The rest of the lore<span class="count">${rest.length}</span></h2>
      <div class="factlist">
        ${rest.map((f) => `
          <article class="card fact-row">
            <svg class="ico-sm" aria-hidden="true"><use href="#${esc(ICON[f.kind] || "i-record")}"></use></svg>
            <div>
              <h3 class="card-heading">${esc(f.headline)}</h3>
              <div class="card-body">${esc(f.detail)}</div>
            </div>
          </article>`).join("")}
      </div>` : ""}
  `;

  view.querySelector("[data-share]")?.addEventListener("click", () => {
    /* shareText() uses the Web Share sheet where there is one - which is
       how this reaches Messenger on a phone - and falls back to the
       clipboard on a desktop browser that has no sheet. */
    const how = shareText({ title: "DFL HQ — Did you know?", text: factLine(today) });
    if (how === "copied") toast("Copied — paste it in the group chat");
    if (how === "failed") toast("Could not share on this device", true);
  });
}
