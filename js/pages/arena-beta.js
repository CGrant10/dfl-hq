// =====================================================================
// DFL Arena Beta — Phase 2 sandbox
// =====================================================================
import { currentMember } from "../members.js";
import { esc } from "../ui.js";
import { BETA_VEHICLES, renderBetaVehicle } from "../arena-beta/vehicle-renderer.js";

function ensureStyles(){if(document.getElementById("arena-beta-css"))return;const link=document.createElement("link");link.id="arena-beta-css";link.rel="stylesheet";link.href="css/arena-beta.css";document.head.appendChild(link)}

const WHEELS=["Slicks","Chunky","Offroad","Whitewalls","Smalliez","Gold Rims"];
const PAINTS=["DFL Red","Burnt Orange","Track Yellow","Pit Green","Teal","Royal Blue","Black","White","Championship Gold"];
const ACCESSORIES=["None","Commissioner Beacon","Championship Trophy","Crown","Garbage Exhaust","Beer Cooler","Dice"];
const state={vehicle:"kart",wheels:"Slicks",paint:"DFL Red",accessory:"None",flag:"DFL"};

function optionButton(group,value,label=value){const on=state[group]===value;return `<button type="button" class="ab-choice${on?" on":""}" data-beta-choice="${esc(group)}" data-value="${esc(value)}" aria-pressed="${on}">${esc(label)}</button>`}
function vehicleArt(overrides={}){return renderBetaVehicle({...state,...overrides,number:12})}
function lineup(){return `<div class="ab-lineup-grid">${BETA_VEHICLES.map((v,i)=>`<button type="button" class="ab-lineup-card${state.vehicle===v.id?" on":""}" data-beta-choice="vehicle" data-value="${v.id}"><span class="ab-lineup-art">${vehicleArt({vehicle:v.id,paint:["DFL Red","Royal Blue","Pit Green","Teal","Track Yellow","White"][i],accessory:"None",flag:"DFL"})}</span><strong>${esc(v.label)}</strong></button>`).join("")}</div>`}

function paintPreview(root){const target=root.querySelector("[data-beta-machine]");if(target)target.innerHTML=vehicleArt();const line=root.querySelector("[data-beta-lineup]");if(line)line.innerHTML=lineup();root.querySelectorAll("[data-beta-choice]").forEach(button=>{button.classList.toggle("on",state[button.dataset.betaChoice]===button.dataset.value);button.setAttribute("aria-pressed",String(state[button.dataset.betaChoice]===button.dataset.value))})}

function wire(root){root.addEventListener("click",event=>{const button=event.target.closest("[data-beta-choice]");if(!button)return;state[button.dataset.betaChoice]=button.dataset.value;paintPreview(root)});root.querySelector("[data-beta-flag]")?.addEventListener("input",event=>{state.flag=String(event.target.value||"DFL").slice(0,12);paintPreview(root)})}

export async function render(view){
  ensureStyles();
  const member=currentMember();
  view.innerHTML=`
    <div id="arena-beta-wrap" class="arena-beta-wrap">
      <header class="page-head ab-head"><div><a class="backlink" href="#/arena">← Live Arena</a><div class="ab-kicker">PHASE 2 · SANDBOX</div><h1>DFL Arena Beta</h1><p class="page-sub">Garage, production vehicles and the new Speedway live here first. Nothing here changes the current race.</p></div><span class="ab-beta-pill">BETA</span></header>
      <section class="ab-safety"><strong>Stable Arena is protected.</strong><span>No live race controls, race subscriptions, participant writes or result writes.</span></section>

      <section class="ab-garage-shell">
        <div class="ab-garage-scene">
          <div class="ab-garage-sign">DFL <span>GARAGE</span></div><div class="ab-garage-door"></div><div class="ab-track-light"></div>
          <div class="ab-preview-copy"><span>${esc(member?.display_name||"Your")}'s ride</span><strong>Production renderer test.</strong></div>
          <div class="ab-machine-stage ab-production-stage" data-beta-machine>${vehicleArt()}</div><div class="ab-floor-line"></div>
        </div>

        <div class="ab-config"><div class="ab-config-head"><div><span class="ab-kicker">GARAGE LOADOUT</span><h2>Make it yours</h2></div><span class="muted tiny">Preview only</span></div>
          <div class="ab-config-group"><h3>Vehicle</h3><div class="ab-choice-grid">${BETA_VEHICLES.map(v=>optionButton("vehicle",v.id,v.label)).join("")}</div></div>
          <div class="ab-config-group"><h3>Wheels</h3><div class="ab-choice-grid">${WHEELS.map(v=>optionButton("wheels",v)).join("")}</div><p class="ab-lock-note">🔒 Gold Rims will be champion-only.</p></div>
          <div class="ab-config-group"><h3>Paint</h3><div class="ab-choice-grid">${PAINTS.map(v=>optionButton("paint",v)).join("")}</div><p class="ab-lock-note">🔒 Championship Gold will be champion-only.</p></div>
          <div class="ab-config-group"><h3>Antenna flag</h3><label class="ab-flag-field"><span>Temporary flag text</span><input data-beta-flag maxlength="12" value="${esc(state.flag)}" placeholder="DFL"></label><p class="ab-lock-note">Production upload/crop comes after the renderer is locked.</p></div>
          <div class="ab-config-group"><h3>Accessory</h3><div class="ab-choice-grid">${ACCESSORIES.map(v=>optionButton("accessory",v)).join("")}</div><p class="ab-lock-note">🚨 Commissioner Beacon is commissioner-only. Gold/trophy rules will come from DFL history.</p></div>
        </div>
      </section>

      <section class="ab-production-review"><div class="ab-review-head"><div><span class="ab-kicker">STANDARDIZED RENDER TEST</span><h2>Six bodies. One system.</h2></div><p>Same canvas, same visual baseline, standardized wheel/flag/accessory anchors.</p></div><div data-beta-lineup>${lineup()}</div></section>

      <section class="ab-roadmap"><div class="ab-road-card"><span>01</span><strong>Garage foundation</strong><p>Sandbox route and loadout shell.</p></div><div class="ab-road-card is-now"><span>02</span><strong>Production vehicle art</strong><p>Modular vector bodies, wheels, antenna, flag and accessories.</p></div><div class="ab-road-card"><span>03</span><strong>DFL Speedway</strong><p>Illustrated track environment, still isolated.</p></div><div class="ab-road-card"><span>04</span><strong>Beta race harness</strong><p>Motion only after art/render performance is stable.</p></div></section>
    </div>`;
  wire(view.querySelector("#arena-beta-wrap"));
}
