// DFL Arena Beta — real UI composed from approved raster artwork.
// Still isolated from live Arena/Broadcast and stores loadout locally only.
const STORAGE_KEY="dfl.arenaBeta.loadout.v2";
const ART="assets/arena-beta/arena-beta-render.jpg";
const VEHICLES=[
 {id:"kart",label:"Arcade Kart",pos:"76.6% 11.0%"},
 {id:"stock",label:"Mini Stock",pos:"87.4% 11.0%"},
 {id:"golf",label:"Golf Cart",pos:"98.2% 11.0%"},
 {id:"pickup",label:"Tiny Pickup",pos:"76.6% 25.8%"},
 {id:"open",label:"Open Wheel",pos:"87.4% 25.8%"},
 {id:"beater",label:"Box Beater",pos:"98.2% 25.8%"}
];
const WHEELS=["Slicks","Chunky","Offroad","Rally","White Walls","Gold Rims","Steelies"];
const ACCESSORIES=["None","Beacon","Trophy","Crown","Exhaust","Cooler","Toolbox","Engine Kit"];
const PAINTS=["Red","Orange","Yellow","Green","Teal","Blue","Purple","Black","White"];
function ensureAssets(){
 if(!document.getElementById("arena-beta-render-css")){const l=document.createElement("link");l.id="arena-beta-render-css";l.rel="stylesheet";l.href="css/arena-beta-render.css";document.head.appendChild(l)}
 if(!document.getElementById("arena-beta-art-preload")){const l=document.createElement("link");l.id="arena-beta-art-preload";l.rel="preload";l.as="image";l.href=ART;document.head.appendChild(l)}
}
function loadState(){const d={vehicle:"kart",wheels:"Slicks",paint:"Red",accessory:"Beacon",flag:"DFL"};try{return {...d,...JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}}catch{return d}}
function saveState(s){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(s))}catch{}}
function vehicleById(id){return VEHICLES.find(v=>v.id===id)||VEHICLES[0]}
function vehicleCard(v,s){const on=s.vehicle===v.id;return `<button class="abr-vehicle-card${on?" is-selected":""}" data-choice="vehicle" data-value="${v.id}" aria-pressed="${on}"><span class="abr-vehicle-art" style="--art-pos:${v.pos}"></span><strong>${v.label}</strong></button>`}
function choice(group,val,s){const on=s[group]===val;return `<button class="abr-chip${on?" is-selected":""}" data-choice="${group}" data-value="${val}" aria-pressed="${on}">${val}</button>`}
function paintChoice(val,s){const on=s.paint===val;return `<button class="abr-paint${on?" is-selected":""}" data-choice="paint" data-value="${val}" data-paint="${val.toLowerCase()}" aria-label="${val}" aria-pressed="${on}"></button>`}
function update(root,s){
 root.querySelectorAll("[data-choice]").forEach(b=>{const on=s[b.dataset.choice]===b.dataset.value;b.classList.toggle("is-selected",on);b.setAttribute("aria-pressed",String(on))});
 const v=vehicleById(s.vehicle);const thumb=root.querySelector("[data-current-art]");if(thumb)thumb.style.setProperty("--art-pos",v.pos);
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
    <div class="abr-garage-art" role="img" aria-label="DFL Garage illustrated scene"></div>
    <div class="abr-current-ride"><span class="abr-current-thumb" data-current-art style="--art-pos:${current.pos}"></span><div><small>CURRENT RIDE</small><strong data-current-name>${current.label}</strong></div></div>
   </section>
   <aside class="abr-controls">
    <section class="abr-panel"><div class="abr-panel-head"><h2>Vehicle Body</h2><span>6 rides</span></div><div class="abr-vehicle-grid">${VEHICLES.map(v=>vehicleCard(v,s)).join("")}</div></section>
    <section class="abr-panel"><div class="abr-panel-head"><h2>Wheels</h2><span>Cosmetic only</span></div><div class="abr-raster-strip abr-wheel-strip" aria-hidden="true"></div><div class="abr-chip-row">${WHEELS.map(x=>choice("wheels",x,s)).join("")}</div><p class="abr-lock">Champion-only: Gold Rims</p></section>
    <section class="abr-panel"><div class="abr-panel-head"><h2>Paint / Livery</h2><span>No speed boost</span></div><div class="abr-paint-row">${PAINTS.map(x=>paintChoice(x,s)).join("")}</div><p class="abr-lock">Champion-only: Championship Gold</p></section>
    <section class="abr-panel"><div class="abr-panel-head"><h2>Antenna Flag</h2><span>Flag trails behind ride</span></div><label class="abr-field"><span>Flag label for now</span><input data-flag maxlength="20" value="${s.flag||"DFL"}"></label><p class="abr-help">Image upload/crop gets wired after the vehicle hero assets are finalized.</p></section>
    <section class="abr-panel"><div class="abr-panel-head"><h2>Accessories</h2><span>Per-car mounting next</span></div><div class="abr-raster-strip abr-accessory-strip" aria-hidden="true"></div><div class="abr-chip-row">${ACCESSORIES.map(x=>choice("accessory",x,s)).join("")}</div><p class="abr-lock">Commissioner-only: Beacon</p></section>
   </aside>
  </main>
  <section class="abr-bottom-grid"><div class="abr-panel abr-lineup"><div class="abr-panel-head"><h2>Vehicle Lineup</h2><span>Tap a ride</span></div><div class="abr-vehicle-grid abr-lineup-grid">${VEHICLES.map(v=>vehicleCard(v,s)).join("")}</div></div><div class="abr-panel abr-speedway"><div class="abr-panel-head"><h2>DFL Speedway</h2><span>Track preview</span></div><div class="abr-speedway-art"></div><button type="button" class="abr-enter" disabled>Test race coming next</button></div></section>
  <div class="abr-loadout-bar"><div><span>CURRENT BETA LOADOUT</span><strong data-loadout>${current.label} · ${s.wheels} · ${s.paint} · ${s.accessory}</strong></div><small>Saved on this device only</small></div>
 </div>`;
 wire(view.querySelector("#arena-beta-real"),s);
}
