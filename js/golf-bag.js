/* =====================================================================
   My bag - how far you hit each club.
   ---------------------------------------------------------------------
   Deliberately small. It is a notepad with two columns: the club, and the
   yards. No averages, no shot tracking, no charts - if that is ever wanted
   it can be added on top of the same table.

   Private by design: golf_bag has no public-read policy, so this only ever
   shows the bag of whoever is selected on this device. See
   golf_bag_schema.sql.

   Boots off the .golf-bag-page placeholder on the Golf list page, the same
   way the scorecard and the draft board do.
   ===================================================================== */
import { db, isAdmin } from "./supabase.js";
import { currentMember } from "./members.js";
import { esc, toast } from "./ui.js";

/* A full bag, in the order it sits in the trunk. Offered as a starter so the
   first visit is typing numbers rather than typing thirteen club names. */
const STARTER = ["Driver", "3 wood", "5 wood", "4 hybrid", "5 iron", "6 iron",
                 "7 iron", "8 iron", "9 iron", "Pitching wedge", "Gap wedge",
                 "Sand wedge", "Lob wedge"];

const SAVE_DELAY = 600;
const timers = new Map();
let host = null;

async function load(memberId) {
  const { data, error } = await db().from("golf_bag")
    .select("*").eq("member_id", memberId).order("sort_order").order("id");
  if (error) throw error;
  return data || [];
}

function view(rows, me) {
  if (!rows.length) {
    return `
      <section class="card bag-card">
        <div class="card-title">My bag</div>
        <p class="muted tiny">How far you hit each club. Only you can see this.</p>
        <div class="arena-admin">
          <button class="btn small" id="bag-starter">Start with a full bag</button>
          <button class="btn ghost small" id="bag-add">Add one club</button>
        </div>
      </section>`;
  }

  /* Longest first is how a bag is actually read - "what have I got for 150?"
     - and clubs with no number yet sink to the bottom rather than sitting in
     the middle of the ladder. */
  const sorted = [...rows].sort((a, b) => (b.yards ?? -1) - (a.yards ?? -1));

  return `
    <section class="card bag-card">
      <div class="card-title-row">
        <div>
          <div class="card-title">My bag</div>
          <p class="muted tiny">${esc(me.display_name)} · only you can see this</p>
        </div>
        <span class="bag-count">${rows.length}</span>
      </div>

      <div class="bag-list">
        ${sorted.map((r) => `
          <div class="bag-row" data-row="${r.id}">
            <input class="bag-club" type="text" value="${esc(r.club)}" maxlength="40"
                   data-field="club" aria-label="Club name">
            <span class="bag-yards">
              <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3"
                     value="${r.yards ?? ""}" placeholder="—" data-field="yards"
                     aria-label="Yards for ${esc(r.club)}">
              <small>yds</small>
            </span>
            <button class="btn ghost small bag-del" data-del="${r.id}" aria-label="Remove ${esc(r.club)}">&times;</button>
          </div>`).join("")}
      </div>

      <div class="arena-admin">
        <button class="btn ghost small" id="bag-add">Add a club</button>
      </div>
    </section>`;
}

async function draw() {
  const me = currentMember();
  if (!host) return;
  if (!me) { host.innerHTML = ""; return; }

  let rows;
  try {
    rows = await load(me.id);
  } catch (err) {
    /* Before the migration is run this table does not exist. Only the person
       who can actually run it is told; everybody else gets an empty space
       rather than homework they cannot do. */
    host.innerHTML = isAdmin()
      ? `<section class="card"><div class="card-body muted tiny">
          My bag needs one migration: run <strong>golf_bag_schema.sql</strong> in Supabase.
          <br>${esc(err.message || String(err))}</div></section>`
      : "";
    return;
  }
  if (!host) return;
  host.innerHTML = view(rows, me);
}

/* Typed edits save themselves, one timer per row+field, so holding a number
   key does not fire a write per digit. */
function queue(id, field, getValue) {
  const key = `${id}:${field}`;
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(async () => {
    timers.delete(key);
    const raw = getValue();
    const patch = field === "yards"
      ? { yards: raw === "" ? null : Math.max(1, Math.min(999, Number(raw))) }
      : { club: raw.trim() || "Club" };
    try {
      const { error } = await db().from("golf_bag")
        .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    } catch (err) {
      toast(err.message || "Could not save that", true);
      draw();
    }
  }, SAVE_DELAY));
}

function wire() {
  host.addEventListener("input", (e) => {
    const input = e.target.closest("[data-field]");
    if (!input) return;
    if (input.dataset.field === "yards") {
      const clean = input.value.replace(/\D/g, "").slice(0, 3);
      if (clean !== input.value) input.value = clean;
    }
    const id = input.closest("[data-row]")?.dataset.row;
    if (id) queue(id, input.dataset.field, () => input.value);
  });

  host.addEventListener("click", async (e) => {
    const del = e.target.closest("[data-del]");
    const add = e.target.closest("#bag-add");
    const starter = e.target.closest("#bag-starter");
    const me = currentMember();
    if (!me) return;

    if (del) {
      const row = del.closest("[data-row]");
      const name = row?.querySelector(".bag-club")?.value || "that club";
      if (!confirm(`Remove ${name} from your bag?`)) return;
      try {
        const { error } = await db().from("golf_bag").delete().eq("id", del.dataset.del);
        if (error) throw error;
        draw();
      } catch (err) { toast(err.message || "Could not remove that club", true); }
      return;
    }

    if (add || starter) {
      const clubs = starter ? STARTER : ["New club"];
      e.target.disabled = true;
      try {
        const rows = clubs.map((club, i) => ({ member_id: me.id, club, sort_order: i }));
        const { error } = await db().from("golf_bag").insert(rows);
        if (error) throw error;
        draw();
      } catch (err) {
        toast(err.message || "Could not add that", true);
        e.target.disabled = false;
      }
    }
  });
}

function boot() {
  const find = () => {
    const el = document.querySelector("#golf-wrap .golf-bag-page");
    if (!el || el === host) return;
    host = el;
    wire();
    draw();
  };
  new MutationObserver(find).observe(document.body, { childList: true, subtree: true });
  find();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
