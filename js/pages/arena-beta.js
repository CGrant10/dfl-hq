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
  // Percent coordinates measured against the approved 1536×1024 render.
  const vehicleBoxes=[[69.3,9.4,9.2,12.6],[79.0,9.4,9.3,12.6],[88.7,9.4,9.5,12.6],[69.3,22.5,9.2,12.6],[79.0,22.5,9.3,12.6],[88.7,22.5,9.5,12.6]];
  const wheelBoxes=[[69.6,40.2,3.7,8.0],[73.7,40.2,3.7,8.0],[77.8,40.2,3.7,8.0],[81.9,40.2,3.7,8.0],[86.0,40.2,3.7,8.0],[90.1,40.2,3.7,8.0],[94.2,40.2,3.7,8.0]];
  const accessoryBoxes=[[69.6,68.1,3.7,7.8],[73.4,68.1,3.7,7.8],[77.2,68.1,3.7,7.8],[81.0,68.1,3.7,7.8],[84.8,68.1,3.7,7.8],[88.6,68.1,3.7,7.8],[92.4,68.1,3.7,7.8],[96.2,68.1,3.2,7.8]];

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
