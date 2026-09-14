/* =====================================================================
   aftermath-share.js - Sunday and Monday's league argument, as a picture.
   ---------------------------------------------------------------------
   Monday recaps Sunday's slate while Monday Night Football is still live.
   Tuesday closes the week with actual totals. The numbers below come from
   the same current Sleeper bundle as Home's cold open, so the card and the
   app cannot disagree.

   The canvas is square because this belongs in a group chat, and drawing is
   synchronous because iOS only allows the share sheet during the tap itself.
   ===================================================================== */
import { sealImage, shareCanvas, shareText } from "./share.js";
import { SHARE_INK } from "./brand-ink.js";

const W = 1080, H = 1080;
const DISPLAY = '"Rajdhani", "Arial Narrow", system-ui, sans-serif';
const num = value => Number(value) || 0;
const one = value => Math.round(num(value) * 10) / 10;
const score = value => num(value).toFixed(2);
const key = value => String(value ?? "");

function teamName(members, uid, fallback) {
  const member = (members || []).find(row => key(row.sleeper_user_id) === key(uid));
  return member?.team_name || member?.display_name || fallback || "Unknown";
}

/** Build the one truthful snapshot shared by the Sunday and Monday cards. */
export function buildAftermath({ lore, members = [], weekly, now = new Date() } = {}) {
  const day = now instanceof Date ? now.getDay() : -1;
  if ((day !== 1 && day !== 2) || !weekly?.teams?.length || !weekly.season || !weekly.week) return null;

  const final = day === 2;
  const valueOf = team => final && Number.isFinite(team?.actual) ? num(team.actual) : num(team?.projection);
  const values = new Map(weekly.teams.map(team => [key(team.sleeper_user_id), valueOf(team)]));
  const current = (lore?.matchups || []).filter(row => Number(row.season) === Number(weekly.season)
    && Number(row.week) === Number(weekly.week));
  const pairs = current.map(row => {
    const leftName = teamName(members, row.user1, `Team ${row.roster1 || ""}`.trim());
    const rightName = teamName(members, row.user2, `Team ${row.roster2 || ""}`.trim());
    const left = values.has(key(row.user1)) ? values.get(key(row.user1)) : num(row.score1);
    const right = values.has(key(row.user2)) ? values.get(key(row.user2)) : num(row.score2);
    const winner = left >= right ? { uid: row.user1, name: leftName, value: left } : { uid: row.user2, name: rightName, value: right };
    const loser = left >= right ? { uid: row.user2, name: rightName, value: right } : { uid: row.user1, name: leftName, value: left };
    return { winner, loser, margin: Math.abs(left - right) };
  });

  const ranked = [...weekly.teams].sort((a, b) => valueOf(b) - valueOf(a));
  const king = ranked[0];
  if (!king) return null;
  const blowout = [...pairs].sort((a, b) => b.margin - a.margin)[0] || null;
  const pain = [...pairs].sort((a, b) => b.loser.value - a.loser.value)[0]?.loser || null;
  const bench = [...weekly.teams].filter(team => num(team.pointsOnBench) > 0)
    .sort((a, b) => num(b.pointsOnBench) - num(a.pointsOnBench))[0] || null;
  const label = final ? "MONDAY AFTERMATH" : "SUNDAY AFTERMATH";
  const status = final ? "FINAL" : "PRE-MNF · LIVE";

  return {
    label, status, season: Number(weekly.season), week: Number(weekly.week),
    king: { name: king.team_name || teamName(members, king.sleeper_user_id), value: valueOf(king) },
    final,
    blowout: blowout ? { winner: blowout.winner.name, loser: blowout.loser.name, margin: one(blowout.margin) } : null,
    pain: pain ? { name: pain.name, value: pain.value } : null,
    bench: bench ? { name: bench.team_name || teamName(members, bench.sleeper_user_id), value: one(bench.pointsOnBench) } : null,
  };
}

function caps(ctx, text, x, y, color = SHARE_INK.MUTED, size = 25, align = "center") {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.font = `700 ${size}px ${DISPLAY}`;
  ctx.fillText(String(text).toUpperCase(), x, y);
}

function fitDisplay(ctx, text, x, y, maxWidth, size, weight = 800) {
  let px = size;
  ctx.textAlign = "center";
  do {
    ctx.font = `${weight} ${px}px ${DISPLAY}`;
    if (ctx.measureText(text).width <= maxWidth || px <= 12) break;
    px -= 2;
  } while (px > 12);
  ctx.fillText(text, x, y);
}

function rule(ctx, x1, y, x2, color = SHARE_INK.LINE, width = 2) {
  ctx.fillStyle = color;
  ctx.fillRect(x1, y, x2 - x1, width);
}

function award(ctx, { x, y, w, label, name, value, detail, accent }) {
  rule(ctx, x, y, x + w, accent, 4);
  caps(ctx, label, x + w / 2, y + 48, SHARE_INK.MUTED, 23);
  ctx.fillStyle = SHARE_INK.INK;
  fitDisplay(ctx, String(name).toUpperCase(), x + w / 2, y + 105, w - 30, 42, 800);
  ctx.fillStyle = SHARE_INK.GOLD;
  fitDisplay(ctx, value, x + w / 2, y + 184, w - 30, 74, 800);
  caps(ctx, detail, x + w / 2, y + 226, SHARE_INK.MUTED, 20);
}

export function aftermathCanvas(card) {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = SHARE_INK.BG;
  ctx.fillRect(0, 0, W, H);

  // Medicine-wheel brand rail: four flat fields, no ornamental imitation.
  const segments = [SHARE_INK.CREST_RED, SHARE_INK.GOLD, SHARE_INK.INK, SHARE_INK.CARD];
  segments.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(index * W / 4, 0, W / 4 + 1, 11);
  });

  const mark = sealImage();
  if (mark) {
    ctx.save();
    ctx.globalAlpha = 0.045;
    ctx.drawImage(mark, 105, 66, 870, 870);
    ctx.restore();
  }

  rule(ctx, 100, 69, 250, SHARE_INK.CREST_RED, 3);
  rule(ctx, 830, 69, 980, SHARE_INK.CREST_BLUE, 3);
  caps(ctx, `DFL HQ · ${card.season} WEEK ${card.week} · ${card.status}`, W / 2, 80, SHARE_INK.INK, 23);

  ctx.fillStyle = SHARE_INK.INK;
  fitDisplay(ctx, card.label, W / 2, 195, 960, 94, 800);
  rule(ctx, 420, 235, 660, SHARE_INK.GOLD, 5);

  caps(ctx, card.final ? "WEEK'S SCORING KING" : "WEEK'S PROJECTED KING", W / 2, 292, SHARE_INK.INK, 30);
  ctx.fillStyle = SHARE_INK.GOLD;
  fitDisplay(ctx, score(card.king.value), W / 2, 485, 820, 182, 800);
  ctx.fillStyle = SHARE_INK.INK;
  fitDisplay(ctx, String(card.king.name).toUpperCase(), W / 2, 560, 900, 62, 800);

  const left = card.blowout || { winner: "NO MATCHUP DATA", loser: "", margin: 0 };
  const right = card.pain || { name: "NO MATCHUP DATA", value: 0 };
  award(ctx, {
    x: 70, y: 640, w: 440, label: card.final ? "BIGGEST FINAL GAP" : "BIGGEST PROJECTED GAP", name: left.winner,
    value: `+${score(left.margin)}`, detail: left.loser ? `OVER ${left.loser}` : "WAITING ON SCORES", accent: SHARE_INK.CREST_RED,
  });
  award(ctx, {
    x: 570, y: 640, w: 440, label: "PAIN WATCH", name: right.name,
    value: score(right.value), detail: card.pain ? (card.final ? "LOST WITH THIS SCORE" : "PROJECTED TO LOSE") : "WAITING ON SCORES", accent: SHARE_INK.CREST_BLUE,
  });

  rule(ctx, 70, 907, 1010, SHARE_INK.GOLD, 2);
  const benchName = card.bench?.name || "NO BENCH WARRANT YET";
  const benchValue = card.bench ? `${score(card.bench.value)} LEFT BEHIND` : "LINEUPS LOOK CLEAN";
  caps(ctx, `BENCH WARRANT · ${benchName} · ${benchValue}`, W / 2, 956, SHARE_INK.INK, 24);
  caps(ctx, "DRAFT · GOLF · SIN · FOLD", W / 2, 1022, SHARE_INK.MUTED, 21);
  return canvas;
}

export function aftermathText(card) {
  const measure = card.final ? "scoring" : "projection";
  return `${card.label}: ${card.king.name} leads Week ${card.week} ${measure} at ${score(card.king.value)}. ${card.status}.`;
}

export function shareAftermath(card) {
  if (!card) return "failed";
  try {
    return shareCanvas(aftermathCanvas(card), `dfl-${card.label.toLowerCase().replace(/\s+/g, "-")}-week-${card.week}.png`, {
      title: `DFL HQ — ${card.label}`,
      text: aftermathText(card),
    });
  } catch (err) {
    console.warn("aftermath share: falling back to text", err);
    return shareText({ title: `DFL HQ — ${card.label}`, text: aftermathText(card) });
  }
}
