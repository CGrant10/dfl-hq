import { esc } from "./ui.js";
import { accentOf } from "./identity-rules.js";
import { teamInitials } from "./league-trajectory.js";

export function teamLabel(team) {
  return team?.team_name || team?.identity?.team_name || team?.ownerName
    || team?.identity?.display_name || `Team ${team?.roster_id || ""}`.trim();
}

export function teamOwner(team) {
  return team?.ownerName || team?.identity?.display_name || "";
}

export function teamPortrait(team, { className = "" } = {}) {
  const identity = team?.identity || team || {};
  const name = teamLabel(team);
  const photo = identity.profile_image;
  return `<span class="dfl-team-mark ${esc(className)}" style="--team-accent:${esc(accentOf(identity))}" aria-hidden="true">
    <i>${esc(teamInitials(name || "?"))}</i>
    ${photo ? `<img src="${esc(photo)}" alt="" loading="lazy" decoding="async" onload="this.parentElement.classList.add('has-photo')" onerror="this.remove()">` : ""}
  </span>`;
}

export function teamIdentity(team, { meta = "", record = "", movement = null, compact = false } = {}) {
  const owner = teamOwner(team);
  const detail = meta || (owner && owner !== teamLabel(team) ? owner : "");
  const move = movement == null ? "" : Number(movement) === 0 ? `<span class="dfl-team-move is-even">—</span>`
    : `<span class="dfl-team-move ${Number(movement) > 0 ? "is-up" : "is-down"}">${Number(movement) > 0 ? "▲" : "▼"}${Math.abs(Number(movement))}</span>`;
  return `<div class="dfl-team${compact ? " is-compact" : ""}" style="--team-accent:${esc(accentOf(team?.identity || team))}">
    ${teamPortrait(team)}
    <span class="dfl-team-copy"><strong>${esc(teamLabel(team))}</strong>${detail ? `<small>${esc(detail)}</small>` : ""}</span>
    ${record ? `<span class="dfl-team-record">${esc(record)}</span>` : ""}${move}
  </div>`;
}
