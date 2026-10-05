import {ticketShareSpec} from './share-export-model.js';
import {editorialShareCanvas} from './share-editorial.js';
import {drawShareFrame,drawShareFooter} from "./share-card-style.js";
// =====================================================================
// sportsbook-ticket.js - share one ENTRY as an image
// ---------------------------------------------------------------------
// The fifth card in the DFL identity, and deliberately the FOURTH implementation
// of nothing: roundRect(), fitText(), crestImage() and shareCanvas() come from
// share.js, the palette from brand-ink.js, and the frame is the same 1080x1350
// every other DFL card uses. A ticket is not a screenshot of a row.
//
// WHY THIS DRAWS A LIST NOW
//
// It used to draw one wager: one pick, one price, one return, and a member with
// three picks got three separate images that nobody in a group chat is going to
// post in a row. An entry holds up to six picks against one stake, so the card
// draws the entry - every pick stacked with its own price, then the combined
// price and the one return underneath. That is the Underdog shape, and it is
// also just what a paper slip looks like.
//
// THE FOOT IS ANCHORED, THE MIDDLE FLEXES
//
// Six picks is 3.5x the content of one, so a fixed layout would either crop the
// long card or leave a third of the short one empty. The first version summed
// every band's height and centred the total, which very nearly worked and left
// a visible dead band under the name on the short cards - the sum omitted the
// footer's own height, and a stack centred against a footer that is pinned
// separately cannot come out even.
//
// So nothing is centred against a guess now. The figures, the status chip, the
// name and the disclaimer are measured UP from the bottom edge, the brand block
// is measured DOWN from the top, and the picks flex in the space between. Every
// card is framed identically at every length, which is the only way six states
// of the same object look like six of the same object.
// =====================================================================

import { FONT, roundRect, fitText, shareCanvas, shareText } from "./share.js";
import { SHARE_INK } from "./brand-ink.js";

const W = 1080, H = 1350;
const FOOTER = 90;
const { BG, CARD, CARD_2, LINE, INK, MUTED, GOLD, ACCENT, OK, BRAND_RED, BRAND_YELLOW } = SHARE_INK;

const fmtOdds = (n) => (Number(n) > 0 ? `+${Number(n)}` : String(Number(n)));
const num = (n) => Number(n || 0).toLocaleString("en-US");

/*
  A LEG'S SUBTITLE IS THE OPPONENT, NOT THE FIXTURE.

  Market titles are "A vs B", so printing one under a pick of "A" read
  "Doberman Dynasty / Doberman Dynasty vs Gengar Gang" - the pick's own name
  twice, and the only new word buried at the end. Splitting the title and
  dropping the half that IS the pick leaves "vs Gengar Gang".

  A prop's title is a question with no side in it, so the split finds nothing
  and the whole question is kept - which is correct, because for a YES pick
  the question is the only thing that identifies the bet.
*/
export function opponentLine(market, pick) {
  const title = String(market || "").trim();
  const name = String(pick || "").trim();
  if (!title || !name) return title;
  const parts = title.split(/\s+(?:vs\.?|v\.?|@|at)\s+/i);
  if (parts.length !== 2) return title;
  const [home, away] = parts.map((part) => part.trim());
  if (home.toLowerCase() === name.toLowerCase()) return `vs ${away}`;
  if (away.toLowerCase() === name.toLowerCase()) return `vs ${home}`;
  return title;
}

/* The tick and the cross, stroked rather than typed. "✓" and "✗" are not in
   every system font at the same weight - the cross was arriving as a thin
   serif X beside a bold tick - and a mark this small has to be one shape. */
function drawMark(ctx, kind, cx, cy, size, colour) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(2.5, size / 6);
  ctx.lineCap = "round";
  ctx.beginPath();
  const r = size / 2;
  if (kind === "won") {
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx - r * .25, cy + r * .7);
    ctx.lineTo(cx + r, cy - r * .75);
  } else {
    ctx.moveTo(cx - r * .8, cy - r * .8);
    ctx.lineTo(cx + r * .8, cy + r * .8);
    ctx.moveTo(cx + r * .8, cy - r * .8);
    ctx.lineTo(cx - r * .8, cy + r * .8);
  }
  ctx.stroke();
}

/*
  STATUS DRIVES THE COLOUR AND NOTHING ELSE DOES.

  Settled tickets keep their result colour: won is green, lost is muted, and
  void is the accent. Open tickets do not need a chip repeating that they are
  open; the potential return already makes their state clear.
*/
const STATUS_INK = { open: GOLD, won: OK, lost: MUTED, void: ACCENT };

/**
 * Fold one entry plus its legs into exactly what the card draws.
 *
 * Separate from the painting so the shape can be reasoned about, and tested,
 * without a canvas. Everything is a string or a number by the time it leaves.
 */
export function ticketData({ bet, legs = [], member, season = null } = {}) {
  if (!bet) return null;
  const stake = Number(bet.stake) || 0;
  const ret = Number(bet.potential_payout) || 0;
  const picks = (Array.isArray(legs) ? legs : []).map((leg) => ({
    pick: String(leg?.label || "Pick"),
    market: opponentLine(leg?.market, leg?.label),
    odds: fmtOdds(leg?.odds_american),
    status: String(leg?.status || "open"),
  }));
  const status = String(bet.status || "open");
  return {
    who: member?.display_name || "DFL",
    picks,
    /* The headline. One pick is its own headline; a real entry is counted. */
    title: picks.length === 1 ? picks[0].pick : `${picks.length}-pick entry`,
    market: picks.length === 1 ? picks[0].market : "",
    odds: fmtOdds(bet.odds_american),
    stake,
    ret,
    /* The profit, because "return" alone reads as the winnings to about half of
       everybody and as stake+winnings to the other half. Print both. */
    profit: Math.max(0, ret - stake),
    status,
    /* A ticket the member pulled themselves is not a ticket the house voided,
       and the card should not accuse anybody of the wrong one. */
    pulled: status === "void" && !!bet.cancelled_at,
    settled: !!bet.settled_at,
    won: picks.filter((p) => p.status === "won").length,
    season,
  };
}

/** The one-line text that goes with the image where a share sheet takes text. */
export function ticketText(t) {
  if (!t) return "";
  const head = t.status === "won" ? "Cashed" : t.status === "lost" ? "Torn up"
    : t.pulled ? "Pulled" : t.status === "void" ? "Voided" : "On the board";
  const what = t.picks.length === 1
    ? `${t.picks[0].pick} at ${t.odds}`
    : `${t.picks.length} picks at ${t.odds} — ${t.picks.map((p) => p.pick).join(", ")}`;
  return `${head}: ${what} — ${num(t.stake)} SIN to return ${num(t.ret)}. DFL Sportsbook, where SIN is play money.`;
}

/*
  A LEG ROW. Index chip, pick, its opponent underneath, its own price on the
  right - and a tick or a cross once the leg has been graded, because on a
  settled 3-pick the interesting question is which one broke it.
*/
function drawLeg(ctx, leg, index, x, y, w, rowH) {
  const ink = STATUS_INK[leg.status] || GOLD;
  const h = rowH - 12;
  const compact = h < 74;
  ctx.fillStyle = CARD;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = leg.status === "open" ? LINE : ink;
  ctx.lineWidth = leg.status === "open" ? 2 : 3;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();

  const chip = compact ? 42 : 52;
  const cy = y + h / 2;
  ctx.fillStyle = CARD_2;
  roundRect(ctx, x + 18, cy - chip / 2, chip, chip, 13);
  ctx.fill();
  ctx.strokeStyle = LINE; ctx.lineWidth = 1.5;
  roundRect(ctx, x + 18, cy - chip / 2, chip, chip, 13);
  ctx.stroke();
  const markX = x + 18 + chip / 2;
  if (leg.status === "won" || leg.status === "lost") {
    drawMark(ctx, leg.status, markX, cy, chip * .42, ink);
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = leg.status === "void" ? MUTED : GOLD;
    ctx.font = `700 ${compact ? 22 : 26}px ${FONT}`;
    ctx.fillText(String(index + 1), markX, cy + (compact ? 8 : 9));
  }

  // The price first, so the name knows how much room it has left.
  ctx.textAlign = "right";
  ctx.fillStyle = leg.status === "lost" || leg.status === "void" ? MUTED : GOLD;
  ctx.font = `700 ${compact ? 34 : 42}px ${FONT}`;
  const priceW = ctx.measureText(leg.odds).width;
  ctx.fillText(leg.odds, x + w - 24, cy + (compact ? 12 : 15));

  const textX = x + 18 + chip + 18;
  const textW = w - (textX - x) - priceW - 48;
  ctx.textAlign = "left";
  ctx.fillStyle = leg.status === "lost" || leg.status === "void" ? MUTED : INK;
  if (!leg.market) {
    fitText(ctx, leg.pick, textX, cy + 12, textW, compact ? 30 : 36, 600, "left");
  } else {
    fitText(ctx, leg.pick, textX, cy - (compact ? 2 : 4), textW, compact ? 28 : 34, 600, "left");
    ctx.fillStyle = MUTED;
    fitText(ctx, leg.market, textX, cy + (compact ? 20 : 24), textW, compact ? 19 : 22, 700, "left");
  }
  ctx.textAlign = "center";
}

/*
  WHERE EVERY BAND SITS.

  Measured up from the bottom edge, because these five things are the same on
  every card and somebody comparing two shared tickets should find the stake
  in the same place on both. The picks are the only variable-height part, so
  they are the only part that flexes.
*/
function frame(t,height=H) {
 const multi=t.picks.length>1,open=t.status==="open",rowH=104;
 const priceSize=multi?104:150,priceBase=multi?320+t.picks.length*rowH+136:560;
 const boxesTop=priceBase+60,profit=open?boxesTop+220:null,chipTop=open?null:boxesTop+210;
 return{multi,open,rowH,priceSize,priceBase,boxesTop,profit,chipTop,who:height-130,disclaimer:height-48,mustLand:multi&&open?priceBase-priceSize-10:null};
}

export function ticketCanvas(t) {
 return editorialShareCanvas(ticketShareSpec(t));
}

/**
 * Draw it and hand it to the share sheet.
 *
 * shareCanvas() owns the fallbacks and the phone rule - a download is only ever
 * offered where downloading is how you get a file. Do not add one here.
 */
export async function shareTicket(input) {
  const t = ticketData(input);
  if (!t) return "none";
  const canvas = ticketCanvas(t);
  const slug = (t.picks.length === 1 ? t.picks[0].pick : `${t.picks.length}-pick`)
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "entry";
  const how = await shareCanvas(canvas, `dfl-ticket-${slug}.png`, {
    title: "DFL Sportsbook",
    text: ticketText(t),
  });
  if (how === "none") await shareText({ title: "DFL Sportsbook", text: ticketText(t) });
  return how;
}

const recapWho=item=>item?.team_name||item?.display_name||"Nobody";

export function sportsbookRecapData(recap){
  if(!recap?.available)return null;
  const start=new Date(recap.startsAt),end=new Date(recap.endsAt);
  const range=`${start.toLocaleDateString("en-US",{month:"short",day:"numeric"})}–${end.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`;
  return{
    range,tickets:Number(recap.tickets||0),risked:Number(recap.sinRisked||0),
    cards:[
      recap.biggestWinner&&{label:"BIGGEST CASH",name:recapWho(recap.biggestWinner),value:`+${num(recap.biggestWinner.net)} SIN`,note:"Somebody actually beat the damn house."},
      recap.worstBeat&&{label:"BAD BEAT",name:recapWho(recap.worstBeat),value:`${num(recap.worstBeat.potential_payout)} MISSED`,note:"One beautiful ticket, reduced to a corpse."},
      recap.longestParlay&&{label:"PARLAY PSYCHO",name:recapWho(recap.longestParlay),value:`${recap.longestParlay.pick_count}-LEG ${String(recap.longestParlay.status).toUpperCase()}`,note:recap.longestParlay.status==="won"?"The lunatic landed it.":"Ambition met a folding chair."},
      recap.funniestFailure&&{label:"HOUSE VICTIM",name:recapWho(recap.funniestFailure),value:`${recap.funniestFailure.pick_count}-LEG FUNERAL`,note:"Absolutely cooked. No notes."},
      recap.mostProfitable&&{label:"WEEK'S SHARPEST",name:recapWho(recap.mostProfitable),value:`${Number(recap.mostProfitable.net)>=0?"+":""}${num(recap.mostProfitable.net)} SIN`,note:"Best net when the smoke cleared."}
    ].filter(Boolean).slice(0,4)
  };
}

export function sportsbookRecapText(recap){
  const data=sportsbookRecapData(recap);if(!data)return "";
  return [`DFL SPORTSBOOK AFTERMATH · ${data.range}`,`${num(data.tickets)} tickets · ${num(data.risked)} SIN risked`,...data.cards.map(card=>`${card.label}: ${card.name} — ${card.value}`)].join("\n");
}

export function sportsbookRecapCanvas(recap){
 const data=sportsbookRecapData(recap);if(!data)return null;const highlights=data.cards.map(c=>({label:c.label,name:c.name,value:c.value,detail:c.note}));return editorialShareCanvas({template:'recap',recap:{title:'THE WEEK’S\nRECEIPTS.',hero:highlights[0]||{label:'Week in SIN',name:`${data.tickets} tickets`,value:`${data.risked} SIN risked`},highlights:highlights.slice(1),allHighlights:highlights,story:`${data.tickets} tickets · ${data.risked} SIN risked`},kind:'Sportsbook aftermath',context:data.range,headline:'THE WEEK’S\nRECEIPTS.',summary:`${data.tickets} tickets · ${data.risked} SIN risked`,sections:data.cards.map(c=>({label:c.label,rows:[{name:c.name,value:c.value,detail:c.note}]})),footer:'SIN is play money · No cash value'});
}

export async function shareSportsbookRecap(recap){
  const canvas=sportsbookRecapCanvas(recap);if(!canvas)return "none";
  const how=await shareCanvas(canvas,"dfl-sportsbook-aftermath.png",{title:"DFL Sportsbook Aftermath",text:sportsbookRecapText(recap)});
  if(how==="none")await shareText({title:"DFL Sportsbook Aftermath",text:sportsbookRecapText(recap)});
  return how;
}
