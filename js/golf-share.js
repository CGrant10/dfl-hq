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
import { LEAGUE_FOUNDED } from "./config.js";

/*
  ONE RATIO FOR EVERY DFL CARD: 1080x1350, 4:5.

  The board used to be square while the team sheet and the match poster were
  4:5, so three images of the same event arrived in the same group chat in
  two different shapes. 4:5 is the one to standardise on - it is what a phone
  and a story both show without cropping, and it was already what two of the
  three used. The board gains 270px of height, which all goes to the rounds
  list; the footer is pinned to the bottom edge, so nothing else moves.
*/
const W = 1080, H = 1350;
const INK = "#f2f5f8", MUTED = "#8b98a5", BG = "#0d1117", CARD = "#161b22", LINE = "#2b313a";
const GOLD = "#d6b254";

/*
  THE ANNIVERSARY BAND.

  The same rule as the front page: only on a decade season, nothing at all on
  any other. It goes at the very top of a shared card because the card ends up
  in a group chat where it is the whole message - if the tenth season is worth
  a banner in the app, it is worth one on the thing people actually look at.

  Returns the height it used, so every card below it shifts down rather than
  being drawn through.
*/
function ordinalOf(n) {
  const r = n % 100;
  if (r >= 11 && r <= 13) return n + "th";
  return n + (["th", "st", "nd", "rd"][n % 10] || "th");
}
function annivText() {
  const n = new Date().getFullYear() - LEAGUE_FOUNDED + 1;
  return n > 1 && n % 10 === 0 ? `${ordinalOf(n)} ANNIVERSARY SEASON` : "";
}
function drawAnniv(ctx, width) {
  const text = annivText();
  if (!text) return 0;
  const h = 68;
  ctx.fillStyle = "rgba(214,178,84,.13)";
  ctx.fillRect(0, 0, width, h);
  ctx.strokeStyle = "rgba(214,178,84,.55)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, h - 1); ctx.lineTo(width, h - 1); ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.textAlign = "center";
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(`★   ${text}   ★`, width / 2, 45);
  return h;
}

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
  const names = data.names || memberNames([]);
  const { total, per } = dayPoints(data.rounds);
  const values = teams.map((t) => total.get(String(t.id)) || 0);
  const played = data.rounds.flatMap((r) => r.battles).filter((b) => b.result?.complete).length;
  const matches = data.rounds.flatMap((r) => r.battles).filter((b) => b.sides.length === 2).length;
  const lead = !teams.length ? ""
    : values[0] === values[1] ? "All square"
    : `${teams[values[0] > values[1] ? 0 : 1].name} lead`;
  return {
    teams, values, per, lead, played, matches,
    captains: teams.map((t) => captainOf(t, names)),
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
  lines.push(s.done ? `Final · ${s.lead === "All square" ? "All square" : s.lead}` : `${s.played} of ${s.matches} matches decided · ${s.lead}`);
  return lines.join("\n");
}

// ------------------------------------------------------------- the drawing

/* The crest is fetched when share.js loads, which is long before anybody
   taps share - but if it somehow has not arrived, the card must still be the
   same card. Reserving the SAME height it would have taken means the
   fallback is a missing picture rather than a different layout. */
/* What every card reserves for the crest. These two move with the artwork -
   the landscape lockup is 3:2 - or the fallback layout goes wrong. */
const CREST_W = 340, CREST_H = 226;

function drawCrest(ctx, top) {
  const img = crestImage();
  if (!img) return top + 6 + CREST_H + 20;
  const w = CREST_W, h = w * (img.naturalHeight / img.naturalWidth || CREST_H / CREST_W);
  /* No plate. The artwork is mostly white fill, red and blue and reads fine on
     the card's dark ground - and a white rectangle in a chat thumbnail is
     exactly what it looks like: a bug. */
  ctx.drawImage(img, (W - w) / 2, top + 6, w, h);
  return top + 6 + h + 20;
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
    /* Who leads this team, under its name. Nothing is drawn when the team
       has no captain set. */
    const cap = s.captains?.[i];
    if (cap) {
      ctx.fillStyle = MUTED;
      fitText(ctx, `CAPTAIN ${cap.toUpperCase()}`, cx, top + 210, W * 0.40, 22, 800);
    }
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
  const titleY = drawCrest(ctx, drawAnniv(ctx, W) + 48) + 46;
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
                      : `${s.played} of ${s.matches} matches decided · ${s.holes} holes`, W / 2, H - 76);
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
/*
  THE CAPTAIN'S NAME, from the id the team row already carries.

  golf_teams.captain_member_id is a real column behind a migration, so a
  team without one resolves to nothing and the card simply does not print
  a captain line - it never guesses at a leader. memberNames() is the same
  map the app uses for every other golf name, so the shared picture calls
  somebody exactly what the scorecard does.
*/
function captainOf(team, names) {
  if (!team?.captain_member_id) return "";
  const n = names?.get?.(String(team.captain_member_id));
  return n?.golf || n?.display || "";
}

export function teamSheet(data, outing) {
  const names = data.names || memberNames([]);
  const teams = data.teams.length === 2 ? data.teams : [];
  const rosters = teams.map((t) => ({
    team: t,
    captain: captainOf(t, names),
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
  for (const r of sheet.rosters) {
    lines.push("", r.team.name.toUpperCase() + (r.captain ? ` — captain ${r.captain}` : ""),
               r.players.join(", ") || "nobody yet");
  }
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

  const bandH = drawAnniv(ctx, TW);
  ctx.fillStyle = INK;
  fitText(ctx, sheet.title, TW / 2, bandH + 84, TW - 120, 54, 900);
  ctx.fillStyle = MUTED;
  ctx.font = `800 26px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText((sheet.meta ? sheet.meta + " · " : "") + "TEAMS & MATCHUPS", TW / 2, bandH + 126);

  if (!sheet.teams.length) {
    ctx.fillStyle = MUTED; ctx.font = `800 32px ${FONT}`;
    ctx.fillText("Teams have not been set yet.", TW / 2, 320);
    return canvas;
  }

  /* Two rosters side by side, each under its own colour. */
  const colW = (TW - 150) / 2, top = bandH + 176;
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
    /* The captain shares the line with the player count rather than taking
       one of its own - the card is already tight, and "6 PLAYERS ·
       CAPTAIN SLAW" reads as one fact about the team. */
    const capLine = `${r.players.length} PLAYER${r.players.length === 1 ? "" : "S"}`
      + (r.captain ? ` · CAPTAIN ${r.captain.toUpperCase()}` : "");
    fitText(ctx, capLine, x + 26, top + 78, colW - 52, 20, 800, "left");
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

/* =====================================================================
   THE MATCH POSTER - one battle, billed like a fight
   ---------------------------------------------------------------------
   The board card is the whole day. This is ONE match, in the shape a fight
   poster is: portrait, the two sides stacked with a VS between them, the
   margin enormous, and a status across the bottom in words.

   It is the DFL's own identity turned up - Rajdhani is not available on a
   canvas without loading it, so the same system stack the other cards use,
   at weight 900, with the crest red and blue doing the work. Nothing is
   borrowed from anybody else's wrestling promotion: the drama is scale and
   contrast, which cost nothing and belong to nobody.

   1080x1350 because that is the portrait ratio every chat app and story
   will show without cropping the margin out of the middle.
   ===================================================================== */
const PW = 1080, PH = 1350;
const RED = "#E5011B", BLUE = "#003396";

/** The numbers the poster is about. Handed in, never derived here. */
export function posterData({ names, sides, result, scoring, round, matchNumber, outing, standing }) {
  const lead = scoring === "match" ? (result.up || 0) : (result.lead || 0);
  const leader = !lead ? -1 : (result.diff < 0 ? 0 : 1);
  const started = !!(result.thru || result.postedA || result.postedB);
  return {
    names, sides, result, scoring, leader, lead, started,
    matchNumber,
    /* standingLine() from golf-battle.js, passed in rather than rebuilt -
       the poster and the screen must not word the same match differently. */
    standing: standing || "",
    event: outing?.name || "DFL GOLF",
    when: shortDate(outing?.event_date),
    round: round ? (round.name || `ROUND ${round.round_number}`) : "",
    figures: [0, 1].map((i) => {
      if (scoring !== "match") return String((i === 0 ? result.postedA : result.postedB) || "—");
      /* A dash, not "AS". The poster draws each figure directly above that
         side's name, so a level match printed "AS" over BOTH names and read
         as though it were part of them. The state is said once, in words, in
         the standing line across the bottom: "All square thru 4". */
      if (!lead) return "—";
      return i === leader
        ? `${lead}${result.complete && result.closedOut && result.remaining > 0 ? `&${result.remaining}` : " UP"}`
        : "—";
    }),
  };
}

function drawPosterBand(ctx, y, h, colour) {
  const g = ctx.createLinearGradient(0, y, PW, y + h);
  g.addColorStop(0, colour);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, y, PW, h);
}

/**
 * One match as a poster.
 * @param {object} p        from posterData()
 * @param {string} moodText the status headline, chosen by marquee.js
 */
export function matchPosterCanvas(p, moodText) {
  const canvas = document.createElement("canvas");
  canvas.width = PW; canvas.height = PH;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, PW, PH);

  /* The two team colours as bands top and bottom, so the poster is that
     match's colours before a word is read. Falls back to the crest pair. */
  drawPosterBand(ctx, 0, 260, hexA(p.sides[0]?.color || RED, 0.30));
  ctx.save();
  ctx.translate(PW, PH); ctx.rotate(Math.PI);
  drawPosterBand(ctx, 0, 260, hexA(p.sides[1]?.color || BLUE, 0.30));
  ctx.restore();

  ctx.strokeStyle = LINE; ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, PW - 6, PH - 6);

  let y = drawAnniv(ctx, PW) + 40;
  y = drawCrest(ctx, y) + 34;

  // ---- the billing -------------------------------------------------------
  ctx.textAlign = "center";
  const billing = [p.matchNumber === 1 ? "MAIN EVENT" : `MATCH ${p.matchNumber}`, p.round]
    .filter(Boolean).join("   ·   ").toUpperCase();
  ctx.fillStyle = RED;
  ctx.font = `900 30px ${FONT}`;
  ctx.fillText(billing, PW / 2, y);
  y += 30;
  ctx.fillStyle = MUTED;
  ctx.font = `800 24px ${FONT}`;
  ctx.fillText([p.event, p.when].filter(Boolean).join("  ·  ").toUpperCase(), PW / 2, y + 8);

  // ---- the tale of the tape ---------------------------------------------
  const tapeTop = y + 90;
  const side = (i, top) => {
    ctx.fillStyle = INK;
    fitText(ctx, p.names[i].toUpperCase(), PW / 2, top, PW - 160, 58, 900);
    ctx.fillStyle = i === p.leader ? "#ffffff" : MUTED;
    ctx.font = `900 132px ${FONT}`;
    ctx.fillText(p.figures[i], PW / 2, top + 148);
    const c = p.sides[i]?.color || (i === 0 ? RED : BLUE);
    ctx.fillStyle = c;
    ctx.fillRect(PW / 2 - 70, top + 178, 140, 8);
  };
  side(0, tapeTop);

  ctx.fillStyle = MUTED;
  ctx.font = `900 44px ${FONT}`;
  ctx.fillText("VS", PW / 2, tapeTop + 268);

  side(1, tapeTop + 350);

  // ---- the status --------------------------------------------------------
  const statusY = PH - 210;
  ctx.strokeStyle = LINE; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(70, statusY - 60); ctx.lineTo(PW - 70, statusY - 60); ctx.stroke();

  if (moodText) {
    ctx.fillStyle = p.result.complete ? "#f2f5f8" : RED;
    fitText(ctx, moodText, PW / 2, statusY, PW - 120, 56, 900);
  }
  ctx.fillStyle = MUTED;
  ctx.font = `800 28px ${FONT}`;
  ctx.fillText(p.standing.toUpperCase(), PW / 2, statusY + 52);

  ctx.fillStyle = MUTED;
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText("cgrant10.github.io/dfl-hq", PW / 2, PH - 46);

  return canvas;
}

/* #rrggbb -> rgba(). Team colours come out of the database as hex, and a
   band needs them transparent. Anything unparseable falls back rather than
   painting the poster with the string "undefined". */
function hexA(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return `rgba(229,1,27,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** One line of text for the share sheet, for anybody without image support. */
export function matchPosterText(p, moodText) {
  const head = `${p.names[0]} vs ${p.names[1]}`;
  return [head, p.standing, moodText, p.event].filter(Boolean).join(" · ");
}

/**
 * Share it. MUST be called straight from the click handler - see share.js.
 * @returns {string} a message worth putting in a toast
 */
export function shareMatchPoster(p, moodText) {
  const canvas = matchPosterCanvas(p, moodText);
  const name = `dfl-${String(p.names[0]).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v-${String(p.names[1]).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
  return shareCanvas(canvas, name, {
    title: `${p.names[0]} vs ${p.names[1]}`,
    text: matchPosterText(p, moodText),
  });
}
