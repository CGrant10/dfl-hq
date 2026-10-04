import {editorialShareCanvas} from './share-editorial.js';
import {drawShareFrame,drawShareFooter} from "./share-card-style.js";
import { FONT, fitText, shareCanvas } from "./share.js";
import { SHARE_INK } from "./brand-ink.js";

const clean = value => String(value || "").replace(/\s+/g, " ").trim();
const W = 1600, H = 900;
const { INK, MUTED, LINE, GOLD, ACCENT, BG: PAPER, CARD: HEADER, CARD_2, GOLD_WASH: GOOD_BG, RED_WASH: BAD_BG } = SHARE_INK;

function cellMark(cell) {
  const mark = cell?.querySelector?.(".m-eagle,.m-birdie,.m-par,.m-bogey,.m-dbl")?.className || "";
  if (String(mark).includes("m-eagle")) return "eagle";
  if (String(mark).includes("m-birdie")) return "birdie";
  if (String(mark).includes("m-bogey")) return "bogey";
  if (String(mark).includes("m-dbl")) return "double";
  return "par";
}

function primaryText(node, fallback = "") {
  if (!node) return fallback;
  const clone = node.cloneNode(true);
  clone.querySelectorAll("small").forEach(child => child.remove());
  return clean(clone.textContent) || fallback;
}

export function scorecardModel(card, fallbackTitle = "Golf scorecard") {
  const table = card?.querySelector("table");
  const title = clean(card?.querySelector("h2")?.textContent) || fallbackTitle;
  const context = [...(card?.querySelectorAll(".gqm-scorecard-title p,.gqm-scorecard-title strong") || [])]
    .map(node => clean(node.textContent)).filter(Boolean).join(" · ");
  const columns = [...(table?.querySelectorAll("thead th") || [])].slice(1).map((node, index) => {
    const label = primaryText(node, clean(node.textContent));
    return {
      label,
      meta: clean(node.querySelector?.("small")?.textContent),
      index,
      hole: Number((label.match(/^\d+/) || [])[0]) || 0,
    };
  });
  const rows = [...(table?.querySelectorAll("tbody tr") || [])].map(row => {
    const head = row.querySelector("th");
    const cells = [...row.querySelectorAll("td")];
    return {
      name: primaryText(head, "Golfer"),
      detail: clean(head?.querySelector?.("small")?.textContent),
      values: cells.map(cell => clean(cell.textContent) || "—"),
      marks: cells.map(cellMark),
    };
  });
  return { title, context, columns, rows };
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawScoreMark(ctx, value, mark, x, y, w, h) {
  const size = Math.min(42, w - 10, h - 10);
  const cx = x + w / 2, cy = y + h / 2;
  const isGood = mark === "birdie" || mark === "eagle";
  const isBad = mark === "bogey" || mark === "double";
  if (isGood || isBad) {
    const inset = mark === "eagle" || mark === "double" ? 4 : 0;
    ctx.fillStyle = isGood ? GOOD_BG : BAD_BG;
    ctx.strokeStyle = isGood ? GOLD : ACCENT;
    ctx.lineWidth = 1.5;
    if (isGood) {
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      if (inset) { ctx.beginPath(); ctx.arc(cx, cy, size / 2 - inset, 0, Math.PI * 2); ctx.stroke(); }
    } else {
      ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
      ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
      if (inset) ctx.strokeRect(cx - size / 2 + inset, cy - size / 2 + inset, size - inset * 2, size - inset * 2);
    }
  }
  ctx.fillStyle = isGood ? GOLD : isBad ? ACCENT : INK;
  ctx.textBaseline = "middle";
  fitText(ctx, value, cx, cy + 1, Math.max(20, w - 10), Math.min(25, h * .42), 850);
}

function drawHeader(ctx, column, x, y, w, h) {
  ctx.fillStyle = HEADER;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = INK;
  ctx.textBaseline = "middle";
  const metaLines = column.meta.split(/\s*[·•]\s*/).filter(Boolean);
  fitText(ctx, column.label, x + w / 2, y + (metaLines.length ? h * .25 : h / 2), w - 8, column.hole ? 23 : 18, 850);
  if (metaLines.length) {
    ctx.fillStyle = MUTED;
    metaLines.slice(0, 2).forEach((text, index) => {
      fitText(ctx, text, x + w / 2, y + h * (.54 + index * .24), w - 8, 13, 700);
    });
  }
}

export function scorecardCanvas(model) {
 return editorialShareCanvas({kind:'Golf scorecard',headline:model.title,context:model.context,table:model,footer:'Golf scorecard · Yellow: birdie/eagle · Red: bogey/double'});
}

export function shareScorecard(card, fallbackTitle = "Golf scorecard") {
  const model = scorecardModel(card, fallbackTitle);
  if (!model.rows.length) return "failed";
  const filename = `${model.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "golf-scorecard"}.png`;
  return shareCanvas(scorecardCanvas(model), filename, { title: model.title, text: model.context || model.title });
}
