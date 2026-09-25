/* =====================================================================
   aftermath-share.js - the completed week, as one group-chat picture.
   ---------------------------------------------------------------------
   This is deliberately not a dashboard panel. On Tuesday it becomes a
   small action in the cold open and produces a full six-game recap using
   actual totals from the week Sleeper just closed.

   The canvas is a share-friendly 4:5 report card, and drawing is synchronous
   because iOS only allows the share sheet during the tap itself.
   ===================================================================== */
import { sealImage, shareCanvas, shareText } from "./share.js";
import { SHARE_INK } from "./brand-ink.js";

/* 4:5 gives the report room for the story, awards, and both player podiums
   while remaining a standard share-friendly social image. */
const W = 1080, H = 1350;
const DISPLAY = '"Rajdhani", "Arial Narrow", system-ui, sans-serif';
const num = value => Number(value) || 0;
const one = value => Math.round(num(value) * 10) / 10;
const two = value => Math.round(num(value) * 100) / 100;
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
  const team = value => String(value || "Unknown").toUpperCase();
  const openings = [
    `${team(king.name)} kicked the league's teeth in with ${score(king.value)} points. Everybody else can shut the hell up until waivers.`,
    `${team(king.name)} dragged ${score(king.value)} points onto the scoreboard and made the rest of the league look like it drafted drunk.`,
    `${team(king.name)} owned the week with ${score(king.value)} points. No notes—just a polite request for everyone else to get their shit together.`,
    `${team(king.name)} dropped ${score(king.value)} points, and the scoreboard now legally qualifies as their bitch.`,
    `${team(king.name)} posted ${score(king.value)} while the rest of the league managed lineups like unpaid dumbasses.`,
    `${team(king.name)} was the week's final boss at ${score(king.value)}. Everybody else brought starter weapons and bullshit confidence.`,
  ];
  const beatings = blowout ? [
    `${team(blowout.winner.name)} beat the dogshit out of ${team(blowout.loser.name)} by ${score(blowout.margin)}.`,
    `${team(blowout.winner.name)} turned ${team(blowout.loser.name)}'s matchup into a nationally televised ass-whipping by ${score(blowout.margin)}.`,
    `${team(blowout.loser.name)} got waxed by ${team(blowout.winner.name)} by ${score(blowout.margin)} and should mute the damn group chat.`,
    `${team(blowout.winner.name)} won by ${score(blowout.margin)} while ${team(blowout.loser.name)} submitted a lineup-shaped cry for help.`,
    `${team(blowout.loser.name)} brought hope; ${team(blowout.winner.name)} brought a ${score(blowout.margin)}-point funeral. Holy shit.`,
    `${team(blowout.winner.name)} slapped ${team(blowout.loser.name)} around by ${score(blowout.margin)} like the matchup owed them money.`,
  ] : [];
  const endings = closest ? [
    `${team(closest.winner.name)} escaped ${team(closest.loser.name)} by ${score(closest.margin)}—the kind of loss that makes a grown ass man stare at stat corrections. ${team(bench.name)} also left ${score(bench.value)} points rotting on the bench like a dumbass.`,
    `${team(closest.loser.name)} came within ${score(closest.margin)} of talking reckless and instead ate the most painful shit sandwich of the week. ${team(bench.name)} committed ${score(bench.value)} points of bench malpractice.`,
    `${team(closest.winner.name)} survived by ${score(closest.margin)} while ${team(closest.loser.name)} got kicked directly in the fantasy nuts. ${team(bench.name)}'s bench filed a grievance over ${score(bench.value)} wasted points.`,
    `${team(closest.loser.name)} lost by ${score(closest.margin)}, which is not a margin—it's a goddamn personal attack. Meanwhile ${team(bench.name)} wasted ${score(bench.value)} points on the bench.`,
    `${team(closest.winner.name)} stole one by ${score(closest.margin)} and left ${team(closest.loser.name)} checking decimals like a conspiracy theorist. ${team(bench.name)} pissed away ${score(bench.value)} bench points.`,
    `${team(closest.loser.name)} missed glory by ${score(closest.margin)}. That shit will haunt a lineup. ${team(bench.name)} then left ${score(bench.value)} points on the bench for absolutely no damn reason.`,
  ] : [];
  return [pick(openings, `${seed}:open`), pick(beatings, `${seed}:beat`), pick(endings, `${seed}:end`)].filter(Boolean).join(" ");
}

function teamName(members, uid, fallback) {
  const member = (members || []).find(row => key(row.sleeper_user_id) === key(uid));
  return member?.team_name || member?.display_name || fallback || "Unknown";
}

/** Build Tuesday's truthful recap of the completed week. */
export function buildAftermath({ lore, members = [], weekly, now = new Date() } = {}) {
  /* A completed recap stays readable all week. The old Tuesday-only gate
     made Wednesday through Monday fall back to generic dashboard facts—the
     exact reason Home's "weekly report" felt like it had nothing to say. */
  if (!weekly?.teams?.length || !weekly.season || !weekly.week
    || weekly.teams.some(team => !team?.complete)) return null;

  const values = new Map(weekly.teams.map(team => [key(team.sleeper_user_id), team]));
  const current = (lore?.matchups || []).filter(row => Number(row.season) === Number(weekly.season)
    && Number(row.week) === Number(weekly.week));
  const pairs = current.map(row => {
    const leftName = teamName(members, row.user1, `Team ${row.roster1 || ""}`.trim());
    const rightName = teamName(members, row.user2, `Team ${row.roster2 || ""}`.trim());
    const leftTeam = values.get(key(row.user1)), rightTeam = values.get(key(row.user2));
    const leftScore = Number(row.score1), rightScore = Number(row.score2);
    /* The synced matchup table can lag a late Sleeper scoring adjustment.
       A completed weekly bundle is fresher and therefore authoritative. */
    const left = leftTeam?.complete && Number.isFinite(leftTeam.actual) ? num(leftTeam.actual)
      : Number.isFinite(leftScore) ? leftScore : num(leftTeam?.projection);
    const right = rightTeam?.complete && Number.isFinite(rightTeam.actual) ? num(rightTeam.actual)
      : Number.isFinite(rightScore) ? rightScore : num(rightTeam?.projection);
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
  const playerLeaders = field => weekly.teams.flatMap(team => team?.[field] || [])
    .filter(player => Number.isFinite(player?.points))
    .sort((a, b) => num(b.points) - num(a.points) || String(a.name).localeCompare(String(b.name)))
    .slice(0, 3);
  const starters = playerLeaders("starterScores"), benched = playerLeaders("benchScores");
  const actualBench = weekly.teams.map(team => ({ ...team,
    actualBenchPoints: (team.benchScores || []).reduce((total, player) => total + num(player.points), 0),
  })).filter(team => team.actualBenchPoints > 0).sort((a, b) => b.actualBenchPoints - a.actualBenchPoints)[0] || null;
  const bench = actualBench || [...weekly.teams].filter(team => num(team.pointsOnBench) > 0)
    .sort((a, b) => num(b.pointsOnBench) - num(a.pointsOnBench))[0] || null;
  const low = ranked.at(-1) || null;
  const benchStar = bench ? { name: bench.team_name || teamName(members, bench.sleeper_user_id),
    value: two(bench.actualBenchPoints || bench.pointsOnBench) }
    : { name: low?.name || "Nobody", value: 0 };
  const highlightRows = [
    { label: "WEEK'S FINAL BOSS", title: king.name, detail: `${score(king.value)} PTS · EAT SHIT, LEAGUE`, tone: "gold" },
    blowout && { label: "PUBLIC EXECUTION", title: blowout.winner.name, detail: `${score(blowout.margin)}-PT ASS-WHIPPING · ${blowout.loser.name}`, tone: "red" },
    closest && { label: "FUCKING BRUTAL", title: closest.loser.name, detail: `LOST BY ${score(closest.margin)} · ${closest.winner.name}`, tone: "ink" },
    { label: bench ? "BENCH DUMBASS" : "WEEK'S DUMPSTER FIRE", title: benchStar.name,
      detail: bench ? `${score(benchStar.value)} PTS WASTED · DUMBASS TAX` : `${score(low?.value)} PTS · ABSOLUTE SHITSHOW`, tone: "red" },
  ].filter(Boolean);
  const story = weeklyStory({ king, blowout, closest, bench: benchStar }, `${weekly.season}:${weekly.week}`);
  const games = pairs.map(game => ({ winner: game.winner, loser: game.loser, margin: two(game.margin) }));

  return {
    label: "WEEK RECAP", status: "FINAL", season: Number(weekly.season), week: Number(weekly.week),
    title: `WEEK ${Number(weekly.week)} RECAP`,
    king: { name: king.name, value: king.value },
    final: true, story, highlights: highlightRows, games, players: { starters, bench: benched },
    blowout: blowout ? { winner: blowout.winner.name, loser: blowout.loser.name, margin: two(blowout.margin) } : null,
    closest: closest ? { winner: closest.winner.name, loser: closest.loser.name, margin: two(closest.margin) } : null,
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

function wrapStory(ctx, text, x, y, maxWidth, size = 30, lineHeight = 39, maxLines = 5) {
  ctx.font = `700 ${size}px ${DISPLAY}`;
  ctx.textAlign = "left";
  const words = String(text).split(/\s+/), lines = [];
  let line = [];
  for (const word of words) {
    const trial = [...line, word].join(" ");
    if (ctx.measureText(trial).width <= maxWidth || !line.length) line.push(word);
    else { lines.push(line); line = [word]; }
  }
  if (line.length) lines.push(line);
  if (lines.length > maxLines) {
    lines[maxLines - 1] = [...lines.slice(maxLines - 1).flat(), "…"];
    lines.length = maxLines;
    while (ctx.measureText(lines[maxLines - 1].join(" ")).width > maxWidth && lines[maxLines - 1].length > 2) {
      lines[maxLines - 1].splice(-2, 1);
    }
  }
  const space = ctx.measureText(" ").width;
  lines.forEach((row, index) => {
    let cursor = x;
    row.forEach(word => {
      const letters = word.replace(/[^A-Za-z]/g, "");
      const isTeamName = letters.length > 1 && letters === letters.toUpperCase();
      ctx.fillStyle = isTeamName ? SHARE_INK.GOLD : SHARE_INK.INK;
      ctx.fillText(word, cursor, y + index * lineHeight);
      cursor += ctx.measureText(word).width + space;
    });
  });
}

function drawPlayerPodium(ctx, { x, y, title, kicker, players = [], tone }) {
  const width = 460, height = 305;
  ctx.fillStyle = SHARE_INK.CARD_2;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = tone;
  ctx.fillRect(x, y, width, 5);
  caps(ctx, kicker, x + 25, y + 39, tone, 16, "left");
  ctx.fillStyle = SHARE_INK.INK;
  fitDisplay(ctx, title, x + 25, y + 80, width - 50, 28, 800, "left");
  rule(ctx, x + 25, y + 98, x + width - 25, SHARE_INK.LINE, 2);
  players.slice(0, 3).forEach((player, index) => {
    const rowY = y + 137 + index * 56;
    ctx.fillStyle = tone;
    ctx.textAlign = "left";
    ctx.font = `800 20px ${DISPLAY}`;
    ctx.fillText(String(index + 1).padStart(2, "0"), x + 25, rowY);
    ctx.fillStyle = SHARE_INK.INK;
    fitDisplay(ctx, String(player.name).toUpperCase(), x + 68, rowY, 245, 23, 800, "left");
    ctx.fillStyle = index === 0 ? tone : SHARE_INK.INK;
    fitDisplay(ctx, score(player.points), x + width - 25, rowY, 82, 26, 800, "right");
    const meta = [player.position, player.nflTeam, player.owner].filter(Boolean).join(" · ");
    ctx.fillStyle = SHARE_INK.MUTED;
    fitDisplay(ctx, meta.toUpperCase(), x + 68, rowY + 22, 340, 13, 700, "left");
  });
  if (!players.length) caps(ctx, "NO COMPLETED PLAYER DATA", x + width / 2, y + 178, SHARE_INK.MUTED, 18);
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
  caps(ctx, "NO MERCY · NO EXCUSES · JUST RECEIPTS", W / 2, 198, SHARE_INK.MUTED, 20);
  rule(ctx, 70, 220, 1010, SHARE_INK.GOLD, 4);

  caps(ctx, "THE WEEK, WITHOUT THE BULLSHIT", 70, 268, SHARE_INK.ACCENT, 18, "left");
  ctx.fillStyle = SHARE_INK.INK;
  wrapStory(ctx, card.story || "The league survived another week. Barely.", 70, 310, 940, 30, 39, 5);

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
    ctx.fillStyle = SHARE_INK.INK;
    fitDisplay(ctx, String(item.detail).toUpperCase(), x + 28, y + 143, width - 56, 20, 700, "left");
  });

  drawPlayerPodium(ctx, { x: 70, y: 930, title: "STARTED & SHOWED OUT", kicker: "TOP 3 STARTERS",
    players: card.players?.starters, tone: SHARE_INK.GOLD });
  drawPlayerPodium(ctx, { x: 550, y: 930, title: "WASTED ON THE BENCH", kicker: "TOP 3 BENCH",
    players: card.players?.bench, tone: SHARE_INK.ACCENT });

  caps(ctx, "DRAFT · GOLF · SIN · FOLD", W / 2, 1318, SHARE_INK.MUTED, 21);
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
