// =====================================================================
// Admin -> Broadcast. Three things that belong on one screen.
// ---------------------------------------------------------------------
//   the running order  what plays, in what order, with a live preview
//   the slides         a normal renderManager() over broadcast_items
//   the sources        which automatic generators may contribute
//
// They are together because they answer the same question - "what is on
// the front page" - and separating them would mean an admin turning off
// "Dues" in one place and wondering why their hand-written slide about
// dues, in another place, still shows.
//
// THE PREVIEW USES THE REAL RENDERER. renderItem() is the same function
// the public stage calls, inside an element carrying the same .bx-stage
// class, so what an admin sees is what ships. A second "preview
// renderer" would be a second thing to keep in sync, and it would drift.
//
// SECURITY: this panel is a convenience, not a control. Every write it
// makes is refused by RLS unless is_admin() passes on the request
// itself. Hiding this tab protects nothing and is not relied on.
// =====================================================================
import { esc, toast, errorBox } from "../ui.js";
import { db } from "../supabase.js";
import { renderManager } from "../crud.js";
import { specFor } from "../sections.js";
import { GENERATOR_LABELS, renderItemFromRow, loadBroadcastOverrides } from "../broadcast-deck.js";
import { renderItem } from "../broadcast-stage.js";
import { loadSettings, broadcastOff, setGeneratorOff } from "../settings.js";

export async function renderBroadcastPanel(host) {
  host.innerHTML = `
    <section class="block" data-bx-order>
      <h2 class="section-title">Running order</h2>
      <div data-bx-rows></div>
    </section>
    <div data-bx-manager></div>
    <section class="block" data-bx-sources>
      <h2 class="section-title">Where slides come from</h2>
      <div class="card">
        <div class="card-body">Turn a source off and the front page stops
        building slides from it. Hand-written slides above are unaffected.</div>
        <div class="switchlist" data-bx-switches></div>
      </div>
    </section>`;

  await renderOrder(host.querySelector("[data-bx-rows]"));
  renderManager(host.querySelector("[data-bx-manager]"), specFor("broadcast_items"));
  await renderSources(host.querySelector("[data-bx-switches]"));
}

// ------------------------------------------------------- the running order

async function renderOrder(host) {
  if (!host) return;
  const { data, error } = await db()
    .from("broadcast_items")
    .select("id,headline,kicker,subtitle,body,figure,image,href,treatment,temporal,background,dwell_seconds,sort_order,featured,active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) { host.innerHTML = errorBox(error); return; }
  const rows = data || [];
  if (!rows.length) {
    host.innerHTML = `<div class="state"><span class="state-title">No slides yet</span>
      <span>Add one below and it will appear here in running order.</span></div>`;
    return;
  }

  host.innerHTML = `
    <div class="card">
      <div class="card-body">The order hand-written slides play in. Automatic
      slides are ranked by what is happening and are not listed here.</div>
      <ol class="bxorder">${rows.map(row).join("")}</ol>
    </div>
    <div class="bxpreview-wrap">
      <span class="u-label">Preview</span>
      <div class="bx-stage bxpreview" data-bx-preview></div>
    </div>`;

  preview(host, rows[0]);
  host.addEventListener("click", (e) => onOrderClick(e, host, rows));
}

function row(r, i) {
  const bits = [r.treatment];
  if (r.background && r.background !== "default") bits.push(r.background);
  bits.push(r.dwell_seconds ? `${r.dwell_seconds}s` : "auto");
  if (r.featured) bits.push("featured");
  if (!r.active) bits.push("OFF");
  return `
    <li class="bxrow${r.active ? "" : " is-off"}" data-bx-row="${r.id}">
      <button type="button" class="bxrow-main" data-bx-preview-id="${r.id}">
        <strong>${esc(r.headline || r.kicker || "Untitled slide")}</strong>
        <span class="muted">${esc(bits.join(" · "))}</span>
      </button>
      <span class="bxrow-moves">
        <button type="button" class="btn ghost small" data-bx-move="up" data-id="${r.id}"
          aria-label="Move ${esc(r.headline || "slide")} earlier">↑</button>
        <button type="button" class="btn ghost small" data-bx-move="down" data-id="${r.id}"
          aria-label="Move ${esc(r.headline || "slide")} later">↓</button>
      </span>
    </li>`;
}

function preview(host, r) {
  const box = host.querySelector("[data-bx-preview]");
  if (!box || !r) return;
  /* The same function the public stage uses, on a row shaped the same way
     loadBroadcastItems() shapes it. */
  box.innerHTML = renderItem(renderItemFromRow(r));
  const slide = box.querySelector(".bx-slide");
  slide?.classList.add("bx-in");
  box.classList.toggle("bx-on-light", (r.background || "") === "light");
}

async function onOrderClick(e, host, rows) {
  const show = e.target.closest("[data-bx-preview-id]");
  if (show) {
    const r = rows.find((x) => String(x.id) === show.dataset.bxPreviewId);
    preview(host, r);
    host.querySelectorAll(".bxrow").forEach((li) =>
      li.classList.toggle("on", li.dataset.bxRow === show.dataset.bxPreviewId));
    return;
  }

  const move = e.target.closest("[data-bx-move]");
  if (!move) return;
  const id = move.dataset.id;
  const at = rows.findIndex((x) => String(x.id) === id);
  const to = move.dataset.bxMove === "up" ? at - 1 : at + 1;
  if (at < 0 || to < 0 || to >= rows.length) return;

  /*
    SWAP THE POSITIONS, not the rows.

    Both writes are sent before either is awaited, but they are checked
    together - if one is refused the order on screen would no longer match
    the database, and a reorder that half-worked is worse than one that
    did not. On failure the list is re-read rather than patched.

    The positions written are the two INDEXES, not the two stored values:
    every row created before this migration has sort_order 0, so swapping
    stored values would swap 0 with 0 and appear to do nothing.
  */
  host.querySelectorAll("[data-bx-move]").forEach((b) => (b.disabled = true));
  const a = rows[at], b = rows[to];
  const [ra, rb] = await Promise.all([
    db().from("broadcast_items").update({ sort_order: to }).eq("id", a.id),
    db().from("broadcast_items").update({ sort_order: at }).eq("id", b.id),
  ]);
  if (ra.error || rb.error) {
    toast((ra.error || rb.error).message || "Could not reorder", true);
  }
  await renderOrder(host);
}

// ------------------------------------------------------------ the sources

async function renderSources(list) {
  if (!list) return;
  await loadSettings();
  const off = broadcastOff();
  const overrides = await loadBroadcastOverrides();

  /*
    Each source is a switch plus a collapsed "Look" panel. It is <details>
    rather than a dialog because an admin adjusting several sources wants
    to see them next to each other, and because it costs no JavaScript.

    The fields here are PRESENTATION ONLY - there is deliberately no
    headline or body box. The golf score has to stay the golf score.
  */
  const sel = (name, id, value, options) => `
    <label class="ov-field"><span>${esc(name)}</span>
      <select data-ov="${esc(id)}" data-field="${esc(name.toLowerCase())}">
        ${options.map((o) => `<option value="${esc(o.v)}"${String(value || "") === o.v ? " selected" : ""}>${esc(o.l)}</option>`).join("")}
      </select></label>`;

  list.innerHTML = [...GENERATOR_LABELS].map(([id, [name, what]]) => {
    const ov = overrides.get(id) || {};
    const tweaked = ov.treatment || ov.background || ov.image || ov.dwell_seconds || ov.featured || ov.weight;
    return `
    <div class="srcrow">
      <label class="switchrow">
        <input type="checkbox" data-gen="${esc(id)}" ${off.has(id) ? "" : "checked"}>
        <span class="switch-text">
          <strong>${esc(name)}</strong>
          <span class="muted">${esc(what)}</span>
        </span>
      </label>
      <details class="ovbox"${tweaked ? " open" : ""}>
        <summary>Look${tweaked ? " · customised" : ""}</summary>
        <div class="ovgrid" data-ov-form="${esc(id)}">
          ${sel("Treatment", id, ov.treatment, [
            { v: "", l: "Automatic (whatever suits the data)" },
            { v: "scoreboard", l: "Scoreboard (needs two sides)" },
            { v: "champion", l: "Champion" }, { v: "stat", l: "Stat" },
            { v: "announcement", l: "Announcement" }, { v: "event", l: "Event" },
            { v: "hero", l: "Hero" },
          ])}
          ${sel("Background", id, ov.background, [
            { v: "", l: "Automatic (house look)" },
            { v: "default", l: "DFL house" }, { v: "dark", l: "Dark" },
            { v: "light", l: "Light" }, { v: "image", l: "Image" }, { v: "logo", l: "Crest" },
          ])}
          <label class="ov-field"><span>Image URL</span>
            <input type="text" data-ov="${esc(id)}" data-field="image" value="${esc(ov.image || "")}" placeholder="https://…"></label>
          <label class="ov-field"><span>Seconds</span>
            <input type="number" min="3" max="15" data-ov="${esc(id)}" data-field="dwell_seconds" value="${esc(ov.dwell_seconds ?? "")}" placeholder="auto"></label>
          <label class="ov-field ov-check">
            <input type="checkbox" data-ov="${esc(id)}" data-field="featured" ${ov.featured ? "checked" : ""}>
            <span>Feature it</span></label>
          <div class="row-end">
            <button type="button" class="btn ghost small" data-ov-save="${esc(id)}">Save look</button>
            <button type="button" class="btn ghost small" data-ov-clear="${esc(id)}">Reset</button>
          </div>
        </div>
      </details>
    </div>`;
  }).join("");

  /*
    BIND ONCE. renderSources() re-renders itself after every save, so
    attaching listeners at the end of it would stack a new pair on the
    same element each time - two saves after the second edit, three after
    the third. The markup inside is replaced wholesale; the element is
    not, so one delegated listener on it survives every re-render.
  */
  if (list.dataset.wired === "1") return;
  list.dataset.wired = "1";

  list.addEventListener("click", async (e) => {
    const save = e.target.closest("[data-ov-save]");
    const clear = e.target.closest("[data-ov-clear]");
    if (!save && !clear) return;
    const id = (save || clear).dataset.ovSave || (save || clear).dataset.ovClear;
    const box = list.querySelector(`[data-ov-form="${CSS.escape(id)}"]`);
    try {
      if (clear) {
        const { error } = await db().from("broadcast_overrides").delete().eq("generator", id);
        if (error) throw error;
        toast("Back to automatic");
      } else {
        const val = (f) => box.querySelector(`[data-field="${f}"]`);
        const num = Number(val("dwell_seconds").value);
        const row = {
          generator: id,
          treatment: val("treatment").value || null,
          background: val("background").value || null,
          image: val("image").value.trim() || null,
          dwell_seconds: Number.isFinite(num) && num > 0 ? Math.min(15, Math.max(3, Math.round(num))) : null,
          featured: val("featured").checked,
          updated_at: new Date().toISOString(),
        };
        const { error } = await db().from("broadcast_overrides").upsert(row, { onConflict: "generator" });
        if (error) throw error;
        toast("Look saved");
      }
      await renderSources(list);
    } catch (err) {
      toast(err.message || "Could not save that look", true);
    }
  });

  list.addEventListener("change", async (e) => {
    const box = e.target.closest("[data-gen]");
    if (!box) return;
    const id = box.dataset.gen;
    box.disabled = true;
    try {
      // checked means ON, and the setting stores what is OFF.
      await setGeneratorOff(id, !box.checked);
      toast(`${GENERATOR_LABELS.get(id)?.[0] || id} ${box.checked ? "on" : "off"}`);
    } catch (err) {
      box.checked = !box.checked;              // put the switch back
      toast(err.message || "Could not save that", true);
    }
    box.disabled = false;
  });
}
