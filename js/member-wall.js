// =====================================================================
// member-wall.js - The Wall. Members post, everybody reads.
// ---------------------------------------------------------------------
// THE BYLINE IS THE IDENTITY SURFACE. A member's title and club sit on a
// second line under their name, tinted with the accent colour they chose
// on their profile. That is the answer to "where would this even show" -
// identity is attached to what somebody says, not parked on a page.
//
// The accent is scoped to the post: it is set as --ident on the <article>
// and only read by that post's own byline and left edge, so twelve
// members with twelve colours produce a readable list rather than a
// paint chart.
//
// THE STYLES LIVE IN css/home.css. They used to be a template string
// injected into <head> on first render, which meant the Wall's layout
// could not be themed, overridden or seen by anybody reading the
// stylesheets - and it re-ran the same insert on every route change.
//
// DEGRADES WITHOUT ITS MIGRATIONS. loadWall() returns null when
// member_wall_posts is absent and the section is simply not drawn. The
// identity columns are newer still, so the select asks for them and
// retries without them if the database has not caught up.
// =====================================================================

import { db } from "./supabase.js";
import { currentMember } from "./members.js";
import { esc, toast } from "./ui.js";
import { shrinkToDataUri } from "./image-field.js";
import { icon } from "./icons.js";
import { identityByline, accentOf } from "./profile-identity.js";

/*
  TWO DIFFERENT FAILURES THAT BOTH SAY "does not exist".

    relation "public.member_wall_posts" does not exist   -> no table
    column members.accent_color does not exist           -> no column

  So the table check has to name the table rather than match the phrase.
  Testing the phrase alone treated a missing accent colour as a missing
  Wall and hid the whole section on a database that was one migration
  behind - which is every database in the minute after a release.
*/
const TABLE_GONE = /member_wall_posts|could not find the table/i;
const COLUMN_GONE = /profile_title|favorite_team|featured_achievement|accent_color/i;

/*
  THREE SHAPES OF THE SAME READ, TRIED WIDEST FIRST.

  The identity columns arrived in two separate migrations, so a league can
  legitimately be at any of three points: everything, the identity columns
  without the accent colour, or neither.

  featured_achievement WAS MISSING FROM ALL THREE. identityByline() started
  rendering it and this query never asked for it, so every wall post lost
  its achievement silently - the field was simply undefined and the byline
  dropped it without complaint. Falling straight from "everything" to
  "neither" would silently drop every byline on a database that is only one
  migration behind - which is the common case right after a release. Each
  step down loses exactly the columns that are actually missing.
*/
const SELECTS = [
  "id,member_id,body,image,created_at,members(display_name,profile_image,profile_title,favorite_team,featured_achievement,accent_color)",
  "id,member_id,body,image,created_at,members(display_name,profile_image,profile_title,favorite_team,featured_achievement)",
  "id,member_id,body,image,created_at,members(display_name,profile_image)",
];

export async function loadWall(limit = 12) {
  const read = (columns) => db()
    .from("member_wall_posts")
    .select(columns)
    .order("created_at", { ascending: false })
    .limit(limit);

  let last = null;
  for (const columns of SELECTS) {
    const { data, error } = await read(columns);
    if (!error) return data || [];
    last = error;
    /* A missing identity column is the ONLY thing worth retrying narrower,
       and it is checked first because its message shares the "does not
       exist" wording with a missing table. Anything else - no table, a
       policy refusal, a network fault - stops the loop here. */
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
      <div class="wall-posts">${
        rows.length
          ? rows.map(postHtml).join("")
          : `<p class="wall-empty muted">Nothing yet. Be the first idiot.</p>`
      }</div>
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

/*
  A COMPACT STAMP, because the long one was taking a quarter of a phone.

  "Aug 20, 11:57 AM" measured 94px of a 375px screen - metadata winning
  more room than the author's title. A post's age is what a reader actually
  wants ("4h", "2d"), and it is a third of the width. The exact time is
  still on the element: datetime for machines, title for a hover or a long
  press, so nothing is lost, only shortened.

  Beyond a week the relative form stops meaning anything, so it becomes a
  date - and a date in another year says which year.
*/
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
  return at.toLocaleDateString([], sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
}

/** The full date and time, for the title attribute. */
function stampFull(iso) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const initials = (name) =>
  String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";

function postHtml(r) {
  const m = r.members || {};
  const name = m.display_name || "Member";
  const avatar = m.profile_image
    ? `<img class="wall-avatar" src="${esc(m.profile_image)}" alt="" loading="lazy" decoding="async">`
    : `<span class="wall-avatar wall-avatar-fallback" aria-hidden="true">${esc(initials(name))}</span>`;
  const byline = identityByline(m);

  /*
    THE BYLINE IS ITS OWN ROW, not a second line inside the name column.

    On a 375px phone that column is 161px once the avatar and the timestamp
    have taken theirs, and a title, a club and an achievement need about
    213 - so every one of them truncated at once and the byline read
    "DFL Ch… CHI 4 playo…". Given a row of its own it spans the name and
    timestamp columns together, which is enough for all three, and it is
    allowed to wrap if it still is not.
  */
  return `<article class="wall-post" style="--ident:${esc(accentOf(m))}">
    <div class="wall-head${byline ? " has-byline" : ""}">
      ${avatar}
      <a class="wall-name plainlink" href="#/profile?id=${esc(r.member_id)}">${esc(name)}</a>
      <time class="wall-when muted tiny" datetime="${esc(r.created_at)}"
        title="${esc(stampFull(r.created_at))}">${esc(stamp(r.created_at))}</time>
      ${byline}
    </div>
    ${r.body ? `<p class="wall-body">${esc(r.body)}</p>` : ""}
    ${r.image ? `<img class="wall-photo" src="${esc(r.image)}"
        alt="Posted by ${esc(name)}" loading="lazy" decoding="async">` : ""}
    ${r.image ? `<button class="wall-submit linkbtn" type="button" data-submit-broadcast="${esc(r.id)}">
        ${icon("tv", { size: 14 })}<span>Submit to Broadcast</span></button>` : ""}
  </article>`;
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
    const { error } = await db()
      .from("member_wall_posts")
      .insert({ member_id: me.id, body, image: image || null });
    if (error) {
      btn.disabled = false;
      btn.textContent = "Post";
      toast(error.message, true);
      return;
    }
    toast("Posted");
    onChanged?.();
  });

  root.querySelectorAll("[data-submit-broadcast]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const me = currentMember();
      if (!me) return;
      btn.disabled = true;
      const id = Number(btn.dataset.submitBroadcast);
      const { data, error } = await db()
        .from("member_wall_posts").select("image,body").eq("id", id).single();
      if (error || !data?.image) {
        btn.disabled = false;
        toast("Could not load that picture", true);
        return;
      }
      const { error: submitError } = await db().from("broadcast_submissions").insert({
        member_id: me.id,
        image: data.image,
        caption: String(data.body || "").slice(0, 180),
      });
      if (submitError) {
        btn.disabled = false;
        toast(submitError.message, true);
        return;
      }
      btn.classList.add("is-sent");
      btn.innerHTML = `${icon("check", { size: 14 })}<span>Submitted</span>`;
      toast("Sent to the Broadcast inbox");
    });
  });
}
