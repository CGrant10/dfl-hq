// =====================================================================
// sync.js - pull everything out of Sleeper and store it in Supabase
// ---------------------------------------------------------------------
// Runs in the admin's browser. Every write goes through db(), which is
// the admin client, so the database itself rejects the whole thing if the
// admin password is not present.
//
// Two rules this file is built around:
//
//   1. NEVER DESTROY HISTORY. Every table is keyed by season (and week
//      where relevant) and written with upsert. Re-syncing 2026 updates
//      2026 rows and cannot touch 2025.
//
//   2. Sleeper makes a new league id every season and links backwards
//      with previous_league_id. Following that chain is how one click
//      picks up every year the league has existed.
// =====================================================================

import { db } from "./supabase.js";
import { sleeper } from "./sleeper.js";

const MAX_SEASONS = 20;   // stops a broken chain from looping forever
const MAX_WEEK    = 18;
const CONCURRENCY = 4;    // parallel week requests; polite to the API

/**
 * Sync the given league and every earlier season linked to it.
 * @param {string} leagueId  the most recent Sleeper league id
 * @param {(msg:string)=>void} log  progress callback for the UI
 * @returns {Promise<{seasons:number[], counts:object}>}
 */
export async function syncSleeper(leagueId, log = () => {}) {
  if (!leagueId) throw new Error("Enter a Sleeper league ID first.");

  const counts = { seasons: 0, users: 0, rosters: 0, matchups: 0, transactions: 0 };
  const seasons = [];

  let currentId = String(leagueId).trim();
  let guard = 0;

  while (currentId && guard++ < MAX_SEASONS) {
    log(`Fetching league ${currentId}…`);
    const league = await sleeper.league(currentId);

    if (!league) {
      if (guard === 1) throw new Error(`Sleeper has no league with ID ${currentId}. Double-check the ID.`);
      log(`Chain ended at ${currentId}.`);
      break;
    }

    const season = Number(league.season);
    log(`— ${season} season: ${league.name}`);

    const seasonCounts = await syncSeason(league, season, log);
    counts.users        += seasonCounts.users;
    counts.rosters      += seasonCounts.rosters;
    counts.matchups     += seasonCounts.matchups;
    counts.transactions += seasonCounts.transactions;
    counts.seasons++;
    seasons.push(season);

    currentId = league.previous_league_id || null;
  }

  await db().from("sleeper_config").update({
    sleeper_league_id: String(leagueId).trim(),
    last_synced_at:    new Date().toISOString(),
    last_sync_note:    `${counts.seasons} season(s): ${seasons.join(", ")}`,
  }).eq("id", 1);

  log(`Done. ${counts.seasons} season(s) synced.`);
  return { seasons, counts };
}

// ---------------------------------------------------------------------
// One season
// ---------------------------------------------------------------------

async function syncSeason(league, season, log) {
  const leagueId = league.league_id;
  const counts = { users: 0, rosters: 0, matchups: 0, transactions: 0 };

  const [users, rosters, bracket] = await Promise.all([
    sleeper.users(leagueId),
    sleeper.rosters(leagueId),
    sleeper.winnersBracket(leagueId).catch(() => null),
  ]);

  // roster_id -> owner user id, needed all over the place below
  const ownerOf = new Map((rosters || []).map((r) => [r.roster_id, r.owner_id]));

  // ---- people ----
  if (users?.length) {
    await upsert("sleeper_users", users.map((u) => ({
      sleeper_user_id: u.user_id,
      username:        u.username || "",
      display_name:    u.display_name || u.username || "",
      team_name:       u.metadata?.team_name || "",
      avatar:          u.avatar || null,
      updated_at:      new Date().toISOString(),
    })), "sleeper_user_id");
    counts.users = users.length;
  }

  // ---- rosters + standings ----
  if (rosters?.length) {
    await upsert("sleeper_rosters", rosters.map((r) => ({
      season,
      roster_id:       r.roster_id,
      sleeper_user_id: r.owner_id || null,
      players:         r.players  || [],
      starters:        r.starters || [],
      synced_at:       new Date().toISOString(),
    })), "season,roster_id");

    await upsert("sleeper_standings", buildStandings(rosters, season, league), "season,roster_id");
    counts.rosters = rosters.length;
  }

  // ---- champion / runner up from the playoff bracket ----
  const { championRoster, runnerUpRoster } = readBracket(bracket);

  await upsert("sleeper_leagues", [{
    sleeper_league_id:  leagueId,
    season,
    name:               league.name || "",
    status:             league.status || "",
    scoring_settings:   league.scoring_settings || {},
    playoff_teams:      league.settings?.playoff_teams ?? null,
    previous_league_id: league.previous_league_id || null,
    champion_user_id:   championRoster != null ? ownerOf.get(championRoster) ?? null : null,
    runner_up_user_id:  runnerUpRoster != null ? ownerOf.get(runnerUpRoster) ?? null : null,
    synced_at:          new Date().toISOString(),
  }], "sleeper_league_id");

  // ---- weekly matchups and transactions ----
  const weeks = range(1, MAX_WEEK);

  const matchupRows = [];
  await inBatches(weeks, CONCURRENCY, async (week) => {
    const raw = await sleeper.matchups(leagueId, week);
    const rows = pairMatchups(raw, season, week, ownerOf);
    if (rows.length) matchupRows.push(...rows);
  });
  if (matchupRows.length) {
    await upsert("sleeper_matchups", matchupRows, "season,week,matchup_id");
    counts.matchups = matchupRows.length;
    log(`   ${matchupRows.length} matchups`);
  }

  const txRows = [];
  await inBatches(weeks, CONCURRENCY, async (week) => {
    const raw = await sleeper.transactions(leagueId, week);
    for (const t of raw || []) {
      if (t.status === "failed") continue;         // rejected waiver claims
      txRows.push({
        sleeper_transaction_id: String(t.transaction_id),
        season,
        week:       t.leg ?? week,
        type:       t.type || "",
        status:     t.status || "",
        details:    t,
        created_ms: t.created ?? null,
      });
    }
  });
  if (txRows.length) {
    await upsert("sleeper_transactions", txRows, "sleeper_transaction_id");
    counts.transactions = txRows.length;
    log(`   ${txRows.length} transactions`);
  }

  return counts;
}

// ---------------------------------------------------------------------
// Shaping helpers
// ---------------------------------------------------------------------

/** Standings rows, ranked, with playoff qualification worked out. */
function buildStandings(rosters, season, league) {
  const playoffTeams = league.settings?.playoff_teams ?? 0;

  const rows = rosters.map((r) => {
    const s = r.settings || {};
    return {
      season,
      roster_id:       r.roster_id,
      sleeper_user_id: r.owner_id || null,
      wins:            s.wins   || 0,
      losses:          s.losses || 0,
      ties:            s.ties   || 0,
      points_for:      points(s.fpts,         s.fpts_decimal),
      points_against:  points(s.fpts_against, s.fpts_against_decimal),
    };
  });

  // Sleeper's own tiebreaker: record first, then points for.
  rows.sort((a, b) =>
    (b.wins - a.wins) || (a.losses - b.losses) || (b.points_for - a.points_for));

  rows.forEach((row, i) => {
    row.rank = i + 1;
    row.made_playoffs = playoffTeams > 0 && row.rank <= playoffTeams;
  });

  return rows;
}

/** Sleeper splits points into whole and decimal parts. */
function points(whole, decimal) {
  return Number(whole || 0) + Number(decimal || 0) / 100;
}

/**
 * Sleeper returns one entry per TEAM per week, tied together by
 * matchup_id. Fold each pair into a single row.
 * Weeks that have not been played yet (everyone on 0) are skipped, so we
 * do not fill the table with empty future weeks.
 */
function pairMatchups(raw, season, week, ownerOf) {
  if (!raw?.length) return [];
  if (!raw.some((m) => Number(m.points) > 0)) return [];   // not played yet

  const byMatchup = new Map();
  for (const m of raw) {
    if (m.matchup_id == null) continue;                    // bye / unmatched
    if (!byMatchup.has(m.matchup_id)) byMatchup.set(m.matchup_id, []);
    byMatchup.get(m.matchup_id).push(m);
  }

  const rows = [];
  for (const [matchupId, sides] of byMatchup) {
    const [a, b] = sides;
    const scoreA = a ? Number(a.points) : null;
    const scoreB = b ? Number(b.points) : null;

    let winner = null;
    if (scoreA != null && scoreB != null && scoreA !== scoreB) {
      winner = scoreA > scoreB ? a.roster_id : b.roster_id;
    }

    rows.push({
      season, week, matchup_id: matchupId,
      roster1: a?.roster_id ?? null,
      user1:   a ? ownerOf.get(a.roster_id) ?? null : null,
      score1:  scoreA,
      roster2: b?.roster_id ?? null,
      user2:   b ? ownerOf.get(b.roster_id) ?? null : null,
      score2:  scoreB,
      winner_roster_id: winner,
    });
  }
  return rows;
}

/**
 * The winners bracket is a list of games. The championship game is the
 * one marked p:1 ("playing for 1st"); fall back to the final round.
 */
function readBracket(bracket) {
  if (!bracket?.length) return { championRoster: null, runnerUpRoster: null };

  let final = bracket.find((g) => g.p === 1);
  if (!final) {
    const lastRound = Math.max(...bracket.map((g) => g.r || 0));
    final = bracket.find((g) => g.r === lastRound);
  }
  if (!final || final.w == null) return { championRoster: null, runnerUpRoster: null };

  return { championRoster: final.w, runnerUpRoster: final.l ?? null };
}

// ---------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------

/** Upsert in chunks so a big season does not blow up one request. */
async function upsert(table, rows, onConflict) {
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db()
      .from(table)
      .upsert(rows.slice(i, i + CHUNK), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

/** Run an async job over a list, a few at a time. */
async function inBatches(items, size, job) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(job));
  }
}

function range(from, to) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
