import { FONT, fitText, roundRect, shareCanvas } from "./share.js";
import { SHARE_INK } from "./brand-ink.js";

const clean = value => String(value || "").replace(/\s+/g, " ").trim();
const { INK, MUTED, BG, CARD, LINE, GOLD, ACCENT, OK } = SHARE_INK;
const W = 1080, H = 1350;

function cellMark(cell) {
  const mark = cell?.querySelector?.(".m-eagle,.m-birdie,.m-par,.m-bogey,.m-dbl")?.className || "";
  if (String(mark).includes("m-eagle")) return "eagle";
  if (String(mark).includes("m-birdie")) return "birdie";
  if (String(mark).includes("m-bogey")) return "bogey";
  if (String(mark).includes("m-dbl")) return "double";
  return "par";
}

function rowName(row) {
  const head = row.querySelector("th");
  if (!head) return "Golfer";
  const clone = head.cloneNode(true);
  clone.querySelectorAll("small").forEach(node => node.remove());
  return clean(clone.textContent) || "Golfer";
}

export function scorecardModel(card, fallbackTitle = "Golf scorecard") {
  const table = card?.querySelector("table");
  const title = clean(card?.querySelector("h2")?.textContent) || fallbackTitle;
  const context = [...(card?.querySelectorAll(".gqm-scorecard-title p,.gqm-scorecard-title strong") || [])]
    .map(node => clean(node.textContent)).filter(Boolean).join(" · ");
  const columns = [...(table?.querySelectorAll("thead th") || [])].slice(1).map((node, index) => ({
    label: clean(node.textContent), index,
    hole: Number((clean(node.textContent).match(/^\d+/) || [])[0]) || 0,
  }));
  const rows = [...(table?.querySelectorAll("tbody tr") || [])].map(row => {
    const cells = [...row.querySelectorAll("td")];
    return { name: rowName(row),
      values: cells.map(cell => clean(cell.textContent) || "—"), marks: cells.map(cellMark) };
  });
  return { title, context, columns, rows };
}

function drawCell(ctx, x, y, w, h, value, mark = "par", total = false) {
  ctx.fillStyle = total ? "#20242a" : CARD;
  roundRect(ctx, x, y, w, h, 10); ctx.fill(); ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.stroke();
  const n = Number(value);
  if (!total && n && mark !== "par") {
    ctx.strokeStyle = mark === "eagle" ? GOLD : mark === "birdie" ? OK : ACCENT;
    ctx.lineWidth = mark === "double" ? 7 : 4;
    const inset = Math.max(7, Math.min(12, h * .18));
    if (mark === "birdie" || mark === "eagle") { ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2 - inset, 0, Math.PI * 2); ctx.stroke(); }
    else ctx.strokeRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
  }
  ctx.fillStyle = value === "—" ? MUTED : INK; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.min(27, Math.max(18, h * .48))}px ${FONT}`; ctx.fillText(value, x + w / 2, y + h / 2 + 1);
}

function drawNine(ctx, model, title, holes, y, height) {
  const x = 46, nameW = 210, totalW = 92, gap = 5;
  const holeCols = holes.map(h => model.columns.find(c => c.hole === h)).filter(Boolean);
  if (!holeCols.length) return y;
  const totalCol = model.columns.find(c => (holes[0] === 1 ? /front|out/i : /back|in/i).test(c.label));
  const holeW = Math.floor((W - x * 2 - nameW - totalW - gap * (holeCols.length + 1)) / holeCols.length);
  const headerH = 62, rowH = Math.min(72, Math.max(32, (height - headerH - 28) / Math.max(1, model.rows.length)));
  ctx.fillStyle = MUTED; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = `900 23px ${FONT}`; ctx.fillText(title.toUpperCase(), x, y + 24);
  let cy = y + 38; ctx.fillStyle = "#20242a"; roundRect(ctx, x, cy, W - x * 2, headerH, 12); ctx.fill();
  ctx.fillStyle = MUTED; ctx.font = `800 19px ${FONT}`; ctx.textBaseline = "middle"; ctx.fillText("GOLFER", x + 15, cy + headerH / 2);
  let cx = x + nameW + gap;
  holeCols.forEach(col => { ctx.textAlign = "center"; ctx.fillText(String(col.hole), cx + holeW / 2, cy + headerH / 2); cx += holeW + gap; });
  ctx.fillStyle = GOLD; ctx.fillText("TOTAL", cx + totalW / 2, cy + headerH / 2); cy += headerH + gap;
  model.rows.forEach(row => {
    ctx.fillStyle = CARD; roundRect(ctx, x, cy, nameW, rowH, 10); ctx.fill(); ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = INK; ctx.textAlign = "left"; ctx.textBaseline = "middle"; fitText(ctx, row.name, x + 14, cy + rowH / 2 + 1, nameW - 28, Math.min(23, Math.max(17, rowH * .43)), 850, "left");
    cx = x + nameW + gap;
    holeCols.forEach(col => { drawCell(ctx, cx, cy, holeW, rowH, row.values[col.index], row.marks[col.index]); cx += holeW + gap; });
    drawCell(ctx, cx, cy, totalW, rowH, totalCol ? row.values[totalCol.index] : "—", "par", true); cy += rowH + gap;
  });
  return cy;
}

export function scorecardCanvas(model) {
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d"); ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = LINE; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6); ctx.fillStyle = GOLD; ctx.fillRect(0, 0, W, 16);
  ctx.fillStyle = INK; fitText(ctx, model.title.toUpperCase(), W / 2, 84, W - 100, 50, 950);
  if (model.context) { ctx.fillStyle = MUTED; fitText(ctx, model.context.toUpperCase(), W / 2, 126, W - 110, 24, 750); }
  const hasBack = model.columns.some(c => c.hole >= 10), panelHeight = hasBack ? 500 : 850;
  let y = drawNine(ctx, model, "Front nine", [1,2,3,4,5,6,7,8,9], 170, panelHeight);
  if (hasBack) y = drawNine(ctx, model, "Back nine", [10,11,12,13,14,15,16,17,18], y + 24, panelHeight);
  const summaryCols = model.columns.filter(c => !c.hole && /total|\+|par|front|back|out|in/i.test(c.label));
  if (summaryCols.length) {
    const top = Math.min(H - 116, y + 24), colW = (W - 92) / summaryCols.length;
    summaryCols.forEach((col, i) => { const x = 46 + i * colW; ctx.fillStyle = MUTED; ctx.textAlign = "center"; ctx.font = `800 17px ${FONT}`; ctx.fillText(col.label.toUpperCase(), x + colW / 2, top); ctx.fillStyle = INK; fitText(ctx, model.rows.map(r => r.values[col.index]).join(" / "), x + colW / 2, top + 37, colW - 16, 28, 950); });
  }
  ctx.fillStyle = MUTED; ctx.font = `700 22px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("DFL HQ · GOLF", W / 2, H - 38);
  return canvas;
}

export function shareScorecard(card, fallbackTitle = "Golf scorecard") {
  const model = scorecardModel(card, fallbackTitle);
  if (!model.rows.length) return "failed";
  const filename = `${model.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "golf-scorecard"}.png`;
  return shareCanvas(scorecardCanvas(model), filename, { title: model.title, text: model.context || model.title });
}
