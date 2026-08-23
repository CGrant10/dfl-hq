/* Shared hole-aware GPS and satellite map for supported DFL courses. */
import { db } from "./supabase.js";
import { currentMember } from "./members.js";
import { recommendClub } from "./golf-club-recommendation.js";
import { capHoleDistance, holeZoom, isOutsideHole } from "./golf-gps-distance.js";

const LEAFLET_JS="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
const SATELLITE_TILES="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
let leafletPromise=null;
const uiEsc=value=>String(value??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const toYards=meters=>Math.round(Number(meters||0)*1.0936133);
const formatYards=value=>String(Math.round(Number(value)||0)).replace(/\B(?=(\d{3})+(?!\d))/g,",");
function distanceYards(a,b){const R=6371000,rad=x=>x*Math.PI/180,dLat=rad(b.lat-a.lat),dLon=rad(b.lng-a.lng),la1=rad(a.lat),la2=rad(b.lat),x=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return toYards(2*R*Math.asin(Math.sqrt(x)))}
const fixPoint=p=>({lat:Number(p?.coords?.latitude),lng:Number(p?.coords?.longitude)});
const fixQuality=accuracy=>accuracy<=10?"Excellent":accuracy<=25?"Good":accuracy<=55?"Fair":"Weak";
function load(key){try{return JSON.parse(localStorage.getItem(key)||"{}")||{}}catch{return {}}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function scorecardHole(card){const beta=Number(card?.dataset.tbHole);if(beta>0)return beta;const selected=Number(card.querySelector("[data-gqm-entry]")?.dataset.activeHole);if(selected>0)return selected;for(const input of card.querySelectorAll("input[data-team-score]")){if(!String(input.value||"").trim())return Number(input.dataset.hole)||1}return 1}
function courseText(view){return [...view.querySelectorAll(".golf-event-head .golf-meta span,.tb-sub strong")].map(node=>node.textContent||"").join(" ")}
function fullMapUrl(query){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
function loadLeaflet(){
  if(globalThis.L)return Promise.resolve(globalThis.L);
  if(leafletPromise)return leafletPromise;
  const stylesheet=new Promise((resolve,reject)=>{
    const old=document.getElementById("dfl-leaflet-css");
    if(old?.sheet){resolve();return}
    const link=old||document.createElement("link");
    link.addEventListener("load",resolve,{once:true});link.addEventListener("error",()=>reject(Error("Could not load map styling")),{once:true});
    if(!old){link.id="dfl-leaflet-css";link.rel="stylesheet";link.href=LEAFLET_CSS;document.head.appendChild(link)}
  });
  const library=new Promise((resolve,reject)=>{
    const old=document.getElementById("dfl-leaflet-js");
    if(globalThis.L){resolve(globalThis.L);return}
    const script=old||document.createElement("script");
    script.addEventListener("load",()=>resolve(globalThis.L),{once:true});script.addEventListener("error",()=>reject(Error("Could not load the course map")),{once:true});
    if(!old){script.id="dfl-leaflet-js";script.src=LEAFLET_JS;document.head.appendChild(script)}
  });
  leafletPromise=Promise.all([stylesheet,library]).then(([,L])=>L);
  return leafletPromise;
}

function satelliteBounds(a,b){const first=a||b,second=b||a;if(!first)return null;const south=Math.min(first.lat,second.lat),north=Math.max(first.lat,second.lat),west=Math.min(first.lng,second.lng),east=Math.max(first.lng,second.lng),latSpan=Math.max(north-south,.0007),lngSpan=Math.max(east-west,.0007),latPad=latSpan*.34,lngPad=lngSpan*.46;return[[south-latPad,west-lngPad],[north+latPad,east+lngPad]]}
function satelliteExportUrl(bounds){if(!bounds)return"";const[[south,west],[north,east]]=bounds,bbox=[west,south,east,north].join(","),params=new URLSearchParams({bbox,bboxSR:"4326",imageSR:"4326",size:"900,1400",format:"jpg",f:"image"});return`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?${params}`}

function ensureStyles(){if(document.getElementById("dfl-course-gps-style"))return;const style=document.createElement("style");style.id="dfl-course-gps-style";style.textContent=`.dfl-gps-bubble{position:fixed;right:12px;bottom:calc(78px + env(safe-area-inset-bottom));z-index:70;min-width:104px;border:1px solid rgba(255,214,0,.42);border-radius:18px;padding:9px 12px;background:rgba(7,15,24,.97);color:var(--text);box-shadow:0 10px 28px rgba(0,0,0,.44);text-align:center;font:inherit}.dfl-gps-bubble strong{display:block;font-size:25px;line-height:1;font-variant-numeric:tabular-nums}.dfl-gps-bubble small{display:block;margin-top:4px;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:900}.dfl-gps-bubble em{color:#ffd400;font-style:normal}.dfl-gps-bubble.is-quick-round{position:static;right:auto;bottom:auto;z-index:auto;width:82px;min-width:82px;height:82px;padding:7px 5px;border:2px solid #dbe5ec;border-radius:50%;background:#132941;box-shadow:inset 0 0 0 3px #132941,0 0 0 2px #36526a}.dfl-gps-bubble.is-quick-round strong{font-size:27px;color:#fff}.dfl-gps-bubble.is-quick-round small{margin-top:3px;font-size:8px;color:#fff}.dfl-gps-bubble.is-quick-round .dfl-gps-badge-label{margin:0 0 3px;color:#9dcc45}.dfl-gps-panel{position:fixed;inset:0;z-index:100;background:#07101b;color:var(--text);display:grid;grid-template-rows:auto minmax(250px,1fr) auto;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}.dfl-gps-head{display:grid;grid-template-columns:46px 1fr 46px;align-items:center;gap:8px;padding:9px 10px;background:#0b1726;border-bottom:1px solid var(--line)}.dfl-gps-head-title{text-align:center;min-width:0}.dfl-gps-head-title small{display:block;color:#ffd400;font-size:9px;letter-spacing:.1em;text-transform:uppercase;font-weight:900}.dfl-gps-head-title strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dfl-gps-close,.dfl-gps-head>button{width:46px;height:44px;border:1px solid var(--line);border-radius:10px;background:#13243a;color:var(--text);font-size:25px}.dfl-hole-map{position:relative;background:#132233;overflow:hidden}.dfl-hole-map [data-gps-map]{width:100%;height:100%;min-height:250px}.dfl-gps-map-tools{position:absolute;left:10px;right:10px;bottom:10px;z-index:500;display:flex;gap:7px;pointer-events:none}.dfl-gps-map-tools button,.dfl-gps-map-tools a{pointer-events:auto;min-height:38px;border:1px solid rgba(255,255,255,.36);border-radius:9px;padding:8px 10px;background:rgba(7,15,24,.94);color:#fff;text-decoration:none;font:800 11px/1 inherit}.dfl-gps-map-tools button:disabled{opacity:.45}.dfl-gps-map-prompt{position:absolute;z-index:520;top:12px;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100% - 24px);padding:9px 12px;border:1px solid #ffd400;border-radius:10px;background:rgba(7,15,24,.96);color:#fff;text-align:center;font-size:11px;font-weight:900}.dfl-gps-map-prompt[hidden]{display:none}.dfl-gps-controls{padding:9px 12px 12px;background:#0b1726;border-top:1px solid var(--line)}.dfl-gps-reading{text-align:center}.dfl-gps-reading b{display:block;font-size:42px;line-height:1;font-variant-numeric:tabular-nums}.dfl-gps-reading span{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.dfl-gps-map-green{width:22px;height:22px;border:3px solid #fff;border-radius:50% 50% 50% 0;background:#ffd400;box-shadow:0 2px 8px #000;transform:rotate(-45deg)}.dfl-gps-map-player{width:20px;height:20px;border:3px solid #fff;border-radius:50%;background:#228cff;box-shadow:0 0 0 7px rgba(34,140,255,.25),0 2px 8px #000}.dfl-gps-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.dfl-gps-actions button{min-height:42px;border:1px solid var(--line);border-radius:10px;background:#13243a;color:var(--text);font-weight:900}.dfl-gps-actions .is-mapping{background:#ffd400;color:#08111d;border-color:#ffd400}.dfl-gps-meta{display:block;margin-top:7px;color:var(--muted);font-size:10px;text-align:center}.dfl-gps-error{display:grid;place-items:center;height:100%;padding:24px;text-align:center;color:var(--muted)}@media(min-width:760px){.dfl-gps-panel{inset:4vh max(12px,calc((100vw - 720px)/2));border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px #000}.dfl-hole-map{min-height:430px}}`;document.head.appendChild(style)}

function ensureAssistantStyles(){if(document.getElementById("dfl-gps-assistant-style"))return;const style=document.createElement("style");style.id="dfl-gps-assistant-style";style.textContent=`.dfl-gps-bubble.is-beta{position:static;display:grid;grid-template-columns:auto 1fr;align-items:center;gap:10px;width:100%;min-height:64px;padding:9px 12px;border-radius:13px;background:#132941;color:#fff;text-align:left}.dfl-gps-bubble.is-beta strong{font-size:25px;text-align:center}.dfl-gps-bubble.is-beta small{margin:0;color:#c9d7e2}.dfl-gps-bubble.is-beta .dfl-gps-beta-copy{display:grid;gap:2px}.dfl-gps-bubble.is-beta .dfl-gps-beta-copy b{color:#9dcc45;font-size:11px}.dfl-gps-club{margin-top:9px;padding:9px 12px;border:1px solid rgba(157,204,69,.45);border-radius:11px;background:rgba(157,204,69,.1);color:#fff;text-align:center}.dfl-gps-club strong{color:#bce56d}.dfl-gps-club small{display:block;margin-top:2px;color:#a9b8c7}.dfl-gps-club[hidden]{display:none}`;document.head.appendChild(style)}

function ensureHoleMarkerStyles(){if(document.getElementById("dfl-gps-hole-marker-style"))return;const style=document.createElement("style");style.id="dfl-gps-hole-marker-style";style.textContent=`.dfl-gps-map-tee{width:20px;height:20px;border:3px solid #fff;border-radius:50%;background:#13243a;box-shadow:0 0 0 5px rgba(255,255,255,.2),0 2px 8px #000}.dfl-gps-actions button[hidden]{display:none}.dfl-gps-actions button[hidden]+button{grid-column:1/-1}`;document.head.appendChild(style)}

function ensureHoleExperienceStyles(){
  if(document.getElementById("dfl-gps-hole-experience-style"))return;
  const style=document.createElement("style");style.id="dfl-gps-hole-experience-style";
  style.textContent=`
.dfl-gps-bubble.is-beta{background:#07344d;border:2px solid #119b57;box-shadow:0 7px 20px rgba(7,52,77,.24)}
.dfl-gps-panel.is-hole-experience{display:block;padding:0;background:#071015;color:#fff;overflow:hidden}
.is-hole-experience .dfl-hole-map{position:absolute;inset:0;background:#071015}
.is-hole-experience .dfl-hole-map [data-gps-map]{width:100%;height:100%;min-height:100%}
.is-hole-experience .leaflet-container{background:#071015;font-family:inherit}
.is-hole-experience .leaflet-control-attribution{display:none}
.is-hole-experience .dfl-gps-head{position:absolute;z-index:800;top:calc(12px + env(safe-area-inset-top));left:12px;right:12px;display:grid;grid-template-columns:50px minmax(0,1fr) 50px;gap:8px;padding:0;background:transparent;border:0;pointer-events:none}
.is-hole-experience .dfl-gps-head button{pointer-events:auto;width:50px;height:50px;border:1px solid rgba(255,255,255,.36);border-radius:50%;background:rgba(5,10,13,.88);color:#fff;font-size:27px;box-shadow:0 5px 18px rgba(0,0,0,.3)}
.is-hole-experience .dfl-gps-hole-nav{pointer-events:auto;display:grid;grid-template-columns:42px minmax(0,1fr) 42px;align-items:center;min-height:54px;border-radius:15px;background:rgba(5,10,13,.88);box-shadow:0 5px 18px rgba(0,0,0,.3);overflow:hidden}
.is-hole-experience .dfl-gps-hole-nav>button{width:42px;height:42px;border:0;border-radius:50%;background:rgba(255,255,255,.09);box-shadow:none}
.is-hole-experience .dfl-gps-head-title small{color:#d7e6de;font-size:10px;letter-spacing:.04em}
.is-hole-experience .dfl-gps-head-title strong{font-size:18px;color:#fff}
.is-hole-experience .dfl-gps-head-spacer{display:block}
.is-hole-experience .dfl-gps-map-tools{left:auto;right:12px;bottom:calc(144px + env(safe-area-inset-bottom));display:block}
.is-hole-experience .dfl-gps-map-tools button{min-width:104px;min-height:44px;border-radius:22px;background:rgba(5,10,13,.9);box-shadow:0 5px 16px rgba(0,0,0,.3)}
.is-hole-experience .dfl-gps-controls{position:absolute;z-index:800;left:0;right:0;bottom:0;padding:12px 14px calc(13px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(5,10,13,.9),rgba(5,10,13,.98));border:0;border-radius:20px 20px 0 0;box-shadow:0 -10px 32px rgba(0,0,0,.34)}
.is-hole-experience .dfl-gps-score-dock{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px}
.is-hole-experience .dfl-gps-player{min-width:0}.is-hole-experience .dfl-gps-player strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px}.is-hole-experience .dfl-gps-player small{display:block;margin-top:3px;color:#a9b8c0;font-size:10px}
.is-hole-experience .dfl-gps-score{min-width:106px;min-height:48px;border:1px solid rgba(255,255,255,.3);border-radius:13px;background:#119b57;color:#fff;font-weight:950}
.is-hole-experience .dfl-gps-score[hidden]{display:none}
.is-hole-experience .dfl-gps-reading{position:absolute;left:50%;bottom:calc(188px + env(safe-area-inset-bottom));transform:translateX(-50%);min-width:112px;padding:8px 12px;border:2px solid #fff;border-radius:28px;background:rgba(5,10,13,.9);box-shadow:0 4px 15px rgba(0,0,0,.3)}
.is-hole-experience .dfl-gps-reading b{font-size:30px;color:#fff}.is-hole-experience .dfl-gps-reading span{color:#d7e6de}
.is-hole-experience .dfl-gps-club{margin:9px 0 0;padding:7px 10px;border-color:rgba(157,204,69,.42);background:rgba(5,10,13,.72)}
.is-hole-experience .dfl-gps-meta{margin-top:7px;color:#a9b8c0}
.is-hole-experience .dfl-gps-actions{display:none}
.is-hole-experience .dfl-gps-map-status{position:absolute;z-index:620;left:50%;top:50%;transform:translate(-50%,-50%);max-width:260px;padding:10px 14px;border-radius:12px;background:rgba(5,10,13,.82);color:#fff;font-size:11px;font-weight:900;text-align:center;pointer-events:none}
.is-hole-experience .dfl-gps-map-status[hidden]{display:none}
.is-hole-experience .dfl-gps-map-credit{position:absolute;z-index:610;left:10px;bottom:calc(142px + env(safe-area-inset-bottom));padding:4px 7px;border-radius:6px;background:rgba(5,10,13,.7);color:#fff;font-size:9px}
.dfl-gps-distance-pill{min-width:58px;padding:5px 8px;border:2px solid #fff;border-radius:22px;background:rgba(5,10,13,.94);color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.35);font:950 18px/1 inherit;text-align:center}
@media(min-width:760px){.dfl-gps-panel.is-hole-experience{inset:3vh max(12px,calc((100vw - 520px)/2));border-radius:20px}.is-hole-experience .dfl-hole-map{min-height:0}}
`;
  document.head.appendChild(style);
}

export function setupCourseGps(config){
  let watchId=null,position=null,hole=1,attachedCard=null,cleanup=null,errorText="",map=null,tileLayer=null,fallbackOverlay=null,fallbackHole=0,imageryReady=false,playerMarker=null,teeMarker=null,accuracyCircle=null,greenMarker=null,distanceLine=null,distanceMarker=null,mappingGreen=false,hasFitted=false,refining=false,samples=[],memberBag=[],bagMemberId=null;
  const selector=`[data-gps-course="${config.key}"]`;
  const greens=()=>load(config.storageKey);
  const targetHole=()=>((hole-1)%9)+1;
  const savedGreen=()=>greens()[targetHole()];
  const green=()=>config.holeTargets?.[targetHole()]||savedGreen()||null;
  const fairwayTarget=()=>config.fairwayTargets?.[targetHole()]||null;
  const gpsSlot=()=>attachedCard?.querySelector("[data-tb-gps-slot]")||attachedCard?.closest("[data-gqm-root]")?.querySelector("[data-gqm-gps-slot]");
  const betaSlot=()=>attachedCard?.querySelector("[data-tb-gps-slot]");
  const betaValue=(name,fallback)=>{const values=String(attachedCard?.dataset?.[name]||"").split(",");return Number(values[hole-1])||Number(fallback)||0};
  const officialYards=()=>betaSlot()?betaValue("tbYardages",betaSlot()?.dataset.tbHoleYardage):Number(gpsSlot()?.dataset.gqmHoleYardage)||0;
  const officialPar=()=>betaSlot()?betaValue("tbPars",betaSlot()?.dataset.tbHolePar):Number(gpsSlot()?.dataset.gqmHolePar)||0;
  const tee=()=>{const aim=green(),landing=fairwayTarget(),yards=officialYards();if(!aim||!landing||!yards)return null;const remaining=distanceYards(landing,aim);if(!remaining)return null;const ratio=yards/remaining;return{lat:aim.lat+(landing.lat-aim.lat)*ratio,lng:aim.lng+(landing.lng-aim.lng)*ratio,inferred:true}}
  const courseTarget=()=>({lat:Number(config.courseCenter[0]),lng:Number(config.courseCenter[1]),fallback:true});
  const target=()=>green()||courseTarget();
  const rawReading=()=>position?distanceYards({lat:position.coords.latitude,lng:position.coords.longitude},target()):null;
  const maximumYards=()=>officialYards()||((tee()&&green())?distanceYards(tee(),green()):500);
  const outsideHole=()=>isOutsideHole(rawReading(),maximumYards());
  const reading=()=>capHoleDistance(rawReading(),maximumYards());
  const club=()=>outsideHole()?null:recommendClub(memberBag,reading());
  const scoreContext=()=>{const trigger=attachedCard?.querySelector(".tb-quick-add[data-tb-open],[data-tb-open]");const name=attachedCard?.querySelector(".tb-quick-name,[data-tb-name]")?.textContent?.trim()||currentMember()?.golf_name||currentMember()?.display_name||"Your score";return{trigger,name,editing:/edit score/i.test(trigger?.textContent||"")}};
  function setMapStatus(message=""){const status=document.querySelector(`.dfl-gps-panel${selector} [data-gps-map-status]`);if(!status)return;status.textContent=message;status.hidden=!message}
  function refreshFallback(){if(!map||!globalThis.L||fallbackHole===targetHole())return;fallbackOverlay?.remove();fallbackOverlay=null;fallbackHole=targetHole();imageryReady=false;setMapStatus("Loading satellite hole…");const bounds=satelliteBounds(tee(),target());if(!bounds)return;const L=globalThis.L,url=satelliteExportUrl(bounds);fallbackOverlay=L.imageOverlay(url,bounds,{pane:"dflFallbackPane",opacity:1,interactive:false}).addTo(map);fallbackOverlay.once("load",()=>{imageryReady=true;setMapStatus("")});fallbackOverlay.once("error",()=>{if(!imageryReady)setMapStatus("Satellite imagery is unavailable. Check your connection and retry.")})}
  async function loadMemberBag(){const me=currentMember(),id=me==null?null:String(me.id);if(id===bagMemberId)return;bagMemberId=id;memberBag=[];if(!me){refresh();return}const{data,error}=await db().from("golf_bag").select("club,yards").eq("member_id",me.id).order("sort_order");if(!error&&String(currentMember()?.id)===id)memberBag=data||[];refresh()}
  function acceptFix(next){const point=fixPoint(next),accuracy=Number(next?.coords?.accuracy),now=Date.now(),timestamp=Number(next?.timestamp)||now;if(!Number.isFinite(point.lat)||!Number.isFinite(point.lng)||!Number.isFinite(accuracy)||accuracy<=0||now-timestamp>30000)return false;const last=samples.at(-1);if(last){const seconds=Math.max(.1,(timestamp-last.timestamp)/1000),jumpMeters=distanceYards(point,last.point)/1.0936133,limit=Math.max(120,(accuracy+last.accuracy)*3,seconds*55);if(seconds<5&&jumpMeters>limit)return false}const sample={position:next,point,accuracy,timestamp};samples.push(sample);samples=samples.filter(item=>now-item.timestamp<=8000).slice(-10);const current=position?{point:fixPoint(position),accuracy:Number(position.coords.accuracy)||999}:null,moved=current&&distanceYards(point,current.point)/1.0936133>Math.max(12,current.accuracy+accuracy);const best=moved&&accuracy<=Math.max(55,current.accuracy*2)?sample:[...samples].sort((a,b)=>(a.accuracy+(now-a.timestamp)/1000*2.5)-(b.accuracy+(now-b.timestamp)/1000*2.5))[0];position={coords:{latitude:best.point.lat,longitude:best.point.lng,accuracy:best.accuracy,altitude:best.position.coords.altitude??null,altitudeAccuracy:best.position.coords.altitudeAccuracy??null,heading:best.position.coords.heading??null,speed:best.position.coords.speed??null},timestamp:best.timestamp};refining=false;errorText="";return true}
  function handleFix(next){const first=!position;if(!acceptFix(next))return;if(first)hasFitted=false;refresh(true)}
  function markerIcon(kind){const L=globalThis.L;return L.divIcon({className:"",html:`<div class="dfl-gps-map-${kind}"></div>`,iconSize:[24,24],iconAnchor:kind==="green"?[12,23]:[12,12]})}
  function drawMap(fit=false){
    if(!map||!globalThis.L)return;
    const L=globalThis.L,holeGreen=green(),aim=target(),start=tee(),here=position?{lat:position.coords.latitude,lng:position.coords.longitude}:null,onHole=Boolean(here&&!outsideHole()),lineStart=onHole?here:start,shown=reading()??maximumYards();
    refreshFallback();
    playerMarker?.remove();teeMarker?.remove();accuracyCircle?.remove();greenMarker?.remove();distanceLine?.remove();distanceMarker?.remove();
    playerMarker=teeMarker=accuracyCircle=greenMarker=distanceLine=distanceMarker=null;
    if(onHole){
      accuracyCircle=L.circle([here.lat,here.lng],{radius:Number(position.coords.accuracy)||1,color:"#61adff",weight:1,opacity:.85,fillColor:"#228cff",fillOpacity:.14,interactive:false}).addTo(map);
      playerMarker=L.marker([here.lat,here.lng],{icon:markerIcon("player"),zIndexOffset:1000}).addTo(map).bindTooltip(`You · GPS ${fixQuality(position.coords.accuracy)}`,{direction:"top"});
    }else if(start){
      teeMarker=L.marker([start.lat,start.lng],{icon:markerIcon("tee"),zIndexOffset:850}).addTo(map).bindTooltip(`Hole ${hole} tee`,{direction:"top"});
    }
    greenMarker=L.marker([aim.lat,aim.lng],{icon:markerIcon("green"),zIndexOffset:900}).addTo(map).bindTooltip(holeGreen?`Hole ${hole} green`:`${config.label} course target`,{direction:"top"});
    if(lineStart){
      distanceLine=L.polyline([[lineStart.lat,lineStart.lng],[aim.lat,aim.lng]],{color:"#fff",weight:3,opacity:.96}).addTo(map);
      const mid=[(lineStart.lat+aim.lat)/2,(lineStart.lng+aim.lng)/2],icon=L.divIcon({className:"",html:`<div class="dfl-gps-distance-pill">${formatYards(shown)}</div>`,iconSize:[78,38],iconAnchor:[39,19]});
      distanceMarker=L.marker(mid,{icon,zIndexOffset:1100,interactive:false}).addTo(map);
    }
    if(!fit)return;
    setTimeout(()=>{
      map?.invalidateSize();
      const points=lineStart?[[lineStart.lat,lineStart.lng],[aim.lat,aim.lng]]:[[aim.lat,aim.lng]],options={paddingTopLeft:[54,128],paddingBottomRight:[54,190],maxZoom:holeZoom(onHole?rawReading():maximumYards())};
      if(hasFitted&&onHole)map.flyToBounds(points,{...options,duration:1.1});else map.fitBounds(points,options);
    },0);
  }
  function refresh(fit=false){
    const bubble=document.querySelector(`.dfl-gps-bubble${selector}`),panel=document.querySelector(`.dfl-gps-panel${selector}`),value=reading(),suggestion=club(),holeGreen=green(),custom=Boolean(savedGreen()&&!config.holeTargets?.[targetHole()]),outside=outsideHole();
    if(bubble){const quick=bubble.classList.contains("is-quick-round"),beta=bubble.classList.contains("is-beta"),fallback=officialYards(),shown=value??fallback,badgeLabel=String(config.key||"GPS").replace(/-/g," ").toUpperCase(),status=outside?"HOLE MAX":suggestion?uiEsc(suggestion.club):"LIVE GPS";bubble.innerHTML=quick?`<small class="dfl-gps-badge-label">${uiEsc(badgeLabel)}</small><strong>${fallback?formatYards(fallback):"—"}</strong><small>YDS</small>`:beta?`<strong>${shown?formatYards(shown):"—"}<small>YDS</small></strong><span class="dfl-gps-beta-copy"><b>${value!=null?status:"OPEN HOLE MAP"}</b><small>${value!=null?(outside?`Hole ${hole} maximum until you reach the tee`:`To Hole ${hole} green · ${fixQuality(position.coords.accuracy)}`):"Satellite GPS · yardage · club"}</small></span>`:value!=null?`<strong>${formatYards(value)}</strong><small>yd · H${hole} · ${outside?"hole max":fixQuality(position.coords.accuracy)}</small>`:`<strong>H${hole}</strong><small><em>GPS</em> · ${refining?"refining":"locating you"}</small>`}
    if(!panel)return;
    panel.querySelector("[data-gps-hole]").textContent=String(hole);
    panel.querySelector("[data-gps-hole-par]").textContent=officialPar()||"—";
    panel.querySelector("[data-gps-hole-yards]").textContent=officialYards()||"—";
    panel.querySelector("[data-gps-distance]").textContent=value==null?"—":formatYards(value);
    panel.querySelector("[data-gps-reading-label]").textContent=holeGreen?`yards to Hole ${hole} green`:`yards to course · map Hole ${hole} green for exact`;
    const score=scoreContext(),playerName=panel.querySelector("[data-gps-player-name]"),scoreButton=panel.querySelector("[data-gps-score]");if(playerName)playerName.textContent=score.name;if(scoreButton){scoreButton.hidden=!score.trigger;scoreButton.textContent=score.editing?"Edit score":"Add score"}
    const clubLine=panel.querySelector("[data-gps-club]");clubLine.hidden=!suggestion;clubLine.innerHTML=suggestion?`Your club · <strong>${uiEsc(suggestion.club)}</strong><small>${formatYards(suggestion.yards)} yd personal carry</small>`:"";
    const prompt=panel.querySelector("[data-gps-map-prompt]");prompt.hidden=!mappingGreen;prompt.textContent=`Tap the center of Hole ${hole} green`;
    const mapGreen=panel.querySelector("[data-map-green]");if(mapGreen){mapGreen.hidden=Boolean(config.holeTargets?.[targetHole()]);mapGreen.textContent=mappingGreen?"Cancel moving green":custom?"Move custom green":`Set Hole ${hole} green`;mapGreen.classList.toggle("is-mapping",mappingGreen)}
    panel.querySelector("[data-map-me]").textContent=position?"Refine GPS":"Start GPS";
    panel.querySelector("[data-gps-meta]").textContent=errorText?`${errorText} Tap Start GPS to retry.`:(position?outside?`Outside Hole ${hole} view · yardage capped at ${formatYards(maximumYards())} yd until you reach the hole`:`GPS ${fixQuality(position.coords.accuracy)} · ±${toYards(position.coords.accuracy)} yd${refining?" · refining fix":""}${custom?" · custom green saved on this device":holeGreen?" · official hole target":" · course target"}`:refining?"Refining a high-accuracy GPS fix…":memberBag.length?"Waiting for your live GPS position…":"Add club carry distances under My Golf to receive a private club suggestion.");
    drawMap(fit||!hasFitted);hasFitted=true;
  }
  const gpsOptions={enableHighAccuracy:true,maximumAge:0,timeout:20000};
  function requestFreshFix(){if(!navigator.geolocation?.getCurrentPosition)return;refining=true;errorText="";refresh();navigator.geolocation.getCurrentPosition(next=>handleFix(next),err=>{refining=false;if(!position)errorText=err?.message||"Could not get a fresh GPS fix.";refresh()},gpsOptions)}
  function startGps(){if(watchId!=null)return;if(!navigator.geolocation){errorText="This device did not provide GPS.";refresh();return}refining=true;watchId=navigator.geolocation.watchPosition(next=>handleFix(next),err=>{refining=false;errorText=err?.message||"Location permission is needed for live yardage.";refresh()},gpsOptions);requestFreshFix()}
  function restartGps(){if(watchId!=null)navigator.geolocation?.clearWatch(watchId);watchId=null;position=null;samples=[];errorText="";hasFitted=false;startGps();refresh()}
  function destroyMap(){map?.remove();map=null;tileLayer=fallbackOverlay=null;fallbackHole=0;playerMarker=teeMarker=accuracyCircle=greenMarker=distanceLine=distanceMarker=null}
  function closePanel(){destroyMap();document.querySelector(`.dfl-gps-panel${selector}`)?.remove();if(attachedCard){hole=scorecardHole(attachedCard);hasFitted=false;refresh()}}
  async function initMap(panel){
    const host=panel.querySelector("[data-gps-map]");
    try{
      const L=await loadLeaflet();if(!host.isConnected)return;
      map=L.map(host,{zoomControl:false,attributionControl:false,preferCanvas:true});
      const pane=map.createPane("dflFallbackPane");pane.style.zIndex="150";pane.style.pointerEvents="none";
      tileLayer=L.tileLayer(SATELLITE_TILES,{maxZoom:20,keepBuffer:3,updateWhenIdle:false,attribution:"Imagery © Esri"}).addTo(map);
      tileLayer.on("load",()=>{imageryReady=true;setMapStatus("")});
      tileLayer.on("tileerror",()=>{if(!imageryReady)setMapStatus("Loading the lightweight satellite view…")});
      map.on("click",event=>{if(!mappingGreen)return;const all=greens();all[targetHole()]={lat:event.latlng.lat,lng:event.latlng.lng,at:Date.now(),source:"map"};save(config.storageKey,all);mappingGreen=false;hasFitted=false;fallbackHole=0;refresh()});
      drawMap(true);
    }catch(err){
      setMapStatus(err.message||"Course map unavailable");
      host.style.backgroundImage=`url("${satelliteExportUrl(satelliteBounds(tee(),target()))}")`;
      host.style.backgroundPosition="center";host.style.backgroundSize="cover";
    }
  }
  function changeHole(delta){const total=Number(attachedCard?.dataset.tbHoleCount)||9;hole=hole+delta;if(hole<1)hole=total;if(hole>total)hole=1;mappingGreen=false;hasFitted=false;fallbackHole=0;refresh()}
  function openPanel(){
    closePanel();startGps();mappingGreen=false;hasFitted=false;
    const panel=document.createElement("section");panel.className="dfl-gps-panel is-hole-experience";panel.dataset.gpsCourse=config.key;panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label",`${config.label} hole GPS`);
    panel.innerHTML=`
      <div class="dfl-hole-map">
        <div data-gps-map></div>
        <div class="dfl-gps-map-status" data-gps-map-status>Loading satellite hole…</div>
        <div class="dfl-gps-map-prompt" data-gps-map-prompt hidden></div>
        <div class="dfl-gps-map-tools"><button type="button" data-map-me>Refine GPS</button></div>
        <span class="dfl-gps-map-credit">Imagery © Esri</span>
      </div>
      <header class="dfl-gps-head">
        <button type="button" class="dfl-gps-close" data-gps-close aria-label="Close hole GPS">×</button>
        <div class="dfl-gps-hole-nav">
          <button type="button" data-gps-prev aria-label="Previous hole">‹</button>
          <div class="dfl-gps-head-title"><small>Par <span data-gps-hole-par>${officialPar()||"—"}</span> · <span data-gps-hole-yards>${officialYards()||"—"}</span> yd</small><strong>Hole <span data-gps-hole>${hole}</span></strong></div>
          <button type="button" data-gps-next aria-label="Next hole">›</button>
        </div>
        <span class="dfl-gps-head-spacer"></span>
      </header>
      <div class="dfl-gps-controls">
        <div class="dfl-gps-reading"><b data-gps-distance>—</b><span data-gps-reading-label>yards to Hole ${hole}</span></div>
        <div class="dfl-gps-score-dock"><div class="dfl-gps-player"><strong data-gps-player-name>Your score</strong><small>${uiEsc(config.label)}</small></div><button type="button" class="dfl-gps-score" data-gps-score>Add score</button></div>
        <div class="dfl-gps-club" data-gps-club hidden></div>
        <div class="dfl-gps-actions"><button type="button" data-map-green>Set Hole ${hole} green</button></div>
        <small class="dfl-gps-meta" data-gps-meta></small>
      </div>`;
    document.body.appendChild(panel);
    panel.querySelector("[data-gps-close]").onclick=closePanel;
    panel.querySelector("[data-gps-prev]").onclick=()=>changeHole(-1);
    panel.querySelector("[data-gps-next]").onclick=()=>changeHole(1);
    panel.querySelector("[data-map-me]").onclick=()=>{if(position)requestFreshFix();else restartGps()};
    panel.querySelector("[data-map-green]").onclick=()=>{mappingGreen=!mappingGreen;refresh()};
    panel.querySelector("[data-gps-score]").onclick=()=>{const trigger=scoreContext().trigger;closePanel();requestAnimationFrame(()=>trigger?.click())};
    refresh();void initMap(panel);
  }
  function stop(){
    if(globalThis.__dflCourseGpsStop===stop)globalThis.__dflCourseGpsStop=null;
    if(watchId!=null)navigator.geolocation?.clearWatch(watchId);watchId=null;position=null;samples=[];refining=false;errorText="";destroyMap();
    cleanup?.();cleanup=null;attachedCard=null;
    document.querySelectorAll(`.dfl-gps-bubble${selector},.dfl-gps-panel${selector}`).forEach(node=>node.remove());
  }
  function attach(card){
    if(attachedCard===card&&document.querySelector(`.dfl-gps-bubble${selector}`))return;
    globalThis.__dflCourseGpsStop?.();globalThis.__dflCourseGpsStop=stop;
    ensureStyles();ensureAssistantStyles();ensureHoleMarkerStyles();ensureHoleExperienceStyles();attachedCard=card;hole=scorecardHole(card);void loadMemberBag();
    const bubble=document.createElement("button"),slot=gpsSlot(),beta=Boolean(betaSlot());bubble.type="button";bubble.className=`dfl-gps-bubble${beta?" is-beta":slot?" is-quick-round":""}`;bubble.dataset.gpsCourse=config.key;bubble.setAttribute("aria-label",`Open ${config.label} Hole ${hole} GPS`);bubble.addEventListener("click",openPanel);(slot||document.body).appendChild(bubble);if(slot&&!beta)startGps();refresh();
    const update=e=>{if(!e.target.closest?.("[data-team-score],[data-step],[data-gqm-hole-nav]"))return;setTimeout(()=>{hole=scorecardHole(card);hasFitted=false;refresh()},80)};
    card.addEventListener("input",update);card.addEventListener("click",update);cleanup=()=>{card.removeEventListener("input",update);card.removeEventListener("click",update)};
  }
  function mount(){const view=document.getElementById("view"),query=new URLSearchParams(location.hash.split("?")[1]||"");if(!view||!location.hash.startsWith("#/golf")){stop();return}const card=view.querySelector(".tb-shell[data-tbeta-root]")||view.querySelector('.dfl-team-card[data-quick-active="true"]')||view.querySelector(".dfl-team-card:not([hidden])")||view.querySelector(".dfl-team-card"),quick=card?.matches("[data-quick-player-card]"),beta=card?.matches(".tb-shell[data-tbeta-root]");if(!card||(!query.get("team")&&!quick&&!beta)||!config.courseRe.test(courseText(view))){stop();return}attach(card)}
  function boot(){window.addEventListener("hashchange",()=>setTimeout(mount,0));window.addEventListener("dfl:quick-player-change",()=>setTimeout(mount,0));window.addEventListener("dfl:quick-hole-change",event=>{hole=((Number(event.detail?.hole)||1)-1)%9+1;hasFitted=false;setTimeout(refresh,0)});new MutationObserver(()=>location.hash.startsWith("#/golf")&&mount()).observe(document.body,{childList:true,subtree:true});mount()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  return{mount,stop};
}
