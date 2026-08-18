-- =====================================================================
-- DFL HQ - The DRAFT: which round every player actually went in
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Additive and safe to re-run. Run this AFTER sleeper_schema.sql.
--
-- WHY
--   The Keeper Advisor needs one fact the app did not have: the round a
--   player was drafted in, in THIS league. Everything else about a keeper
--   decision is either already here (who is on your roster, from
--   sleeper_rosters) or is not knowable from data we hold.
--
--   Sleeper publishes it. Verified against the live API for this league on
--   the 2020-2025 chain: /league/<id>/drafts gives one draft per season and
--   /draft/<draft_id>/picks gives 180 picks each - fifteen rounds, twelve
--   teams - with player_id, round, pick_no, draft_slot, roster_id and
--   picked_by (a Sleeper USER id, which is what members.sleeper_user_id
--   holds). No new provider, no scraping, no key.
--
--   2019 returns zero picks (the league's first year was not drafted on
--   Sleeper) and the 2026 draft exists but is still pre_draft, so it has
--   none yet. Both are normal and the advisor says so rather than guessing.
--
-- WHAT THIS DOES NOT STORE
--   The raw pick payload. Every pick carries a `metadata` blob repeating
--   the player's name, team, position and injury status, and `reactions`.
--   Names come from the Sleeper player map the app already caches, so
--   storing them again would be a second copy that goes stale on its own.
--   Only the stable draft facts are kept.
--
-- WHAT THIS DOES NOT DO
--   It does not record a keeper COST. This league does not use Sleeper's
--   keeper mechanism - `is_keeper` is null on all 1080 picks on record - and
--   the cost rule is not in the rules table. The column below exists to
--   carry Sleeper's flag faithfully if the league ever starts using it, and
--   the advisor treats an unknown cost as unknown. See js/keeper-advisor.js.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. One row per pick
--    Keyed on (season, pick_no): a draft has exactly one pick at each
--    overall number, so re-syncing a season updates its own rows and can
--    never touch another year. draft_id is carried for traceability back
--    to the Sleeper draft the row came from.
-- ---------------------------------------------------------------------

create table if not exists public.sleeper_draft_picks (
  id                bigint generated always as identity primary key,
  season            int  not null,
  draft_id          text not null,
  pick_no           int  not null,          -- overall, 1-based
  round             int  not null,
  draft_slot        int,                    -- the column of the board
  player_id         text not null,          -- Sleeper player id
  roster_id         int,                    -- the roster that ended up with it
  sleeper_user_id   text,                   -- picked_by; null on a deleted account
  is_keeper         boolean,                -- Sleeper's own flag; null here
  synced_at         timestamptz not null default now(),
  unique (season, pick_no)
);

create index if not exists idx_draft_picks_player  on public.sleeper_draft_picks(player_id);
create index if not exists idx_draft_picks_owner   on public.sleeper_draft_picks(sleeper_user_id);
create index if not exists idx_draft_picks_season  on public.sleeper_draft_picks(season);


-- ---------------------------------------------------------------------
-- 2. How many keepers the league allows, per season
--    Sleeper knows this: league.settings.max_keepers, which reads 1 for
--    every DFL season on record. It is a real current setting rather than
--    something the app should be guessing or hard-coding, so the sync
--    stores it beside the rest of the season's configuration.
-- ---------------------------------------------------------------------

alter table public.sleeper_leagues
  add column if not exists max_keepers int;


-- ---------------------------------------------------------------------
-- 3. Row Level Security
--    Same shape as every other Sleeper table: the league reads it, only an
--    admin writes it, and the writer is sync.js running under the admin
--    client.
-- ---------------------------------------------------------------------

alter table public.sleeper_draft_picks enable row level security;

drop policy if exists "public read" on public.sleeper_draft_picks;
drop policy if exists "admin write" on public.sleeper_draft_picks;

create policy "public read" on public.sleeper_draft_picks
  for select using (true);

create policy "admin write" on public.sleeper_draft_picks
  for all using (public.is_admin()) with check (public.is_admin());
