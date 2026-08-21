// =====================================================================
// DFL Arena Beta — Phase 2 sandbox
//
// This route is intentionally isolated from the live Arena/Broadcast flow.
// It does not subscribe to arena_events, does not write participants/results,
// and does not import the live race renderer. Phase 2 can evolve here without
// putting the stable race at risk.
// =====================================================================

import { currentMember } from "../members.js";
import { esc } from "../ui.js";

const VEHICLES = [
  ["kart", "Arcade Kart"],
  ["stock", "Mini Stock"],
  ["golf", "Golf Cart"],
  ["pickup", "Tiny Pickup"],
  ["open", "Open Wheel"],
  ["beater", "Box Beater"],
];
const WHEELS = ["Slicks", "Chunky", "Offroad", "Whitewalls", "Smalliez", "Gold Rims"];
const PAINTS = ["DFL Red", "Burnt Orange", "Track Yellow", "Pit Green", "Teal", "Royal Blue", "Black", "White", "Championship Gold"];
const ACCESSORIES = ["None", "Commissioner Beacon", "Championship Trophy", "Crown", "Garbage Exhaust", "Beer Cooler", "Dice"];

const state = {
  vehicle: "kart",
  wheels: "Slicks",
  paint: "DFL Red",
  accessory: "None",
  flag: "DFL",
};

function optionButton(group, value, label = value) {
  const on = state[group] === value;
  return `<button type="button" class="ab-choice${on ? " on" : ""}" data-beta-choice="${esc(group)}" data-value="${esc(value)}" aria-pressed="${on}">${esc(label)}</button>`;
}

function vehicleArt() {
  const label = VEHICLES.find(([id]) => id === state.vehicle)?.[1] || "Arcade Kart";
  const gold = /Gold/.test(state.paint) || /Gold/.test(state.wheels);
  const beacon = state.accessory === "Commissioner Beacon";
  return `<div class="ab-machine ab-machine-${esc(state.vehicle)}${gold ? " is-gold" : ""}" aria-label="${esc(label)} preview">
    <div class="ab-shadow"></div>
    <div class="ab-flagpole"><div class="ab-flag">${esc(state.flag || "DFL")}</div></div>
    ${beacon ? `<div class="ab-beacon" title="Commissioner beacon"></div>` : ""}
    <div class="ab-body"><span class="ab-number">12</span><span class="ab-body-mark">DFL</span></div>
    <div class="ab-driver"><span></span></div>
    <div class="ab-wheel ab-wheel-rear"></div><div class="ab-wheel ab-wheel-front"></div>
  </div>`;
}

function paintPreview(root) {
  const target = root.querySelector("[data-beta-machine]");
  if (target) target.innerHTML = vehicleArt();
  root.querySelectorAll("[data-beta-choice]").forEach((button) => {
    button.classList.toggle("on", state[button.dataset.betaChoice] === button.dataset.value);
    button.setAttribute("aria-pressed", String(state[button.dataset.betaChoice] === button.dataset.value));
  });
}

function wire(root) {
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-beta-choice]");
    if (!button) return;
    state[button.dataset.betaChoice] = button.dataset.value;
    paintPreview(root);
  });
  root.querySelector("[data-beta-flag]")?.addEventListener("input", (event) => {
    state.flag = String(event.target.value || "DFL").slice(0, 12);
    paintPreview(root);
  });
}

export async function render(view) {
  const member = currentMember();
  view.innerHTML = `
    <div id="arena-beta-wrap" class="arena-beta-wrap">
      <header class="page-head ab-head">
        <div>
          <a class="backlink" href="#/arena">← Live Arena</a>
          <div class="ab-kicker">PHASE 2 · SANDBOX</div>
          <h1>DFL Arena Beta</h1>
          <p class="page-sub">Garage, vehicles and the new Speedway live here first. Nothing on this page changes the current race.</p>
        </div>
        <span class="ab-beta-pill">BETA</span>
      </header>

      <section class="ab-safety">
        <strong>Stable Arena is protected.</strong>
        <span>This route has no live race controls, race subscriptions, participant writes or result writes.</span>
      </section>

      <section class="ab-garage-shell">
        <div class="ab-garage-scene">
          <div class="ab-garage-sign">DFL <span>GARAGE</span></div>
          <div class="ab-garage-door"></div>
          <div class="ab-track-light"></div>
          <div class="ab-preview-copy"><span>${esc(member?.display_name || "Your")}'s ride</span><strong>Build the identity first.</strong></div>
          <div class="ab-machine-stage" data-beta-machine>${vehicleArt()}</div>
          <div class="ab-floor-line"></div>
        </div>

        <div class="ab-config">
          <div class="ab-config-head"><div><span class="ab-kicker">GARAGE LOADOUT</span><h2>Make it yours</h2></div><span class="muted tiny">Preview only</span></div>

          <div class="ab-config-group"><h3>Vehicle</h3><div class="ab-choice-grid">${VEHICLES.map(([id,label]) => optionButton("vehicle", id, label)).join("")}</div></div>
          <div class="ab-config-group"><h3>Wheels</h3><div class="ab-choice-grid">${WHEELS.map((v) => optionButton("wheels", v)).join("")}</div><p class="ab-lock-note">🔒 Gold Rims will be champion-only.</p></div>
          <div class="ab-config-group"><h3>Paint</h3><div class="ab-choice-grid">${PAINTS.map((v) => optionButton("paint", v)).join("")}</div><p class="ab-lock-note">🔒 Championship Gold will be champion-only.</p></div>
          <div class="ab-config-group"><h3>Antenna flag</h3><label class="ab-flag-field"><span>Temporary flag text</span><input data-beta-flag maxlength="12" value="${esc(state.flag)}" placeholder="DFL"></label><p class="ab-lock-note">Production version will use the member-uploaded image crop.</p></div>
          <div class="ab-config-group"><h3>Accessory</h3><div class="ab-choice-grid">${ACCESSORIES.map((v) => optionButton("accessory", v)).join("")}</div><p class="ab-lock-note">🚨 Commissioner Beacon will be commissioner-only. Trophy/crown rules come from DFL history.</p></div>
        </div>
      </section>

      <section class="ab-roadmap">
        <div class="ab-road-card is-now"><span>01</span><strong>Garage foundation</strong><p>Sandbox route, modular loadout shape, visual preview.</p></div>
        <div class="ab-road-card"><span>02</span><strong>Production vehicle art</strong><p>Transparent layered bodies, wheels, antenna, flags and accessories.</p></div>
        <div class="ab-road-card"><span>03</span><strong>DFL Speedway</strong><p>New illustrated track environment built independently of the live race.</p></div>
        <div class="ab-road-card"><span>04</span><strong>Beta race harness</strong><p>Only after the art renderer is stable do we bring race motion into Beta.</p></div>
      </section>
    </div>`;
  wire(view.querySelector("#arena-beta-wrap"));
}
