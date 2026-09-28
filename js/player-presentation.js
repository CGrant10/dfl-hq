import { esc } from "./ui.js";
import { team, teamLogoUrl } from "./nfl-teams.js";

const initials = value => String(value || "?").trim().split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();

export function playerPortrait(player = {}) {
  const club = team(player.nflTeam || player.team);
  const defense = String(player.position || "").toUpperCase() === "DEF";
  const source = defense ? teamLogoUrl(player.nflTeam || player.team)
    : player.id ? `https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(player.id)}.jpg` : "";
  const style = club ? ` style="--player-primary:${esc(club.primary)};--player-secondary:${esc(club.secondary)}"` : "";
  return `<span class="dfl-player-portrait${defense ? " is-team" : ""}"${style}><i>${esc(initials(player.name))}</i>${source ? `<img src="${esc(source)}" alt="" loading="lazy" decoding="async" onload="this.parentElement.classList.add('has-photo')" onerror="this.remove()">` : ""}</span>`;
}

export function playerIdentity(player = {}, { detail = "", signal = "" } = {}) {
  const status = signal || player.injuryStatus || "";
  const tone = /out|ir|pup|doubt/i.test(status) ? "danger" : /hot|up/i.test(status) ? "up" : /cold|down/i.test(status) ? "down" : "";
  const meta = detail || [player.position, player.nflTeam || player.team].filter(Boolean).join(" · ");
  return `<span class="dfl-player">${playerPortrait(player)}<span class="dfl-player-copy"><strong>${esc(player.name || player.id || "Player")}</strong><small>${esc(meta)}</small></span>${status ? `<em class="is-${tone || "neutral"}">${esc(status)}</em>` : ""}</span>`;
}
