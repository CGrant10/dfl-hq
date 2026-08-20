import { db } from "./supabase.js";
import { currentMember } from "./members.js";
import { esc, toast } from "./ui.js";
import { shrinkToDataUri } from "./image-field.js";

function ensureStyles() {
  if (document.getElementById("dfl-wall-style")) return;
  const style = document.createElement("style");
  style.id = "dfl-wall-style";
  style.textContent = `
.wall .card-body{display:grid;gap:14px}
.wall textarea{width:100%;resize:vertical;min-height:66px}
.wall-preview,.wall-photo{display:block;width:100%;height:auto;border-radius:12px;object-fit:cover}
.wall-preview{margin-top:10px;max-height:340px}
.wall-posts{display:grid;gap:0}
.wall-post{padding:14px 0;border-top:1px solid var(--line,rgba(255,255,255,.1))}
.wall-post:first-child{border-top:0}
.wall-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:7px}
.wall-author{display:flex;align-items:center;gap:8px;min-width:0}
.wall-avatar{width:30px;height:30px;border-radius:50%;object-fit:cover;flex:0 0 auto}
.wall-post p{margin:0 0 10px;white-space:pre-wrap;overflow-wrap:anywhere}
.wall-post .linkbtn{margin-top:8px}
@media(min-width:760px){.wall-photo{max-height:520px}}
`;
  document.head.appendChild(style);
}

export async function loadWall(limit = 12) {
  const { data, error } = await db()
    .from("member_wall_posts")
    .select("id,member_id,body,image,created_at,members(display_name,profile_image)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (/member_wall_posts|schema cache|does not exist/i.test(error.message || "")) return null;
    throw error;
  }
  return data || [];
}

export function wallCard(rows) {
  if (rows == null) return "";
  ensureStyles();
  const me = currentMember();
  return `<section class="block wall">
    <h2 class="section-title">The Wall</h2>
    <div class="card"><div class="card-body">
      ${me ? `<form data-wall-form>
        <textarea name="body" maxlength="500" rows="2" placeholder="Talk your shit…"></textarea>
        <div class="row-between">
          <label class="btn ghost small"><input data-wall-image type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden>📷 Picture</label>
          <span class="muted tiny" data-wall-file></span>
          <button class="btn small" type="submit">Post</button>
        </div>
        <img data-wall-preview class="wall-preview hidden" alt="">
      </form>` : ""}
      <div class="wall-posts">${rows.length ? rows.map(postHtml).join("") : `<span class="muted">Nothing yet. Be the first idiot.</span>`}</div>
    </div></div>
  </section>`;
}

function postHtml(r) {
  const m = r.members || {};
  const avatar = m.profile_image
    ? `<img class="wall-avatar" src="${esc(m.profile_image)}" alt="">`
    : "";
  return `<article class="wall-post">
    <div class="wall-head">
      <span class="wall-author">${avatar}<strong>${esc(m.display_name || "Member")}</strong></span>
      <span class="muted tiny">${esc(new Date(r.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}</span>
    </div>
    ${r.body ? `<p>${esc(r.body)}</p>` : ""}
    ${r.image ? `<img class="wall-photo" src="${esc(r.image)}" alt="Posted by ${esc(m.display_name || "member")}">` : ""}
    ${r.image ? `<button class="linkbtn" type="button" data-submit-broadcast="${r.id}">📺 Submit to Broadcast</button>` : ""}
  </article>`;
}

export function wireWall(root, onChanged) {
  let image = "";
  const form = root.querySelector("[data-wall-form]");
  root.querySelector("[data-wall-image]")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const note = root.querySelector("[data-wall-file]");
    try {
      note.textContent = "Shrinking…";
      image = await shrinkToDataUri(f, "backdrop");
      note.textContent = "Ready";
      const preview = root.querySelector("[data-wall-preview]");
      preview.src = image;
      preview.classList.remove("hidden");
    } catch (err) {
      note.textContent = err.message || "Could not read picture";
    }
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const me = currentMember();
    if (!me) return;
    const body = String(new FormData(form).get("body") || "").trim();
    if (!body && !image) return toast("Write something or add a picture", true);
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    const { error } = await db().from("member_wall_posts").insert({ member_id: me.id, body, image: image || null });
    if (error) {
      btn.disabled = false;
      return toast(error.message, true);
    }
    toast("Posted");
    onChanged?.();
  });

  root.querySelectorAll("[data-submit-broadcast]").forEach((btn) => btn.addEventListener("click", async () => {
    const me = currentMember();
    if (!me) return;
    btn.disabled = true;
    const id = Number(btn.dataset.submitBroadcast);
    const { data, error } = await db().from("member_wall_posts").select("image,body").eq("id", id).single();
    if (error || !data?.image) {
      btn.disabled = false;
      return toast("Could not load that picture", true);
    }
    const { error: submitError } = await db().from("broadcast_submissions").insert({
      member_id: me.id,
      image: data.image,
      caption: String(data.body || "").slice(0, 180),
    });
    if (submitError) {
      btn.disabled = false;
      return toast(submitError.message, true);
    }
    btn.textContent = "Submitted ✓";
    toast("Sent to Broadcast Inbox");
  }));
}
