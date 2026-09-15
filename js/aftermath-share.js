/* =====================================================================
   aftermath-share.js - the completed week, as one group-chat picture.
   ---------------------------------------------------------------------
   This is deliberately not a dashboard panel. On Tuesday it becomes a
   small action in the cold open and produces a full six-game recap using
   actual totals from the week Sleeper just closed.

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

function hash(text) {
  let value = 2166136261;
  for (const char of String(text)) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function pick(lines, seed) {
  return lines[hash(seed) % lines.length];
}

function gameRoast(game, seed) {
  const winner = game.winner.name, loser = game.loser.name, margin = score(game.margin);
  const lines = game.margin >= 35 ? [
    `${loser} got folded like a gas-station lawn chair.`,
    `${winner} won by ${margin}. Somebody check ${loser} for a pulse.`,
    `${loser} brought a lineup. ${winner} brought a burial permit.`,
    "This stopped being competitive before the snacks came out.",
  ] : game.margin <= 6 ? [
    `${winner} escaped by ${margin} and absolutely does not need to explain how.`,
    `${loser} was ${margin} points short of being unbearable all week.`,
    `A ${margin}-point loss: premium pain with no refund policy.`,
    `${winner} survived. “Dominated” would be perjury.`,
  ] : [
    `${winner} handled business; ${loser} handled excuses.`,
    `${loser} spent all week cooking and still served the L.`,
    `${winner} gets the receipt. ${loser} gets character development.`,
    "Clean win, dirty group chat, exactly as the league intended.",
  ];
  return pick(lines, seed);
}

function teamName(members, uid, fallback) {
  const member = (members || []).find(row => key(row.sleeper_user_id) === key(uid));
  return member?.team_name || member?.display_name || fallback || "Unknown";
}

/** Build Tuesday's truthful recap of the completed week. */
export function buildAftermath({ lore, members = [], weekly, now = new Date() } = {}) {
  const day = now instanceof Date ? now.getDay() : -1;
  if (day !== 2 || !weekly?.teams?.length || !weekly.season || !weekly.week) return null;

  const values = new Map(weekly.teams.map(team => [key(team.sleeper_user_id),
    Number.isFinite(team?.actual) ? num(team.actual) : num(team?.projection)]));
  const current = (lore?.matchups || []).filter(row => Number(row.season) === Number(weekly.season)
    && Number(row.week) === Number(weekly.week));
  const pairs = current.map(row => {
    const leftName = teamName(members, row.user1, `Team ${row.roster1 || ""}`.trim());
    const rightName = teamName(members, row.user2, `Team ${row.roster2 || ""}`.trim());
    const leftScore = Number(row.score1), rightScore = Number(row.score2);
    const left = Number.isFinite(leftScore) ? leftScore : values.get(key(row.user1)) || 0;
    const right = Number.isFinite(rightScore) ? rightScore : values.get(key(row.user2)) || 0;
    const winner = left >= right ? { uid: row.user1, name: leftName, value: left } : { uid: row.user2, name: rightName, value: right };
    const loser = left >= right ? { uid: row.user2, name: rightName, value: right } : { uid: row.user1, name: leftName, value: left };
    return { winner, loser, margin: Math.abs(left - right) };
  });
  if (!pairs.length) return null;

  const ranked = pairs.flatMap(game => [game.winner, game.loser]).sort((a, b) => b.value - a.value);
  const king = ranked[0];
  if (!king) return null;
  const blowout = [...pairs].sort((a, b) => b.margin - a.margin)[0] || null;
  const pain = [...pairs].sort((a, b) => b.loser.value - a.loser.value)[0]?.loser || null;
  const bench = [...weekly.teams].filter(team => num(team.pointsOnBench) > 0)
    .sort((a, b) => num(b.pointsOnBench) - num(a.pointsOnBench))[0] || null;
  const low = ranked.at(-1) || null;
  const labels = new Map();
  const tag = (uid, label) => {
    if (uid == null) return;
    const id = key(uid), list = labels.get(id) || [];
    if (!list.includes(label)) list.push(label);
    labels.set(id, list);
  };
  tag(king?.uid, "HONOR ROLL");
  tag(blowout?.winner.uid, "ASS KICKING");
  tag(blowout?.loser.uid, "BODY BAG");
  tag(pain?.uid, "ROBBED");
  tag(low?.uid, "SEE ME AFTER CLASS");
  tag(bench?.sleeper_user_id, "BENCH CRIMINAL");

  const games = pairs.map((game, index) => ({
    winner: game.winner, loser: game.loser, margin: one(game.margin),
    winnerLabels: labels.get(key(game.winner.uid)) || [],
    loserLabels: labels.get(key(game.loser.uid)) || [],
    roast: gameRoast(game, `${weekly.season}:${weekly.week}:${index}:${game.winner.uid}:${game.loser.uid}`),
  }));

  return {
    label: "WEEK RECAP", status: "FINAL", season: Number(weekly.season), week: Number(weekly.week),
    title: `WEEK ${Number(weekly.week)} RECAP`,
    king: { name: king.name, value: king.value },
    final: true, games,
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

function fitDisplay(ctx, text, x, y, maxWidth, size, weight = 800, align = "center") {
  let px = size;
  ctx.textAlign = align;
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

function wrapCentered(ctx, text, x, y, maxWidth, size = 27, lineHeight = 31, maxLines = 2) {
  ctx.font = `700 ${size}px ${DISPLAY}`;
  ctx.textAlign = "center";
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !line) line = trial;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines[maxLines - 1] = `${lines.slice(maxLines - 1).join(" ").replace(/[.?!,;:]?$/, "")}…`;
    lines.length = maxLines;
    while (ctx.measureText(lines[maxLines - 1]).width > maxWidth && lines[maxLines - 1].length > 4) {
      lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -2).trimEnd()}…`;
    }
  }
  lines.forEach((row, index) => ctx.fillText(row, x, y + index * lineHeight));
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
  caps(ctx, `DFL HQ · ${card.season} SEASON · FINAL`, W / 2, 75, SHARE_INK.INK, 22);

  ctx.fillStyle = SHARE_INK.INK;
  fitDisplay(ctx, card.title || card.label, W / 2, 158, 960, 80, 800);
  caps(ctx, "EVERY GAME · SELECTIVE DISRESPECT", W / 2, 198, SHARE_INK.MUTED, 20);
  rule(ctx, 70, 220, 1010, SHARE_INK.GOLD, 4);

  const games = (card.games || []).slice(0, 6);
  const rowHeight = 124;
  games.forEach((game, index) => {
    const top = 232 + index * rowHeight;
    if (index) rule(ctx, 70, top - 7, 1010, SHARE_INK.LINE, 2);
    caps(ctx, `GAME ${index + 1}`, 70, top + 22, SHARE_INK.MUTED, 17, "left");
    const winnerTags = game.winnerLabels?.join(" · ") || "W";
    const loserTags = game.loserLabels?.join(" · ") || "L";
    caps(ctx, winnerTags, 180, top + 22, SHARE_INK.CREST_RED, 16, "left");
    caps(ctx, loserTags, 610, top + 22, SHARE_INK.CREST_BLUE, 16, "left");

    ctx.fillStyle = SHARE_INK.INK;
    fitDisplay(ctx, String(game.winner.name).toUpperCase(), 70, top + 58, 315, 31, 800, "left");
    ctx.fillStyle = SHARE_INK.GOLD;
    fitDisplay(ctx, score(game.winner.value), 485, top + 58, 92, 34, 800, "right");
    caps(ctx, "BEAT", 540, top + 55, SHARE_INK.MUTED, 15);
    ctx.fillStyle = SHARE_INK.INK;
    fitDisplay(ctx, String(game.loser.name).toUpperCase(), 610, top + 58, 285, 31, 800, "left");
    ctx.fillStyle = SHARE_INK.MUTED;
    fitDisplay(ctx, score(game.loser.value), 1010, top + 58, 92, 34, 800, "right");
    ctx.fillStyle = SHARE_INK.MUTED;
    wrapCentered(ctx, game.roast, W / 2, top + 94, 900, 19, 22, 1);
  });

  if (!games.length) caps(ctx, "NO COMPLETED MATCHUPS FOUND", W / 2, 560, SHARE_INK.MUTED, 28);
  caps(ctx, "DRAFT · GOLF · SIN · FOLD", W / 2, 1022, SHARE_INK.MUTED, 21);
  return canvas;
}

export function aftermathText(card) {
  const games = (card.games || []).map(game => `${game.winner.name} ${score(game.winner.value)} beat ${game.loser.name} ${score(game.loser.value)}`);
  return `${card.title || card.label}: ${games.join("; ")}.`.replace(/\s+/g, " ").trim();
}

export function shareAftermath(card) {
  if (!card) return "failed";
  try {
    return shareCanvas(aftermathCanvas(card), `dfl-week-${card.week}-recap.png`, {
      title: `DFL HQ — ${card.title || card.label}`,
      text: aftermathText(card),
    });
  } catch (err) {
    console.warn("aftermath share: falling back to text", err);
    return shareText({ title: `DFL HQ — ${card.title || card.label}`, text: aftermathText(card) });
  }
}
