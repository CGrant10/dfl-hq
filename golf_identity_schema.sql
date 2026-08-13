-- =====================================================================
-- DFL HQ - GOLF DISPLAY NAMES
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run. Safe to re-run.
-- One column and one function. No table is created and nothing is dropped.
--
-- WHY GOLF NEEDS ITS OWN NAME
--
-- A member's display_name is their DFL identity and it is tangled up with
-- Sleeper: it is seeded from the Sleeper roster, it is what the keeper
-- tables and the record book key off, and it is the name on ten years of
-- fantasy history. Half of it is usernames - azhee28, Martin77 - because
-- that is what people signed up to Sleeper as in 2019.
--
-- Golf is a different room. The people on the tee know each other by their
-- actual names, and a scorecard that says "azhee28" is a scorecard nobody
-- reads. So Golf gets its own name, and CHANGING IT CHANGES NOTHING ELSE.
--
-- WHAT THIS DELIBERATELY DOES NOT TOUCH
--
-- Not display_name, not team_name, not sleeper_user_id, not sleeper_users,
-- not sleeper_standings, not sleeper_matchups, not keepers, not history.
-- One new column that exists only to be read by the Golf screens. A Golf
-- name cannot reach the fantasy side because nothing on the fantasy side
-- reads it.
--
-- WHY A COLUMN ON members AND NOT ONE PER EVENT
--
-- "What people call me at golf" is a fact about a person, not about an
-- afternoon. Putting it on the participant would mean setting it again at
-- every outing and would let the same person be two different names in two
-- events, which is the duplicate-name problem this is supposed to solve. A
-- guest is the per-event case and already has golf_participants.guest_name,
-- which an admin can correct in place.
-- =====================================================================


alter table public.members
  add column if not exists golf_name text not null default '';

comment on column public.members.golf_name is
  'What this member is called on the golf screens only. Empty means fall back to display_name. Never used by any fantasy/Sleeper feature.';


-- ---------------------------------------------------------------------
-- Setting your own.
--
-- members is public-read / admin-write, so without this a member could not
-- change their own golf name and the commissioner would be doing twelve
-- people's typing. Same shape as arena_pick_racer(): ONE COLUMN, on the
-- row that belongs to the caller, identified by the x-member-id header.
--
-- A function rather than a policy for the same reason as the Arena: RLS
-- filters rows, not columns, so "a member may update their own row" would
-- also hand over championships, awards, sleeper_user_id and active. This
-- can only ever write golf_name.
--
-- A GOLF GUEST CANNOT CALL THIS USEFULLY. dfl_current_member() reads
-- x-member-id, which a guest does not have - their pass is an outing, a
-- participant and an event code, and none of those is a member id. It
-- returns 0 for them, which is the correct answer: a guest's name is
-- golf_participants.guest_name and only an admin edits it.
-- ---------------------------------------------------------------------
create or replace function public.dfl_set_golf_name(p_name text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member bigint := public.dfl_current_member();
  v_name   text;
  v_rows   integer;
begin
  if v_member is null then
    return 0;                                  -- not a member on this device
  end if;

  v_name := btrim(coalesce(p_name, ''));
  if length(v_name) > 40 then
    raise exception 'That name is too long';
  end if;
  -- Empty is a legitimate choice: it means "go back to my DFL name".

  update public.members
     set golf_name = v_name
   where id = v_member;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

grant execute on function public.dfl_set_golf_name(text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- NOTE ON dfl_current_member()
--
-- It is created by arena_pick_racer_schema.sql. If that has not been run,
-- run it first - or paste this and it will exist either way:
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
-- The admin path needs nothing new. members and golf_participants are both
-- already admin-write, so the commissioner can edit anybody's golf name and
-- correct any guest's name through the policies that already exist.
-- ---------------------------------------------------------------------
