-- =====================================================================
-- DFL HQ - Keeper rules as CONFIGURATION, and keeper rows with identity
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Additive and safe to re-run. Run AFTER schema.sql, members_schema.sql and
-- sleeper_draft_schema.sql.
--
-- WHY
--   Until now the app had no machine-readable keeper rules. v1.105.0 tried to
--   recognise them by pattern-matching English in the `rules` table, which was
--   the only honest option at the time and is not a foundation: prose cannot
--   be validated, cannot be versioned per season, and cannot be presented to
--   the commissioner as controls.
--
--   The audit also established what must NOT be treated as authority: the
--   `rules` table prose (live table has no keeper rules at all), the old
--   schema.sql seed text, Sleeper's `max_keepers`, and Sleeper's `is_keeper`
--   flag (null on all 1080 DFL picks - this league runs keepers by hand).
--
--   So the commissioner's stated rules become structured data, and THIS table
--   is the source of truth for every future keeper calculation.
--
-- THE COMMISSIONER'S STATED RULES, seeded below as the 2026 configuration:
--   maximum tenure     3 keeper seasons
--   cost basis         the player's ORIGINAL qualifying DFL draft round
--   adjustment         1 round earlier
--   minimum            Round 1
--   progression        fixed from the original round; it does NOT compound
--
--   original R8 -> R7 in years 1, 2 and 3, then ineligible
--   original R2 -> R1        original R1 -> R1 (the floor holds)
--
-- WHAT THIS DELIBERATELY DOES NOT DO
--   It does not touch one existing keeper row. The legacy rows identify people
--   by first name ("Shawn", "Cim") and players by nickname ("Puka", "JJettas",
--   and one literal "NA"); nothing here tries to guess who they were. They
--   stay exactly as typed, and reliable identity begins with new rows.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Keeper rules, one row per EFFECTIVE SEASON
--    Season-aware so that changing 2027 cannot rewrite what 2026 decided.
--    The engine reads the newest row at or before the season it is deciding;
--    see configFor() in js/keeper-rules.js.
-- ---------------------------------------------------------------------

create table if not exists public.keeper_rules (
  id                  bigint generated always as identity primary key,
  -- the first season this configuration governs
  effective_season    int  not null unique,
  -- how many seasons one player may be kept in total
  max_keeper_seasons  int  not null default 3 check (max_keeper_seasons between 1 and 20),
  -- what the cost is measured from; only one basis is supported today
  cost_basis          text not null default 'original_draft_round'
                        check (cost_basis in ('original_draft_round')),
  -- how many rounds earlier than the basis the keeper costs
  round_adjustment    int  not null default 1 check (round_adjustment between 0 and 20),
  -- the earliest round a keeper can ever cost
  min_keeper_round    int  not null default 1 check (min_keeper_round between 1 and 40),
  -- 'fixed_from_original' = same cost every keeper year (the DFL rule)
  -- 'escalates_per_year'  = the adjustment applies again each year
  progression         text not null default 'fixed_from_original'
                        check (progression in ('fixed_from_original', 'escalates_per_year')),
  notes               text not null default '',
  updated_at          timestamptz not null default now()
);

-- The commissioner's current rules. ON CONFLICT DO NOTHING so re-running this
-- file never overwrites a configuration they have since edited.
insert into public.keeper_rules
  (effective_season, max_keeper_seasons, cost_basis, round_adjustment, min_keeper_round, progression, notes)
values
  (2026, 3, 'original_draft_round', 1, 1, 'fixed_from_original',
   'Seeded from the commissioner''s stated rules: 3-year maximum, one round earlier than the original qualifying draft round, floor of Round 1, cost fixed from the original round.')
on conflict (effective_season) do nothing;


-- ---------------------------------------------------------------------
-- 2. Keeper rows gain stable identity, alongside what is already there
--    Every existing column stays. `team` and `player` remain the historical
--    snapshot they always were, so legacy rows keep rendering unchanged.
-- ---------------------------------------------------------------------

alter table public.keepers
  -- WHO, canonically. Never resolved from the `team` string.
  add column if not exists member_id bigint references public.members(id) on delete set null,
  -- WHICH PLAYER, canonically: a Sleeper player id.
  add column if not exists player_id text,
  -- Snapshots, so a row still reads correctly years later after a member
  -- renames their team or a player changes NFL club.
  add column if not exists player_name  text,
  add column if not exists player_pos   text,
  add column if not exists player_team   text,
  add column if not exists team_snapshot text,
  -- The calculation that produced this row, recorded so it can be audited
  -- later without re-deriving it under whatever rules exist then.
  add column if not exists original_round   int,
  add column if not exists keeper_year      int,
  add column if not exists calculated_round int,
  -- True when the commissioner deliberately saved something other than the
  -- calculated round. Nothing may silently "correct" such a row afterwards.
  add column if not exists round_overridden boolean not null default false,
  add column if not exists rules_season     int;

create index if not exists idx_keepers_member on public.keepers(member_id);
create index if not exists idx_keepers_player on public.keepers(player_id);

/*
  ONE KEEPER ROW PER PLAYER PER SEASON, and per member per player per season.

  A partial index, so it constrains only the NEW canonical rows: legacy rows
  have a null player_id and are not touched by it. This is what stops a
  double-submitted save or the same player being entered twice for a season.
*/
create unique index if not exists uniq_keeper_player_season
  on public.keepers(year, player_id) where player_id is not null;


-- ---------------------------------------------------------------------
-- 3. Row Level Security
--    Same shape as the rest of the app: the league reads, the commissioner
--    writes. Nothing is loosened to make the new UI easier.
-- ---------------------------------------------------------------------

alter table public.keeper_rules enable row level security;

drop policy if exists "public read" on public.keeper_rules;
drop policy if exists "admin write" on public.keeper_rules;

create policy "public read" on public.keeper_rules
  for select using (true);

create policy "admin write" on public.keeper_rules
  for all using (public.is_admin()) with check (public.is_admin());

-- public.keepers already carries "public read" and "admin write" from
-- schema.sql. Adding columns does not change a policy, so writes to the new
-- columns are admin-only exactly as the existing ones are. Stated here because
-- it is the sort of thing worth being sure about rather than assuming.


-- ---------------------------------------------------------------------
-- 4. What this did NOT do, on purpose
-- ---------------------------------------------------------------------

do $$
declare
  v_total  bigint;
  v_legacy bigint;
begin
  select count(*) into v_total  from public.keepers;
  select count(*) into v_legacy from public.keepers where player_id is null;
  raise notice 'keepers: % rows, % still legacy (no player_id)', v_total, v_legacy;
  raise notice 'No legacy row was altered. Nickname rows such as "Puka", "JJettas" and "NA"';
  raise notice 'are preserved as historical display data; reliable identity starts with new rows.';
end;
$$;
