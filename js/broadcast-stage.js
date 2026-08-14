/* =====================================================================
   broadcast-stage.js - the big screen
   ---------------------------------------------------------------------
   Turns the items broadcast-deck.js ranked into markup, and (from step 4)
   moves between them.

   FIVE TREATMENTS AND NO MORE, because a broadcast package with ten looks
   like a template gallery:

     scoreboard    two sides and their figures. Golf, fantasy, your matchup
     champion      one name, at size, once per season
     stat          one figure and one word
     announcement  a headline, some copy, maybe a picture
     event         a date and how far away it is
     hero          the identity floor

   The scoreboard is NOT reimplemented here. It calls marquee() - the same
   function the live golf match card uses - so a score on the front page and
   a score on the match screen are the same object drawn the same way. If
   they ever diverge it will be because somebody changed marquee(), which is
   the correct blast radius.

   NO DOMAIN LOGIC. This file receives finished items. It does not know what
   a battle is, cannot compute a score, and never asks whether something is
   live - it reads item.temporal and draws the chip. It does not decide what
   is drama and what is a label either: the generators hand over moodText and
   whereText, because only they know which they produced.
   ===================================================================== */

import { esc } from "./ui.js";
import { marquee } from "./marquee.js";

/* The chip that keeps the stage honest. Every item that makes a temporal
   claim shows one, so nothing on this screen is undated by accident. */
const TEMPORAL = {
  live:       { label: "Live",       cls: "is-live" },
  upcoming:   { label: "Upcoming",   cls: "is-upcoming" },
  recent:     { label: "Recent",     cls: "is-recent" },
  final:      { label: "Final",      cls: "is-final" },
  historical: { label: "From the archive", cls: "is-historical" },
  none:       null,
};

function chip(item) {
  const t = TEMPORAL[item.temporal];
  if (!t) return "";
  return `<span class="bx-when ${t.cls}">${esc(t.label)}</span>`;
}

// ------------------------------------------------------------- treatments

function scoreboard(item) {
  /* marquee() owns this shape, and the billing bar carries the kicker - for a
     fantasy item that is "2025 · Week 17", so the year is never dropped.

     NO TEMPORAL CHIP HERE. marquee() already carries LIVE and FINAL in its
     billing bar, and the first cut printed both - "FINAL" twice on one
     slide. The billing bar is the canonical place for a scoreboard's state.

     The generators hand over moodText and whereText rather than the stage
     guessing which of headline/subtitle/body is the drama. "Your matchup" is
     a label and belongs in the billing; "ABSOLUTE BEATDOWN" is drama and
     belongs in the mood slot. Only the generator knows which it produced. */
  return marquee({
    billing: [item.kicker, item.headline].filter(Boolean),
    live: item.temporal === "live",
    final: item.temporal === "final" || item.temporal === "recent",
    sides: (item.sides || []).map((s) => ({
      name: s.name, score: s.score, colour: s.colour || "",
      up: !!s.up, down: !!s.down,
    })),
    mood: item.moodText || "",
    tone: item.temporal === "live" ? "hot" : "done",
    where: item.whereText || item.subtitle || "",
  });
}

function champion(item) {
  return `
    <div class="bx-champ">
      <span class="bx-kicker">
        <svg class="ico-sm" aria-hidden="true"><use href="#i-trophy"></use></svg>
        ${esc(item.kicker)}
      </span>
      <strong class="bx-name">${esc(item.headline)}</strong>
      ${item.subtitle ? `<span class="bx-sub">${esc(item.subtitle)}</span>` : ""}
      ${chip(item)}
    </div>`;
}

function stat(item) {
  return `
    <div class="bx-stat">
      ${item.kicker ? `<span class="bx-kicker">${esc(item.kicker)}</span>` : ""}
      ${item.figure != null ? `<strong class="bx-figure">${esc(item.figure)}</strong>` : ""}
      <strong class="bx-statword">${esc(item.headline)}</strong>
      ${item.subtitle ? `<span class="bx-sub">${esc(item.subtitle)}</span>` : ""}
      ${chip(item)}
    </div>`;
}

function announcement(item) {
  return `
    <div class="bx-note">
      ${item.kicker ? `<span class="bx-kicker">${esc(item.kicker)}</span>` : ""}
      <strong class="bx-head">${esc(item.headline)}</strong>
      ${item.subtitle ? `<span class="bx-sub">${esc(item.subtitle)}</span>` : ""}
      ${item.body ? `<p class="bx-body">${esc(item.body)}</p>` : ""}
      ${item.image ? `<img class="bx-image" src="${esc(item.image)}" alt="">` : ""}
      ${chip(item)}
    </div>`;
}

function event(item) {
  return `
    <div class="bx-event">
      ${item.kicker ? `<span class="bx-kicker">${esc(item.kicker)}</span>` : ""}
      <strong class="bx-head">${esc(item.headline)}</strong>
      ${item.subtitle ? `<span class="bx-sub">${esc(item.subtitle)}</span>` : ""}
      ${item.body ? `<span class="bx-when-text">${esc(item.body)}</span>` : ""}
      ${chip(item)}
    </div>`;
}

function hero(item) {
  return `
    <div class="bx-hero">
      <span class="bx-kicker">${esc(item.kicker)}</span>
      <strong class="bx-name">${esc(item.headline)}</strong>
      ${item.subtitle ? `<span class="bx-sub">${esc(item.subtitle)}</span>` : ""}
    </div>`;
}

const TREATMENTS = { scoreboard, champion, stat, announcement, event, hero };

/** One item as markup. An unknown treatment degrades to an announcement. */
export function renderItem(item) {
  if (!item) return "";
  const draw = TREATMENTS[item.treatment] || announcement;
  const inner = draw(item);
  /* The whole slide is the link when the item has somewhere to go, so it
     works on a tap, a click, a keyboard and a screen reader without any
     gesture handling. */
  return item.href
    ? `<a class="bx-slide is-${esc(item.treatment)}" href="${esc(item.href)}">${inner}</a>`
    : `<div class="bx-slide is-${esc(item.treatment)}">${inner}</div>`;
}

/**
 * Draw the stage.
 *
 * Step 3 shows deck[0] and nothing moves. The signature already takes the
 * whole deck so that adding rotation in step 4 changes this file only.
 */
export function renderStage(deck) {
  const first = (deck || [])[0];
  return `
    <section class="bx-stage" data-bx-stage>
      <div class="bx-layer" data-bx-layer>${renderItem(first)}</div>
    </section>`;
}
