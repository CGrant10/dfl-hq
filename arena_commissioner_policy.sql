-- =====================================================================
-- DFL HQ - Arena / Broadcast write access for commissioners
-- ---------------------------------------------------------------------
-- Run after commissioner_roles_schema.sql. Safe to re-run.
--
-- THE GAP THIS CLOSES
--
-- commissioner_roles_schema.sql rewrote the "admin write" policy for seven
-- tables: announcements, polls, rules, keepers, events, history, side_events.
-- The Admin UI offers TWELVE permissions, and "broadcast" was one of them -
-- but no arena table was ever given a commissioner-aware policy, so the arena
-- tables still accept only is_admin(), which is the shared-password header.
--
-- A commissioner-PIN session therefore could not write arena_events at all,
-- and because the app updated that row without asking for it back, the
-- refusal was SILENT: zero rows matched, no error was raised, the screen
-- applied the change locally and the next poll put it straight back. On
-- screen that looked like "the countdown starts and then just stops" and
-- "I cannot clear the result". The write had simply never happened.
--
-- has_commissioner_permission() already accepts legacy is_admin(), so the
-- shared Admin password keeps working on every table below exactly as before.
-- =====================================================================

do $$
declare
  item record;
begin
  for item in select * from (values
    -- The shared race clock: bc_state, bc_started_at, bc_offset_ms, seed.
    -- This is the one the Start / Hold / Skip / Reset buttons write.
    ('arena_events',       'broadcast'),
    -- Who is in the race, and their chosen racer.
    ('arena_participants', 'broadcast'),
    -- The saved result, written once when a race finishes.
    ('arena_results',      'broadcast'),
    -- Hand-written front-page slides. Same permission, same screen owner.
    ('broadcast_items',    'broadcast')
  ) as v(table_name, permission_name)
  loop
    -- Skip tables whose migration has not been run rather than failing the
    -- whole script: a project without Arena installed is a valid project.
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = item.table_name
    ) then
      raise notice 'skipping %: table not present', item.table_name;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', item.table_name);
    execute format('drop policy if exists "admin write" on public.%I', item.table_name);
    execute format(
      'create policy "admin write" on public.%I for all using (public.has_commissioner_permission(%L)) with check (public.has_commissioner_permission(%L))',
      item.table_name, item.permission_name, item.permission_name
    );
    raise notice 'commissioner write enabled on % via %', item.table_name, item.permission_name;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- REPORT: which commissioners can now run a race.
--
-- An owner has every permission implicitly. Anybody else needs "broadcast"
-- in their permissions array, and the Admin -> Commissioner Access screen is
-- where that is granted. If this returns no rows, no commissioner can start a
-- race and the shared Admin password is still the only way.
-- ---------------------------------------------------------------------
select
  ca.member_id,
  m.display_name,
  ca.is_owner,
  (ca.is_owner or ca.permissions ? 'broadcast') as can_run_a_race,
  ca.active
from public.commissioner_access ca
join public.members m on m.id = ca.member_id
order by ca.is_owner desc, m.display_name;
