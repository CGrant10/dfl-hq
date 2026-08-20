-- =====================================================================
-- DFL HQ - League members
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Additive. Does not touch the admin password. Safe to re-run.
--
-- No accounts, no passwords. A "member" is just a profile in a list.
-- Opening the app asks "Who are you?", and the choice is remembered in
-- that device's localStorage.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Hide unwanted Sleeper accounts
--    A synced league often contains people who are not current members
--    (old owners, test accounts). Rather than delete them - the next
--    sync would just bring them back - each one carries a `hidden` flag.
--
--    New rows default to hidden = true, so anybody who appears in a
--    FUTURE sync stays out of sight until an admin chooses to show them.
-- ---------------------------------------------------------------------
alter table public.sleeper_users
  add column if not exists hidden boolean not null default true;

-- Everyone already synced stays visible...
update public.sleeper_users set hidden = false where hidden is null;

do $$
begin
  -- ...except on the very first run of this file, where we make the
  -- existing roster visible and hide the two non-members.
  if not exists (select 1 from public.sleeper_users where hidden = false) then
    update public.sleeper_users set hidden = false;
  end if;
end;
$$;

update public.sleeper_users
   set hidden = true
 where lower(display_name) in ('eadycloud15', 'braves236');


-- ---------------------------------------------------------------------
-- 2. Members
--    sleeper_user_id is here from day one so profiles can be tied to
--    Sleeper stats. auth_user_id is deliberately included but unused -
--    if real logins are ever added, they slot in without a migration.
-- ---------------------------------------------------------------------
create table if not exists public.members (
  id             bigint generated always as identity primary key,
  display_name   text not null unique,
  team_name      text not null default '',
  profile_image  text,                    -- optional URL
  favorite_team  text,                    -- e.g. "nfl:KC"
  joined_year    int,
  championships  int not null default 0,
  awards         text not null default '',  -- one per line
  notes          text not null default '',
  sleeper_user_id text,                   -- links to Sleeper stats
  auth_user_id   uuid,                    -- reserved for future login. unused.
  active         boolean not null default true,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

-- CREATE TABLE IF NOT EXISTS does not add columns to an existing table. Keep
-- newer profile fields additive so re-running this migration actually upgrades
-- a league that created members before Favorite Team existed.
alter table public.members
  add column if not exists favorite_team text;

create index if not exists idx_members_sleeper on public.members(sleeper_user_id);


-- ---------------------------------------------------------------------
-- 3. Seed the member list from the visible Sleeper roster.
--    Only runs when members is empty, so it will never trample edits.
--    Championships are counted from the playoff brackets already synced.
-- ---------------------------------------------------------------------
insert into public.members (display_name, team_name, sleeper_user_id, joined_year, championships)
select
  su.display_name,
  coalesce(su.team_name, ''),
  su.sleeper_user_id,
  (select min(s.season) from public.sleeper_standings s
     where s.sleeper_user_id = su.sleeper_user_id),
  (select count(*) from public.sleeper_leagues l
     where l.champion_user_id = su.sleeper_user_id)
from public.sleeper_users su
where su.hidden = false
  and not exists (select 1 from public.members)
on conflict (display_name) do nothing;


-- =====================================================================
-- 4. ROW LEVEL SECURITY - everyone reads, only the admin writes.
-- =====================================================================

alter table public.members enable row level security;

drop policy if exists "public read" on public.members;
create policy "public read" on public.members for select using (true);

drop policy if exists "admin write" on public.members;
create policy "admin write" on public.members
  for all using (public.is_admin()) with check (public.is_admin());
