// =====================================================================
// Admin -> Broadcast. Two things that belong on one screen.
// ---------------------------------------------------------------------
//   the slides   a normal renderManager() over broadcast_items. No custom
//                editor: the spec in sections.js drives the same form the
//                rest of the app uses, so a field added there appears here
//                with no code.
//   the sources  which automatic generators are allowed to contribute.
//
// They are together because they answer the same question - "what is on
// the front page" - and separating them would mean an admin turning off
// "Dues" in one place and wondering why their hand-written slide about
// dues, in another place, still shows.
//
// SECURITY: this panel is a convenience, not a control. Every write it
// makes is refused by RLS unless is_admin() passes on the request itself.
// Hiding this tab protects nothing and is not relied on.
// =====================================================================
import { esc, toast } from "../ui.js";
import { renderManager } from "../crud.js";
import { specFor } from "../sections.js";
import { GENERATOR_LABELS } from "../broadcast-deck.js";
import { loadSettings, broadcastOff, setGeneratorOff } from "../settings.js";

export async function renderBroadcastPanel(host) {
  host.innerHTML = `
    <div data-bx-manager></div>
    <section class="block" data-bx-sources>
      <h2 class="section-title">Where slides come from</h2>
      <div class="card">
        <div class="card-body">Turn a source off and the front page stops
        building slides from it. Hand-written slides above are unaffected.</div>
        <div class="switchlist" data-bx-switches></div>
      </div>
    </section>`;

  renderManager(host.querySelector("[data-bx-manager]"), specFor("broadcast_items"));

  await loadSettings();
  const off = broadcastOff();
  const list = host.querySelector("[data-bx-switches]");
  list.innerHTML = [...GENERATOR_LABELS].map(([id, [name, what]]) => `
    <label class="switchrow">
      <input type="checkbox" data-gen="${esc(id)}" ${off.has(id) ? "" : "checked"}>
      <span class="switch-text">
        <strong>${esc(name)}</strong>
        <span class="muted">${esc(what)}</span>
      </span>
    </label>`).join("");

  list.addEventListener("change", async (e) => {
    const box = e.target.closest("[data-gen]");
    if (!box) return;
    const id = box.dataset.gen;
    box.disabled = true;
    try {
      // checked means ON, and the setting stores what is OFF.
      await setGeneratorOff(id, !box.checked);
      toast(`${GENERATOR_LABELS.get(id)?.[0] || id} ${box.checked ? "on" : "off"}`);
    } catch (err) {
      box.checked = !box.checked;              // put the switch back
      toast(err.message || "Could not save that", true);
    }
    box.disabled = false;
  });
}
