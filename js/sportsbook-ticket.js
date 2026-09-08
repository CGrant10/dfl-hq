// =====================================================================
// sportsbook-ticket.js - share one ENTRY as an image
// ---------------------------------------------------------------------
// The fifth card in the DFL identity, and deliberately the FOURTH implementation
// of nothing: roundRect(), fitText(), crestImage() and shareCanvas() come from
// share.js, the palette from brand-ink.js, and the frame is the same 1080x1350
// every other DFL card uses. A ticket is not a screenshot of a row.
//
// WHY THIS DRAWS A LIST NOW
//
// It used to draw one wager: one pick, one price, one return, and a member with
// three picks got three separate images that nobody in a group chat is going to
// post in a row. An entry holds up to six picks against one stake, so the card
// draws the entry - every pick stacked with its own price, then the combined
// price and the one return underneath. That is the Underdog shape, and it is
// also just what a paper slip looks like.
//
// THE STACK IS MEASURED, NOT GUESSED
//
// Six picks is 3.5x the content of one, so a fixed layout would either crop the
// long card or leave a third of the short one empty. Every band declares its
// height, the total is summed, and the whole stack is centred once - so a
// one-pick card is mostly white space around a big number and a six-pick card
// is full, without either being a special case.
// =====================================================================

import { FONT, crestImage, roundRect, fitText, shareCanvas, shareText } from "./share.js";
import { SHARE_INK } from "./brand-ink.js";

const W = 1080, H = 1350;
const FOOTER = 90;
const { BG, CARD, CARD_2, LINE, INK, MUTED, GOLD, ACCENT, OK, CREST_RED, CREST_BLUE } = SHARE_INK;

const fmtOdds = (n) => (Number(n) > 0 ? `+${Number(n)}` : String(Number(n)));
const num = (n) => Number(n || 0).toLocaleString("en-US");

/*
  STATUS DRIVES THE COLOUR AND NOTHING ELSE DOES.

  An open ticket is gold because it is still alive; won is green, lost is muted,
  void is the accent. The words come from the row, so a status this file has
  never heard of still prints rather than falling through to a blank chip.
*/
const STATUS_INK = { open: GOLD, won: OK, lost: MUTED, void: ACCENT };

/**
 * Fold one entry plus its legs into exactly what the card draws.
 *
 * Separate from the painting so the shape can be reasoned about, and tested,
 * without a canvas. Everything is a string or a number by the time it leaves.
 */
export function ticketData({ bet, legs = [], member, season = null } = {}) {
  if (!bet) return null;
  const stake = Number(bet.stake) || 0;
  const ret = Number(bet.potential_payout) || 0;
  const picks = (Array.isArray(legs) ? legs : []).map((leg) => ({
    pick: String(leg?.label || "Pick"),
    market: String(leg?.market || ""),
    odds: fmtOdds(leg?.odds_american),
    status: String(leg?.status || "open"),
  }));
  const status = String(bet.status || "open");
  return {
    who: member?.display_name || "DFL",
    picks,
    /* The headline. One pick is its own headline; a real entry is counted. */
    title: picks.length === 1 ? picks[0].pick : `${picks.length}-pick entry`,
    market: picks.length === 1 ? picks[0].market : "",
    odds: fmtOdds(bet.odds_american),
    stake,
    ret,
    /* The profit, because "return" alone reads as the winnings to about half of
       everybody and as stake+winnings to the other half. Print both. */
    profit: Math.max(0, ret - stake),
    status,
    /* A ticket the member pulled themselves is not a ticket the house voided,
       and the card should not accuse anybody of the wrong one. */
    pulled: status === "void" && !!bet.cancelled_at,
    settled: !!bet.settled_at,
    won: picks.filter((p) => p.status === "won").length,
    season,
  };
}

/** The one-line text that goes with the image where a share sheet takes text. */
export function ticketText(t) {
  if (!t) return "";
  const head = t.status === "won" ? "Cashed" : t.status === "lost" ? "Torn up"
    : t.pulled ? "Pulled" : t.status === "void" ? "Voided" : "On the board";
  const what = t.picks.length === 1
    ? `${t.picks[0].pick} at ${t.odds}`
    : `${t.picks.length} picks at ${t.odds} — ${t.picks.map((p) => p.pick).join(", ")}`;
  return `${head}: ${what} — ${num(t.stake)} SIN to return ${num(t.ret)}. DFL Sportsbook, where SIN is play money.`;
}

/*
  A LEG ROW. Index chip, pick, its market underneath, its own price on the
  right - and a tick or a cross once the leg has been graded, because on a
  settled 3-pick the interesting question is which one broke it.
*/
function drawLeg(ctx, leg, index, x, y, w, rowH) {
  const ink = STATUS_INK[leg.status] || GOLD;
  const compact = rowH < 92;
  ctx.fillStyle = CARD;
  roundRect(ctx, x, y, w, rowH - 12, 18);
  ctx.fill();
  ctx.strokeStyle = leg.status === "open" ? LINE : ink;
  ctx.lineWidth = leg.status === "open" ? 2 : 3;
  roundRect(ctx, x, y, w, rowH - 12, 18);
  ctx.stroke();

  const chip = compact ? 46 : 56;
  const cy = y + (rowH - 12) / 2;
  ctx.fillStyle = CARD_2;
  roundRect(ctx, x + 20, cy - chip / 2, chip, chip, 14);
  ctx.fill();
  ctx.strokeStyle = LINE; ctx.lineWidth = 2;
  roundRect(ctx, x + 20, cy - chip / 2, chip, chip, 14);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.font = `900 ${compact ? 24 : 28}px ${FONT}`;
  /* The graded legs say which way they went; an open one is just its number. */
  const mark = leg.status === "won" ? "✓" : leg.status === "lost" ? "✗" : String(index + 1);
  ctx.fillText(mark, x + 20 + chip / 2, cy + (compact ? 9 : 10));

  // The price first, so the name knows how much room it has left.
  ctx.textAlign = "right";
  ctx.fillStyle = leg.status === "lost" ? MUTED : GOLD;
  ctx.font = `900 ${compact ? 36 : 44}px ${FONT}`;
  const priceW = ctx.measureText(leg.odds).width;
  ctx.fillText(leg.odds, x + w - 24, cy + (compact ? 13 : 16));

  const textX = x + 20 + chip + 20;
  const textW = w - (textX - x) - priceW - 52;
  ctx.textAlign = "left";
  ctx.fillStyle = leg.status === "lost" ? MUTED : INK;
  if (compact || !leg.market) {
    fitText(ctx, leg.pick, textX, cy + 12, textW, compact ? 32 : 38, 800, "left");
  } else {
    fitText(ctx, leg.pick, textX, cy - 2, textW, 36, 800, "left");
    ctx.fillStyle = MUTED;
    fitText(ctx, leg.market, textX, cy + 30, textW, 22, 700, "left");
  }
  ctx.textAlign = "center";
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

  const multi = t.picks.length > 1;
  /* Rows get tighter as the entry gets longer, and past four picks the crest
     is the thing that gives way - the picks are the content. */
  const rowH = t.picks.length <= 3 ? 104 : t.picks.length <= 4 ? 96 : 82;
  const img = t.picks.length <= 4 ? crestImage() : null;
  const cw = 360;
  const ch = img ? cw * (img.naturalHeight / img.naturalWidth || 0.666) : 0;
  const rowsH = multi ? t.picks.length * rowH + 8 : 0;
  const marketH = !multi && t.market ? 52 : 0;
  const oddsH = multi ? 132 : 168;
  const profitH = t.status === "open" ? 66 : 0;

  const STACK = (img ? ch + 18 : 0) + 48 + 96 + marketH + rowsH + oddsH + 198 + profitH + 116;
  let y = Math.max(40, (H - FOOTER - STACK) / 2);

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

  // ---- the headline: the pick, or the entry that holds them -------------
  ctx.fillStyle = INK;
  fitText(ctx, t.title.toUpperCase(), W / 2, y + 54, W - 140, 78, 900, "center");
  y += 96;

  if (marketH) {
    ctx.fillStyle = MUTED;
    ctx.font = `700 30px ${FONT}`;
    fitText(ctx, t.market, W / 2, y, W - 160, 30, 700, "center");
    y += marketH;
  }

  // ---- every pick on the entry, in order -------------------------------
  if (multi) {
    t.picks.forEach((leg, i) => drawLeg(ctx, leg, i, 90, y + i * rowH, W - 180, rowH));
    y += rowsH;
  }

  // ---- the price, big, because it is the brag --------------------------
  if (multi) {
    /* Present tense only. On a graded entry they either did or they did not,
       and the status chip further down is already saying which. */
    if (t.status === "open") {
      ctx.fillStyle = MUTED;
      ctx.font = `800 24px ${FONT}`;
      ctx.letterSpacing = "4px";
      ctx.fillText(`ALL ${t.picks.length} MUST LAND`, W / 2, y + 22);
      ctx.letterSpacing = "0px";
    }
    ctx.fillStyle = GOLD;
    ctx.font = `900 104px ${FONT}`;
    ctx.fillText(t.odds, W / 2, y + 118);
  } else {
    ctx.fillStyle = GOLD;
    ctx.font = `900 150px ${FONT}`;
    ctx.fillText(t.odds, W / 2, y + 116);
  }
  y += oddsH;

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
    fitText(ctx, value, x + boxW / 2, y + 126, boxW - 40, 62, 900, "center");
  };
  cell(left, t.pulled ? "REFUNDED" : "STAKE", num(t.stake), INK);
  cell(left + boxW + gap,
    t.status === "won" ? "PAID" : t.status === "lost" ? "RETURNED" : t.status === "void" ? "VOID" : "TO RETURN",
    t.status === "lost" ? "0" : t.status === "void" ? "—" : num(t.ret),
    t.status === "lost" || t.status === "void" ? MUTED : GOLD);
  y += boxH + 30;

  if (profitH) {
    ctx.fillStyle = MUTED;
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText(`${num(t.profit)} SIN profit if ${multi ? "they all land" : "it lands"}`, W / 2, y + 24);
    y += profitH;
  }

  // ---- the status chip ------------------------------------------------
  const ink = STATUS_INK[t.status] || GOLD;
  /* A settled multi says how it went - "1 OF 3" is the story, "LOST" is not. */
  const label = (t.pulled ? "PULLED"
    : multi && (t.status === "won" || t.status === "lost") ? `${t.won} OF ${t.picks.length}`
    : t.status).toUpperCase();
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
  const slug = (t.picks.length === 1 ? t.picks[0].pick : `${t.picks.length}-pick`)
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "entry";
  const how = await shareCanvas(canvas, `dfl-ticket-${slug}.png`, {
    title: "DFL Sportsbook",
    text: ticketText(t),
  });
  if (how === "none") await shareText({ title: "DFL Sportsbook", text: ticketText(t) });
  return how;
}
