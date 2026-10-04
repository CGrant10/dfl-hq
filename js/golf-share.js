import {editorialShareCanvas} from './share-editorial.js';
import {drawShareFrame,drawShareFooter,shareMonogram} from "./share-card-style.js";
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

   FIXED COLOURS, frozen from the DEFAULT theme rather than read live. The
   image ends up on somebody else's phone in somebody else's chat, so it
   must look the same whoever sent it and must not turn white because the
   sender had light mode on - but it should still look like this app made
   it, so the constants below are Medicine Wheel's own values. See the
   palette block.
   Team colours DO come from the data, because those identify the teams.

   Everything here is synchronous - see the gesture rule in share.js.
   ===================================================================== */
import { FONT, roundRect, fitText, shareCanvas, shareText } from "./share.js";
import { SCORING_NAMES, dayPoints, pairName, roundHoles } from "./golf-battle.js";
import { memberNames, playerName } from "./golf-people.js";
import { LEAGUE_FOUNDED } from "./config.js";
import { SHARE_INK, shareTeamInk as teamInk } from "./brand-ink.js";

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

/* =====================================================================
   THE HOUSE PALETTE - Medicine Wheel, fixed.
   ---------------------------------------------------------------------
   FIXED is the point, and it is not the same thing as arbitrary. The image
   lands in somebody else's chat on somebody else's phone, so it must not
   change with whoever pressed share and must not go white because the
   sender had light mode on. So these are constants and the canvas never
   reads the runtime theme.

   But they were their OWN constants - a cool blue-grey ground left over
   from before the app had a house style - so every shared picture arrived
   looking like a different product to the app that made it. They are the
   DEFAULT theme's values now, copied from `medicine` in js/theme.js:

     BG      bg        #0b0b0c     CARD  bg2       #141416
     LINE    line      #2f2f34     INK   text      #f4f2ee
     MUTED   muted     #a8a096     GOLD  milestone #EFC94C
     ACCENT  accent    #F08279     OK    ok        #8fd6a4

   Copied deliberately rather than imported: importing theme.js would make
   the export depend on the viewer's live theme, which is the one thing it
   must never do. If Medicine Wheel is ever retuned, these move with it by
   hand - the table above is the map for doing that.

   ACCENT is the theme's TEXT red, not its fill red. #C8102E is a fine
   block of colour and a poor letter; theme.js already worked that out and
   keeps the pair separate, so the shared cards use the same lifted red for
   type that the app does.

   TEAM COLOURS ARE NOT IN HERE. Those come from the database and identify
   the teams; nothing below may replace one.
   ===================================================================== */
/* ONE LIST, in js/brand-ink.js. These were five separate copies across the
   share renderers; retuning the identity meant finding all of them. brand-ink
   is constants with no DOM, so importing it cannot make an export depend on
   the viewer's live theme - which is the thing the note above forbids. */
const { INK, MUTED, BG, CARD, LINE, GOLD, ACCENT, OK } = SHARE_INK;

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
function drawAnniv(ctx,width) {
 const text=annivText();if(text){ctx.save();ctx.fillStyle=GOLD;fitText(ctx,text,width-70,170,width-140,20,500,"right");ctx.restore()}
 return 142;
}

/* Same rule as every screen, rather than a second copy with its own 9. */
const holesOf = roundHoles;
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

function drawScore(ctx, s, top) {
  const mid = W / 2;
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle=CARD;roundRect(ctx,68,top-10,W-136,240,26);ctx.fill();
  // The dash sits dead centre; each team owns the half beside it.
  ctx.fillStyle = MUTED;
  ctx.font = `700 54px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("—", mid, top + 118);

  s.teams.forEach((team, i) => {
    const cx = i === 0 ? W * 0.27 : W * 0.73;
    const colour = teamInk(team.color, i);
    /* Team colours are identification marks, not text inks. Blue and other
       user-picked dark colours disappear once this image reaches a black
       chat background, so the score stays in the house white and the small
       rule beneath it carries the team's colour. */
    ctx.fillStyle = INK;
    ctx.font = `700 150px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(String(s.values[i]), cx, top + 120);
    ctx.fillStyle = colour;
    ctx.fillRect(cx - 46, top + 136, 92, 6);
    ctx.fillStyle = INK;
    fitText(ctx, team.name.toUpperCase(), cx, top + 176, W * 0.42, 40, 700);
    /* Who leads this team, under its name. Nothing is drawn when the team
       has no captain set. */
    const cap = s.captains?.[i];
    if (cap) {
      ctx.fillStyle = MUTED;
      fitText(ctx, `CAPTAIN ${cap.toUpperCase()}`, cx, top + 210, W * 0.40, 22, 600);
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
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = `700 ${Math.round(38 * k)}px ${FONT}`;
    ctx.fillText(round.name || `Round ${round.round_number}`, x + 28, y + rowH * 0.46);
    ctx.fillStyle = MUTED;
    ctx.font = `600 ${Math.round(25 * k)}px ${FONT}`;
    ctx.fillText(`${round.format === "singles" ? "Singles" : "2v2"} · ${SCORING_NAMES[scoringOf(round)]} · ${holesOf(round)} holes`,
      x + 28, y + rowH * 0.81);

    ctx.textAlign = "right";
    ctx.fillStyle = INK;
    ctx.font = `700 ${Math.round(52 * k)}px ${FONT}`;
    ctx.fillText(s.teams.map((t) => points.get(String(t.id)) || 0).join("  –  "), x + w - 28, y + rowH * 0.66);
  });
  return top + n * rowH + (n - 1) * gap;
}

/** The whole card. Returns the canvas, ready to share. */
export function boardCanvas(data, outing) {
 const s=summary(data,outing);return editorialShareCanvas({kind:'Golf tournament',context:s.meta,headline:s.title,status:s.done?'Final':'In progress',summary:s.lead,results:s.teams.map((t,i)=>({label:t.name,value:String(s.values[i])})),sections:[{label:'Captains',rows:s.teams.flatMap((t,i)=>s.captains[i]?[{name:t.name,detail:s.captains[i]}]:[])},{label:'Rounds',rows:s.per.map(({round,points})=>({name:round.name||`Round ${round.round_number}`,value:s.teams.map(t=>points.get(String(t.id))||0).join(' – '),detail:`${round.format==='singles'?'Singles':'2v2'} · ${SCORING_NAMES[scoringOf(round)]} · ${holesOf(round)} holes`}))},{label:'Progress',rows:[{name:`${s.played} of ${s.matches} matches decided · ${s.holes} holes`}]}],footer:'Golf tournament'});
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

/* The team's colour, resolved once so the roster card, the matchup rows and
   the captain showdown cannot each fall back to a different default. */
const teamColour = (team, i) => teamInk(team?.color, i);

export function teamSheet(data, outing) {
  const names = data.names || memberNames([]);
  const teams = data.teams.length === 2 ? data.teams : [];
  const rosters = teams.map((t) => {
    const mine = (data.parts || [])
      .filter((p) => String(p.team_id) === String(t.id))
      .sort((a, b) => (a.pick_number ?? 9999) - (b.pick_number ?? 9999) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return {
      team: t,
      captain: captainOf(t, names),
      /* WHICH ROW IN THE LIST IS THE CAPTAIN, by member id rather than by
         matching the name back - two people called Nick would otherwise put
         the mark on whichever one sorted first. -1 when the team has none. */
      captainIndex: t.captain_member_id == null ? -1
        : mine.findIndex((p) => String(p.member_id) === String(t.captain_member_id)),
      players: mine.map((p) => playerName(p, names)),
    };
  });
  const rounds = (data.rounds || []).map((entry) => ({
    round: entry.round,
    pairs: entry.battles.filter((b) => b.sides.length === 2).map((b) => {
      /*
        THE FIRST TEAM IS ALWAYS ON THE LEFT.

        Matches store their sides in slot order, and nothing guarantees slot 1
        is the same team in every match of every round. The card now heads
        each column with a team name, so a column headed TEAM CHAOS with a
        Team Bogey pair under it would be a picture that lies.

        Presentation only. Which pair plays which pair, and every point it is
        worth, is decided in golf-battle.js and is not touched by swapping
        which end of a row a name is drawn at.
      */
      const sides = teams.length === 2 && String(b.sides[1].team_id) === String(teams[0].id)
        ? [b.sides[1], b.sides[0]] : b.sides;
      return {
        a: pairName(sides[0].players.map((p) => p.name)),
        b: pairName(sides[1].players.map((p) => p.name)),
      };
    }),
  })).filter((r) => r.pairs.length);
  return { teams, rosters, rounds,
    /* The headline rivalry, and only when there genuinely is one: both teams
       must have a real captain. One captain is not a showdown, so the block
       is not drawn at all rather than drawn with a gap in it. */
    showdown: rosters.length === 2 && rosters.every((r) => r.captain) ? rosters : null,
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
 const s=teamSheet(data,outing);return editorialShareCanvas({kind:'Golf teams & matchups',context:s.meta,headline:s.title,sections:[...s.rosters.map(r=>({label:[r.team.name,r.captain?`Captain ${r.captain}`:null].filter(Boolean).join(' · '),rows:r.players.map(p=>({name:p.name||p}))})),...s.rounds.map(r=>({label:r.name||r.round?.name||'Round',rows:r.pairs.map(p=>({name:`${p.a} vs ${p.b}`,detail:p.detail||''}))}))],footer:'Golf teams & matchups'});
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
   at weight 900, with Medicine Wheel red and yellow doing the work. Nothing is
   borrowed from anybody else's wrestling promotion: the drama is scale and
   contrast, which cost nothing and belong to nobody.

   1080x1350 because that is the portrait ratio every chat app and story
   will show without cropping the margin out of the middle.
   ===================================================================== */
const PW = 1080, PH = 1350;

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

export function matchPosterCanvas(p, moodText) {
 return editorialShareCanvas({kind:'Golf matchup',context:[p.round,p.when].filter(Boolean).join(' / '),headline:p.event,results:p.names.map((name,i)=>({label:name,value:p.figures[i]})),status:moodText,summary:p.standing,footer:'Golf matchup'});
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
