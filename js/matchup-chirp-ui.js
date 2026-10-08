import { esc } from './ui.js';
import { matchupChirp } from './matchup-banter.js';

export function matchupChirpHtml(chirp, { href = '' } = {}) {
  if (!chirp) return '';
  return `<section class="dfl-chirp" data-chirp-kind="${esc(chirp.kind)}" aria-label="DFL matchup commentary"><header><small>DFL CHIRP${chirp.kind === 'final' ? ' · FINAL RECEIPT' : chirp.kind === 'live' ? ' · LIVE LEAD' : ''}</small>${href ? `<a href="${esc(href)}">Matchup talk →</a>` : ''}</header><p class="dfl-chirp-receipt">${esc(chirp.receipt)}</p><p class="dfl-chirp-roast">${esc(chirp.roast)}</p></section>`;
}

export function clubhouseChirp(game, model) {
  const sides = model.chirpScores?.get(String(game.matchup_id)) || [game.left, game.right];
  return matchupChirp({ left: sides[0], right: sides[1], season: model.season, week: model.week,
    id: game.matchup_id, completed: model.completed,
    live: sides.some(side => Number(side.live) > 0), history: model.chirpHistory || [] });
}
