/* =====================================================================
   golf-share.js - the tournament board as a picture
   ---------------------------------------------------------------------
   A link in a group chat is a thing nobody taps. A picture is the result.
   So this paints the board onto a canvas and hands the PNG to the phone's
   share sheet, where Messenger is waiting.

   Drawn by hand rather than by screenshotting the DOM: there is no build
   step here, html-to-canvas libraries are large and fussy about CSS
   variables, and the card wants a different layout to the page anyway -
   square, big enough to read as a chat thumbnail, and legible to somebody
   who has never opened the app.

   FIXED COLOURS, not the theme's. The image ends up on somebody else's
   phone in somebody else's chat, so it should look the same whoever sent
   it, and it should not turn white because the sender had light mode on.
   Team colours DO come from the data, because those identify the teams.

   Everything here is synchronous - see the gesture rule in share.js.
   ===================================================================== */
import { FONT, crestImage, roundRect, fitText, shareCanvas, shareText } from "./share.js";
import { SCORING_NAMES, dayPoints, pairName } from "./golf-battle.js";
import { memberNames, playerName } from "./golf-people.js";

const W = 1080, H = 1080;
const INK = "#f2f5f8", MUTED = "#8b98a5", BG = "#0d1117", CARD = "#161b22", LINE = "#2b313a";

const holesOf = (round) => Number(round?.holes) || 9;
const scoringOf = (round) => (round?.scoring === "match" ? "match" : "strokes");

/* "Sat, Aug 29" - short, because the card has a headline to fit as well. */
function shortDate(value) {
  if (!value) return "";
  const d = new Date(String(value).length === 10 ? value + "T12:00:00" : value);
  return isNaN(d) ? "" : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/** The numbers the card is about, worked out once and shared by both forms. */
export function summary(data, outing) {
  const teams = data.teams.length === 2 ? data.teams : [];
  const { total, per } = dayPoints(data.rounds);
  const values = teams.map((t) => total.get(String(t.id)) || 0);
  const played = data.rounds.flatMap((r) => r.battles).filter((b) => b.result?.complete).length;
  const matches = data.rounds.flatMap((r) => r.battles).filter((b) => b.sides.length === 2).length;
  const lead = !teams.length ? ""
    : values[0] === values[1] ? "All square"
    : `${teams[values[0] > values[1] ? 0 : 1].name} lead`;
  return {
    teams, values, per, lead, played, matches,
    holes: data.rounds.reduce((n, r) => n + holesOf(r.round), 0),
    title: outing?.name || "DFL Golf",
    meta: [outing?.course, shortDate(outing?.event_date)].filter(Boolean).join(" · "),
    done: matches > 0 && played === matches,
  };
}

/** The same thing in words, for the text share and the share sheet's caption. */
export function summaryText(s) {
  if (!s.teams.length) return `${s.title} — the tournament is not set up yet.`;
  const lines = [
    `${s.title}${s.meta ? ` — ${s.meta}` : ""}`,
    `${s.teams[0].name.toUpperCase()} ${s.values[0]} — ${s.values[1]} ${s.teams[1].name.toUpperCase()}`,
  ];
  const rounds = s.per.map(({ round, points }) =>
    `R${round.round_number} ${s.teams.map((t) => points.get(String(t.id)) || 0).join("–")}`).join(" · ");
  if (rounds) lines.push(rounds);
  lines.push(s.done ? `Final · ${s.lead === "All square" ? "All square" : s.lead}` : `${s.played} of ${s.matches} matches in · ${s.lead}`);
  return lines.join("\n");
}

// ------------------------------------------------------------- the drawing

function drawCrest(ctx) {
  const img = crestImage();
  if (!img) return 150;                 // not loaded: the headline moves up
  const w = 340, h = w * (img.naturalHeight / img.naturalWidth || 0.666);
  /* No plate. The artwork is mostly white fill, red and blue and reads fine on
     the card's dark ground - and a white rectangle in a chat thumbnail is
     exactly what it looks like: a bug. */
  ctx.drawImage(img, (W - w) / 2, 60, w, h);
  return 60 + h + 20;
}

function drawScore(ctx, s, top) {
  const mid = W / 2;
  ctx.textBaseline = "alphabetic";

  // The dash sits dead centre; each team owns the half beside it.
  ctx.fillStyle = MUTED;
  ctx.font = `700 54px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("—", mid, top + 118);

  s.teams.forEach((team, i) => {
    const cx = i === 0 ? W * 0.27 : W * 0.73;
    const colour = team.color || (i === 0 ? "#2fbf5f" : "#4aa3ff");
    ctx.fillStyle = colour;
    ctx.font = `950 150px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(String(s.values[i]), cx, top + 120);
    ctx.fillStyle = INK;
    fitText(ctx, team.name.toUpperCase(), cx, top + 176, W * 0.42, 40, 900);
  });
}

/*
  The rounds, fitted to the space between the score and the footer rather
  than at a fixed row height.

  The first version used a fixed 96px row and pinned the footer to the bottom,
  which was fine for the two rounds it was written against and drew the third
  round straight through "FINAL - DAWGS LEAD". Rows now share out whatever
  height there is and their type scales with them, so three nines fit, and so
  would five.
*/
function drawRounds(ctx, s, top, bottom) {
  const n = s.per.length;
  if (!n) return top;
  const gap = 14, x = 70, w = W - 140;
  const rowH = Math.min(96, Math.max(38, (bottom - top - gap * (n - 1)) / n));
  const k = rowH / 96;

  s.per.forEach(({ round, points }, i) => {
    const y = top + i * (rowH + gap);
    ctx.fillStyle = CARD;
    roundRect(ctx, x, y, w, rowH, 18 * k);
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = `900 ${Math.round(38 * k)}px ${FONT}`;
    ctx.fillText(round.name || `Round ${round.round_number}`, x + 28, y + rowH * 0.46);
    ctx.fillStyle = MUTED;
    ctx.font = `800 ${Math.round(25 * k)}px ${FONT}`;
    ctx.fillText(`${round.format === "singles" ? "Singles" : "2v2"} · ${SCORING_NAMES[scoringOf(round)]} · ${holesOf(round)} holes`,
      x + 28, y + rowH * 0.81);

    ctx.textAlign = "right";
    ctx.fillStyle = INK;
    ctx.font = `950 ${Math.round(52 * k)}px ${FONT}`;
    ctx.fillText(s.teams.map((t) => points.get(String(t.id)) || 0).join("  –  "), x + w - 28, y + rowH * 0.66);
  });
  return top + n * rowH + (n - 1) * gap;
}

/** The whole card. Returns the canvas, ready to share. */
export function boardCanvas(data, outing) {
  const s = summary(data, outing);
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  /* One vertical budget for the whole card, so nothing can grow into
     anything else: crest, headline, the score band, the rounds, the footer. */
  const titleY = drawCrest(ctx) + 46;
  ctx.fillStyle = INK;
  fitText(ctx, s.title, W / 2, titleY, W - 140, 52, 900);
  if (s.meta) {
    ctx.fillStyle = MUTED;
    ctx.font = `800 26px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(s.meta.toUpperCase(), W / 2, titleY + 42);
  }

  if (!s.teams.length) {
    ctx.fillStyle = MUTED;
    ctx.font = `800 32px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("The tournament is not set up yet.", W / 2, titleY + 130);
    return canvas;
  }

  const scoreTop = titleY + 96;
  drawScore(ctx, s, scoreTop);
  drawRounds(ctx, s, scoreTop + 210, H - 170);

  /* The state of play, pinned to the bottom rather than floating after the
     rounds, so the card looks the same whether there are two rounds or four. */
  ctx.textAlign = "center";
  ctx.fillStyle = s.done ? "#2fbf5f" : INK;
  ctx.font = `900 40px ${FONT}`;
  ctx.fillText(s.done ? `FINAL · ${s.lead.toUpperCase()}` : s.lead.toUpperCase(), W / 2, H - 118);
  ctx.fillStyle = MUTED;
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText(s.done ? `${s.matches} matches · ${s.holes} holes`
                      : `${s.played} of ${s.matches} matches in · ${s.holes} holes`, W / 2, H - 76);
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText("cgrant10.github.io/dfl-hq", W / 2, H - 36);

  return canvas;
}

// -------------------------------------------------------------- the button

/**
 * Share the board. MUST be called straight from the click handler.
 * @returns {string} a message worth putting in a toast
 */
export function shareBoard(data, outing) {
  const s = summary(data, outing);
  const text = summaryText(s);
  const url = location.href;

  /* No teams means no picture worth sending - fall back to words. */
  if (!s.teams.length) {
    return shareText({ title: s.title, text, url }) === "copied"
      ? "Copied to the clipboard" : "Sharing…";
  }

  const name = `${(s.title || "dfl-golf").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;
  const how = shareCanvas(boardCanvas(data, outing), name, { title: s.title, text });
  return how === "saved" ? "Image saved to your downloads" : "Sharing…";
}

/* =====================================================================
   THE TEAM SHEET - who is on whose team, and who plays whom
   ---------------------------------------------------------------------
   The board answers "who is winning". This answers the question that comes
   before it and gets asked far more often in a group chat: who am I with,
   and who am I against. Both rosters and every round's pairings on one
   image, so nobody has to open the app to find out where they are.

   Taller than the board (4:5) because it is a list, and a list wants
   vertical room in a chat thumbnail rather than a square.
   ===================================================================== */
const TW = 1080, TH = 1350;

/** Rosters and pairings, pulled out of the same data the page already has. */
export function teamSheet(data, outing) {
  const names = data.names || memberNames([]);
  const teams = data.teams.length === 2 ? data.teams : [];
  const rosters = teams.map((t) => ({
    team: t,
    players: (data.parts || [])
      .filter((p) => String(p.team_id) === String(t.id))
      .sort((a, b) => (a.pick_number ?? 9999) - (b.pick_number ?? 9999) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((p) => playerName(p, names)),
  }));
  const rounds = (data.rounds || []).map((entry) => ({
    round: entry.round,
    pairs: entry.battles.filter((b) => b.sides.length === 2).map((b) => ({
      a: pairName(b.sides[0].players.map((p) => p.name)),
      b: pairName(b.sides[1].players.map((p) => p.name)),
    })),
  })).filter((r) => r.pairs.length);
  return { teams, rosters, rounds,
    title: outing?.name || "DFL Golf",
    meta: [outing?.course, shortDate(outing?.event_date)].filter(Boolean).join(" · ") };
}

export function teamSheetText(sheet) {
  const lines = [sheet.title + (sheet.meta ? ` — ${sheet.meta}` : "")];
  for (const r of sheet.rosters) lines.push("", r.team.name.toUpperCase(), r.players.join(", ") || "nobody yet");
  for (const r of sheet.rounds) {
    lines.push("", `${(r.round.name || "Round " + r.round.round_number).toUpperCase()} · ${r.round.format === "singles" ? "singles" : "2v2"}`);
    for (const p of r.pairs) lines.push(`${p.a} v ${p.b}`);
  }
  return lines.join("\n");
}

export function teamSheetCanvas(data, outing) {
  const sheet = teamSheet(data, outing);
  const canvas = document.createElement("canvas");
  canvas.width = TW; canvas.height = TH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BG; ctx.fillRect(0, 0, TW, TH);
  ctx.strokeStyle = LINE; ctx.lineWidth = 6; ctx.strokeRect(3, 3, TW - 6, TH - 6);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = INK;
  fitText(ctx, sheet.title, TW / 2, 84, TW - 120, 54, 900);
  ctx.fillStyle = MUTED;
  ctx.font = `800 26px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText((sheet.meta ? sheet.meta + " · " : "") + "TEAMS & MATCHUPS", TW / 2, 126);

  if (!sheet.teams.length) {
    ctx.fillStyle = MUTED; ctx.font = `800 32px ${FONT}`;
    ctx.fillText("Teams have not been set yet.", TW / 2, 320);
    return canvas;
  }

  /* Two rosters side by side, each under its own colour. */
  const colW = (TW - 150) / 2, top = 176;
  let rosterBottom = top;
  sheet.rosters.forEach((r, i) => {
    const x = 60 + i * (colW + 30);
    const colour = r.team.color || (i === 0 ? "#2fbf5f" : "#4aa3ff");
    const rows = Math.max(r.players.length, 1);
    const h = 76 + rows * 44 + 14;
    ctx.fillStyle = CARD; roundRect(ctx, x, top, colW, h, 18); ctx.fill();
    ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.stroke();
    // the colour bar: the same signal the app uses for a team
    ctx.fillStyle = colour; roundRect(ctx, x, top, 7, h, 4); ctx.fill();

    ctx.textAlign = "left";
    ctx.fillStyle = colour;
    fitText(ctx, r.team.name.toUpperCase(), x + 26, top + 52, colW - 52, 36, 900, "left");
    ctx.fillStyle = MUTED; ctx.font = `800 20px ${FONT}`;
    ctx.fillText(`${r.players.length} player${r.players.length === 1 ? "" : "s"}`, x + 26, top + 78);
    ctx.fillStyle = INK;
    (r.players.length ? r.players : ["Nobody yet"]).forEach((n, j) => {
      ctx.font = `700 28px ${FONT}`;
      fitText(ctx, n, x + 26, top + 118 + j * 44, colW - 52, 28, 700, "left");
    });
    rosterBottom = Math.max(rosterBottom, top + h);
  });

  /* Then every round's pairings, fitted to whatever is left above the footer. */
  let y = rosterBottom + 40;
  const bottom = TH - 120;
  const lines = sheet.rounds.reduce((n, r) => n + 1 + r.pairs.length, 0);
  const rowH = lines ? Math.min(52, Math.max(26, (bottom - y - sheet.rounds.length * 18) / lines)) : 0;

  for (const r of sheet.rounds) {
    ctx.textAlign = "left";
    ctx.fillStyle = MUTED;
    ctx.font = `800 ${Math.round(rowH * 0.44)}px ${FONT}`;
    ctx.fillText(`${(r.round.name || "Round " + r.round.round_number).toUpperCase()} · ${r.round.format === "singles" ? "SINGLES" : "2V2"} · ${SCORING_NAMES[scoringOf(r.round)].toUpperCase()}`, 62, y + rowH * 0.7);
    y += rowH;
    for (const p of r.pairs) {
      ctx.fillStyle = INK;
      ctx.font = `700 ${Math.round(rowH * 0.58)}px ${FONT}`;
      ctx.textAlign = "left";
      fitText(ctx, p.a, 62, y + rowH * 0.72, TW * 0.40, Math.round(rowH * 0.58), 700, "left");
      ctx.fillStyle = MUTED;
      ctx.font = `800 ${Math.round(rowH * 0.4)}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("v", TW / 2, y + rowH * 0.72);
      ctx.fillStyle = INK;
      ctx.font = `700 ${Math.round(rowH * 0.58)}px ${FONT}`;
      ctx.textAlign = "right";
      fitText(ctx, p.b, TW - 62, y + rowH * 0.72, TW * 0.40, Math.round(rowH * 0.58), 700, "right");
      y += rowH;
    }
    y += 18;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = MUTED;
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText("cgrant10.github.io/dfl-hq", TW / 2, TH - 44);
  return canvas;
}

/** Share the team sheet. MUST be called straight from the click handler. */
export function shareTeamSheet(data, outing) {
  const sheet = teamSheet(data, outing);
  const text = teamSheetText(sheet);
  if (!sheet.teams.length) {
    return shareText({ title: sheet.title, text, url: location.href }) === "copied"
      ? "Copied to the clipboard" : "Sharing…";
  }
  const name = `${(sheet.title || "dfl-golf").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-teams.png`;
  const how = shareCanvas(teamSheetCanvas(data, outing), name, { title: sheet.title, text });
  return how === "saved" ? "Image saved to your downloads" : "Sharing…";
}
