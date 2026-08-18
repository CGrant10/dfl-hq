-- =====================================================================
-- DFL HQ - Side event sign-ups belong to a MEMBER, not to a typed name
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Additive and safe to re-run. Run this AFTER schema.sql and
-- members_schema.sql.
--
-- WHY
--   side_event_signups identified people by `username` - the free-text
--   league name from before the member picker existed. That is the last
--   participation table in the app still doing it; polls_schema.sql moved
--   votes onto member_id, and everything newer (golf, arena, profile) has
--   only ever used the member.
--
--   Identifying a person by a string has three failure modes this fixes:
--     * renaming a member orphaned their sign-ups
--     * "Grant" and "grant" were two different people
--     * whether Side Events recognised you depended on a localStorage
--       mirror of your display name rather than on who you had selected
--
-- WHAT CHANGES
--   * side_event_signups gains member_id, referencing members(id).
--   * Existing rows are matched to members by name, case and whitespace
--     insensitive, ONLY where the match is unambiguous.
--   * username becomes nullable. New sign-ups do not write it at all - the
--     display name is resolved from members, so it has exactly one home.
--   * unique (side_event_id, member_id), so one member cannot join twice.
--   * Inserts must name the calling member. A sign-up with no member, or
--     one naming somebody else, is refused rather than silently accepted.
--
-- WHAT THIS DELIBERATELY DOES NOT DO
--   NOTHING IS DELETED. Not one row, not even a duplicate. Rows that
--   cannot be mapped safely keep their username and get a NULL member_id,
--   which never collides with the unique index. Section 6 lists them so you
--   can see exactly what was left behind and decide yourself.
--
--   Section 6 is the report. Read its output.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. The member on this request
--    Identical to the copies in arena_pick_racer_schema.sql and
--    golf_identity_schema.sql, repeated so this file stands alone.
-- ---------------------------------------------------------------------

create or replace function public.dfl_current_member()
returns bigint
language sql
stable
as $$
  select nullif(current_setting('request.headers', true)::jsonb ->> 'x-member-id', '')::bigint;
$$;

grant execute on function public.dfl_current_member() to anon, authenticated;


-- ---------------------------------------------------------------------
-- 2. A sign-up belongs to a member
-- ---------------------------------------------------------------------

alter table public.side_event_signups
  add column if not exists member_id bigint references public.members(id) on delete cascade;

-- New sign-ups carry no name of their own, so the column cannot stay
-- NOT NULL. Historical rows keep the name they were created with.
alter table public.side_event_signups
  alter column username drop not null;


-- ---------------------------------------------------------------------
-- 3. Map existing rows, but only where it is genuinely unambiguous
--    The name has to match exactly one active-or-inactive member, and that
--    member must not already be mapped for the same side event. Anything
--    else is left for section 6 to report.
-- ---------------------------------------------------------------------

update public.side_event_signups s
   set member_id = m.id
  from public.members m
 where s.member_id is null
   and s.username is not null
   and lower(trim(s.username)) = lower(trim(m.display_name))
   -- exactly one member answers to this name
   and (select count(*) from public.members m2
         where lower(trim(m2.display_name)) = lower(trim(s.username))) = 1
   -- and this is the earliest row for that person on that side event, so a
   -- casing duplicate maps once instead of colliding on the unique index
   and s.id = (select min(s2.id)
                 from public.side_event_signups s2
                where s2.side_event_id = s.side_event_id
                  and lower(trim(s2.username)) = lower(trim(s.username)));


-- ---------------------------------------------------------------------
-- 4. One member, one sign-up
--    NULL member_id never collides, so the unmapped historical rows above
--    are preserved rather than blocked.
-- ---------------------------------------------------------------------

create unique index if not exists uniq_side_signup_member
  on public.side_event_signups(side_event_id, member_id);

create index if not exists idx_side_signup_member
  on public.side_event_signups(member_id);

-- The original unique (side_event_id, username) is left in place on
-- purpose. New rows have a NULL username so it no longer constrains
-- anything, and dropping it would remove a guarantee that still holds over
-- the historical rows.


-- ---------------------------------------------------------------------
-- 5. Row Level Security
--    Everyone reads - who is in a pool is public inside the league.
--    A member may only add THEMSELVES, and only when the app knows who
--    they are. Admins keep full control, as they do on every other table.
-- ---------------------------------------------------------------------

alter table public.side_event_signups enable row level security;

drop policy if exists "public read"   on public.side_event_signups;
drop policy if exists "anyone insert" on public.side_event_signups;   -- <- replaced
drop policy if exists "member insert" on public.side_event_signups;
drop policy if exists "admin write"   on public.side_event_signups;

create policy "public read" on public.side_event_signups
  for select using (true);

/*
  The old policy was `for insert with check (true)`: anybody could write any
  row, including one with a name nobody in the league answers to. That is
  what made an anonymous sign-up possible in the first place.

  x-member-id comes from localStorage, so this is not proof of identity -
  the same honesty that applies to cast_vote() applies here, and it is
  stated in polls_schema.sql. What it does enforce: a sign-up names a real
  member, it names the member the app is currently acting as, and there is
  no way to create a row that belongs to nobody.
*/
create policy "member insert" on public.side_event_signups
  for insert with check (
    member_id is not null
    and member_id = public.dfl_current_member()
    -- The foreign key already proves the member exists; this refuses one
    -- who has been retired from the league. Qualified because an unqualified
    -- member_id inside the subquery is easy to misread.
    and exists (
      select 1 from public.members m
       where m.id = side_event_signups.member_id and m.active
    )
  );

create policy "admin write" on public.side_event_signups
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
-- 6. THE REPORT - what could not be mapped, and why
--    Run the whole file, then read this. An empty result means every
--    historical sign-up now belongs to a member.
-- ---------------------------------------------------------------------

do $$
declare
  v_total   bigint;
  v_mapped  bigint;
  v_left    bigint;
  r         record;
begin
  select count(*) into v_total  from public.side_event_signups;
  select count(*) into v_mapped from public.side_event_signups where member_id is not null;
  v_left := v_total - v_mapped;

  raise notice 'side_event_signups: % rows, % mapped to a member, % left as legacy names',
    v_total, v_mapped, v_left;

  if v_left = 0 then
    return;
  end if;

  for r in
    select s.id, s.side_event_id, s.username,
           (select count(*) from public.members m
             where lower(trim(m.display_name)) = lower(trim(s.username))) as name_matches,
           exists (select 1 from public.side_event_signups s2
                    where s2.side_event_id = s.side_event_id
                      and s2.member_id is not null
                      and lower(trim(s2.username)) = lower(trim(s.username))) as duplicate_of_mapped
      from public.side_event_signups s
     where s.member_id is null
     order by s.side_event_id, s.id
  loop
    raise notice '  row % (side event %) "%": % matching members%',
      r.id, r.side_event_id, coalesce(r.username, '<no name>'), r.name_matches,
      case when r.duplicate_of_mapped then ' - duplicate of an already mapped sign-up' else '' end;
  end loop;

  raise notice 'These rows are PRESERVED and still shown in the app as legacy names.';
  raise notice 'To adopt one, set its member_id by hand: update public.side_event_signups set member_id = <id> where id = <row>;';
end;
$$;
