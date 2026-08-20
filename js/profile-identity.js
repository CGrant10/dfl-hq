// =====================================================================
// profile-identity.js - earned titles, one featured receipt, one club,
// and the accent colour that carries all three.
// ---------------------------------------------------------------------
// WHERE THIS ACTUALLY SHOWS, which was the open question:
//
//   the profile page   the full set, as pills under the card title
//   a wall post        a one-line byline under the author's name, tinted
//                      with the member's own accent colour
//
// That second surface is the point. Identity that only appears on a page
// nobody visits is decoration; identity attached to the thing a member
// posts is a signature. identityByline() carries the same three facts as
// the profile pills at byline scale, each fenced by a diamond spacer so
// they read as separate items rather than one grey smear.
//
// A CHAMPIONSHIP IS THE ONE THING THAT IS NOT A MATTER OF TASTE. Only the
// title may claim a ring - achievementChoices() will not emit one - and a
// title that does gets gold and a trophy instead of the member's accent,
// on both surfaces and in every theme.
//
// WHAT EACH COLOUR MEANS, which is the whole rule:
//
//   accent    the member's own choice - a non-champion title and their
//             featured achievement. Theirs to pick, so it is theirs.
//   gold      a championship title. Not a matter of taste, so not the
//             accent. Same treatment on every surface and theme.
//   club      the favourite-team badge, in that club's own two colours as
//             a gradient. Which club somebody supports is a fact, not a
//             preference about colour.
//
// THE ACCENT IS THEIRS, NOT THE THEME'S. It is stored per member and only
// ever used to tint their own byline, badge rail and post edge. It never
// touches the app's theme tokens, so one member's taste cannot repaint
// the league's chrome for everybody else.
// =====================================================================

import { db } from "./supabase.js";
import { esc, toast } from "./ui.js";
import { refreshMember } from "./members.js";
import { icon } from "./icons.js";
import { nflTeams, teamCode, teamValue, teamLogo, teamName, teamColor,
         teamGradientVars } from "./nfl-teams.js";
/* The earned-choice logic lives in a db-free module so it can have a spec.
   Re-exported here because this is the import site every caller already
   knows, and moving them was a refactor, not an API change. */
import {
  ACCENTS, accentOf, isChampionTitle, titleChoices, achievementChoices,
  achievementOptions, displayAchievement,
} from "./identity-rules.js";
export {
  ACCENTS, accentOf, isChampionTitle, titleChoices, achievementChoices,
  achievementOptions, displayAchievement,
};


// ------------------------------------------------------------- display

/** The full set, as pills. The profile page's own card. */
export function profileIdentityDisplay(member) {
  const bits = [];
  const accent = accentOf(member);
  const title = member?.profile_title;
  if (title) {
    /* A ring is the one thing in here that is not a matter of taste, so it
       is the one thing that does not take the member's accent colour - it
       gets gold, and the trophy, on every theme. */
    const champ = isChampionTitle(title);
    bits.push(`<span class="idp is-title${champ ? " is-champion" : ""}">${
      champ ? icon("trophy", { size: 13 }) : ""}<span>${esc(title)}</span></span>`);
  }
  const fav = teamName(member?.favorite_team);
  if (fav) {
    /* The club wears its OWN two colours, not the member's accent. The accent
       is for what they chose; which club they support is a fact. */
    bits.push(`<span class="idp is-team" style="${esc(teamGradientVars(member.favorite_team))}"
      >${teamLogo(member.favorite_team, { size: 18 })}<span>${esc(fav)}</span></span>`);
  }
  const feat = displayAchievement(member);
  if (feat) {
    bits.push(`<span class="idp is-feat">${icon("star", { size: 13 })}<span>${esc(feat)}</span></span>`);
  }
  if (!bits.length) return "";
  return `<div class="identity-pills" style="--ident:${esc(accent)}">${bits.join("")}</div>`;
}

/**
 * The compact byline that sits under an author's name on a wall post.
 *
 * Title, club and featured achievement - the same three facts as the
 * profile, at byline scale. The achievement is here because the small,
 * specific lines are the interesting ones to read next to somebody's
 * shit-talk; the title carries the ring on its own.
 *
 * EACH ITEM IS FENCED BY A SPACER GLYPH. Whitespace alone let "DFL
 * Champion" and "CHI" and "High week 184.2 pts" run together into one grey
 * smear at 11px. A diamond between them reads as a divider at a glance,
 * and it is aria-hidden so a screen reader gets three separate items
 * rather than the word "diamond" twice.
 *
 * Returns "" when the member has set nothing, so a post from an
 * unconfigured member simply has no second line.
 */
export function identityByline(member) {
  if (!member) return "";
  const bits = [];

  const title = member.profile_title;
  if (title) {
    const champ = isChampionTitle(title);
    bits.push(`<span class="ib-title${champ ? " is-champion" : ""}">${
      champ ? icon("trophy", { size: 12 }) : ""}<span>${esc(title)}</span></span>`);
  }

  const code = teamCode(member.favorite_team);
  if (code) {
    bits.push(`<span class="ib-team" style="${esc(teamGradientVars(member.favorite_team))}"
      >${teamLogo(member.favorite_team, { size: 14 })}<span>${esc(code)}</span></span>`);
  }

  const feat = displayAchievement(member);
  if (feat) {
    bits.push(`<span class="ib-feat">${esc(feat)}</span>`);
  }

  if (!bits.length) return "";
  const spacer = `<span class="ib-sep" aria-hidden="true">&#9670;</span>`;
  return `<span class="identity-byline">${bits.join(spacer)}</span>`;
}

// -------------------------------------------------------------- editor

export function identitySettingsCard(member, career, extremes, chipSeasons = []) {
  const titles = titleChoices(member, career, extremes, chipSeasons);
  const achievements = achievementOptions(member, career, extremes, chipSeasons);
  const accent = accentOf(member);
  const suggested = teamColor(member?.favorite_team);

  /* Nothing earned yet and no club chosen would leave three empty selects
     and a colour row. The club and the colour are still worth offering, so
     only the earned selects drop out. */
  const earned = titles.length || achievements.length;

  return `<div class="identity-editor" data-profile-identity-settings style="--ident:${esc(accent)}">
    <div class="ident-head">
      <span class="u-label">Identity</span>
      <span class="muted tiny">Shows on your profile and under your name on the Wall.</span>
    </div>

    ${earned ? `
    <div class="ident-grid">
      ${titles.length ? `<label class="dfl-field"><span class="u-label">Title</span>
        <select data-identity-title>
          <option value="">None</option>
          ${titles.map(x => `<option${member.profile_title === x ? " selected" : ""}>${esc(x)}</option>`).join("")}
        </select></label>` : ""}
      ${achievements.length ? `<label class="dfl-field"><span class="u-label">Featured achievement</span>
        <select data-identity-achievement>
          <option value="">None</option>
          ${achievements.map(x => `<option${member.featured_achievement === x ? " selected" : ""}>${esc(x)}</option>`).join("")}
        </select></label>` : ""}
    </div>` : `<p class="muted tiny">No titles earned yet — win something.</p>`}

    <label class="dfl-field"><span class="u-label">Favourite NFL team</span>
      <div class="ident-team-row">
        <span class="ident-team-logo" data-identity-team-logo>
          ${member.favorite_team ? teamLogo(member.favorite_team, { size: 30 }) : ""}
        </span>
        <select data-identity-team>
          <option value="">None</option>
          ${nflTeams().map(t => `<option value="${esc(teamValue(t.code))}"${
            teamCode(member.favorite_team) === t.code ? " selected" : ""}>${esc(t.name)}</option>`).join("")}
        </select>
      </div>
    </label>

    <div class="dfl-field">
      <span class="u-label">Accent colour</span>
      <div class="ident-swatches" role="radiogroup" aria-label="Accent colour">
        ${ACCENTS.map(c => `<button type="button" class="ident-swatch${
          c.toLowerCase() === accent.toLowerCase() ? " on" : ""}" style="--sw:${esc(c)}"
          data-identity-accent="${esc(c)}" role="radio"
          aria-checked="${c.toLowerCase() === accent.toLowerCase()}"
          aria-label="Accent ${esc(c)}"></button>`).join("")}
      </div>
      ${suggested ? `<button type="button" class="linkbtn tiny" data-identity-accent="${esc(suggested)}">
        Use my team's colour</button>` : ""}
    </div>

    <div class="ident-preview">
      <span class="u-label">Preview</span>
      <div class="ident-preview-line" data-identity-preview>${
        identityByline({ ...member, accent_color: accent }) || `<span class="muted tiny">Nothing set yet</span>`
      }</div>
    </div>

    <div class="row-end"><button type="button" class="btn ghost small" data-save-profile-identity>Save identity</button></div>
  </div>`;
}

export function wireProfileIdentity(root, member, onSaved) {
  const host = root.querySelector("[data-profile-identity-settings]") || root;
  /* The draft lives here rather than on the accent buttons, because saving
     reads one value and the swatch row has twelve. */
  let accent = accentOf(member);

  const repaintPreview = () => {
    host.style.setProperty("--ident", accent);
    const slot = host.querySelector("[data-identity-preview]");
    if (!slot) return;
    const line = identityByline({
      ...member,
      profile_title: host.querySelector("[data-identity-title]")?.value || "",
      favorite_team: host.querySelector("[data-identity-team]")?.value || "",
      featured_achievement: host.querySelector("[data-identity-achievement]")?.value || "",
    });
    slot.innerHTML = line || `<span class="muted tiny">Nothing set yet</span>`;
  };

  host.addEventListener("click", (e) => {
    const swatch = e.target.closest("[data-identity-accent]");
    if (!swatch) return;
    accent = swatch.dataset.identityAccent;
    host.querySelectorAll("[data-identity-accent].ident-swatch").forEach((b) => {
      const on = b.dataset.identityAccent.toLowerCase() === accent.toLowerCase();
      b.classList.toggle("on", on);
      b.setAttribute("aria-checked", String(on));
    });
    repaintPreview();
  });

  /* The club select repaints the big logo beside it as well as the preview,
     so picking a team shows the actual mark straight away. */
  host.addEventListener("change", (e) => {
    if (e.target.matches("[data-identity-team]")) {
      const slot = host.querySelector("[data-identity-team-logo]");
      if (slot) slot.innerHTML = e.target.value ? teamLogo(e.target.value, { size: 30 }) : "";
    }
    if (e.target.matches("[data-identity-team], [data-identity-title], [data-identity-achievement]")) repaintPreview();
  });

  host.querySelector("[data-save-profile-identity]")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const args = {
      target_member_id: Number(member.id),
      new_title: host.querySelector("[data-identity-title]")?.value || "",
      new_achievement: host.querySelector("[data-identity-achievement]")?.value || "",
      new_favorite_team: host.querySelector("[data-identity-team]")?.value || "",
    };
    try {
      /*
        THE ACCENT IS SENT ONLY IF THE DATABASE HAS THE COLUMN. Postgres
        resolves overloads by argument name, so calling the four-argument
        function with a fifth name is a hard "function not found" rather
        than an ignored extra. Until profile_identity_accent_schema.sql has
        been run, the save must still work for the other three fields
        instead of failing outright - so a missing-function error retries
        without the accent and says plainly why it did not stick.
      */
      let { error } = await db().rpc("profile_identity_save", { ...args, new_accent_color: accent });
      if (error && /could not find|does not exist|schema cache/i.test(error.message || "")) {
        const retry = await db().rpc("profile_identity_save", args);
        if (retry.error) throw retry.error;
        await refreshMember();
        toast("Saved — run profile_identity_accent_schema.sql to store your accent colour", true);
        await onSaved?.();
        return;
      }
      if (error) throw error;
      await refreshMember();
      toast("Identity saved");
      await onSaved?.();
    } catch (err) {
      toast(err?.message || "Could not update profile", true);
      btn.disabled = false;
    }
  });
}
