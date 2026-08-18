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

  const counts = { seasons: 0, users: 0, rosters: 0, matchups: 0, transactions: 0, draftPicks: 0 };

  // ---- 1. Walk the chain and collect every league first ----
  const chain = [];
  let currentId = String(leagueId).trim();
  let guard = 0;

  while (currentId && guard++ < MAX_SEASONS) {
    const league = await sleeper.league(currentId);
    if (!league) {
      if (guard === 1) throw new Error(`Sleeper has no league with ID ${currentId}. Double-check the ID.`);
      log(`Chain ended at ${currentId}.`);
      break;
    }
    chain.push(league);
    log(`Found ${league.season}: ${league.name}`);
    currentId = league.previous_league_id || null;
  }

  if (guard >= MAX_SEASONS) {
    log(`Stopped after ${MAX_SEASONS} seasons — raise MAX_SEASONS if the league is older.`);
  }

  // ---- 2. Sync OLDEST FIRST ----
  // The order matters. sleeper_users holds one row per person with their
  // CURRENT team name, and each season's sync writes it. Running newest
  // first meant the oldest season had the last word, so everybody's
  // "current" team was really their 2019 team. Oldest first means the
  // newest season wins, which is what "current" should mean.
  chain.sort((a, b) => Number(a.season) - Number(b.season));

  const seasons = [];
  for (const league of chain) {
    const season = Number(league.season);
    log(`— syncing ${season}…`);

    const seasonCounts = await syncSeason(league, season, log);
    counts.users        += seasonCounts.users;
    counts.rosters      += seasonCounts.rosters;
    counts.matchups     += seasonCounts.matchups;
    counts.transactions += seasonCounts.transactions;
    counts.draftPicks   += seasonCounts.draftPicks;
    counts.seasons++;
    seasons.push(season);
  }
  seasons.reverse();   // report newest first

  await refreshMemberTeamNames(log);

  await db().from("sleeper_config").update({
    sleeper_league_id: String(leagueId).trim(),
    last_synced_at:    new Date().toISOString(),
    last_sync_note:    `${counts.seasons} season(s): ${seasons.join(", ")}`,
  }).eq("id", 1);

  log(`Done. ${counts.seasons} season(s) synced.`);
  return { seasons, counts };
}

/**
 * Bring member profiles back in step with Sleeper's current team names.
 *
 * members.team_name was originally seeded from sleeper_users, which at the
 * time held the OLDEST season's name. Fixing the sync alone does not undo
 * that: the profile shows the member row, so it would keep displaying a
 * 2019 team forever.
 *
 * A name is only replaced when it is blank, or when it matches a team name
 * this owner used in some earlier season - i.e. it is stale imported data.
 * A name an admin typed by hand matches nothing historical and is left
 * alone, so custom names are never clobbered by a sync.
 */
async function refreshMemberTeamNames(log) {
  const [membersRes, usersRes, rostersRes] = await Promise.all([
    db().from("members").select("id, display_name, team_name, sleeper_user_id"),
    db().from("sleeper_users").select("sleeper_user_id, team_name"),
    db().from("sleeper_rosters").select("sleeper_user_id, team_name"),
  ]);

  if (membersRes.error || usersRes.error) return;   // members table is optional

  const currentName = new Map(
    (usersRes.data || []).map((u) => [u.sleeper_user_id, u.team_name || ""]));

  // every name each owner has ever used, to spot stale imported values
  const usedBefore = new Map();
  for (const r of rostersRes.data || []) {
    if (!r.sleeper_user_id || !r.team_name) continue;
    if (!usedBefore.has(r.sleeper_user_id)) usedBefore.set(r.sleeper_user_id, new Set());
    usedBefore.get(r.sleeper_user_id).add(r.team_name);
  }

  let changed = 0;
  for (const m of membersRes.data || []) {
    if (!m.sleeper_user_id) continue;

    const current = currentName.get(m.sleeper_user_id);
    if (!current || current === m.team_name) continue;

    const stale = !m.team_name || (usedBefore.get(m.sleeper_user_id)?.has(m.team_name) ?? false);
    if (!stale) continue;                      // admin typed it: leave it

    const { error } = await db().from("members")
      .update({ team_name: current }).eq("id", m.id);
    if (!error) changed++;
  }

  if (changed) log(`Updated ${changed} member team name(s) to the current season.`);
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

  // What each owner called themselves THIS season. Looked up by Sleeper
  // user id - never by name, because names are exactly what changes.
  const seasonNames = new Map((users || []).map((u) => [u.user_id, {
    team:    u.metadata?.team_name || "",
    display: u.display_name || u.username || "",
  }]));
  const nameFor = (userId) => seasonNames.get(userId) || { team: "", display: "" };

  // ---- people ----
  // One row per person holding their CURRENT identity. Because seasons are
  // synced oldest first, the newest season is the last to write here.
  if (users?.length) {
    await upsert("sleeper_users", users.map((u) => ({
      sleeper_user_id: u.user_id,
      username:        u.username || "",
      display_name:    u.display_name || u.username || "",
      team_name:       u.metadata?.team_name || "",
      avatar:          u.avatar || null,
      current_season:  season,
      updated_at:      new Date().toISOString(),
    })), "sleeper_user_id");
    counts.users = users.length;
  }

  // ---- rosters + standings ----
  // Both carry a snapshot of the name used that year, so history keeps
  // showing "Wolf Hunters" for 2019 even after the owner renames the team.
  if (rosters?.length) {
    await upsert("sleeper_rosters", rosters.map((r) => ({
      season,
      league_id:       leagueId,
      roster_id:       r.roster_id,
      sleeper_user_id: r.owner_id || null,
      team_name:       nameFor(r.owner_id).team,
      display_name:    nameFor(r.owner_id).display,
      players:         r.players  || [],
      starters:        r.starters || [],
      synced_at:       new Date().toISOString(),
    })), "season,roster_id");

    await upsert("sleeper_standings",
      buildStandings(rosters, season, league, leagueId, nameFor), "season,roster_id");
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
    /* Sleeper's own answer to "how many can I keep", rather than the app
       guessing or hard-coding one. Reads 1 for every DFL season on record. */
    max_keepers:        league.settings?.max_keepers ?? null,
    previous_league_id: league.previous_league_id || null,
    champion_user_id:   championRoster != null ? ownerOf.get(championRoster) ?? null : null,
    runner_up_user_id:  runnerUpRoster != null ? ownerOf.get(runnerUpRoster) ?? null : null,
    // Kept as well as the user id: a winner whose Sleeper account was
    // later deleted has no owner, and without this the season looks like
    // it has no champion at all. The roster still names the team.
    champion_roster_id:  championRoster ?? null,
    runner_up_roster_id: runnerUpRoster ?? null,
    synced_at:          new Date().toISOString(),
  }], "sleeper_league_id");

  // ---- weekly matchups and transactions ----
  const weeks = range(1, MAX_WEEK);

  const matchupRows = [];
  await inBatches(weeks, CONCURRENCY, async (week) => {
    const raw = await sleeper.matchups(leagueId, week);
    const rows = pairMatchups(raw, season, week, ownerOf, leagueId);
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

  counts.draftPicks = await syncDraft(leagueId, season, log);

  return counts;
}

/*
  THE DRAFT, for the one fact the Keeper Advisor cannot get anywhere else:
  the round a player actually went in, in this league.

  Deliberately quiet about the two normal ways this comes back empty. A
  season with no draft on Sleeper (2019, the league's first year) and a draft
  that has not happened yet (2026, still pre_draft) both give zero picks, and
  neither is a failure worth stopping a sync over - the advisor reads an
  absent round as absent and says so.

  Nothing is deleted. Upserting on (season, pick_no) means re-syncing a
  season rewrites only its own board, exactly like every other table here.
*/
async function syncDraft(leagueId, season, log) {
  let drafts;
  try {
    drafts = await sleeper.drafts(leagueId);
  } catch (err) {
    log(`   no draft data for ${season} (${err.message})`);
    return 0;
  }
  if (!drafts?.length) return 0;

  let written = 0;
  for (const draft of drafts) {
    const picks = await sleeper.draftPicks(draft.draft_id).catch(() => null);
    if (!picks?.length) continue;

    const rows = picks
      /* A pick with no player is an unmade pick on a board still in
         progress. There is nothing to record about it. */
      .filter((p) => p.player_id != null && p.round != null && p.pick_no != null)
      .map((p) => ({
        season,
        draft_id:        String(draft.draft_id),
        pick_no:         Number(p.pick_no),
        round:           Number(p.round),
        draft_slot:      p.draft_slot ?? null,
        player_id:       String(p.player_id),
        roster_id:       p.roster_id ?? null,
        sleeper_user_id: p.picked_by || null,
        /* Carried faithfully. It is null on all 1080 DFL picks on record -
           this league runs keepers by hand - and the advisor treats a null
           as "not stated" rather than as "not a keeper". */
        is_keeper:       p.is_keeper ?? null,
        synced_at:       new Date().toISOString(),
      }));

    if (!rows.length) continue;
    await upsert("sleeper_draft_picks", rows, "season,pick_no");
    written += rows.length;
  }

  if (written) log(`   ${written} draft picks`);
  return written;
}

// ---------------------------------------------------------------------
// Shaping helpers
// ---------------------------------------------------------------------

/** Standings rows, ranked, with playoff qualification worked out. */
function buildStandings(rosters, season, league, leagueId, nameFor) {
  const playoffTeams = league.settings?.playoff_teams ?? 0;

  const rows = rosters.map((r) => {
    const s = r.settings || {};
    return {
      season,
      league_id:       leagueId,
      roster_id:       r.roster_id,
      sleeper_user_id: r.owner_id || null,
      team_name:       nameFor(r.owner_id).team,
      wins:            s.wins   || 0,
      losses:          s.losses || 0,
      ties:            s.ties   || 0,
      points_for:      points(s.fpts,         s.fpts_decimal),
      points_against:  points(s.fpts_against, s.fpts_against_decimal),
    };
  });

  // A season nobody has played yet has no standings. Ranking twelve 0-0
  // teams by nothing, and flagging half of them as playoff bound, would be
  // pure fiction - so leave rank empty until games have happened.
  const played = rows.some((r) => r.wins + r.losses + r.ties > 0);
  if (!played) {
    rows.forEach((row) => { row.rank = null; row.made_playoffs = false; });
    return rows;
  }

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
function pairMatchups(raw, season, week, ownerOf, leagueId) {
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
      season, week, matchup_id: matchupId, league_id: leagueId,
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
