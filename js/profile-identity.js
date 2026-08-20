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
// posts is a signature. identityByline() is deliberately terser than the
// profile pills - a title, a club badge, and nothing else - because it
// sits inside somebody else's reading of a post, not on their own page.
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
import { nflTeams, teamCode, teamValue, teamLogo, teamName, teamColor } from "./nfl-teams.js";

const count = value => Array.isArray(value) ? value.length : Number(value) || 0;
function unique(items) { return [...new Set(items.filter(Boolean))]; }

/*
  THE ACCENT PALETTE IS A LIST, NOT A COLOUR WHEEL. A free <input
  type=color> lets somebody pick #111 on a dark card or #fff on a light
  one and make their own byline invisible. Every swatch here has been
  checked to read on both themes, and the database still validates the
  format so a hand-edited request cannot inject anything else.
*/
export const ACCENTS = [
  "#C8102E", "#E5011B", "#FF7A45", "#EFC94C", "#2FBF5F",
  "#22C7A9", "#4AA3FF", "#0057D9", "#A06BE0", "#F06FA8",
  "#8B98AB", "#F4F2EE",
];
const DEFAULT_ACCENT = "#8B98AB";

/** The member's chosen accent, validated, with a readable fallback. */
export function accentOf(member) {
  const raw = String(member?.accent_color || "").trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : DEFAULT_ACCENT;
}

// ------------------------------------------------------- earned choices

export function titleChoices(member, career, extremes, chipSeasons = []) {
  const out = [];
  const titles = Math.max(count(career?.titles), Number(member?.championships) || 0);
  const runnerUps = Math.max(count(career?.runnerUps), count(career?.seconds));
  const playoffs = count(career?.playoffs ?? career?.total?.playoffs);
  if (titles >= 1) out.push("DFL Champion");
  if (titles >= 2) out.push("Multi-Time Champion");
  if (runnerUps >= 1) out.push("DFL Finalist");
  if (playoffs >= 1) out.push("Playoff Regular");
  if (Number(extremes?.streak?.win?.run) >= 5) out.push("Certified Heater");
  if (chipSeasons.length) out.push("Chip Eater Survivor");
  if (Number(member?.joined_year) && Number(member.joined_year) <= 2019) out.push("DFL Original");
  return unique(out);
}

export function achievementChoices(career, extremes, chipSeasons = []) {
  const out = [];
  const titles = count(career?.titles);
  const playoffs = count(career?.playoffs ?? career?.total?.playoffs);
  const runnerUps = Math.max(count(career?.runnerUps), count(career?.seconds));
  if (titles) out.push(`${titles}× DFL Champion`);
  if (runnerUps) out.push(`${runnerUps}× runner-up`);
  if (playoffs) out.push(`${playoffs} playoff trip${playoffs === 1 ? "" : "s"}`);
  if (extremes?.bestSeason?.rank) out.push(`Best finish: #${extremes.bestSeason.rank}`);
  if (extremes?.highWeek?.score) out.push(`Career high week: ${Number(extremes.highWeek.score).toFixed(1)} pts`);
  if (Number(extremes?.streak?.win?.run) > 1) out.push(`${extremes.streak.win.run}-game win streak`);
  if (chipSeasons.length) out.push(`Survived the hot chip · ${chipSeasons.join(", ")}`);
  return unique(out);
}

// ------------------------------------------------------------- display

/** The full set, as pills. The profile page's own card. */
export function profileIdentityDisplay(member) {
  const bits = [];
  const accent = accentOf(member);
  if (member?.profile_title) {
    bits.push(`<span class="idp is-title">${esc(member.profile_title)}</span>`);
  }
  const fav = teamName(member?.favorite_team);
  if (fav) {
    bits.push(`<span class="idp is-team">${teamLogo(member.favorite_team, { size: 18 })}${esc(fav)}</span>`);
  }
  if (member?.featured_achievement) {
    bits.push(`<span class="idp is-feat">${icon("star", { size: 13 })}${esc(member.featured_achievement)}</span>`);
  }
  if (!bits.length) return "";
  return `<div class="identity-pills" style="--ident:${esc(accent)}">${bits.join("")}</div>`;
}

/**
 * The compact byline that sits under an author's name on a wall post.
 *
 * Title and club only. A featured achievement is a paragraph of bragging
 * and belongs on the profile, not stapled to every sentence somebody
 * writes. Returns "" when the member has set nothing, so a post from an
 * unconfigured member simply has no second line.
 */
export function identityByline(member) {
  if (!member) return "";
  const bits = [];
  if (member.profile_title) bits.push(`<span class="ib-title">${esc(member.profile_title)}</span>`);
  const code = teamCode(member.favorite_team);
  if (code) {
    bits.push(`<span class="ib-team">${teamLogo(member.favorite_team, { size: 14 })}${esc(code)}</span>`);
  }
  if (!bits.length) return "";
  return `<span class="identity-byline">${bits.join(`<span class="ib-dot" aria-hidden="true">·</span>`)}</span>`;
}

// -------------------------------------------------------------- editor

export function identitySettingsCard(member, career, extremes, chipSeasons = []) {
  const titles = titleChoices(member, career, extremes, chipSeasons);
  const achievements = achievementChoices(career, extremes, chipSeasons);
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
    if (e.target.matches("[data-identity-team], [data-identity-title]")) repaintPreview();
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
