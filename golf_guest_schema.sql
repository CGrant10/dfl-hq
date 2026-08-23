-- =====================================================================
-- DFL HQ - GOLF GUESTS
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- THE PROBLEM
--
-- Half the golf field is not in the fantasy league. Those people already
-- exist as golf_participants rows with a guest_name and no member_id -
-- see golf_matches_schema.sql, which says so out loud and then admits the
-- consequence: "in a foursome with a guest in it, the guest has no member
-- id at all, so if only 'your own side' could be written their card could
-- never be scored." A guest cannot write anything. Somebody with a phone
-- and a member id has to do it for them.
--
-- THE SHAPE OF THE FIX
--
-- One access code per golf event, handed out on the first tee. A guest
-- types it once, picks their own name off the event's roster, and can then
-- score THEIR TEAM and nothing else.
--
-- It is deliberately the same mechanism as the admin password, because
-- that mechanism is already proven here: the secret goes in a request
-- header, Postgres compares it against a bcrypt hash in a table the API
-- cannot see, and the client is never trusted. A guest pass held in
-- localStorage is worth exactly nothing on its own - every single write is
-- re-checked by the database.
--
-- WHY THIS IS A NEW TABLE AND NOT A COLUMN ON golf_outings
--
-- golf_outings is world-readable ("public read", using (true)), and RLS
-- filters ROWS, not columns. A guest_code_hash column on that table would
-- be handed to anybody holding the anon key, and the bcrypt hash of a
-- four-character code is an offline crack that takes seconds. So the hash
-- lives in its own table with RLS enabled and NO POLICIES AT ALL, which
-- makes it invisible to PostgREST entirely - exactly what app_admin does.
--
-- WHAT A GUEST PASS CANNOT DO
--
-- It is scoped to one outing and one participant, and it only ever appears
-- in the WHERE clause of two score tables. There is no policy anywhere
-- that consults it for members, finances, keepers, polls, rules, Sleeper
-- data, event configuration, teams, rounds or match structure. A guest can
-- write strokes for their own team. That is the entire surface.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;


-- ---------------------------------------------------------------------
-- 1. The codes. Invisible to the API.
-- ---------------------------------------------------------------------
create table if not exists public.golf_event_codes (
  outing_id   bigint primary key references public.golf_outings(id) on delete cascade,
  code_hash   text not null,
  updated_at  timestamptz not null default now()
);

alter table public.golf_event_codes enable row level security;
-- No policies, on purpose. Nothing reaches this table through the API; only
-- the security definer functions below, which run as the owner, can read it.


-- ---------------------------------------------------------------------
-- 2. Reading the pass off the request
-- ---------------------------------------------------------------------
create or replace function public.golf_pass()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'outing',      nullif(current_setting('request.headers', true)::jsonb ->> 'x-golf-outing', ''),
    'code',        nullif(current_setting('request.headers', true)::jsonb ->> 'x-golf-code', ''),
    'participant', nullif(current_setting('request.headers', true)::jsonb ->> 'x-golf-participant', '')
  );
$$;


/*
  THE ONE FUNCTION EVERYTHING ELSE HANGS OFF.

  Returns the participant id this request is allowed to act as, or null.
  Null is the default answer: a missing header, a wrong code, a participant
  from another outing and a participant who has been deleted all return
  null rather than raising, because a policy wants a boolean, not an error.

  security definer so it can read golf_event_codes. It is deliberately
  incapable of returning anything except a participant id belonging to the
  outing whose code was correct.
*/
create or replace function public.golf_guest_participant()
returns bigint
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v      jsonb := public.golf_pass();
  v_out  bigint;
  v_part bigint;
  v_hash text;
begin
  if v->>'outing' is null or v->>'code' is null or v->>'participant' is null then
    return null;
  end if;

  begin
    v_out  := (v->>'outing')::bigint;
    v_part := (v->>'participant')::bigint;
  exception when others then
    return null;                        -- a header that is not a number
  end;

  select code_hash into v_hash
    from public.golf_event_codes where outing_id = v_out;
  if v_hash is null then
    return null;                        -- this event has no code set
  end if;

  if v_hash <> crypt(v->>'code', v_hash) then
    return null;                        -- wrong code
  end if;

  -- The participant must belong to the outing the code unlocked. Without
  -- this, one event's code would authorise acting as anybody in any event.
  perform 1 from public.golf_participants p
    where p.id = v_part and p.outing_id = v_out;
  if not found then
    return null;
  end if;

  return v_part;
end;
$$;

grant execute on function public.golf_guest_participant() to anon, authenticated;


/* The team that participant plays for, or null. The policies below are
   about a TEAM's card, so this is the join they all need. */
create or replace function public.golf_guest_team()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select p.team_id
    from public.golf_participants p
   where p.id = public.golf_guest_participant();
$$;

grant execute on function public.golf_guest_team() to anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. Signing in
--
-- The app cannot check the code itself - the hash is unreachable, which is
-- the point - so this is how a guest finds out whether what they typed was
-- right. It returns the roster of that event on success and nothing on
-- failure, which also saves the app a second round trip to draw the
-- "which one of these are you?" list.
--
-- It leaks nothing: without the correct code it returns an empty set, and
-- the roster it returns is names that are already public on the event page.
-- ---------------------------------------------------------------------
create or replace function public.golf_guest_signin(p_outing_id bigint, p_code text)
returns table (participant_id bigint, display_name text, team_id bigint, team_name text)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare v_hash text;
begin
  select code_hash into v_hash
    from public.golf_event_codes where outing_id = p_outing_id;
  if v_hash is null or v_hash <> crypt(coalesce(p_code, ''), v_hash) then
    return;                             -- no rows: the app shows "wrong code"
  end if;

  return query
    select p.id,
           coalesce(nullif(btrim(p.guest_name), ''), m.display_name, 'Player')::text,
           p.team_id,
           coalesce(t.name, '')::text
      from public.golf_participants p
      left join public.members    m on m.id = p.member_id
      left join public.golf_teams t on t.id = p.team_id
     where p.outing_id = p_outing_id
     order by t.sort_order nulls last, p.sort_order, p.id;
end;
$$;

grant execute on function public.golf_guest_signin(bigint, text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. Setting the code. Golf commissioners (legacy admins included).
-- ---------------------------------------------------------------------
create or replace function public.golf_set_event_code(p_outing_id bigint, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.has_commissioner_permission('golf') then
    raise exception 'Golf commissioner access required';
  end if;

  -- Clearing the code locks every guest out of the event immediately.
  if coalesce(btrim(p_code), '') = '' then
    delete from public.golf_event_codes where outing_id = p_outing_id;
    return true;
  end if;

  if length(btrim(p_code)) < 4 then
    raise exception 'Code must be at least 4 characters';
  end if;

  insert into public.golf_event_codes (outing_id, code_hash, updated_at)
  values (p_outing_id, crypt(btrim(p_code), gen_salt('bf')), now())
  on conflict (outing_id)
  do update set code_hash = excluded.code_hash, updated_at = now();
  return true;
end;
$$;

revoke execute on function public.golf_set_event_code(bigint, text) from public;
grant execute on function public.golf_set_event_code(bigint, text) to anon, authenticated;


/* Does this event have a code at all? A boolean is safe to expose - it is
   what decides whether the event page offers a guest sign-in button. */
create or replace function public.golf_has_event_code(p_outing_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.golf_event_codes where outing_id = p_outing_id);
$$;

grant execute on function public.golf_has_event_code(bigint) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 5. The policies. TWO TABLES, both of them score tables.
--
-- These are ADDED alongside the existing admin and member policies, never
-- in place of them: Postgres ORs permissive policies together, so a member
-- keeps exactly the access they had and a guest gains a narrow slice.
-- ---------------------------------------------------------------------

-- A team's own scorecard. Same rule the member policy uses, with the guest's
-- team in place of the member's.
drop policy if exists "guest write scores" on public.golf_scores;
create policy "guest write scores"
on public.golf_scores
for all
using (
  team_id is not null
  and team_id = public.golf_guest_team()
  and outing_id = (public.golf_pass()->>'outing')::bigint
)
with check (
  team_id is not null
  and team_id = public.golf_guest_team()
  and outing_id = (public.golf_pass()->>'outing')::bigint
);


/*
  A 2v2 side, and this one is TIGHTER THAN THE MEMBER RULE on purpose.

  A member may write either side of a match they are in - that was the
  workaround for guests being unable to write at all, and it stays, because
  a foursome where one person keeps the card is how golf actually works.

  A guest gets their OWN SIDE only. The brief is explicit that a guest must
  not be able to edit another team, and now that they can score for
  themselves there is no longer a reason to hand them the opposition's card.
*/
drop policy if exists "guest write match scores" on public.golf_match_scores;
create policy "guest write match scores"
on public.golf_match_scores
for all
using (
  exists (
    select 1
      from public.golf_match_sides s
      join public.golf_matches     m on m.id = s.match_id
     where s.id = golf_match_scores.side_id
       and s.team_id = public.golf_guest_team()
       and m.outing_id = (public.golf_pass()->>'outing')::bigint
  )
)
with check (
  exists (
    select 1
      from public.golf_match_sides s
      join public.golf_matches     m on m.id = s.match_id
     where s.id = golf_match_scores.side_id
       and s.team_id = public.golf_guest_team()
       and m.outing_id = (public.golf_pass()->>'outing')::bigint
  )
);


-- ---------------------------------------------------------------------
-- 6. What was deliberately NOT done
--
-- No policy on golf_outings, golf_teams, golf_rounds, golf_matches,
-- golf_match_sides, golf_match_players, golf_holes or golf_participants.
-- A guest cannot rename a team, add a round, move a player or change the
-- event in any way - those remain admin-only, exactly as before. A guest
-- writes strokes. Nothing else.
-- ---------------------------------------------------------------------
