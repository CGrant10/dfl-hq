// =====================================================================
// DFL Arena Beta — rendered production visual sandbox
//
// IMPORTANT: this route stays isolated from live Arena/Broadcast. The visual
// surface is real raster artwork; interactions below only persist Beta state
// locally and do not write race data or member profiles.
// =====================================================================

const STORAGE_KEY="dfl.arenaBeta.loadout.v1";
const VEHICLES=[
  {id:"kart",label:"Arcade Kart"},{id:"stock",label:"Mini Stock"},{id:"golf",label:"Golf Cart"},
  {id:"pickup",label:"Tiny Pickup"},{id:"open",label:"Open Wheel"},{id:"beater",label:"Box Beater"}
];
const WHEELS=["Slicks","Chunky","Offroad","Rally","White Walls","Gold Rims","Steelies"];
const ACCESSORIES=["None","Beacon","Trophy","Crown","Exhaust","Cooler","Toolbox","Engine Kit"];

function ensureStyles(){
  if(document.getElementById("arena-beta-render-css"))return;
  const link=document.createElement("link");
  link.id="arena-beta-render-css";
  link.rel="stylesheet";
  link.href="css/arena-beta-render.css";
  document.head.appendChild(link);
}

function loadState(){
  const fallback={vehicle:"kart",wheels:"Slicks",accessory:"Beacon"};
  try{return {...fallback,...JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")};}catch{return fallback;}
}
function saveState(state){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}}

function hotspots(group,items,boxes,state){
  return items.map((item,i)=>{
    const value=typeof item==="string"?item:item.id;
    const label=typeof item==="string"?item:item.label;
    const b=boxes[i];
    const selected=state[group]===value;
    return `<button type="button" class="abr-hotspot${selected?" is-selected":""}" data-abr-group="${group}" data-abr-value="${value}" aria-label="Select ${label}" aria-pressed="${selected}" style="--x:${b[0]}%;--y:${b[1]}%;--w:${b[2]}%;--h:${b[3]}%"><span>${label}</span></button>`;
  }).join("");
}

function loadoutText(state){
  const vehicle=VEHICLES.find(v=>v.id===state.vehicle)?.label||"Arcade Kart";
  return `${vehicle} · ${state.wheels} · ${state.accessory}`;
}

function wire(root,state){
  root.addEventListener("click",event=>{
    const button=event.target.closest("[data-abr-group]");
    if(!button)return;
    state[button.dataset.abrGroup]=button.dataset.abrValue;
    saveState(state);
    root.querySelectorAll(`[data-abr-group="${button.dataset.abrGroup}"]`).forEach(el=>{
      const on=el.dataset.abrValue===button.dataset.abrValue;
      el.classList.toggle("is-selected",on);
      el.setAttribute("aria-pressed",String(on));
    });
    const label=root.querySelector("[data-abr-loadout]");
    if(label)label.textContent=loadoutText(state);
  });
}

export async function render(view){
  ensureStyles();
  const state=loadState();
  // Coordinates are percentages of the approved 1536×1024 production render.
  const vehicleBoxes=[[69.4,9.6,9.4,12.5],[79.1,9.6,9.5,12.5],[88.9,9.6,9.4,12.5],[69.4,22.6,9.4,12.4],[79.1,22.6,9.5,12.4],[88.9,22.6,9.4,12.4]];
  const wheelBoxes=[[69.4,40.4,4.7,7.9],[74.5,40.4,4.7,7.9],[79.5,40.4,4.7,7.9],[84.5,40.4,4.7,7.9],[89.5,40.4,4.7,7.9],[94.5,40.4,4.7,7.9],[99.0,40.4,4.2,7.9]];
  const accessoryBoxes=[[69.4,67.9,4.7,7.7],[74.3,67.9,4.7,7.7],[79.2,67.9,4.7,7.7],[84.1,67.9,4.7,7.7],[89.0,67.9,4.7,7.7],[93.9,67.9,4.7,7.7],[98.5,67.9,4.4,7.7],[103.0,67.9,4.0,7.7]];

  view.innerHTML=`
    <div id="arena-beta-render-wrap" class="arena-beta-render-wrap">
      <div class="abr-topbar">
        <a class="abr-back" href="#/arena">← Live Arena</a>
        <div class="abr-status"><strong>ARENA BETA</strong><span>Interactive raster build · isolated from live races</span></div>
        <span class="abr-pill">BETA</span>
      </div>

      <section class="abr-stage" aria-label="DFL Arena Beta garage production render">
        <div class="abr-artboard">
          <img class="abr-production-render" src="assets/arena-beta/arena-beta-render.jpg" alt="DFL Arena Beta garage with illustrated arcade vehicles, customization panels, antenna flag, accessories and DFL Speedway preview" decoding="async" />
          <div class="abr-hotspots" aria-label="Arena Beta visual controls">
            ${hotspots("vehicle",VEHICLES,vehicleBoxes,state)}
            ${hotspots("wheels",WHEELS,wheelBoxes,state)}
            ${hotspots("accessory",ACCESSORIES,accessoryBoxes,state)}
          </div>
        </div>
      </section>

      <div class="abr-loadout-bar">
        <div><span>CURRENT BETA LOADOUT</span><strong data-abr-loadout>${loadoutText(state)}</strong></div>
        <small>Saved only on this device · no live Arena writes</small>
      </div>

      <div class="abr-note">
        <strong>First interactive raster pass.</strong>
        <span>Vehicle, wheel and accessory selections now work directly on the approved artwork and persist locally. The large hero car remains the approved kart render until each chassis has its own large-format production asset.</span>
      </div>
    </div>`;
  wire(view.querySelector("#arena-beta-render-wrap"),state);
}
