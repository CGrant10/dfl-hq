-- =====================================================================
-- DFL HQ - the four commissioner permissions that granted nothing
-- ---------------------------------------------------------------------
-- Run after commissioner_roles_schema.sql. Safe to re-run.
--
-- THE GAP, AND ITS SHAPE
--
-- The Admin screen offers TWELVE permission checkboxes.
-- commissioner_roles_schema.sql wrote commissioner-aware policies for seven
-- tables, arena_commissioner_policy.sql added the arena for `broadcast`, and
-- these four were never wired to anything at all:
--
--   sleeper      Sync Sleeper failed with "new row violates row-level security
--                policy for table sleeper_users". The Admin tab is correctly
--                gated on hasPermission("sleeper"), so the button appeared and
--                the database refused it.
--   golf         every golf table still required is_admin()
--   fees         same
--   members      had a client gate and no policy, so it passed the browser
--                check and was refused by RLS
--
-- has_commissioner_permission() accepts legacy is_admin(), so the shared Admin
-- password keeps working on every table below exactly as it does today.
--
-- FOUR GOLF TABLES ARE NOT IN ANY MIGRATION IN THIS REPO.
--
-- golf_outings, golf_participants, golf_teams and golf_scores exist in the live
-- database and are written by the app every day, but no .sql file creates them -
-- golf_schema.sql only ALTERs them. They were made by hand in Supabase before
-- the migrations existed. They are listed below anyway: the information_schema
-- guard means a table that is present gets its policy and one that is not is
-- skipped with a notice, so this file is correct either way. Worth knowing if
-- anybody ever tries to build this database from scratch.
--
-- WHAT IS DELIBERATELY NOT HERE: the sportsbook. Its commissioner actions -
-- create, settle, void a market - already run through security definer RPCs
-- that check has_commissioner_permission('sportsbook') themselves, and its
-- wallets, bets and ledger are member-owned. Handing a commissioner blanket
-- table write on sportsbook_wallets would let a slip of the hand rewrite
-- everybody's balance, and nothing needs it.
-- =====================================================================

do $$
declare
  item record;
  member_scoped text[] := array[
    -- These carry a member's own data and already have a self-write policy from
    -- their own migration. The commissioner policy is ADDED alongside it, never
    -- instead of it: RLS permissive policies are OR'd, so a member keeps their
    -- own access and a commissioner gains theirs.
    'golf_bag', 'golf_bag_visibility', 'golf_profiles', 'golf_scores'
  ];
begin
  for item in select * from (values
    -- ---- sleeper: everything Sync Sleeper writes -----------------------
    ('sleeper_config',       'sleeper'),
    ('sleeper_leagues',      'sleeper'),
    ('sleeper_users',        'sleeper'),
    ('sleeper_rosters',      'sleeper'),
    ('sleeper_standings',    'sleeper'),
    ('sleeper_matchups',     'sleeper'),
    ('sleeper_transactions', 'sleeper'),
    ('sleeper_draft_picks',  'sleeper'),
    ('owner_profiles',       'sleeper'),
    -- ---- fees ----------------------------------------------------------
    ('finance_seasons',      'fees'),
    ('finance_payments',     'fees'),
    ('finance_payouts',      'fees'),
    ('finance_expenses',     'fees'),
    ('finance_competitions', 'fees'),
    -- ---- golf ----------------------------------------------------------
    ('golf_outings',         'golf'),
    ('golf_participants',    'golf'),
    ('golf_teams',           'golf'),
    ('golf_rounds',          'golf'),
    ('golf_scores',          'golf'),
    ('golf_courses',         'golf'),
    ('golf_course_holes',    'golf'),
    ('golf_matches',         'golf'),
    ('golf_match_sides',     'golf'),
    ('golf_match_players',   'golf'),
    ('golf_match_scores',    'golf'),
    ('golf_event_codes',     'golf'),
    ('golf_bag',             'golf'),
    ('golf_bag_visibility',  'golf'),
    ('golf_profiles',        'golf'),
    -- ---- members: had the client gate, never the policy ----------------
    ('members',              'members')
  ) as v(table_name, permission_name)
  loop
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = item.table_name
    ) then
      raise notice 'skipping %: table not present', item.table_name;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', item.table_name);

    /*
      A DISTINCT POLICY NAME, so this never clobbers a self-write policy.

      The earlier migrations reused "admin write", which is fine for a table
      whose only write rule is admin. Several golf tables also carry a
      member-scoped policy from their own migration, and dropping "admin write"
      there would have been harmless while dropping the wrong name would not.
      "commissioner write" is unambiguous and additive - RLS permissive policies
      are OR'd, so a member keeps their own access and a commissioner gains
      theirs.
    */
    execute format('drop policy if exists "commissioner write" on public.%I', item.table_name);
    execute format(
      'create policy "commissioner write" on public.%I for all '
      'using (public.has_commissioner_permission(%L)) '
      'with check (public.has_commissioner_permission(%L))',
      item.table_name, item.permission_name, item.permission_name);

    if item.table_name = any(member_scoped) then
      raise notice 'commissioner write added to % via % (member self-write preserved)',
                   item.table_name, item.permission_name;
    else
      raise notice 'commissioner write added to % via %',
                   item.table_name, item.permission_name;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- REPORT: every permission the Admin screen offers, and whether it now
-- governs anything. Anything reading 0 is still a checkbox that does nothing.
-- ---------------------------------------------------------------------
with offered(permission_name) as (
  values ('announcements'),('calendar'),('polls'),('keepers'),('golf'),
         ('sportsbook'),('broadcast'),('fees'),('history'),('rules'),
         ('members'),('sleeper')
),
governed as (
  select
    o.permission_name,
    count(p.polname) as tables_covered
  from offered o
  left join pg_policies p
    on p.schemaname = 'public'
   and p.qual like '%' || quote_literal(o.permission_name) || '%'
  group by o.permission_name
)
select
  permission_name,
  tables_covered,
  case
    when permission_name = 'sportsbook' and tables_covered = 0
      then 'by design - enforced inside its security definer RPCs'
    when tables_covered = 0 then 'GRANTS NOTHING'
    else 'ok'
  end as verdict
from governed
order by tables_covered, permission_name;
