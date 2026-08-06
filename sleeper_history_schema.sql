-- =====================================================================
-- DFL HQ - make the Sleeper history a proper record book
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Additive: only adds columns. No data is dropped, no season is touched,
-- and the admin password is not affected. Safe to re-run.
--
-- After running this, press "Sync Sleeper Data" once. The sync backfills
-- every new column for all seasons.
--
-- WHY THESE COLUMNS EXIST
--
-- Team names change every year. "Wolf Hunters" in 2019 is "Average Joe's
-- Hoes" in 2026 - same owner, same Sleeper user id. Storing one name per
-- person cannot represent that, so each season's name is now snapshotted
-- on that season's roster and standings rows.
--
-- The owner's Sleeper user id remains the permanent key that ties a
-- profile to its rosters, standings and matchups. Names are display data
-- only and are never used for matching.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Per-season snapshots on rosters
-- ---------------------------------------------------------------------
alter table public.sleeper_rosters
  add column if not exists league_id    text,
  add column if not exists team_name    text not null default '',
  add column if not exists display_name text not null default '';


-- ---------------------------------------------------------------------
-- 2. Standings carry the league and the name used that year, so a
--    season table can be drawn without joining anything.
-- ---------------------------------------------------------------------
alter table public.sleeper_standings
  add column if not exists league_id text,
  add column if not exists team_name text not null default '';


-- ---------------------------------------------------------------------
-- 3. Matchups: which league (season) they belong to
-- ---------------------------------------------------------------------
alter table public.sleeper_matchups
  add column if not exists league_id text;


-- ---------------------------------------------------------------------
-- 4. Champions by ROSTER as well as by user.
--
--    The 2019 title was won by a roster whose Sleeper account has since
--    been deleted (that league has 12 rosters but only 11 users), so
--    champion_user_id is null and the season looked like it was missing.
--    Recording the roster means the winning team name still shows.
-- ---------------------------------------------------------------------
alter table public.sleeper_leagues
  add column if not exists champion_roster_id  int,
  add column if not exists runner_up_roster_id int;


-- ---------------------------------------------------------------------
-- 5. Which season did sleeper_users.team_name come from?
--    Purely informational, but it makes a stale "current" name obvious.
-- ---------------------------------------------------------------------
alter table public.sleeper_users
  add column if not exists current_season int;


create index if not exists idx_sl_rosters_user   on public.sleeper_rosters(sleeper_user_id);
create index if not exists idx_sl_matchups_users on public.sleeper_matchups(user1, user2);

-- Row Level Security policies already cover these tables; adding columns
-- does not change them.
