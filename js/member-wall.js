// =====================================================================
// member-wall.js - The Wall. Members post, everybody reads.
// =====================================================================

import { db, isAdmin } from "./supabase.js";
import { currentMember } from "./members.js";
import { esc, toast } from "./ui.js";
import { shrinkToDataUri } from "./image-field.js";
import { icon } from "./icons.js";
import { identityByline, accentOf } from "./profile-identity.js";

const TABLE_GONE = /member_wall_posts|could not find the table/i;
const COLUMN_GONE = /profile_title|favorite_team|featured_achievement|accent_color/i;
const SELECTS = [
  "id,member_id,body,image,created_at,members(display_name,profile_image,profile_title,favorite_team,featured_achievement,accent_color)",
  "id,member_id,body,image,created_at,members(display_name,profile_image,profile_title,favorite_team,featured_achievement)",
  "id,member_id,body,image,created_at,members(display_name,profile_image)",
];

export async function loadWall(limit = 12) {
  const read = (columns) => db().from("member_wall_posts").select(columns)
    .order("created_at", { ascending: false }).limit(limit);
  let last = null;
  for (const columns of SELECTS) {
    const { data, error } = await read(columns);
    if (!error) return data || [];
    last = error;
    if (!COLUMN_GONE.test(error.message || "")) break;
  }
  if (TABLE_GONE.test(last?.message || "")) return null;
  throw last;
}

export function wallCard(rows) {
  if (rows == null) return "";
  const me = currentMember();
  return `<section class="block wall">
    <h2 class="section-title">The Wall</h2>
    <div class="card wall-card">
      ${me ? composer() : `<p class="muted tiny wall-signin">Pick your name in the top bar to post.</p>`}
      <div class="wall-posts">${rows.length ? rows.map(postHtml).join("") : `<p class="wall-empty muted">Nothing yet. Be the first idiot.</p>`}</div>
    </div>
  </section>`;
}

function composer() {
  return `<form class="wall-form" data-wall-form>
    <textarea name="body" maxlength="500" rows="2" placeholder="Talk your shit…" data-wall-body></textarea>
    <img data-wall-preview class="wall-preview hidden" alt="">
    <div class="wall-actions">
      <label class="btn ghost small wall-pick">
        <input data-wall-image type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden>
        ${icon("camera", { size: 15 })}<span>Picture</span>
      </label>
      <span class="muted tiny wall-note" data-wall-file></span>
      <button class="btn small wall-send" type="submit">Post</button>
    </div>
  </form>`;
}

function stamp(iso, now = Date.now()) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const secs = Math.max(0, Math.round((now - at.getTime()) / 1000));
  if (secs < 60) return "now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days <= 7) return `${days}d`;
  const sameYear = at.getFullYear() === new Date(now).getFullYear();
  return at.toLocaleDateString([], sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}
function stampFull(iso) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";

function postHtml(r) {
  const m = r.members || {};
  const me = currentMember();
  const own = !!me && String(me.id) === String(r.member_id);
  const canDelete = own || isAdmin();
  const name = m.display_name || "Member";
  const avatar = m.profile_image
    ? `<img class="wall-avatar" src="${esc(m.profile_image)}" alt="" loading="lazy" decoding="async">`
    : `<span class="wall-avatar wall-avatar-fallback" aria-hidden="true">${esc(initials(name))}</span>`;
  const byline = identityByline(m);
  const controls = own || canDelete ? `<div class="wall-manage row-end">
    ${own ? `<button class="btn ghost small" type="button" data-wall-edit="${esc(r.id)}">Edit</button>` : ""}
    ${canDelete ? `<button class="btn ghost small danger" type="button" data-wall-delete="${esc(r.id)}">Delete</button>` : ""}
  </div>` : "";
  const editForm = own ? `<form class="wall-edit hidden" data-wall-edit-form="${esc(r.id)}" data-has-image="${r.image ? "1" : "0"}">
    <textarea maxlength="500" rows="3" data-wall-edit-body>${esc(r.body || "")}</textarea>
    <div class="row-end">
      <button class="btn ghost small" type="button" data-wall-edit-cancel="${esc(r.id)}">Cancel</button>
      <button class="btn small" type="submit">Save</button>
    </div>
  </form>` : "";

  return `<article class="wall-post" data-wall-post="${esc(r.id)}" data-wall-owner="${esc(r.member_id)}" style="--ident:${esc(accentOf(m))}">
    <div class="wall-head${byline ? " has-byline" : ""}">
      ${avatar}
      <a class="wall-name plainlink" href="#/profile?id=${esc(r.member_id)}">${esc(name)}</a>
      <time class="wall-when muted tiny" datetime="${esc(r.created_at)}" title="${esc(stampFull(r.created_at))}">${esc(stamp(r.created_at))}</time>
      ${byline}
    </div>
    ${r.body ? `<p class="wall-body" data-wall-body-display>${esc(r.body)}</p>` : `<p class="wall-body hidden" data-wall-body-display></p>`}
    ${editForm}
    ${r.image ? `<img class="wall-photo" src="${esc(r.image)}" alt="Posted by ${esc(name)}" loading="lazy" decoding="async">` : ""}
    <div class="wall-post-actions">
      ${r.image ? `<button class="wall-submit btn ghost small" type="button" data-submit-broadcast="${esc(r.id)}">${icon("tv", { size: 14 })}<span>Submit to Broadcast</span></button>` : ""}
      ${controls}
    </div>
  </article>`;
}

async function mutatePost(id, action) {
  const q = action(db().from("member_wall_posts")).eq("id", id).select("id");
  const { data, error } = await q;
  if (error) throw error;
  if (!data?.length) throw new Error("That Wall change was refused.");
}

export function wireWall(root, onChanged) {
  let image = "";
  const form = root.querySelector("[data-wall-form]");

  root.querySelector("[data-wall-image]")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const note = root.querySelector("[data-wall-file]");
    const preview = root.querySelector("[data-wall-preview]");
    try {
      if (note) note.textContent = "Shrinking…";
      image = await shrinkToDataUri(file, "backdrop");
      if (note) note.textContent = "Picture ready";
      if (preview) { preview.src = image; preview.classList.remove("hidden"); }
    } catch (err) {
      image = "";
      if (note) note.textContent = err?.message || "Could not read that picture";
      if (preview) { preview.removeAttribute("src"); preview.classList.add("hidden"); }
    }
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const me = currentMember();
    if (!me) return;
    const body = String(new FormData(form).get("body") || "").trim();
    if (!body && !image) { toast("Write something or add a picture", true); return; }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Posting…";
    const { error } = await db().from("member_wall_posts").insert({ member_id: me.id, body, image: image || null });
    if (error) { btn.disabled = false; btn.textContent = "Post"; toast(error.message, true); return; }
    toast("Posted");
    onChanged?.();
  });

  root.addEventListener("click", async (e) => {
    const edit = e.target.closest("[data-wall-edit]");
    if (edit) {
      const id = edit.dataset.wallEdit;
      const post = root.querySelector(`[data-wall-post="${CSS.escape(id)}"]`);
      post?.querySelector("[data-wall-body-display]")?.classList.add("hidden");
      post?.querySelector(`[data-wall-edit-form="${CSS.escape(id)}"]`)?.classList.remove("hidden");
      return;
    }
    const cancel = e.target.closest("[data-wall-edit-cancel]");
    if (cancel) {
      const id = cancel.dataset.wallEditCancel;
      const post = root.querySelector(`[data-wall-post="${CSS.escape(id)}"]`);
      post?.querySelector("[data-wall-body-display]")?.classList.remove("hidden");
      post?.querySelector(`[data-wall-edit-form="${CSS.escape(id)}"]`)?.classList.add("hidden");
      return;
    }
    const del = e.target.closest("[data-wall-delete]");
    if (del) {
      if (!confirm("Delete this Wall post?")) return;
      del.disabled = true;
      try {
        await mutatePost(Number(del.dataset.wallDelete), (q) => q.delete());
        toast("Post deleted");
        onChanged?.();
      } catch (err) { del.disabled = false; toast(err.message || "Could not delete post", true); }
      return;
    }
  });

  root.addEventListener("submit", async (e) => {
    const editForm = e.target.closest("[data-wall-edit-form]");
    if (!editForm) return;
    e.preventDefault();
    const id = Number(editForm.dataset.wallEditForm);
    const body = String(editForm.querySelector("[data-wall-edit-body]")?.value || "").trim();
    if (!body && editForm.dataset.hasImage !== "1") { toast("A text-only post cannot be empty", true); return; }
    const btn = editForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await mutatePost(id, (q) => q.update({ body }));
      toast("Post updated");
      onChanged?.();
    } catch (err) { btn.disabled = false; toast(err.message || "Could not update post", true); }
  });

  root.querySelectorAll("[data-submit-broadcast]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const me = currentMember();
      if (!me) return;
      btn.disabled = true;
      const id = Number(btn.dataset.submitBroadcast);
      const { data, error } = await db().from("member_wall_posts").select("image,body").eq("id", id).single();
      if (error || !data?.image) { btn.disabled = false; toast("Could not load that picture", true); return; }
      const { error: submitError } = await db().from("broadcast_submissions").insert({ member_id: me.id, image: data.image, caption: String(data.body || "").slice(0, 180) });
      if (submitError) { btn.disabled = false; toast(submitError.message, true); return; }
      btn.classList.add("is-sent");
      btn.innerHTML = `${icon("check", { size: 14 })}<span>Submitted</span>`;
      toast("Sent to the Broadcast inbox");
    });
  });
}
