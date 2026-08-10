-- =====================================================================
-- DFL HQ - Golf captains and the draft
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run.
-- Additive, safe to re-run, creates no tables and touches no data.
--
-- The draft is ADMIN RUN on one device: the commissioner taps each pick as
-- the captain calls it, and everybody else's phone shows the board filling
-- in read-only. That is why there are no new policies below - the existing
-- "public read" / "admin write" pair on golf_teams and golf_participants is
-- already exactly right. A captain has no more database rights than anybody
-- else; being on the clock is a fact about the board, not a permission.
--
-- Nothing derived is stored, same rule as the rest of golf: whose pick it is,
-- which round the snake is on and whether the draft is finished are all
-- worked out from pick_number and draft_order when the board draws. A stored
-- "current pick" would be one more thing to get out of step with the picks
-- themselves.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. A team gets a captain and a place in the order
--
--    captain_member_id is a members.id and not a golf_participants.id: a
--    captain is a person, and they stay that person if they are dropped from
--    the line-up and added back. ON DELETE SET NULL so removing a member
--    from the league leaves the team captain-less rather than deleting it.
--
--    draft_order is the position in round one. The board snakes it - the
--    order reverses every round - so the last captain to pick in round one
--    picks first in round two.
-- ---------------------------------------------------------------------
alter table public.golf_teams
  add column if not exists captain_member_id bigint references public.members(id) on delete set null,
  add column if not exists draft_order int not null default 0;


-- ---------------------------------------------------------------------
-- 2. A pick is recorded on the participant
--
--    The player's team is already golf_participants.team_id, so a pick does
--    not need a table of its own - it needs to know WHEN in the draft that
--    team_id was set. pick_number is what makes the board's history, the
--    undo, and "whose turn is it" possible.
--
--    A captain is on their own team with pick_number NULL: they were not
--    drafted, so they must not consume a pick or the snake loses count.
--    A NULL pick_number with a NULL team_id is simply an undrafted player.
-- ---------------------------------------------------------------------
alter table public.golf_participants
  add column if not exists pick_number int,
  add column if not exists picked_at   timestamptz;

create index if not exists idx_golf_part_pick
  on public.golf_participants(outing_id, pick_number);


-- ---------------------------------------------------------------------
-- 3. Watching from the bar
--    Optional: the board polls as well, so a project without realtime
--    enabled still fills in a few seconds behind the commissioner's taps.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table public.golf_participants';
    exception when duplicate_object then null;
    end;
    begin
      execute 'alter publication supabase_realtime add table public.golf_teams';
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;
