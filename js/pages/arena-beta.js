// DFL Arena Beta — real UI composed from approved raster artwork.
// Still isolated from live Arena/Broadcast and stores loadout locally only.
const STORAGE_KEY="dfl.arenaBeta.loadout.v4";
const ART="assets/arena-beta/arena-beta-render.jpg";
const SOURCE_W=1024;
const VEHICLES=[
 {id:"kart",label:"Arcade Kart",crop:[709,64,100,88]},
 {id:"stock",label:"Mini Stock",crop:[811,64,100,88]},
 {id:"golf",label:"Golf Cart",crop:[913,64,103,88]},
 {id:"pickup",label:"Tiny Pickup",crop:[709,155,100,91]},
 {id:"open",label:"Open Wheel",crop:[811,155,100,91]},
 {id:"beater",label:"Box Beater",crop:[913,155,103,91]}
];
const WHEELS=["Slicks","Chunky","Offroad","Rally","White Walls","Gold Rims","Steelies"];
const ACCESSORIES=["None","Beacon","Trophy","Crown","Exhaust","Cooler","Toolbox","Engine Kit"];
const PAINTS=["Red","Orange","Yellow","Green","Teal","Blue","Purple","Black","White"];
const CROPS={garage:[137,37,569,490],wheels:[708,255,309,86],accessories:[708,446,309,79],speedway:[708,529,309,129]};
function ensureAssets(){
 if(!document.getElementById("arena-beta-render-css")){const l=document.createElement("link");l.id="arena-beta-render-css";l.rel="stylesheet";l.href="css/arena-beta-render.css";document.head.appendChild(l)}
 if(!document.getElementById("arena-beta-art-preload")){const l=document.createElement("link");l.id="arena-beta-art-preload";l.rel="preload";l.as="image";l.href=ART;document.head.appendChild(l)}
}
function loadState(){const d={vehicle:"kart",wheels:"Slicks",paint:"Red",accessory:"Beacon",flag:"DFL"};try{return {...d,...JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}}catch{return d}}
function saveState(s){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(s))}catch{}}
function vehicleById(id){return VEHICLES.find(v=>v.id===id)||VEHICLES[0]}
function rasterCrop(crop,cls="",alt=""){const[x,y,w,h]=crop;const width=(SOURCE_W/w*100).toFixed(3);const left=(-x/w*100).toFixed(3);const top=(-y/h*100).toFixed(3);return `<span class="abr-raster-crop ${cls}" style="--crop-ratio:${w}/${h};--img-width:${width}%;--img-left:${left}%;--img-top:${top}%"><img src="${ART}" alt="${alt}" decoding="async"></span>`}
function vehicleCard(v,s){const on=s.vehicle===v.id;return `<button class="abr-vehicle-card${on?" is-selected":""}" data-choice="vehicle" data-value="${v.id}" aria-pressed="${on}">${rasterCrop(v.crop,"abr-vehicle-art",v.label)}<strong>${v.label}</strong></button>`}
function choice(group,val,s){const on=s[group]===val;return `<button class="abr-chip${on?" is-selected":""}" data-choice="${group}" data-value="${val}" aria-pressed="${on}">${val}</button>`}
function paintChoice(val,s){const on=s.paint===val;return `<button class="abr-paint${on?" is-selected":""}" data-choice="paint" data-value="${val}" data-paint="${val.toLowerCase()}" aria-label="${val}" aria-pressed="${on}"></button>`}
function update(root,s){
 root.querySelectorAll("[data-choice]").forEach(b=>{const on=s[b.dataset.choice]===b.dataset.value;b.classList.toggle("is-selected",on);b.setAttribute("aria-pressed",String(on))});
 const v=vehicleById(s.vehicle);const thumb=root.querySelector("[data-current-thumb]");if(thumb)thumb.innerHTML=rasterCrop(v.crop,"abr-current-thumb-art",v.label);
 root.querySelector("[data-current-name]").textContent=v.label;
 root.querySelector("[data-loadout]").textContent=`${v.label} · ${s.wheels} · ${s.paint} · ${s.accessory}`;
}
function wire(root,s){
 root.addEventListener("click",e=>{const b=e.target.closest("[data-choice]");if(!b)return;s[b.dataset.choice]=b.dataset.value;saveState(s);update(root,s)});
 const flag=root.querySelector("[data-flag]");flag?.addEventListener("input",()=>{s.flag=flag.value.slice(0,20);saveState(s)});
}
export async function render(view){
 ensureAssets();const s=loadState();const current=vehicleById(s.vehicle);
 view.innerHTML=`<div id="arena-beta-real" class="arena-beta-real">
  <header class="abr-topbar"><a class="abr-back" href="#/arena">← Live Arena</a><div class="abr-status"><strong>DFL ARENA BETA</strong><span>Garage build · isolated from live races</span></div><span class="abr-pill">BETA</span></header>
  <div class="abr-title"><div><span>PHASE 2</span><h1>Garage & Track Test</h1><p>Build it. Race it. Brag about it.</p></div><div class="abr-protected">Live Arena protected</div></div>
  <main class="abr-garage-grid">
   <section class="abr-hero-panel">
    ${rasterCrop(CROPS.garage,"abr-garage-art","DFL Garage preview")}
    <div class="abr-current-ride"><span class="abr-current-thumb-shell" data-current-thumb>${rasterCrop(current.crop,"abr-current-thumb-art",current.label)}</span><div><small>CURRENT RIDE</small><strong data-current-name>${current.label}</strong></div></div>
   </section>
   <aside class="abr-controls">
    <section class="abr-panel"><div class="abr-panel-head"><h2>Vehicle Body</h2><span>6 rides</span></div><div class="abr-vehicle-grid">${VEHICLES.map(v=>vehicleCard(v,s)).join("")}</div></section>
    <section class="abr-panel"><div class="abr-panel-head"><h2>Wheels</h2><span>Cosmetic only</span></div>${rasterCrop(CROPS.wheels,"abr-raster-strip abr-wheel-strip","Wheel options")}<div class="abr-chip-row">${WHEELS.map(x=>choice("wheels",x,s)).join("")}</div><p class="abr-lock">Champion-only: Gold Rims</p></section>
    <section class="abr-panel"><div class="abr-panel-head"><h2>Paint / Livery</h2><span>No speed boost</span></div><div class="abr-paint-row">${PAINTS.map(x=>paintChoice(x,s)).join("")}</div><p class="abr-lock">Champion-only: Championship Gold</p></section>
    <section class="abr-panel"><div class="abr-panel-head"><h2>Antenna Flag</h2><span>Flag trails behind ride</span></div><label class="abr-field"><span>Flag label for now</span><input data-flag maxlength="20" value="${s.flag||"DFL"}"></label><p class="abr-help">Image upload/crop gets wired after the vehicle hero assets are finalized.</p></section>
    <section class="abr-panel"><div class="abr-panel-head"><h2>Accessories</h2><span>Per-car mounting next</span></div>${rasterCrop(CROPS.accessories,"abr-raster-strip abr-accessory-strip","Accessory options")}<div class="abr-chip-row">${ACCESSORIES.map(x=>choice("accessory",x,s)).join("")}</div><p class="abr-lock">Commissioner-only: Beacon</p></section>
   </aside>
  </main>
  <section class="abr-bottom-grid"><div class="abr-panel abr-lineup"><div class="abr-panel-head"><h2>Vehicle Lineup</h2><span>Tap a ride</span></div><div class="abr-vehicle-grid abr-lineup-grid">${VEHICLES.map(v=>vehicleCard(v,s)).join("")}</div></div><div class="abr-panel abr-speedway"><div class="abr-panel-head"><h2>DFL Speedway</h2><span>Track preview</span></div>${rasterCrop(CROPS.speedway,"abr-speedway-art","DFL Speedway preview")}<button type="button" class="abr-enter" disabled>Test race coming next</button></div></section>
  <div class="abr-loadout-bar"><div><span>CURRENT BETA LOADOUT</span><strong data-loadout>${current.label} · ${s.wheels} · ${s.paint} · ${s.accessory}</strong></div><small>Saved on this device only</small></div>
 </div>`;
 wire(view.querySelector("#arena-beta-real"),s);
}
