/* =====================================================================
   DFL HQ - Golf scorecard presentation
   ---------------------------------------------------------------------
   The golf page stores one score per player/hole in golf_scores, but the
   UI presents those scores as ONE team scorecard. This keeps the database
   normalized while keeping the user experience clean.
   ===================================================================== */

const SCORECARD_STYLE = `
.single-team-scorecard{padding:0;overflow:hidden}
.single-team-scorecard .scorecard-title{display:flex;align-items:center;gap:14px;padding:15px 16px;background:var(--bg-3);border-bottom:1px solid var(--line)}
.single-team-scorecard .scorecard-team-heading{min-width:0}
.single-team-scorecard .scorecard-team-heading h2{margin:2px 0 2px;font-size:19px}
.single-team-scorecard .scorecard-kicker{display:block;font-size:10px;letter-spacing:.12em;font-weight:800;color:var(--accent)}
.single-team-scorecard .scorecard-table-wrap{padding:12px 14px 0;overflow-x:auto;-webkit-overflow-scrolling:touch}
.single-team-scorecard .scorecard-nine{margin:0 0 14px;border:1px solid var(--line);border-radius:11px;overflow:hidden;background:var(--bg-2)}
.single-team-scorecard .scorecard-nine-title{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;background:var(--bg-3);border-bottom:1px solid var(--line)}
.single-team-scorecard .scorecard-nine-title strong{font-size:14px}
.single-team-scorecard .scorecard-nine-title span{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.single-team-scorecard .score-grid{display:grid;grid-template-columns:minmax(110px,1.5fr) repeat(9,minmax(42px,1fr)) minmax(58px,.8fr) minmax(48px,.7fr);min-width:690px}
.single-team-scorecard .score-grid.back{grid-template-columns:minmax(110px,1.5fr) repeat(9,minmax(42px,1fr)) minmax(58px,.8fr) minmax(48px,.7fr)}
.single-team-scorecard .score-cell{min-height:42px;padding:6px 4px;display:grid;place-items:center;border-right:1px solid var(--line-soft);border-bottom:1px solid var(--line-soft);font-size:12px;font-variant-numeric:tabular-nums}
.single-team-scorecard .score-cell:last-child{border-right:0}
.single-team-scorecard .score-grid .head{background:var(--bg-3);font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.single-team-scorecard .score-grid .player-name{justify-items:start;padding-left:10px;font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.single-team-scorecard .score-grid .par{font-weight:700;color:var(--muted)}
.single-team-scorecard .score-cell input{width:34px;height:32px;padding:0;border:1px solid var(--line);border-radius:6px;background:var(--bg-2);color:var(--text);text-align:center;font:inherit;font-weight:700}
.single-team-scorecard .score-cell input:focus{outline:2px solid var(--accent);outline-offset:-1px}
.single-team-scorecard .score-cell .dash{color:var(--muted)}
.single-team-scorecard .score-cell.tally{font-weight:800;background:rgba(127,127,127,.035)}
.single-team-scorecard .score-cell.to-par{font-weight:800}
.single-team-scorecard .score-grid .complete-head{background:var(--bg-3)}
.single-team-scorecard .score-summary{display:grid;grid-template-columns:1fr auto auto;gap:14px;align-items:center;margin:0 14px 14px;padding:12px;border:2px solid var(--line);border-radius:11px;background:var(--bg-3);font-variant-numeric:tabular-nums}
.single-team-scorecard .score-summary small{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.04em}
.single-team-scorecard .score-summary b{font-size:16px}
.single-team-scorecard .score-note{padding:0 14px 14px;color:var(--muted);font-size:11px}
@media(max-width:600px){.single-team-scorecard .scorecard-table-wrap{padding-left:10px;padding-right:10px}.single-team-scorecard .score-summary{grid-template-columns:1fr 1fr}.single-team-scorecard .score-summary>span:first-child{grid-column:1/-1}}
`;

function esc(value){
  return String(value ?? "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
}

function num(value){
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function signed(score, par){
  if (!score) return "—";
  const d = score - par;
  return d === 0 ? "E" : d > 0 ? `+${d}` : `${d}`;
}

function readPlayer(block){
  const name = block.querySelector("header h3")?.textContent?.trim() || "Player";
  const scores = {};
  block.querySelectorAll(".score-hole").forEach(cell => {
    const input = cell.querySelector("input[data-score]");
    const hole = Number(input?.dataset.hole || cell.querySelector("span")?.textContent || 0);
    if (!hole) return;
    scores[hole] = input ? input.value : (cell.querySelector("b")?.textContent?.trim() || "");
  });
  const firstNine = block.querySelectorAll(".score-nine")[0];
  const secondNine = block.querySelectorAll(".score-nine")[1];
  const getPar = el => Number(el?.querySelector(".score-nine-head b")?.textContent || 0);
  return {
    name,
    memberId: block.querySelector("input[data-score]")?.dataset.member || "",
    editable: !!block.querySelector("input[data-score]"),
    scores,
    frontPar: getPar(firstNine),
    backPar: getPar(secondNine),
  };
}

function total(scores, start, end){
  let n = 0;
  for(let h=start; h<=end; h++) n += num(scores[h]);
  return n;
}

function holeCell(player, hole){
  const value = player.scores[hole] || "";
  if(player.editable){
    return `<div class="score-cell"><input data-score member="${esc(player.memberId)}" hole="${hole}" type="number" min="1" max="15" inputmode="numeric" value="${esc(value)}" aria-label="${esc(player.name)}, hole ${hole}"></div>`;
  }
  return `<div class="score-cell">${value ? `<b>${esc(value)}</b>` : `<span class="dash">—</span>`}</div>`;
}

function renderNine(players, start, label, pars){
  const holes = Array.from({length:9}, (_,i)=>start+i).filter(h=>h<=18);
  const par = holes.reduce((n,h)=>n+num(pars[h] || 4),0);
  const holeHeader = holes.map(h=>`<div class="score-cell head">${h}</div>`).join("");
  const parRow = `<div class="score-cell player-name head">Par</div>${holes.map(h=>`<div class="score-cell par head">${num(pars[h] || 4)}</div>`).join("")}<div class="score-cell tally head">${par}</div><div class="score-cell to-par head">E</div>`;
  const rows = players.map(player => {
    const score = total(player.scores,start,start+8);
    return `<div class="score-grid-row"><div class="score-cell player-name">${esc(player.name)}</div>${holes.map(h=>holeCell(player,h)).join("")}<div class="score-cell tally">${score || "—"}</div><div class="score-cell to-par">${signed(score,par)}</div></div>`;
  }).join("");
  const template = `grid-template-columns:minmax(110px,1.5fr) repeat(${holes.length},minmax(42px,1fr)) minmax(58px,.8fr) minmax(48px,.7fr)`;
  return `<section class="scorecard-nine"><header class="scorecard-nine-title"><strong>${label}</strong><span>Par ${par}</span></header><div class="score-grid" style="${template}"><div class="score-cell head">Player</div>${holeHeader}<div class="score-cell head">Score</div><div class="score-cell head">To Par</div>${parRow}</div>${rows}</section>`;
}

function normalize(root){
  if(!root || root.dataset.singleScorecard === "true") return;
  const card = root.querySelector(".golf-scorecard-page");
  if(!card) return;
  const blocks = [...card.querySelectorAll(":scope > .score-player")];
  if(!blocks.length) return;
  const players = blocks.map(readPlayer);
  const first = players[0];
  const pars = {};
  const firstBlock = blocks[0];
  firstBlock.querySelectorAll(".score-nine").forEach((nine,index)=>{
    const start = index === 0 ? 1 : 10;
    const cells = [...nine.querySelectorAll(".score-hole")];
    cells.forEach((cell,i)=>{ pars[start+i] = num(cell.querySelector("span")?.dataset.par || 4); });
    const headerPar = num(nine.querySelector(".score-nine-head div:nth-child(2) b")?.textContent || 0);
    if(headerPar && index === 0) for(let h=1;h<=9;h++) if(!pars[h]) pars[h]=4;
    if(headerPar && index === 1) for(let h=10;h<=18;h++) if(!pars[h]) pars[h]=4;
  });
  // Existing player scorecards already contain the correct nine par totals.
  // Use four as the safe display default when a hole par isn't exposed.
  for(let h=1;h<=18;h++) if(!pars[h]) pars[h]=4;

  const title = card.querySelector(".scorecard-team-heading")?.innerHTML || "";
  const back = card.querySelector(".scorecard-title .backlink")?.outerHTML || "";
  const totalPar = Object.values(pars).reduce((a,b)=>a+num(b),0);
  const completeScore = players.reduce((n,p)=>n+total(p.scores,1,18),0);
  const completeToPar = completeScore ? signed(completeScore,totalPar) : "—";
  const f9 = renderNine(players,1,"Front 9",pars);
  const b9 = Object.keys(pars).some(h=>Number(h)>9) ? renderNine(players,10,"Back 9",pars) : "";

  card.innerHTML = `<div class="scorecard-title">${back}<div class="scorecard-team-heading">${title}</div></div><div class="scorecard-table-wrap">${f9}${b9}</div><div class="score-summary"><span><small>Complete team score</small><b>${completeScore || "—"}</b></span><span><small>Team par</small><b>${totalPar}</b></span><span><small>Team to par</small><b>${completeToPar}</b></span></div><div class="score-note">One scorecard for the entire team. Each player's scores are recorded on the same card. Team members can edit; everyone else can view. Admin can edit any team.</div>`;
  root.dataset.singleScorecard = "true";
}

function boot(){
  if(document.getElementById("dfl-golf-scorecard-style")) return;
  const style = document.createElement("style");
  style.id = "dfl-golf-scorecard-style";
  style.textContent = SCORECARD_STYLE;
  document.head.appendChild(style);
  const observer = new MutationObserver(() => {
    const root = document.querySelector("#golf-outing");
    if(root) normalize(root);
  });
  observer.observe(document.body,{childList:true,subtree:true});
  const root = document.querySelector("#golf-outing");
  if(root) normalize(root);
}

if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
