import {editorialShareCanvas} from './share-editorial.js';
import {drawShareFrame,drawShareFooter} from "./share-card-style.js";
/* =====================================================================
   fact-share.js - a piece of DFL lore as a picture
   ---------------------------------------------------------------------
   The fun fact used to share as plain text, which in a group chat is a
   grey paragraph nobody reads. This paints it onto the same card the golf
   board and the match poster use, so a fact arriving in Messenger looks
   like it came from the same league as everything else.

   IT REUSES golf-share.js's LANGUAGE, NOT ITS CODE PATH: the same 1080 x
   1350 4:5 ratio, the same inks, the same crest, the same shareCanvas()
   fallbacks. What it does not do is borrow the board's layout, because a
   fact is one sentence and a board is a table.

   FIXED COLOURS, not the theme's - the image lands on somebody else's
   phone in somebody else's chat, and it should not turn white because the
   sender happened to have light mode on. Same rule as the golf cards.

   Everything is synchronous, because the share sheet must be opened
   inside the user's gesture - see the note in share.js.
   ===================================================================== */
import { FONT, roundRect, fitText, shareCanvas, shareText } from "./share.js";
import { SHARE_INK } from "./brand-ink.js";
import { factLine } from "./funfacts.js";

const W = 1080, H = 1350;
const { INK, MUTED, BG, CARD, LINE, ACCENT, BRAND_RED, BRAND_YELLOW } = SHARE_INK;

/** Wrap text to a width, returning the lines. Canvas has no such thing. */
function wrap(ctx, text, maxWidth, size, weight) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = w; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * The card.
 *
 * The headline is the whole point, so it is sized to fit rather than
 * truncated: a fact that says "decided by 0.04 points" and then stops is
 * worse than one set two points smaller.
 */
export function factCanvas(fact) {
 return editorialShareCanvas({kind:'League lore',context:fact.season?`${fact.season} SEASON`:'DFL LORE',headline:fact.headline,summary:fact.detail,footer:fact.ask||'Did you know?'});
}

/**
 * Share it, picture first.
 *
 * shareCanvas() already falls back the right way - the share sheet, then
 * saving the PNG, then the clipboard - so a desktop with no share sheet
 * quietly gets the image in its downloads. If the canvas itself cannot be
 * made at all, the original text share still goes out, because a fact
 * that shares as words beats a button that does nothing.
 */
export function shareFact(fact) {
  if (!fact) return "failed";
  try {
    const canvas = factCanvas(fact);
    return shareCanvas(canvas, "dfl-lore.png", {
      title: "DFL HQ — DFL Lore",
      text: factLine(fact),
    });
  } catch (err) {
    console.warn("fact share: falling back to text", err);
    return shareText({ title: "DFL HQ — DFL Lore", text: factLine(fact) });
  }
}
