/* =====================================================================
   collapse.js - fold away a card you are done with
   ---------------------------------------------------------------------
   The golf event page is long: a draft board, a points board, three
   battles, a leaderboard, the teams, the roster, the team editor, the
   generator. Most of it is setup - once the day is under way it is all
   screen filler between you and the scores.

   So any card can be folded. Mark it up and this file does the rest:

     <section class="card" data-collapse="golf-teams" data-collapse-title="Teams">

   WHAT IT REMEMBERS
   The folded/open state is per key, per device, in localStorage - so the
   commissioner who folds the generator on their phone still has it folded
   next week, and nobody else is affected. A key is a stable name, never an
   id, or the state would be forgotten every time a row was rebuilt.

   DEFAULTS, AND WHY THEY ARE THREE-STATE
   A card can ask to start folded:

     <section class="card" data-collapse="golf-round-1" data-collapse-default="folded">

   That is only a DEFAULT. It applies while the reader has never touched
   that card, and the moment they do their choice wins for good - which is
   why an open card now stores "0" rather than deleting its key. With two
   states there was no way to tell "they opened it" from "they have never
   seen it", so a round that folded itself on completing would have folded
   itself again every fifteen seconds under somebody who kept opening it.

   The default is re-read on every draw, so it can follow the content: the
   round cards ask to be folded once every match in them is decided, and
   the draft board asks once the last pick is in. Nothing here works any of
   that out - the module that owns the facts writes the attribute.

   HOW IT ATTACHES
   A MutationObserver, because every golf card is rendered by innerHTML and
   then re-rendered by a poll or a save - there is no single moment after
   which the DOM is settled. Cards are marked as wired so a re-render costs
   one pass over the new nodes and nothing else.

   The button is a real <button> with aria-expanded and it wraps the card's
   existing title, so a screen reader and a keyboard get the same affordance
   as a thumb.
   ===================================================================== */

const KEY = (name) => `dfl.collapsed.${name}`;

/** "1" folded, "0" open, null when this reader has never touched the card. */
function choice(name) {
  try { return localStorage.getItem(KEY(name)); } catch { return null; }
}

/* Both answers are written down. Deleting the key on open would throw away
   the difference between "they want this open" and "they have not decided",
   and the default would then keep overruling them. */
function remember(name, isCollapsed) {
  try { localStorage.setItem(KEY(name), isCollapsed ? "1" : "0"); }
  catch { /* private mode: it just will not be remembered */ }
}

/** Where a card should start: the reader's choice, else what it asked for. */
function startFolded(card) {
  const made = choice(card.dataset.collapse);
  if (made !== null) return made === "1";
  return card.dataset.collapseDefault === "folded";
}

function styles() {
  if (document.getElementById("dfl-collapse-style")) return;
  const s = document.createElement("style");
  s.id = "dfl-collapse-style";
  s.textContent = `
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
@media(prefers-reduced-motion:reduce){.dfl-fold-caret{transition:none}}`;
  document.head.appendChild(s);
}

/*
  The card's own heading is reused as the button's label wherever there is
  one, so folding does not introduce a second, differently worded title for
  the same card. data-collapse-title is the fallback for a card whose
  heading is a graphic - the points board, for one.
*/
function titleFor(card) {
  const explicit = card.dataset.collapseTitle;
  if (explicit) return explicit;
  const found = card.querySelector(".card-title, .card-heading, h2, h3");
  return found ? found.textContent.trim() : "Section";
}

function wire(card) {
  if (card.dataset.collapseWired === "1") return;
  const name = card.dataset.collapse;
  if (!name) return;
  card.dataset.collapseWired = "1";
  styles();

  const button = document.createElement("button");
  button.type = "button";
  button.className = "dfl-fold";
  button.innerHTML = `<svg class="dfl-fold-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5 12 15.5 18 9.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="dfl-fold-title">${titleFor(card)}</span><span class="dfl-fold-badge" data-fold-badge></span><span class="dfl-fold-hint" data-fold-hint></span>`;

  const paint = () => {
    const isFolded = card.classList.contains("is-folded");
    button.setAttribute("aria-expanded", String(!isFolded));
    button.querySelector("[data-fold-hint]").textContent = isFolded ? "Show" : "Hide";
    button.querySelector("[data-fold-badge]").textContent = card.dataset.collapseBadge || "";
    button.setAttribute("aria-label", `${isFolded ? "Show" : "Hide"} ${titleFor(card)}`);
  };

  button.addEventListener("click", () => {
    const nowFolded = !card.classList.contains("is-folded");
    card.classList.toggle("is-folded", nowFolded);
    remember(name, nowFolded);
    paint();
  });

  card.insertBefore(button, card.firstChild);
  card.classList.toggle("is-folded", startFolded(card));
  paint();
  /* Re-read the default when the card changes its mind - a round that has
     just been decided asks to fold, and it should not have to wait for a
     re-render to be listened to. A reader who has already chosen is not
     disturbed, because startFolded() puts their choice first. */
  new MutationObserver(() => {
    if (choice(name) !== null) return;
    card.classList.toggle("is-folded", startFolded(card));
    paint();
  }).observe(card, { attributes: true, attributeFilter: ["data-collapse-default"] });
}

function sweep() {
  for (const card of document.querySelectorAll("[data-collapse]")) wire(card);
}

function boot() {
  sweep();
  new MutationObserver(sweep).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
