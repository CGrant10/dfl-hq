// Profile self-editor: photo, bio, earned identity. Existing Arena pets stay read-only.
import { db } from "../supabase.js";
import { esc, toast } from "../ui.js";
import { shrinkToDataUri } from "../image-field.js";
import { PRESETS, describeValue, fmtBytes, MAX_SOURCE_BYTES } from "../image-shrink.js";
import { dflCharacterIds } from "../arena/dfl-sprites.js";
import { characterSvg } from "../arena/pixi-runtime.js";
import { identitySettingsCard, profileIdentityDisplay, wireProfileIdentity } from "../profile-identity.js";
import { loadLore, career } from "../lore.js";

const BIO_MAX = 500;
const PHOTO_PX = PRESETS.avatar.maxPx;
const PHOTO_MAX_BYTES = MAX_SOURCE_BYTES;

export function petOf(member) {
  const p = member?.pet;
  if (!p) return null;
  try {
    const v = typeof p === "string" ? JSON.parse(p) : p;
    return v && typeof v === "object" ? v : null;
  } catch { return null; }
}

const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0,2).map(w=>w[0]||"").join("").toUpperCase() || "?";

function petArt(pet) {
  const species = pet?.species || dflCharacterIds()[0];
  const color = pet?.color || "#C8102E";
  return `<div class="pet-art is-big trail-${esc(pet?.trail || "none")}" style="--racer:${esc(color)};--pet-accent:${esc(pet?.accent || "#ffffff")}">${characterSvg({ ...(pet || {}), species }, color)}</div>`;
}

function viewCard(m, isMe) {
  const pet = petOf(m);
  const bio = String(m.bio || "").trim();
  const bioBlock = bio ? `<p class="dfl-bio">${esc(bio)}</p>` : "";
  const petBlock = pet ? `<div class="dfl-pet">${petArt(pet)}<span class="dfl-pet-id"><strong>${esc(pet.name || "Unnamed")}</strong><span class="muted tiny">DFL Pet · races for ${esc(m.display_name)}</span></span></div>` : "";
  if (!bioBlock && !petBlock && !isMe) return "";
  return `<section class="card dfl-page"><div class="card-title-row"><div class="card-title">${isMe ? "Your DFL page" : "About"}</div>${isMe ? `<button type="button" class="btn ghost small" data-dfl-edit>Edit profile</button>` : ""}</div>${profileIdentityDisplay(m)}${bioBlock}${petBlock}</section>`;
}

function editCard(m, draft) {
  const photo = draft.image !== undefined ? draft.image : m.profile_image;
  return `<section class="card dfl-page is-editing">
    <div class="card-title-row"><div class="card-title">Edit profile</div><button type="button" class="btn ghost small" data-dfl-cancel>Cancel</button></div>
    <div class="dfl-field"><span class="u-label">Photo</span><div class="dfl-photo-row">${photo ? `<img class="avatar" src="${esc(photo)}" alt="">` : `<div class="avatar avatar-fallback">${esc(initials(m.display_name))}</div>`}<span class="row"><button type="button" class="btn ghost small" data-photo-pick>${photo ? "Change" : "Upload photo"}</button>${photo ? `<button type="button" class="btn ghost small" data-photo-clear>Remove</button>` : ""}<input type="file" accept="image/png,image/jpeg,image/webp" hidden data-photo-file></span></div><span class="muted tiny">Shrunk to ${PHOTO_PX}px before saving.</span></div>
    <div class="dfl-field"><label class="u-label" for="dfl-bio">About me</label><textarea id="dfl-bio" data-bio maxlength="${BIO_MAX}" rows="4" placeholder="Bio">${esc(draft.bio)}</textarea><span class="muted tiny"><span data-bio-count>${draft.bio.length}</span>/${BIO_MAX}</span></div>
    <div data-profile-identity-editor></div>
    <div class="row-end"><button type="button" class="btn" data-dfl-save>Save photo &amp; bio</button></div>
  </section>`;
}

async function identityData(member) {
  const lore = member.sleeper_user_id ? await loadLore().catch(()=>null) : null;
  const c = lore && !lore.error ? career(lore, member.sleeper_user_id) : null;
  let chipSeasons=[];
  if (member.sleeper_user_id) {
    const {data}=await db().from("sleeper_leagues").select("season,last_place_user_id").eq("last_place_user_id",member.sleeper_user_id).order("season");
    chipSeasons=(data||[]).map(r=>String(r.season));
  }
  return { career:c, extremes:c, chipSeasons };
}

export function wireDflPage(view, member, isMe, refresh) {
  const host=view.querySelector("[data-dfl-host]");
  if(!host)return;
  let editing=false;
  let draft=null;
  const freshDraft=()=>({bio:String(member.bio||"").trim(),image:undefined});

  const mountIdentity=async()=>{
    const slot=host.querySelector("[data-profile-identity-editor]");
    if(!slot)return;
    try{
      const info=await identityData(member);
      slot.innerHTML=identitySettingsCard(member,info.career,info.extremes,info.chipSeasons);
      wireProfileIdentity(slot,member,refresh);
    }catch{
      slot.innerHTML="";
    }
  };
  const paint=()=>{host.innerHTML=editing?editCard(member,draft):viewCard(member,isMe);if(editing)void mountIdentity();};
  paint();

  host.addEventListener("input",e=>{
    if(!draft)return;
    if(e.target.matches("[data-bio]")){draft.bio=e.target.value;const n=host.querySelector("[data-bio-count]");if(n)n.textContent=String(draft.bio.length);}
  });
  host.addEventListener("change",async e=>{
    if(!draft||!e.target.matches("[data-photo-file]"))return;
    const file=e.target.files?.[0]; if(!file)return;
    if(!/^image\//.test(file.type)){toast("Pick an image file",true);return;}
    if(file.size>PHOTO_MAX_BYTES){toast(`That image is over ${fmtBytes(PHOTO_MAX_BYTES)}`,true);return;}
    try{draft.image=await shrinkToDataUri(file,"avatar");paint();toast(`Photo ready (${describeValue(draft.image)})`);}catch(err){toast(err.message||"Could not read that image",true);}
  });
  host.addEventListener("click",async e=>{
    if(e.target.closest("[data-dfl-edit]")){editing=true;draft=freshDraft();paint();return;}
    if(e.target.closest("[data-dfl-cancel]")){editing=false;draft=null;paint();return;}
    if(!draft)return;
    if(e.target.closest("[data-photo-pick]")){host.querySelector("[data-photo-file]")?.click();return;}
    if(e.target.closest("[data-photo-clear]")){draft.image=null;paint();return;}
    const save=e.target.closest("[data-dfl-save]"); if(!save)return;
    save.disabled=true;
    try{
      const {data,error}=await db().rpc("dfl_update_profile",{p_bio:draft.bio,p_image:draft.image===undefined||draft.image===null?null:draft.image,p_pet:petOf(member),p_clear_image:draft.image===null});
      if(error)throw error;
      if(!Number(data))throw new Error("Pick your name again from the top bar and retry.");
      toast("Profile saved"); editing=false; draft=null; await refresh();
    }catch(err){toast(err.message||"Could not save",true);save.disabled=false;}
  });
}
