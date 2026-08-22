/* Shared mobile GPS and satellite-course view for supported DFL courses. */
const uiEsc=value=>String(value??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const toYards=meters=>Math.round(Number(meters||0)*1.0936133);
function distanceYards(a,b){const R=6371000,rad=x=>x*Math.PI/180,dLat=rad(b.lat-a.lat),dLon=rad(b.lng-a.lng),la1=rad(a.lat),la2=rad(b.lat),x=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return toYards(2*R*Math.asin(Math.sqrt(x)))}
function load(key){try{return JSON.parse(localStorage.getItem(key)||"{}")||{}}catch{return {}}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function scorecardHole(card){for(const input of card.querySelectorAll("input[data-team-score]")){if(!String(input.value||"").trim())return ((Number(input.dataset.hole)||1)-1)%9+1}return 1}
function courseText(view){return [...view.querySelectorAll(".golf-event-head .golf-meta span")].map(node=>node.textContent||"").join(" ")}
function mapUrl(query){return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=k&z=16&output=embed`}
function fullMapUrl(query){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}

function ensureStyles(){if(document.getElementById("dfl-course-gps-style"))return;const style=document.createElement("style");style.id="dfl-course-gps-style";style.textContent=`.dfl-gps-bubble{position:fixed;right:12px;bottom:calc(78px + env(safe-area-inset-bottom));z-index:70;min-width:100px;border:1px solid rgba(255,214,0,.35);border-radius:18px;padding:9px 12px;background:rgba(7,15,24,.96);color:var(--text);box-shadow:0 10px 28px rgba(0,0,0,.4);text-align:center;font:inherit}.dfl-gps-bubble strong{display:block;font-size:24px;line-height:1;font-variant-numeric:tabular-nums}.dfl-gps-bubble small{display:block;margin-top:4px;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:900}.dfl-gps-bubble em{color:#ffd400;font-style:normal}.dfl-gps-panel{position:fixed;inset:0;z-index:100;background:#07101b;color:var(--text);display:grid;grid-template-rows:auto minmax(220px,1fr) auto;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}.dfl-gps-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:#0b1726;border-bottom:1px solid var(--line)}.dfl-gps-head span{display:grid}.dfl-gps-head small{color:#ffd400;font-size:9px;letter-spacing:.1em;text-transform:uppercase;font-weight:900}.dfl-gps-close{width:42px;height:42px;border:1px solid var(--line);border-radius:10px;background:#13243a;color:var(--text);font-size:25px}.dfl-gps-map{position:relative;background:#132233;overflow:hidden}.dfl-gps-map iframe{width:100%;height:100%;border:0;background:#132233}.dfl-gps-map-tools{position:absolute;left:10px;right:10px;bottom:10px;display:flex;gap:7px;pointer-events:none}.dfl-gps-map-tools button,.dfl-gps-map-tools a{pointer-events:auto;min-height:38px;border:1px solid rgba(255,255,255,.34);border-radius:9px;padding:8px 10px;background:rgba(7,15,24,.92);color:#fff;text-decoration:none;font:800 11px/1 inherit}.dfl-gps-controls{padding:10px 12px 12px;background:#0b1726;border-top:1px solid var(--line)}.dfl-gps-reading{display:grid;grid-template-columns:52px 1fr 52px;align-items:center;gap:8px}.dfl-gps-reading>button{height:52px;border:1px solid var(--line);border-radius:11px;background:#13243a;color:var(--text);font-size:28px;font-weight:900}.dfl-gps-number{text-align:center}.dfl-gps-number b{display:block;font-size:38px;line-height:1;font-variant-numeric:tabular-nums}.dfl-gps-number span{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.dfl-gps-set{width:100%;min-height:44px;margin-top:9px;border:0;border-radius:10px;background:#ffd400;color:#08111d;font-weight:900}.dfl-gps-set:disabled,.dfl-gps-map-tools button:disabled{opacity:.48}.dfl-gps-meta{display:block;margin-top:7px;color:var(--muted);font-size:10px;text-align:center}@media(min-width:760px){.dfl-gps-panel{inset:4vh max(12px,calc((100vw - 720px)/2));border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 24px 70px #000}.dfl-gps-map{min-height:420px}}`;document.head.appendChild(style)}

export function setupCourseGps(config){
  let watchId=null,position=null,hole=1,attachedCard=null,cleanup=null,errorText="";
  const selector=`[data-gps-course="${config.key}"]`;
  const greens=()=>load(config.storageKey);
  const green=()=>greens()[hole];
  const reading=()=>position&&green()?distanceYards({lat:position.coords.latitude,lng:position.coords.longitude},green()):null;
  function refresh(){
    const bubble=document.querySelector(`.dfl-gps-bubble${selector}`),panel=document.querySelector(`.dfl-gps-panel${selector}`),value=reading(),saved=green();
    if(bubble)bubble.innerHTML=value!=null?`<strong>${value}</strong><small>yd · H${hole} · ±${toYards(position.coords.accuracy)}</small>`:position?`<strong>H${hole}</strong><small><em>GPS</em> · set green</small>`:`<strong>GPS</strong><small><em>Course view</em> · tap</small>`;
    if(!panel)return;
    panel.querySelector("[data-gps-distance]").textContent=value??"—";
    panel.querySelector("[data-gps-reading-label]").textContent=saved?`yards to Hole ${hole} center`:`Hole ${hole} · green not set`;
    panel.querySelector("[data-gps-hole]")?.replaceChildren(String(hole));
    const set=panel.querySelector("[data-gps-set]");set.disabled=!position;set.textContent=saved?"Update this green from my location":"Set this green from my location";
    const me=panel.querySelector("[data-map-me]");me.disabled=!position;
    panel.querySelector("[data-gps-meta]").textContent=errorText||(position?`GPS accuracy ±${toYards(position.coords.accuracy)} yd${saved?" · green saved on this device":""}`:"Allow location for live yardage. The course map works without it.");
  }
  function startGps(){if(watchId!=null||!navigator.geolocation)return;watchId=navigator.geolocation.watchPosition(next=>{position=next;errorText="";refresh()},err=>{errorText=err?.message||"Location permission is needed for live yardage.";refresh()},{enableHighAccuracy:true,maximumAge:2500,timeout:15000})}
  function closePanel(){document.querySelector(`.dfl-gps-panel${selector}`)?.remove()}
  function openPanel(){
    closePanel();startGps();
    const panel=document.createElement("section");panel.className="dfl-gps-panel";panel.dataset.gpsCourse=config.key;panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label",`${config.label} GPS course view`);
    panel.innerHTML=`<header class="dfl-gps-head"><span><small>GPS · Satellite course view</small><strong>${uiEsc(config.label)}</strong></span><button type="button" class="dfl-gps-close" data-gps-close aria-label="Close course view">×</button></header><div class="dfl-gps-map"><iframe data-gps-map title="Satellite view of ${uiEsc(config.label)}" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="${mapUrl(config.mapQuery)}"></iframe><div class="dfl-gps-map-tools"><button type="button" data-map-course>Course</button><button type="button" data-map-me disabled>My location</button><a href="${fullMapUrl(config.mapQuery)}" target="_blank" rel="noopener">Open full map ↗</a></div></div><div class="dfl-gps-controls"><div class="dfl-gps-reading"><button type="button" data-gps-prev aria-label="Previous hole">‹</button><div class="dfl-gps-number"><b data-gps-distance>—</b><span data-gps-reading-label>Hole ${hole}</span></div><button type="button" data-gps-next aria-label="Next hole">›</button></div><button type="button" class="dfl-gps-set" data-gps-set disabled>Set this green from my location</button><small class="dfl-gps-meta" data-gps-meta></small></div>`;
    document.body.appendChild(panel);
    panel.querySelector("[data-gps-close]").onclick=closePanel;
    panel.querySelector("[data-gps-prev]").onclick=()=>{hole=hole<=1?9:hole-1;refresh()};
    panel.querySelector("[data-gps-next]").onclick=()=>{hole=hole>=9?1:hole+1;refresh()};
    panel.querySelector("[data-gps-set]").onclick=()=>{if(!position)return;const all=greens();all[hole]={lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy,at:Date.now()};save(config.storageKey,all);refresh()};
    panel.querySelector("[data-map-course]").onclick=()=>{panel.querySelector("[data-gps-map]").src=mapUrl(config.mapQuery)};
    panel.querySelector("[data-map-me]").onclick=()=>{if(position)panel.querySelector("[data-gps-map]").src=mapUrl(`${position.coords.latitude},${position.coords.longitude}`)};
    refresh();
  }
  function stop(){
    if(globalThis.__dflCourseGpsStop===stop)globalThis.__dflCourseGpsStop=null;
    if(watchId!=null)navigator.geolocation?.clearWatch(watchId);watchId=null;position=null;errorText="";
    cleanup?.();cleanup=null;attachedCard=null;
    document.querySelectorAll(`.dfl-gps-bubble${selector},.dfl-gps-panel${selector}`).forEach(node=>node.remove());
  }
  function attach(card){
    if(attachedCard===card&&document.querySelector(`.dfl-gps-bubble${selector}`))return;
    globalThis.__dflCourseGpsStop?.();globalThis.__dflCourseGpsStop=stop;
    ensureStyles();attachedCard=card;hole=scorecardHole(card);
    const bubble=document.createElement("button");bubble.type="button";bubble.className="dfl-gps-bubble";bubble.dataset.gpsCourse=config.key;bubble.addEventListener("click",openPanel);document.body.appendChild(bubble);refresh();
    const update=e=>{if(!e.target.closest?.("[data-team-score],[data-step],[data-gqm-hole-nav]"))return;setTimeout(()=>{hole=scorecardHole(card);refresh()},80)};
    card.addEventListener("input",update);card.addEventListener("click",update);cleanup=()=>{card.removeEventListener("input",update);card.removeEventListener("click",update)};
  }
  function mount(){const view=document.getElementById("view"),query=new URLSearchParams(location.hash.split("?")[1]||"");if(!view||!location.hash.startsWith("#/golf")){stop();return}const card=view.querySelector(".dfl-team-card"),quick=card?.matches("[data-quick-player-card]");if(!card||(!query.get("team")&&!quick)||!config.courseRe.test(courseText(view))){stop();return}attach(card)}
  function boot(){window.addEventListener("hashchange",()=>setTimeout(mount,0));const view=document.getElementById("view");if(view)new MutationObserver(()=>location.hash.startsWith("#/golf")&&mount()).observe(view,{childList:true,subtree:true});mount()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  return{mount,stop};
}
