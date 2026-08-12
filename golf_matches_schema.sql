-- =====================================================================
-- DFL Golf - the 2v2s
-- ---------------------------------------------------------------------
-- Supabase -> SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- The game: two captains draft 12 players into two teams of 6. The teams
-- split into pairs and play 2v2 against a pair from the other team, so
-- three battles. Each battle is won by the pair with the fewest strokes
-- over the round, and the winning pair puts one point on their team's
-- board. A level battle is worth nothing to either side, so an outing can
-- finish 2-0 with one halved, or 1-1, or 0-0.
--
-- WHY NEW TABLES AND NOT golf_scores
-- golf_scores holds one row per (outing, team, hole): a single card for a
-- whole team of 6. In this game the thing that gets scored is the PAIR, and
-- there are two pairs per card, so the team is the wrong grain entirely.
-- The team card stays exactly as it is for outings played that way; this
-- sits alongside it.
--
--   golf_matches         one battle: outing + a number (1, 2, 3)
--   golf_match_sides     the two sides of a battle, each owned by a team
--   golf_match_players   which two players are on a side
--   golf_match_scores    one ball per pair, so one number per side per hole
-- =====================================================================

create table if not exists public.golf_matches (
  id           bigint generated always as identity primary key,
  outing_id    bigint not null references public.golf_outings(id) on delete cascade,
  match_number int    not null,
  created_at   timestamptz not null default now(),
  unique (outing_id, match_number)
);

create table if not exists public.golf_match_sides (
  id       bigint generated always as identity primary key,
  match_id bigint not null references public.golf_matches(id) on delete cascade,
  team_id  bigint not null references public.golf_teams(id)   on delete cascade,
  slot     int    not null check (slot in (1, 2)),
  unique (match_id, slot),
  -- One side per team per battle: a team cannot play itself.
  unique (match_id, team_id)
);

create table if not exists public.golf_match_players (
  id             bigint generated always as identity primary key,
  side_id        bigint not null references public.golf_match_sides(id)  on delete cascade,
  participant_id bigint not null references public.golf_participants(id) on delete cascade,
  -- A player is in exactly one battle, on one side of it. This is the
  -- constraint that stops somebody being quietly entered twice and scoring
  -- points for two pairs at once.
  unique (participant_id)
);

create table if not exists public.golf_match_scores (
  id         bigint generated always as identity primary key,
  side_id    bigint not null references public.golf_match_sides(id) on delete cascade,
  hole       int    not null check (hole between 1 and 18),
  strokes    int    not null check (strokes between 1 and 15),
  updated_at timestamptz not null default now(),
  unique (side_id, hole)
);

create index if not exists idx_golf_matches_outing      on public.golf_matches(outing_id, match_number);
create index if not exists idx_golf_match_sides_match   on public.golf_match_sides(match_id, slot);
create index if not exists idx_golf_match_players_side  on public.golf_match_players(side_id);
create index if not exists idx_golf_match_scores_side   on public.golf_match_scores(side_id, hole);

-- ---------------------------------------------------------------------
-- Row level security
--
-- Everything is public to read - the whole league watches the board.
--
-- Writing follows the pattern golf_scores already uses: the app sends the
-- member selected on this device as x-admin-token's quieter cousin,
-- x-member-id, and Postgres decides what that member may touch.
--
-- Anyone in a battle may write EITHER side of it, not just their own. The
-- card has both pairs on one screen - that is the format, one ball each and
-- two numbers per hole - and whoever is holding the phone on the green
-- writes both. Splitting write access down the middle of a card people are
-- filling in together only produces a card nobody can finish.
-- ---------------------------------------------------------------------

alter table public.golf_matches       enable row level security;
alter table public.golf_match_sides   enable row level security;
alter table public.golf_match_players enable row level security;
alter table public.golf_match_scores  enable row level security;

create or replace function public.golf_current_member()
returns bigint
language sql
stable
as $$
  select nullif(current_setting('request.headers', true)::jsonb ->> 'x-member-id', '')::bigint;
$$;

-- Is the selected member one of the four players in this battle?
create or replace function public.golf_in_match(p_match_id bigint)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.golf_match_players mp
    join public.golf_match_sides   s on s.id = mp.side_id
    join public.golf_participants  p on p.id = mp.participant_id
    where s.match_id = p_match_id
      and p.member_id = public.golf_current_member()
  );
$$;

drop policy if exists "public read golf matches" on public.golf_matches;
create policy "public read golf matches" on public.golf_matches for select using (true);
drop policy if exists "admin write golf matches" on public.golf_matches;
create policy "admin write golf matches" on public.golf_matches for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read golf match sides" on public.golf_match_sides;
create policy "public read golf match sides" on public.golf_match_sides for select using (true);
drop policy if exists "admin write golf match sides" on public.golf_match_sides;
create policy "admin write golf match sides" on public.golf_match_sides for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read golf match players" on public.golf_match_players;
create policy "public read golf match players" on public.golf_match_players for select using (true);
-- Who is paired with whom is the captains' business, so admin only.
drop policy if exists "admin write golf match players" on public.golf_match_players;
create policy "admin write golf match players" on public.golf_match_players for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read golf match scores" on public.golf_match_scores;
create policy "public read golf match scores" on public.golf_match_scores for select using (true);
drop policy if exists "admin write golf match scores" on public.golf_match_scores;
create policy "admin write golf match scores" on public.golf_match_scores for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "player write golf match scores" on public.golf_match_scores;
create policy "player write golf match scores" on public.golf_match_scores for all
  using (
    exists (select 1 from public.golf_match_sides s
            where s.id = golf_match_scores.side_id and public.golf_in_match(s.match_id))
  )
  with check (
    exists (select 1 from public.golf_match_sides s
            where s.id = golf_match_scores.side_id and public.golf_in_match(s.match_id))
  );

-- ---------------------------------------------------------------------
-- Build the battles for an outing in one call.
--
-- Pairs each team's players in draft order - first two picked together,
-- next two together - and puts pair 1 against pair 1. It makes as many
-- battles as the smaller team can field, so 6 v 6 gives three and an odd
-- man out simply is not in one. The admin can move anybody afterwards.
--
-- Refuses to run once a stroke has been entered: re-pairing mid-round
-- would orphan scores that were entered against the old pairs.
-- ---------------------------------------------------------------------
create or replace function public.golf_build_matches(p_outing_id bigint)
returns int
language plpgsql
security definer
as $$
declare
  v_teams  bigint[];
  v_count  int;
  v_scored int;
  v_match  bigint;
  v_side   bigint;
  v_pairs  int;
  v_sides  int;
  i        int;
  t        int;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;

  select count(*) into v_scored
  from public.golf_match_scores ms
  join public.golf_match_sides s on s.id = ms.side_id
  join public.golf_matches m     on m.id = s.match_id
  where m.outing_id = p_outing_id;
  if v_scored > 0 then
    raise exception 'Strokes have already been entered for this outing. Clear them before rebuilding the battles.';
  end if;

  select array_agg(id order by sort_order, id) into v_teams
  from public.golf_teams where outing_id = p_outing_id;

  if v_teams is null or array_length(v_teams, 1) <> 2 then
    raise exception 'The 2v2s need exactly two teams; this outing has %', coalesce(array_length(v_teams, 1), 0);
  end if;

  delete from public.golf_matches where outing_id = p_outing_id;

  -- How many complete pairs the SMALLER team can field.
  --
  -- v_sides matters as much as v_pairs: a team with nobody on it produces no
  -- group row at all, so min() would happily report the other team's six and
  -- build three battles with one empty side in each.
  select min(n) / 2, count(*) into v_pairs, v_sides from (
    select count(*) as n
    from public.golf_participants
    where outing_id = p_outing_id and team_id = any(v_teams)
    group by team_id
  ) counted;

  if coalesce(v_sides, 0) < 2 or coalesce(v_pairs, 0) < 1 then
    raise exception 'Both teams need at least two players before the 2v2s can be built.';
  end if;

  v_count := 0;
  for i in 1 .. v_pairs loop
    insert into public.golf_matches (outing_id, match_number)
    values (p_outing_id, i) returning id into v_match;

    for t in 1 .. 2 loop
      insert into public.golf_match_sides (match_id, team_id, slot)
      values (v_match, v_teams[t], t) returning id into v_side;

      insert into public.golf_match_players (side_id, participant_id)
      select v_side, p.id
      from public.golf_participants p
      where p.outing_id = p_outing_id and p.team_id = v_teams[t]
      order by coalesce(p.pick_number, 9999), p.sort_order, p.id
      offset (i - 1) * 2 limit 2;
    end loop;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
