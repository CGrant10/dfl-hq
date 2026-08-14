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
 * Renders deck[0] and the controls. Nothing moves until startStage() is
 * called on the resulting element, so the markup is safe to build on the
 * server-ish path (a template string) and safe to re-render.
 *
 * aria-live="off" IS LOAD-BEARING. #view is aria-live="polite", so without
 * this every slide change would be read aloud, forever, over whatever the
 * user was actually trying to listen to. A rotating billboard is decorative
 * motion, not an announcement. The dots carry the state for anyone
 * navigating by keyboard, and each slide's link text says where it goes.
 */
export function renderStage(deck) {
  const items = deck || [];
  const first = items[0];
  return `
    <section class="bx-stage" data-bx-stage>
      <div class="bx-layer" data-bx-layer aria-live="off" aria-atomic="true">${renderItem(first)}</div>
      ${items.length > 1 ? controls(items) : ""}
    </section>`;
}

function controls(items) {
  /* One pause button and one dot per slide. The dots are real buttons, so
     the whole thing is reachable with a keyboard and needs no gestures. */
  const dots = items.map((it, i) => `
    <button type="button" class="bx-dot${i === 0 ? " on" : ""}" data-bx-go="${i}"
      aria-label="Show item ${i + 1} of ${items.length}"${i === 0 ? ' aria-current="true"' : ""}></button>`).join("");
  /* The button's accessible name is the ACTION, and there is deliberately no
     aria-pressed. A toggle that changes both its label and its pressed state
     announces itself as "Play, toggle button, pressed", which is a riddle.
     One or the other: this one names what happens if you press it. */
  return `
    <div class="bx-controls" data-bx-controls>
      <button type="button" class="bx-pause" data-bx-pause aria-label="Pause the broadcast">
        <svg class="ico-sm bx-i-pause" aria-hidden="true"><use href="#i-pause"></use></svg>
        <svg class="ico-sm bx-i-play" aria-hidden="true"><use href="#i-play"></use></svg>
      </button>
      <div class="bx-dots">${dots}</div>
    </div>`;
}

/* =====================================================================
   THE ROTATION ENGINE

   setTimeout, not CSS animation and not requestAnimationFrame.

   tokens.css zeroes animation-duration globally under
   prefers-reduced-motion, so a CSS-driven rotation would fire all its
   iterations instantly for exactly the users who asked for less movement.
   The clock therefore lives in JS, where reduced motion is a decision
   rather than an accident. rAF is wrong too: it is a paint clock, it does
   not run in a background tab, and this needs a wall clock.

   WCAG 2.2.2 (Pause, Stop, Hide) applies: this moves by itself, for more
   than five seconds, and it is not essential. So there is a real pause
   button, and it latches - a user who pauses stays paused.

   On top of that the stage pauses itself whenever attention is clearly
   elsewhere or clearly here:

     tab hidden      nobody is looking, and a phone should not burn battery
     pointer over    you are reading it, or about to tap it
     focus inside    you are on it with a keyboard; moving the target is cruel

   Those are SOFT pauses held in a Set of reasons. They resume on their own.
   The button's pause does not, which is the whole difference between the
   two and why they are not the same flag.
   ===================================================================== */

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Live data goes stale fastest, so a live deck re-checks itself. */
const LIVE_POLL_MS = 15000;

/**
 * Bring a rendered stage to life.
 *
 * @param {Element} root     the [data-bx-stage] element
 * @param {Array}   deck     the deck it was rendered from
 * @param {object}  opts
 * @param {Function} [opts.refresh]  async () => newDeck, called every 15s
 *                                   while a live item is on the deck
 * @returns {{stop: Function, update: Function}} stop() MUST be called when
 *          the page is left, or the timer outlives the DOM it draws into.
 */
export function startStage(root, deck, { refresh } = {}) {
  let items = (deck || []).slice();
  let i = 0;
  let timer = null;
  let poll = null;
  let userPaused = reduced();   // reduced motion starts still, not broken
  const soft = new Set();
  let dead = false;

  const layer = root.querySelector("[data-bx-layer]");
  /* Looked up on demand, never cached: the controls are re-rendered whenever
     the deck length changes, so a captured reference would go stale and the
     button would stop working. Click handling is delegated on root for the
     same reason. */
  const pauseBtn = () => root.querySelector("[data-bx-pause]");
  const running = () => !dead && !userPaused && !soft.size && items.length > 1;

  function clear() { if (timer) { clearTimeout(timer); timer = null; } }

  function arm() {
    clear();
    if (!running()) return;
    const dwell = items[i]?.dwell || 6000;
    timer = setTimeout(() => { go(i + 1); }, dwell);
  }

  function paint() {
    if (!layer) return;
    layer.innerHTML = renderItem(items[i]);
    /* Enter on the next tick so the browser has a frame with the old
       opacity to transition from. Under reduced motion the transition
       duration is 0ms and this is an instant cut, which is the point. */
    const slide = layer.firstElementChild;
    if (slide) {
      slide.classList.add("bx-enter");
      setTimeout(() => slide.classList.remove("bx-enter"), 20);
    }
    root.querySelectorAll("[data-bx-go]").forEach((d) => {
      const on = Number(d.dataset.bxGo) === i;
      d.classList.toggle("on", on);
      if (on) d.setAttribute("aria-current", "true");
      else d.removeAttribute("aria-current");
    });
  }

  function go(next) {
    if (dead || !items.length) return;
    i = ((next % items.length) + items.length) % items.length;
    paint();
    arm();
  }

  /* Every place that can put a fresh button in the DOM calls this, so the
     glyph and the accessible name can never disagree with the state. The
     first cut set them only in setPaused(), and a rebuild after phase 2 then
     showed a play triangle labelled "Pause the broadcast". */
  function paintButton() {
    const btn = pauseBtn();
    if (!btn) return;
    btn.setAttribute("aria-label", userPaused ? "Play the broadcast" : "Pause the broadcast");
    btn.classList.toggle("is-paused", userPaused);
  }

  function setPaused(on) {
    userPaused = on;
    paintButton();
    root.classList.toggle("is-paused", on);
    if (on) clear(); else arm();
  }

  function softPause(reason, on) {
    if (on) soft.add(reason); else soft.delete(reason);
    if (soft.size) clear(); else arm();
  }

  // ------------------------------------------------------------- listeners

  const onClick = (e) => {
    if (e.target.closest("[data-bx-pause]")) { setPaused(!userPaused); return; }
    const dot = e.target.closest("[data-bx-go]");
    if (!dot) return;
    /* Choosing a slide by hand is a deliberate act, so it latches too -
       otherwise the thing you just asked to see slides away in 6 seconds. */
    setPaused(true);
    go(Number(dot.dataset.bxGo));
  };
  const onVis = () => softPause("hidden", document.hidden);
  const onEnter = () => softPause("hover", true);
  const onLeave = () => softPause("hover", false);
  const onFocusIn = () => softPause("focus", true);
  const onFocusOut = (e) => {
    if (!root.contains(e.relatedTarget)) softPause("focus", false);
  };

  root.addEventListener("click", onClick);
  root.addEventListener("pointerenter", onEnter);
  root.addEventListener("pointerleave", onLeave);
  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("focusout", onFocusOut);
  document.addEventListener("visibilitychange", onVis);

  // ----------------------------------------------------------- live refresh

  /**
   * Replace the deck without yanking the screen out from under the reader.
   * The current item is looked up by id in the new deck and kept if it is
   * still there, so a poll that changes nothing changes nothing.
   */
  function update(next) {
    const fresh = (next || []).slice();
    if (!fresh.length) return;
    const currentId = items[i]?.id;
    const same = fresh.length === items.length &&
      fresh.every((it, n) => it.id === items[n]?.id && it.headline === items[n]?.headline &&
        JSON.stringify(it.sides || null) === JSON.stringify(items[n]?.sides || null));
    items = fresh;
    if (same) return;                       // nothing moved; leave the DOM alone
    const found = fresh.findIndex((it) => it.id === currentId);
    i = found >= 0 ? found : 0;
    rebuildDots();
    paint();
    arm();
  }

  function rebuildDots() {
    const wrap = root.querySelector("[data-bx-controls]");
    if (items.length < 2) { wrap?.remove(); clear(); return; }
    /* A one-item deck renders no controls, and phase 2 usually turns it into
       an eight-item one, so this has to be able to create them as well as
       replace them. */
    if (wrap) wrap.outerHTML = controls(items);
    else root.insertAdjacentHTML("beforeend", controls(items));
    paintButton();
  }

  function armPoll() {
    if (!refresh) return;
    const live = items.some((it) => it.temporal === "live");
    if (!live) { if (poll) { clearInterval(poll); poll = null; } return; }
    if (poll) return;
    poll = setInterval(async () => {
      if (dead || document.hidden) return;  // a hidden tab does not poll
      try { update(await refresh()); } catch (err) { console.warn("broadcast: refresh failed", err); }
      armPoll();
    }, LIVE_POLL_MS);
  }

  paint();
  arm();
  armPoll();
  paintButton();          // reduced motion starts paused; say so on the button

  return {
    update(next) { update(next); armPoll(); },
    stop() {
      dead = true;
      clear();
      if (poll) { clearInterval(poll); poll = null; }
      root.removeEventListener("click", onClick);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("visibilitychange", onVis);
    },
  };
}
