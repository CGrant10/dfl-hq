-- =====================================================================
-- DFL HQ - CLOSE AN ANONYMOUS WRITE HOLE ON golf_scores
-- ---------------------------------------------------------------------
-- RUN THIS. Supabase -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run. It touches ONE table's policies and no data.
--
-- WHAT WAS FOUND
--
-- With no member id, no admin token and no guest pass, an anonymous client
-- holding only the public anon key could INSERT rows into golf_scores.
-- Probed every golf table the same way: golf_outings, golf_teams,
-- golf_participants, golf_rounds, golf_matches, golf_match_sides,
-- golf_match_players, golf_match_scores and golf_holes all correctly
-- refused. golf_scores was the only one that let a write through.
--
-- UPDATE and DELETE were correctly refused, which is the fingerprint of a
-- leftover FOR INSERT policy - almost certainly created in the Supabase
-- dashboard back when these tables were made there by hand (see the note
-- at the top of golf_matches_schema.sql). golf_schema.sql only ever drops
-- policies by the three names IT created, so a policy with any other name
-- has been sitting underneath them the whole time.
--
-- THIS PREDATES THE GUEST WORK. Nothing in golf_guest_schema.sql caused
-- it; adding guests is simply what made anybody look.
--
-- WHAT IT MEANT IN PRACTICE
--
-- A Supabase anon key is public by design - it is in the repo, and it is
-- supposed to be, because RLS is what does the protecting. So anybody who
-- opened the site could have written a stroke onto any team's card in any
-- outing. There is a unique index on (outing_id, team_id, hole), so an
-- existing score could not be overwritten - but any hole not yet filled in
-- could have been filled in for you.
--
-- THE FIX
--
-- Drop EVERY policy on golf_scores, whatever it is called, and rebuild
-- exactly the four that are supposed to be there. Dropping by name cannot
-- work when the offending name is unknown, so this enumerates them.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. What is on the table right now. Read this output - it names the
--    policy that was letting writes through, which is worth knowing.
-- ---------------------------------------------------------------------
select policyname, cmd, roles, qual as using_expr, with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'golf_scores'
 order by policyname;


-- ---------------------------------------------------------------------
-- 2. Drop them all, by enumeration rather than by name.
-- ---------------------------------------------------------------------
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'golf_scores'
  loop
    execute format('drop policy %I on public.golf_scores', p.policyname);
    raise notice 'dropped policy: %', p.policyname;
  end loop;
end $$;

-- Belt and braces: RLS must be ON, or every policy below is decoration.
alter table public.golf_scores enable row level security;


-- ---------------------------------------------------------------------
-- 3. Rebuild the intended four, and only those.
--
-- These are copied from golf_schema.sql and golf_guest_schema.sql without
-- change - this script is about removing what should not be there, not
-- about altering who may score.
-- ---------------------------------------------------------------------

-- The whole league watches the board.
create policy "public read"
on public.golf_scores
for select
using (true);

-- The commissioner writes anything.
create policy "admin write"
on public.golf_scores
for all
using (public.is_admin())
with check (public.is_admin());

-- A league member writes their own team's card. The member id arrives in
-- the x-member-id header and Postgres decides what it may touch.
create policy "team member write scores"
on public.golf_scores
for all
using (
  team_id is not null
  and exists (
    select 1 from public.golf_participants p
     where p.outing_id = golf_scores.outing_id
       and p.team_id = golf_scores.team_id
       and p.member_id = nullif(
             current_setting('request.headers', true)::jsonb ->> 'x-member-id', '')::bigint
  )
)
with check (
  team_id is not null
  and exists (
    select 1 from public.golf_participants p
     where p.outing_id = golf_scores.outing_id
       and p.team_id = golf_scores.team_id
       and p.member_id = nullif(
             current_setting('request.headers', true)::jsonb ->> 'x-member-id', '')::bigint
  )
);

-- A signed-in golf guest writes their own team's card, for the one event
-- their code unlocked. See golf_guest_schema.sql.
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


-- ---------------------------------------------------------------------
-- 4. Confirm. Expect exactly four rows, and no policy granting anything
--    to anon unconditionally.
-- ---------------------------------------------------------------------
select policyname, cmd from pg_policies
 where schemaname = 'public' and tablename = 'golf_scores'
 order by policyname;


-- ---------------------------------------------------------------------
-- 5. Worth doing once, separately: the same leftover-policy check on
--    every other table in the app. This script deliberately does not
--    rebuild tables it has not tested, but the query below shows
--    anything permissive enough to be worth a second look.
-- ---------------------------------------------------------------------
select tablename, policyname, cmd, qual as using_expr, with_check
  from pg_policies
 where schemaname = 'public'
   and (qual = 'true' or with_check = 'true')
   and cmd <> 'SELECT'
 order by tablename, policyname;
