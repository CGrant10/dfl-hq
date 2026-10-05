import {editorialShareCanvas} from './share-editorial.js';
import {profileShareSpec} from './share-export-model.js';
import {drawShareFrame,drawShareFooter,shareMonogram} from "./share-card-style.js";
// =====================================================================
// profile-share.js - one member's DFL scouting report, as an image.
// ---------------------------------------------------------------------
// This is not a polite bio card. It is the record: career numbers, hardware,
// receipts, and one verdict derived from facts already shown on the profile.
// No invented stats and no random roast copy.
// =====================================================================

import { FONT, roundRect, fitText, shareCanvas, shareText } from "./share.js";
import { SHARE_INK } from "./brand-ink.js";
import { dflSeasonCount } from "./config.js";

const W = 1080, H = 1350;
const { BG, CARD, LINE, INK, MUTED, GOLD, ACCENT, OK, BRAND_RED, BRAND_YELLOW } = SHARE_INK;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const one = (v) => (num(v) == null ? "—" : num(v).toFixed(1));
const pct = (v) => (num(v) == null ? "—" : `${Math.round(num(v) * 100)}%`);

function ordinal(n) {
  const v = num(n);
  if (v == null) return "—";
  const s = ["th", "st", "nd", "rd"];
  const k = v % 100;
  return v + (s[(k - 20) % 10] || s[k] || s[0]);
}

function streakValue(streak) {
  const run = num(streak?.run);
  return run && run > 0 ? String(run) : null;
}

/**
 * Fold the profile's real data into the player card.
 *
 * `career` is the compact career total used by the profile page. `extremes`
 * comes from lore.career(), so it carries the best/worst season, best/worst
 * scoring week, and longest win/loss streak. Keeping this pure makes it easy
 * to test without canvas or Supabase.
 */
export function profileShareData({ member, career, extremes = {}, seasonCount = 0, chipSeasons = [] } = {}) {
  if (!member) return null;

  const c = career || {};
  const wins = num(c.wins) ?? 0;
  const losses = num(c.losses) ?? 0;
  const ties = num(c.ties) ?? 0;
  const games = wins + losses + ties;
  const winPct = num(c.winPct) ?? (games ? (wins + ties / 2) / games : 0);
  const titles = num(c.titles) ?? 0;
  const playoffs = num(c.playoffs) ?? 0;
  const runnerUps = num(c.runnerUps) ?? 0;
  const chips = chipSeasons.length;

  const trophyCase = [];
  trophyCase.push(["Championships", String(titles)]);
  trophyCase.push(["Playoff trips", String(playoffs)]);
  if (runnerUps) trophyCase.push(["Runner-ups", String(runnerUps)]);
  if (extremes.bestSeason) trophyCase.push(["Best finish", ordinal(extremes.bestSeason.rank)]);
  if (extremes.highWeek) trophyCase.push(["Nuclear week", one(extremes.highWeek.score)]);
  const winRun = streakValue(extremes.streak?.win);
  if (winRun) trophyCase.push(["Win streak", `${winRun} straight`]);

  const crimeScene = [];
  if (chips) crimeScene.push(["Chip Eater", chips > 1 ? `${chips}×` : String(chipSeasons[0])]);
  if (extremes.worstSeason) crimeScene.push(["Basement visit", ordinal(extremes.worstSeason.rank)]);
  if (extremes.lowWeek) crimeScene.push(["Crime of a week", one(extremes.lowWeek.score)]);
  const lossRun = streakValue(extremes.streak?.loss);
  if (lossRun) crimeScene.push(["Loss spiral", `${lossRun} straight`]);
  if (!chips && runnerUps) crimeScene.push(["Almost had it", `${runnerUps} runner-up${runnerUps === 1 ? "" : "s"}`]);

  const data = {
    who: member.display_name || "DFL",
    team: (member.team_name || "").trim(),
    seasons: dflSeasonCount(num(seasonCount) ?? 0),
    record: `${wins}-${losses}${ties ? `-${ties}` : ""}`,
    wins, losses, ties, games,
    winPct,
    points: Math.round(num(c.pointsFor) ?? 0).toLocaleString(),
    avgFinish: num(c.avgFinish) == null ? "—" : one(c.avgFinish),
    titles,
    playoffs,
    runnerUps,
    chips,
    trophyCase: trophyCase.slice(0, 5),
    crimeScene: crimeScene.slice(0, 5),
  };
  data.verdict = verdictFor(data, extremes);
  return data;
}

/** Savage, but only where the numbers earned it. */
export function verdictFor(d, extremes = {}) {
  const lossRun = num(extremes.streak?.loss?.run) ?? 0;
  const winRun = num(extremes.streak?.win?.run) ?? 0;
  const worst = num(extremes.worstSeason?.rank);

  if (d.titles > 0 && d.chips > 0) {
    return "Has lived at both ends of the standings. Ring on one hand, hot chip in the other.";
  }
  if (d.chips >= 2) {
    return "Multiple trips to the basement. At this point the hot chip knows the address.";
  }
  if (d.titles >= 3) {
    return "Dynasty credentials. Annoying as hell, but the hardware makes the argument for them.";
  }
  if (d.titles >= 1 && d.winPct >= 0.55) {
    return "The shit talk has documentation: winning record, playoff damage, and a ring to point at.";
  }
  if (lossRun >= 6) {
    return `Once lost ${lossRun} straight. That is not a slump; that is a subscription plan.`;
  }
  if (worst != null && worst >= 10) {
    return `Has finished ${ordinal(worst)}. The standings had to add a basement level.`;
  }
  if (d.games >= 20 && d.winPct < 0.40) {
    return "The résumé has seen some shit. The group chat should keep the screenshots handy.";
  }
  if (winRun >= 6) {
    return `Put together ${winRun} straight wins once. For a while, everybody else was just schedule filler.`;
  }
  if (d.playoffs && !d.titles && d.runnerUps) {
    return "Knows the route to the playoffs. Still looking for the last damn turn.";
  }
  if (d.winPct >= 0.55) {
    return "Annoyingly effective. The record gives the trash talk legal standing.";
  }
  return "Dangerous enough to talk shit. Inconsistent enough that the receipts stay interesting.";
}

/** The line that travels with the PNG in a share sheet. */
export function profileShareText(d) {
  if (!d) return "";
  const bits = [`${d.who} — ${d.record} in ${d.seasons} DFL season${d.seasons === 1 ? "" : "s"}`];
  if (d.titles) bits.push(`${d.titles} title${d.titles === 1 ? "" : "s"}`);
  if (d.chips) bits.push(`${d.chips}× Chip Eater`);
  return `${bits.join(" · ")}. ${d.verdict}`;
}

function drawStat(ctx, x, y, w, label, value) {
  ctx.fillStyle = MUTED;
  ctx.font = `600 20px ${FONT}`;
  ctx.letterSpacing = "2px";
  ctx.fillText(label, x + w / 2, y + 22);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = INK;
  fitText(ctx, value, x + w / 2, y + 73, w - 18, 46, 700, "center");
}

function drawReceiptColumn(ctx, x, y, w, h, title, list, ink, emptyText) {
  ctx.textAlign="center";
  ctx.fillStyle = CARD;
  roundRect(ctx, x, y, w, h, 24); ctx.fill();
  ctx.strokeStyle = LINE; ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 24); ctx.stroke();

  ctx.fillStyle = ink;
  ctx.font = `700 27px ${FONT}`;
  ctx.letterSpacing = "4px";
  ctx.fillText(title, x + w / 2, y + 42);
  ctx.letterSpacing = "0px";

  if (!list.length) {
    ctx.fillStyle = MUTED;
    ctx.font = `700 24px ${FONT}`;
    fitText(ctx, emptyText, x + w / 2, y + h / 2 + 12, w - 36, 24, 700, "center");
    return;
  }

  const rowH=(h-90)/Math.max(1,list.length);
  list.forEach(([label,value],i)=>{
    const ry=y+95+i*rowH;
    ctx.fillStyle=MUTED;fitText(ctx,label,x+24,ry,w*.58-28,24,500,"left");
    ctx.fillStyle=ink;fitText(ctx,value,x+w-24,ry,w*.36,32,650,"right");
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) shown[maxLines - 1] = shown[maxLines - 1].replace(/[.,;:!?]*$/, "") + "…";
  shown.forEach((s, i) => ctx.fillText(s, x, y + i * lineHeight));
  return shown.length;
}

export function profileShareCanvas(d) {
 return editorialShareCanvas(profileShareSpec(d));
}

/** Draw it and hand it to the device share sheet. */
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
