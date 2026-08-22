/* Shared hole-aware GPS and satellite map for supported DFL courses. */
const LEAFLET_JS="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
const SATELLITE_TILES="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
let leafletPromise=null;
const uiEsc=value=>String(value??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const toYards=meters=>Math.round(Number(meters||0)*1.0936133);
function distanceYards(a,b){const R=6371000,rad=x=>x*Math.PI/180,dLat=rad(b.lat-a.lat),dLon=rad(b.lng-a.lng),la1=rad(a.lat),la2=rad(b.lat),x=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return toYards(2*R*Math.asin(Math.sqrt(x)))}
function load(key){try{return JSON.parse(localStorage.getItem(key)||"{}")||{}}catch{return {}}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function scorecardHole(card){for(const input of card.querySelectorAll("input[data-team-score]")){if(!String(input.value||"").trim())return ((Number(input.dataset.hole)||1)-1)%9+1}return 1}
function courseText(view){return [...view.querySelectorAll(".golf-event-head .golf-meta span")].map(node=>node.textContent||"").join(" ")}
function fullMapUrl(query){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
function loadLeaflet(){if(globalThis.L)return Promise.resolve(globalThis.L);if(leafletPromise)return leafletPromise;leafletPromise=new Promise((resolve,reject)=>{if(!document.getElementById("dfl-leaflet-css")){const link=document.createElement("link");link.id="dfl-leaflet-css";link.rel="stylesheet";link.href=LEAFLET_CSS;document.head.appendChild(link)}const old=document.getElementById("dfl-leaflet-js");if(old){old.addEventListener("load",()=>resolve(globalThis.L),{once:true});old.addEventListener("error",reject,{once:true});return}const script=document.createElement("script");script.id="dfl-leaflet-js";script.src=LEAFLET_JS;script.onload=()=>resolve(globalThis.L);script.onerror=()=>reject(Error("Could not load the course map"));document.head.appendChild(script)});return leafletPromise}

function ensureStyles(){if(document.getElementById("dfl-course-gps-style"))return;const style=document.createElement("style");style.id="dfl-course-gps-style";style.textContent=`.dfl-gps-bubble{position:fixed;right:12px;bottom:calc(78px + env(safe-area-inset-bottom));z-index:70;min-width:104px;border:1px solid rgba(255,214,0,.42);border-radius:18px;padding:9px 12px;background:rgba(7,15,24,.97);color:var(--text);box-shadow:0 10px 28px rgba(0,0,0,.44);text-align:center;font:inherit}.dfl-gps-bubble strong{display:block;font-size:25px;line-height:1;font-variant-numeric:tabular-nums}.dfl-gps-bubble small{display:block;margin-top:4px;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:900}.dfl-gps-bubble em{color:#ffd400;font-style:normal}.dfl-gps-panel{position:fixed;inset:0;z-index:100;background:#07101b;color:var(--text);display:grid;grid-template-rows:auto minmax(250px,1fr) auto;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}.dfl-gps-head{display:grid;grid-template-columns:46px 1fr 46px;align-items:center;gap:8px;padding:9px 10px;background:#0b1726;border-bottom:1px solid var(--line)}.dfl-gps-head-title{text-align:center;min-width:0}.dfl-gps-head-title small{display:block;color:#ffd400;font-size:9px;letter-spacing:.1em;text-transform:uppercase;font-weight:900}.dfl-gps-head-title strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dfl-gps-close,.dfl-gps-head>button{width:46px;height:44px;border:1px solid var(--line);border-radius:10px;background:#13243a;color:var(--text);font-size:25px}.dfl-hole-map{position:relative;background:#132233;overflow:hidden}.dfl-hole-map [data-gps-map]{width:100%;height:100%;min-height:250px}.dfl-gps-map-tools{position:absolute;left:10px;right:10px;bottom:10px;z-index:500;display:flex;gap:7px;pointer-events:none}.dfl-gps-map-tools button,.dfl-gps-map-tools a{pointer-events:auto;min-height:38px;border:1px solid rgba(255,255,255,.36);border-radius:9px;padding:8px 10px;background:rgba(7,15,24,.94);color:#fff;text-decoration:none;font:800 11px/1 inherit}.dfl-gps-map-tools button:disabled{opacity:.45}.dfl-gps-map-prompt{position:absolute;z-index:520;top:12px;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100% - 24px);padding:9px 12px;border:1px solid #ffd400;border-radius:10px;background:rgba(7,15,24,.96);color:#fff;text-align:center;font-size:11px;font-weight:900}.dfl-gps-map-prompt[hidden]{display:none}.dfl-gps-controls{padding:9px 12px 12px;background:#0b1726;border-top:1px solid var(--line)}.dfl-gps-reading{text-align:center}.dfl-gps-reading b{display:block;font-size:42px;line-height:1;font-variant-numeric:tabular-nums}.dfl-gps-reading span{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.dfl-gps-map-green{width:22px;height:22px;border:3px solid #fff;border-radius:50% 50% 50% 0;background:#ffd400;box-shadow:0 2px 8px #000;transform:rotate(-45deg)}.dfl-gps-map-player{width:20px;height:20px;border:3px solid #fff;border-radius:50%;background:#228cff;box-shadow:0 0 0 7px rgba(34,140,255,.25),0 2px 8px #000}.dfl-gps-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.dfl-gps-actions button{min-height:42px;border:1px solid var(--line);border-radius:10px;background:#13243a;color:var(--text);font-weight:900}.dfl-gps-actions .is-mapping{background:#ffd400;color:#08111d;border-color:#ffd400}.dfl-gps-meta{display:block;margin-top:7px;color:var(--muted);font-size:10px;text-align:center}.dfl-gps-error{display:grid;place-items:center;height:100%;padding:24px;text-align:center;color:var(--muted)}@media(min-width:760px){.dfl-gps-panel{inset:4vh max(12px,calc((100vw - 720px)/2));border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px #000}.dfl-hole-map{min-height:430px}}`;document.head.appendChild(style)}

export function setupCourseGps(config){
  let watchId=null,position=null,hole=1,attachedCard=null,cleanup=null,errorText="",map=null,playerMarker=null,greenMarker=null,distanceLine=null,mappingGreen=false,hasFitted=false;
  const selector=`[data-gps-course="${config.key}"]`;
  const greens=()=>load(config.storageKey);
  const green=()=>greens()[hole];
  const reading=()=>position&&green()?distanceYards({lat:position.coords.latitude,lng:position.coords.longitude},green()):null;
  function markerIcon(kind){const L=globalThis.L;return L.divIcon({className:"",html:`<div class="dfl-gps-map-${kind}"></div>`,iconSize:[24,24],iconAnchor:kind==="green"?[12,23]:[12,12]})}
  function drawMap(fit=false){if(!map||!globalThis.L)return;const L=globalThis.L,saved=green(),here=position?{lat:position.coords.latitude,lng:position.coords.longitude}:null;playerMarker?.remove();greenMarker?.remove();distanceLine?.remove();playerMarker=greenMarker=distanceLine=null;if(here)playerMarker=L.marker([here.lat,here.lng],{icon:markerIcon("player"),zIndexOffset:1000}).addTo(map).bindTooltip("You",{direction:"top"});if(saved)greenMarker=L.marker([saved.lat,saved.lng],{icon:markerIcon("green"),zIndexOffset:900}).addTo(map).bindTooltip(`Hole ${hole} green`,{direction:"top"});if(here&&saved)distanceLine=L.polyline([[here.lat,here.lng],[saved.lat,saved.lng]],{color:"#ffd400",weight:4,opacity:.92,dashArray:"8 8"}).addTo(map);if(!fit)return;setTimeout(()=>{map?.invalidateSize();if(here&&saved)map.fitBounds([[here.lat,here.lng],[saved.lat,saved.lng]],{padding:[54,54],maxZoom:18});else if(saved)map.setView([saved.lat,saved.lng],18);else if(here)map.setView([here.lat,here.lng],18);else map.setView(config.courseCenter,17)},0)}
  function refresh(){
    const bubble=document.querySelector(`.dfl-gps-bubble${selector}`),panel=document.querySelector(`.dfl-gps-panel${selector}`),value=reading(),saved=green();
    if(bubble)bubble.innerHTML=value!=null?`<strong>${value}</strong><small>yd · H${hole} · ±${toYards(position.coords.accuracy)}</small>`:saved?`<strong>H${hole}</strong><small><em>GPS</em> · locating you</small>`:`<strong>H${hole}</strong><small><em>Map green</em> · tap</small>`;
    if(!panel)return;
    panel.querySelector("[data-gps-hole]").textContent=String(hole);
    panel.querySelector("[data-gps-distance]").textContent=value??"—";
    panel.querySelector("[data-gps-reading-label]").textContent=saved?`yards to Hole ${hole} center`:`Hole ${hole} green needs one tap`;
    const prompt=panel.querySelector("[data-gps-map-prompt]");prompt.hidden=!mappingGreen;prompt.textContent=`Tap the center of Hole ${hole} green`;
    const mapGreen=panel.querySelector("[data-map-green]");mapGreen.textContent=saved?(mappingGreen?"Cancel moving green":"Move green pin"):(mappingGreen?"Tap green on map":"Map this green");mapGreen.classList.toggle("is-mapping",mappingGreen);
    panel.querySelector("[data-map-me]").disabled=!position;
    panel.querySelector("[data-gps-meta]").textContent=errorText||(position?`Live GPS accuracy ±${toYards(position.coords.accuracy)} yd${saved?" · green saved on this device":""}`:saved?"Waiting for your live GPS position…":"Tap the green on the satellite map once, then live yardage starts.");
    drawMap(!hasFitted);hasFitted=true;
  }
  function startGps(){if(watchId!=null)return;if(!navigator.geolocation){errorText="This device did not provide GPS.";refresh();return}watchId=navigator.geolocation.watchPosition(next=>{const first=!position;position=next;errorText="";if(first)hasFitted=false;refresh()},err=>{errorText=err?.message||"Location permission is needed for live yardage.";refresh()},{enableHighAccuracy:true,maximumAge:1000,timeout:15000})}
  function destroyMap(){map?.remove();map=null;playerMarker=greenMarker=distanceLine=null}
  function closePanel(){destroyMap();document.querySelector(`.dfl-gps-panel${selector}`)?.remove()}
  async function initMap(panel){const host=panel.querySelector("[data-gps-map]");try{const L=await loadLeaflet();if(!host.isConnected)return;map=L.map(host,{zoomControl:false,attributionControl:true});L.control.zoom({position:"topright"}).addTo(map);L.tileLayer(SATELLITE_TILES,{maxZoom:20,attribution:"Imagery © Esri"}).addTo(map);map.on("click",event=>{if(!mappingGreen&&!green())mappingGreen=true;if(!mappingGreen)return;const all=greens();all[hole]={lat:event.latlng.lat,lng:event.latlng.lng,at:Date.now(),source:"map"};save(config.storageKey,all);mappingGreen=false;hasFitted=false;refresh()});drawMap(true)}catch(err){host.innerHTML=`<div class="dfl-gps-error"><span>${uiEsc(err.message||"Course map unavailable")}<br><a href="${fullMapUrl(config.mapQuery)}" target="_blank" rel="noopener">Open the course map</a></span></div>`}}
  function changeHole(delta){hole=hole+delta;if(hole<1)hole=9;if(hole>9)hole=1;mappingGreen=!green();hasFitted=false;refresh()}
  function openPanel(){
    closePanel();startGps();mappingGreen=!green();hasFitted=false;
    const panel=document.createElement("section");panel.className="dfl-gps-panel";panel.dataset.gpsCourse=config.key;panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label",`${config.label} hole GPS`);
    panel.innerHTML=`<header class="dfl-gps-head"><button type="button" data-gps-prev aria-label="Previous hole">‹</button><div class="dfl-gps-head-title"><small>Hole <span data-gps-hole>${hole}</span> · Live GPS</small><strong>${uiEsc(config.label)}</strong></div><button type="button" class="dfl-gps-close" data-gps-close aria-label="Close hole GPS">×</button></header><div class="dfl-hole-map"><div data-gps-map></div><div class="dfl-gps-map-prompt" data-gps-map-prompt hidden></div><div class="dfl-gps-map-tools"><button type="button" data-map-hole>Center hole</button><button type="button" data-map-me disabled>My location</button><a href="${fullMapUrl(config.mapQuery)}" target="_blank" rel="noopener">Full course ↗</a></div></div><div class="dfl-gps-controls"><div class="dfl-gps-reading"><b data-gps-distance>—</b><span data-gps-reading-label>Hole ${hole}</span></div><div class="dfl-gps-actions"><button type="button" data-map-green>Map this green</button><button type="button" data-gps-next>Next hole ›</button></div><small class="dfl-gps-meta" data-gps-meta></small></div>`;
    document.body.appendChild(panel);
    panel.querySelector("[data-gps-close]").onclick=closePanel;
    panel.querySelector("[data-gps-prev]").onclick=()=>changeHole(-1);
    panel.querySelector("[data-gps-next]").onclick=()=>changeHole(1);
    panel.querySelector("[data-map-hole]").onclick=()=>drawMap(true);
    panel.querySelector("[data-map-me]").onclick=()=>{if(position)map?.setView([position.coords.latitude,position.coords.longitude],18)};
    panel.querySelector("[data-map-green]").onclick=()=>{mappingGreen=!mappingGreen;refresh()};
    refresh();void initMap(panel);
  }
  function stop(){
    if(globalThis.__dflCourseGpsStop===stop)globalThis.__dflCourseGpsStop=null;
    if(watchId!=null)navigator.geolocation?.clearWatch(watchId);watchId=null;position=null;errorText="";destroyMap();
    cleanup?.();cleanup=null;attachedCard=null;
    document.querySelectorAll(`.dfl-gps-bubble${selector},.dfl-gps-panel${selector}`).forEach(node=>node.remove());
  }
  function attach(card){
    if(attachedCard===card&&document.querySelector(`.dfl-gps-bubble${selector}`))return;
    globalThis.__dflCourseGpsStop?.();globalThis.__dflCourseGpsStop=stop;
    ensureStyles();attachedCard=card;hole=scorecardHole(card);
    const bubble=document.createElement("button");bubble.type="button";bubble.className="dfl-gps-bubble";bubble.dataset.gpsCourse=config.key;bubble.addEventListener("click",openPanel);document.body.appendChild(bubble);refresh();
    const update=e=>{if(!e.target.closest?.("[data-team-score],[data-step],[data-gqm-hole-nav]"))return;setTimeout(()=>{hole=scorecardHole(card);hasFitted=false;refresh()},80)};
    card.addEventListener("input",update);card.addEventListener("click",update);cleanup=()=>{card.removeEventListener("input",update);card.removeEventListener("click",update)};
  }
  function mount(){const view=document.getElementById("view"),query=new URLSearchParams(location.hash.split("?")[1]||"");if(!view||!location.hash.startsWith("#/golf")){stop();return}const card=view.querySelector(".dfl-team-card"),quick=card?.matches("[data-quick-player-card]");if(!card||(!query.get("team")&&!quick)||!config.courseRe.test(courseText(view))){stop();return}attach(card)}
  function boot(){window.addEventListener("hashchange",()=>setTimeout(mount,0));const view=document.getElementById("view");if(view)new MutationObserver(()=>location.hash.startsWith("#/golf")&&mount()).observe(view,{childList:true,subtree:true});mount()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  return{mount,stop};
}
