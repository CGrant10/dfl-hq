/* Arena course markers. Presentation only; race timing and order stay untouched. */
const FINISH_ENTER = 1.08;
const FINISH_CROSS = 0.58;
const APPROACH_AT = 0.43;
const CROSS_AT = 0.575;
let raf = 0;
let frozen = false;

function ensureStyle() {
  if (document.getElementById("arena-course-lines-style")) return;
  const style = document.createElement("style");
  style.id = "arena-course-lines-style";
  style.textContent = `
    body.broadcasting .bc-stage .bc-finish {
      left:calc(var(--course-finish-x,${FINISH_ENTER}) * 100%)!important;
      opacity:var(--course-finish-visible,0)!important;
      transition:none!important;
      will-change:left;
    }
    body.broadcasting .bc-stage .bc-finish-stamp {
      left:calc(var(--course-finish-x,${FINISH_ENTER}) * 100%)!important;
    }
    body.broadcasting .bc-stage[data-race-state="running"] .race-start-gate,
    body.broadcasting .bc-stage[data-race-state="finished"] .race-start-gate {
      display:none!important;opacity:0!important;
    }
    /* At the line the camera/course is done travelling. Only racers keep going. */
    body.broadcasting .bc-stage[data-course-frozen="true"] .race-scenery {
      transform:translate3d(-7%,0,0)!important;
      filter:none!important;
    }
    body.broadcasting .bc-stage[data-course-frozen="true"] .bc-finish {
      left:${FINISH_CROSS * 100}%!important;
    }
    body.broadcasting .bc-stage[data-course-frozen="true"] .bc-finish-stamp {
      left:${FINISH_CROSS * 100}%!important;
    }
  `;
  document.head.appendChild(style);
}

function clamp01(n){return Math.max(0,Math.min(1,n))}
function leaderRatio(stage){
  const track=stage.querySelector("#bc-track");
  const width=Math.max(1,track?.clientWidth||1);
  let leader=0;
  stage.querySelectorAll(".bc-runner").forEach(r=>{
    const x=Number.parseFloat(r.style.getPropertyValue("--race-x"));
    if(Number.isFinite(x)) leader=Math.max(leader,x/width);
  });
  return leader;
}

function tick(){
  const stage=document.querySelector("#bc-stage");
  if(stage){
    ensureStyle();
    const state=stage.dataset.raceState||"idle";
    if(state==="idle"||state==="countdown") frozen=false;
    const leader=leaderRatio(stage);
    if(!frozen && state==="running" && leader>=CROSS_AT) frozen=true;

    if(state!=="running"||leader<APPROACH_AT){
      stage.style.setProperty("--course-finish-x",String(FINISH_ENTER));
      stage.style.setProperty("--course-finish-visible","0");
    }else if(frozen){
      stage.style.setProperty("--course-finish-x",String(FINISH_CROSS));
      stage.style.setProperty("--course-finish-visible","1");
    }else{
      /* The line travels with the course as the field approaches it. */
      const t=clamp01((leader-APPROACH_AT)/(CROSS_AT-APPROACH_AT));
      const x=FINISH_ENTER+(FINISH_CROSS-FINISH_ENTER)*t;
      stage.style.setProperty("--course-finish-x",x.toFixed(5));
      stage.style.setProperty("--course-finish-visible",x<1.02?"1":"0");
    }
    stage.dataset.courseFrozen=frozen?"true":"false";
  }
  raf=requestAnimationFrame(tick);
}
function boot(){ensureStyle();if(!raf)raf=requestAnimationFrame(tick)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
