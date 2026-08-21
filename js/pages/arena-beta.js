// DFL Arena Beta — real UI composed from approved raster artwork.
// Isolated from live Arena/Broadcast; loadout persists locally only.
const STORAGE_KEY="dfl.arenaBeta.loadout.v8";
const ASSET_VERSION="1.112.9";
const ART=`assets/arena-beta/arena-beta-render-valid.jpg?v=${ASSET_VERSION}`;
const DESIGN_W=1536, DESIGN_H=1024;
const VEHICLES=[
 {id:"kart",label:"Arcade Kart",crop:[1063,96,150,132]},
 {id:"stock",label:"Mini Stock",crop:[1217,96,150,132]},
 {id:"golf",label:"Golf Cart",crop:[1370,96,155,132]},
 {id:"pickup",label:"Tiny Pickup",crop:[1063,232,150,137]},
 {id:"open",label:"Open Wheel",crop:[1217,232,150,137]},
 {id:"beater",label:"Box Beater",crop:[1370,232,155,137]}
];
const WHEELS=["Slicks","Chunky","Offroad","Rally","White Walls","Gold Rims","Steelies"];
const ACCESSORIES=["None","Beacon","Trophy","Crown","Exhaust","Cooler","Toolbox","Engine Kit"];
const PAINTS=["Red","Orange","Yellow","Green","Teal","Blue","Purple","Black","White"];
const CROPS={garage:[205,56,854,734],wheels:[1062,382,464,129],accessories:[1062,669,464,118],speedway:[1062,793,464,194]};
let artImage=null;
function ensureAssets(){const old=document.getElementById("arena-beta-render-css");if(old)old.remove();const l=document.createElement("link");l.id="arena-beta-render-css";l.rel="stylesheet";l.href=`css/arena-beta-render.css?v=${ASSET_VERSION}`;document.head.appendChild(l)}
function loadState(){const d={vehicle:"kart",wheels:"Slicks",paint:"Red",accessory:"Beacon",flag:"DFL"};try{return {...d,...JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}}catch{return d}}
function saveState(s){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(s))}catch{}}
function vehicleById(id){return VEHICLES.find(v=>v.id===id)||VEHICLES[0]}
function canvasCrop(crop,cls="",alt=""){const[, ,w,h]=crop;return `<span class="abr-canvas-crop ${cls}" style="aspect-ratio:${w}/${h}"><canvas data-abr-crop="${crop.join(",")}" role="img" aria-label="${alt}"></canvas><span class="abr-art-error" hidden>Artwork failed to load</span></span>`}
function drawCanvas(canvas,img){const vals=canvas.dataset.abrCrop?.split(",").map(Number);if(!vals||vals.length!==4)return;const[x,y,w,h]=vals;const sx=x/DESIGN_W*img.naturalWidth,sy=y/DESIGN_H*img.naturalHeight,sw=w/DESIGN_W*img.naturalWidth,sh=h/DESIGN_H*img.naturalHeight;const box=canvas.parentElement;const cssW=Math.max(1,box?.clientWidth||w);const cssH=cssW*(h/w);const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);const ctx=canvas.getContext("2d");ctx?.clearRect(0,0,canvas.width,canvas.height);ctx?.drawImage(img,sx,sy,sw,sh,0,0,canvas.width,canvas.height)}
function drawAll(root){if(!artImage?.complete||!artImage.naturalWidth)return;root.querySelectorAll("canvas[data-abr-crop]").forEach(c=>drawCanvas(c,artImage))}
function markArtError(root){root.querySelectorAll(".abr-canvas-crop").forEach(box=>{box.classList.add("is-error");const msg=box.querySelector(".abr-art-error");if(msg)msg.hidden=false})}
function loadArtwork(root){const img=new Image();artImage=img;img.decoding="async";img.onload=()=>{root.dataset.artSize=`${img.naturalWidth}×${img.naturalHeight}`;requestAnimationFrame(()=>drawAll(root))};img.onerror=()=>markArtError(root);img.src=ART}
function vehicleCard(v,s){const on=s.vehicle===v.id;return `<button class="abr-vehicle-card${on?" is-selected":""}" data-choice="vehicle" data-value="${v.id}" aria-pressed="${on}">${canvasCrop(v.crop,"abr-vehicle-art",v.label)}<strong>${v.label}</strong></button>`}
function choice(group,val,s){const on=s[group]===val;return `<button class="abr-chip${on?" is-selected":""}" data-choice="${group}" data-value="${val}" aria-pressed="${on}">${val}</button>`}
function paintChoice(val,s){const on=s.paint===val;return `<button class="abr-paint${on?" is-selected":""}" data-choice="paint" data-value="${val}" data-paint="${val.toLowerCase()}" aria-label="${val}" aria-pressed="${on}"></button>`}
function update(root,s){root.querySelectorAll("[data-choice]").forEach(b=>{const on=s[b.dataset.choice]===b.dataset.value;b.classList.toggle("is-selected",on);b.setAttribute("aria-pressed",String(on))});const v=vehicleById(s.vehicle);const thumb=root.querySelector("[data-current-thumb]");if(thumb){thumb.innerHTML=canvasCrop(v.crop,"abr-current-thumb-art",v.label);requestAnimationFrame(()=>drawAll(thumb))}root.querySelector("[data-current-name]").textContent=v.label;root.querySelector("[data-loadout]").textContent=`${v.label} · ${s.wheels} · ${s.paint} · ${s.accessory}`}
function wire(root,s){root.addEventListener("click",e=>{const b=e.target.closest("[data-choice]");if(!b)return;s[b.dataset.choice]=b.dataset.value;saveState(s);update(root,s)});const flag=root.querySelector("[data-flag]");flag?.addEventListener("input",()=>{s.flag=flag.value.slice(0,20);saveState(s)});let t;window.addEventListener("resize",()=>{clearTimeout(t);t=setTimeout(()=>drawAll(root),100)},{passive:true})}
export async function render(view){ensureAssets();const s=loadState();const current=vehicleById(s.vehicle);view.innerHTML=`<div id="arena-beta-real" class="arena-beta-real">
<header class="abr-topbar"><a class="abr-back" href="#/arena">← Live Arena</a><div class="abr-status"><strong>DFL ARENA BETA</strong><span>Garage build · isolated from live races</span></div><span class="abr-pill">BETA</span></header>
<div class="abr-title"><div><span>PHASE 2</span><h1>Garage & Track Test</h1><p>Build it. Race it. Brag about it.</p></div><div class="abr-protected">Live Arena protected</div></div>
<main class="abr-garage-grid"><section class="abr-hero-panel">${canvasCrop(CROPS.garage,"abr-garage-art","DFL Garage preview")}<div class="abr-current-ride"><span class="abr-current-thumb-shell" data-current-thumb>${canvasCrop(current.crop,"abr-current-thumb-art",current.label)}</span><div><small>CURRENT RIDE</small><strong data-current-name>${current.label}</strong></div></div></section>
<aside class="abr-controls"><section class="abr-panel"><div class="abr-panel-head"><h2>Vehicle Body</h2><span>6 rides</span></div><div class="abr-vehicle-grid">${VEHICLES.map(v=>vehicleCard(v,s)).join("")}</div></section>
<section class="abr-panel"><div class="abr-panel-head"><h2>Wheels</h2><span>Cosmetic only</span></div>${canvasCrop(CROPS.wheels,"abr-raster-strip abr-wheel-strip","Wheel options")}<div class="abr-chip-row">${WHEELS.map(x=>choice("wheels",x,s)).join("")}</div><p class="abr-lock">Champion-only: Gold Rims</p></section>
<section class="abr-panel"><div class="abr-panel-head"><h2>Paint / Livery</h2><span>No speed boost</span></div><div class="abr-paint-row">${PAINTS.map(x=>paintChoice(x,s)).join("")}</div><p class="abr-lock">Champion-only: Championship Gold</p></section>
<section class="abr-panel"><div class="abr-panel-head"><h2>Antenna Flag</h2><span>Flag trails behind ride</span></div><label class="abr-field"><span>Flag label for now</span><input data-flag maxlength="20" value="${s.flag||"DFL"}"></label><p class="abr-help">Image upload/crop comes after vehicle hero assets are finalized.</p></section>
<section class="abr-panel"><div class="abr-panel-head"><h2>Accessories</h2><span>Per-car mounting next</span></div>${canvasCrop(CROPS.accessories,"abr-raster-strip abr-accessory-strip","Accessory options")}<div class="abr-chip-row">${ACCESSORIES.map(x=>choice("accessory",x,s)).join("")}</div><p class="abr-lock">Commissioner-only: Beacon</p></section></aside></main>
<section class="abr-bottom-grid"><div class="abr-panel abr-lineup"><div class="abr-panel-head"><h2>Vehicle Lineup</h2><span>Tap a ride</span></div><div class="abr-vehicle-grid abr-lineup-grid">${VEHICLES.map(v=>vehicleCard(v,s)).join("")}</div></div><div class="abr-panel abr-speedway"><div class="abr-panel-head"><h2>DFL Speedway</h2><span>Track preview</span></div>${canvasCrop(CROPS.speedway,"abr-speedway-art","DFL Speedway preview")}<button type="button" class="abr-enter" disabled>Test race coming next</button></div></section>
<div class="abr-loadout-bar"><div><span>CURRENT BETA LOADOUT</span><strong data-loadout>${current.label} · ${s.wheels} · ${s.paint} · ${s.accessory}</strong></div><small>Saved on this device only</small></div></div>`;const root=view.querySelector("#arena-beta-real");wire(root,s);loadArtwork(root)}
