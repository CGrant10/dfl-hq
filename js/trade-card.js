import {tradeShareSpec} from './share-export-model.js';
import {editorialShareCanvas} from './share-editorial.js';
import {drawShareFrame,drawShareFooter,wrapShareText} from "./share-card-style.js";
// =====================================================================
// trade-card.js - share one deal as an image
// ---------------------------------------------------------------------
// The sixth card in the DFL identity, and the third that reuses all of it:
// roundRect(), fitText(), crestImage() and shareCanvas() come from share.js,
// the palette from brand-ink.js, and the frame is the same 1080x1350 every
// other DFL card uses.
//
// WHY A TRADE NEEDS ONE AT ALL
//
// Trade arguments do not happen on the Trade Analyzer. They happen in the
// group chat, where the analyzer's verdict was previously represented by
// somebody typing "the model says accept" and everybody else taking their
// word for it. This is the model saying it: both packages, both totals, the
// call, and the balance - so the argument is about the model rather than
// about what the model said.
//
// SAME BONES AS THE SPORTSBOOK TICKET, on purpose. The figures, the stamp
// and the footer are measured UP from the bottom edge and the packages flex
// between - see sportsbook-ticket.js for the long version of why. Two share
// cards from one app should be recognisably the same object.
// =====================================================================

import { FONT, roundRect, fitText, shareCanvas, shareText } from "./share.js";
import { SHARE_INK } from "./brand-ink.js";

const W = 1080;
const { BG, CARD, CARD_2, LINE, INK, MUTED, GOLD, ACCENT, OK, BRAND_RED, BRAND_YELLOW } = SHARE_INK;

const num = value => (Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0);
const signed = value => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(Number(value) || 0).toFixed(1)}`;
const teamName = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || ""}`;

/* recommendationFor() owns the call and its tone. FLEECE deliberately uses
   the same red as PASS: the word is louder, the direction is identical. */
const CALL_INK = { accept: GOLD, pass: ACCENT, negotiate: BRAND_YELLOW };

function savageFallback(recommendation) {
  if (recommendation?.action === "FLEECE") return "FLEECE. They are robbing your ass blind.";
  if (recommendation?.action === "ACCEPT") return "You are committing the robbery. Hit accept.";
  if (recommendation?.action === "PASS") return "The value and the lineup are pulling in opposite directions.";
  return "Fair as hell. Weird, but fine.";
}

/**
 * Fold a deal into exactly what the card draws.
 *
 * Takes the ALREADY EVALUATED result rather than re-running evaluateTrade():
 * a shared image that disagreed with the ticket it was shared from would be
 * worse than no image at all.
 */
export function dealCardData({ result, parties = [], sends = [], pool = new Map(), verdict, recommendation, remarks, remark, member } = {}) {
  if (!result || parties.length < 2 || !recommendation) return null;
  const named = ids => (ids || []).map(id => pool.get(String(id))).filter(Boolean)
    .sort((a, b) => Number(b.tradeValue) - Number(a.tradeValue))
    .map(player => ({
      id: String(player.id || ''), position: player.position || '', nflTeam: player.nflTeam || '',
      name: String(player.name || ""),
      meta: `${player.position || ""}${player.nflTeam ? ` · ${player.nflTeam}` : ""}`,
      value: num(player.tradeValue),
    }));
  const multi = parties.length > 2;
  const supplied = Array.isArray(remarks) && remarks.length ? remarks : remark ? [remark] : [];
  const fullRemarks = supplied.length ? supplied.map(item => ({
    title: String(item?.title || ""),
    copy: String(item?.copy || ""),
    tone: String(item?.tone || "neutral"),
  })).filter(item => item.title || item.copy) : [{
    title: savageFallback(recommendation), copy: "", tone: recommendation.tone === "pass" ? "bad" : recommendation.tone === "accept" ? "good" : "neutral",
  }];
  const columns = parties.flatMap((from, index) => {
    const groups = new Map();
    for (const id of sends[index] || []) {
      const toId = String(result.destinations?.[id] ?? parties[(index + 1) % parties.length].id);
      if (!groups.has(toId)) groups.set(toId, []);
      groups.get(toId).push(String(id));
    }
    return [...groups].map(([toId, ids]) => ({
      from: teamName(from), to: teamName(parties.find(p => String(p.id) === toId)),
      players: named(ids),
      total: multi ? result.routeValues ? num(ids.reduce((sum,id) => sum + Number(result.routeValues[id] || 0),0))
        : num(result.values?.[(index + 1) % parties.length])
        : index === 0 ? num(result.valueToB) : num(result.valueToA),
    }));
  });
  return {
    multi, partyCount:parties.length,
    who: member?.display_name || teamName(parties[0]),
    /* Every column is "this side hands these over", which is the only framing
       that stays true for a three-way. */
    columns,
    call: String(recommendation.action || "").toUpperCase(),
    callTone: String(recommendation.tone || "negotiate"),
    headline: verdict?.headline || "",
    winner: verdict?.who === "a" ? teamName(parties[0]) : verdict?.who === "b" ? multi?"The other side":teamName(parties[1]) : null,
    fairness: Math.max(0, Math.min(100, num(result.fairness))),
    deltas: parties.map((party, index) => ({
      team: teamName(party),
      delta: multi ? Number(result.weeklyDeltas?.[index] || 0)
        : index === 0 ? Number(result.weeklyDeltaA || 0) : Number(result.weeklyDeltaB || 0),
    })),
    /* The DFLyzer's top remark rides along, because the card is what reaches
       the group chat and "ACCEPT" alone starts no arguments. */
    /* Every evidence-backed description belongs on the shared receipt. */
    remarks: fullRemarks,
    remark: fullRemarks[0]?.title || "",
    remarkTone: fullRemarks[0]?.tone || "neutral",
    forWhom: teamName(parties[0]),
    against: multi?"Other members":teamName(parties[1]),
  };
}

/** The one-line text that goes with the image where a share sheet takes text. */
export function dealCardText(t) {
  if (!t) return "";
  const out = t.columns[0]?.players.map(p => p.name).join(" + ") || "nobody";
  const back = t.columns[1]?.players.map(p => p.name).join(" + ") || "nobody";
  const remark = (t.remarks || []).map(item => [item.title, item.copy].filter(Boolean).join(" ")).join(" ");
  const packages = t.multi ? t.columns.map(c => `${c.from} sends ${c.players.map(p=>p.name).join(' + ')} to ${c.to}`).join('; ') : `${t.forWhom} sends ${out} for ${back}`;
  return `${t.call} — ${packages}. `
    + `${remark}${remark && !/[.!?]$/.test(remark) ? "." : ""} `
    + `${t.fairness}% balance, ${signed(t.deltas[0]?.delta)} average projected points/week to my lineup. `
    + `DFLyzer, which is a model and not a promise.`;
}

/* Where every band sits. Measured up from the bottom, packages flex above. */
function packageMetrics(t) {
  const rowsIn = column => Math.max(1, column.players.length);
  const packH = Math.max(...t.columns.map(column => 92 + rowsIn(column) * 58 + 62));
  return { packH, packsH: t.columns.length <= 2 ? packH : t.columns.length * (packH + 12) - 12 };
}

function frame(t) {
 const {packH,packsH}=packageMetrics(t),measure=document.createElement('canvas').getContext('2d');
 const reasons=(t.remarks||[]).map(reason=>{
  const titles=wrapShareText(measure,reason.title,W-216,28,650),copies=wrapShareText(measure,reason.copy,W-216,24,500);
  return{...reason,titles,copies,height:Math.max(112,48+titles.length*34+copies.length*32)};
 });
 const stampH=132,stampTop=274+packsH+28,reasonsTop=stampTop+stampH+26;
 const reasonsH=44+reasons.reduce((sum,r)=>sum+r.height+16,0);
 const lineH=52,linesTop=reasonsTop+reasonsH+26,meterY=linesTop+t.deltas.length*lineH+60,who=meterY+104;
 return{packH,packsH,stampH,stampTop,reasonsTop,reasonsH,reasons,linesTop,lineH,meterY,who,height:Math.max(1350,who+154)};
}

function drawPackage(ctx, column, x, y, w, h, accent) {
  ctx.fillStyle = CARD;
  roundRect(ctx, x, y, w, h, 20);
  ctx.fill();
  ctx.strokeStyle = LINE; ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 20);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  ctx.font = `600 20px ${FONT}`;
  ctx.letterSpacing = "3px";
  ctx.fillText(column.label.toUpperCase(), x + 20, y + 34);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = MUTED;
  fitText(ctx, column.from, x + 20, y + 60, w - 40, 22, 700, "left");

  let rowY = y + 92;
  const rows = column.players.length ? column.players : [{ name: "Nobody yet", meta: "", value: null }];
  for (const player of rows) {
    ctx.textAlign = "right";
    ctx.fillStyle = MUTED;
    ctx.font = `600 26px ${FONT}`;
    const valueText = player.value === null ? "" : String(player.value);
    const valueW = valueText ? ctx.measureText(valueText).width : 0;
    if (valueText) ctx.fillText(valueText, x + w - 20, rowY + 22);

    ctx.textAlign = "left";
    ctx.fillStyle = player.value === null ? MUTED : INK;
    fitText(ctx, player.name, x + 20, rowY + 20, w - 44 - valueW, 27, 600, "left");
    if (player.meta) {
      ctx.fillStyle = MUTED;
      fitText(ctx, player.meta, x + 20, rowY + 42, w - 44 - valueW, 19, 700, "left");
    }
    rowY += player.meta ? 58 : 40;
  }

  /* The total, on a rule, because the whole point of the two columns is that
     you can see the arithmetic instead of trusting a percentage. */
  ctx.strokeStyle = LINE; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 20, y + h - 62);
  ctx.lineTo(x + w - 20, y + h - 62);
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.fillStyle = MUTED;
  ctx.font = `600 20px ${FONT}`;
  ctx.letterSpacing = "3px";
  ctx.fillText("VALUE", x + 20, y + h - 26);
  ctx.letterSpacing = "0px";
  ctx.textAlign = "right";
  ctx.fillStyle = accent;
  ctx.font = `700 42px ${FONT}`;
  ctx.fillText(String(column.total), x + w - 20, y + h - 20);
  ctx.textAlign = "center";
}

export function dealCanvas(t) {
 return editorialShareCanvas(tradeShareSpec(t));
}

/**
 * Draw it and hand it to the share sheet.
 *
 * shareCanvas() owns the fallbacks and the phone rule - a download is only
 * ever offered where downloading is how you get a file. Do not add one here.
 */
export async function shareDeal(input) {
  const t = dealCardData(input);
  if (!t) return "none";
  const canvas = dealCanvas(t);
  const slug = `${t.forWhom}-${t.against}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "deal";
  const how = await shareCanvas(canvas, `dfl-deal-${slug}.png`, {
    title: "DFL Trade Analyzer",
    text: dealCardText(t),
  });
  if (how === "none") await shareText({ title: "DFL Trade Analyzer", text: dealCardText(t) });
  return how;
}
