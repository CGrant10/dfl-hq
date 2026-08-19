/*
  Arena finish-line presentation guard.

  The race simulation owns racer movement and official finish order. The finish
  structure must never look like a second moving object that racers wait on.
  It therefore has exactly one visible position: the real crossing point.

  While the field is still approaching, the structure is hidden. Once the lead
  racer's DISPLAYED position is genuinely in the finishing zone, the structure
  appears already planted at the crossing point and stays there. It never
  sweeps through the runners and it never changes their motion.
*/

const FINISH_RATIO = 0.58;
/* presentationScreenRatio(.95) = .553, so this reveals with only the last
   sliver of track left instead of several seconds before the race gets there. */
const REVEAL_RATIO = 0.548;

let raf = 0;
let stage = null;
let armed = false;

function ensureStyle() {
  if (document.getElementById("arena-finish-line-guard-style")) return;
  const style = document.createElement("style");
  style.id = "arena-finish-line-guard-style";
  style.textContent = `
    body.broadcasting .bc-stage .bc-finish {
      left: ${FINISH_RATIO * 100}% !important;
      opacity: 0;
      transition: opacity 120ms linear;
      will-change: opacity;
    }
    body.broadcasting .bc-stage[data-finish-armed="true"] .bc-finish {
      opacity: 1;
    }
    body.broadcasting .bc-stage .bc-finish-stamp {
      left: ${FINISH_RATIO * 100}% !important;
    }
  `;
  document.head.appendChild(style);
}

function raceX(runner) {
  const raw = runner?.style?.getPropertyValue("--race-x") || "";
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function tick() {
  const next = document.querySelector("#bc-stage");
  if (next !== stage) {
    stage = next;
    armed = false;
  }

  if (stage) {
    ensureStyle();
    const state = stage.dataset.raceState || "";
    const track = stage.querySelector("#bc-track");

    if (state === "idle" || state === "countdown") {
      armed = false;
    } else if (!armed && track) {
      const width = Math.max(1, track.clientWidth || 1);
      let leader = 0;
      stage.querySelectorAll(".bc-runner").forEach((runner) => {
        leader = Math.max(leader, raceX(runner) / width);
      });
      if (leader >= REVEAL_RATIO) armed = true;
    }

    stage.dataset.finishArmed = armed ? "true" : "false";
  }

  raf = requestAnimationFrame(tick);
}

function boot() {
  ensureStyle();
  if (!raf) raf = requestAnimationFrame(tick);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();
