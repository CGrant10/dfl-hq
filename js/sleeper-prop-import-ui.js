import { db } from "./supabase.js";
import { loadNflState, loadPlayers } from "./sleeper.js";
import { toast } from "./ui.js";
import { parseSleeperProps, PROP_STATS, resolveImportedProps } from "./sleeper-prop-import.js";

export function sleeperPropImporterMarkup() {
  return `<details class="sb-prop-import">
    <summary><span><small>COMMISSIONER TOOL</small><strong>Import Sleeper props</strong></span><em>Paste or screenshot</em></summary>
    <div class="sb-prop-import-body">
      <p>Paste the board in one shot, or upload screenshots. Nothing is scraped from Sleeper.</p>
      <textarea data-prop-source rows="7" placeholder="Josh Allen | Passing yards | 264.5&#10;Breece Hall | Rushing yards | 71.5"></textarea>
      <div class="sb-import-actions">
        <label class="btn ghost small sb-image-pick">Read screenshot<input type="file" accept="image/*" multiple data-prop-images></label>
        <button type="button" class="btn small" data-prop-read>Review board</button>
      </div>
      <p class="muted tiny" data-prop-status aria-live="polite">Each prop is matched to a Sleeper player and that player's kickoff before it can go live.</p>
      <div data-prop-review></div>
    </div>
  </details>`;
}

const statOptions = selected => PROP_STATS.map(stat => `<option value="${stat.key}" ${stat.key === selected ? "selected" : ""}>${stat.label}</option>`).join("");
const localTime = value => value ? new Date(value).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) : "No kickoff found";

export function wireSleeperPropImporter(view, board, esc, redraw) {
  const root = view.querySelector(".sb-prop-import");
  if (!root) return;
  const source = root.querySelector("[data-prop-source]");
  const review = root.querySelector("[data-prop-review]");
  const status = root.querySelector("[data-prop-status]");
  const readButton = root.querySelector("[data-prop-read]");
  let playerMap = null;
  let scope = { season: Number(board?.season), week: Number(board?.week) };
  const games = board?.games || [];

  const ensureData = async () => {
    if (!playerMap) playerMap = await loadPlayers();
    if (!scope.season || !scope.week) {
      const state = await loadNflState();
      scope = { season: Number(state?.data?.season), week: Number(state?.data?.week) };
    }
  };

  const paint = rows => {
    review.innerHTML = rows.length ? `<div class="sb-prop-review-head"><strong>${rows.length} prop${rows.length === 1 ? "" : "s"} found</strong><span>Week ${scope.week}</span></div>
      <div class="sb-prop-review-list">${rows.map((row, index) => `<div class="sb-prop-review-row" data-prop-row>
        <input aria-label="Player name" data-prop-name value="${esc(row.playerName)}">
        <select aria-label="Stat category" data-prop-stat>${statOptions(row.statKey)}</select>
        <label><span>Line</span><input aria-label="Line" data-prop-line type="number" min="0" step="0.5" value="${esc(row.line)}"></label>
        <input type="hidden" data-prop-player-id value="${esc(row.playerId)}">
        <input type="hidden" data-prop-close value="${esc(row.closesAt)}">
        <span class="sb-prop-match ${row.playerId && row.closesAt ? "is-matched" : "is-missing"}">${row.playerId ? `${esc([row.position, row.team].filter(Boolean).join(" · "))} · ${esc(localTime(row.closesAt))}` : "Player name needs a correction"}</span>
        <button type="button" class="linkbtn" data-prop-remove aria-label="Remove ${esc(row.playerName)}">Remove</button>
      </div>`).join("")}</div>
      <button type="button" class="btn wide sb-import-board" data-prop-import>Open ${rows.length} line${rows.length === 1 ? "" : "s"}</button>` : "";
    review.querySelectorAll("[data-prop-remove]").forEach(button => button.addEventListener("click", () => {
      button.closest("[data-prop-row]")?.remove();
      const count = review.querySelectorAll("[data-prop-row]").length;
      review.querySelector(".sb-prop-review-head strong").textContent = `${count} prop${count === 1 ? "" : "s"} found`;
      review.querySelector("[data-prop-import]").textContent = `Open ${count} line${count === 1 ? "" : "s"}`;
    }));
    review.querySelectorAll("[data-prop-name]").forEach(input => input.addEventListener("change", async () => {
      const row = input.closest("[data-prop-row]");
      const [resolved] = resolveImportedProps([{ playerName: input.value }], playerMap, games);
      row.querySelector("[data-prop-player-id]").value = resolved.playerId;
      row.querySelector("[data-prop-close]").value = resolved.closesAt;
      const match = row.querySelector(".sb-prop-match");
      match.className = `sb-prop-match ${resolved.playerId && resolved.closesAt ? "is-matched" : "is-missing"}`;
      match.textContent = resolved.playerId ? `${[resolved.position, resolved.team].filter(Boolean).join(" · ")} · ${localTime(resolved.closesAt)}` : "Player name needs a correction";
      if (resolved.playerId) input.value = resolved.playerName;
    }));
    review.querySelector("[data-prop-import]")?.addEventListener("click", importRows);
  };

  const parse = async () => {
    readButton.disabled = true;
    status.textContent = "Matching the board to Sleeper players and kickoff times…";
    try {
      await ensureData();
      const parsed = parseSleeperProps(source.value);
      if (!parsed.length) throw new Error("No props found. Use Player | Category | Line, one per line.");
      const rows = resolveImportedProps(parsed, playerMap, games);
      paint(rows);
      const missing = rows.filter(row => !row.playerId || !row.closesAt).length;
      status.textContent = missing ? `${missing} row${missing === 1 ? " needs" : "s need"} a player correction or a synced NFL slate.` : "Board matched. Review every line before opening it.";
    } catch (error) {
      status.textContent = error.message || "Could not read that board.";
    } finally { readButton.disabled = false; }
  };

  const importRows = async event => {
    const button = event.currentTarget;
    const rows = [...review.querySelectorAll("[data-prop-row]")].map(row => {
      const statKey = row.querySelector("[data-prop-stat]").value;
      return { playerId: row.querySelector("[data-prop-player-id]").value, playerName: row.querySelector("[data-prop-name]").value.trim(),
        statKey, statLabel: PROP_STATS.find(stat => stat.key === statKey)?.label || statKey,
        line: Number(row.querySelector("[data-prop-line]").value), closesAt: row.querySelector("[data-prop-close]").value };
    });
    if (!rows.length) { toast("There are no props to import", true); return; }
    if (rows.some(row => !row.playerId || !row.closesAt || !Number.isFinite(row.line))) { toast("Fix every unmatched player before opening the board", true); return; }
    button.disabled = true; status.textContent = "Opening the Sleeper board…";
    try {
      const { data, error } = await db().rpc("sportsbook_import_sleeper_props", { prop_rows: rows, target_season: scope.season, target_week: scope.week });
      if (error) throw error;
      toast(`${Number(data?.imported || rows.length)} Sleeper props opened`);
      await redraw();
    } catch (error) {
      status.textContent = /does not exist|schema cache/i.test(error.message || "") ? "Run sportsbook_sleeper_import_schema.sql in Supabase first." : (error.message || "Import failed.");
      button.disabled = false;
    }
  };

  readButton.addEventListener("click", parse);
  root.querySelector("[data-prop-images]")?.addEventListener("change", async event => {
    const files = [...(event.currentTarget.files || [])];
    if (!files.length) return;
    event.currentTarget.disabled = true;
    status.textContent = "Loading on-device screenshot reader…";
    let worker;
    try {
      /* Pinned and loaded only after a commissioner selects an image. Keeping
         OCR out of the app shell means regular sportsbook visits never pay
         its download or memory cost. */
      const { createWorker } = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.esm.min.js");
      worker = await createWorker("eng", 1, { logger: progress => {
        if (progress.status === "recognizing text") status.textContent = `Reading screenshot… ${Math.round((progress.progress || 0) * 100)}%`;
      }});
      const texts = [];
      for (let index = 0; index < files.length; index++) {
        status.textContent = `Reading screenshot ${index + 1} of ${files.length}…`;
        const result = await worker.recognize(files[index]);
        texts.push(result.data?.text || "");
      }
      source.value = [source.value, ...texts].filter(Boolean).join("\n");
      await parse();
    } catch (error) {
      status.textContent = error.message || "That screenshot could not be read. Paste the board text instead.";
    } finally {
      await worker?.terminate().catch(() => {});
      event.currentTarget.disabled = false;
    }
  });
}
