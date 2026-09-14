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

const activeTake = card => {
  const takes = card?.takes || [];
  if (!takes.length) return null;
  const index = ((Number(card.takeIndex) || 0) % takes.length + takes.length) % takes.length;
  return takes[index];
};

function savageTakes({ season, week, final, king, blowout, pain, bench }) {
  const phase = final ? "finished" : "is currently projected to finish";
  const takes = [{
    kicker: "THE WEEK'S BIG SWING",
    headline: pick([
      `${king.name} kicked the door in with ${score(king.value)}. Everybody else can use the side entrance.`,
      `${king.name} put up ${score(king.value)} and made the rest of the league look underdressed.`,
      `${king.name} brought ${score(king.value)} to a knife fight. Completely unnecessary. Deeply appreciated.`,
      `${king.name} owns the room at ${score(king.value)}. Try not to make eye contact.`,
      `${king.name} dropped ${score(king.value)} and left the group chat suspiciously quiet.`,
      `${king.name} ${phase} on ${score(king.value)}—a vulgar amount of competence for this league.`,
    ], `${season}:${week}:king:${king.name}`),
    detail: final ? "Top score. No projection talk, no asterisk, no damn debate." : "The throne is rented until Monday night finishes, so start the bickering now.",
  }];
  if (blowout) takes.push({
    kicker: "PUBLIC EXECUTION",
    headline: pick([
      `${blowout.loser} got folded by ${blowout.winner} like a gas-station lawn chair.`,
      `${blowout.winner} beat ${blowout.loser} by ${score(blowout.margin)}. That's less a matchup than an HR incident.`,
      `${blowout.loser}'s safe word was “waivers.” ${blowout.winner} apparently never heard it.`,
      `${blowout.winner} left ${blowout.loser} on read—and ${score(blowout.margin)} points in the ditch.`,
      `${blowout.loser} brought hope. ${blowout.winner} brought a shovel.`,
      `${blowout.winner} won by ${score(blowout.margin)} and should at least offer cab fare home.`,
    ], `${season}:${week}:gap:${blowout.winner}:${blowout.loser}`),
    detail: `${blowout.winner} over ${blowout.loser} by ${score(blowout.margin)}${final ? ". Final and legally admissible." : " if the current projection holds."}`,
  });
  if (pain) takes.push({
    kicker: "PAIN WITH RECEIPTS",
    headline: pick([
      `${pain.name} put up ${score(pain.value)} and still lost. Premium effort, store-brand ending.`,
      `${pain.name} scored ${score(pain.value)} just to become somebody else's character development.`,
      `${pain.name} did enough to win in a respectable league. Unfortunately, this is the DFL.`,
      `${pain.name} brought ${score(pain.value)} points to the altar and the fantasy gods laughed anyway.`,
      `${pain.name} had a good week everywhere except the one column that matters.`,
      `${pain.name} scored ${score(pain.value)} and got nothing but trauma and a Tuesday notification.`,
    ], `${season}:${week}:pain:${pain.name}`),
    detail: final ? "Highest score among the losers. Frame it next to the participation ribbon." : "Currently the highest-scoring projected loser. Misery with excellent production value.",
  });
  if (bench) takes.push({
    kicker: "BENCH CRIME DIVISION",
    headline: pick([
      `${bench.name} left ${score(bench.value)} points on the bench. Elite points-per-ass decision-making.`,
      `${bench.name}'s bench scored ${score(bench.value)} points too many. Beautiful roster, terrible seating chart.`,
      `${bench.name} hid ${score(bench.value)} points on the bench like the league charges taxes on touchdowns.`,
      `${bench.name} paid full price for ${score(bench.value)} points and left them in the damn parking lot.`,
      `${bench.name}'s bench had ${score(bench.value)} reasons to file a grievance.`,
      `${bench.name} turned ${score(bench.value)} usable points into expensive furniture.`,
    ], `${season}:${week}:bench:${bench.name}`),
    detail: "The lineup optimizer has entered the chat with screenshots.",
  });
  return takes;
}

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

  const card = {
    label, status, season: Number(weekly.season), week: Number(weekly.week),
    king: { name: king.team_name || teamName(members, king.sleeper_user_id), value: valueOf(king) },
    final,
    blowout: blowout ? { winner: blowout.winner.name, loser: blowout.loser.name, margin: one(blowout.margin) } : null,
    pain: pain ? { name: pain.name, value: pain.value } : null,
    bench: bench ? { name: bench.team_name || teamName(members, bench.sleeper_user_id), value: one(bench.pointsOnBench) } : null,
  };
  card.takes = savageTakes(card);
  return card;
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

  ctx.fillStyle = SHARE_INK.MUTED;
  wrapCentered(ctx, activeTake(card)?.headline || "THE GROUP CHAT WILL HANDLE THE REST.", W / 2, 603, 900, 25, 29, 2);

  const left = card.blowout || { winner: "NO MATCHUP DATA", loser: "", margin: 0 };
  const right = card.pain || { name: "NO MATCHUP DATA", value: 0 };
  award(ctx, {
    x: 70, y: 672, w: 440, label: card.final ? "BIGGEST FINAL GAP" : "BIGGEST PROJECTED GAP", name: left.winner,
    value: `+${score(left.margin)}`, detail: left.loser ? `OVER ${left.loser}` : "WAITING ON SCORES", accent: SHARE_INK.CREST_RED,
  });
  award(ctx, {
    x: 570, y: 672, w: 440, label: "PAIN WATCH", name: right.name,
    value: score(right.value), detail: card.pain ? (card.final ? "LOST WITH THIS SCORE" : "PROJECTED TO LOSE") : "WAITING ON SCORES", accent: SHARE_INK.CREST_BLUE,
  });

  rule(ctx, 70, 925, 1010, SHARE_INK.GOLD, 2);
  const benchName = card.bench?.name || "NO BENCH WARRANT YET";
  const benchValue = card.bench ? `${score(card.bench.value)} LEFT BEHIND` : "LINEUPS LOOK CLEAN";
  caps(ctx, `BENCH WARRANT · ${benchName} · ${benchValue}`, W / 2, 968, SHARE_INK.INK, 24);
  caps(ctx, "DRAFT · GOLF · SIN · FOLD", W / 2, 1022, SHARE_INK.MUTED, 21);
  return canvas;
}

export function aftermathText(card) {
  const measure = card.final ? "scoring" : "projection";
  return `${card.label}: ${card.king.name} leads Week ${card.week} ${measure} at ${score(card.king.value)}. ${activeTake(card)?.headline || ""} ${card.status}.`.replace(/\s+/g, " ").trim();
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
