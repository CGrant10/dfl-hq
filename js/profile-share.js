// =====================================================================
// profile-share.js - one member's record, highs and lows, as an image.
// ---------------------------------------------------------------------
// The sixth card in the DFL identity and the sixth implementation of nothing:
// roundRect(), fitText(), crestImage() and shareCanvas() from share.js, the
// palette from brand-ink.js, the same 1080x1350 frame the keeper board, the golf
// posters, the lore card and the ticket all use.
//
// IT PRINTS THE LOWS AS WILLINGLY AS THE HIGHS, which is the whole reason the
// commissioner asked for it. A card that showed only titles would be a trophy
// cabinet; this league keeps a Chip Eater board on the History page. The worst
// season and the worst week sit in the same size type as the best ones, in the
// same grid, with no apologetic styling - the accent that marks a low is the
// same weight as the one that marks a high, just a different colour.
// =====================================================================

import { FONT, crestImage, roundRect, fitText, shareCanvas, shareText } from "./share.js";
import { SHARE_INK } from "./brand-ink.js";

const W = 1080, H = 1350;
const { BG, CARD, LINE, INK, MUTED, GOLD, ACCENT, OK, CREST_RED, CREST_BLUE } = SHARE_INK;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const one = (v) => (num(v) == null ? "—" : num(v).toFixed(1));

/**
 * Fold a profile into exactly what the card draws.
 *
 * Separate from the painting so the shape can be reasoned about, and tested,
 * without a canvas. Lows are collected into their own list rather than mixed in,
 * so the layout can give them equal billing on purpose instead of by accident.
 */
export function profileShareData({ member, career, extremes = {}, seasonCount = 0, chipSeasons = [] } = {}) {
  if (!member) return null;
  const c = career || {};
  const wins = num(c.wins) ?? 0, losses = num(c.losses) ?? 0, ties = num(c.ties) ?? 0;

  const highs = [];
  if (num(c.titles)) highs.push(["Titles", String(num(c.titles))]);
  if (num(c.playoffs)) highs.push(["Playoffs", String(num(c.playoffs))]);
  if (extremes.bestSeason) {
    highs.push(["Best finish", ordinal(extremes.bestSeason.rank)]);
  }
  if (extremes.highWeek) {
    highs.push(["Best week", one(extremes.highWeek.score)]);
  }

  const lows = [];
  /* Chip Eater seasons are the headline low in this league, so they lead. */
  if (chipSeasons.length) {
    lows.push(["Chip Eater", chipSeasons.length > 1 ? `${chipSeasons.length}×` : String(chipSeasons[0])]);
  }
  if (extremes.worstSeason) lows.push(["Worst finish", ordinal(extremes.worstSeason.rank)]);
  if (extremes.lowWeek) lows.push(["Worst week", one(extremes.lowWeek.score)]);
  if (num(c.runnerUps)) lows.push(["Runner up", String(num(c.runnerUps))]);

  return {
    who: member.display_name || "DFL",
    team: (member.team_name || "").trim(),
    seasons: num(seasonCount) ?? 0,
    record: `${wins}-${losses}${ties ? `-${ties}` : ""}`,
    points: Math.round(num(c.pointsFor) ?? 0).toLocaleString(),
    avgFinish: num(c.avgFinish) == null ? "—" : one(c.avgFinish),
    highs: highs.slice(0, 4),
    lows: lows.slice(0, 4),
  };
}

function ordinal(n) {
  const v = num(n);
  if (v == null) return "—";
  const s = ["th", "st", "nd", "rd"];
  const k = v % 100;
  return v + (s[(k - 20) % 10] || s[k] || s[0]);
}

/** The line that travels with the image where a share sheet takes text. */
export function profileShareText(d) {
  if (!d) return "";
  const bits = [`${d.who} — ${d.record} across ${d.seasons} DFL season${d.seasons === 1 ? "" : "s"}`];
  const t = d.highs.find(([k]) => k === "Titles");
  if (t) bits.push(`${t[1]} title${t[1] === "1" ? "" : "s"}`);
  const chip = d.lows.find(([k]) => k === "Chip Eater");
  if (chip) bits.push(`Chip Eater ${chip[1]}`);
  return `${bits.join(" · ")}.`;
}

export function profileShareCanvas(d) {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, CREST_RED); grad.addColorStop(1, CREST_BLUE);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 10);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  /*
    MEASURE THE STACK, THEN CENTRE IT - the same lesson the ticket card taught.

    A fixed start left content ending around row 1000 of 1350 on a full career
    and row 680 on an empty one, so a sparse profile looked like a crop that had
    gone wrong. Everything below has a known height once the crest's aspect and
    the row count are known, so it is measured first and offset once.

    The footer is NOT part of the stack: it is pinned to the bottom edge, which
    is where a footer belongs and where it stays whatever the card holds.
  */
  const img = crestImage();
  const cw = 300;
  const ch = img ? cw * (img.naturalHeight / img.naturalWidth || 0.666) : 0;
  const rowsCount = Math.max(d.highs.length, d.lows.length);
  const rowHeight = 92;
  const blockHeight = 54 + Math.max(1, rowsCount) * rowHeight;
  const STACK = (img ? ch + 20 : 0) + 92 + (d.team ? 46 : 0) + 118 + 44 + blockHeight;
  let y = Math.max(52, (H - 110 - STACK) / 2);

  if (img) {
    ctx.drawImage(img, (W - cw) / 2, y, cw, ch);
    y += ch + 20;
  }

  // ---- who ------------------------------------------------------------
  ctx.fillStyle = INK;
  fitText(ctx, d.who.toUpperCase(), W / 2, y + 56, W - 140, 76, 900, "center");
  y += 92;
  if (d.team) {
    ctx.fillStyle = MUTED;
    ctx.font = `700 30px ${FONT}`;
    fitText(ctx, d.team, W / 2, y, W - 160, 30, 700, "center");
    y += 46;
  }

  // ---- the career line, three figures across --------------------------
  const trio = [["RECORD", d.record], ["POINTS", d.points], ["AVG FINISH", d.avgFinish]];
  const tw = (W - 160) / 3;
  trio.forEach(([label, value], i) => {
    const x = 80 + tw * i;
    ctx.fillStyle = MUTED;
    ctx.font = `800 22px ${FONT}`;
    ctx.letterSpacing = "3px";
    ctx.fillText(label, x + tw / 2, y + 26);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = INK;
    fitText(ctx, value, x + tw / 2, y + 84, tw - 20, 54, 900, "center");
  });
  y += 118;

  ctx.fillStyle = MUTED;
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText(`${d.seasons} season${d.seasons === 1 ? "" : "s"} on record`, W / 2, y);
  y += 44;

  /*
    HIGHS AND LOWS, SIDE BY SIDE AND THE SAME SIZE.

    Two columns rather than one list, because the point of the card is the
    contrast - a league that keeps a Chip Eater board wants the lows legible, not
    buried under the trophies. Same box, same type, same padding; only the accent
    colour differs, and only on the number.
  */
  const colW = (W - 200) / 2, gap = 40, colX = [100, 100 + colW + gap];
  const rowH = rowHeight;
  const blockH = blockHeight;

  [["HIGHS", d.highs, GOLD], ["LOWS", d.lows, ACCENT]].forEach(([title, list, ink], col) => {
    const x = colX[col];
    ctx.fillStyle = CARD;
    roundRect(ctx, x, y, colW, blockH, 22); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 3;
    roundRect(ctx, x, y, colW, blockH, 22); ctx.stroke();

    ctx.fillStyle = ink;
    ctx.font = `900 26px ${FONT}`;
    ctx.letterSpacing = "5px";
    ctx.fillText(title, x + colW / 2, y + 40);
    ctx.letterSpacing = "0px";

    if (!list.length) {
      ctx.fillStyle = MUTED;
      ctx.font = `700 26px ${FONT}`;
      /* "None on record" rather than an empty box: an absence is a fact about a
         career and the column should not look broken for holding one. */
      ctx.fillText("None on record", x + colW / 2, y + 40 + rowH / 2 + 10);
      return;
    }
    list.forEach(([label, value], i) => {
      const ry = y + 54 + i * rowH;
      ctx.fillStyle = MUTED;
      ctx.font = `700 22px ${FONT}`;
      ctx.fillText(label, x + colW / 2, ry + 26);
      ctx.fillStyle = ink;
      fitText(ctx, value, x + colW / 2, ry + 74, colW - 30, 46, 900, "center");
    });
  });
  y += blockH + 34;

  ctx.fillStyle = MUTED;
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText("DFL HQ · Draft ★ Golf ★ Sin ★ Fold", W / 2, H - 46);

  return canvas;
}

/**
 * Draw it and hand it to the share sheet.
 *
 * shareCanvas() owns the phone rule - a download is only ever offered where
 * downloading is how you get a file. Do not add one here.
 */
export async function shareProfile(input) {
  const d = profileShareData(input);
  if (!d) return "none";
  const canvas = profileShareCanvas(d);
  const name = d.who.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const how = await shareCanvas(canvas, `dfl-${name}.png`, {
    title: `${d.who} · DFL HQ`,
    text: profileShareText(d),
  });
  if (how === "none") await shareText({ title: `${d.who} · DFL HQ`, text: profileShareText(d) });
  return how;
}
