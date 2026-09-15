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

function weeklyStory({ king, blowout, closest, bench }, seed) {
  const openings = [
    `${king.name} walked out with the weekly crown after dropping ${score(king.value)} points.`,
    `${king.name} owned the week with ${score(king.value)} points and will now be impossible to talk to.`,
    `${king.name} posted ${score(king.value)} points, grabbed first-class bragging rights, and left the rest of the league in coach.`,
  ];
  const beatings = blowout ? [
    `${blowout.winner.name} beat the brakes off ${blowout.loser.name} by ${score(blowout.margin)}.`,
    `${blowout.winner.name} turned ${blowout.loser.name}'s matchup into a public ass-whipping by ${score(blowout.margin)}.`,
    `${blowout.loser.name} lost to ${blowout.winner.name} by ${score(blowout.margin)} and should avoid the group chat until Thursday.`,
  ] : [];
  const endings = closest ? [
    `${closest.winner.name} escaped ${closest.loser.name} by ${score(closest.margin)}; meanwhile ${bench.name} left ${score(bench.value)} points rotting on the bench.`,
    `${closest.loser.name} came within ${score(closest.margin)} of talking reckless, while ${bench.name} committed ${score(bench.value)} points of bench malpractice.`,
    `${closest.winner.name} survived the week's closest mess by ${score(closest.margin)}. ${bench.name}'s bench then filed a grievance over ${score(bench.value)} unused points.`,
  ] : [];
  return [pick(openings, `${seed}:open`), pick(beatings, `${seed}:beat`), pick(endings, `${seed}:end`)].filter(Boolean).join(" ");
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
  const closest = [...pairs].sort((a, b) => a.margin - b.margin)[0] || null;
  const bench = [...weekly.teams].filter(team => num(team.pointsOnBench) > 0)
    .sort((a, b) => num(b.pointsOnBench) - num(a.pointsOnBench))[0] || null;
  const low = ranked.at(-1) || null;
  const benchStar = bench ? { name: bench.team_name || teamName(members, bench.sleeper_user_id), value: one(bench.pointsOnBench) }
    : { name: low?.name || "Nobody", value: 0 };
  const highlightRows = [
    { label: "TOP DOG", title: king.name, detail: `${score(king.value)} PTS · WEEK'S HIGH`, tone: "gold" },
    blowout && { label: "CRIME SCENE", title: blowout.winner.name, detail: `${score(blowout.margin)}-POINT WIN OVER ${blowout.loser.name}`, tone: "red" },
    closest && { label: "HEARTBREAKER", title: closest.loser.name, detail: `LOST BY ${score(closest.margin)} TO ${closest.winner.name}`, tone: "ink" },
    { label: bench ? "BENCH FELONY" : "DETENTION", title: benchStar.name,
      detail: bench ? `${score(benchStar.value)} POINTS LEFT TO ROT` : `${score(low?.value)} PTS · WEEK'S LOW`, tone: "red" },
  ].filter(Boolean);
  const story = weeklyStory({ king, blowout, closest, bench: benchStar }, `${weekly.season}:${weekly.week}`);
  const games = pairs.map(game => ({ winner: game.winner, loser: game.loser, margin: one(game.margin) }));

  return {
    label: "WEEK RECAP", status: "FINAL", season: Number(weekly.season), week: Number(weekly.week),
    title: `WEEK ${Number(weekly.week)} RECAP`,
    king: { name: king.name, value: king.value },
    final: true, story, highlights: highlightRows, games,
    blowout: blowout ? { winner: blowout.winner.name, loser: blowout.loser.name, margin: one(blowout.margin) } : null,
    closest: closest ? { winner: closest.winner.name, loser: closest.loser.name, margin: one(closest.margin) } : null,
    bench: bench ? benchStar : null,
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

function wrapLeft(ctx, text, x, y, maxWidth, size = 30, lineHeight = 39, maxLines = 5) {
  ctx.font = `700 ${size}px ${DISPLAY}`;
  ctx.textAlign = "left";
  const words = String(text).split(/\s+/), lines = [];
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
  caps(ctx, "THE HIGHS · THE LOWS · THE BAD DECISIONS", W / 2, 198, SHARE_INK.MUTED, 20);
  rule(ctx, 70, 220, 1010, SHARE_INK.GOLD, 4);

  caps(ctx, "THE WEEK, IN ONE QUESTIONABLE PARAGRAPH", 70, 268, SHARE_INK.ACCENT, 18, "left");
  ctx.fillStyle = SHARE_INK.INK;
  wrapLeft(ctx, card.story || "The league survived another week. Barely.", 70, 310, 940, 30, 39, 5);

  const highlights = (card.highlights || []).slice(0, 4);
  highlights.forEach((item, index) => {
    const col = index % 2, row = Math.floor(index / 2);
    const x = 70 + col * 480, y = 525 + row * 205, width = 460, height = 180;
    const tone = item.tone === "gold" ? SHARE_INK.GOLD : item.tone === "red" ? SHARE_INK.ACCENT : SHARE_INK.INK;
    ctx.fillStyle = SHARE_INK.CARD_2;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = tone;
    ctx.fillRect(x, y, 6, height);
    caps(ctx, item.label, x + 28, y + 38, tone, 18, "left");
    ctx.fillStyle = SHARE_INK.INK;
    fitDisplay(ctx, String(item.title).toUpperCase(), x + 28, y + 91, width - 56, 35, 800, "left");
    ctx.fillStyle = SHARE_INK.MUTED;
    fitDisplay(ctx, String(item.detail).toUpperCase(), x + 28, y + 139, width - 56, 16, 700, "left");
  });

  caps(ctx, "DRAFT · GOLF · SIN · FOLD", W / 2, 1022, SHARE_INK.MUTED, 21);
  return canvas;
}

export function aftermathText(card) {
  return `${card.title || card.label}: ${card.story || "The league survived another week. Barely."}`.replace(/\s+/g, " ").trim();
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
