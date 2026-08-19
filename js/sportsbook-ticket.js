// =====================================================================
// sportsbook-ticket.js - share one betting ticket as an image.
// ---------------------------------------------------------------------
// The fifth card in the DFL identity, and deliberately the FOURTH implementation
// of nothing: roundRect(), fitText(), crestImage() and shareCanvas() come from
// share.js, the palette from brand-ink.js, and the frame is the same 1080x1350
// every other DFL card uses. A ticket is not a screenshot of a row.
//
// A ticket is portrait and narrow by nature - one wager, one price, one return -
// so this card is mostly white space around a big number, which is what a
// betting slip actually looks like. It does not try to fill the frame with
// twelve rows the way the keeper board does.
// =====================================================================

import { FONT, crestImage, roundRect, fitText, shareCanvas, shareText } from "./share.js";
import { SHARE_INK } from "./brand-ink.js";

const W = 1080, H = 1350;
const { BG, CARD, LINE, INK, MUTED, GOLD, ACCENT, OK, CREST_RED, CREST_BLUE } = SHARE_INK;

const fmtOdds = (n) => (Number(n) > 0 ? `+${Number(n)}` : String(Number(n)));

/*
  STATUS DRIVES THE COLOUR AND NOTHING ELSE DOES.

  An open ticket is gold because it is still alive; won is green, lost is muted,
  void is the accent. The words come from the row, so a status this file has
  never heard of still prints rather than falling through to a blank chip.
*/
const STATUS_INK = { open: GOLD, won: OK, lost: MUTED, void: ACCENT };

/**
 * Fold one bet plus its market and outcome into exactly what the card draws.
 *
 * Separate from the painting so the shape can be reasoned about, and tested,
 * without a canvas. Everything is a string or a number by the time it leaves.
 */
export function ticketData({ bet, market, outcome, member, season = null } = {}) {
  if (!bet) return null;
  const stake = Number(bet.stake) || 0;
  const ret = Number(bet.potential_payout) || 0;
  return {
    who: member?.display_name || "DFL",
    pick: outcome?.label || "Ticket",
    market: market?.title || "DFL Sportsbook",
    category: market?.category || "",
    odds: fmtOdds(bet.odds_american),
    stake,
    ret,
    /* The profit, because "return" alone reads as the winnings to about half of
       everybody and as stake+winnings to the other half. Print both. */
    profit: Math.max(0, ret - stake),
    status: String(bet.status || "open"),
    settled: !!bet.settled_at,
    season,
  };
}

/** The one-line text that goes with the image where a share sheet takes text. */
export function ticketText(t) {
  if (!t) return "";
  const head = t.status === "won" ? "Cashed" : t.status === "lost" ? "Torn up" : "On the board";
  return `${head}: ${t.pick} at ${t.odds} — ${t.stake} SIN to return ${t.ret}. DFL Sportsbook, where SIN is play money.`;
}

export function ticketCanvas(t) {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  /* The brand rule: the same device the stage, the marquee, the lore card and
     the keeper board use. Fills, so the crest's own pair. */
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, CREST_RED); grad.addColorStop(1, CREST_BLUE);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 10);

  /*
    MEASURE THE STACK, THEN CENTRE IT.

    The first cut started at a fixed y = 44 and ran out of content around 60% of
    the way down, leaving 350px of empty card under the status chip - which on a
    4:5 share image reads as a crop that went wrong rather than as space. The
    stack is a fixed sequence whose only variable is the crest's aspect ratio
    (crestImage() is the wordmark at 3:2, not the square seal), so it can be
    measured before anything is drawn and offset once.

    The disclaimer stays pinned to the bottom edge on its own - it is a footer,
    not part of the stack.
  */
  const img = crestImage();
  const cw = 360;
  const ch = img ? cw * (img.naturalHeight / img.naturalWidth || 0.666) : 0;
  const STACK = (img ? ch + 18 : 0) + 48 + 96 + 52 + 168 + 168 + 30 + 66 + 116;
  let y = Math.max(44, (H - 90 - STACK) / 2);

  if (img) {
    ctx.drawImage(img, (W - cw) / 2, y, cw, ch);
    y += ch + 18;
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = MUTED;
  ctx.font = `800 26px ${FONT}`;
  ctx.letterSpacing = "6px";
  ctx.fillText("DFL SPORTSBOOK", W / 2, y);
  ctx.letterSpacing = "0px";
  y += 48;

  // ---- the pick, which is the whole point of the card ------------------
  ctx.fillStyle = INK;
  fitText(ctx, t.pick.toUpperCase(), W / 2, y + 54, W - 140, 78, 900, "center");
  y += 96;

  ctx.fillStyle = MUTED;
  ctx.font = `700 30px ${FONT}`;
  fitText(ctx, t.market, W / 2, y, W - 160, 30, 700, "center");
  y += 52;

  // ---- the price, big, because it is the brag --------------------------
  ctx.fillStyle = GOLD;
  ctx.font = `900 150px ${FONT}`;
  ctx.fillText(t.odds, W / 2, y + 116);
  y += 168;

  // ---- stake / return, side by side -----------------------------------
  const boxW = (W - 200) / 2, boxH = 168, gap = 40;
  const left = 100;
  const cell = (x, label, value, ink) => {
    ctx.fillStyle = CARD;
    roundRect(ctx, x, y, boxW, boxH, 22);
    ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 3;
    roundRect(ctx, x, y, boxW, boxH, 22);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.font = `800 24px ${FONT}`;
    ctx.letterSpacing = "3px";
    ctx.fillText(label, x + boxW / 2, y + 52);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = ink;
    ctx.font = `900 62px ${FONT}`;
    ctx.fillText(value, x + boxW / 2, y + 126);
  };
  cell(left, "STAKE", `${t.stake}`, INK);
  cell(left + boxW + gap, t.status === "won" ? "PAID" : "TO RETURN", `${t.ret}`, GOLD);
  y += boxH + 30;

  ctx.fillStyle = MUTED;
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText(`${t.profit} SIN profit if it lands`, W / 2, y + 24);
  y += 66;

  // ---- the status chip ------------------------------------------------
  const ink = STATUS_INK[t.status] || GOLD;
  const label = t.status.toUpperCase();
  ctx.font = `900 40px ${FONT}`;
  const chipW = Math.min(W - 200, ctx.measureText(label).width + 96);
  const chipX = (W - chipW) / 2;
  ctx.fillStyle = CARD;
  roundRect(ctx, chipX, y, chipW, 84, 42);
  ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 5;
  roundRect(ctx, chipX, y, chipW, 84, 42);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.fillText(label, W / 2, y + 57);
  y += 116;

  // ---- who, and the disclaimer that keeps this a joke -----------------
  ctx.fillStyle = INK;
  ctx.font = `800 38px ${FONT}`;
  fitText(ctx, t.who, W / 2, y, W - 200, 38, 800, "center");

  ctx.fillStyle = MUTED;
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText("SIN is play money. No cash value. Never has been.", W / 2, H - 46);

  return canvas;
}

/**
 * Draw it and hand it to the share sheet.
 *
 * shareCanvas() owns the fallbacks and the phone rule - a download is only ever
 * offered where downloading is how you get a file. Do not add one here.
 */
export async function shareTicket(input) {
  const t = ticketData(input);
  if (!t) return "none";
  const canvas = ticketCanvas(t);
  const how = await shareCanvas(canvas, `dfl-ticket-${t.pick.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`, {
    title: "DFL Sportsbook",
    text: ticketText(t),
  });
  if (how === "none") await shareText({ title: "DFL Sportsbook", text: ticketText(t) });
  return how;
}
