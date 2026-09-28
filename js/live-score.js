// =====================================================================
// live-score.js - one honest live-state vocabulary and restrained feedback
// =====================================================================

const FINAL = /final|complete|completed|closed|post/i;
const LIVE = /live|playing|in[_ -]?progress|halftime/i;
const SCORE_MEMORY = "dfl.live-scores.v1";

const number = value => Number.isFinite(Number(value)) ? Number(value) : null;

/** The app never calls a projection a score or guesses that a game is final. */
export function playerLiveState(player = {}) {
  if (player.hasGame === false) return { key: "off", label: "NO GAME" };
  const status = String(player.gameStatus || player.game_status || "");
  if (player.complete || player.isFinal || FINAL.test(status)) return { key: "final", label: "FINAL" };
  if (player.isPlaying || LIVE.test(status)) return { key: "playing", label: "PLAYING" };
  if (player.scoreSource === "actual") return { key: "played", label: "PLAYED" };
  return { key: "projected", label: "YET TO PLAY" };
}

export function scoreTransition(previous, next, { final = false } = {}) {
  const from = number(previous), to = number(next);
  if (from == null || to == null || from === to) return null;
  const delta = Math.round((to - from) * 1000) / 1000;
  return { from, to, delta, kind: final ? "final" : Math.abs(delta) >= 6 ? "big-play" : "score" };
}

export function matchupMoment({ states = [], values = [], previousLeader = "", previousState = "", projectedLeader = "" } = {}) {
  if (states.length !== 2 || values.length !== 2 || values.some(value => number(value) == null) || number(values[0]) === number(values[1])) return null;
  const leader = number(values[0]) > number(values[1]) ? "a" : "b";
  if (states.every(state => state === "projected")) return { leader, source: "projection" };
  if (states[0] !== states[1] || !states.every(state => state === "playing" || state === "final")) return null;
  if (states[0] === "final" && previousState !== "final") {
    return { leader, source: projectedLeader && projectedLeader !== leader ? "upset" : "matchup-final" };
  }
  return { leader, source: previousLeader && previousLeader !== leader ? "comeback" : "" };
}

const readMemory = () => {
  try { return JSON.parse(sessionStorage.getItem(SCORE_MEMORY) || "{}"); }
  catch { return {}; }
};
const saveMemory = memory => {
  try {
    const entries = Object.entries(memory).slice(-120);
    sessionStorage.setItem(SCORE_MEMORY, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
};

function animateScore(node, transition) {
  node.classList.remove("is-score-change", "is-big-play");
  void node.offsetWidth;
  node.classList.add("is-score-change");
  if (transition.kind === "big-play") node.classList.add("is-big-play");
  if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
  const decimals = String(node.dataset.liveScore || "").split(".")[1]?.length || 0;
  const started = performance.now(), duration = 420;
  const step = now => {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    node.textContent = (transition.from + (transition.to - transition.from) * eased).toFixed(decimals);
    if (progress < 1 && node.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Watches only annotated score figures. First paint is deliberately silent. */
export function startLiveScorePresentation(root = document) {
  const memory = readMemory();
  let scheduled = false;
  const scan = () => {
    scheduled = false;
    if (String(globalThis.location?.hash || "").startsWith("#/golf")) return;
    let changed = false;
    let momentSource = "";
    for (const node of root.querySelectorAll?.("[data-live-key][data-live-score]") || []) {
      const key = String(node.dataset.liveKey || "");
      const value = number(node.dataset.liveScore);
      if (!key || value == null) continue;
      const prior = memory[key];
      memory[key] = value;
      if (prior == null) { changed = true; continue; }
      const transition = scoreTransition(prior, value, { final: node.dataset.liveState === "final" });
      if (!transition) continue;
      changed = true;
      animateScore(node, transition);
      if (transition.kind === "big-play" || transition.kind === "final") momentSource ||= transition.kind;
    }
    for (const matchup of root.querySelectorAll?.("[data-live-matchup]") || []) {
      const key = String(matchup.dataset.liveMatchup || "");
      const scores = [...matchup.querySelectorAll("[data-live-score]")].slice(0, 2);
      if (!key || scores.length !== 2) continue;
      const states = scores.map(node => node.dataset.liveState || "projected");
      const values = scores.map(node => number(node.dataset.liveScore));
      const result = matchupMoment({
        states, values,
        previousLeader: memory[`leader:${key}`],
        previousState: memory[`state:${key}`],
        projectedLeader: memory[`pick:${key}`],
      });
      if (!result) continue;
      if (result.source === "projection") {
        memory[`pick:${key}`] = result.leader;
        changed = true;
        continue;
      }
      memory[`leader:${key}`] = result.leader;
      memory[`state:${key}`] = states[0];
      changed = true;
      if (result.source) momentSource = result.source;
    }
    if (momentSource) {
      globalThis.window?.dispatchEvent?.(new CustomEvent("dfl:moment", {
        detail: { kind: "success", source: momentSource },
      }));
    }
    if (changed) saveMemory(memory);
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(scan);
  };
  scan();
  const observer = new MutationObserver(schedule);
  observer.observe(root === document ? document.body : root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
