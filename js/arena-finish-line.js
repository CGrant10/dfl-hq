/*
  Arena course-line presentation.

  The simulation still owns the race. These are scenery markers only.

  START: visible on the grid, gone the instant the race is actually running.

  FINISH: never parks in front of the racers and never controls a crossing.
  It enters from the right as part of the course, passes through the field,
  and continues off the left. Once the finish sequence begins the course is
  visually frozen; racers keep running through/off screen on their own clock.
*/

const FINISH_ENTER = 1.08;
const FINISH_CROSS = 0.58;
const FINISH_EXIT = -0.10;
const PAN_START = 0.72;
const PAN_END = 1.0;

let raf = 0;

function ensureStyle() {
  if (document.getElementById("arena-course-lines-style")) return;
  const style = document.createElement("style");
  style.id = "arena-course-lines-style";
  style.textContent = `
    body.broadcasting .bc-stage .bc-finish {
      left: calc(var(--course-finish-x, ${FINISH_ENTER}) * 100%) !important;
      opacity: var(--course-finish-visible, 0) !important;
      transition: none !important;
      will-change: left;
    }
    body.broadcasting .bc-stage .bc-finish-stamp {
      left: calc(var(--course-finish-x, ${FINISH_ENTER}) * 100%) !important;
    }
    body.broadcasting .bc-stage[data-race-state="running"] .race-start-gate,
    body.broadcasting .bc-stage[data-race-state="finished"] .race-start-gate {
      display: none !important;
      opacity: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function tick() {
  const stage = document.querySelector("#bc-stage");
  if (stage) {
    ensureStyle();
    const state = stage.dataset.raceState || "idle";
    const runners = [...stage.querySelectorAll(".bc-runner")];
    let leader = 0;
    for (const runner of runners) {
      const raw = runner.style.getPropertyValue("--race-progress");
      const p = Number.parseFloat(raw);
      if (Number.isFinite(p)) leader = Math.max(leader, p);
    }

    if (state === "idle" || state === "countdown" || leader < PAN_START) {
      stage.style.setProperty("--course-finish-x", String(FINISH_ENTER));
      stage.style.setProperty("--course-finish-visible", "0");
      stage.style.setProperty("--course-freeze-pan", "0");
    } else {
      const travel = clamp01((leader - PAN_START) / (PAN_END - PAN_START));
      const x = travel < 0.62
        ? lerp(FINISH_ENTER, FINISH_CROSS, travel / 0.62)
        : lerp(FINISH_CROSS, FINISH_EXIT, (travel - 0.62) / 0.38);
      stage.style.setProperty("--course-finish-x", x.toFixed(5));
      stage.style.setProperty("--course-finish-visible", x > -0.06 && x < 1.04 ? "1" : "0");
      stage.style.setProperty("--course-freeze-pan", travel >= 0.62 ? "1" : "0");
    }
  }
  raf = requestAnimationFrame(tick);
}

function boot() {
  ensureStyle();
  if (!raf) raf = requestAnimationFrame(tick);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();
