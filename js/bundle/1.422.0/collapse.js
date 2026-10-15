var e=e=>`dfl.collapsed.${e}`;function t(t){try{return localStorage.getItem(e(t))}catch{return null}}function n(t,n){try{localStorage.setItem(e(t),n?`1`:`0`)}catch{}}function r(e){let n=t(e.dataset.collapse);return n===null?e.dataset.collapseDefault===`folded`:n===`1`}function i(){if(document.getElementById(`dfl-collapse-style`))return;let e=document.createElement(`style`);e.id=`dfl-collapse-style`,e.textContent=`
.dfl-fold{display:flex;align-items:center;gap:9px;width:100%;padding:11px 13px;border:0;border-radius:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.dfl-fold:hover{background:var(--bg-3)}
.dfl-fold-title{flex:1;min-width:0;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* The one number worth keeping when the card is shut. A round folded away
   should still say what it finished; otherwise folding the nine you just
   played hides the very thing you folded it to stop scrolling past. */
.dfl-fold-badge{flex:0 0 auto;font-size:12.5px;font-weight:950;font-variant-numeric:tabular-nums;white-space:nowrap}
.dfl-fold-badge:empty{display:none}
.dfl-fold-hint{font-size:9.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
/* A caret, not a word: it turns instead of relabelling, so the control never
   argues with itself about whether it says what it does or what it will do. */
.dfl-fold-caret{flex:0 0 auto;width:16px;height:16px;color:var(--muted);transition:transform .16s ease}
.dfl-fold[aria-expanded="false"] .dfl-fold-caret{transform:rotate(-90deg)}
.is-folded>*:not(.dfl-fold){display:none !important}
.is-folded{padding-bottom:0 !important}
.card.is-folded .dfl-fold{border-radius:12px}
@media(prefers-reduced-motion:reduce){.dfl-fold-caret{transition:none}}`,document.head.appendChild(e)}function a(e){let t=e.dataset.collapseTitle;if(t)return t;let n=e.querySelector(`.card-title, .card-heading, h2, h3`);return n?n.textContent.trim():`Section`}function o(e){if(e.dataset.collapseWired===`1`)return;let o=e.dataset.collapse;if(!o)return;e.dataset.collapseWired=`1`,i();let s=document.createElement(`button`);s.type=`button`,s.className=`dfl-fold`,s.innerHTML=`<svg class="dfl-fold-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5 12 15.5 18 9.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="dfl-fold-title">${a(e)}</span><span class="dfl-fold-badge" data-fold-badge></span><span class="dfl-fold-hint" data-fold-hint></span>`;let c=()=>{let t=e.classList.contains(`is-folded`);s.setAttribute(`aria-expanded`,String(!t)),s.querySelector(`[data-fold-hint]`).textContent=t?`Show`:`Hide`,s.querySelector(`[data-fold-badge]`).textContent=e.dataset.collapseBadge||``,s.setAttribute(`aria-label`,`${t?`Show`:`Hide`} ${a(e)}`)};s.addEventListener(`click`,()=>{let t=!e.classList.contains(`is-folded`);e.classList.toggle(`is-folded`,t),n(o,t),c()}),e.insertBefore(s,e.firstChild),e.classList.toggle(`is-folded`,r(e)),c(),new MutationObserver(()=>{t(o)===null&&(e.classList.toggle(`is-folded`,r(e)),c())}).observe(e,{attributes:!0,attributeFilter:[`data-collapse-default`]})}function s(){if(document.getElementById(`dfl-arena-control-style`))return;let e=document.createElement(`style`);e.id=`dfl-arena-control-style`,e.textContent=`
/* Desktop: the black shell hugs the actual buttons instead of scaling with
   the width of a 1080p/4K display. The old instructional sentence was also
   the thing most likely to spill beyond the pill, so keep controls, lose yap. */
@media (min-width:901px){
  .bc-bar{gap:8px!important;padding:8px 10px!important;max-width:calc(100vw - 32px);width:max-content;box-sizing:border-box;box-shadow:0 10px 30px rgba(0,0,0,.6)!important}
  .bc-bar .bc-btn{font-size:14px!important;padding:8px 13px!important}
  .bc-bar .bc-motion-setting{gap:6px!important;padding:0 5px!important;font-size:12px!important}
  .bc-bar .bc-bar-hint{display:none!important}
}
.bc-bar-toggle{display:none;appearance:none;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:var(--text);border-radius:999px;width:34px;height:34px;padding:0;font:900 18px/1 system-ui,sans-serif;cursor:pointer;place-items:center}
@media (max-width:900px){
  .bc-bar{box-sizing:border-box;transition:width .16s ease,padding .16s ease,background .16s ease!important}
  .bc-bar-toggle{display:grid;order:-1;flex:0 0 34px}
  .bc-bar.mobile-collapsed{width:auto!important;max-width:none!important;padding:5px!important;gap:0!important;flex-wrap:nowrap!important;background:rgba(9,13,19,.86)!important}
  .bc-bar.mobile-collapsed>:not(.bc-bar-toggle){display:none!important}
}

/* The standings rail costs almost a third of the course on a portrait phone.
   That does not change the race gap, but it crushes the number of pixels the
   gap has to read. While the race is live, give the course the whole frame;
   the full standings rail returns automatically as soon as results exist. */
@media (max-width:800px){
  .bc-stage[data-race-state="countdown"] .bc-body,
  .bc-stage[data-race-state="running"] .bc-body{grid-template-columns:minmax(0,1fr)!important}
  .bc-stage[data-race-state="countdown"] .bc-board,
  .bc-stage[data-race-state="running"] .bc-board{display:none!important}
}

/* Finish paint, not finish furniture. Keep the exact same --finish-x ground
   coordinate and layer, but remove every depth cue: no gantry, bevel, glow or
   contact shadow. Racers still pass in front of one flat checkered stripe. */
.bc-stage .bc-finish,
.arena-track-wrap.cinematic-race .track-finish{
  top:16.5%!important;
  bottom:8%!important;
  width:clamp(8px,1.05vw,18px)!important;
  background:repeating-conic-gradient(#f5f7fa 0 25%,#151a21 0 50%) 0 0 / clamp(8px,1.05vw,18px) clamp(8px,1.05vw,18px)!important;
  border:0!important;
  border-radius:0!important;
  box-shadow:none!important;
  opacity:.94;
}
.bc-stage .bc-finish::before,
.bc-stage .bc-finish::after,
.arena-track-wrap.cinematic-race .track-finish::before,
.arena-track-wrap.cinematic-race .track-finish::after{content:none!important;display:none!important}

@media(prefers-reduced-motion:reduce){.bc-bar{transition:none!important}}
`,document.head.appendChild(e)}function c(){let e=document.querySelector(`#bc-bar`),t=document.querySelector(`#bc-stage`);if(!e||!t||e.dataset.mobileCollapseWired===`1`)return;e.dataset.mobileCollapseWired=`1`,s();let n=document.createElement(`button`);n.type=`button`,n.className=`bc-bar-toggle`,n.setAttribute(`aria-label`,`Collapse race controls`),n.setAttribute(`aria-expanded`,`true`),n.textContent=`⌄`,e.insertBefore(n,e.firstChild);let r=()=>{let t=e.classList.contains(`mobile-collapsed`);n.textContent=t?`⌃`:`⌄`,n.setAttribute(`aria-expanded`,String(!t)),n.setAttribute(`aria-label`,t?`Open race controls`:`Collapse race controls`)},i=t=>{e.classList.toggle(`mobile-collapsed`,t),r()};n.addEventListener(`click`,t=>{t.stopPropagation(),i(!e.classList.contains(`mobile-collapsed`))});let a=!1,o=()=>{if(!matchMedia(`(max-width: 900px)`).matches)return;let e=t.dataset.raceState||`idle`;if(e===`idle`){a=!1,i(!1);return}!a&&(e===`countdown`||e===`running`)&&(a=!0,i(!0))};new MutationObserver(o).observe(t,{attributes:!0,attributeFilter:[`data-race-state`]}),o()}function l(){for(let e of document.querySelectorAll(`[data-collapse]`))o(e);c()}function u(){l(),new MutationObserver(l).observe(document.body,{childList:!0,subtree:!0})}document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,u):u();