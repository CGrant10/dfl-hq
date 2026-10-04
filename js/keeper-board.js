import {keeperShareSpec} from './share-export-model.js';
import {editorialShareCanvas} from './share-editorial.js';
import {drawShareFrame,drawShareFooter} from "./share-card-style.js";
// =====================================================================
// keeper-board.js - the whole league's keepers, as one picture
// ---------------------------------------------------------------------
// WHAT THIS IS FOR
//
// Keeper season is the one week a year the league argues in the group chat,
// and the argument needs a reference everybody can see. A screenshot of the
// Keepers page is a screenshot: it carries the app's chrome, the year tabs
// and whatever was scrolled into view. This is a purpose-built board -
// twelve rows, one per member, in the Medicine identity.
//
// THE RULE THAT SHAPES THE LAYOUT
//
// EVERY MEMBER APPEARS, whether they have submitted or not. A board that
// silently omits the four people who have not decided looks complete when it
// is not, and "who still owes a keeper" is precisely the question the board
// is being sent to answer. A member with nothing shows an understated
// "No keeper submitted" and is not styled as an error.
//
// IT SHOWS WHAT IT HAS, AND NEVER HIDES A ROW IT CANNOT ENRICH
//
//   new rows      carry player_id, so position and NFL team are looked up
//                 from the Sleeper map and printed beside the name
//   legacy rows   are the 2026 nickname rows ("Puka", "JJettas", one literal
//                 "NA"). They have no player_id and never will. They print
//                 exactly as typed with their stored round, because a keeper
//                 the commissioner recorded is on the board whether or not
//                 the app can resolve it.
//
// SYNCHRONOUS, LIKE EVERY OTHER SHARE PATH. Safari refuses navigator.share()
// if it is not called in the same task as the tap, and an await ends the
// task - so the caller passes data in and this only ever draws. See the
// header of share.js.
//
// IT REUSES THE EXISTING HELPERS rather than starting a second image system:
// roundRect(), fitText(), crestImage() and shareCanvas() from share.js, the
// palette from brand-ink.js, the 1080x1350 4:5 frame every other DFL card
// uses so a keeper board and a golf board look like the same league.
// =====================================================================

import { FONT, roundRect, fitText, shareCanvas, shareText } from "./share.js";
import { SHARE_INK } from "./brand-ink.js";
import { describeRules, keeperTenure } from "./keeper-rules.js";

const W = 1080, H = 1350;
const { BG, CARD, LINE, INK, MUTED, GOLD, ACCENT, BRAND_RED, BRAND_YELLOW } = SHARE_INK;

/**
 * Fold the page's data into exactly what the board draws.
 *
 * Kept separate from the painting so it can be reasoned about (and read in a
 * test) without a canvas: the ordering rule, the enrichment and the
 * "submitted / not submitted" split all live here.
 *
 * @param {Object} input
 * @param {number} input.season
 * @param {Object[]} input.members     canonical league members, in league order
 * @param {Object[]} input.keeperRows  rows from `keepers` for any season
 * @param {Object} [input.players]     the Sleeper player map {id:{n,p,t}}
 * @param {Object} [input.rules]       a validated keeper rule set, or null
 */
export function boardData({ season, members = [], keeperRows = [], players = {}, rules = null }) {
  const year = Number(season);
  const mine = (keeperRows || []).filter((r) => Number(r.year ?? r.season) === year);

  /*
    MATCHED BY member_id WHERE THERE IS ONE, and by the stored `team` string
    only as a fallback - because that is the only handle the legacy rows have.
    The fallback is a display-time join for a board, not identity: nothing is
    written and nothing downstream keys off it. A row that matches nobody is
    still shown, under "Also recorded", rather than dropped.
  */
  const byMember = new Map(members.map((m) => [String(m.id), []]));
  const nameKey = new Map();
  for (const m of members) {
    for (const label of [m.team_name, m.display_name]) {
      if (label) nameKey.set(String(label).trim().toLowerCase(), String(m.id));
    }
  }

  /*
    A LAST RESORT FOR THE LEGACY ROWS, and it is deliberately narrow.

    Those rows hold a first name in `team` - "Shey", "Cole" - against member
    display names like "sheyg2014". An exact match never fires, so on a board
    that member reads "No keeper submitted" while their keeper sits at the
    bottom under "Also recorded", which is a worse answer than the truth.

    So a stored name is also accepted as an UNAMBIGUOUS PREFIX of exactly one
    member's name. Two members it could be is not a match, and neither is
    anything under three characters. This is a display-time join for one
    picture: nothing is written, nothing keys off it, and priorKeeperSeasons()
    still refuses to count these rows - see keeper-rules.js. Tenure being
    wrong makes somebody ineligible; a board being generous does not.
  */
  const prefixMatch = (label) => {
    const q = String(label || "").trim().toLowerCase();
    if (q.length < 3) return null;
    const hits = members.filter((m) =>
      [m.display_name, m.team_name].some((v) =>
        String(v || "").trim().toLowerCase().startsWith(q)));
    return hits.length === 1 ? String(hits[0].id) : null;
  };

  const orphans = [];
  for (const row of mine) {
    let key = row.member_id != null ? String(row.member_id) : null;
    if (!key || !byMember.has(key)) {
      const label = String(row.team || "").trim().toLowerCase();
      key = nameKey.get(label) || prefixMatch(label);
    }
    if (key && byMember.has(key)) byMember.get(key).push(row);
    else orphans.push(row);
  }

  const maxKeeperSeasons = rules?.max_keeper_seasons ?? null;

  const entryOf = (row) => {
    const meta = row.player_id != null ? players[String(row.player_id)] : null;
    /* The snapshot columns beat the live map: they are what the player was on
       the day, which is the honest thing on a historical board. */
    const position = row.player_pos || meta?.p || "";
    const nflTeam = row.player_team || meta?.t || "";
    return {
      id: row.player_id == null ? '' : String(row.player_id), position,
      name: row.player_name || row.player || "—",
      where: [position, nflTeam].filter((v) => v && v !== "FA").join(" · "),
      round: row.round_cost == null ? null : Number(row.round_cost),
      legacy: row.player_id == null,
      overridden: row.round_overridden === true,
      /* The hold, for the board. Computed from the same keeper rows the board
         was built from, so a shared image and the page cannot disagree about
         how long somebody has had a player. Legacy rows carry no player_id and
         therefore no countable history - they get no counter rather than a
         wrong one. */
      tenure: row.player_id == null ? null : keeperTenure(keeperRows, {
        playerId: row.player_id, memberId: row.member_id,
        season: year, max: maxKeeperSeasons,
      }),
    };
  };

  const rows = members.map((m) => ({
    member: m.display_name || "",
    team: m.team_name || "",
    keepers: (byMember.get(String(m.id)) || []).map(entryOf),
  }));

  return {
    season: year,
    rows,
    also: orphans.map(entryOf),
    submitted: rows.filter((r) => r.keepers.length).length,
    total: rows.length,
    /* Omitted rather than truncated if it will not fit - see draw(). */
    rulesLine: describeRules(rules),
  };
}

/** The one-line text that goes with the image on platforms that want words. */
export function boardText(board) {
  if (!board) return "";
  const head = `DFL ${board.season} keepers — ${board.submitted} of ${board.total} submitted`;
  const lines = board.rows.map((r) => {
    const who = r.team || r.member;
    if (!r.keepers.length) return `${who}: no keeper submitted`;
    return `${who}: ${r.keepers.map((k) => {
      const cost = k.round != null ? ` (R${k.round})` : "";
      const held = k.tenure?.max ? ` yr ${k.tenure.year}/${k.tenure.max}` : "";
      return `${k.name}${cost}${held}`;
    }).join(", ")}`;
  });
  return [head, ...lines].join("\n");
}

/**
 * The board.
 *
 * ONE VERTICAL BUDGET, divided by the number of members, so a twelve-team
 * league and a six-team league both fill the card instead of one of them
 * running off the bottom. Row height is computed, never assumed.
 */
export function boardCanvas(board) {
 return editorialShareCanvas(keeperShareSpec(board));
}

/**
 * Share it. MUST be called straight from the click handler.
 * @returns {string} a message worth putting in a toast
 */
export function shareKeeperBoard(board) {
  if (!board || !board.total) {
    return shareText({ title: "DFL HQ — Keepers", text: boardText(board), url: location.href })
      === "copied" ? "Copied to the clipboard" : "Sharing…";
  }
  try {
    const canvas = boardCanvas(board);
    const how = shareCanvas(canvas, `dfl-keepers-${board.season}.png`, {
      title: `DFL HQ — ${board.season} keepers`,
      text: boardText(board),
    });
    return how === "saved" ? "Saved the keeper board to your downloads" : "Sharing…";
  } catch (err) {
    /* A board that arrives as words beats a button that does nothing. */
    console.warn("keeper board: falling back to text", err);
    return shareText({ title: `DFL HQ — ${board.season} keepers`,
                       text: boardText(board), url: location.href })
      === "copied" ? "Copied to the clipboard" : "Sharing…";
  }
}
