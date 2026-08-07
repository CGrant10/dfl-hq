-- =====================================================================
-- DFL HQ - Polls: one vote per MEMBER, changeable while the poll is open
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Additive and safe to re-run. Run this AFTER schema.sql and
-- members_schema.sql.
--
-- WHAT CHANGES
--   * votes gains member_id, so a vote belongs to a member profile rather
--     than to a typed-in name. Existing votes are matched up by name.
--   * Members vote through cast_vote() / clear_vote() instead of writing
--     to the table. Those functions replace the caller's previous answer
--     rather than adding a second row, refuse closed polls, and refuse
--     answers that are not on the ballot.
--   * The blanket "anyone insert" policy on votes is dropped. Nobody can
--     insert, update or delete a vote row directly any more except an
--     admin - every member write goes through the two functions.
--
-- WHAT THIS DOES NOT DO
--   The app has no passwords for members, so the database has no way to
--   prove that the caller really is member X - it can only be told. A
--   determined person could call cast_vote() with somebody else's id, in
--   the same way they can already pick anybody's name in the "Who are
--   you?" list. What IS enforced below: never two votes for one member on
--   one poll, no voting on a closed poll, no invented answers, and no
--   touching a row that is not the named member's. If you ever want true
--   per-member enforcement, give members a short PIN and check it in a
--   header exactly the way is_admin() checks the admin password.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. A vote belongs to a member
-- ---------------------------------------------------------------------

alter table public.votes
  add column if not exists member_id bigint references public.members(id) on delete cascade;

-- Existing votes were keyed on the typed league name, which is exactly
-- what members.display_name holds, so they match up.
update public.votes v
   set member_id = m.id
  from public.members m
 where v.member_id is null
   and lower(trim(v.username)) = lower(trim(m.display_name));

-- If any duplicates predate the unique index below, keep the newest.
delete from public.votes v
 using public.votes w
 where v.member_id is not null
   and v.member_id = w.member_id
   and v.poll_id   = w.poll_id
   and v.id        < w.id;

-- NULL member_id rows never collide, so votes from before this migration
-- that had no matching member are left alone rather than being blocked.
create unique index if not exists uniq_votes_poll_member
  on public.votes(poll_id, member_id);

create index if not exists idx_votes_member on public.votes(member_id);


-- ---------------------------------------------------------------------
-- 2. Casting a vote
--    security definer: the function owns the write, so members need no
--    insert policy of their own on the table.
-- ---------------------------------------------------------------------

create or replace function public.cast_vote(
  p_poll_id   bigint,
  p_member_id bigint,
  p_answer    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active  boolean;
  v_options jsonb;
  v_name    text;
begin
  select active, options into v_active, v_options
    from public.polls where id = p_poll_id;
  if not found then
    raise exception 'That poll no longer exists';
  end if;
  if not v_active then
    raise exception 'That poll is closed';
  end if;

  select display_name into v_name
    from public.members where id = p_member_id and active;
  if not found then
    raise exception 'Unknown league member';
  end if;

  -- Only answers actually on the ballot, so a crafted request cannot
  -- invent an option that never existed.
  if not (v_options ? p_answer) then
    raise exception 'That is not one of the poll options';
  end if;

  -- Replace rather than add. The second condition catches a pre-migration
  -- row for this person that never got a member_id.
  delete from public.votes
   where poll_id = p_poll_id
     and (member_id = p_member_id
          or (member_id is null and lower(trim(username)) = lower(trim(v_name))));

  insert into public.votes (poll_id, member_id, username, answer)
  values (p_poll_id, p_member_id, v_name, p_answer);
end;
$$;

grant execute on function public.cast_vote(bigint, bigint, text) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. Taking your own vote back
-- ---------------------------------------------------------------------

create or replace function public.clear_vote(
  p_poll_id   bigint,
  p_member_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active boolean;
  v_name   text;
begin
  select active into v_active from public.polls where id = p_poll_id;
  if not found then
    raise exception 'That poll no longer exists';
  end if;
  if not v_active then
    raise exception 'That poll is closed';
  end if;

  select display_name into v_name
    from public.members where id = p_member_id and active;
  if not found then
    raise exception 'Unknown league member';
  end if;

  -- Scoped to this member's own row: the function cannot be pointed at
  -- somebody else's vote.
  delete from public.votes
   where poll_id = p_poll_id
     and (member_id = p_member_id
          or (member_id is null and lower(trim(username)) = lower(trim(v_name))));
end;
$$;

grant execute on function public.clear_vote(bigint, bigint) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. Row Level Security
--    Everyone reads every vote - seeing who picked what is the point.
--    Direct writes are admin-only; members go through the functions.
-- ---------------------------------------------------------------------

alter table public.votes enable row level security;

drop policy if exists "public read"   on public.votes;
drop policy if exists "anyone insert" on public.votes;   -- <- the one being removed
drop policy if exists "admin write"   on public.votes;

create policy "public read" on public.votes for select using (true);
create policy "admin write" on public.votes
  for all using (public.is_admin()) with check (public.is_admin());
