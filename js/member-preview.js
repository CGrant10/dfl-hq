/*
  VIEW AS MEMBER.

  A commissioner needs to see the app the way everybody else sees it, and the
  old way to do that was to log out, look, and log back in. This is one tap in
  the top bar.

  The gate itself lives in supabase.js: while the preview is on, every
  privileged accessor answers false AND db() hands back the public client, so a
  write is refused by Postgres rather than merely hidden by the UI. Nothing in
  this file decides what is allowed - it only offers the switch, says plainly
  which mode you are in, and covers the repaint with a bit of theatre.

  The signal is the switch itself: a hardware-style toggle with a lit knob,
  sitting in the top bar where it is always on screen. An earlier version threw
  a gold banner across the whole app, which was unmissable and far too loud for
  something you flip several times while checking one page.
*/
import { canPreviewAsMember, isMemberPreview, setMemberPreview } from "./supabase.js";
import { renderRoute } from "./router.js";

const STYLE_ID = "dfl-member-preview-style";
const GLITCH_MS = 620;
const SWITCH_AT = 190;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
/* The switch: a track, a travelling knob, and a lit state that only appears in
   member view. Reads as off/on at a glance without shouting. */
.dfl-preview-toggle{display:none;align-items:center;gap:7px;min-height:30px;margin-left:auto;padding:4px 9px 4px 7px;border:1px solid var(--control-line,rgba(255,255,255,.24));border-radius:999px;background:var(--control-bg,rgba(255,255,255,.06));color:var(--muted,#9fb0c0);font:900 9px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;cursor:pointer;transition:color .2s,border-color .2s,background .2s}
.dfl-preview-toggle.is-available{display:inline-flex}
.dfl-preview-track{position:relative;flex:0 0 auto;width:24px;height:13px;border:1px solid var(--control-line,rgba(255,255,255,.3));border-radius:999px;background:rgba(0,0,0,.32);transition:background .22s,border-color .22s}
.dfl-preview-knob{position:absolute;top:1px;left:1px;width:9px;height:9px;border-radius:50%;background:var(--muted,#8fa0b0);transition:transform .22s cubic-bezier(.34,1.4,.5,1),background .22s}
.dfl-preview-toggle[aria-pressed="true"]{border-color:#5ad1a0;background:rgba(90,209,160,.12);color:#5ad1a0}
.dfl-preview-toggle[aria-pressed="true"] .dfl-preview-track{border-color:#5ad1a0;background:rgba(90,209,160,.28)}
.dfl-preview-toggle[aria-pressed="true"] .dfl-preview-knob{transform:translateX(11px);background:#5ad1a0;box-shadow:0 0 6px #5ad1a0}
.dfl-preview-toggle:focus-visible{outline:2px solid var(--accent,#ffd400);outline-offset:2px}
@media(max-width:420px){.dfl-preview-toggle{padding:4px 7px 4px 6px}.dfl-preview-label{display:none}}

/* THE GLITCH. A CRT losing sync for half a second: scanlines roll, the picture
   tears into offset slices, the colour channels separate, and a monospace
   readout names the mode you are landing in. The route repaints underneath at
   ${SWITCH_AT}ms, so the switch is covered rather than watched. */
.dfl-glitch{position:fixed;inset:0;z-index:9500;overflow:hidden;pointer-events:none;animation:dfl-glitch-out ${GLITCH_MS}ms steps(1,end) forwards}
.dfl-glitch-scan{position:absolute;inset:-10% 0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.14) 0,rgba(255,255,255,.14) 1px,transparent 1px,transparent 3px);animation:dfl-glitch-roll ${GLITCH_MS}ms linear}
.dfl-glitch-tear{position:absolute;left:-6%;width:112%;background:rgba(120,255,220,.1);mix-blend-mode:screen;animation:dfl-glitch-tear 140ms steps(2,end) infinite}
.dfl-glitch-rgb{position:absolute;inset:0;mix-blend-mode:screen;animation:dfl-glitch-rgb 110ms steps(2,end) infinite}
.dfl-glitch-rgb.is-red{background:rgba(255,40,80,.16)}
.dfl-glitch-rgb.is-cyan{background:rgba(40,220,255,.16);animation-direction:reverse}
/* The readout sits on a plate. Without one it lands on top of whatever the page
   was already showing - a headline, a photo - and turns into noise. */
.dfl-glitch-readout{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:min(340px,calc(100% - 32px));padding:13px 20px;border:1px solid rgba(138,255,216,.5);border-radius:4px;background:rgba(4,12,10,.86);text-align:center;color:#8affd8;font:900 10px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.3em;text-transform:uppercase;text-shadow:0 0 10px rgba(138,255,216,.65);box-shadow:0 0 26px rgba(138,255,216,.22);animation:dfl-glitch-flicker ${GLITCH_MS}ms steps(1,end)}
.dfl-glitch-readout b{display:block;margin-top:3px;font-size:14px;letter-spacing:.18em;color:#d8fff2}
@keyframes dfl-glitch-roll{from{transform:translateY(-14%)}to{transform:translateY(14%)}}
@keyframes dfl-glitch-tear{0%{transform:translateX(-3%) scaleY(1)}50%{transform:translateX(4%) scaleY(1.6)}100%{transform:translateX(-1%) scaleY(.7)}}
@keyframes dfl-glitch-rgb{0%{transform:translate(-4px,1px)}50%{transform:translate(5px,-2px)}100%{transform:translate(-2px,2px)}}
@keyframes dfl-glitch-flicker{0%{opacity:0}12%{opacity:1}22%{opacity:.15}34%{opacity:1}62%{opacity:.85}78%{opacity:1}100%{opacity:0}}
@keyframes dfl-glitch-out{0%,86%{opacity:1}100%{opacity:0}}

/* The app itself jolts, so it reads as the whole machine losing sync and not an
   overlay floating on top of a perfectly calm page. */
/* The shake shifts things sideways, which grows the document and pops a
   horizontal scrollbar for the duration. clip rather than hidden, and on the
   root as well as the body: the root is the scrolling element here, so a rule
   on body alone does nothing, and hidden would turn it into a scroll container
   and lose the vertical position. */
:root:has(body.is-glitching),body.is-glitching{overflow-x:clip}
body.is-glitching #view,body.is-glitching .topbar{animation:dfl-glitch-shake ${GLITCH_MS}ms steps(2,end)}
@keyframes dfl-glitch-shake{0%{transform:none;filter:none}14%{transform:translate(-3px,1px) skewX(1.2deg);filter:contrast(1.5) hue-rotate(12deg)}30%{transform:translate(4px,-2px);filter:invert(.08) saturate(1.5)}46%{transform:translate(-2px,2px) skewX(-.8deg)}62%{transform:translate(2px,0);filter:contrast(1.2)}100%{transform:none;filter:none}}

/* Anyone who has asked the system to calm down gets the switch with none of the
   theatre - the mode still changes, it just does not lurch. */
@media(prefers-reduced-motion:reduce){
  .dfl-glitch{animation:dfl-glitch-out 160ms steps(1,end) forwards}
  .dfl-glitch-scan,.dfl-glitch-tear,.dfl-glitch-rgb{display:none}
  .dfl-glitch-readout{animation:none;opacity:1}
  body.is-glitching #view,body.is-glitching .topbar{animation:none}
  .dfl-preview-knob{transition:none}
}
`;
  document.head.appendChild(style);
}

const button = () => document.querySelector("[data-dfl-preview-toggle]");
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

function paint() {
  const node = button();
  if (!node) return;
  const available = canPreviewAsMember();
  const on = isMemberPreview();
  node.classList.toggle("is-available", available);
  node.setAttribute("aria-pressed", String(on));
  node.hidden = !available;
  node.querySelector(".dfl-preview-label").textContent = on ? "Member" : "Commish";
  node.title = on
    ? "You are seeing the app as a member. Your access is intact - tap to take it back."
    : "See the app the way a member sees it. Nothing can be written while it is on.";
  document.body.classList.toggle("is-member-preview", on);
}

/* Plays over the top while the route repaints underneath. */
function glitch(landingOn) {
  const overlay = document.createElement("div");
  overlay.className = "dfl-glitch";
  overlay.setAttribute("aria-hidden", "true");
  const tears = [18, 39, 57, 74]
    .map(top => `<div class="dfl-glitch-tear" style="top:${top}%;height:${3 + (top % 5)}%"></div>`)
    .join("");
  overlay.innerHTML = `
    <div class="dfl-glitch-scan"></div>
    ${tears}
    <div class="dfl-glitch-rgb is-red"></div>
    <div class="dfl-glitch-rgb is-cyan"></div>
    <div class="dfl-glitch-readout">
      <span>reassigning session</span>
      <b>${landingOn ? "access :: member" : "access :: commissioner"}</b>
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add("is-glitching");
  setTimeout(() => {
    overlay.remove();
    document.body.classList.remove("is-glitching");
  }, reducedMotion() ? 200 : GLITCH_MS);
}

/* A second tap mid-glitch would commit twice and leave the switch disagreeing
   with the gates, so the switch is deaf until the transition finishes. */
let switching = false;

function toggle() {
  if (switching || !canPreviewAsMember()) return;
  switching = true;
  const landingOn = !isMemberPreview();
  glitch(landingOn);
  const commit = () => {
    setMemberPreview(landingOn);
    paint();
    /* Every page reads the gates while it renders, so the current one has to be
       drawn again before any of this is visible. */
    void renderRoute();
    switching = false;
  };
  if (reducedMotion()) commit();
  else setTimeout(commit, SWITCH_AT);
}

export function refreshMemberPreview() {
  ensureStyles();
  paint();
}

export function mountMemberPreview() {
  const bar = document.querySelector(".topbar-inner");
  const whoami = document.getElementById("whoami");
  if (!bar || button()) return refreshMemberPreview();
  ensureStyles();
  const node = document.createElement("button");
  node.type = "button";
  node.className = "dfl-preview-toggle";
  node.dataset.dflPreviewToggle = "";
  node.hidden = true;
  node.setAttribute("aria-pressed", "false");
  node.innerHTML = `<span class="dfl-preview-track" aria-hidden="true"><span class="dfl-preview-knob"></span></span><span class="dfl-preview-label">Commish</span>`;
  node.addEventListener("click", toggle);
  bar.insertBefore(node, whoami || null);
  /* Selecting a different member can hand commissioner access over or take it
     away, so the toggle has to re-decide whether it belongs on screen. */
  window.addEventListener("dfl:pick-member", () => setTimeout(refreshMemberPreview, 0));
  refreshMemberPreview();
}
