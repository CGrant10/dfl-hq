/* =====================================================================
   profile-dfl.js - "your DFL page": the photo, the bio and the pet.
   ---------------------------------------------------------------------
   Its own module rather than another 300 lines inside profile.js, which
   is already the longest page in the app.

   TWO MODES, AND THE DIFFERENCE IS THE POINT:

     somebody else's page   bio and pet, read only, no controls at all
     your own page          the same, plus an Edit button that swaps the
                            controls in where the content was

   THE PHOTO IS NOT A URL BOX. It is a file picker that crops to a square
   and shrinks to 256px in the browser, then stores that - exactly what
   the crest picker on the front page has always done. There is no
   Supabase Storage in this project, and inventing a bucket plus its
   policies for one avatar would be a much bigger change than this pass.

   THE PET IS COSMETIC AND IS DRAWN BY THE ARENA'S OWN RENDERER.
   characterSvg() composes through src/arena/character.ts, the same step
   the live Pixi race composes through, so the preview here and the racer
   there cannot drift. The simulation never reads it.
   ===================================================================== */

import { db } from "../supabase.js";
import { esc, toast } from "../ui.js";
import { dflCharacter, dflCharacterIds } from "../arena/dfl-sprites.js";
/* The preview and the race draw through the same composition step, so a
   pet cannot look like one thing here and another on the track. */
import { characterSvg } from "../arena/pixi-runtime.js";

const BIO_MAX = 500;
const PHOTO_PX = 256;
const PHOTO_MAX_BYTES = 4 * 1024 * 1024;

/* A small palette, not a colour wheel: the DFL's own colours plus enough
   variety that twelve members can look different from each other. */
const PET_COLOURS = [
  "#C8102E", "#E5011B", "#003396", "#4aa3ff", "#2fbf5f",
  "#EFC94C", "#F08279", "#a06be0", "#e07b39", "#8b98ab",
];
const PET_ACCENTS = ["#ffffff", "#ffd84a", "#65e5ff", "#ff78b9", "#8cff98", "#202733"];
const PET_ACCESSORIES = [
  ["none", "None"], ["bandana", "Bandana"], ["visor", "Visor"],
  ["crown", "Crown"], ["headphones", "Headphones"], ["cape", "Cape"],
];
const PET_EXPRESSIONS = [
  ["focused", "Focused"], ["happy", "Happy"], ["fierce", "Fierce"], ["sleepy", "Sleepy"],
];
const PET_TRAILS = [
  ["none", "None"], ["dust", "Dust"], ["spark", "Sparks"], ["rainbow", "Rainbow"],
];

/** The stored pet, whether it arrives as jsonb or as text. */
export function petOf(member) {
  const p = member?.pet;
  if (!p) return null;
  try {
    const v = typeof p === "string" ? JSON.parse(p) : p;
    return v && typeof v === "object" ? v : null;
  } catch { return null; }
}

const initials = (name) =>
  String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";

function petArt(pet, size = "big", preview = "idle") {
  const species = pet?.species || dflCharacterIds()[0];
  const colour = pet?.color || PET_COLOURS[0];
  const trail = pet?.trail || "none";
  return `<div class="pet-art is-${esc(size)} preview-${esc(preview)} trail-${esc(trail)}" style="--racer:${esc(colour)};--pet-accent:${esc(pet?.accent || PET_ACCENTS[0])}">${characterSvg({ ...(pet || {}), species }, colour)}</div>`;
}

// ------------------------------------------------------------- markup

function viewCard(m, isMe) {
  const pet = petOf(m);
  const bio = (m.bio || "").trim();

  /* A section with nothing in it is left out rather than drawn as an
     empty box - a stranger's page should not read as a list of things
     they have not filled in. */
  const bioBlock = bio
    ? `<p class="dfl-bio">${esc(bio)}</p>`
    : isMe ? `<p class="muted tiny">No bio yet — say something about yourself.</p>` : "";

  const petBlock = pet
    ? `<div class="dfl-pet">
         ${petArt(pet)}
         <span class="dfl-pet-id">
           <strong>${esc(pet.name || "Unnamed")}</strong>
           <span class="muted tiny">DFL Pet · races for ${esc(m.display_name)}</span>
         </span>
       </div>`
    : isMe ? `<p class="muted tiny">No DFL Pet yet — make one and it races for you in the Arena.</p>` : "";

  if (!bioBlock && !petBlock) return "";
  return `
    <section class="card dfl-page">
      <div class="card-title-row">
        <div class="card-title">${isMe ? "Your DFL page" : "About"}</div>
        ${isMe ? `<button type="button" class="btn ghost small" data-dfl-edit>Edit profile</button>` : ""}
      </div>
      ${bioBlock}
      ${petBlock}
    </section>`;
}

function editCard(m, draft) {
  const pet = draft.pet;
  const photo = draft.image !== undefined ? draft.image : m.profile_image;
  return `
    <section class="card dfl-page is-editing">
      <div class="card-title-row">
        <div class="card-title">Customise your DFL page</div>
        <button type="button" class="btn ghost small" data-dfl-cancel>Cancel</button>
      </div>

      <div class="dfl-field">
        <span class="u-label">Photo</span>
        <div class="dfl-photo-row">
          ${photo
            ? `<img class="avatar" src="${esc(photo)}" alt="">`
            : `<div class="avatar avatar-fallback">${esc(initials(m.display_name))}</div>`}
          <span class="row">
            <button type="button" class="btn ghost small" data-photo-pick>${photo ? "Change" : "Upload photo"}</button>
            ${photo ? `<button type="button" class="btn ghost small" data-photo-clear>Remove</button>` : ""}
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden data-photo-file>
          </span>
        </div>
        <span class="muted tiny">JPG, PNG or WebP. Cropped square and shrunk to ${PHOTO_PX}px on your device before it is saved.</span>
      </div>

      <div class="dfl-field">
        <label class="u-label" for="dfl-bio">About me</label>
        <textarea id="dfl-bio" data-bio maxlength="${BIO_MAX}" rows="4"
          placeholder="Been making questionable roster decisions since 2019…">${esc(draft.bio)}</textarea>
        <span class="muted tiny"><span data-bio-count>${draft.bio.length}</span>/${BIO_MAX}</span>
      </div>

      <div class="dfl-field">
        <span class="u-label">Your DFL Pet</span>
        <div class="dfl-pet-edit">
          ${petArt(pet, "big", draft.preview)}
          <div class="dfl-pet-fields">
            <input type="text" data-pet-name maxlength="24" placeholder="Pet name" value="${esc(pet.name)}">
            <div class="pet-preview-modes" aria-label="Preview animation">
              ${["idle", "run", "surge", "win"].map((mode) => `
                <button type="button" class="btn ghost small${draft.preview === mode ? " on" : ""}"
                        data-pet-preview="${mode}">${mode[0].toUpperCase() + mode.slice(1)}</button>`).join("")}
            </div>
            <label class="pet-species-select">
              <span class="pet-option-label">Character</span>
              <select data-pet-species-select aria-label="Pet character">
                ${dflCharacterIds().map((id) => {
                  const c = dflCharacter(id);
                  return `<option value="${esc(id)}" ${pet.species === id ? "selected" : ""}>${esc(c?.label || id)}</option>`;
                }).join("")}
              </select>
            </label>
            <div class="pet-roster" role="radiogroup" aria-label="Pet character">
              ${dflCharacterIds().map((id) => {
                const c = dflCharacter(id);
                return `<button type="button" class="pet-choice${pet.species === id ? " on" : ""}"
                  data-pet-species="${esc(id)}" role="radio" aria-checked="${pet.species === id}"
                  title="${esc(c?.blurb || "")}">
                  <span>${characterSvg({ species: id }, pet.color)}</span><b>${esc(c?.label || id)}</b>
                </button>`;
              }).join("")}
            </div>
            <span class="pet-option-label">Body colour</span>
            <div class="pet-swatches">
              ${PET_COLOURS.map((c) => `
                <button type="button" class="pet-swatch${pet.color === c ? " on" : ""}"
                        style="--sw:${esc(c)}" data-pet-color="${esc(c)}"
                        aria-label="Pet colour ${esc(c)}"></button>`).join("")}
            </div>
            <span class="pet-option-label">Accent colour</span>
            <div class="pet-swatches">
              ${PET_ACCENTS.map((c) => `
                <button type="button" class="pet-swatch${pet.accent === c ? " on" : ""}"
                        style="--sw:${esc(c)}" data-pet-accent="${esc(c)}"
                        aria-label="Accent colour ${esc(c)}"></button>`).join("")}
            </div>
            <div class="pet-option-grid">
              <label><span class="pet-option-label">Accessory</span>
                <select data-pet-accessory>${PET_ACCESSORIES.map(([v, label]) => `<option value="${v}" ${pet.accessory === v ? "selected" : ""}>${label}</option>`).join("")}</select>
              </label>
              <label><span class="pet-option-label">Expression</span>
                <select data-pet-expression>${PET_EXPRESSIONS.map(([v, label]) => `<option value="${v}" ${pet.expression === v ? "selected" : ""}>${label}</option>`).join("")}</select>
              </label>
              <label><span class="pet-option-label">Race trail</span>
                <select data-pet-trail>${PET_TRAILS.map(([v, label]) => `<option value="${v}" ${pet.trail === v ? "selected" : ""}>${label}</option>`).join("")}</select>
              </label>
            </div>
          </div>
        </div>
        <span class="muted tiny">Cosmetic only — your pet races for you in the Arena and changes nothing about the result.</span>
      </div>

      <div class="row-end"><button type="button" class="btn" data-dfl-save>Save</button></div>
    </section>`;
}

// -------------------------------------------------------------- wiring

/**
 * Mount the card into [data-dfl-host].
 *
 * @param {Function} refresh  re-render the whole profile after a save
 */
export function wireDflPage(view, member, isMe, refresh) {
  const host = view.querySelector("[data-dfl-host]");
  if (!host) return;

  const stored = petOf(member) || {};
  /*
    ONE DRAFT OBJECT, held here rather than read back off the inputs.
    Every repaint destroys the textarea and the name field, so anything
    typed has to live outside the DOM or it is lost the moment somebody
    picks a colour.
  */
  let editing = false;
  let draft = null;
  const freshDraft = () => ({
    bio: (member.bio || "").trim(),
    image: undefined,                       // undefined = unchanged, null = remove
    pet: {
      name: stored.name || "",
      species: stored.species || dflCharacterIds()[0],
      color: stored.color || PET_COLOURS[0],
      accent: stored.accent || PET_ACCENTS[0],
      accessory: stored.accessory || "none",
      expression: stored.expression || "focused",
      trail: stored.trail || "none",
    },
    preview: "run",
  });

  const paint = () => {
    host.innerHTML = editing ? editCard(member, draft) : viewCard(member, isMe);
  };
  paint();

  host.addEventListener("input", (e) => {
    if (!draft) return;
    if (e.target.matches("[data-bio]")) {
      draft.bio = e.target.value;
      const n = host.querySelector("[data-bio-count]");
      if (n) n.textContent = String(draft.bio.length);
    }
    if (e.target.matches("[data-pet-name]")) draft.pet.name = e.target.value;
    if (e.target.matches("[data-pet-accessory]")) { draft.pet.accessory = e.target.value; paint(); }
    if (e.target.matches("[data-pet-expression]")) { draft.pet.expression = e.target.value; paint(); }
    if (e.target.matches("[data-pet-trail]")) { draft.pet.trail = e.target.value; paint(); }
  });

  host.addEventListener("change", async (e) => {
    if (!draft) return;
    if (e.target.matches("[data-pet-species-select]")) {
      draft.pet.species = e.target.value;
      paint();
      return;
    }
    if (e.target.matches("[data-photo-file]")) {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { toast("Use a JPG, PNG or WebP", true); return; }
      if (file.size > PHOTO_MAX_BYTES) { toast("That image is too large", true); return; }
      try {
        draft.image = await squarePng(file, PHOTO_PX);
        paint();
        toast("Photo ready — press Save");
      } catch { toast("Could not read that image", true); }
    }
  });

  host.addEventListener("click", async (e) => {
    if (e.target.closest("[data-dfl-edit]")) { editing = true; draft = freshDraft(); paint(); return; }
    if (e.target.closest("[data-dfl-cancel]")) { editing = false; draft = null; paint(); return; }
    if (!draft) return;

    const species = e.target.closest("[data-pet-species]");
    if (species) { draft.pet.species = species.dataset.petSpecies; paint(); return; }
    const preview = e.target.closest("[data-pet-preview]");
    if (preview) { draft.preview = preview.dataset.petPreview; paint(); return; }
    const sw = e.target.closest("[data-pet-color]");
    if (sw) { draft.pet.color = sw.dataset.petColor; paint(); return; }
    const accent = e.target.closest("[data-pet-accent]");
    if (accent) { draft.pet.accent = accent.dataset.petAccent; paint(); return; }
    if (e.target.closest("[data-photo-pick]")) { host.querySelector("[data-photo-file]")?.click(); return; }
    if (e.target.closest("[data-photo-clear]")) { draft.image = null; paint(); return; }

    const save = e.target.closest("[data-dfl-save]");
    if (!save) return;
    save.disabled = true;
    const label = save.textContent;
    save.textContent = "Saving…";
    try {
      const hasPet = !!(draft.pet.name.trim() || stored.species);
      /*
        THE ROW COUNT IS THE POINT. A write the database refuses comes back
        as a cheerful 204 with no error, so without asking for the number of
        rows changed this would cheerfully say "Saved" over an unchanged
        profile - the same trap mustWrite() exists for on the golf page.
      */
      const { data, error } = await db().rpc("dfl_update_profile", {
        p_bio: draft.bio,
        p_image: draft.image === undefined || draft.image === null ? null : draft.image,
        p_pet: hasPet ? draft.pet : null,
        p_clear_image: draft.image === null,
      });
      if (error) throw error;
      if (!Number(data)) throw new Error("The database refused that. Pick your name again from the top bar and retry.");
      toast("Your DFL page is saved");
      editing = false;
      draft = null;
      await refresh();
      return;
    } catch (err) {
      toast(err.message || "Could not save", true);
    }
    save.disabled = false;
    save.textContent = label;
  });
}

/** Crop to a square and shrink. The same approach as the crest picker. */
async function squarePng(fileObj, size) {
  const bitmap = await createImageBitmap(fileObj);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d").drawImage(
      bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/png");
  } finally { bitmap.close?.(); }
}
