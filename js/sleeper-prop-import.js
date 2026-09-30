// Sleeper board text -> reviewable sportsbook props.
//
// Sleeper does not publish Player Picks through its documented API. This
// parser only handles text the commissioner deliberately pastes (or text
// produced locally from an uploaded screenshot); it never crawls Sleeper.

export const PROP_STATS = [
  { key: "pass_yd", label: "Passing yards", aliases: ["passing yards", "pass yards", "pass yds"] },
  { key: "pass_td", label: "Passing TDs", aliases: ["passing touchdowns", "passing tds", "pass touchdowns", "pass tds"] },
  { key: "rush_yd", label: "Rushing yards", aliases: ["rushing yards", "rush yards", "rush yds"] },
  { key: "rec_yd", label: "Receiving yards", aliases: ["receiving yards", "rec yards", "rec yds"] },
  { key: "rec", label: "Receptions", aliases: ["receptions", "reception"] },
  { key: "rush_rec_yd", label: "Rushing + receiving yards", aliases: ["rushing + receiving yards", "rush + rec yards", "rush rec yards", "rushing and receiving yards"] },
  { key: "pass_rush_yd", label: "Passing + rushing yards", aliases: ["passing + rushing yards", "pass + rush yards", "pass rush yards", "passing and rushing yards"] },
  { key: "rush_rec_td", label: "Rushing + receiving TDs", aliases: ["rushing + receiving touchdowns", "rushing + receiving tds", "rush + rec tds", "rush rec tds", "touchdowns"] },
  { key: "fantasy_points_ppr", label: "Fantasy points", aliases: ["fantasy points", "fantasy score", "ppr fantasy points"] },
];

const clean = value => String(value || "").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
export const normalizedPlayerName = value => clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const lineNumber = value => {
  const match = clean(value).replace(/,/g, "").match(/(?:^|\s)(\d{1,4}(?:\.\d+)?)(?:\s|$)/);
  const number = match ? Number(match[1]) : NaN;
  return Number.isFinite(number) ? number : null;
};
const statOf = value => {
  const source = clean(value).toLowerCase().replace(/\s*&\s*/g, " + ");
  return PROP_STATS.find(stat => stat.aliases.some(alias => source.includes(alias))) || null;
};
const noise = value => /^(higher|lower|more|less|over|under|pick|picks|popular|trending|flex|sun|mon|thu|today|tomorrow)$/i.test(clean(value))
  || /^(qb|rb|wr|te|k)\s*[-·|]\s*[a-z]{2,3}$/i.test(clean(value))
  || /^[a-z]{2,3}\s*[-·|]\s*(qb|rb|wr|te|k)$/i.test(clean(value));
const looksLikeName = value => {
  const text = clean(value);
  return text.length >= 4 && text.length <= 48 && /^[A-Za-z.'’\- ]+$/.test(text)
    && !noise(text) && !statOf(text) && lineNumber(text) === null;
};

function delimited(text) {
  const rows = [];
  for (const raw of String(text || "").split(/\r?\n/)) {
    const fields = raw.split(/\t|\s*\|\s*|\s*,\s*/).map(clean).filter(Boolean);
    if (fields.length < 3) continue;
    const statIndex = fields.findIndex(field => statOf(field));
    const numberIndex = fields.findIndex(field => lineNumber(field) !== null);
    if (statIndex < 0 || numberIndex < 0) continue;
    const name = fields.find((field, index) => index !== statIndex && index !== numberIndex && looksLikeName(field));
    if (name) rows.push({ playerName: name, statKey: statOf(fields[statIndex]).key, statLabel: statOf(fields[statIndex]).label, line: lineNumber(fields[numberIndex]) });
  }
  return rows;
}

/**
 * Accepts either one prop per delimited line or loose OCR-style blocks.
 * Loose blocks may put the stat or the number first; the nearest plausible
 * player name above the pair wins. Every row remains editable before import.
 */
export function parseSleeperProps(text) {
  const direct = delimited(text);
  if (direct.length) return unique(direct);
  const lines = String(text || "").split(/\r?\n/).map(clean).filter(Boolean);
  const rows = [];
  for (let index = 0; index < lines.length; index++) {
    const stat = statOf(lines[index]);
    if (!stat) continue;
    let number = null;
    for (let offset = -2; offset <= 3; offset++) {
      if (!offset || !lines[index + offset]) continue;
      number = lineNumber(lines[index + offset]);
      if (number !== null) break;
    }
    if (number === null) continue;
    let playerName = "";
    for (let cursor = index - 1; cursor >= Math.max(0, index - 5); cursor--) {
      if (looksLikeName(lines[cursor])) { playerName = lines[cursor]; break; }
    }
    if (!playerName) {
      for (let cursor = index + 1; cursor <= Math.min(lines.length - 1, index + 4); cursor++) {
        if (looksLikeName(lines[cursor])) { playerName = lines[cursor]; break; }
      }
    }
    if (playerName) rows.push({ playerName, statKey: stat.key, statLabel: stat.label, line: number });
  }
  return unique(rows);
}

function unique(rows) {
  const seen = new Set();
  return rows.filter(row => {
    const key = `${normalizedPlayerName(row.playerName)}:${row.statKey}:${row.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveImportedProps(rows, players, games = []) {
  const byName = new Map();
  for (const [playerId, player] of Object.entries(players || {})) {
    const key = normalizedPlayerName(player?.n);
    if (key) byName.set(key, { playerId: String(playerId), ...player });
  }
  const teamKey = value => ({ WAS: "WSH", JAC: "JAX", LA: "LAR" }[String(value || "").toUpperCase()] || String(value || "").toUpperCase());
  const gameByTeam = new Map();
  for (const game of games || []) {
    gameByTeam.set(teamKey(game.away_team_id), game);
    gameByTeam.set(teamKey(game.home_team_id), game);
  }
  return (rows || []).map(row => {
    const wanted = normalizedPlayerName(row.playerName);
    let player = byName.get(wanted);
    if (!player && wanted.length >= 6) {
      const near = [...byName.entries()].filter(([name]) => name.startsWith(wanted) || wanted.startsWith(name));
      if (near.length === 1) player = near[0][1];
    }
    const game = player ? gameByTeam.get(teamKey(player.t)) : null;
    return { ...row, playerId: player?.playerId || "", playerName: player?.n || row.playerName,
      position: player?.p || "", team: player?.t || "", closesAt: game?.starts_at || "" };
  });
}
