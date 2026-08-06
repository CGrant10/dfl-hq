-- =====================================================================
-- DFL HQ - Sleeper integration tables
-- ---------------------------------------------------------------------
-- HOW TO RUN:
--   Supabase -> SQL Editor -> New query -> paste this whole file -> Run.
--
-- This file is ADDITIVE. It only creates new tables and does not touch
-- anything from schema.sql, so running it will NOT reset your admin
-- password. Safe to re-run at any time.
--
-- Everything here is filled in automatically by the "Sync Sleeper Data"
-- button on the Admin page. The one exception is owner_profiles, which is
-- the hand-written half of an owner profile (nickname, notes, awards).
--
-- Security: same rule as the rest of the app - everyone can read, only
-- the admin can write. Enforced by the is_admin() function in schema.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Which Sleeper league are we following, and when did we last sync?
--    Single row, id is always 1.
-- ---------------------------------------------------------------------
create table if not exists public.sleeper_config (
  id                 int primary key default 1,
  sleeper_league_id  text not null default '',
  last_synced_at     timestamptz,
  last_sync_note     text not null default '',
  constraint sleeper_config_single_row check (id = 1)
);

insert into public.sleeper_config (id) values (1) on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 2. One row per SEASON. Sleeper creates a brand new league id every
--    year and links back with previous_league_id, so walking that chain
--    is how we pick up history.
-- ---------------------------------------------------------------------
create table if not exists public.sleeper_leagues (
  id                   bigint generated always as identity primary key,
  sleeper_league_id    text not null unique,
  season               int not null,
  name                 text not null default '',
  status               text not null default '',
  scoring_settings     jsonb not null default '{}'::jsonb,
  playoff_teams        int,
  previous_league_id   text,
  champion_user_id     text,          -- from the playoff bracket
  runner_up_user_id    text,
  synced_at            timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 3. People. A Sleeper user id is global, so this is one row per human
--    no matter how many seasons they have played.
-- ---------------------------------------------------------------------
create table if not exists public.sleeper_users (
  id                bigint generated always as identity primary key,
  sleeper_user_id   text not null unique,
  username          text not null default '',
  display_name      text not null default '',
  team_name         text not null default '',
  avatar            text,
  updated_at        timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 4. Roster contents, per season.
-- ---------------------------------------------------------------------
create table if not exists public.sleeper_rosters (
  id               bigint generated always as identity primary key,
  season           int not null,
  roster_id        int not null,
  sleeper_user_id  text,
  players          jsonb not null default '[]'::jsonb,   -- all player ids
  starters         jsonb not null default '[]'::jsonb,   -- starting lineup ids
  synced_at        timestamptz not null default now(),
  unique (season, roster_id)
);


-- ---------------------------------------------------------------------
-- 5. Final (or current) standings, per season.
--    rank and made_playoffs are worked out during the sync, because that
--    is the only time we know how many playoff spots that season had.
-- ---------------------------------------------------------------------
create table if not exists public.sleeper_standings (
  id               bigint generated always as identity primary key,
  season           int not null,
  roster_id        int not null,
  sleeper_user_id  text,
  wins             int not null default 0,
  losses           int not null default 0,
  ties             int not null default 0,
  points_for       numeric(10,2) not null default 0,
  points_against   numeric(10,2) not null default 0,
  rank             int,
  made_playoffs    boolean not null default false,
  unique (season, roster_id)
);


-- ---------------------------------------------------------------------
-- 6. Weekly head to head results.
-- ---------------------------------------------------------------------
create table if not exists public.sleeper_matchups (
  id                bigint generated always as identity primary key,
  season            int not null,
  week              int not null,
  matchup_id        int not null,
  roster1           int,
  user1             text,
  score1            numeric(10,2),
  roster2           int,
  user2             text,
  score2            numeric(10,2),
  winner_roster_id  int,               -- null on a tie
  unique (season, week, matchup_id)
);


-- ---------------------------------------------------------------------
-- 7. Trades, waiver claims and free agent pickups.
--    The full Sleeper payload is kept in details so nothing is lost.
-- ---------------------------------------------------------------------
create table if not exists public.sleeper_transactions (
  id                      bigint generated always as identity primary key,
  sleeper_transaction_id  text not null unique,
  season                  int not null,
  week                    int,
  type                    text not null default '',   -- trade | waiver | free_agent
  status                  text not null default '',
  details                 jsonb not null default '{}'::jsonb,
  created_ms              bigint
);


-- ---------------------------------------------------------------------
-- 8. The hand written half of an owner profile. Sleeper knows the wins;
--    it does not know the nicknames or who still owes league dues.
-- ---------------------------------------------------------------------
create table if not exists public.owner_profiles (
  id               bigint generated always as identity primary key,
  sleeper_user_id  text not null unique,
  nickname         text not null default '',
  team_name        text not null default '',
  notes            text not null default '',
  created_at       timestamptz not null default now()
);


create index if not exists idx_sl_standings_user on public.sleeper_standings(sleeper_user_id);
create index if not exists idx_sl_standings_season on public.sleeper_standings(season);
create index if not exists idx_sl_matchups_season_week on public.sleeper_matchups(season, week);
create index if not exists idx_sl_tx_season on public.sleeper_transactions(season);
create index if not exists idx_sl_rosters_season on public.sleeper_rosters(season);


-- =====================================================================
-- 9. ROW LEVEL SECURITY
--    Everyone reads, only the admin writes. Same is_admin() check the
--    rest of the app uses, so a normal visitor cannot touch Sleeper data
--    even by calling the API directly.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'sleeper_config','sleeper_leagues','sleeper_users','sleeper_rosters',
    'sleeper_standings','sleeper_matchups','sleeper_transactions','owner_profiles'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);

    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format(
      'create policy "admin write" on public.%I for all using (public.is_admin()) with check (public.is_admin())',
      t);
  end loop;
end;
$$;
