import { errorBox } from "../ui.js";
import { loadWall, wallCard, wireWall } from "../member-wall.js";

export async function render(view) {
  view.innerHTML = `<div class="wall-page"><header class="page-head"><div><span class="eyebrow">LEAGUE FEED</span><h1>The Wall</h1><p>Talk your shit. Bring receipts.</p></div><a class="btn ghost small" href="#/home">← Home</a></header><div data-wall-page-slot><div class="card state"><span class="state-title">Loading the Wall…</span></div></div></div>`;
  const slot = view.querySelector("[data-wall-page-slot]");
  const redraw = async () => {
    try {
      slot.innerHTML = wallCard(await loadWall(30));
      wireWall(slot, redraw);
    } catch (error) {
      slot.innerHTML = errorBox(error);
    }
  };
  await redraw();
}
